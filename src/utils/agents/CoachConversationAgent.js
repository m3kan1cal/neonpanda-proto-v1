import { nanoid } from "nanoid";
import {
  createCoachConversation,
  sendCoachConversationMessage,
  streamCoachConversation,
  updateCoachConversation,
  getCoachConversation,
  getCoachConversations,
  deleteCoachConversation,
  getCoachConversationsCount,
} from "../apis/coachConversationApi";
import { getCoach } from "../apis/coachApi";
import CoachAgent from "./CoachAgent";
import {
  processStreamingChunks,
  createStreamingMessage,
  handleStreamingFallback,
  resetStreamingState,
  validateStreamingInput,
} from "./streamingAgentHelper";
import { CONVERSATION_MODES } from "../../constants/conversationModes";
import { logger } from "../logger";

/**
 * CoachConversationAgent - Handles the business logic for coach conversations
 * This class manages the conversation flow, conversation state, and API interactions
 * while keeping the React component focused on UI concerns.
 */
export class CoachConversationAgent {
  constructor(options = {}) {
    // Configuration
    this.userId = options.userId || null;
    this.coachId = options.coachId || null;
    this.conversationId = options.conversationId || null;
    this.onStateChange = options.onStateChange || (() => {});
    this.onNavigation = options.onNavigation || (() => {});
    this.onError = options.onError || (() => {});

    // State
    this.state = {
      messages: [],
      isLoadingItem: false,
      isTyping: false,
      error: null,
      coach: null,
      conversation: null,
      recentConversations: [],
      isLoadingRecentItems: false,
      conversationCount: 0,
      totalMessages: 0,
      isLoadingConversationCount: false,
      // Streaming-specific state
      isStreaming: false,
      streamingMessage: "",
      streamingMessageId: null,
      // Contextual updates (ephemeral UX feedback)
      contextualUpdate: null, // { content: string, stage: string }
      // Conversation size tracking
      conversationSize: null,
    };

    // Bind methods
    this.createConversation = this.createConversation.bind(this);
    this.loadExistingConversation = this.loadExistingConversation.bind(this);
    this.loadCoachDetails = this.loadCoachDetails.bind(this);
    this.loadRecentConversations = this.loadRecentConversations.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.sendMessageStream = this.sendMessageStream.bind(this);
    this.clearConversation = this.clearConversation.bind(this);
    this.generateConversationTitle = this.generateConversationTitle.bind(this);
    this.deleteCoachConversation = this.deleteCoachConversation.bind(this);
  }

