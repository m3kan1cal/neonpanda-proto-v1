import { nanoid } from "nanoid";
import {
  getCoaches,
  getCoach,
  getCoachTemplates,
  createCoachFromTemplate,
  createCoachFromSession,
  updateCoachConfig,
  deleteCoachConfig,
} from "../apis/coachApi";
import { logger } from "../logger";
import {
  createCoachCreatorSession,
  getCoachConfigStatus,
} from "../apis/coachCreatorApi";

/**
 * CoachAgent - Handles the business logic for coach management
 * This class manages coach loading, creation, in-progress tracking, and state management
 * while keeping the React component focused on UI concerns.
 */
export class CoachAgent {
  constructor(options = {}) {
    // Configuration
    this.userId = options.userId || null;
    this.onStateChange = options.onStateChange || (() => {});
    this.onNavigation = options.onNavigation || (() => {});
    this.onError = options.onError || (() => {});

    // State
    this.state = {
      coaches: [],
      templates: [],
      isLoading: false,
      isUpdating: false,
      templatesLoading: false,
      error: null,
      templatesError: null,
      inProgressCoach: null,
    };

    // Internal tracking
    this.pollInterval = null;
    this.cleanupTimeout = null;

    // Bind methods
    this.loadCoaches = this.loadCoaches.bind(this);
    this.loadTemplates = this.loadTemplates.bind(this);
    this.createNewCoach = this.createNewCoach.bind(this);
    this.createCoachFromTemplate = this.createCoachFromTemplate.bind(this);
    this.startPolling = this.startPolling.bind(this);
    this.stopPolling = this.stopPolling.bind(this);
    this.cleanup = this.cleanup.bind(this);

    // Don't auto-initialize - let the component call initialize() when ready
  }

