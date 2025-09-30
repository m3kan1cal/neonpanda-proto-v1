import { getApiUrl, authenticatedFetch } from './apiConfig';

/**
 * API service for User Profile operations
 */

/**
 * Gets user profile data from DynamoDB
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The API response with user profile data
 */
export const getUserProfile = async (userId) => {
  const url = `${getApiUrl('')}/users/${userId}/profile`;

  try {
    const response = await authenticatedFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('getUserProfile: Error response:', errorText);
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
    console.error('getUserProfile: API Error:', error);
    throw error;
  }
};

/**
 * Updates user profile data in DynamoDB
 * @param {string} userId - The user ID
 * @param {Object} profileData - The profile data to update
 * @param {string} [profileData.firstName] - User's first name
 * @param {string} [profileData.lastName] - User's last name
 * @param {string} [profileData.displayName] - User's display name
 * @param {string} [profileData.nickname] - User's nickname
 * @param {string} [profileData.username] - User's username
 * @param {string} [profileData.timezone] - User's timezone preference
 * @returns {Promise<Object>} - The API response with updated profile
 */
export const updateUserProfile = async (userId, profileData) => {
  const url = `${getApiUrl('')}/users/${userId}/profile`;

  try {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('updateUserProfile: Error response:', errorText);
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
    console.error('updateUserProfile: API Error:', error);
    throw error;
  }
};
