import { nanoid } from "nanoid";
import {
  createCoachCreatorSession,
  updateCoachCreatorSession,
  getCoachCreatorSession,
} from "../apis/coachCreatorApi";

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
      isLoading: false,
      isTyping: false,
      isComplete: false,
      isRedirecting: false,
      error: null,
    };

    // Bind methods
    this.createSession = this.createSession.bind(this);
    this.loadExistingSession = this.loadExistingSession.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
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
      this._updateState({ isLoading: true, error: null });

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
        isLoading: false,
      });

      // Notify navigation handler
      this.onNavigation("session-created", { userId, sessionId });

      return { userId, sessionId };
    } catch (error) {
      console.error("Error creating coach creator session:", error);
      this._updateState({
        isLoading: false,
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
      this._updateState({ isLoading: true, error: null });

      console.info("Loading existing coach creator session:", sessionId);
      const sessionData = await getCoachCreatorSession(userId, sessionId);

      // Update agent state
      this.userId = userId;
      this.sessionId = sessionId;

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

      // Update state with loaded messages or keep initial message
      this._updateState({
        messages:
          conversationMessages.length > 0
            ? conversationMessages
            : this.state.messages,
        isLoading: false,
      });

      return sessionData;
    } catch (error) {
      console.error("Error loading existing session:", error);
      this._updateState({
        isLoading: false,
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
   */
  async sendMessage(messageContent) {
    if (
      !messageContent.trim() ||
      this.state.isLoading ||
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
      };

      this._addMessage(userMessage);
      this._updateState({ isLoading: true, isTyping: true, error: null });

      // Send to API
      const result = await updateCoachCreatorSession(
        this.userId,
        this.sessionId,
        messageContent.trim()
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
      this._updateState({ isLoading: false, isTyping: false });

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
        isLoading: false,
        isTyping: false,
        error: "Failed to send message",
      });

      this.onError(error);
      throw error;
    }
  }

  /**
   * Handles session completion
   */
  handleCompletion() {
    // Store in-progress coach info in localStorage
    const inProgressData = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      status: "generating",
    };
    localStorage.setItem(
      `inProgress_${this.userId}`,
      JSON.stringify(inProgressData)
    );

    this._updateState({
      isComplete: true,
      isRedirecting: true,
    });

    // Notify navigation handler
    this.onNavigation("session-complete", { userId: this.userId });
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
      isLoading: false,
      isTyping: false,
      isComplete: false,
      isRedirecting: false,
      error: null,
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
}

export default CoachCreatorAgent;
