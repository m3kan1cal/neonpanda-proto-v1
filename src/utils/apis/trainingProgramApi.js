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
export const listTrainingPrograms = async (userId, coachId, options = {}) => {
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
      console.error("listTrainingPrograms: Error response:", errorText);

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
    console.error("listTrainingPrograms: Exception:", error);
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
 * Gets today's workout template(s) for a training program
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @returns {Promise<Object>} - The API response with today's workout templates
 */
export const getTodaysWorkout = async (userId, coachId, programId) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}/templates?today=true`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getTodaysWorkout: Error response:", errorText);

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
    console.error("getTodaysWorkout: Exception:", error);
    throw error;
  }
};

/**
 * Gets workout templates for a specific day in a training program
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @param {number} day - The day number
 * @returns {Promise<Object>} - The API response with workout templates for the day
 */
export const getWorkoutTemplatesForDay = async (userId, coachId, programId, day) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}/templates?day=${day}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getWorkoutTemplatesForDay: Error response:", errorText);

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
    console.error("getWorkoutTemplatesForDay: Exception:", error);
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

