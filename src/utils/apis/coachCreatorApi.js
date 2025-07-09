import { getApiUrl } from './apiConfig';

/**
 * API service for Coach Creator operations
 */

/**
 * Creates a new coach creator session
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The API response with sessionId and initialMessage
 */
export const createCoachCreatorSession = async (userId) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/coach-creator-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Coach creator session created:', result);

  return result;
};

/**
 * Updates a coach creator session with user response
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @param {string} userResponse - The user's response text
 * @returns {Promise<Object>} - The API response with aiResponse, isComplete, etc.
 */
export const updateCoachCreatorSession = async (userId, sessionId, userResponse) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userResponse
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Coach creator session updated:', result);

  return result;
};

/**
 * Gets an existing coach creator session
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The session data with conversation history
 */
export const getCoachCreatorSession = async (userId, sessionId) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Session not found or expired');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Coach creator session loaded:', result);

  return result;
};
