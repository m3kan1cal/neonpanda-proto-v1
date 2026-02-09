import { nanoid } from "nanoid";
import {
  getWorkouts,
  getWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkoutsCount,
  getRecentWorkouts,
  getTrainingDaysCount,
  createWorkout,
  getWorkoutsByDateRange,
} from "../apis/workoutApi.js";

/**
 * WorkoutAgent - Handles the business logic for workout management
 * This class manages workout loading, recent workout tracking, and state management
 * while keeping the React component focused on UI concerns.
 */
export class WorkoutAgent {
  constructor(userId, onStateChange = null) {
    this.userId = userId;
    this.onStateChange = onStateChange;

    // Validate callback
    if (this.onStateChange && typeof this.onStateChange !== "function") {
      console.error(
        "WorkoutAgent: onStateChange must be a function, got:",
        typeof this.onStateChange,
      );
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
      thisWeekWorkoutCount: 0,
      trainingDaysCount: 0,
      lastWorkoutDaysAgo: 0,
      recentPrAchievements: [],
      isLoadingCount: false,
      isLoadingTrainingDays: false,
      isLoadingRecentItems: false,
      isLoadingAllItems: false,
      isLoadingItem: false,
      isLoadingPrAchievements: false,
      error: null,
      lastCheckTime: null,
    };

    // Add alias for backward compatibility
    this.state = this.workoutState;

    // Internal tracking
    this.pollInterval = null;
    this.lastWorkoutCount = 0;
  }

  /**
   * Calculates days since the most recent workout
   * @param {Array} workouts - Array of workout objects
   * @returns {number} - Number of days since last workout, or 0 if no workouts
   */
  _calculateLastWorkoutDaysAgo(workouts) {
    if (!workouts || workouts.length === 0) {
      return 0;
    }

    // Get the most recent workout (first in the array since they're sorted by completedAt desc)
    const mostRecentWorkout = workouts[0];

    if (!mostRecentWorkout || !mostRecentWorkout.completedAt) {
      return 0;
    }

    try {
      const lastWorkoutDate = new Date(mostRecentWorkout.completedAt);
      const now = new Date();

      // Calculate difference in milliseconds and convert to days
      const diffInMs = now.getTime() - lastWorkoutDate.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      return Math.max(0, diffInDays); // Ensure non-negative
    } catch (error) {
      console.warn(
        "WorkoutAgent._calculateLastWorkoutDaysAgo: Error calculating days ago:",
        error,
      );
      return 0;
    }
  }

  /**
   * Updates the workout state and triggers callback
   */
  _updateState(newStateData) {
    const oldState = { ...this.workoutState };

    // Update state
    this.workoutState = {
      ...this.workoutState,
      ...newStateData,
    };

    // Update alias for backward compatibility
    this.state = this.workoutState;

    // Call state change callback if available
    if (this.onStateChange && typeof this.onStateChange === "function") {
      try {
        this.onStateChange(this.workoutState);
      } catch (error) {
        console.error(
          "WorkoutAgent._updateState: Error in state change callback:",
          error,
        );
      }
    } else if (this.onStateChange !== null) {
      console.warn(
        "WorkoutAgent._updateState: Invalid callback type:",
        typeof this.onStateChange,
      );
    }
  }

  /**
   * Sets the user ID and loads initial data
   */
  async setUserId(userId) {
    if (!userId) {
      console.error("WorkoutAgent.setUserId: userId is required");
      return;
    }

    this.userId = userId;

    // Load initial data with single optimized call
    await this.loadWorkoutStats();
  }

