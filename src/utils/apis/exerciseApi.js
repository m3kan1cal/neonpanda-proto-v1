import { getApiUrl, authenticatedFetch } from "./apiConfig.js";

/**
 * API service for Exercise operations
 */

/**
 * Gets all exercise names for a user with counts and metadata
 * @param {string} userId - The user ID
 * @param {Object} [options] - Optional query parameters
 * @param {string} [options.discipline] - Filter by discipline (crossfit, powerlifting, etc.)
 * @param {number} [options.limit] - Maximum number of results (default: 500)
 * @returns {Promise<Object>} - The API response with exercises array and totalCount
 * Response: { exercises: ExerciseNameEntry[], totalCount: number }
 * ExerciseNameEntry: { exerciseName, displayName, count, lastPerformed, disciplines }
 */
export const getExerciseNames = async (userId, options = {}) => {
  // Validate limit parameter
  if (options.limit !== undefined) {
    if (
      typeof options.limit !== "number" ||
      options.limit < 1 ||
      options.limit > 500
    ) {
      throw new Error("limit must be a number between 1 and 500");
    }
  }

  // Build query parameters
  const params = new URLSearchParams();

  if (options.discipline) params.append("discipline", options.discipline);
  if (options.limit) params.append("limit", options.limit.toString());

  const queryString = params.toString();
  const url = `${getApiUrl("")}/users/${userId}/exercise-names${queryString ? "?" + queryString : ""}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getExerciseNames: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("getExerciseNames: API Error:", error);
    throw error;
  }
};

/**
 * Gets exercise history for a specific exercise name
 * @param {string} userId - The user ID
 * @param {string} exerciseName - The normalized exercise name (e.g., "back_squat")
 * @param {Object} [options] - Optional query parameters
 * @param {string} [options.fromDate] - Filter from this date (YYYY-MM-DD)
 * @param {string} [options.toDate] - Filter to this date (YYYY-MM-DD)
 * @param {number} [options.limit] - Maximum number of results (default: 100)
 * @param {string} [options.sortOrder] - Sort order: 'asc' or 'desc' (default: 'desc')
 * @param {string} [options.cursor] - Pagination cursor from previous response
 * @returns {Promise<Object>} - The API response with exercises, aggregations, and pagination
 * Response: {
 *   exerciseName,
 *   exercises: Exercise[],
 *   aggregations: { prWeight, prReps, prVolume, averageWeight, averageReps, totalOccurrences, ... },
 *   pagination: { lastEvaluatedKey?, hasMore }
 * }
 */
export const getExercises = async (userId, exerciseName, options = {}) => {
  if (!exerciseName) {
    throw new Error("exerciseName is required");
  }

  // Validate limit parameter
  if (options.limit !== undefined) {
    if (
      typeof options.limit !== "number" ||
      options.limit < 1 ||
      options.limit > 100
    ) {
      throw new Error("limit must be a number between 1 and 100");
    }
  }

  // Validate sortOrder parameter
  if (options.sortOrder && !["asc", "desc"].includes(options.sortOrder)) {
    throw new Error('sortOrder must be either "asc" or "desc"');
  }

  // Build query parameters
  const params = new URLSearchParams();
  params.append("exerciseName", exerciseName);

  if (options.fromDate) params.append("fromDate", options.fromDate);
  if (options.toDate) params.append("toDate", options.toDate);
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.sortOrder) params.append("sortOrder", options.sortOrder);
  if (options.cursor) params.append("cursor", options.cursor);

  const queryString = params.toString();
  const url = `${getApiUrl("")}/users/${userId}/exercises?${queryString}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Exercise not found");
      }

      const errorText = await response.text();
      console.error("getExercises: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("getExercises: API Error:", error);
    throw error;
  }
};

/**
 * Gets exercises filtered by discipline (convenience function)
 * @param {string} userId - The user ID
 * @param {string} discipline - The discipline to filter by
 * @param {number} [limit=100] - Maximum number of exercise names
 * @returns {Promise<Object>} - The API response with filtered exercise names
 */
export const getExerciseNamesByDiscipline = async (
  userId,
  discipline,
  limit = 100,
) => {
  return getExerciseNames(userId, {
    discipline,
    limit,
  });
};

/**
 * Gets recent exercise history for a specific exercise (convenience function)
 * @param {string} userId - The user ID
 * @param {string} exerciseName - The normalized exercise name
 * @param {number} [limit=5] - Maximum number of recent exercises
 * @returns {Promise<Object>} - The API response with recent exercise history
 */
export const getRecentExercises = async (userId, exerciseName, limit = 5) => {
  return getExercises(userId, exerciseName, {
    limit,
    sortOrder: "desc",
  });
};

/**
 * Gets the count of unique exercises for a user
 * @param {string} userId - The user ID
 * @param {Object} [options] - Optional query parameters
 * @param {string} [options.discipline] - Filter by discipline (crossfit, powerlifting, etc.)
 * @returns {Promise<Object>} - The API response with count
 * Response: { count: number }
 */
export const getExercisesCount = async (userId, options = {}) => {
  const queryParams = new URLSearchParams();

  // Add optional filters
  if (options.discipline) queryParams.append("discipline", options.discipline);

  const path = `/users/${userId}/exercises/count${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const url = `${getApiUrl("")}${path}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getExercisesCount: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("getExercisesCount: API Error:", error);
    throw error;
  }
};
