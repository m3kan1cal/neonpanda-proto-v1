import { nanoid } from 'nanoid';
import { getWorkouts, getWorkout, updateWorkout, getWorkoutsCount, getRecentWorkouts } from '../apis/workoutApi.js';

/**
 * WorkoutAgent - Handles the business logic for workout management
 * This class manages workout loading, recent workout tracking, and state management
 * while keeping the React component focused on UI concerns.
 */
export class WorkoutAgent {
  constructor(userId, onStateChange = null) {
    console.info('WorkoutAgent: Constructor called');
    console.info('WorkoutAgent: userId:', userId || '(not provided - will be set later)');

    this.userId = userId;
    this.onStateChange = onStateChange;

    // Validate callback
    if (this.onStateChange && typeof this.onStateChange !== 'function') {
      console.error('WorkoutAgent: onStateChange must be a function, got:', typeof this.onStateChange);
      this.onStateChange = null;
    }

    // Default callbacks
    this.onError = () => {};
    this.onNewWorkout = () => {};

    // Initialize state
    this.workoutState = {
      recentWorkouts: [],
      allWorkouts: [],
      totalWorkoutCount: 0,
      isLoadingCount: false,
      isLoadingRecentItems: false,
      isLoadingItem: false,
      error: null,
      lastCheckTime: null
    };

    // Add alias for backward compatibility
    this.state = this.workoutState;

    // Internal tracking
    this.pollInterval = null;
    this.lastWorkoutCount = 0;

    console.info('WorkoutAgent: Constructor complete', userId ? 'with userId' : '(userId will be set later)');
  }

