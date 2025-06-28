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
