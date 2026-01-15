import { getExerciseNames, getExercises } from "../apis/exerciseApi.js";

/**
 * ExerciseAgent - Handles the business logic for exercise history management
 * This class manages exercise names loading, exercise history retrieval, and state management
 * while keeping the React component focused on UI concerns.
 *
 * State is owned by the React component, not the agent. The agent receives an onStateChange
 * callback from the component and calls it to trigger state updates.
 */
export class ExerciseAgent {
  constructor(userId, onStateChange = null) {
    this.userId = userId;
    this.onStateChange = onStateChange;

    // Validate callback
    if (this.onStateChange && typeof this.onStateChange !== "function") {
      console.error(
        "ExerciseAgent: onStateChange must be a function, got:",
        typeof this.onStateChange,
      );
      this.onStateChange = null;
    }

    // Default callbacks
    this.onError = () => {};
  }

  /**
   * Updates state by calling the onStateChange callback
   * @param {Object} newStateData - New state data to merge
   */
  _updateState(newStateData) {
    // Call state change callback if available
    if (this.onStateChange && typeof this.onStateChange === "function") {
      try {
        this.onStateChange(newStateData);
      } catch (error) {
        console.error(
          "ExerciseAgent._updateState: Error in state change callback:",
          error,
        );
      }
    } else if (this.onStateChange !== null) {
      console.warn(
        "ExerciseAgent._updateState: Invalid callback type:",
        typeof this.onStateChange,
      );
    }
  }

  /**
   * Sets the user ID
   * @param {string} userId - The user ID
   */
  setUserId(userId) {
    if (!userId) {
      console.error("ExerciseAgent.setUserId: userId is required");
      return;
    }

    this.userId = userId;
  }

