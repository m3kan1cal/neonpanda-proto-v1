import { nanoid } from "nanoid";
import {
  createCoachConversation,
  sendCoachConversationMessage,
  updateCoachConversation,
  getCoachConversation,
  getCoachConversations,
  deleteCoachConversation,
  getCoachConversationsCount,
} from "../apis/coachConversationApi";
import { getCoach } from "../apis/coachApi";
import CoachAgent from './CoachAgent';

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
    };

    // Bind methods
    this.createConversation = this.createConversation.bind(this);
    this.loadExistingConversation = this.loadExistingConversation.bind(this);
    this.loadCoachDetails = this.loadCoachDetails.bind(this);
    this.loadRecentConversations = this.loadRecentConversations.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.clearConversation = this.clearConversation.bind(this);
    this.generateConversationTitle = this.generateConversationTitle.bind(this);
    this.deleteCoachConversation = this.deleteCoachConversation.bind(this);
  }

  /**
   * Updates the internal state and notifies subscribers
   */
  _updateState(newState) {
    this.state = { ...this.state, ...newState };
    if (typeof this.onStateChange === 'function') {
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Loads coach details from the API
   */
  async loadCoachDetails(userId, coachId) {
    try {
      console.info("Loading coach details:", { userId, coachId });
      const coachData = await getCoach(userId, coachId);
      console.info("Raw coach data received:", coachData);
      console.info("Coach name from API:", coachData.coachConfig?.coach_name);

      // Format coach data like TrainingGrounds does
      const coachAgent = new CoachAgent();
      const formattedName = coachAgent.formatCoachName(coachData.coachConfig?.coach_name);
      console.info("Formatted coach name:", formattedName);

      const formattedCoachData = {
        name: formattedName,
        specialization: coachAgent.getSpecializationDisplay(coachData.coachConfig?.technical_config?.specializations),
        experienceLevel: coachAgent.getExperienceLevelDisplay(coachData.coachConfig?.technical_config?.experience_level),
        programmingFocus: coachAgent.getProgrammingFocusDisplay(coachData.coachConfig?.technical_config?.programming_focus),
        rawCoach: coachData // Keep the full coach object for any additional data needed
      };

      console.info("Final formatted coach data:", formattedCoachData);
      this._updateState({ coach: formattedCoachData });
      return formattedCoachData;
    } catch (error) {
      console.error("Error loading coach details:", error);
      this._updateState({ error: "Failed to load coach details" });
      if (typeof this.onError === 'function') {
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
      console.info('Loading historical conversations for:', { userId, coachId, limit });
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
        isLoadingRecentItems: false
      });

      console.info('Historical conversations loaded:', sortedConversations);
      return sortedConversations;
    } catch (error) {
      console.error('Error loading historical conversations:', error);
      this._updateState({
        recentConversations: [],
        isLoadingRecentItems: false
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
      console.info('Loading conversation count for:', { userId, coachId });

      // Use the statically imported count API function
      const result = await getCoachConversationsCount(userId, coachId);

      console.info('Conversation count API result:', result);

      this._updateState({
        conversationCount: result.totalCount || 0,
        totalMessages: result.totalMessages || 0,
        isLoadingConversationCount: false
      });

      console.info('Conversation count and messages loaded:', { totalCount: result.totalCount, totalMessages: result.totalMessages });
      return { totalCount: result.totalCount, totalMessages: result.totalMessages };
    } catch (error) {
      console.error('Error loading conversation count:', error);
      console.error('Error details:', error.message);
      // Don't show error for count as it's not critical
      this._updateState({
        conversationCount: 0,
        totalMessages: 0,
        isLoadingConversationCount: false
      });
      return { totalCount: 0, totalMessages: 0 };
    }
  }

  /**
   * Creates a new coach conversation
   */
  async createConversation(userId, coachId, title = null, initialMessage = null) {
    try {
      this._updateState({ isLoadingItem: true, error: null });

      // Generate title if not provided
      const conversationTitle = title || this.generateConversationTitle();

      console.info("Creating new coach conversation:", {
        userId,
        coachId,
        title: conversationTitle,
        hasInitialMessage: !!initialMessage
      });

      // Create conversation via API (with optional initial message)
      const result = await createCoachConversation(userId, coachId, conversationTitle, initialMessage);
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
      if (typeof this.onNavigation === 'function') {
        this.onNavigation("conversation-created", { userId, coachId, conversationId });
      }

      return { userId, coachId, conversationId, conversation };
    } catch (error) {
      console.error("Error creating coach conversation:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to create coach conversation",
      });
      if (typeof this.onError === 'function') {
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

      console.info("Loading existing coach conversation:", { userId, coachId, conversationId });

      // Load conversation and coach details in parallel
      const [conversationData] = await Promise.all([
        getCoachConversation(userId, coachId, conversationId),
        this.loadCoachDetails(userId, coachId)
      ]);

      // Update agent state
      this.userId = userId;
      this.coachId = coachId;
      this.conversationId = conversationId;

      // Debug: Log the full API response structure
      console.info("Full API response structure:", conversationData);
      console.info("API response keys:", Object.keys(conversationData || {}));

      // Extract the actual conversation data (API wraps it in a 'conversation' property)
      const actualConversation = conversationData.conversation || conversationData;
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
          let messageContent = message.content || '';
          if (typeof messageContent !== 'string') {
            console.warn("Message content is not a string, converting:", messageContent, typeof messageContent);
            messageContent = String(messageContent || '');
          }

          conversationMessages.push({
            id: messageId++,
            type: message.role === 'user' ? 'user' : 'ai',
            content: messageContent,
            timestamp: message.timestamp || new Date().toISOString(),
          });
        });
      }

      // Debug: Log message loading info
      console.info("Loaded conversation messages:", {
        totalMessages: conversationMessages.length,
        messagesFromAPI: messagesArray.length,
        messageOrder: conversationMessages.map(msg => ({
          type: msg.type,
          timestamp: msg.timestamp,
          preview: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
        }))
      });

      // Update state with loaded messages
      this._updateState({
        conversation: actualConversation,
        messages: conversationMessages,
        isLoadingItem: false,
      });

      return conversationData;
    } catch (error) {
      console.error("Error loading existing conversation:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to load existing conversation",
      });

      // Handle conversation not found
      if (error.message === "Conversation not found") {
        if (typeof this.onNavigation === 'function') {
          this.onNavigation("conversation-not-found");
        }
      }

      if (typeof this.onError === 'function') {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Sends a user message and processes the AI response
   */
  async sendMessage(messageContent) {
    if (
      !messageContent.trim() ||
      this.state.isTyping ||
      this.state.isLoadingItem ||
      !this.userId ||
      !this.coachId ||
      !this.conversationId
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
      this._updateState({ isTyping: true, error: null });

      // Send to API
      const result = await sendCoachConversationMessage(
        this.userId,
        this.coachId,
        this.conversationId,
        messageContent.trim()
      );

            // Extract AI response content from the message object
      let aiResponseContent = "Thank you for your message."; // Default fallback

      if (result.aiResponse && typeof result.aiResponse === 'object') {
        // API returns aiResponse as a message object with content property
        aiResponseContent = result.aiResponse.content || "Thank you for your message.";
      } else if (typeof result.aiResponse === 'string') {
        // Fallback if API returns string directly
        aiResponseContent = result.aiResponse;
      }

      // Ensure content is a string
      if (typeof aiResponseContent !== 'string') {
        console.warn("AI response content is not a string, converting:", aiResponseContent, typeof aiResponseContent);
        aiResponseContent = String(aiResponseContent || "Thank you for your message.");
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
        conversation: result.conversation || this.state.conversation
      });

      return result;
    } catch (error) {
      console.error("Error sending message:", error);

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
      });

      if (typeof this.onError === 'function') {
        this.onError(error);
      }
      throw error;
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
      conversation: null,
    });
  }

  /**
   * Updates coach conversation metadata (title, tags, isActive)
   */
  async updateCoachConversation(userId, coachId, conversationId, metadata) {
    if (!userId || !coachId || !conversationId || !metadata || Object.keys(metadata).length === 0) {
      throw new Error("User ID, Coach ID, Conversation ID, and metadata are required");
    }

    try {
      console.info("Updating conversation metadata:", { userId, coachId, conversationId, metadata });

      // Call API to update metadata
      const result = await updateCoachConversation(userId, coachId, conversationId, metadata);

      // Update local state with new metadata
      const updatedConversation = {
        ...this.state.conversation,
        ...(metadata.title && { title: metadata.title }),
        metadata: {
          ...this.state.conversation?.metadata,
          ...(metadata.tags && { tags: metadata.tags }),
          ...(metadata.isActive !== undefined && { isActive: metadata.isActive }),
        }
      };

      this._updateState({
        conversation: updatedConversation
      });

      // Refresh historical conversations to show updated metadata
      if (this.state.recentConversations.length > 0) {
        await this.loadRecentConversations(userId, coachId);
      }

      console.info("Conversation metadata updated successfully");
      return result;
    } catch (error) {
      console.error("Error updating conversation metadata:", error);
      this._updateState({
        error: "Failed to update conversation metadata"
      });
      if (typeof this.onError === 'function') {
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

      console.info("Deleting coach conversation:", { userId, coachId, conversationId });

      // Call API to delete conversation
      const result = await deleteCoachConversation(userId, coachId, conversationId);

      // Refresh the recent conversations list to reflect the deletion
      if (this.state.recentConversations.length > 0) {
        await this.loadRecentConversations(userId, coachId);
      }

      // Update loading state
      this._updateState({ isLoadingItem: false });

      console.info("Conversation deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting conversation:", error);
      this._updateState({
        isLoadingItem: false,
        error: "Failed to delete conversation"
      });

      if (typeof this.onError === 'function') {
        this.onError(error);
      }

      throw error;
    }
  }

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
