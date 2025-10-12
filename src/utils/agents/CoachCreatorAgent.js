import { nanoid } from "nanoid";
import {
  createCoachCreatorSession,
  updateCoachCreatorSession,
  streamCoachCreatorSession,
  getCoachCreatorSession,
  getCoachCreatorSessions,
  deleteCoachCreatorSession,
} from "../apis/coachCreatorApi";
import {
  processStreamingChunks,
  createStreamingMessage,
  handleStreamingFallback,
  resetStreamingState,
  validateStreamingInput,
} from "./streamingAgentHelper";

// Initial message constant
const INITIAL_MESSAGE =
  "Hi! I'm here to help you create your perfect AI fitness coach. This will take about 15-20 minutes, and I'll adapt the questions based on your experience level.\n\nWhat brings you here? Tell me about your main fitness goals.";

/**
 * CoachCreatorAgent - Handles the business logic for coach creation sessions
 * This class manages the conversation flow, session state, and API interactions
 * while keeping the React component focused on UI concerns.
 */
export class CoachCreatorAgent {
  constructor(options = {}) {
    // Configuration
    this.userId = options.userId || null;
    this.sessionId = options.sessionId || null;
    this.onStateChange = options.onStateChange || (() => {});
    this.onNavigation = options.onNavigation || (() => {});
    this.onError = options.onError || (() => {});

    // State
    this.state = {
      messages: [
        {
          id: 1,
          type: "ai",
          content: INITIAL_MESSAGE,
          timestamp: new Date().toISOString(),
        },
      ],
      isLoadingItem: false, // Standardized naming to match CoachConversations
      isTyping: false,
      isComplete: false,
      isRedirecting: false,
      error: null,
      sessionData: null,
      progress: {
        questionsCompleted: 0,
        estimatedTotal: 15, // Default estimate
        percentage: 0,
      },
      // Streaming-specific state
      isStreaming: false,
      streamingMessage: "",
      streamingMessageId: null,
      // Contextual updates (ephemeral UX feedback)
      contextualUpdate: null, // { content: string, stage: string }
    };

    // Bind methods
    this.createSession = this.createSession.bind(this);
    this.loadExistingSession = this.loadExistingSession.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.sendMessageStream = this.sendMessageStream.bind(this);
    this.clearConversation = this.clearConversation.bind(this);
    this.handleCompletion = this.handleCompletion.bind(this);
  }

  /**
   * Updates internal state and notifies listeners
   */
  _updateState(newState) {
    this.state = { ...this.state, ...newState };
    this.onStateChange(this.state);
  }

  /**
   * Adds a message to the conversation
   */
  _addMessage(message) {
    const messages = [...this.state.messages, message];
    this._updateState({ messages });
  }

  /**
   * Generates a unique message ID
   */
  _generateMessageId() {
    return Date.now() + Math.random();
  }

