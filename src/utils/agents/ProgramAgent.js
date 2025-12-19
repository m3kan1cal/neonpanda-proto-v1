import {
  getPrograms,
  getProgram,
  getWorkoutTemplates,
  updateProgram,
  deleteProgram,
  logWorkout,
  skipWorkout,
} from "../apis/programApi.js";
import {
  getProgramDesignerSessions,
  deleteProgramDesignerSession,
  retryProgramBuild,
} from "../apis/programDesignerApi.js";
import { PROGRAM_STATUS } from "../../constants/conversationModes.js";

/**
 * ProgramAgent - Handles the business logic for training program management
 * This class manages program loading, active program tracking, and state management
 * while keeping the React component focused on UI concerns.
 */
export class ProgramAgent {
  constructor(userId, coachId, onStateChange = null) {
    this.userId = userId;
    this.coachId = coachId;
    this.onStateChange = onStateChange;

    // Validate callback
    if (this.onStateChange && typeof this.onStateChange !== "function") {
      console.error(
        "ProgramAgent: onStateChange must be a function, got:",
        typeof this.onStateChange,
      );
      this.onStateChange = null;
    }

    // Default callbacks
    this.onError = () => {};
    this.onProgramCreated = () => {};
    this.onProgramCompleted = () => {};

    // Polling intervals for workout linking
    this.pollingIntervals = new Map();

    // Initialize state
    this.programState = {
      programs: [], // All programs
      activePrograms: [], // Active programs only
      activeProgram: null, // Primary active program
      selectedProgram: null, // Currently viewing program
      todaysWorkout: null, // Today's workout templates
      isLoadingPrograms: false,
      isLoadingProgram: false,
      isLoadingTodaysWorkout: false,
      isUpdating: false,
      isLoggingWorkout: false,
      error: null,
      lastCheckTime: null,
    };

    // Add alias for backward compatibility
    this.state = this.programState;
  }

  /**
   * Updates the program state and triggers callback
   */
  _updateState(newStateData) {
    const oldState = { ...this.programState };

    // Update state
    this.programState = {
      ...this.programState,
      ...newStateData,
    };

    // Update alias for backward compatibility
    this.state = this.programState;

    // Call state change callback if available
    if (this.onStateChange && typeof this.onStateChange === "function") {
      try {
        this.onStateChange(this.programState);
      } catch (error) {
        console.error(
          "ProgramAgent._updateState: Error in state change callback:",
          error,
        );
      }
    }
  }

  /**
   * Sets the user ID and coach ID and reloads data
   */
  async setUserAndCoach(userId, coachId) {
    if (!userId) {
      console.error("ProgramAgent.setUserAndCoach: userId is required");
      return;
    }

    if (!coachId) {
      console.error("ProgramAgent.setUserAndCoach: coachId is required");
      return;
    }

    this.userId = userId;
    this.coachId = coachId;

    // Load initial data
    await this.loadPrograms();
  }

