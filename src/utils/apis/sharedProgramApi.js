/**
 * Shared Program API Wrapper
 *
 * API functions for program sharing feature:
 * - Creating shareable links
 * - Previewing shared programs (public)
 * - Copying shared programs to user accounts
 * - Managing user's shared programs
 */

import {
  getApiUrl,
  authenticatedFetch,
  requireValidUserId,
} from "./apiConfig.js";

/**
 * Create a shareable link for an active or completed program
 * @param {string} userId - The user ID
 * @param {string} programId - The program ID to share
 * @param {string} coachId - The coach ID associated with the program
 * @param {Object} options - Optional settings
 * @param {AbortSignal} options.signal - AbortSignal to cancel the request
 * @returns {Promise<Object>} - The share response with sharedProgramId and shareUrl
 */
export async function createSharedProgram(
  userId,
  programId,
  coachId,
  { signal } = {},
) {
  requireValidUserId(userId, "createSharedProgram");
  const url = `${getApiUrl("")}/users/${userId}/programs/${programId}/share`;

  try {
    const response = await authenticatedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coachId }),
      signal, // Pass AbortSignal to cancel request on cleanup
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("createSharedProgram: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // Don't log AbortErrors - these are expected during cleanup
    if (error.name !== "AbortError") {
      console.error("createSharedProgram: Exception:", error);
    }
    throw error;
  }
}

/**
 * Get a shared program by ID (PUBLIC - no auth required)
 * @param {string} sharedProgramId - The shared program ID
 * @param {Object} options - Optional settings
 * @param {AbortSignal} options.signal - AbortSignal to cancel the request
 * @returns {Promise<Object>} - The shared program data
 */
export async function getSharedProgram(sharedProgramId, { signal } = {}) {
  // Public endpoint - no auth required
  const url = `${getApiUrl("")}/shared-programs/${sharedProgramId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal, // Pass AbortSignal to cancel request on cleanup
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getSharedProgram: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // Don't log AbortErrors - these are expected during cleanup
    if (error.name !== "AbortError") {
      console.error("getSharedProgram: Exception:", error);
    }
    throw error;
  }
}

/**
 * Query all shared programs for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Object with sharedPrograms array and counts
 */
export async function querySharedPrograms(userId) {
  requireValidUserId(userId, "querySharedPrograms");
  const url = `${getApiUrl("")}/users/${userId}/shared-programs`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("querySharedPrograms: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("querySharedPrograms: Exception:", error);
    throw error;
  }
}

/**
 * Deactivate (unshare) a shared program
 * @param {string} userId - The user ID
 * @param {string} sharedProgramId - The shared program ID to deactivate
 * @returns {Promise<Object>} - Success response
 */
export async function deactivateSharedProgram(userId, sharedProgramId) {
  requireValidUserId(userId, "deactivateSharedProgram");
  const url = `${getApiUrl("")}/users/${userId}/shared-programs/${sharedProgramId}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("deactivateSharedProgram: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      if (response.status === 404) {
        throw new Error("Shared program not found");
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("deactivateSharedProgram: Exception:", error);
    throw error;
  }
}

/**
 * Copy a shared program to user's account (instant copy)
 * @param {string} userId - The user ID
 * @param {string} sharedProgramId - The shared program ID to copy
 * @param {string} coachId - The coach ID to associate with the copied program
 * @returns {Promise<Object>} - The new program info { programId, programName, coachId, coachName }
 */
export async function copySharedProgram(userId, sharedProgramId, coachId) {
  requireValidUserId(userId, "copySharedProgram");
  const url = `${getApiUrl("")}/users/${userId}/shared-programs/${sharedProgramId}/copy`;

  try {
    const response = await authenticatedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coachId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("copySharedProgram: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      if (response.status === 404) {
        throw new Error("Shared program not found");
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("copySharedProgram: Exception:", error);
    throw error;
  }
}

/**
 * Update program metadata (used to mark adaptation as reviewed)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @param {Object} metadata - Metadata updates to apply
 * @returns {Promise<Object>} - Updated program
 */
export async function updateProgramMetadata(
  userId,
  coachId,
  programId,
  metadata,
) {
  requireValidUserId(userId, "updateProgramMetadata");
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}`;

  try {
    // Use existing program update endpoint with partial metadata update
    const response = await authenticatedFetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("updateProgramMetadata: Error response:", errorText);

      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage =
          errorData.error ||
          errorData.message ||
          `API Error: ${response.status}`;
      } catch (parseError) {
        errorMessage = `API Error: ${response.status}`;
      }

      if (response.status === 404) {
        throw new Error("Program not found");
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("updateProgramMetadata: Exception:", error);
    throw error;
  }
}
