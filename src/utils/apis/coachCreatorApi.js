import { getApiUrl, authenticatedFetch, isStreamingEnabled } from './apiConfig';
import { handleStreamingApiRequest } from './streamingApiHelper';
import { streamCoachCreatorSessionLambda } from './streamingLambdaApi';
import { logger } from "../logger";

/**
 * API service for Coach Creator operations
 */

/**
 * Creates a new coach creator session
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The API response with sessionId and initialMessage
 */
export const createCoachCreatorSession = async (userId) => {
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions`;
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Updates a coach creator session with user response
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @param {string} userResponse - The user's response text
 * @param {string[]} [imageS3Keys] - Optional array of S3 keys for uploaded images
 * @returns {Promise<Object>} - The API response with aiResponse, isComplete, etc.
 */
export const updateCoachCreatorSession = async (userId, sessionId, userResponse, imageS3Keys = []) => {
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}`;
  const requestBody = {
    userResponse,
    messageTimestamp: new Date().toISOString() // Add timestamp for consistency
  };

  if (imageS3Keys && imageS3Keys.length > 0) {
    requestBody.imageS3Keys = imageS3Keys;
  }

  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Streams a coach creator session update
 * Fallback chain: Lambda Function URL → API Gateway streaming → non-streaming
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @param {string} userResponse - The user's response text
 * @param {string[]} [imageS3Keys] - Optional array of S3 keys for uploaded images
 * @returns {AsyncGenerator} - Stream of response chunks
 */
export async function* streamCoachCreatorSession(userId, sessionId, userResponse, imageS3Keys = []) {
  // Try Lambda Function URL first if enabled
  if (isStreamingEnabled('coachCreatorSession')) {
    try {
      yield* streamCoachCreatorSessionLambda(userId, sessionId, userResponse, imageS3Keys);
      return; // Success - exit
    } catch (lambdaError) {
      logger.warn('⚠️ Lambda Function URL streaming failed, falling back to API Gateway:', lambdaError);
      // Continue to API Gateway fallback
    }
  }

  // Fallback to API Gateway streaming (existing code)
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}?stream=true`;
  const requestBody = {
    userResponse,
    messageTimestamp: new Date().toISOString()
  };

  if (imageS3Keys && imageS3Keys.length > 0) {
    requestBody.imageS3Keys = imageS3Keys;
  }

  yield* handleStreamingApiRequest(url, requestBody, {
    method: 'PUT',
    fallbackFunction: updateCoachCreatorSession,
    fallbackParams: [userId, sessionId, userResponse, imageS3Keys],
    operationName: 'coach creator session update',
    errorMessages: {
      notFound: 'Session not found or expired',
      serviceUnavailable: 'Service temporarily unavailable - request took too long'
    }
  });
}

/**
 * Gets an existing coach creator session
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The session data with conversation history
 */
export const getCoachCreatorSession = async (userId, sessionId) => {
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}`;
  const response = await authenticatedFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Session not found or expired');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Gets all coach creator sessions for a user
 * @param {string} userId - The user ID
 * @param {Object} options - Optional filters
 * @param {boolean} options.isComplete - Filter by completion status
 * @param {number} options.limit - Limit number of results
 * @returns {Promise<Object>} - Array of session summaries
 */
export const getCoachCreatorSessions = async (userId, options = {}) => {
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions`;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (options.isComplete !== undefined) {
    queryParams.set('isComplete', options.isComplete.toString());
  }
  if (options.limit) {
    queryParams.set('limit', options.limit.toString());
  }
  if (options.sortBy) {
    queryParams.set('sortBy', options.sortBy);
  }
  if (options.sortOrder) {
    queryParams.set('sortOrder', options.sortOrder);
  }

  const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

  const response = await authenticatedFetch(fullUrl, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  return result;
};

/**
 * Deletes a coach creator session
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The API response confirming deletion
 */
export const deleteCoachCreatorSession = async (userId, sessionId) => {
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}`;
  const response = await authenticatedFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Coach creator session not found');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Gets the coach config generation status for a completed session
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The status response with status, message, and optional error
 */
export const getCoachConfigStatus = async (userId, sessionId) => {
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}/config-status`;
  const response = await authenticatedFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Session not found');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  return result;
};

