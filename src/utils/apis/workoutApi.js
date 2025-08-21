import { getApiUrl } from './apiConfig';

/**
 * API service for Workout Session operations
 */

/**
 * Gets all workout sessions for a user
 * @param {string} userId - The user ID
 * @param {Object} [options] - Optional query parameters
 * @param {string} [options.fromDate] - Filter workouts from this date (ISO string)
 * @param {string} [options.toDate] - Filter workouts to this date (ISO string)
 * @param {string} [options.discipline] - Filter by discipline (crossfit, powerlifting, etc.)
 * @param {string} [options.workoutType] - Filter by workout type
 * @param {string} [options.location] - Filter by location
 * @param {string} [options.coachId] - Filter by coach ID
 * @param {number} [options.minConfidence] - Filter by minimum confidence score
 * @param {number} [options.limit] - Maximum number of results (default: 20)
 * @param {number} [options.offset] - Number of results to skip (default: 0)
 * @param {string} [options.sortBy] - Sort by field (completedAt, confidence, workoutName)
 * @param {string} [options.sortOrder] - Sort order: 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<Object>} - The API response with workouts array
 */
export const getWorkouts = async (userId, options = {}) => {
  // Validate limit parameter
  if (options.limit !== undefined) {
    if (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 100) {
      throw new Error('limit must be a number between 1 and 100');
    }
  }

  // Build query parameters
  const params = new URLSearchParams();

  if (options.fromDate) params.append('fromDate', options.fromDate);
  if (options.toDate) params.append('toDate', options.toDate);
  if (options.discipline) params.append('discipline', options.discipline);
  if (options.workoutType) params.append('workoutType', options.workoutType);
  if (options.location) params.append('location', options.location);
  if (options.coachId) params.append('coachId', options.coachId);
  if (options.minConfidence) params.append('minConfidence', options.minConfidence.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const queryString = params.toString();
  const url = `${getApiUrl('')}/users/${userId}/workouts${queryString ? '?' + queryString : ''}`;

  console.info('getWorkouts: Making API call to:', url);
  console.info('getWorkouts: userId:', userId);
  console.info('getWorkouts: options:', options);
  console.info('getWorkouts: queryString:', queryString);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.info('getWorkouts: Response status:', response.status);
  console.info('getWorkouts: Response ok:', response.ok);

  if (!response.ok) {
    console.error('getWorkouts: API Error - Status:', response.status);

    // Try to get the specific error message from the response
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        console.error('getWorkouts: Specific error message:', errorMessage);
      }
    } catch (jsonError) {
      console.warn('getWorkouts: Could not parse error response as JSON');
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.info('getWorkouts: API Response:', result);
  console.info('getWorkouts: Workouts loaded:', result);

  return result;
};

/**
 * Gets a specific workout with full details
 * @param {string} userId - The user ID
 * @param {string} workoutId - The workout ID
 * @returns {Promise<Object>} - The API response with full workout details
 */
export const getWorkout = async (userId, workoutId) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/workouts/${workoutId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Workout not found');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Workout loaded:', result);

  return result;
};

/**
 * Updates a workout session
 * @param {string} userId - The user ID
 * @param {string} workoutId - The workout ID
 * @param {Object} updates - The workout updates
 * @param {Object} [updates.workoutData] - Updated workout data
 * @param {Object} [updates.extractionMetadata] - Updated extraction metadata
 * @param {string} [updates.extractionMetadata.reviewedBy] - User who reviewed the workout
 * @param {string} [updates.extractionMetadata.reviewedAt] - Review timestamp
 * @param {number} [updates.extractionMetadata.confidence] - Updated confidence score
 * @returns {Promise<Object>} - The API response with updated workout session
 */
export const updateWorkout = async (userId, workoutId, updates) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/workouts/${workoutId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Workout not found');
    }
    if (response.status === 400) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Bad request');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Workout updated:', result);

  return result;
};

/**
 * Gets workout sessions for a specific date range (convenience function)
 * @param {string} userId - The user ID
 * @param {Date} startDate - Start date for the range
 * @param {Date} endDate - End date for the range
 * @returns {Promise<Object>} - The API response with workout sessions array
 */
export const getWorkoutsByDateRange = async (userId, startDate, endDate) => {
  return getWorkouts(userId, {
    fromDate: startDate.toISOString(),
    toDate: endDate.toISOString(),
    sortBy: 'completedAt',
    sortOrder: 'desc'  // Most recent first
  });
};