  /**
   * Loads all exercise names for the user
   * @param {Object} [options] - Optional parameters
   * @param {string} [options.discipline] - Filter by discipline
   * @param {number} [options.limit] - Maximum number of results
   * @returns {Promise<Object>} - The API response with exercise names
   */
  async loadExerciseNames(options = {}) {
    if (!this.userId) {
      console.error("ExerciseAgent.loadExerciseNames: No userId set");
      return;
    }

    this._updateState({ isLoadingNames: true, error: null });

    try {
      const result = await getExerciseNames(this.userId, options);

      this._updateState({
        exerciseNames: result.exercises || [],
        totalExerciseCount: result.totalCount || 0,
        isLoadingNames: false,
      });

      return result;
    } catch (error) {
      console.error("ExerciseAgent.loadExerciseNames: Error:", error);
      this._updateState({
        isLoadingNames: false,
        error: error.message || "Failed to load exercise names",
      });
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Loads exercise history for a specific exercise name
   * @param {string} exerciseName - The normalized exercise name
   * @param {Object} [options] - Optional parameters
   * @param {string} [options.fromDate] - Filter from date (YYYY-MM-DD)
   * @param {string} [options.toDate] - Filter to date (YYYY-MM-DD)
   * @param {number} [options.limit] - Maximum number of results (default: 10)
   * @param {string} [options.sortOrder] - Sort order: 'asc' or 'desc'
   * @returns {Promise<Object>} - The API response with exercises and aggregations
   */
  async loadExercises(exerciseName, options = {}) {
    if (!this.userId) {
      console.error("ExerciseAgent.loadExercises: No userId set");
      return;
    }

    if (!exerciseName) {
      console.error("ExerciseAgent.loadExercises: exerciseName is required");
      return;
    }

    this._updateState({ isLoadingExercises: true });

    try {
      // Default to 10 results for expanded card view
      const result = await getExercises(this.userId, exerciseName, {
        limit: options.limit || 10,
        sortOrder: options.sortOrder || "desc",
        ...options,
      });

      // Return the full result so component can store exercises and aggregations
      this._updateState({
        isLoadingExercises: false,
        // Store the exercises for this exercise name
        currentExercises: {
          exerciseName,
          exercises: result.exercises || [],
          aggregations: result.aggregations || null,
          pagination: result.pagination || null,
        },
      });

      return result;
    } catch (error) {
      console.error("ExerciseAgent.loadExercises: Error:", error);
      this._updateState({ isLoadingExercises: false });
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Converts a normalized exercise name to display format
   * Fallback utility - API already provides displayName
   * @param {string} exerciseName - Normalized name (e.g., "back_squat")
   * @returns {string} - Display name (e.g., "Back Squat")
   */
  getDisplayName(exerciseName) {
    if (!exerciseName) return "Unknown Exercise";

    // Handle special cases
    const specialCases = {
      pr: "PR",
      rpe: "RPE",
      amrap: "AMRAP",
      emom: "EMOM",
      wod: "WOD",
      rm: "RM",
      db: "DB",
      kb: "KB",
      bb: "BB",
    };

    return exerciseName
      .split("_")
      .map(
        (word) =>
          specialCases[word.toLowerCase()] ||
          word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join(" ");
  }

  /**
   * Formats metrics for display in exercise cards
   * @param {Object} metrics - The exercise metrics object
   * @returns {string} - Formatted metrics string (e.g., "4x8 @ 275 lbs" or "4x6-12 @ 275 lbs")
   */
  formatMetrics(metrics) {
    if (!metrics) return "";

    const parts = [];

    // Format sets x reps with adaptive display for varying reps and weights
    if (metrics.sets && metrics.reps) {
      const hasDetailedData =
        metrics.repsPerSet &&
        metrics.weightsPerSet &&
        metrics.repsPerSet.length === metrics.weightsPerSet.length;

      if (hasDetailedData) {
        const allRepsSame = metrics.repsPerSet.every(
          (r) => r === metrics.repsPerSet[0],
        );
        const allWeightsSame = metrics.weightsPerSet.every(
          (w) => w === metrics.weightsPerSet[0],
        );

        if (allRepsSame && allWeightsSame) {
          // Consistent reps and weight: "4x10 @ 135 lbs"
          parts.push(`${metrics.sets}x${metrics.reps}`);
        } else if (allWeightsSame) {
          // Varying reps, same weight: "4x12, 10, 8, 6 @ 135 lbs"
          parts.push(`${metrics.sets}x${metrics.repsPerSet.join(", ")}`);
        } else {
          // Varying reps and/or weights: "12@135, 10@155, 8@175, 6@185"
          const setDetails = metrics.repsPerSet
            .map((reps, i) => `${reps}@${metrics.weightsPerSet[i]}`)
            .join(", ");
          parts.push(setDetails);
          // Weight unit will be added at end as suffix
        }

        // Add weight at end if all weights are the same
        if (allWeightsSame && metrics.weightsPerSet[0] > 0) {
          parts.push(`@ ${metrics.weightsPerSet[0]} lbs`);
        } else if (!allWeightsSame) {
          // Add unit suffix for varying weights
          parts.push("lbs");
        }
      } else {
        // Fallback: no detailed data
        parts.push(`${metrics.sets}x${metrics.reps}`);
        // Add weight if available
        if (metrics.weight) {
          parts.push(`@ ${metrics.weight} lbs`);
        } else if (metrics.maxWeight) {
          parts.push(`@ ${metrics.maxWeight} lbs`);
        }
      }
    } else if (metrics.reps) {
      parts.push(`${metrics.reps} reps`);
      // Add weight for single-set exercises
      if (metrics.weight) {
        parts.push(`@ ${metrics.weight} lbs`);
      } else if (metrics.maxWeight) {
        parts.push(`@ ${metrics.maxWeight} lbs`);
      }
    }

    // Format distance for running exercises
    if (metrics.distance) {
      const distanceStr =
        metrics.distance >= 1000
          ? `${(metrics.distance / 1000).toFixed(1)} km`
          : `${metrics.distance} m`;
      parts.push(distanceStr);
    }

    // Format time/duration
    if (metrics.duration) {
      const minutes = Math.floor(metrics.duration / 60);
      const seconds = metrics.duration % 60;
      if (minutes > 0) {
        parts.push(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      } else {
        parts.push(`${seconds}s`);
      }
    }

    return parts.join(" ");
  }

  /**
   * Cleanup method - called when component unmounts
   */
  destroy() {
    this.userId = null;
    this.onStateChange = null;
    this.onError = () => {};
  }
}

export default ExerciseAgent;
