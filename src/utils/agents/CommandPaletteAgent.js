import { MemoryAgent } from './MemoryAgent.js';

/**
 * CommandPaletteAgent - Handles command execution and state management
 * This class manages command execution logic while keeping the React component
 * focused on UI concerns.
 */
export class CommandPaletteAgent {
  constructor(userId, workoutAgent, onStateChange = null) {
    console.info("CommandPaletteAgent: Constructor called");
    console.info("CommandPaletteAgent: userId:", userId || "(not provided)");

    this.userId = userId;
    this.workoutAgent = workoutAgent;
    this.onStateChange = onStateChange;

    // Initialize memory agent
    this.memoryAgent = null;
    if (userId) {
      this.memoryAgent = new MemoryAgent(userId);
    }

    // Validate callback
    if (this.onStateChange && typeof this.onStateChange !== "function") {
      console.error(
        "CommandPaletteAgent: onStateChange must be a function, got:",
        typeof this.onStateChange
      );
      this.onStateChange = null;
    }

    // Initialize state
    this.state = {
      isExecuting: false,
      executionResult: null,
      error: null,
      lastExecutedCommand: null,
    };

    console.info("CommandPaletteAgent: Constructor complete");
  }

  /**
   * Updates the agent state and triggers callback
   */
  _updateState(newStateData) {
    const oldState = { ...this.state };

    // Update state
    this.state = {
      ...this.state,
      ...newStateData,
    };

    // Call state change callback if available
    if (this.onStateChange && typeof this.onStateChange === "function") {
      try {
        this.onStateChange(this.state);
      } catch (error) {
        console.error(
          "CommandPaletteAgent._updateState: Error in state change callback:",
          error
        );
      }
    }
  }

  /**
   * Sets the user ID
   */
  setUserId(userId) {
    console.info("CommandPaletteAgent.setUserId called with:", userId);
    this.userId = userId;

    // Reinitialize memory agent with new userId
    if (userId) {
      this.memoryAgent = new MemoryAgent(userId);
    } else {
      this.memoryAgent = null;
    }
  }

  /**
   * Sets the workout agent reference
   */
  setWorkoutAgent(workoutAgent) {
    console.info("CommandPaletteAgent.setWorkoutAgent called");
    this.workoutAgent = workoutAgent;
  }

  /**
   * Execute a command with the given content
   */
  async executeCommand(command, content, options = {}) {
    if (!command || !content || this.state.isExecuting) {
      console.warn(
        "CommandPaletteAgent.executeCommand: Invalid parameters or already executing"
      );
      return;
    }

    console.info("CommandPaletteAgent.executeCommand:", {
      commandId: command.id,
      commandTrigger: command.trigger,
      contentLength: content.length,
      options,
    });

    this._updateState({
      isExecuting: true,
      executionResult: null,
      error: null,
      lastExecutedCommand: command,
    });

    try {
      let result;

      switch (command.id) {
        case "log-workout":
          result = await this._executeLogWorkout(content, options);
          break;

        case "save-memory":
          result = await this._executeSaveMemory(content, options);
          break;

        default:
          throw new Error(
            `Command "${command.trigger}" is not yet implemented.`
          );
      }

      this._updateState({
        isExecuting: false,
        executionResult: {
          success: true,
          message: result.message,
          details: result.details || null,
        },
        error: null,
      });

      console.info("CommandPaletteAgent.executeCommand: Success:", result);
      return result;
    } catch (error) {
      console.error("CommandPaletteAgent.executeCommand: Error:", error);

      this._updateState({
        isExecuting: false,
        executionResult: {
          success: false,
          message:
            error.message || "An error occurred while executing the command.",
          details: error,
        },
        error: error.message || "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Execute log-workout command
   */
  async _executeLogWorkout(content, options = {}) {
    if (!this.workoutAgent || !this.userId) {
      throw new Error("Unable to log workout - missing required data");
    }

    console.info("CommandPaletteAgent._executeLogWorkout:", {
      userId: this.userId,
      contentLength: content.length,
      options,
    });

    const result = await this.workoutAgent.createWorkout(content, {
      coachId: options.coachId || null,
    });

    return {
      message:
        "Workout logged successfully! We're processing it in the background.",
      details: result,
    };
  }

  /**
   * Execute save-memory command
   */
  async _executeSaveMemory(content, options = {}) {
    if (!this.memoryAgent || !this.userId) {
      throw new Error("Unable to save memory - missing required data");
    }

    console.info("CommandPaletteAgent._executeSaveMemory:", {
      userId: this.userId,
      contentLength: content.length,
      options,
    });

    const memoryOptions = {
      coachId: options.coachId || null,
      // AI will determine memoryType and importance automatically
    };

    const result = await this.memoryAgent.createMemory(content, memoryOptions);

    if (!result) {
      throw new Error("Failed to save memory");
    }

        // Create informative message with AI analysis info
    let message = "Memory saved successfully!";
    if (result.aiAnalysis) {
      const scope = result.aiAnalysis.scope.isCoachSpecific ? "coach-specific" : "global";
      const typeInfo = result.aiAnalysis.typeAndImportance;

      message += ` (AI: ${scope}, ${typeInfo.type}, ${typeInfo.importance})`;
    }

    return {
      message,
      details: result,
    };
  }

  /**
   * Clear execution result
   */
  clearExecutionResult() {
    this._updateState({
      executionResult: null,
      error: null,
    });
  }

  /**
   * Reset agent state
   */
  reset() {
    this._updateState({
      isExecuting: false,
      executionResult: null,
      error: null,
      lastExecutedCommand: null,
    });
  }

  /**
   * Gets the current state
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
      isActive: !!this.userId,
      hasWorkoutAgent: !!this.workoutAgent,
    };
  }

  /**
   * Cleanup method
   */
  cleanup() {
    // No ongoing operations to clean up for now
  }

  /**
   * Destroys the agent and cleans up
   */
  destroy() {
    this.cleanup();
    this.userId = null;
    this.workoutAgent = null;
    this.memoryAgent = null;
    this.onStateChange = null;
    this.state = {
      isExecuting: false,
      executionResult: null,
      error: null,
      lastExecutedCommand: null,
    };
  }
}

export default CommandPaletteAgent;
