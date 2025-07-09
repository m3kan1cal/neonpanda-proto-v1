import { getApiUrl } from './apiConfig';

/**
 * API service for Coach operations
 */

/**
 * Gets all coaches for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The API response with coaches array
 */
export const getCoaches = async (userId) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/coaches`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Coaches loaded:', result);

  return result;
};

/**
 * Gets a specific coach (full details)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @returns {Promise<Object>} - The API response with full coach details
 */
export const getCoach = async (userId, coachId) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/coaches/${coachId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Coach loaded:', result);

  return result;
};
