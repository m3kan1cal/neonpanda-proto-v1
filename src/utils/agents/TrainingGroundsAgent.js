import { getCoach } from '../apis/coachApi';
import { createCoachConversation, getCoachConversations } from '../apis/coachConversationApi';
import CoachAgent from './CoachAgent';

/**
 * TrainingGroundsAgent - Handles business logic for Training Grounds page
 * This agent manages coach data loading, conversation management, and navigation
 * while keeping the React component focused on UI concerns.
 */
export class TrainingGroundsAgent {
  constructor(options = {}) {
    // Configuration
    this.userId = options.userId || null;
    this.coachId = options.coachId || null;
    this.onStateChange = options.onStateChange || (() => {});
    this.onNavigation = options.onNavigation || (() => {});
    this.onError = options.onError || (() => {});

    // State
    this.state = {
      coachData: null,
      recentConversations: [],
      isLoading: false,
      isLoadingConversations: false,
      isCreatingConversation: false,
      error: null,
    };

    // Create a coach agent instance for utility methods
    this.coachAgent = new CoachAgent();
  }

  /**
   * Update internal state and notify component
   */
  _updateState(newState) {
    this.state = { ...this.state, ...newState };
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
  }

  /**
   * Set user and coach IDs
   */
  setIds(userId, coachId) {
    this.userId = userId;
    this.coachId = coachId;
  }

  /**
   * Load coach data from API
   */
  async loadCoachData(userId, coachId) {
    if (!userId || !coachId) return;

    this._updateState({ isLoading: true, error: null });

    try {
      console.info('Loading coach data for:', { userId, coachId });

      // Fetch the specific coach
      const coach = await getCoach(userId, coachId);

      if (coach) {
        // Extract coach data from full configuration
        const primaryMethodologyRaw = coach.coachConfig?.metadata?.methodology_profile?.primary
          || coach.coachConfig?.technical_config?.methodology
          || coach.coachConfig?.selected_methodology?.primary_methodology;

        const formattedPrimaryMethodology = primaryMethodologyRaw
          ? primaryMethodologyRaw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : 'Custom';

        console.info('Full coach config loaded:', coach);
        console.info('Methodology value:', formattedPrimaryMethodology);

        const formattedCoachData = {
          name: this.coachAgent.formatCoachName(coach.coachConfig?.coach_name),
          specialization: this.coachAgent.getSpecializationDisplay(coach.coachConfig?.technical_config?.specializations),
          experienceLevel: this.coachAgent.getExperienceLevelDisplay(coach.coachConfig?.technical_config?.experience_level),
          programmingFocus: this.coachAgent.getProgrammingFocusDisplay(coach.coachConfig?.technical_config?.programming_focus),
          primaryMethodology: formattedPrimaryMethodology,
          totalConversations: coach.coachConfig?.metadata?.total_conversations || 0,
          activePrograms: coach.coachConfig?.metadata?.active_programs || 0,
          joinedDate: coach.createdAt,
          rawCoach: coach // Keep the full coach object for any additional data needed
        };

        this._updateState({
          coachData: formattedCoachData,
          isLoading: false
        });

        return formattedCoachData;
      } else {
        this._updateState({
          error: 'Coach not found',
          isLoading: false
        });
      }
    } catch (err) {
      console.error('Error fetching coach data:', err);
      this._updateState({
        error: 'Failed to load coach data',
        isLoading: false
      });
      if (typeof this.onError === 'function') {
        this.onError(err);
      }
      throw err;
    }
  }

  /**
   * Load recent conversations for the coach
   */
  async loadRecentConversations(userId, coachId) {
    if (!userId || !coachId) return;

    this._updateState({ isLoadingConversations: true });

    try {
      console.info('Loading recent conversations for:', { userId, coachId });
      const result = await getCoachConversations(userId, coachId);

      // Sort by last activity (most recent first) and take only the last 5
      const sortedConversations = (result.conversations || [])
        .sort((a, b) => {
          const dateA = new Date(a.metadata?.lastActivity || a.createdAt || 0);
          const dateB = new Date(b.metadata?.lastActivity || b.createdAt || 0);
          return dateB - dateA; // Most recent first
        })
        .slice(0, 5); // Take only the last 5

      this._updateState({
        recentConversations: sortedConversations,
        isLoadingConversations: false
      });

      console.info('Recent conversations loaded:', sortedConversations);
      return sortedConversations;
    } catch (error) {
      console.error('Error loading recent conversations:', error);
      // Don't show error for conversations as it's not critical
      this._updateState({
        recentConversations: [],
        isLoadingConversations: false
      });
      return [];
    }
  }

  /**
   * Create a new conversation and navigate to it
   */
  async createNewConversation(userId, coachId) {
    if (!userId || !coachId) return;

    this._updateState({ isCreatingConversation: true });

    try {
      console.info('Creating new conversation for:', { userId, coachId });

      // Create a new conversation with human-friendly date as title
      const now = new Date();
      const title = now.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const result = await createCoachConversation(userId, coachId, title);
      const { conversationId } = result;

      this._updateState({ isCreatingConversation: false });

      // Navigate to the conversation
      if (typeof this.onNavigation === 'function') {
        this.onNavigation('conversation-created', {
          userId,
          coachId,
          conversationId
        });
      }

      // Refresh both conversations list and coach data (to update total count)
      await Promise.all([
        this.loadRecentConversations(userId, coachId),
        this.loadCoachData(userId, coachId)
      ]);

      return { conversationId };
    } catch (error) {
      console.error('Error creating conversation:', error);
      this._updateState({
        isCreatingConversation: false,
        error: 'Failed to create conversation'
      });
      if (typeof this.onError === 'function') {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Navigate to a specific conversation
   */
  navigateToConversation(conversationId) {
    if (!this.userId || !this.coachId || !conversationId) return;

    if (typeof this.onNavigation === 'function') {
      this.onNavigation('view-conversation', {
        userId: this.userId,
        coachId: this.coachId,
        conversationId
      });
    }
  }

  /**
   * Initialize and load all data
   */
  async initialize(userId, coachId) {
    this.setIds(userId, coachId);

    try {
      // Load coach data and conversations in parallel
      await Promise.all([
        this.loadCoachData(userId, coachId),
        this.loadRecentConversations(userId, coachId)
      ]);
    } catch (error) {
      console.error('Error initializing training grounds:', error);
    }
  }

  /**
   * Refresh all data
   */
  async refresh() {
    if (!this.userId || !this.coachId) return;

    await this.initialize(this.userId, this.coachId);
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.state = {
      coachData: null,
      recentConversations: [],
      isLoading: false,
      isLoadingConversations: false,
      isCreatingConversation: false,
      error: null,
    };
  }
}

export default TrainingGroundsAgent;