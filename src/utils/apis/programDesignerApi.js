import { authenticatedFetch, getApiUrl } from "./apiConfig";
import { streamProgramDesignerSessionLambda } from "./streamingLambdaApi";
import {
  sendCoachConversationMessage,
  updateCoachConversation,
  getCoachConversation,
  deleteCoachConversation,
} from "./coachConversationApi";
import { CONVERSATION_MODES } from "../../constants/conversationModes";

/**
 * API service for Program Designer operations
 * Reuses most coach conversation APIs but with dedicated streaming endpoint for program designer sessions
 */

/**
 * Creates a new program designer session
 * This mirrors the CoachCreator flow - creates a ProgramDesignerSession entity.
 * The backend Lambda (stream-program-designer-session) will create the conversation when the first message is sent.
 *
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @returns {Promise<Object>} - The API response with sessionId
 */
export const createProgramDesignerSession = async (userId, coachId) => {
  const url = `${getApiUrl("")}/users/${userId}/program-designer-sessions`;
  const response = await authenticatedFetch(url, {
    method: "POST",
    body: JSON.stringify({ coachId }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  return result;
};

/**
 * Streams a program designer session message using Lambda Function URL
 * @param {string} userId - The user ID
 * @param {string} sessionId - The program designer session ID
 * @param {string} userResponse - The user's message/response
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @returns {AsyncGenerator} - Stream of SSE events
 */
export async function* streamProgramDesign(
  userId,
  sessionId,
  userResponse,
  imageS3Keys = [],
) {
  // Use dedicated program designer session Lambda streaming endpoint
  yield* streamProgramDesignerSessionLambda(
    userId,
    sessionId,
    userResponse,
    imageS3Keys,
  );
}

/**
 * Get a specific program designer session
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The session data
 */
export const getProgramDesignerSession = async (userId, sessionId) => {
  if (!userId || !sessionId) {
    throw new Error("User ID and Session ID are required");
  }

  const url = `${getApiUrl("")}/users/${userId}/program-designer-sessions/${sessionId}`;
  const response = await authenticatedFetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Program designer session not found");
    }
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get program designer sessions for a user
 * @param {string} userId - The user ID
 * @param {Object} options - Filter options (isComplete, limit, etc.)
 * @returns {Promise<Object>} - The sessions list
 */
export const getProgramDesignerSessions = async (userId, options = {}) => {
  // Construct query string from options
  const queryParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });

  const url = `${getApiUrl("")}/users/${userId}/program-designer-sessions?${queryParams.toString()}`;
  const response = await authenticatedFetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { sessions: [], count: 0 };
    }
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
};

/**
 * Delete a program designer session
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteProgramDesignerSession = async (userId, sessionId) => {
  const url = `${getApiUrl("")}/users/${userId}/program-designer-sessions/${sessionId}`;
  const response = await authenticatedFetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
};

/**
 * Retry building a program from a session
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The retry result
 */
export const retryProgramBuild = async (userId, sessionId) => {
  const url = `${getApiUrl("")}/users/${userId}/program-designer-sessions/${sessionId}/retry`;
  const response = await authenticatedFetch(url, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
};

// Re-export common conversation operations
export {
  getCoachConversation as getProgramDesignerConversation,
  sendCoachConversationMessage as sendProgramDesignerMessage,
  updateCoachConversation as updateProgramDesignerConversation,
  deleteCoachConversation as deleteProgramDesignerConversation,
};
