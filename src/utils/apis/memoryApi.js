import { getApiUrl, authenticatedFetch } from './apiConfig';

/**
 * API service for Memory operations
 */

/**
 * Gets all memories for a user
 * @param {string} userId - The user ID
 * @param {Object} [options] - Optional query parameters
 * @param {string} [options.coachId] - Filter by coach ID (includes global memories)
 * @param {string} [options.memoryType] - Filter by memory type (preference, goal, constraint, instruction, context)
 * @param {string} [options.importance] - Filter by importance (high, medium, low)
 * @param {number} [options.limit] - Maximum number of results (default: 100)
 * @returns {Promise<Object>} - The API response with memories array
 */
export const getMemories = async (userId, options = {}) => {
  // Validate limit parameter
  if (options.limit !== undefined) {
    if (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 100) {
      throw new Error('limit must be a number between 1 and 100');
    }
  }

  // Build query parameters
  const params = new URLSearchParams();

  if (options.coachId) params.append('coachId', options.coachId);
  if (options.memoryType) params.append('memoryType', options.memoryType);
  if (options.importance) params.append('importance', options.importance);
  if (options.limit) params.append('limit', options.limit.toString());

  const queryString = params.toString();
  const url = `${getApiUrl('')}/users/${userId}/memories${queryString ? '?' + queryString : ''}`;

  console.info('getMemories: Making API call to:', url);
  console.info('getMemories: userId:', userId);
  console.info('getMemories: options:', options);
  console.info('getMemories: queryString:', queryString);

  const response = await authenticatedFetch(url, {
    method: 'GET',
  });

  console.info('getMemories: Response status:', response.status);
  console.info('getMemories: Response ok:', response.ok);

  if (!response.ok) {
    console.error('getMemories: API Error - Status:', response.status);

    // Try to get the specific error message from the response
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        console.error('getMemories: Specific error message:', errorMessage);
      }
    } catch (jsonError) {
      console.warn('getMemories: Could not parse error response as JSON');
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.info('getMemories: API Response:', result);
  console.info('getMemories: Memories loaded:', result);

  return result;
};

/**
 * Creates a new memory for a user
 * @param {string} userId - The user ID
 * @param {Object} memoryData - The memory data
 * @param {string} memoryData.content - The memory content
 * @param {string} [memoryData.coachId] - Optional coach ID (AI determines if memory should be coach-specific)
 * @returns {Promise<Object>} - The API response with the created memory (includes AI analysis)
 * @note Memory type and importance are automatically determined by AI
 */
export const createMemory = async (userId, memoryData) => {
  const url = `${getApiUrl('')}/users/${userId}/memories`;

  console.info('createMemory: Making API call to:', url);
  console.info('createMemory: userId:', userId);
  console.info('createMemory: memoryData:', memoryData);

  const requestBody = {
    content: memoryData.content,
    coachId: memoryData.coachId || null,
    // AI will determine memoryType and importance automatically
  };

  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  console.info('createMemory: Response status:', response.status);
  console.info('createMemory: Response ok:', response.ok);

  if (!response.ok) {
    console.error('createMemory: API Error - Status:', response.status);

    // Try to get the specific error message from the response
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        console.error('createMemory: Specific error message:', errorMessage);
      }
    } catch (jsonError) {
      console.warn('createMemory: Could not parse error response as JSON');
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.info('createMemory: API Response:', result);

  return result;
};

/**
 * Deletes a specific memory
 * @param {string} userId - The user ID
 * @param {string} memoryId - The memory ID
 * @returns {Promise<Object>} - The API response confirming deletion
 */
export const deleteMemory = async (userId, memoryId) => {
  const url = `${getApiUrl('')}/users/${userId}/memories/${memoryId}`;

  console.info('deleteMemory: Making API call to:', url);
  console.info('deleteMemory: userId:', userId);
  console.info('deleteMemory: memoryId:', memoryId);

  const response = await authenticatedFetch(url, {
    method: 'DELETE',
  });

  console.info('deleteMemory: Response status:', response.status);
  console.info('deleteMemory: Response ok:', response.ok);

  if (!response.ok) {
    console.error('deleteMemory: API Error - Status:', response.status);

    // Try to get the specific error message from the response
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        console.error('deleteMemory: Specific error message:', errorMessage);
      }
    } catch (jsonError) {
      console.warn('deleteMemory: Could not parse error response as JSON');
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.info('deleteMemory: API Response:', result);

  return result;
};
