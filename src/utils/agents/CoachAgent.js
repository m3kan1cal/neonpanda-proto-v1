import { nanoid } from 'nanoid';
import { getCoaches, getCoach, getCoachTemplates, createCoachFromTemplate } from '../apis/coachApi';
import { createCoachCreatorSession } from '../apis/coachCreatorApi';

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
    this.checkInProgressCoach = this.checkInProgressCoach.bind(this);
    this.startPolling = this.startPolling.bind(this);
    this.stopPolling = this.stopPolling.bind(this);
    this.cleanup = this.cleanup.bind(this);

    // Don't auto-initialize - let the component call initialize() when ready
  }

  /**
   * Initialize the agent - call this after the component is ready
   */
  initialize() {
    if (this.userId) {
      this.state.isLoading = true;
      this.checkInProgressCoach();
      this.loadCoaches();
      this.loadTemplates();
    } else {
      // Load templates even without userId for template browsing
      this.loadTemplates();
    }
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
      this.checkInProgressCoach();
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
      this.checkInProgressCoach();
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
      console.info('Loading coaches for userId:', this.userId);
      const result = await getCoaches(this.userId);
      const coaches = result.coaches || [];

      this._updateState({
        coaches,
        isLoading: false
      });

      // Check if we should remove in-progress coach (if it now exists in the coaches list)
      if (this.state.inProgressCoach && coaches.length > 0) {
        this._updateState({ inProgressCoach: null });
        this._removeInProgressData();
        this.stopPolling();
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
      console.info('Loading coach templates');
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
      console.info('Loading coach details:', { userId, coachId });
      const coachData = await getCoach(userId, coachId);
      console.info('Raw coach data received:', coachData);

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

      console.info('Formatted coach details:', formattedCoachData);
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

      console.info('Creating coach from template:', { templateId, userId });

      // Create coach from template via API
      const result = await createCoachFromTemplate(userId, templateId);
      const { coachConfig } = result;

      console.info('Coach created from template successfully:', coachConfig);

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
   * Creates a new coach creator session and navigates to it
   */
  async createNewCoach(providedUserId = null) {
    try {
      this._updateState({ error: null });

      // Generate userId if not provided
      const userId = providedUserId || this.userId || nanoid(21);

      console.info('Creating new coach creator session for userId:', userId);

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
   * Checks for in-progress coach creation from localStorage
   */
  checkInProgressCoach() {
    if (!this.userId) return;

    const inProgressData = localStorage.getItem(`inProgress_${this.userId}`);
    if (inProgressData) {
      try {
        const data = JSON.parse(inProgressData);
        const now = Date.now();
        const elapsed = now - data.timestamp;

        // Show in-progress coach for up to 10 minutes
        if (elapsed < 10 * 60 * 1000) {
          this._updateState({ inProgressCoach: data });
          this.startPolling();
        } else {
          // Remove expired in-progress data
          this._removeInProgressData();
        }
      } catch (error) {
        console.error('Error parsing in-progress data:', error);
        this._removeInProgressData();
      }
    }
  }

  /**
   * Starts polling for coach completion
   */
  startPolling() {
    if (this.pollInterval) return; // Already polling

    this.pollInterval = setInterval(async () => {
      try {
        const result = await getCoaches(this.userId);
        if (result.coaches?.length > 0) {
          // Coach has been created, update state and stop polling
          this._updateState({
            coaches: result.coaches,
            inProgressCoach: null
          });
          this._removeInProgressData();
          this.stopPolling();
        }
      } catch (error) {
        console.error('Error polling for coaches:', error);
      }
    }, 15000); // Poll every 15 seconds

    // Clean up polling after 10 minutes
    this.cleanupTimeout = setTimeout(() => {
      this.stopPolling();
      this._updateState({ inProgressCoach: null });
      this._removeInProgressData();
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
   * Removes in-progress data from localStorage
   */
  _removeInProgressData() {
    if (this.userId) {
      localStorage.removeItem(`inProgress_${this.userId}`);
    }
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