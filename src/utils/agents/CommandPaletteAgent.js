import { MemoryAgent } from "./MemoryAgent.js";
import { CoachConversationAgent } from "./CoachConversationAgent.js";

/**
 * CommandPaletteAgent - Handles command execution and state management
 * This class manages command execution logic while keeping the React component
 * focused on UI concerns.
 */
export class CommandPaletteAgent {
  constructor(userId, workoutAgent, onStateChange = null, onNavigation = null) {
    this.userId = userId;
    this.workoutAgent = workoutAgent;
    this.onStateChange = onStateChange;
    this.onNavigation = onNavigation;

    // Initialize memory agent
    this.memoryAgent = null;
    if (userId) {
      this.memoryAgent = new MemoryAgent(userId);
    }

    // Initialize conversation agent
    this.conversationAgent = null;

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

        case "start-conversation":
          result = await this._executeStartConversation(content, options);
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
          navigated: result.navigated || false,
        },
        error: null,
      });

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

    // Check if the WorkoutAgent has a userId set, and try to set it if not
    if (!this.workoutAgent.userId) {
      console.warn("CommandPaletteAgent: WorkoutAgent missing userId, attempting to set it");

      // Try to set the userId on the WorkoutAgent
      if (this.userId && this.workoutAgent.setUserId) {
        this.workoutAgent.setUserId(this.userId);

        // Double-check that it was set
        if (!this.workoutAgent.userId) {
          throw new Error("WorkoutAgent is not ready yet - please try again in a moment");
        }
      } else {
        throw new Error("WorkoutAgent is not ready yet - please try again in a moment");
      }
    }

    console.info("CommandPaletteAgent._executeLogWorkout:", {
      userId: this.userId,
      workoutAgentUserId: this.workoutAgent.userId,
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
      const scope = result.aiAnalysis.scope.isCoachSpecific
        ? "coach-specific"
        : "global";
      const typeInfo = result.aiAnalysis.typeAndImportance;

      message += ` (AI: ${scope}, ${typeInfo.type}, ${typeInfo.importance})`;
    }

    return {
      message,
      details: result,
    };
  }

  /**
   * Execute start-conversation command
   */
  async _executeStartConversation(content, options = {}) {
    if (!this.userId) {
      throw new Error("Unable to start conversation - user not authenticated");
    }

    // For now, we'll need to get the coachId from options or use a default
    // In a real implementation, you might want to show a coach selection UI
    const coachId = options.coachId;
    if (!coachId) {
      throw new Error(
        "Please select a coach first. Navigate to a coach page and try again."
      );
    }

    const initialMessage = content?.trim() || null;

    console.info("CommandPaletteAgent._executeStartConversation:", {
      userId: this.userId,
      coachId: coachId,
      hasInitialMessage: !!initialMessage,
      initialMessageLength: initialMessage?.length || 0,
      options,
    });

    // Initialize conversation agent if needed
    if (!this.conversationAgent) {
      this.conversationAgent = new CoachConversationAgent({
        userId: this.userId,
        coachId: coachId,
      });
    }

    // Create the conversation with optional initial message
    const result = await this.conversationAgent.createConversation(
      this.userId,
      coachId,
      null, // title (auto-generated)
      initialMessage
    );

    // Trigger navigation if callback is available
    if (this.onNavigation && result.conversation) {
      this.onNavigation("conversation-created", {
        userId: this.userId,
        coachId: coachId,
        conversationId: result.conversation.conversationId,
      });
    }

    const message = initialMessage
      ? "Conversation started with your message! Redirecting..."
      : "Conversation started successfully! Redirecting...";

    return {
      message,
      details: result,
      navigated: true, // Mark this command as triggering navigation
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
