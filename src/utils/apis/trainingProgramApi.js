import { getApiUrl, authenticatedFetch } from "./apiConfig.js";

/**
 * API service for Training Program operations
 */

/**
 * Lists training programs for a user with a specific coach
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {Object} [options] - Optional query parameters
 * @param {string} [options.status] - Filter by status (active, paused, completed, archived)
 * @param {number} [options.limit] - Maximum number of results (default: 20)
 * @param {string} [options.sortBy] - Sort by field (startDate, name)
 * @param {string} [options.sortOrder] - Sort order: 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<Object>} - The API response with programs array
 */
export const getTrainingPrograms = async (userId, coachId, options = {}) => {
  // Build query parameters
  const params = new URLSearchParams();

  if (options.status) params.append("status", options.status);
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.sortBy) params.append("sortBy", options.sortBy);
  if (options.sortOrder) params.append("sortOrder", options.sortOrder);

  const queryString = params.toString();
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs${queryString ? "?" + queryString : ""}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getTrainingPrograms: Error response:", errorText);

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
    console.error("getTrainingPrograms: Exception:", error);
    throw error;
  }
};

/**
 * Gets a specific training program by ID
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @returns {Promise<Object>} - The API response with program details
 */
export const getTrainingProgram = async (userId, coachId, programId) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getTrainingProgram: Error response:", errorText);

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
    console.error("getTrainingProgram: Exception:", error);
    throw error;
  }
};

/**
 * Gets workout templates for a training program
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @param {Object} [options] - Optional query parameters
 * @param {boolean} [options.today] - Get today's workout templates
 * @param {number} [options.day] - Get templates for specific day number
 * @returns {Promise<Object>} - The API response with workout templates
 */
export const getWorkoutTemplates = async (userId, coachId, programId, options = {}) => {
  // Build query parameters
  const params = new URLSearchParams();

  if (options.today) params.append('today', 'true');
  if (options.day !== undefined) params.append('day', options.day.toString());

  const queryString = params.toString();
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}/templates${queryString ? "?" + queryString : ""}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getWorkoutTemplates: Error response:", errorText);

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
    console.error("getWorkoutTemplates: Exception:", error);
    throw error;
  }
};

/**
 * Updates a training program (pause, resume, complete, archive, etc.)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @param {Object} body - The update payload
 * @param {string} body.action - The action to perform (pause, resume, complete, archive)
 * @returns {Promise<Object>} - The API response with updated program
 */
export const updateTrainingProgram = async (userId, coachId, programId, body) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("updateTrainingProgram: Error response:", errorText);

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
    console.error("updateTrainingProgram: Exception:", error);
    throw error;
  }
};

/**
 * Logs a workout from a template (marks it as completed with actual performance data)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @param {string} templateId - The workout template ID
 * @param {Object} workoutData - The workout data to log
 * @param {boolean} [workoutData.useTemplateAsIs] - If true, log template data without modifications
 * @param {Object} [workoutData.performedWorkout] - If provided, actual performed workout data (overrides template)
 * @param {string} [workoutData.notes] - User's notes about the workout
 * @returns {Promise<Object>} - The API response with logged workout
 */
export const logWorkout = async (userId, coachId, programId, templateId, workoutData) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}/templates/${templateId}/log`;

  try {
    const response = await authenticatedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workoutData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("logWorkout: Error response:", errorText);

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
    console.error("logWorkout: Exception:", error);
    throw error;
  }
};

/**
 * Skips a workout template (marks it as skipped with optional reason)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @param {string} templateId - The workout template ID
 * @param {Object} [data] - Optional data
 * @param {string} [data.skipReason] - Reason for skipping the workout
 * @returns {Promise<Object>} - The API response with skipped template
 */
export const skipWorkout = async (userId, coachId, programId, templateId, data = {}) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}/templates/${templateId}/skip`;

  try {
    const response = await authenticatedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("skipWorkout: Error response:", errorText);

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
    console.error("skipWorkout: Exception:", error);
    throw error;
  }
};

/**
 * Creates a new training program (manual creation, not via conversation)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {Object} programData - The program data
 * @returns {Promise<Object>} - The API response with created program
 */
export const createTrainingProgram = async (userId, coachId, programData) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs`;

  try {
    const response = await authenticatedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(programData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("createTrainingProgram: Error response:", errorText);

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
    console.error("createTrainingProgram: Exception:", error);
    throw error;
  }
};

