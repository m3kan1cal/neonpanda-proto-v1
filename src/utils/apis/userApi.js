import { getApiUrl } from './apiConfig';

/**
 * API service for User operations (registration, availability checks, etc.)
 */

/**
 * Check if a username or email is available for registration
 * @param {string} type - The type to check ('username' or 'email')
 * @param {string} value - The value to check
 * @returns {Promise<Object>} - The API response with availability data
 * @example
 * const result = await checkUserAvailability('email', 'test@example.com');
 * // Returns: { available: boolean, type: string, value: string, existsInCognito: boolean, existsInDynamoDB: boolean, message: string }
 */
export const checkUserAvailability = async (type, value) => {
  const url = `${getApiUrl('')}/users/check-availability?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`;

  try {
    // This is a PUBLIC endpoint - no authentication required
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('checkUserAvailability: Error response:', errorText);
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
    console.error('checkUserAvailability: API Error:', error);
    throw error;
  }
};