  /**
   * Updates internal state and notifies listeners
   */
  _updateState(newState) {
    this.state = { ...this.state, ...newState };
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.state);
    } else {
      logger.warn(
        "CoachAgent: onStateChange is not a function, skipping state update notification"
      );
    }
  }

  /**
   * Sets the userId and triggers coach loading
   */
  setUserId(userId) {
    if (this.userId !== userId) {
      this.userId = userId;
      if (userId) {
        // Set loading state immediately before starting to load
        this._updateState({ isLoading: true });
        this.loadCoaches();
        this.loadTemplates();
      }
    }
  }

  /**
   * Initialize the agent after React component is ready
   */
  initialize() {
    if (this.userId) {
      this._updateState({ isLoading: true, error: null });
      this.loadCoaches();
      this.loadTemplates();
    } else {
      this.loadTemplates();
    }
  }

  /**
   * Loads coaches from the API
   */
  async loadCoaches() {
    if (!this.userId) return;

    this._updateState({ isLoading: true, error: null });

    try {
      const result = await getCoaches(this.userId);
      const coaches = result.coaches || [];

      this._updateState({
        coaches,
        isLoading: false,
      });

      // Check if we should clear in-progress coach (if it now exists in the coaches list)
      if (this.state.inProgressCoach && coaches.length > 0) {
        const inProgressSessionId = this.state.inProgressCoach.sessionId;
        const coachExists = coaches.some(
          (c) => c.metadata?.coach_creator_session_id === inProgressSessionId
        );

        if (coachExists) {
          this._updateState({ inProgressCoach: null });
          this.stopPolling();
        }
      }

      return coaches;
    } catch (error) {
      logger.error("Error loading coaches:", error);
      this._updateState({
        isLoading: false,
        error: error.message,
        coaches: [],
      });
      this.onError(error);
      throw error;
    }
  }

  /**
   * Loads coach templates from the API
   */
  async loadTemplates() {
    this._updateState({ templatesLoading: true, templatesError: null });

    try {
      const result = await getCoachTemplates();
      const templates = result.templates || [];

      this._updateState({
        templates,
        templatesLoading: false,
      });

      return templates;
    } catch (error) {
      logger.error("Error loading coach templates:", error);
      this._updateState({
        templatesLoading: false,
        templatesError: error.message,
        templates: [],
      });
      this.onError(error);
      throw error;
    }
  }

  /**
   * Load details for a specific coach
   * @param {string} userId - The user ID
   * @param {string} coachId - The coach ID
   * @returns {Promise<Object>} Formatted coach data
   */
  async loadCoachDetails(userId, coachId) {
    if (!userId || !coachId) {
      throw new Error("userId and coachId are required");
    }

    try {
      const coachData = await getCoach(userId, coachId);

      if (!coachData) {
        throw new Error("Coach not found");
      }

      // Extract coach data from full configuration
      const primaryMethodologyRaw =
        coachData.coachConfig?.metadata?.methodology_profile?.primary ||
        coachData.coachConfig?.technical_config?.methodology ||
        coachData.coachConfig?.selected_methodology?.primary_methodology;

      const formattedPrimaryMethodology = primaryMethodologyRaw
        ? primaryMethodologyRaw
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
        : "Custom";

      const formattedCoachData = {
        name: this.formatCoachName(coachData.coachConfig?.coach_name),
        specialization: this.getSpecializationDisplay(
          coachData.coachConfig?.technical_config?.specializations
        ),
        experienceLevel: this.getExperienceLevelDisplay(
          coachData.coachConfig?.technical_config?.experience_level
        ),
        programmingFocus: this.getProgrammingFocusDisplay(
          coachData.coachConfig?.technical_config?.programming_focus
        ),
        primaryMethodology: formattedPrimaryMethodology,
        totalConversations:
          coachData.coachConfig?.metadata?.total_conversations || 0,
        activePrograms: coachData.coachConfig?.metadata?.active_programs || 0,
        joinedDate: coachData.createdAt,
        rawCoach: coachData, // Keep the full coach object for any additional data needed
      };

      return formattedCoachData;
    } catch (error) {
      logger.error("Error loading coach details:", error);
      this.onError(error);
      throw error;
    }
  }

  /**
   * Creates a coach from a template
   */
  async createCoachFromTemplate(templateId, providedUserId = null) {
    try {
      this._updateState({ error: null });

      // Generate userId if not provided
      const userId = providedUserId || this.userId || nanoid(21);

      // Create coach from template via API
      const result = await createCoachFromTemplate(userId, templateId);
      const { coachConfig } = result;

      // Reload coaches to show the new one
      await this.loadCoaches();

      return coachConfig;
    } catch (error) {
      logger.error("Error creating coach from template:", error);
      this._updateState({
        error: "Failed to create coach from template. Please try again.",
      });
      this.onError(error);
      throw error;
    }
  }

  /**
   * Creates a coach from a completed coach creator session (retry build)
   */
  async createCoachFromSession(sessionId, providedUserId = null) {
    try {
      this._updateState({ error: null });

      // Generate userId if not provided
      const userId = providedUserId || this.userId;

      if (!userId || !sessionId) {
        throw new Error("User ID and Session ID are required");
      }

      // Create coach from session via API
      const result = await createCoachFromSession(userId, sessionId);

      // Reload coaches to show the new one (it will be building)
      await this.loadCoaches();

      return result;
    } catch (error) {
      logger.error("Error creating coach from session:", error);
      this._updateState({
        error: "Failed to create coach from session. Please try again.",
      });
      this.onError(error);
      throw error;
    }
  }

  /**
   * Creates a new coach creator session and navigates to it
   */
  async createNewCoach(providedUserId = null) {
    try {
      this._updateState({ error: null });

      // Generate userId if not provided
      const userId = providedUserId || this.userId || nanoid(21);

      // Create coach creator session via API
      const result = await createCoachCreatorSession(userId);
      const { sessionId } = result;

      // Notify navigation handler
      this.onNavigation("coach-creator", { userId, sessionId });

      return { userId, sessionId };
    } catch (error) {
      logger.error("Error creating coach creator session:", error);
      this._updateState({
        error: "Failed to create new coach creator session. Please try again.",
      });
      this.onError(error);
      throw error;
    }
  }

  /**
   * Checks for in-progress coach builds from DynamoDB sessions
   * Called by Coaches page, not by agent directly
   */
  async checkInProgressCoachBuilds() {
    // This will be handled by the Coaches page loading sessions
    // with isComplete: true and configGenerationStatus: 'IN_PROGRESS'
    return null;
  }

  /**
   * Starts polling for coach completion
   * Used when there's a known in-progress build (from DynamoDB session)
   */
  startPolling(sessionId) {
    if (this.pollInterval) return; // Already polling
    if (!sessionId) {
      logger.error("Cannot start polling without sessionId");
      return;
    }

    logger.info(`Starting polling for coach build from session ${sessionId}`);

    this.pollInterval = setInterval(async () => {
      try {
        // Check if coach has been created
        const result = await getCoaches(this.userId);
        if (result.coaches?.length > 0) {
          // Check if any coach was created from this session
          const newCoach = result.coaches.find(
            (c) => c.metadata?.coach_creator_session_id === sessionId
          );

          if (newCoach) {
            // Coach has been created, update state and stop polling
            logger.info(`✅ Coach found for session ${sessionId}, stopping polling`);
            this._updateState({
              coaches: result.coaches,
              inProgressCoach: null,
            });
            this.stopPolling();
            return;
          }
        }

        // If no coach yet, check the session status
        try {
          const statusResponse = await getCoachConfigStatus(
            this.userId,
            sessionId
          );

          if (statusResponse.status === "FAILED") {
            // Build failed - update state and stop polling
            logger.info(`❌ Coach build failed for session ${sessionId}, stopping polling`);
            this._updateState({
              inProgressCoach: {
                sessionId,
                status: "failed",
                error:
                  statusResponse.message ||
                  "Coach configuration generation failed",
              },
            });
            this.stopPolling();
            return;
          }

          if (statusResponse.status === "COMPLETE") {
            // Complete - refresh coaches and stop polling
            logger.info(`✅ Coach build complete for session ${sessionId}, refreshing and stopping polling`);
            await this.loadCoaches();

            // Clear in-progress state and stop polling
            this._updateState({ inProgressCoach: null });
            this.stopPolling();
            return;
          }

          // Status is IN_PROGRESS - continue polling
          logger.info(`⏳ Coach build still in progress for session ${sessionId} (status: ${statusResponse.status})`);
        } catch (statusError) {
          logger.error("Error checking coach config status:", statusError);
          // Continue polling even if status check fails - it might be a transient error
        }
      } catch (error) {
        logger.error("Error polling for coaches:", error);
      }
    }, 10000); // Poll every 10 seconds

    // Clean up polling after 10 minutes
    this.cleanupTimeout = setTimeout(
      () => {
        this.stopPolling();
        this._updateState({
          inProgressCoach: {
            sessionId,
            status: "timeout",
            error:
              "Coach creation timed out. Please try again or contact support.",
          },
        });
      },
      10 * 60 * 1000
    );
  }

  /**
   * Stops polling for coach completion
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }

  /**
   * Clears the in-progress coach state
   */
  clearInProgressCoach() {
    this._updateState({ inProgressCoach: null });
    this.stopPolling();
  }

  /**
   * Updates coach config metadata (coach name, description, etc.)
   * @param {string} userId - The user ID
   * @param {string} coachId - The coach ID
   * @param {Object} metadata - The metadata to update (e.g., { coach_name: "New Name" })
   * @returns {Promise<Object>} - The updated coach config
   */
  async updateCoachConfig(userId, coachId, metadata) {
    try {
      this._updateState({ isUpdating: true, error: null });

      const result = await updateCoachConfig(userId, coachId, metadata);

      // Update the coach in local state
      const updatedCoaches = this.state.coaches.map((coach) => {
        if (coach.coachId === coachId) {
          return {
            ...coach,
            coachConfig: {
              ...coach.coachConfig,
              ...metadata,
            },
            // Update formatted name if coach_name changed
            name: metadata.coach_name
              ? this.formatCoachName(metadata.coach_name)
              : coach.name,
          };
        }
        return coach;
      });

      this._updateState({
        coaches: updatedCoaches,
        isUpdating: false,
      });

      logger.info("Coach config updated successfully in agent:", {
        coachId,
        userId,
        updatedFields: Object.keys(metadata),
      });

      return result;
    } catch (error) {
      logger.error("Error updating coach config:", error);
      this._updateState({
        error: error.message,
        isUpdating: false,
      });
      throw error;
    }
  }

  /**
   * Delete a coach (soft delete - sets status to archived)
   * @param {string} userId - The user ID
   * @param {string} coachId - The coach ID to delete
   * @returns {Promise<Object>} - The deleted coach response
   */
  async deleteCoach(userId, coachId) {
    try {
      this._updateState({ isUpdating: true, error: null });

      // Call the DELETE API via the coachApi helper
      const result = await deleteCoachConfig(userId, coachId);

      // Remove the deleted coach from local state
      const updatedCoaches = this.state.coaches.filter(
        (coach) => coach.coach_id !== coachId
      );

      this._updateState({
        coaches: updatedCoaches,
        isUpdating: false,
      });

      logger.info("Coach deleted successfully:", {
        coachId,
        userId,
      });

      return result;
    } catch (error) {
      logger.error("Error deleting coach:", error);
      this._updateState({
        error: error.message,
        isUpdating: false,
      });
      throw error;
    }
  }

  /**
   * Convenience method to update coach name with state management
   * Returns a function that can be used directly as the onSave handler for InlineEditField
   *
   * @param {string} userId - The user ID
   * @param {string} coachId - The coach ID
   * @param {Function} updateCoachName - Function to update coach name in component state
   *                                      Can be setCoachData or a custom updater
   * @param {Object} toast - Toast notification object with success/error methods
   * @returns {Function} - Handler function that takes newName and returns Promise<boolean>
   *
   * @example
   * // Simple state setter
   * const handleSaveCoachName = coachAgent.createCoachNameHandler(
   *   userId, coachId, setCoachData, { success, error }
   * );
   *
   * @example
   * // Custom state updater for nested state
   * const handleSaveCoachName = coachAgent.createCoachNameHandler(
   *   userId,
   *   coachId,
   *   (newName) => setCoachState(prev => ({ ...prev, coach: { ...prev.coach, name: newName }})),
   *   { success, error }
   * );
   */
  createCoachNameHandler(userId, coachId, updateCoachName, toast) {
    return async (newName) => {
      if (!newName || !newName.trim()) {
        return false;
      }

      try {
        await this.updateCoachConfig(userId, coachId, {
          coach_name: newName.trim(),
        });

        // Update coach name in component state using provided updater
        if (updateCoachName) {
          if (typeof updateCoachName === "function") {
            // Check if it's a simple setter or needs the new name
            const updateFn =
              updateCoachName.length === 0
                ? () => updateCoachName(newName.trim())
                : updateCoachName;

            if (updateCoachName.length === 1) {
              // It's a custom updater that takes the new name
              updateFn(newName.trim());
            } else {
              // It's a setState function
              updateCoachName((prevData) => ({
                ...prevData,
                name: newName.trim(),
              }));
            }
          }
        }

        if (toast?.success) {
          toast.success("Coach name updated successfully");
        }

        return true;
      } catch (error) {
        logger.error("Error updating coach name:", error);
        if (toast?.error) {
          toast.error("Failed to update coach name");
        }
        return false;
      }
    };
  }

  /**
   * Formats coach name for display
   */
  formatCoachName(name) {
    return name ? name.replace(/_/g, " ") : "";
  }

  /**
   * Formats date for display
   */
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Formats specializations for display
   */
  getSpecializationDisplay(specializations) {
    if (!specializations || specializations.length === 0)
      return "General Fitness";
    return specializations
      .map((spec) =>
        spec.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      )
      .join(", ");
  }

  /**
   * Formats programming focus for display
   */
  getProgrammingFocusDisplay(focus) {
    if (!focus || focus.length === 0) return "General";
    return focus.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(" & ");
  }

  /**
   * Gets experience level display text
   */
  getExperienceLevelDisplay(level) {
    return level ? level.charAt(0).toUpperCase() + level.slice(1) : "General";
  }

  /**
   * Formats coach description for display
   */
  getCoachDescription(coach) {
    return coach?.coach_description || coach?.metadata?.coach_description || null;
  }

  /**
   * Formats methodology focus areas for display
   */
  getMethodologyFocusDisplay(coach, maxItems = 3) {
    const focus = coach?.metadata?.methodology_profile?.focus;
    if (!focus || focus.length === 0) return "General Fitness";

    const formatted = focus
      .map((item) =>
        item.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      )
      .slice(0, maxItems);

    return focus.length > maxItems ? `${formatted.join(", ")}...` : formatted.join(", ");
  }

  /**
   * Formats methodology preferences for display
   */
  getMethodologyPreferencesDisplay(coach, maxItems = 3) {
    const preferences = coach?.metadata?.methodology_profile?.preferences;
    if (!preferences || preferences.length === 0) return null;

    const formatted = preferences
      .map((item) =>
        item.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      )
      .slice(0, maxItems);

    return preferences.length > maxItems ? `${formatted.join(", ")}...` : formatted.join(", ");
  }

  /**
   * Gets training frequency display text
   */
  getTrainingFrequencyDisplay(coach) {
    const frequency = coach?.technical_config?.training_frequency;
    if (!frequency) return null;
    return `${frequency}x/week`;
  }

  /**
   * Formats template target audience for display
   */
  getTemplateAudienceDisplay(targetAudience) {
    if (!targetAudience || targetAudience.length === 0) return "General";
    return targetAudience
      .map((tag) =>
        tag.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      )
      .slice(0, 3)
      .join(", ");
  }

  /**
   * Gets current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Gets user info
   */
  getUserInfo() {
    return {
      userId: this.userId,
      hasUserId: !!this.userId,
      hasCoaches: this.state.coaches.length > 0,
      hasInProgressCoach: !!this.state.inProgressCoach,
    };
  }

  /**
   * Determines if should show empty state
   */
  shouldShowEmptyState() {
    const userInfo = this.getUserInfo();
    return (
      !userInfo.hasUserId ||
      (!this.state.isLoading &&
        !userInfo.hasCoaches &&
        !userInfo.hasInProgressCoach &&
        !this.state.error)
    );
  }

  /**
   * Refreshes coaches by reloading from API
   */
  async refresh() {
    return this.loadCoaches();
  }

  /**
   * Cleans up and destroys the agent
   */
  cleanup() {
    this.stopPolling();
    this.userId = null;
    this.state = null;
    this.onStateChange = null;
    this.onNavigation = null;
    this.onError = null;
  }

  /**
   * Destroys the agent (alias for cleanup for consistency with other agents)
   */
  destroy() {
    this.cleanup();
  }
}

export default CoachAgent;
