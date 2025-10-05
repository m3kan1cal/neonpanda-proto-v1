import { nanoid } from 'nanoid';
import { getCoaches, getCoach, getCoachTemplates, createCoachFromTemplate, createCoachFromSession } from '../apis/coachApi';
import { createCoachCreatorSession, getCoachConfigStatus } from '../apis/coachCreatorApi';

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
      templatesLoading: false,
      error: null,
      templatesError: null,
      inProgressCoach: null
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
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    } else {
      console.warn('CoachAgent: onStateChange is not a function, skipping state update notification');
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
        isLoading: false
      });

      // Check if we should clear in-progress coach (if it now exists in the coaches list)
      if (this.state.inProgressCoach && coaches.length > 0) {
        const inProgressSessionId = this.state.inProgressCoach.sessionId;
        const coachExists = coaches.some(c =>
          c.metadata?.coach_creator_session_id === inProgressSessionId
        );

        if (coachExists) {
          this._updateState({ inProgressCoach: null });
          this.stopPolling();
        }
      }

      return coaches;

    } catch (error) {
      console.error('Error loading coaches:', error);
      this._updateState({
        isLoading: false,
        error: error.message,
        coaches: []
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
        templatesLoading: false
      });

      return templates;

    } catch (error) {
      console.error('Error loading coach templates:', error);
      this._updateState({
        templatesLoading: false,
        templatesError: error.message,
        templates: []
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
      throw new Error('userId and coachId are required');
    }

    try {
      const coachData = await getCoach(userId, coachId);

      if (!coachData) {
        throw new Error('Coach not found');
      }

      // Extract coach data from full configuration
      const primaryMethodologyRaw = coachData.coachConfig?.metadata?.methodology_profile?.primary
        || coachData.coachConfig?.technical_config?.methodology
        || coachData.coachConfig?.selected_methodology?.primary_methodology;

      const formattedPrimaryMethodology = primaryMethodologyRaw
        ? primaryMethodologyRaw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : 'Custom';

      const formattedCoachData = {
        name: this.formatCoachName(coachData.coachConfig?.coach_name),
        specialization: this.getSpecializationDisplay(coachData.coachConfig?.technical_config?.specializations),
        experienceLevel: this.getExperienceLevelDisplay(coachData.coachConfig?.technical_config?.experience_level),
        programmingFocus: this.getProgrammingFocusDisplay(coachData.coachConfig?.technical_config?.programming_focus),
        primaryMethodology: formattedPrimaryMethodology,
        totalConversations: coachData.coachConfig?.metadata?.total_conversations || 0,
        activePrograms: coachData.coachConfig?.metadata?.active_programs || 0,
        joinedDate: coachData.createdAt,
        rawCoach: coachData // Keep the full coach object for any additional data needed
      };

      return formattedCoachData;

    } catch (error) {
      console.error('Error loading coach details:', error);
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
      console.error('Error creating coach from template:', error);
      this._updateState({
        error: 'Failed to create coach from template. Please try again.'
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
        throw new Error('User ID and Session ID are required');
      }

      // Create coach from session via API
      const result = await createCoachFromSession(userId, sessionId);

      // Reload coaches to show the new one (it will be building)
      await this.loadCoaches();

      return result;

    } catch (error) {
      console.error('Error creating coach from session:', error);
      this._updateState({
        error: 'Failed to create coach from session. Please try again.'
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
      this.onNavigation('coach-creator', { userId, sessionId });

      return { userId, sessionId };

    } catch (error) {
      console.error('Error creating coach creator session:', error);
      this._updateState({
        error: 'Failed to create new coach creator session. Please try again.'
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
      console.error('Cannot start polling without sessionId');
      return;
    }

    console.log(`Starting polling for coach build from session ${sessionId}`);

    this.pollInterval = setInterval(async () => {
      try {
        // Check if coach has been created
        const result = await getCoaches(this.userId);
        if (result.coaches?.length > 0) {
          // Check if any coach was created from this session
          const newCoach = result.coaches.find(c =>
            c.metadata?.coach_creator_session_id === sessionId
          );

          if (newCoach) {
            // Coach has been created, update state and stop polling
            this._updateState({
              coaches: result.coaches,
              inProgressCoach: null
            });
            this.stopPolling();
            return;
          }
        }

        // If no coach yet, check the session status
        try {
          const statusResponse = await getCoachConfigStatus(this.userId, sessionId);

          if (statusResponse.status === 'FAILED') {
            // Build failed - update state and stop polling
            this._updateState({
              inProgressCoach: {
                sessionId,
                status: 'failed',
                error: statusResponse.message || 'Coach configuration generation failed'
              }
            });
            this.stopPolling();
            return;
          }

          if (statusResponse.status === 'COMPLETE') {
            // Complete but coach not showing yet - refresh coaches
            await this.loadCoaches();
          }
        } catch (statusError) {
          console.error('Error checking coach config status:', statusError);
          // Continue polling even if status check fails
        }
      } catch (error) {
        console.error('Error polling for coaches:', error);
      }
    }, 10000); // Poll every 10 seconds

    // Clean up polling after 10 minutes
    this.cleanupTimeout = setTimeout(() => {
      this.stopPolling();
      this._updateState({
        inProgressCoach: {
          sessionId,
          status: 'timeout',
          error: 'Coach creation timed out. Please try again or contact support.'
        }
      });
    }, 10 * 60 * 1000);
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
   * Formats coach name for display
   */
  formatCoachName(name) {
    return name ? name.replace(/_/g, ' ') : '';
  }

  /**
   * Formats date for display
   */
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Formats specializations for display
   */
  getSpecializationDisplay(specializations) {
    if (!specializations || specializations.length === 0) return 'General Fitness';
    return specializations.map(spec =>
      spec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', ');
  }

  /**
   * Formats programming focus for display
   */
  getProgrammingFocusDisplay(focus) {
    if (!focus || focus.length === 0) return 'General';
    return focus.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(' & ');
  }

  /**
   * Gets experience level display text
   */
  getExperienceLevelDisplay(level) {
    return level ? level.charAt(0).toUpperCase() + level.slice(1) : 'General';
  }

  /**
   * Formats template target audience for display
   */
  getTemplateAudienceDisplay(targetAudience) {
    if (!targetAudience || targetAudience.length === 0) return 'General';
    return targetAudience.map(tag =>
      tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).slice(0, 3).join(', ');
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
      hasInProgressCoach: !!this.state.inProgressCoach
    };
  }

  /**
   * Determines if should show empty state
   */
  shouldShowEmptyState() {
    const userInfo = this.getUserInfo();
    return !userInfo.hasUserId ||
           (!this.state.isLoading && !userInfo.hasCoaches && !userInfo.hasInProgressCoach && !this.state.error);
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