/**
 * Gets recent workout sessions (convenience function)
 * @param {string} userId - The user ID
 * @param {number} [limit=10] - Maximum number of recent workouts
 * @returns {Promise<Object>} - The API response with recent workout sessions
 */
export const getRecentWorkouts = async (userId, limit = 10) => {
  return getWorkouts(userId, {
    limit,
    sortBy: 'completedAt',
    sortOrder: 'desc'  // Most recent first
  });
};

/**
 * Gets workout sessions by discipline (convenience function)
 * @param {string} userId - The user ID
 * @param {string} discipline - The discipline to filter by
 * @param {number} [limit=20] - Maximum number of workouts
 * @returns {Promise<Object>} - The API response with filtered workout sessions
 */
export const getWorkoutsByDiscipline = async (userId, discipline, limit = 20) => {
  return getWorkouts(userId, {
    discipline,
    limit,
    sortBy: 'completedAt',
    sortOrder: 'desc'  // Most recent first
  });
};

// Get workout sessions count for a user
export async function getWorkoutsCount(userId, options = {}) {
  console.info('Making API call to get workout sessions count for user:', userId);

  const queryParams = new URLSearchParams();

  // Add optional filters
  if (options.fromDate) queryParams.append('fromDate', options.fromDate);
  if (options.toDate) queryParams.append('toDate', options.toDate);
  if (options.discipline) queryParams.append('discipline', options.discipline);
  if (options.workoutType) queryParams.append('workoutType', options.workoutType);
  if (options.location) queryParams.append('location', options.location);
  if (options.coachId) queryParams.append('coachId', options.coachId);
  if (options.minConfidence) queryParams.append('minConfidence', options.minConfidence.toString());

  const url = `${getApiUrl('')}/users/${userId}/workouts/count${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to get workout sessions count';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.info('Successfully retrieved workout sessions count:', data);
    return data;
  } catch (error) {
    console.error('Error getting workout sessions count:', error);
    throw error;
  }
}

/**
 * Gets the count of unique training days for a user
 * @param {string} userId - The user ID
 * @param {Object} [options] - Optional query parameters
 * @param {string} [options.fromDate] - Filter workouts from this date (ISO string)
 * @param {string} [options.toDate] - Filter workouts to this date (ISO string)
 * @param {string} [options.discipline] - Filter by discipline (crossfit, powerlifting, etc.)
 * @param {string} [options.workoutType] - Filter by workout type
 * @param {string} [options.location] - Filter by location
 * @param {string} [options.coachId] - Filter by coach ID
 * @param {number} [options.minConfidence] - Filter by minimum confidence score
 * @returns {Promise<number>} - The number of unique training days
 */
export const getTrainingDaysCount = async (userId, options = {}) => {
  console.info('getTrainingDaysCount: Calculating training days for user:', userId);
  console.info('getTrainingDaysCount: options:', options);

  try {
    // Get all workouts with the specified filters, but no limit to ensure we get all data
    const result = await getWorkouts(userId, {
      ...options,
      limit: 100, // Get a reasonable number of workouts
      sortBy: 'completedAt',
      sortOrder: 'desc'
    });

    const workouts = result.workouts || [];
    console.info('getTrainingDaysCount: Retrieved workouts:', workouts.length);

    if (workouts.length === 0) {
      return 0;
    }

    // Extract unique dates from completedAt timestamps
    const uniqueDates = new Set();

    workouts.forEach(workout => {
      if (workout.completedAt) {
        try {
          const date = new Date(workout.completedAt);
          // Convert to YYYY-MM-DD format to ensure we're counting calendar days
          const dateString = date.toISOString().split('T')[0];
          uniqueDates.add(dateString);
        } catch (error) {
          console.warn('getTrainingDaysCount: Invalid date format for workout:', workout.workoutId, workout.completedAt);
        }
      }
    });

    const trainingDaysCount = uniqueDates.size;
    console.info('getTrainingDaysCount: Unique training days found:', trainingDaysCount);
    console.info('getTrainingDaysCount: Unique dates:', Array.from(uniqueDates).sort());

    return trainingDaysCount;

  } catch (error) {
    console.error('getTrainingDaysCount: Error calculating training days:', error);
    throw error;
  }
};

/**
 * Deletes a workout session
 * @param {string} userId - The user ID
 * @param {string} workoutId - The workout ID
 * @returns {Promise<Object>} - The API response
 */
export const deleteWorkout = async (userId, workoutId) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/workouts/${workoutId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Workout not found');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Workout deleted:', result);

  return result;
};