  /**
   * Loads all workout stats with optimized API calls
   * Calculates: total count, recent workouts, this week count, training days, last workout days ago
   */
  async loadWorkoutStats() {
    if (!this.userId) {
      console.error("WorkoutAgent.loadWorkoutStats: No userId set");
      return;
    }

    // Set loading state for all metrics
    this._updateState({
      isLoadingCount: true,
      isLoadingRecentItems: true,
      isLoadingTrainingDays: true,
      isLoadingPrAchievements: true,
      error: null,
    });

    try {
      // Make parallel API calls for efficiency
      const [workoutsResult, countResult] = await Promise.all([
        // Get recent workouts for calculations (100 is enough for recent items and this week)
        getWorkouts(this.userId, {
          limit: 100,
          sortBy: "completedAt",
          sortOrder: "desc",
        }),
        // Get accurate total count from count endpoint
        getWorkoutsCount(this.userId),
      ]);

      const workouts = workoutsResult.workouts || [];
      const totalCount = countResult.totalCount || 0;

      // Calculate this week's date range
      const now = new Date();
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(now.getDate() - daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Calculate all metrics from the single dataset
      const recentWorkouts = workouts.slice(0, 5); // Take first 5 for recent list

      // Count this week's workouts
      const thisWeekWorkouts = workouts.filter((workout) => {
        if (!workout.completedAt) return false;
        const workoutDate = new Date(workout.completedAt);
        return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
      });

      // Calculate unique training days
      const uniqueDates = new Set();
      workouts.forEach((workout) => {
        if (workout.completedAt) {
          try {
            const date = new Date(workout.completedAt);
            const dateString = date.toISOString().split("T")[0];
            uniqueDates.add(dateString);
          } catch (error) {
            console.warn("Invalid date format for workout:", workout.workoutId);
          }
        }
      });

      // Calculate days since last workout
      const lastWorkoutDaysAgo = this._calculateLastWorkoutDaysAgo(workouts);

      // Extract PR achievements from the fetched workouts (avoids a duplicate API call)
      const recentPrAchievements = this._extractPrAchievements(workouts, 2);

      // Update all state at once
      this._updateState({
        recentWorkouts,
        totalWorkoutCount: totalCount,
        thisWeekWorkoutCount: thisWeekWorkouts.length,
        trainingDaysCount: uniqueDates.size,
        lastWorkoutDaysAgo,
        recentPrAchievements,
        isLoadingCount: false,
        isLoadingRecentItems: false,
        isLoadingTrainingDays: false,
        isLoadingPrAchievements: false,
        error: null,
        lastCheckTime: Date.now(),
      });
    } catch (error) {
      console.error(
        "WorkoutAgent.loadWorkoutStats: Error loading workout stats:",
        error,
      );
      this._updateState({
        isLoadingCount: false,
        isLoadingRecentItems: false,
        isLoadingTrainingDays: false,
        isLoadingPrAchievements: false,
        error: error.message || "Failed to load workout statistics",
      });
    }
  }

  /**
   * Loads total workout count for the user
   */
  async loadTotalWorkoutCount() {
    if (!this.userId) {
      console.error("WorkoutAgent.loadTotalWorkoutCount: No userId set");
      return;
    }

    this._updateState({ isLoadingCount: true });

    try {
      const result = await getWorkoutsCount(this.userId);

      this._updateState({
        totalWorkoutCount: result.totalCount || 0,
        isLoadingCount: false,
        error: null,
      });
    } catch (error) {
      console.error(
        "WorkoutAgent.loadTotalWorkoutCount: Error loading count:",
        error,
      );
      this._updateState({
        isLoadingCount: false,
        error: error.message || "Failed to load workout count",
      });
    }
  }

  /**
   * Loads training days count for the user
   */
  async loadTrainingDaysCount(options = {}) {
    if (!this.userId) {
      console.error("WorkoutAgent.loadTrainingDaysCount: No userId set");
      return;
    }

    this._updateState({ isLoadingTrainingDays: true });

    try {
      const trainingDaysCount = await getTrainingDaysCount(
        this.userId,
        options,
      );

      this._updateState({
        trainingDaysCount: trainingDaysCount || 0,
        isLoadingTrainingDays: false,
        error: null,
      });
    } catch (error) {
      console.error(
        "WorkoutAgent.loadTrainingDaysCount: Error loading training days count:",
        error,
      );
      this._updateState({
        isLoadingTrainingDays: false,
        error: error.message || "Failed to load training days count",
      });
    }
  }

  /**
   * Loads this week's workout count for the user
   */
  async loadThisWeekWorkoutCount() {
    if (!this.userId) {
      console.error("WorkoutAgent.loadThisWeekWorkoutCount: No userId set");
      return;
    }

    this._updateState({ isLoadingCount: true });

    try {
      // Calculate start of current week (Monday)
      const now = new Date();
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday should be 6 days from Monday
      startOfWeek.setDate(now.getDate() - daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0); // Start of day

      // Calculate end of current week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999); // End of day

      // Use the statically imported API function
      const result = await getWorkoutsByDateRange(
        this.userId,
        startOfWeek,
        endOfWeek,
      );

      const thisWeekCount = result.workouts ? result.workouts.length : 0;

      this._updateState({
        thisWeekWorkoutCount: thisWeekCount,
        isLoadingCount: false,
        error: null,
      });
    } catch (error) {
      console.error(
        "WorkoutAgent.loadThisWeekWorkoutCount: Error loading this week count:",
        error,
      );
      this._updateState({
        isLoadingCount: false,
        error: error.message || "Failed to load this week workout count",
      });
    }
  }

  /**
   * Loads recent workouts for the user
   */
  async loadRecentWorkouts(limit = 10) {
    if (!this.userId) {
      console.error("WorkoutAgent.loadRecentWorkouts: No userId set");
      return;
    }

    this._updateState({ isLoadingRecentItems: true });

    try {
      const result = await getWorkouts(this.userId, {
        limit,
        sortBy: "completedAt",
        sortOrder: "desc", // Most recent first
      });

      // Extract workouts from the API response
      const workouts = result.workouts || [];

      // Calculate days since last workout
      const lastWorkoutDaysAgo = this._calculateLastWorkoutDaysAgo(workouts);

      this._updateState({
        recentWorkouts: workouts,
        lastWorkoutDaysAgo: lastWorkoutDaysAgo,
        isLoadingRecentItems: false,
        error: null,
        lastCheckTime: new Date(),
      });
    } catch (error) {
      console.error(
        "WorkoutAgent.loadRecentWorkouts: Error loading workouts:",
        error,
      );
      this._updateState({
        isLoadingRecentItems: false,
        error: error.message || "Failed to load workouts",
      });
    }
  }

  /**
   * Extracts and enriches PR achievements from an array of workout objects.
   * Each PR is enriched with parent workout context (workoutId, workoutName, completedAt, discipline).
   * @param {Array} workouts - Array of workout objects (must include prAchievements field)
   * @param {number} weeksBack - Only include PRs from workouts within this many weeks
   * @returns {Array} - Flattened, enriched PR achievements sorted by completedAt descending
   */
  _extractPrAchievements(workouts, weeksBack = 2) {
    if (!workouts || workouts.length === 0) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - weeksBack * 7);

    const enrichedPrs = [];

    for (const workout of workouts) {
      // Filter by date
      if (workout.completedAt) {
        const workoutDate = new Date(workout.completedAt);
        if (workoutDate < cutoffDate) continue;
      }

      const prAchievements = workout.prAchievements || [];
      if (prAchievements.length === 0) continue;

      for (const pr of prAchievements) {
        enrichedPrs.push({
          // PR fields
          exercise: pr.exercise,
          prType: pr.pr_type,
          newBest: pr.new_best,
          previousBest: pr.previous_best,
          improvement: pr.improvement,
          improvementPercentage: pr.improvement_percentage,
          significance: pr.significance,
          context: pr.context,
          datePrevious: pr.date_previous,
          // Parent workout context
          workoutId: workout.workoutId,
          workoutName: workout.workoutName || "Workout",
          completedAt: workout.completedAt,
          discipline: workout.discipline,
        });
      }
    }

    // Sort by completedAt descending (most recent first)
    enrichedPrs.sort(
      (a, b) => new Date(b.completedAt) - new Date(a.completedAt),
    );

    return enrichedPrs;
  }

