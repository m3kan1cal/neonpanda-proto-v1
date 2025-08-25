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
  console.info('Coach templates loaded:', result);

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
  console.info('Coach template loaded:', result);

  return result;
};

/**
 * Creates a coach config from a template
 * @param {string} userId - The user ID
 * @param {string} templateId - The template ID
 * @returns {Promise<Object>} - The API response with new coach config
 */
export const createCoachFromTemplate = async (userId, templateId) => {
  const response = await fetch(`${getApiUrl('')}/users/${userId}/coaches/from-template/${templateId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.info('Coach created from template:', result);

  return result;
};