  /**
   * Load all training programs for the user and coach
   * @param {Object} options - Optional query parameters
   * @param {string} options.status - Filter by status (active, paused, completed, archived)
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.sortBy - Sort by field
   * @param {string} options.sortOrder - Sort order
   */
  async loadPrograms(options = {}) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.loadPrograms: userId and coachId are required",
      );
      return;
    }

    this._updateState({
      isLoadingPrograms: true,
      error: null,
    });

    try {
      const response = await getPrograms(this.userId, this.coachId, options);

      const programs = response.programs || [];
      const activePrograms = programs.filter(
        (p) => p.status === PROGRAM_STATUS.ACTIVE,
      );

      // Set the first active program as the primary active program
      const activeProgram =
        activePrograms.length > 0 ? activePrograms[0] : null;

      this._updateState({
        programs,
        activePrograms,
        activeProgram,
        isLoadingPrograms: false,
        lastCheckTime: new Date(),
      });

      return response;
    } catch (error) {
      console.error("ProgramAgent.loadPrograms: Error:", error);
      this._updateState({
        error: error.message,
        isLoadingPrograms: false,
      });

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Load a specific training program by ID
   * @param {string} programId - The program ID
   */
  async loadProgram(programId) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.loadProgram: userId and coachId are required",
      );
      return;
    }

    if (!programId) {
      console.error("ProgramAgent.loadProgram: programId is required");
      return;
    }

    this._updateState({
      isLoadingProgram: true,
      error: null,
    });

    try {
      const response = await getProgram(this.userId, this.coachId, programId);

      const program = response.program;

      this._updateState({
        selectedProgram: program,
        isLoadingProgram: false,
      });

      // If this is an active program and we don't have an active program set, set it
      if (
        program.status === PROGRAM_STATUS.ACTIVE &&
        !this.programState.activeProgram
      ) {
        this._updateState({ activeProgram: program });
      }

      return response;
    } catch (error) {
      console.error("ProgramAgent.loadProgram: Error:", error);
      this._updateState({
        error: error.message,
        isLoadingProgram: false,
      });

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Load workout templates for a program
   * @param {string} programId - The program ID (defaults to active program if not provided)
   * @param {Object} [options] - Optional query parameters
   * @param {boolean} [options.today] - Get today's workout templates
   * @param {number} [options.day] - Get templates for specific day number
   * @returns {Promise<Object>} - The API response with workout templates
   */
  async loadWorkoutTemplates(programId = null, options = {}) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.loadWorkoutTemplates: userId and coachId are required",
      );
      return;
    }

    // Use provided programId or default to active program
    const targetProgramId =
      programId || this.programState.activeProgram?.programId;

    if (!targetProgramId) {
      console.error(
        "ProgramAgent.loadWorkoutTemplates: No programId provided and no active program found",
      );
      return;
    }

    this._updateState({
      isLoadingTodaysWorkout: true,
      error: null,
    });

    try {
      const response = await getWorkoutTemplates(
        this.userId,
        this.coachId,
        targetProgramId,
        options,
      );

      // If loading today's workout, update the todaysWorkout state
      if (options.today) {
        this._updateState({
          todaysWorkout:
            response.todaysWorkoutTemplates ||
            response.workoutTemplates ||
            null,
          isLoadingTodaysWorkout: false,
        });
      } else {
        this._updateState({
          isLoadingTodaysWorkout: false,
        });
      }

      return response;
    } catch (error) {
      console.error("ProgramAgent.loadWorkoutTemplates: Error:", error);
      this._updateState({
        error: error.message,
        isLoadingTodaysWorkout: false,
      });

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Update a program (pause, resume, complete, archive, update)
   * @param {string} programId - The program ID
   * @param {string} action - The action to perform (pause, resume, complete, archive, update)
   * @param {Object} data - Additional data for updates (e.g., { name: 'New Name' })
   */
  async updateProgramStatus(programId, action, data = {}) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.updateProgramStatus: userId and coachId are required",
      );
      return;
    }

    if (!programId) {
      console.error("ProgramAgent.updateProgramStatus: programId is required");
      return;
    }

    if (!action) {
      console.error("ProgramAgent.updateProgramStatus: action is required");
      return;
    }

    this._updateState({
      isUpdating: true,
      error: null,
    });

    try {
      const body = { action, ...data };
      const response = await updateProgram(
        this.userId,
        this.coachId,
        programId,
        body,
      );

      const updatedProgram = response.program;

      // Update the program in our state
      const programs = this.programState.programs.map((p) =>
        p.programId === programId ? updatedProgram : p,
      );

      const activePrograms = programs.filter(
        (p) => p.status === PROGRAM_STATUS.ACTIVE,
      );
      const activeProgram =
        activePrograms.length > 0 ? activePrograms[0] : null;

      // Update selected program if it's the one we updated
      const selectedProgram =
        this.programState.selectedProgram?.programId === programId
          ? updatedProgram
          : this.programState.selectedProgram;

      this._updateState({
        programs,
        activePrograms,
        activeProgram,
        selectedProgram,
        isUpdating: false,
      });

      // Trigger completion callback if program was completed
      if (action === "complete" && this.onProgramCompleted) {
        this.onProgramCompleted(updatedProgram);
      }

      return response;
    } catch (error) {
      console.error("ProgramAgent.updateProgramStatus: Error:", error);
      this._updateState({
        error: error.message,
        isUpdating: false,
      });

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Log a workout from a template with automatic polling for linkedWorkoutId
   * @param {string} programId - The program ID
   * @param {string} templateId - The workout template ID
   * @param {Object} workoutData - The workout data to log
   * @param {Object} options - Optional configuration
   * @param {boolean} options.today - Whether this is today's workout
   * @param {number} options.day - Specific day number if not today
   * @returns {Promise<Object>} - The API response
   */
  async logWorkoutFromTemplate(
    programId,
    templateId,
    workoutData,
    options = {},
  ) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.logWorkoutFromTemplate: userId and coachId are required",
      );
      return;
    }

    if (!programId || !templateId) {
      console.error(
        "ProgramAgent.logWorkoutFromTemplate: programId and templateId are required",
      );
      return;
    }

    this._updateState({
      isLoggingWorkout: true,
      error: null,
    });

    try {
      const response = await logWorkout(
        this.userId,
        this.coachId,
        programId,
        templateId,
        workoutData,
      );

      this._updateState({
        isLoggingWorkout: false,
      });

      // Start polling for linkedWorkoutId after a short delay
      setTimeout(() => {
        this._startPollingForLinkedWorkout(programId, templateId, options);
      }, 3000);

      return response;
    } catch (error) {
      console.error("ProgramAgent.logWorkoutFromTemplate: Error:", error);
      this._updateState({
        error: error.message,
        isLoggingWorkout: false,
      });

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Internal method to poll for linkedWorkoutId after logging
   * @private
   */
  async _startPollingForLinkedWorkout(programId, templateId, options = {}) {
    let pollCount = 0;
    const maxPolls = 60; // Max 3 minutes (60 * 3 seconds)

    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        // Reload workout templates silently
        const freshData = await this.loadWorkoutTemplates(programId, options);

        if (freshData && freshData.templates) {
          const updatedTemplate = freshData.templates.find(
            (t) => t.templateId === templateId,
          );

          // If linkedWorkoutId is now available, stop polling
          if (updatedTemplate && updatedTemplate.linkedWorkoutId) {
            console.log(
              "✅ linkedWorkoutId found:",
              updatedTemplate.linkedWorkoutId,
            );
            clearInterval(pollInterval);
            this.pollingIntervals.delete(templateId);
          }
        } else if (
          freshData &&
          freshData.todaysWorkoutTemplates &&
          freshData.todaysWorkoutTemplates.templates
        ) {
          const updatedTemplate =
            freshData.todaysWorkoutTemplates.templates.find(
              (t) => t.templateId === templateId,
            );

          if (updatedTemplate && updatedTemplate.linkedWorkoutId) {
            console.log(
              "✅ linkedWorkoutId found:",
              updatedTemplate.linkedWorkoutId,
            );
            clearInterval(pollInterval);
            this.pollingIntervals.delete(templateId);
          }
        }

        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          console.warn(
            "⏱️ Max polling attempts reached for template:",
            templateId,
          );
          clearInterval(pollInterval);
          this.pollingIntervals.delete(templateId);
        }
      } catch (err) {
        console.error("Error polling for linkedWorkoutId:", err);
        // Continue polling even if there's an error
      }
    }, 3000); // Poll every 3 seconds

    // Store interval ID for cleanup
    this.pollingIntervals.set(templateId, pollInterval);
  }

  /**
   * Skip a workout template
   * @param {string} programId - The program ID
   * @param {string} templateId - The workout template ID
   * @param {Object} options - Optional configuration
   * @param {string} options.skipReason - Reason for skipping
   * @param {string} options.skipNotes - Additional notes
   * @param {boolean} options.today - Whether this is today's workout
   * @param {number} options.day - Specific day number if not today
   * @returns {Promise<Object>} - The API response
   */
  async skipWorkoutTemplate(programId, templateId, options = {}) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.skipWorkoutTemplate: userId and coachId are required",
      );
      return;
    }

    if (!programId || !templateId) {
      console.error(
        "ProgramAgent.skipWorkoutTemplate: programId and templateId are required",
      );
      return;
    }

    this._updateState({
      isUpdating: true,
      error: null,
    });

    try {
      const response = await skipWorkout(
        this.userId,
        this.coachId,
        programId,
        templateId,
        {
          skipReason: options.skipReason || "Skipped by user",
          skipNotes: options.skipNotes,
          action: "skip",
        },
      );

      this._updateState({
        isUpdating: false,
      });

      // Reload workout templates to reflect the skip
      const reloadOptions = {};
      if (options.today) {
        reloadOptions.today = true;
      } else if (options.day) {
        reloadOptions.day = options.day;
      }

      await this.loadWorkoutTemplates(programId, reloadOptions);

      return response;
    } catch (error) {
      console.error("ProgramAgent.skipWorkoutTemplate: Error:", error);
      this._updateState({
        error: error.message,
        isUpdating: false,
      });

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Unskip a workout template (revert to pending status)
   * @param {string} programId - The program ID
   * @param {string} templateId - The workout template ID
   * @param {Object} options - Optional configuration
   * @param {boolean} options.today - Whether this is today's workout
   * @param {number} options.day - Specific day number if not today
   * @returns {Promise<Object>} - The API response
   */
  async unskipWorkoutTemplate(programId, templateId, options = {}) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.unskipWorkoutTemplate: userId and coachId are required",
      );
      return;
    }

    if (!programId || !templateId) {
      console.error(
        "ProgramAgent.unskipWorkoutTemplate: programId and templateId are required",
      );
      return;
    }

    this._updateState({
      isUpdating: true,
      error: null,
    });

    try {
      const response = await skipWorkout(
        this.userId,
        this.coachId,
        programId,
        templateId,
        {
          action: "unskip",
        },
      );

      this._updateState({
        isUpdating: false,
      });

      // Reload workout templates to reflect the unskip
      const reloadOptions = {};
      if (options.today) {
        reloadOptions.today = true;
      } else if (options.day) {
        reloadOptions.day = options.day;
      }

      await this.loadWorkoutTemplates(programId, reloadOptions);

      return response;
    } catch (error) {
      console.error("ProgramAgent.unskipWorkoutTemplate: Error:", error);
      this._updateState({
        error: error.message,
        isUpdating: false,
      });

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Pause a program
   * @param {string} programId - The program ID
   */
  async pauseProgram(programId) {
    return this.updateProgramStatus(programId, "pause");
  }

  /**
   * Resume a paused program
   * @param {string} programId - The program ID
   */
  async resumeProgram(programId) {
    return this.updateProgramStatus(programId, "resume");
  }

  /**
   * Complete a program
   * @param {string} programId - The program ID
   */
  async completeProgram(programId) {
    return this.updateProgramStatus(programId, "complete");
  }

  /**
   * Delete a program (soft delete - sets status to archived)
   * @param {string} programId - The program ID
   */
  async deleteProgram(programId) {
    if (!this.userId || !this.coachId) {
      console.error(
        "ProgramAgent.deleteProgram: userId and coachId are required",
      );
      throw new Error("userId and coachId are required");
    }

    if (!programId) {
      console.error("ProgramAgent.deleteProgram: programId is required");
      throw new Error("programId is required");
    }

    try {
      // Call the DELETE API via the programApi helper
      const result = await deleteProgram(this.userId, this.coachId, programId);

      console.info("Training program deleted successfully:", {
        programId,
        userId: this.userId,
        coachId: this.coachId,
      });

      return result;
    } catch (error) {
      console.error("Error deleting training program:", error);
      throw error;
    }
  }

  /**
   * Get the currently active program
   */
  getActiveProgram() {
    return this.programState.activeProgram;
  }

  /**
   * Get today's workout templates
   */
  getTodaysWorkout() {
    return this.programState.todaysWorkout;
  }

  /**
   * Get all training programs
   */
  getPrograms() {
    return this.programState.programs;
  }

  /**
   * Get the current state
   */
  getState() {
    return this.programState;
  }

  /**
   * Check if there's an active program
   */
  hasActiveProgram() {
    return this.programState.activeProgram !== null;
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Clean up polling intervals
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();

    // Clean up any resources
    this.onStateChange = null;
    this.onError = null;
    this.onProgramCreated = null;
    this.onProgramCompleted = null;
  }

  /**
   * Static method to get incomplete program designer sessions for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of session summaries
   */
  static async getIncompleteSessions(userId) {
    if (!userId) {
      console.warn("Cannot load program designer sessions without userId");
      return [];
    }

    try {
      // Query backend for incomplete sessions
      // We assume the backend API supports filtering by isComplete
      const result = await getProgramDesignerSessions(userId, {
        isComplete: false,
        limit: 10,
        sortBy: "lastActivity",
        sortOrder: "desc",
      });

      return result.sessions || [];
    } catch (error) {
      console.error(
        "Error loading incomplete program designer sessions:",
        error,
      );
      return [];
    }
  }

  /**
   * Static method to get completed program designer sessions (for checking build status)
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of completed session summaries
   */
  static async getCompletedSessions(userId) {
    if (!userId) {
      console.warn(
        "Cannot load completed program designer sessions without userId",
      );
      return [];
    }

    try {
      // Query backend for completed sessions
      // These might be completed Q&A but program build is still in progress or failed
      const result = await getProgramDesignerSessions(userId, {
        isComplete: true,
        limit: 10,
        sortBy: "lastActivity",
        sortOrder: "desc",
      });

      return result.sessions || [];
    } catch (error) {
      console.error(
        "Error loading completed program designer sessions:",
        error,
      );
      return [];
    }
  }

  /**
   * Static method to delete a program designer session
   * @param {string} userId - The user ID
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} - The deletion result
   */
  static async deleteSession(userId, sessionId) {
    if (!userId || !sessionId) {
      throw new Error("User ID and Session ID are required");
    }

    try {
      console.info("Deleting program designer session:", { userId, sessionId });
      const result = await deleteProgramDesignerSession(userId, sessionId);
      return result;
    } catch (error) {
      console.error("Error deleting program designer session:", error);
      throw error;
    }
  }

  /**
   * Static method to retry building a program from a failed session
   * @param {string} sessionId - The session ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - The retry result
   */
  static async retryBuild(sessionId, userId) {
    if (!userId || !sessionId) {
      throw new Error("User ID and Session ID are required");
    }

    try {
      console.info("Retrying program build:", { userId, sessionId });
      const result = await retryProgramBuild(userId, sessionId);
      return result;
    } catch (error) {
      console.error("Error retrying program build:", error);
      throw error;
    }
  }
}