  /**
   * Loads all workout sessions with optional filtering
   */
  async loadAllWorkouts(options = {}) {
    if (!this.userId) return;

    this._updateState({ isLoadingAllItems: true, error: null });

    try {
      const result = await getWorkouts(this.userId, options);
      // API returns 'workouts' property, not 'workouts'
      const allWorkouts = result.workouts || [];

      // Calculate days since last workout from all workouts
      const lastWorkoutDaysAgo = this._calculateLastWorkoutDaysAgo(allWorkouts);

      this._updateState({
        allWorkouts,
        lastWorkoutDaysAgo: lastWorkoutDaysAgo,
        isLoadingAllItems: false,
      });

      return allWorkouts;
    } catch (error) {
      console.error("Error loading all workouts:", error);
      this._updateState({
        isLoadingAllItems: false,
        error: error.message,
        allWorkouts: [],
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
      const result = await getWorkout(this.userId, workoutId);

      this._updateState({ isLoadingItem: false });
      return result.workout || null;
    } catch (error) {
      console.error("Error loading workout details:", error);
      this._updateState({
        isLoadingItem: false,
        error: error.message || "Failed to load workout details",
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
        sortBy: "completedAt",
      });

      // API returns 'workouts' property, not 'workouts'
      const newWorkouts = result.workouts || [];

      // Check if we have new workouts since last check
      if (newWorkouts.length > 0) {
        const currentWorkoutCount = this.state.recentWorkouts.length;

        // If we have new workouts, refresh the recent workouts list
        if (newWorkouts.length > 0 && this.state.lastCheckTime) {
          await this.loadRecentWorkouts(5);

          // Check if count increased (new workout added)
          if (this.state.recentWorkouts.length > currentWorkoutCount) {
            // Get the most recent workout for notification
            const mostRecentWorkout = this.state.recentWorkouts[0];
            this.onNewWorkout(mostRecentWorkout);
          }
        }
      }
    } catch (error) {
      console.error("Error checking for new workouts:", error);
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
  }

  /**
   * Stops polling for new workouts
   */
  stopPollingForNewWorkouts() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Formats workout for display - returns title for lists, summary for detailed views
   */
  formatWorkoutSummary(workout, useTitle = false) {
    if (!workout) return "Unknown workout";

    // If explicitly requesting title format, or if no AI summary available, use concise format
    if (useTitle || !workout.summary) {
      const workoutName = workout.workoutName || "Workout";
      const discipline = workout.discipline || "";

      // Create a concise title without duration
      let title = workoutName;
      if (discipline) {
        title += ` (${discipline})`;
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
    if (!completedAt) return "Unknown time";

    try {
      const date = new Date(completedAt);
      const now = new Date();

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date format:", completedAt);
        return "Invalid date";
      }

      // Calculate difference in milliseconds, then convert to minutes
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      // Use absolute value to handle any timezone issues
      const absDiffInMinutes = Math.abs(diffInMinutes);

      // Log negative values for debugging
      if (diffInMinutes < 0) {
        console.warn("Workout time calculation resulted in negative value:", {
          completedAt,
          parsedDate: date.toISOString(),
          now: now.toISOString(),
          diffInMinutes,
          absDiffInMinutes,
        });
      }

      if (absDiffInMinutes < 60) {
        return `${absDiffInMinutes}m ago`;
      } else if (absDiffInMinutes < 1440) {
        // 24 hours
        const hours = Math.floor(absDiffInMinutes / 60);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(absDiffInMinutes / 1440);
        return `${days}d ago`;
      }
    } catch (error) {
      console.error("Error formatting workout time:", error, { completedAt });
      return "Unknown time";
    }
  }

  /**
   * Gets workout confidence level display
   */
  getConfidenceDisplay(confidence) {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Good";
    if (confidence >= 0.4) return "Fair";
    return "Low";
  }

  /**
   * Gets workout confidence color class
   */
  getConfidenceColorClass(confidence) {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    if (confidence >= 0.4) return "text-orange-400";
    return "text-red-400";
  }

  /**
   * Updates workout metadata (title, etc.)
   */
  async updateWorkout(userId, workoutId, updates) {
    if (
      !userId ||
      !workoutId ||
      !updates ||
      Object.keys(updates).length === 0
    ) {
      throw new Error("User ID, Workout ID, and updates are required");
    }

    try {
      // Call API to update workout
      const result = await updateWorkout(userId, workoutId, updates);

      // Update local state with new metadata
      const updatedWorkout = {
        ...this.state.workout,
        ...updates,
      };

      this._updateState({
        workout: updatedWorkout,
      });

      // Refresh recent workouts to show updated metadata
      if (this.state.recentWorkouts.length > 0) {
        await this.loadRecentWorkouts(5);
      }

      // Refresh all workouts if they're loaded
      if (this.state.allWorkouts.length > 0) {
        await this.loadAllWorkouts();
      }

      return result;
    } catch (error) {
      console.error("Error updating workout metadata:", error);
      this._updateState({
        error: "Failed to update workout metadata",
      });
      if (typeof this.onError === "function") {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Creates a new workout from user input
   */
  async createWorkout(workoutContent, options = {}) {
    if (!this.userId) {
      throw new Error("User ID is required");
    }

    if (
      !workoutContent ||
      typeof workoutContent !== "string" ||
      workoutContent.trim().length === 0
    ) {
      throw new Error("Workout content is required");
    }

    try {
      // Call API to create workout
      const result = await createWorkout(
        this.userId,
        workoutContent.trim(),
        options,
      );

      return result;
    } catch (error) {
      console.error("Error creating workout:", error);
      this._updateState({
        error: "Failed to create workout",
      });
      if (typeof this.onError === "function") {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Deletes a workout session
   */
  async deleteWorkout(userId, workoutId) {
    if (!userId || !workoutId) {
      throw new Error("User ID and Workout ID are required");
    }

    try {
      // Call API to delete workout
      const result = await deleteWorkout(userId, workoutId);

      // Remove from local state if it exists
      this._updateState({
        recentWorkouts: this.state.recentWorkouts.filter(
          (w) => w.workoutId !== workoutId,
        ),
        allWorkouts: this.state.allWorkouts.filter(
          (w) => w.workoutId !== workoutId,
        ),
      });

      return result;
    } catch (error) {
      console.error("Error deleting workout:", error);
      this._updateState({
        error: "Failed to delete workout",
      });
      if (typeof this.onError === "function") {
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
   * Gets user info
   */
  getUserInfo() {
    return {
      userId: this.userId,
      isActive: !!this.userId,
      workoutCount: this.state.recentWorkouts.length,
      lastUpdate: this.state.lastCheckTime,
    };
  }

  /**
   * Refreshes workout data
   */
  async refresh() {
    if (this.userId) {
      await this.loadRecentWorkouts(5);
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
      thisWeekWorkoutCount: 0,
      trainingDaysCount: 0,
      lastWorkoutDaysAgo: 0,
      recentPrAchievements: [],
      isLoadingCount: false,
      isLoadingTrainingDays: false,
      isLoadingRecentItems: false,
      isLoadingAllItems: false,
      isLoadingItem: false,
      isLoadingPrAchievements: false,
      error: null,
      lastCheckTime: null,
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
