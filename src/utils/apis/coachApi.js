import { getApiUrl, authenticatedFetch } from './apiConfig';

/**
 * API service for Coach operations
 */

/**
 * Gets all coaches for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The API response with coaches array
 */
export const getCoaches = async (userId) => {
  const url = `${getApiUrl('')}/users/${userId}/coaches`;

  try {
    const response = await authenticatedFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('getCoaches: Error response:', errorText);
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('getCoaches: API Error:', error);
    throw error;
  }
};

/**
 * Gets a specific coach (full details)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @returns {Promise<Object>} - The API response with full coach details
 */
export const getCoach = async (userId, coachId) => {
  const url = `${getApiUrl('')}/users/${userId}/coaches/${coachId}`;

  try {
    const response = await authenticatedFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('getCoach: Error response:', errorText);
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('getCoach: API Error:', error);
    throw error;
  }
};

/**
 * Gets all available coach templates
 * @returns {Promise<Object>} - The API response with templates array
 */
export const getCoachTemplates = async () => {
  const response = await fetch(`${getApiUrl('')}/coach-templates`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Gets a specific coach template
 * @param {string} templateId - The template ID
 * @returns {Promise<Object>} - The API response with template details
 */
export const getCoachTemplate = async (templateId) => {
  const response = await fetch(`${getApiUrl('')}/coach-templates/${templateId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Creates a coach config from a template
 * @param {string} userId - The user ID
 * @param {string} templateId - The template ID
 * @returns {Promise<Object>} - The API response with new coach config
 */
export const createCoachFromTemplate = async (userId, templateId) => {
  const url = `${getApiUrl('')}/users/${userId}/coaches/from-template/${templateId}`;

  try {
    const response = await authenticatedFetch(url, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('createCoachFromTemplate: Error response:', errorText);
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('createCoachFromTemplate: API Error:', error);
    throw error;
  }
};
