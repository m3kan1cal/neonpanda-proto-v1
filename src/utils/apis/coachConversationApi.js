import { getApiUrl, authenticatedFetch, isStreamingEnabled } from "./apiConfig";
import { handleStreamingApiRequest } from "./streamingApiHelper";
import { streamCoachConversationLambda } from "./streamingLambdaApi";
import { CONVERSATION_MODES } from "../../constants/conversationModes";

/**
 * API service for Coach Conversation operations
 */

/**
 * Creates a new coach conversation
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} title - The conversation title
 * @param {string} [initialMessage] - Optional initial message to start the conversation
 * @param {string} [mode] - Conversation mode ('chat' or 'build'), defaults to 'chat'
 * @returns {Promise<Object>} - The API response with conversation details
 */
export const createCoachConversation = async (
  userId,
  coachId,
  title,
  initialMessage = null,
  mode = CONVERSATION_MODES.CHAT
) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations`;
  const requestBody = {
    title,
    mode // Always include mode (defaults to 'chat')
  };

  // Add initial message if provided
  if (initialMessage && initialMessage.trim()) {
    requestBody.initialMessage = initialMessage.trim();
  }

  const response = await authenticatedFetch(url, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Gets a specific coach conversation
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Object>} - The conversation data with message history
 */
export const getCoachConversation = async (userId, coachId, conversationId) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations/${conversationId}`;
  const response = await authenticatedFetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Conversation not found");
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Sends a message to a coach conversation
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @param {string} userResponse - The user's message/response
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @returns {Promise<Object>} - The API response with user message and coach reply
 */
export const sendCoachConversationMessage = async (
  userId,
  coachId,
  conversationId,
  userResponse,
  imageS3Keys = []
) => {
  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

  try {
    const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations/${conversationId}/send-message`;

    // Build request body
    const body = {
      userResponse,
      messageTimestamp: new Date().toISOString(), // When user typed the message
    };

    // Add imageS3Keys if present
    if (imageS3Keys && imageS3Keys.length > 0) {
      body.imageS3Keys = imageS3Keys;
    }

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Conversation not found");
      }
      if (response.status === 503) {
        throw new Error(
          "Service temporarily unavailable - request took too long"
        );
      }
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("❌ Request timed out after 45 seconds");
      throw new Error(
        "Request timed out - the server is taking too long to respond"
      );
    }

    console.error("❌ Error sending coach conversation message:", error);
    throw error;
  }
};

/**
 * Streams a coach conversation message
 * Fallback chain: Lambda Function URL → API Gateway streaming → non-streaming
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @param {string} userResponse - The user's message/response
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @returns {AsyncGenerator} - Stream of message chunks
 */
export async function* streamCoachConversation(
  userId,
  coachId,
  conversationId,
  userResponse,
  imageS3Keys = []
) {
  // Try Lambda Function URL first if enabled
  if (isStreamingEnabled("coachConversation")) {
    try {
      console.info(
        "🚀 Attempting Lambda Function URL streaming for coach conversation"
      );
      yield* streamCoachConversationLambda(
        userId,
        coachId,
        conversationId,
        userResponse,
        imageS3Keys
      );
      return; // Success - exit
    } catch (lambdaError) {
      console.error(
        "❌ Lambda Function URL streaming failed (fallback DISABLED for debugging):",
        lambdaError
      );
      // TEMPORARY: Disable fallback to isolate Lambda streaming issues
      throw new Error(`Lambda streaming failed: ${lambdaError.message}`);
    }
  }

  // FALLBACK DISABLED FOR DEBUGGING - this code won't execute while debugging Lambda streaming
  // Fallback to API Gateway streaming
  console.info(
    "🔄 Using API Gateway fallback for coach conversation streaming"
  );
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations/${conversationId}/send-message?stream=true`;
  const requestBody = {
    userResponse,
    messageTimestamp: new Date().toISOString(),
  };

  // Add imageS3Keys if present
  if (imageS3Keys && imageS3Keys.length > 0) {
    requestBody.imageS3Keys = imageS3Keys;
  }

  yield* handleStreamingApiRequest(url, requestBody, {
    method: "POST",
    fallbackFunction: sendCoachConversationMessage,
    fallbackParams: [
      userId,
      coachId,
      conversationId,
      userResponse,
      imageS3Keys,
    ],
    operationName: "coach conversation message",
    errorMessages: {
      notFound: "Conversation not found",
      serviceUnavailable:
        "Service temporarily unavailable - request took too long",
    },
  });
}

/**
 * Updates coach conversation metadata (title, tags, isActive)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @param {Object} metadata - The metadata to update
 * @param {string} [metadata.title] - The conversation title
 * @param {string[]} [metadata.tags] - The conversation tags
 * @param {boolean} [metadata.isActive] - Whether the conversation is active
 * @returns {Promise<Object>} - The API response with updated conversation
 */
export const updateCoachConversation = async (
  userId,
  coachId,
  conversationId,
  metadata
) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations/${conversationId}`;
  const response = await authenticatedFetch(url, {
    method: "PUT",

    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Conversation not found");
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Gets all coach conversations for a specific user and coach
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @returns {Promise<Object>} - The API response with conversations array
 */
export const getCoachConversations = async (userId, coachId) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations`;
  const response = await authenticatedFetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();

  return result;
};

/**
 * Gets conversation count for a specific user and coach
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @returns {Promise<Object>} - The API response with conversation count
 */
export const getCoachConversationsCount = async (userId, coachId) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations/count`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = "Failed to get conversation count";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting conversation count:", error);
    throw error;
  }
};

/**
 * Deletes a coach conversation
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Object>} - The API response object
 */
export const deleteCoachConversation = async (
  userId,
  coachId,
  conversationId
) => {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/conversations/${conversationId}`;

  try {
    const response = await authenticatedFetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = "Failed to delete conversation";

      if (response.status === 400) {
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.message || "Bad request - invalid parameters";
        } catch (parseError) {
          errorMessage = "Bad request - invalid parameters";
        }
      } else if (response.status === 404) {
        errorMessage = "Conversation not found";
      } else {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};
