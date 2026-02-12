import { getApiUrl } from './apiConfig';
import { logger } from "../logger";

/**
 * API service for Contact Form operations
 */

/**
 * Submits a contact form
 * @param {Object} formData - The contact form data
 * @param {string} formData.name - The sender's name
 * @param {string} formData.email - The sender's email
 * @param {string} formData.subject - The message subject
 * @param {string} formData.message - The message content
 * @returns {Promise<Object>} - The API response
 */
export const submitContactForm = async (formData) => {
  const url = `${getApiUrl('')}/contact`;

  logger.info('submitContactForm: Making API call to:', url);
  logger.info('submitContactForm: formData:', formData);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  logger.info('submitContactForm: Response status:', response.status);
  logger.info('submitContactForm: Response ok:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('submitContactForm: Error response:', errorText);

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
  logger.info('submitContactForm: Success response:', result);

  return result;
};