  /**
   * Updates the internal state and notifies subscribers
   */
  _updateState(newState) {
    this.state = { ...this.state, ...newState };
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.state);
    }
  }

  /**
   * Generates a unique message ID
   */
  _generateMessageId() {
    return nanoid();
  }

  /**
   * Adds a message to the conversation
   */
  _addMessage(message) {
    const messages = [...this.state.messages, message];
    this._updateState({ messages });
  }

  /**
   * Generates a conversation title based on first user message or default
   */
  generateConversationTitle(userMessage = null) {
    if (userMessage && userMessage.trim()) {
      // Take first 50 characters of user message as title
      const title = userMessage.trim().substring(0, 50);
      return title.length < userMessage.trim().length ? `${title}...` : title;
    }

    // Generate default title with human-friendly date
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  /**
   * Loads coach details from the API
   */
  async loadCoachDetails(userId, coachId) {
    try {
      const coachData = await getCoach(userId, coachId);

      // Format coach data like TrainingGrounds does
      const coachAgent = new CoachAgent();
      const formattedName = coachAgent.formatCoachName(
        coachData.coachConfig?.coach_name,
      );

      const formattedCoachData = {
        name: formattedName,
        specialization: coachAgent.getSpecializationDisplay(
          coachData.coachConfig?.technical_config?.specializations,
        ),
        experienceLevel: coachAgent.getExperienceLevelDisplay(
          coachData.coachConfig?.technical_config?.experience_level,
        ),
        programmingFocus: coachAgent.getProgrammingFocusDisplay(
          coachData.coachConfig?.technical_config?.programming_focus,
        ),
        rawCoach: coachData, // Keep the full coach object for any additional data needed
      };

      this._updateState({ coach: formattedCoachData });
      return formattedCoachData;
    } catch (error) {
      logger.error("Error loading coach details:", error);
      this._updateState({ error: "Failed to load coach details" });
      if (typeof this.onError === "function") {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Load historical conversations for the coach
   * @param {string} userId - The user ID
   * @param {string} coachId - The coach ID
   * @param {number} limit - Maximum number of conversations to return (default: 10)
   */
  async loadRecentConversations(userId, coachId, limit = 10) {
    if (!userId || !coachId) return;

    this._updateState({ isLoadingRecentItems: true });

    try {
      const result = await getCoachConversations(userId, coachId);

      // Sort by last activity (most recent first) and apply limit
      const sortedConversations = (result.conversations || [])
        .sort((a, b) => {
          const dateA = new Date(a.metadata?.lastActivity || a.createdAt || 0);
          const dateB = new Date(b.metadata?.lastActivity || b.createdAt || 0);
          return dateB - dateA; // Most recent first
        })
        .slice(0, limit); // Apply limit

      this._updateState({
        recentConversations: sortedConversations,
        isLoadingRecentItems: false,
      });

      return sortedConversations;
    } catch (error) {
      logger.error("Error loading historical conversations:", error);
      this._updateState({
        recentConversations: [],
        isLoadingRecentItems: false,
      });
      return [];
    }
  }

  /**
   * Loads conversation count for the user and coach
   */
  async loadConversationCount(userId, coachId) {
    if (!userId || !coachId) return;

    this._updateState({ isLoadingConversationCount: true });

    try {
      // Use the statically imported count API function
      const result = await getCoachConversationsCount(userId, coachId);

      this._updateState({
        conversationCount: result.totalCount || 0,
        totalMessages: result.totalMessages || 0,
        isLoadingConversationCount: false,
      });

      return {
        totalCount: result.totalCount,
        totalMessages: result.totalMessages,
      };
    } catch (error) {
      logger.error("Error loading conversation count:", error);
      logger.error("Error details:", error.message);
      // Don't show error for count as it's not critical
      this._updateState({
        conversationCount: 0,
        totalMessages: 0,
        isLoadingConversationCount: false,
      });
      return { totalCount: 0, totalMessages: 0 };
    }
  }

  /**
   * Creates a new coach conversation
   */
  async createConversation(
    userId,
    coachId,
    title = null,
    initialMessage = null,
    mode = CONVERSATION_MODES.CHAT,
  ) {
    try {
      this._updateState({ isLoadingItem: true, error: null });

      // Generate title if not provided
      const conversationTitle = title || this.generateConversationTitle();

      // Create conversation via API (defaults to CHAT mode)
      const result = await createCoachConversation(
        userId,
        coachId,
        conversationTitle,
        initialMessage,
        mode,
      );
      const conversation = result.conversation;
      const conversationId = conversation.conversationId;

      // Update agent state
      this.userId = userId;
      this.coachId = coachId;
      this.conversationId = conversationId;

      // Load coach details
      await this.loadCoachDetails(userId, coachId);

      // Set initial state
      this._updateState({
        conversation,
        messages: [],
        isLoadingItem: false,
      });

      // Notify navigation handler
      if (typeof this.onNavigation === "function") {
        this.onNavigation("conversation-created", {
          userId,
          coachId,
          conversationId,
        });
      }

      return { userId, coachId, conversationId, conversation };
    } catch (error) {
      logger.error("Error creating coach conversation:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to create coach conversation",
      });
      if (typeof this.onError === "function") {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Loads an existing conversation from the backend
   */
  async loadExistingConversation(userId, coachId, conversationId) {
    if (!userId || !coachId || !conversationId) {
      throw new Error("User ID, Coach ID, and Conversation ID are required");
    }

    try {
      this._updateState({ isLoadingItem: true, error: null });

      // Load conversation and coach details in parallel
      const [conversationData] = await Promise.all([
        getCoachConversation(userId, coachId, conversationId),
        this.loadCoachDetails(userId, coachId),
      ]);

      // Update agent state
      this.userId = userId;
      this.coachId = coachId;
      this.conversationId = conversationId;

      // Extract the actual conversation data (API wraps it in a 'conversation' property)
      const actualConversation =
        conversationData.conversation || conversationData;
      const messagesArray = actualConversation.messages || [];

      // Reconstruct conversation from message history
      const conversationMessages = [];
      let messageId = 1;

      if (messagesArray && messagesArray.length > 0) {
        // Sort messages by timestamp to ensure chronological order (oldest first)
        const sortedMessages = [...messagesArray].sort((a, b) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeA - timeB;
        });

        sortedMessages.forEach((message) => {
          // Ensure content is a string
          let messageContent = message.content || "";
          if (typeof messageContent !== "string") {
            logger.warn(
              "Message content is not a string, converting:",
              messageContent,
              typeof messageContent,
            );
            messageContent = String(messageContent || "");
          }

          conversationMessages.push({
            id: messageId++,
            type: message.role === "user" ? "user" : "ai",
            content: messageContent,
            timestamp: message.timestamp || new Date().toISOString(),
            imageS3Keys: message.imageS3Keys || undefined,
            messageType: message.messageType || undefined,
            metadata: message.metadata || undefined, // Preserve metadata (includes mode for Build mode styling)
          });
        });
      }

      // Debug: Log workout session on load
      if (actualConversation.workoutCreatorSession) {
        logger.info("🏋️ Loaded conversation with active workout session:", {
          conversationId,
          turnCount: actualConversation.workoutCreatorSession.turnCount,
          progress: actualConversation.workoutCreatorSession.progressDetails,
        });
      }

      // Update state with loaded messages and conversation size
      this._updateState({
        conversation: actualConversation,
        messages: conversationMessages,
        isLoadingItem: false,
        conversationSize: conversationData.conversationSize || null,
      });

      return conversationData;
    } catch (error) {
      logger.error("Error loading existing conversation:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to load existing conversation",
      });

      // Handle conversation not found
      if (error.message === "Conversation not found") {
        if (typeof this.onNavigation === "function") {
          this.onNavigation("conversation-not-found");
        }
      }

      if (typeof this.onError === "function") {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Sends a user message and processes the AI response
   */
  async sendMessage(messageContent, imageS3Keys = []) {
    // Allow sending if there's text OR images
    if (
      (!messageContent.trim() && (!imageS3Keys || imageS3Keys.length === 0)) ||
      this.state.isTyping ||
      this.state.isLoadingItem ||
      !this.userId ||
      !this.coachId ||
      !this.conversationId
    ) {
      logger.warn("❌ sendMessage validation failed");
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
      };

      this._addMessage(userMessage);
      this._updateState({ isTyping: true, error: null });

      // Send to API
      const result = await sendCoachConversationMessage(
        this.userId,
        this.coachId,
        this.conversationId,
        messageContent.trim(),
        imageS3Keys,
      );

      // Extract AI response content from the message object
      let aiResponseContent = "Thank you for your message."; // Default fallback

      if (result.aiResponse && typeof result.aiResponse === "object") {
        // API returns aiResponse as a message object with content property
        aiResponseContent =
          result.aiResponse.content || "Thank you for your message.";
      } else if (typeof result.aiResponse === "string") {
        // Fallback if API returns string directly
        aiResponseContent = result.aiResponse;
      }

      // Ensure content is a string
      if (typeof aiResponseContent !== "string") {
        logger.warn(
          "AI response content is not a string, converting:",
          aiResponseContent,
          typeof aiResponseContent,
        );
        aiResponseContent = String(
          aiResponseContent || "Thank you for your message.",
        );
      }

      const aiResponse = {
        id: this._generateMessageId(),
        type: "ai",
        content: aiResponseContent,
        timestamp: new Date().toISOString(),
      };

      this._addMessage(aiResponse);
      this._updateState({
        isTyping: false,
        conversation: result.conversation || this.state.conversation,
        conversationSize:
          result.conversationSize || this.state.conversationSize || null,
      });

      return result;
    } catch (error) {
      logger.error("Error sending message:", error);

      // Add error message
      const errorResponse = {
        id: this._generateMessageId(),
        type: "ai",
        content:
          "I'm sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date().toISOString(),
      };

      this._addMessage(errorResponse);
      this._updateState({
        isTyping: false,
        error: "Failed to send message",
        conversationSize: this.state.conversationSize || null,
      });

      if (typeof this.onError === "function") {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Sends a user message and processes the AI response with streaming
   */
  async sendMessageStream(messageContent, imageS3Keys = []) {
    // Input validation - allow text OR images
    if (!validateStreamingInput(this, messageContent, imageS3Keys)) {
      logger.warn("❌ sendMessageStream validation failed");
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
      };
      this._addMessage(userMessage);

      // Create streaming message placeholder with conversation mode metadata
      // Use the conversation mode directly (CHAT, PROGRAM_DESIGN, or WORKOUT_LOG)
      const conversationMode =
        this.state.conversation?.mode || CONVERSATION_MODES.CHAT;
      const streamingMsg = createStreamingMessage(this, {
        mode: conversationMode,
      });

      // Initialize streaming state atomically with message ID
      this._updateState({
        isStreaming: true,
        isTyping: true,
        streamingMessage: "",
        streamingMessageId: streamingMsg.messageId,
        error: null,
      });

      try {
        // Get streaming response (API layer handles Lambda → API Gateway → non-streaming fallback)
        const messageStream = streamCoachConversation(
          this.userId,
          this.coachId,
          this.conversationId,
          messageContent.trim(),
          imageS3Keys,
        );

        // Process the stream
        return await processStreamingChunks(messageStream, {
          onContextual: async (content, stage) => {
            // Update contextual state (ephemeral UX feedback)
            this._updateState({
              contextualUpdate: {
                content: content.trim(),
                stage: stage || "processing",
              },
            });
          },

          onMetadata: async (metadata) => {
            // Metadata event - early message configuration (mode, etc.)
            // Update the streaming message metadata immediately so UI can show badges during streaming
            if (metadata.mode) {
              streamingMsg.updateMetadata({ mode: metadata.mode });
            }
          },

          onChunk: async (content) => {
            // Clear contextual update when real AI response starts
            if (this.state.contextualUpdate) {
              this._updateState({
                contextualUpdate: null,
              });
            }

            // Append each chunk to the streaming message
            streamingMsg.append(content);
          },

          onComplete: async (chunk) => {
            // Clear contextual update on completion
            this._updateState({ contextualUpdate: null });

            // Finalize message - use aiMessage.content from the complete event
            const finalContent =
              chunk.aiMessage?.content || chunk.fullMessage || "";

            // Extract metadata from the AI message if available
            const messageMetadata = chunk.aiMessage?.metadata || null;

            // CRITICAL: Update the message content and metadata first, then reset streaming state
            streamingMsg.update(finalContent, messageMetadata);

            // Wait a brief moment to ensure the UI has updated with the final content
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Clear workout session immediately if workout generation was triggered
            // This prevents the badge from showing on subsequent messages
            const workoutGenerationTriggered =
              chunk.metadata?.workoutGenerationTriggered === true;
            const shouldClearSession =
              workoutGenerationTriggered ||
              chunk.workoutCreatorSession === null;

            // Build the updated conversation object with explicit mode assignment
            const updatedConversation = chunk.conversationId
              ? {
                  ...this.state.conversation,
                  conversationId: chunk.conversationId,
                  // Update workout session state
                  ...(shouldClearSession
                    ? { workoutCreatorSession: undefined }
                    : chunk.hasOwnProperty("workoutCreatorSession")
                      ? { workoutCreatorSession: chunk.workoutCreatorSession }
                      : {}),
                }
              : this.state.conversation;

            // Explicitly set mode AFTER object creation if provided by backend
            if (chunk.hasOwnProperty("mode")) {
              updatedConversation.mode = chunk.mode;
            }

            // Reset streaming state and update conversation with size data
            resetStreamingState(this, {
              conversation: updatedConversation,
              conversationSize:
                chunk.conversationSize || this.state.conversationSize || null,
            });

            return chunk;
          },

          onFallback: async (data) => {
            const aiResponseContent = this._extractAiResponse(data);

            // Extract metadata from the AI message if available
            const messageMetadata = data?.aiMessage?.metadata || null;

            streamingMsg.update(aiResponseContent, messageMetadata);

            // Clear workout session immediately if workout generation was triggered
            const workoutGenerationTriggered =
              data?.metadata?.workoutGenerationTriggered === true;
            const shouldClearSession =
              workoutGenerationTriggered ||
              data?.workoutCreatorSession === null;

            // Build the updated conversation object
            const updatedConversation = data?.conversationId
              ? {
                  ...this.state.conversation,
                  conversationId: data.conversationId,
                  // Update workout session state
                  ...(shouldClearSession
                    ? { workoutCreatorSession: undefined }
                    : data?.hasOwnProperty("workoutCreatorSession")
                      ? { workoutCreatorSession: data.workoutCreatorSession }
                      : {}),
                }
              : this.state.conversation;

            // Explicitly set mode AFTER object creation if provided by backend
            if (data?.hasOwnProperty("mode")) {
              updatedConversation.mode = data.mode;
            }

            // Reset streaming state and update conversation with size data
            resetStreamingState(this, {
              conversation: updatedConversation,
              conversationSize:
                data?.conversationSize || this.state.conversationSize || null,
            });

            return data;
          },

          onError: async (errorMessage) => {
            logger.error("Streaming error:", errorMessage);
          },
        });
      } catch (streamError) {
        // Handle streaming failure with fallback
        streamingMsg.remove();

        return await handleStreamingFallback(
          sendCoachConversationMessage,
          [
            this.userId,
            this.coachId,
            this.conversationId,
            messageContent.trim(),
            imageS3Keys,
          ],
          (result, isErrorFallback) => this._handleFallbackResult(result),
          "conversation message",
        );
      }
    } catch (error) {
      logger.error("Error sending streaming message:", error);

      // Clean up and add error message
      this._cleanupStreamingError(error);
      throw error;
    }
  }

  /**
   * Extracts AI response content from API response
   */
  _extractAiResponse(data) {
    let aiResponseContent = "Thank you for your message.";

    if (data?.aiResponse && typeof data.aiResponse === "object") {
      aiResponseContent = data.aiResponse.content || aiResponseContent;
    } else if (typeof data?.aiResponse === "string") {
      aiResponseContent = data.aiResponse;
    }

    return aiResponseContent;
  }

  /**
   * Handles fallback result processing
   */
  async _handleFallbackResult(result) {
    const aiResponseContent = this._extractAiResponse(result);

    const aiResponse = {
      id: this._generateMessageId(),
      type: "ai",
      content: aiResponseContent,
      timestamp: new Date().toISOString(),
    };

    this._addMessage(aiResponse);
    resetStreamingState(this, {
      conversation: result?.conversationId
        ? { ...this.state.conversation, conversationId: result.conversationId }
        : this.state.conversation,
      conversationSize:
        result?.conversationSize || this.state.conversationSize || null,
    });

    return result;
  }

  /**
   * Cleans up streaming state and adds error message
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
        "I'm sorry, I encountered an error processing your message. Please try again.",
      timestamp: new Date().toISOString(),
    };

    this._addMessage(errorResponse);
    resetStreamingState(this, {
      error: "Failed to send message",
      conversationSize: this.state.conversationSize || null,
    });

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
   * @param {string} messageId - The message ID to update
   * @param {string} content - The new content
   * @param {Object} metadata - Optional metadata to merge into the message
   */
  _updateStreamingMessage(messageId, content, metadata = null) {
    // Create a new messages array with the updated message
    const messages = this.state.messages.map((msg) => {
      if (msg.id === messageId) {
        const updatedMsg = { ...msg, content };
        // Merge metadata if provided
        if (metadata) {
          updatedMsg.metadata = { ...msg.metadata, ...metadata };
        }
        return updatedMsg;
      }
      return msg;
    });

    // Use _updateState to ensure proper state management
    this._updateState({
      messages,
      streamingMessage: content,
      _lastUpdate: Date.now(),
    });

    // Streaming message updated
  }

  /**
   * Updates only the metadata of a message without changing content
   * Used for early metadata events during streaming (e.g., mode badge)
   * @param {string} messageId - The message ID to update
   * @param {Object} metadata - Metadata to merge into the message
   */
  _updateMessageMetadata(messageId, metadata) {
    const messages = this.state.messages.map((msg) => {
      if (msg.id === messageId) {
        return {
          ...msg,
          metadata: { ...msg.metadata, ...metadata },
        };
      }
      return msg;
    });

    this._updateState({ messages });
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
   * Clears the conversation and resets to initial state
   */
  clearConversation() {
    this._updateState({
      messages: [],
      isLoadingItem: false,
      isTyping: false,
      error: null,
      // Reset streaming state
      isStreaming: false,
      streamingMessage: "",
      streamingMessageId: null,
      conversation: null,
    });
  }

  /**
   * Updates coach conversation metadata (title, tags, isActive)
   */
  async updateCoachConversation(userId, coachId, conversationId, metadata) {
    if (
      !userId ||
      !coachId ||
      !conversationId ||
      !metadata ||
      Object.keys(metadata).length === 0
    ) {
      throw new Error(
        "User ID, Coach ID, Conversation ID, and metadata are required",
      );
    }

    try {
      logger.info("Updating conversation metadata:", {
        userId,
        coachId,
        conversationId,
        metadata,
      });

      // Call API to update metadata
      const result = await updateCoachConversation(
        userId,
        coachId,
        conversationId,
        metadata,
      );

      // Update local state with new metadata
      const updatedConversation = {
        ...this.state.conversation,
        ...(metadata.title && { title: metadata.title }),
        metadata: {
          ...this.state.conversation?.metadata,
          ...(metadata.tags && { tags: metadata.tags }),
          ...(metadata.isActive !== undefined && {
            isActive: metadata.isActive,
          }),
        },
      };

      this._updateState({
        conversation: updatedConversation,
      });

      // Refresh historical conversations to show updated metadata
      if (this.state.recentConversations.length > 0) {
        await this.loadRecentConversations(userId, coachId);
      }

      logger.info("Conversation metadata updated successfully");
      return result;
    } catch (error) {
      logger.error("Error updating conversation metadata:", error);
      this._updateState({
        error: "Failed to update conversation metadata",
      });
      if (typeof this.onError === "function") {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Deletes a coach conversation
   */
  async deleteCoachConversation(userId, coachId, conversationId) {
    if (!userId || !coachId || !conversationId) {
      throw new Error("User ID, Coach ID, and Conversation ID are required");
    }

    try {
      this._updateState({ isLoadingItem: true, error: null });

      logger.info("Deleting coach conversation:", {
        userId,
        coachId,
        conversationId,
      });

      // Call API to delete conversation
      const result = await deleteCoachConversation(
        userId,
        coachId,
        conversationId,
      );

      // Refresh the recent conversations list to reflect the deletion
      if (this.state.recentConversations.length > 0) {
        await this.loadRecentConversations(userId, coachId);
      }

      // Update loading state
      this._updateState({ isLoadingItem: false });

      logger.info("Conversation deleted successfully");
      return true;
    } catch (error) {
      logger.error("Error deleting conversation:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to delete conversation",
      });

      if (typeof this.onError === "function") {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Handles suggestion action button clicks
   * @param {Object} action - Action configuration from suggestion
   */
  /**
   * Gets the current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Gets conversation info
   */
  getConversationInfo() {
    return {
      userId: this.userId,
      coachId: this.coachId,
      conversationId: this.conversationId,
      isActive: !!(this.userId && this.coachId && this.conversationId),
      coach: this.state.coach,
      conversation: this.state.conversation,
    };
  }

  /**
   * Destroys the agent and cleans up
   */
  destroy() {
    this.userId = null;
    this.coachId = null;
    this.conversationId = null;
    this.state = null;
    this.onStateChange = null;
    this.onNavigation = null;
    this.onError = null;
  }
}

export default CoachConversationAgent;
