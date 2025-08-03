import { getCoach } from '../apis/coachApi';
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
      isLoading: !!(options.userId && options.coachId), // Start loading if we have required params
      error: null,
    };

    // Create a coach agent instance for utility methods
    this.coachAgent = new CoachAgent();

    // Notify component of initial state
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
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
   * Initialize and load coach data
   */
  async initialize(userId, coachId) {
    this.setIds(userId, coachId);

    try {
      // Load coach data only
      await this.loadCoachData(userId, coachId);
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
      isLoading: false,
      error: null,
    };
  }
}

export default TrainingGroundsAgent;