  /**
   * Creates a new coach creator session
   */
  async createSession(providedUserId = null) {
    try {
      this._updateState({ isLoadingItem: true, error: null });

      // Generate userId if not provided
      const userId = providedUserId || this.userId || nanoid(21);

      console.info("Creating new coach creator session for userId:", userId);

      // Create session via API
      const result = await createCoachCreatorSession(userId);
      const { sessionId, initialMessage } = result;

      // Update agent state
      this.userId = userId;
      this.sessionId = sessionId;

      // Set initial message from API
      const initialMsg = {
        id: 1,
        type: "ai",
        content: initialMessage,
        timestamp: new Date().toISOString(),
      };

      this._updateState({
        messages: [initialMsg],
        isLoadingItem: false,
      });

      // Notify navigation handler
      this.onNavigation("session-created", { userId, sessionId });

      return { userId, sessionId };
    } catch (error) {
      console.error("Error creating coach creator session:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to create coach creator session",
      });
      this.onError(error);
      throw error;
    }
  }

  /**
   * Loads an existing session from the backend
   */
  async loadExistingSession(userId, sessionId) {
    if (!userId || !sessionId) {
      throw new Error("User ID and Session ID are required");
    }

    try {
      this._updateState({ isLoadingItem: true, error: null, messages: [] });

      const sessionData = await getCoachCreatorSession(userId, sessionId);

      // Update agent state
      this.userId = userId;
      this.sessionId = sessionId;

      // Use progress details from API response if available
      let progressData = {
        questionsCompleted: 0,
        estimatedTotal: 15,
        percentage: 0,
      };

      if (sessionData.progressDetails) {
        // Use exact values from backend
        progressData = {
          questionsCompleted: sessionData.progressDetails.questionsCompleted,
          estimatedTotal: sessionData.progressDetails.totalQuestions,
          percentage: sessionData.progressDetails.percentage,
          sophisticationLevel: sessionData.progressDetails.sophisticationLevel,
          currentQuestion: sessionData.progressDetails.currentQuestion,
        };
      }

      // Reconstruct conversation from questionHistory
      const conversationMessages = [];
      let messageId = 1;

      if (
        sessionData.questionHistory &&
        sessionData.questionHistory.length > 0
      ) {
        sessionData.questionHistory.forEach((historyItem) => {
          // Add user response first if it exists
          if (
            historyItem.userResponse &&
            historyItem.userResponse.trim() !== ""
          ) {
            conversationMessages.push({
              id: messageId++,
              type: "user",
              content: historyItem.userResponse,
              timestamp: historyItem.timestamp || new Date().toISOString(),
              imageS3Keys: historyItem.imageS3Keys || undefined,
              messageType: historyItem.messageType || undefined,
            });
          }

          // Add AI response
          conversationMessages.push({
            id: messageId++,
            type: "ai",
            content: historyItem.aiResponse,
            timestamp: historyItem.timestamp || new Date().toISOString(),
          });
        });
      }

      // Check if session is already complete (coach config already generated)
      const isSessionComplete = sessionData.isComplete ||
                                sessionData.configGeneration?.status === 'COMPLETE';

      // Update state with loaded messages or keep initial message
      this._updateState({
        messages:
          conversationMessages.length > 0
            ? conversationMessages
            : this.state.messages,
        isLoadingItem: false,
        sessionData,
        progress: progressData,
        isComplete: isSessionComplete,
      });

      return sessionData;
    } catch (error) {
      console.error("Error loading existing session:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to load existing session",
      });

      // Handle session not found
      if (error.message === "Session not found or expired") {
        this.onNavigation("session-expired");
      }

      this.onError(error);
      throw error;
    }
  }

  /**
   * Sends a user message and processes the AI response
   * @param {string} messageContent - The user's message
   * @param {string[]} [imageS3Keys] - Optional array of S3 keys for uploaded images
   */
  async sendMessage(messageContent, imageS3Keys = []) {
    if (
      !messageContent.trim() ||
      this.state.isLoadingItem ||
      !this.userId ||
      !this.sessionId
    ) {
      return;
    }

    try {
      // Add user message
      const userMessage = {
        id: this._generateMessageId(),
        type: "user",
        content: messageContent.trim(),
        timestamp: new Date().toISOString(),
        imageS3Keys:
          imageS3Keys && imageS3Keys.length > 0 ? imageS3Keys : undefined,
        messageType:
          imageS3Keys && imageS3Keys.length > 0 ? "text_with_images" : "text",
      };

      this._addMessage(userMessage);
      this._updateState({ isLoadingItem: true, isTyping: true, error: null });

      // Send to API
      const result = await updateCoachCreatorSession(
        this.userId,
        this.sessionId,
        messageContent.trim(),
        imageS3Keys
      );

      // Prepare AI response
      let aiResponseContent =
        result.aiResponse || "Thank you for your response.";

      // Add next question if available and session not complete
      if (!result.isComplete && result.nextQuestion) {
        aiResponseContent += `\n\n${result.nextQuestion}`;
      }

      const aiResponse = {
        id: this._generateMessageId(),
        type: "ai",
        content: aiResponseContent,
        timestamp: new Date().toISOString(),
      };

      this._addMessage(aiResponse);

      // Update progress based on result
      const updatedProgress = { ...this.state.progress };

      // First update other progress fields from session data if available
      if (result.sessionData && result.sessionData.userContext) {
        const questionsCompleted = result.sessionData.userContext.responses
          ? Object.keys(result.sessionData.userContext.responses).length
          : 0;
        const currentQuestion =
          result.sessionData.userContext.currentQuestion || 1;
        const sophisticationLevel =
          result.sessionData.userContext.sophisticationLevel || "UNKNOWN";

        // Estimate total questions based on sophistication level
        let estimatedTotal = 11; // Default (updated to match new 11-question flow: 0-10)
        if (sophisticationLevel === "BEGINNER") {
          estimatedTotal = 10; // Question 10 skipped for beginners (questions 0-9)
        } else if (sophisticationLevel === "INTERMEDIATE") {
          estimatedTotal = 11; // All questions including competition goals (questions 0-10)
        } else if (sophisticationLevel === "ADVANCED") {
          estimatedTotal = 11;
        } else if (sophisticationLevel === "UNKNOWN") {
          estimatedTotal = Math.max(9, currentQuestion + 4); // Adjust estimate as we progress
        }

        updatedProgress.questionsCompleted = questionsCompleted;
        updatedProgress.estimatedTotal = estimatedTotal;
        updatedProgress.sophisticationLevel = sophisticationLevel;
        updatedProgress.currentQuestion = currentQuestion;
      }

      // Use detailed progress from API response
      if (result.progressDetails) {
        updatedProgress.questionsCompleted =
          result.progressDetails.questionsCompleted;
        updatedProgress.estimatedTotal = result.progressDetails.totalQuestions;
        updatedProgress.percentage = result.isComplete
          ? 100
          : result.progressDetails.percentage;
        updatedProgress.sophisticationLevel =
          result.progressDetails.sophisticationLevel;
        updatedProgress.currentQuestion =
          result.progressDetails.currentQuestion;
      }

      this._updateState({
        isLoadingItem: false,
        isTyping: false,
        sessionData: result.sessionData || this.state.sessionData,
        progress: updatedProgress,
      });

      // Handle completion
      if (result.isComplete) {
        this.handleCompletion();
      }

      return result;
    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message
      const errorResponse = {
        id: this._generateMessageId(),
        type: "ai",
        content:
          "I'm sorry, I encountered an error processing your response. Please try again.",
        timestamp: new Date().toISOString(),
      };

      this._addMessage(errorResponse);
      this._updateState({
        isLoadingItem: false,
        isTyping: false,
        error: "Failed to send message",
      });

      this.onError(error);
      throw error;
    }
  }

  /**
   * Sends a user message and processes the AI response with streaming
   * @param {string} messageContent - The user's message
   * @param {string[]} [imageS3Keys] - Optional array of S3 keys for uploaded images
   */
  async sendMessageStream(messageContent, imageS3Keys = []) {
    // Input validation using helper
    if (!validateStreamingInput(this, messageContent, imageS3Keys)) {
      console.warn("❌ sendMessageStream validation failed");
      return;
    }

    try {
      // Add user message
      const userMessage = {
        id: this._generateMessageId(),
        type: "user",
        content: messageContent.trim(),
        timestamp: new Date().toISOString(),
        imageS3Keys:
          imageS3Keys && imageS3Keys.length > 0 ? imageS3Keys : undefined,
        messageType:
          imageS3Keys && imageS3Keys.length > 0 ? "text_with_images" : "text",
      };
      this._addMessage(userMessage);

      // Create streaming message placeholder IMMEDIATELY for faster feedback
      const streamingMsg = createStreamingMessage(this);

      // Initialize streaming state (after placeholder is created)
      this._updateState({
        isLoadingItem: false, // Use lighter indicator
        isStreaming: true,
        isTyping: true, // Set immediately for visual feedback
        streamingMessage: "",
        streamingMessageId: streamingMsg.messageId,
        error: null,
      });

      try {
        // Get streaming response
        const messageStream = streamCoachCreatorSession(
          this.userId,
          this.sessionId,
          messageContent.trim(),
          imageS3Keys
        );

        // Process the stream
        return await processStreamingChunks(messageStream, {
          onContextual: async (content, stage) => {
            // Update contextual state (ephemeral UX feedback)
            this._updateState({
              contextualUpdate: {
                content: content.trim(),
                stage: stage || 'processing',
              },
            });
          },

          onChunk: async (content) => {
            // Clear contextual update when real AI response starts
            if (this.state.contextualUpdate) {
              this._updateState({ contextualUpdate: null });
            }

            // Append each chunk to the streaming message
            streamingMsg.append(content);
          },

          onComplete: async (chunk) => {
            // Clear contextual update on completion
            this._updateState({ contextualUpdate: null });

            // Prepare AI response content
            const aiResponseContent = this._buildCreatorResponse(chunk);
            streamingMsg.update(aiResponseContent);

            // Update progress and session state
            const updatedProgress = this._updateProgress(chunk);
            resetStreamingState(this, {
              progress: updatedProgress,
            });

            // Handle completion
            if (chunk.isComplete) {
              this.handleCompletion();
            }

            return chunk;
          },

          onFallback: async (data) => {
            const aiResponseContent = this._buildCreatorResponse(data);
            streamingMsg.update(aiResponseContent);

            // Update progress and session state
            const updatedProgress = this._updateProgress(data);
            resetStreamingState(this, {
              progress: updatedProgress,
            });

            // Handle completion (only if we have reliable completion data)
            if (data?.isComplete === true) {
              this.handleCompletion();
            }
            // Note: For fallback responses, isComplete may not be available
            // so we avoid triggering completion unless explicitly true

            console.info("🔄 Using fallback response for coach creator:", {
              isComplete: data?.isComplete,
              hasAiResponse: !!data?.aiResponse,
              hasNextQuestion: !!data?.nextQuestion,
              hasProgressDetails: !!data?.progressDetails,
            });
            return data;
          },

          onError: async (errorMessage) => {
            console.error("Coach creator streaming error:", errorMessage);
          },
        });
      } catch (streamError) {
        // Handle streaming failure with fallback
        streamingMsg.remove();

        return await handleStreamingFallback(
          updateCoachCreatorSession,
          [this.userId, this.sessionId, messageContent.trim()],
          (result) => this._handleFallbackResult(result),
          "coach creator session"
        );
      }
    } catch (error) {
      console.error("Error sending streaming coach creator message:", error);

      // Clean up and add error message
      this._cleanupStreamingError(error);
      throw error;
    }
  }

  /**
   * Builds the AI response content with next question if applicable
   */
  _buildCreatorResponse(data) {
    let aiResponseContent = data?.aiResponse || "Thank you for your response.";

    // Add next question if available and session not complete
    if (!data?.isComplete && data?.nextQuestion) {
      aiResponseContent += `\n\n${data.nextQuestion}`;
    }

    return aiResponseContent;
  }

  /**
   * Updates progress based on API response
   */
  _updateProgress(data) {
    const updatedProgress = { ...this.state.progress };

    if (data?.progressDetails) {
      updatedProgress.questionsCompleted =
        data.progressDetails.questionsCompleted;
      updatedProgress.estimatedTotal = data.progressDetails.totalQuestions;
      updatedProgress.percentage = data.isComplete
        ? 100
        : data.progressDetails.percentage;
      updatedProgress.sophisticationLevel =
        data.progressDetails.sophisticationLevel;
      updatedProgress.currentQuestion = data.progressDetails.currentQuestion;
    }
    // Note: For fallback responses, progressDetails may not be available
    // In that case, we keep the existing progress state

    return updatedProgress;
  }

  /**
   * Handles fallback result processing for coach creator
   */
  async _handleFallbackResult(result) {
    const aiResponseContent = this._buildCreatorResponse(result);

    const aiResponse = {
      id: this._generateMessageId(),
      type: "ai",
      content: aiResponseContent,
      timestamp: new Date().toISOString(),
    };

    this._addMessage(aiResponse);

    const updatedProgress = this._updateProgress(result);
    resetStreamingState(this, {
      progress: updatedProgress,
    });

    // Handle completion (only if we have reliable completion data)
    if (result?.isComplete === true) {
      this.handleCompletion();
    }
    // Note: For fallback responses, completion data may not be reliable

    return result;
  }

  /**
   * Cleans up streaming state and adds error message for coach creator
   */
  _cleanupStreamingError(error) {
    // Clean up streaming state
    if (this.state.streamingMessageId) {
      this._removeMessage(this.state.streamingMessageId);
    }

    // Add error message
    const errorResponse = {
      id: this._generateMessageId(),
      type: "ai",
      content:
        "I'm sorry, I encountered an error processing your response. Please try again.",
      timestamp: new Date().toISOString(),
    };

    this._addMessage(errorResponse);
    resetStreamingState(this, { error: "Failed to send message" });

    if (typeof this.onError === "function") {
      this.onError(error);
    }
  }

  /**
   * Appends content to the currently streaming message
   */
  _appendToStreamingMessage(messageId, chunk) {
    const currentContent = this.state.streamingMessage || "";
    const newContent = currentContent + chunk;
    this._updateStreamingMessage(messageId, newContent);
  }

  /**
   * Updates the content of a streaming message by ID
   */
  _updateStreamingMessage(messageId, content) {
    this.state = {
      ...this.state,
      messages: this.state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      ),
      // Update streamingMessage in agent state for UI helpers
      streamingMessage: content,
    };
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.state);
    }
  }

  /**
   * Removes a message by ID
   */
  _removeMessage(messageId) {
    this.state = {
      ...this.state,
      messages: this.state.messages.filter((msg) => msg.id !== messageId),
    };
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.state);
    }
  }

  /**
   * Handles session completion
   */
  handleCompletion() {
    // Session completion is tracked in DynamoDB via configGenerationStatus
    // No need for localStorage - Coaches page will load from DynamoDB
    this._updateState({
      isComplete: true,
      isRedirecting: true,
    });

    // Notify navigation handler
    this.onNavigation("session-complete", {
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Clears the conversation and resets to initial state
   */
  clearConversation() {
    const initialMessage = {
      id: 1,
      type: "ai",
      content: INITIAL_MESSAGE,
      timestamp: new Date().toISOString(),
    };

    this._updateState({
      messages: [initialMessage],
      isLoadingItem: false,
      isTyping: false,
      isComplete: false,
      isRedirecting: false,
      error: null,
      // Reset streaming state
      isStreaming: false,
      streamingMessage: "",
      streamingMessageId: null,
    });
  }

  /**
   * Gets the current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Gets session info
   */
  getSessionInfo() {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      isActive: !!(this.userId && this.sessionId),
      isComplete: this.state.isComplete,
    };
  }

  /**
   * Destroys the agent and cleans up
   */
  destroy() {
    this.userId = null;
    this.sessionId = null;
    this.state = null;
    this.onStateChange = null;
    this.onNavigation = null;
    this.onError = null;
  }

  /**
   * Static method to get coach creator sessions for a user
   * @param {string} userId - The user ID
   * @param {Object} options - Optional filters
   * @returns {Promise<Array>} - Array of session summaries
   */
  static async getInProgressSessions(userId, options = {}) {
    if (!userId) {
      console.warn("Cannot load coach creator sessions without userId");
      return [];
    }

    try {
      const result = await getCoachCreatorSessions(userId, {
        isComplete: false,
        limit: 10,
        sortBy: "lastActivity",
        sortOrder: "desc",
        ...options,
      });

      return result.sessions || [];
    } catch (error) {
      console.error("Error loading coach creator sessions:", error);
      return [];
    }
  }

  /**
   * Static method to get completed coach creator sessions
   * @param {string} userId - The user ID
   * @param {Object} options - Optional filters
   * @returns {Promise<Array>} - Array of completed session summaries
   */
  static async getCompletedSessions(userId, options = {}) {
    if (!userId) {
      console.warn("Cannot load completed coach creator sessions without userId");
      return [];
    }

    try {
      const result = await getCoachCreatorSessions(userId, {
        isComplete: true,
        limit: 10,
        sortBy: "lastActivity",
        sortOrder: "desc",
        ...options,
      });

      return result.sessions || [];
    } catch (error) {
      console.error("Error loading completed coach creator sessions:", error);
      return [];
    }
  }

  /**
   * Static method to delete a coach creator session
   * @param {string} userId - The user ID
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} - The deletion result
   */
  static async deleteCoachCreatorSession(userId, sessionId) {
    if (!userId || !sessionId) {
      throw new Error("User ID and Session ID are required");
    }

    try {
      console.info("Deleting coach creator session:", { userId, sessionId });
      const result = await deleteCoachCreatorSession(userId, sessionId);
      return result;
    } catch (error) {
      console.error("Error deleting coach creator session:", error);
      throw error;
    }
  }

}

export default CoachCreatorAgent;