  /**
   * Updates the workout state and triggers callback
   */
  _updateState(newStateData) {
    const oldState = { ...this.workoutState };

    // Update state
    this.workoutState = {
      ...this.workoutState,
      ...newStateData
    };

    // Update alias for backward compatibility
    this.state = this.workoutState;

    // Call state change callback if available
    if (this.onStateChange && typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(this.workoutState);
      } catch (error) {
        console.error('WorkoutAgent._updateState: Error in state change callback:', error);
      }
    } else if (this.onStateChange !== null) {
      console.warn('WorkoutAgent._updateState: Invalid callback type:', typeof this.onStateChange);
    }
  }

  /**
   * Sets the user ID and loads initial data
   */
  async setUserId(userId) {
    console.info('WorkoutAgent.setUserId called with:', userId);

    if (!userId) {
      console.error('WorkoutAgent.setUserId: userId is required');
      return;
    }

    this.userId = userId;
    console.info('WorkoutAgent.setUserId: userId set to:', this.userId);

    // Load initial data
    await Promise.all([
      this.loadRecentWorkouts(),
      this.loadTotalWorkoutCount()
    ]);

    console.info('WorkoutAgent.setUserId: Initial data loaded');
  }

  /**
   * Loads total workout count for the user
   */
  async loadTotalWorkoutCount() {
    console.info('WorkoutAgent.loadTotalWorkoutCount called');

    if (!this.userId) {
      console.error('WorkoutAgent.loadTotalWorkoutCount: No userId set');
      return;
    }

    this._updateState({ isLoadingCount: true });

    try {
      const result = await getWorkoutsCount(this.userId);
      console.info('WorkoutAgent.loadTotalWorkoutCount: Got count:', result);

      this._updateState({
        totalWorkoutCount: result.totalCount || 0,
        isLoadingCount: false,
        error: null
      });

    } catch (error) {
      console.error('WorkoutAgent.loadTotalWorkoutCount: Error loading count:', error);
      this._updateState({
        isLoadingCount: false,
        error: error.message || 'Failed to load workout count'
      });
    }
  }

  /**
   * Loads recent workouts for the user
   */
  async loadRecentWorkouts(limit = 5) {
    console.info('WorkoutAgent.loadRecentWorkouts called with limit:', limit);

    if (!this.userId) {
      console.error('WorkoutAgent.loadRecentWorkouts: No userId set');
      return;
    }

    this._updateState({ isLoadingRecentItems: true });

    try {
      const result = await getWorkouts(this.userId, {
        limit,
        sortBy: 'completedAt',
        sortOrder: 'desc'  // Most recent first
      });
      console.info('WorkoutAgent.loadRecentWorkouts: Got result:', result);

      // Extract workouts from the API response
      const workouts = result.workouts || [];
      console.info('WorkoutAgent.loadRecentWorkouts: Extracted workouts:', workouts);

      this._updateState({
        recentWorkouts: workouts,
        isLoadingRecentItems: false,
        error: null,
        lastCheckTime: new Date()
      });

    } catch (error) {
      console.error('WorkoutAgent.loadRecentWorkouts: Error loading workouts:', error);
      this._updateState({
        isLoadingRecentItems: false,
        error: error.message || 'Failed to load workouts'
      });
    }
  }

  /**
   * Loads all workout sessions with optional filtering
   */
  async loadAllWorkouts(options = {}) {
    if (!this.userId) return;

    this._updateState({ isLoadingRecentItems: true, error: null });

    try {
      console.info('Loading all workouts for userId:', this.userId, 'with options:', options);
      const result = await getWorkouts(this.userId, options);
      // API returns 'workouts' property, not 'workouts'
      const allWorkouts = result.workouts || [];

      this._updateState({
        allWorkouts,
        isLoadingRecentItems: false
      });

      return allWorkouts;

    } catch (error) {
      console.error('Error loading all workouts:', error);
      this._updateState({
        isLoadingRecentItems: false,
        error: error.message,
        allWorkouts: []
      });
      this.onError(error);
      throw error;
    }
  }

  /**
   * Gets a specific workout by ID
   */
  async getWorkoutById(workoutId) {
    if (!this.userId || !workoutId) return null;

    this._updateState({ isLoadingItem: true, error: null });

    try {
      console.info('Loading workout details for:', workoutId);
      const result = await getWorkout(this.userId, workoutId);

      this._updateState({ isLoadingItem: false });
      return result.workout || null;

    } catch (error) {
      console.error('Error loading workout details:', error);
            this._updateState({
        isLoadingItem: false,
        error: error.message || 'Failed to load workout details'
      });
      this.onError(error);
      return null;
    }
  }

  /**
   * Alias for getWorkoutById for consistency
   */
  async getWorkout(workoutId) {
    return this.getWorkoutById(workoutId);
  }

  /**
   * Checks for newly logged workouts
   */
  async checkForNewWorkouts() {
    if (!this.userId) return;

    try {
      // Get workouts from the last 5 minutes
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      const result = await getWorkouts(this.userId, {
        fromDate: fiveMinutesAgo.toISOString(),
        limit: 5,
        sortBy: 'completedAt'
      });

      // API returns 'workouts' property, not 'workouts'
      const newWorkouts = result.workouts || [];

      // Check if we have new workouts since last check
      if (newWorkouts.length > 0) {
        const currentWorkoutCount = this.state.recentWorkouts.length;

        // If we have new workouts, refresh the recent workouts list
        if (newWorkouts.length > 0 && this.state.lastCheckTime) {
          await this.loadRecentWorkouts();

          // Check if count increased (new workout added)
          if (this.state.recentWorkouts.length > currentWorkoutCount) {
            // Get the most recent workout for notification
            const mostRecentWorkout = this.state.recentWorkouts[0];
            this.onNewWorkout(mostRecentWorkout);
          }
        }
      }

    } catch (error) {
      console.error('Error checking for new workouts:', error);
    }
  }

  /**
   * Starts polling for new workouts
   */
  startPollingForNewWorkouts() {
    if (this.pollInterval) return; // Already polling

    // Poll every 2 minutes for new workouts (less aggressive)
    this.pollInterval = setInterval(() => {
      this.checkForNewWorkouts();
    }, 120000); // 2 minutes instead of 30 seconds

    console.info('Started polling for new workouts');
  }

  /**
   * Stops polling for new workouts
   */
  stopPollingForNewWorkouts() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.info('Stopped polling for new workouts');
    }
  }

  /**
   * Formats workout for display - returns title for lists, summary for detailed views
   */
  formatWorkoutSummary(workout, useTitle = false) {
    if (!workout) return 'Unknown workout';

    // If explicitly requesting title format, or if no AI summary available, use concise format
    if (useTitle || !workout.summary) {
      const workoutName = workout.workoutName || 'Workout';
      const discipline = workout.discipline || '';
      const duration = workout.duration ? `${Math.round(workout.duration)}min` : '';

      // Create a concise title
      let title = workoutName;
      if (discipline) {
        title += ` (${discipline})`;
      }
      if (duration) {
        title += ` • ${duration}`;
      }

      return title;
    }

    // Return AI-generated summary for detailed contexts
    return workout.summary;
  }

  /**
   * Formats workout time for display
   */
  formatWorkoutTime(completedAt) {
    if (!completedAt) return 'Unknown time';

    const date = new Date(completedAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }

  /**
   * Gets workout confidence level display
   */
  getConfidenceDisplay(confidence) {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Good';
    if (confidence >= 0.4) return 'Fair';
    return 'Low';
  }

  /**
   * Gets workout confidence color class
   */
  getConfidenceColorClass(confidence) {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    if (confidence >= 0.4) return 'text-orange-400';
    return 'text-red-400';
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
      workoutCount: this.state.recentWorkouts.length,
      lastUpdate: this.state.lastCheckTime
    };
  }

  /**
   * Refreshes workout data
   */
  async refresh() {
    if (this.userId) {
      await this.loadRecentWorkouts();
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    this.stopPollingForNewWorkouts();
  }

  /**
   * Destroys the agent and cleans up
   */
  destroy() {
    this.cleanup();
    this.userId = null;

    // Reset state to match constructor structure
    this.workoutState = {
      recentWorkouts: [],
      allWorkouts: [],
      totalWorkoutCount: 0,
      isLoadingCount: false,
      isLoadingRecentItems: false,
      isLoadingItem: false,
      error: null,
      lastCheckTime: null
    };
    this.state = this.workoutState;

    // Reset callbacks
    this.onStateChange = null;
    this.onError = () => {};
    this.onNewWorkout = () => {};

    // Reset internal tracking
    this.pollInterval = null;
    this.lastWorkoutCount = 0;
  }
}

export default WorkoutAgent;