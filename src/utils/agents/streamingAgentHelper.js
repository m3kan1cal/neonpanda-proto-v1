import { logger } from "../logger";
/**
 * Smaller, focused streaming helpers for agent classes
 * Each function handles a specific aspect of streaming without managing complex state
 */

/**
 * Processes streaming chunks and delegates to handlers
 * @param {AsyncGenerator} messageStream - The streaming API response
 * @param {Function} onChunk - Called for each content chunk (chunk)
 * @param {Function} onContextual - Called for contextual updates (chunk) - optional
 * @param {Function} onMetadata - Called for early metadata (chunk) - optional
 * @param {Function} onSuggestion - Called for suggestion events (chunk) - optional
 * @param {Function} onComplete - Called when streaming completes (chunk)
 * @param {Function} onFallback - Called for fallback response (data)
 * @param {Function} onError - Called for errors (errorMessage)
 * @returns {Promise} - Result from the appropriate handler
 */
export async function processStreamingChunks(
  messageStream,
  {
    onChunk,
    onContextual,
    onMetadata,
    onSuggestion,
    onComplete,
    onFallback,
    onError,
  },
) {
  try {
    for await (const chunk of messageStream) {
      if (chunk.type === "start") {
        // Start event - streaming has begun, no action needed
        continue;
      } else if (chunk.type === "contextual") {
        // Contextual update - ephemeral UX feedback, not saved to conversation
        if (onContextual) {
          await onContextual(chunk.content, chunk.stage);
        }
      } else if (chunk.type === "metadata") {
        // Metadata event - early message configuration (mode, suggestProgramDesign flag, etc.) sent before AI streaming
        if (onMetadata) {
          await onMetadata(chunk);
        }
      } else if (chunk.type === "chunk") {
        await onChunk(chunk.content);
      } else if (chunk.type === "complete") {
        return await onComplete(chunk);
      } else if (chunk.type === "fallback") {
        return await onFallback(chunk.data);
      } else if (chunk.type === "error") {
        throw new Error(chunk.error || "Streaming failed");
      } else {
        logger.warn("⚠️ Unknown chunk type:", chunk.type, chunk);
      }
    }
  } catch (error) {
    await onError(error.message || "Stream processing failed");
    throw error;
  }
}

/**
 * Creates and manages a streaming message placeholder
 * @param {Object} agent - The agent instance
 * @param {Object} metadata - Optional metadata for the message (e.g., {mode: 'build'})
 * @returns {Object} - Object with messageId and update function
 */
export function createStreamingMessage(agent, metadata = {}) {
  const messageId = agent._generateMessageId();
  const placeholderMessage = {
    id: messageId,
    type: "ai",
    content: "",
    timestamp: new Date().toISOString(),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}), // Include metadata if provided
  };

  agent._addMessage(placeholderMessage);

  // Placeholder message created

  return {
    messageId,
    append: (chunk) => {
      // Append chunk to current streaming content
      agent._appendToStreamingMessage(messageId, chunk);
    },
    update: (content, metadata = null) => {
      // Set full content and optionally update metadata (used for final update)
      agent._updateStreamingMessage(messageId, content, metadata);
    },
    updateMetadata: (metadata) => {
      // Update only metadata without changing content (for early metadata events)
      agent._updateMessageMetadata(messageId, metadata);
    },
    remove: () => {
      logger.info("🗑️ StreamingMessage.remove:", { messageId });
      agent._removeMessage(messageId);
    },
  };
}

/**
 * Handles fallback to non-streaming API
 * @param {Function} fallbackApiFunction - The non-streaming API function
 * @param {Array} fallbackApiParams - Parameters for the API function
 * @param {Function} handleResult - Function to process the fallback result
 * @param {string} operationName - Name for logging
 * @returns {Promise} - Result from handleResult
 */
export async function handleStreamingFallback(
  fallbackApiFunction,
  fallbackApiParams,
  handleResult,
  operationName,
) {
  logger.info(
    `🔄 Streaming failed, falling back to non-streaming for ${operationName}`,
  );

  try {
    const result = await fallbackApiFunction(...fallbackApiParams);
    return await handleResult(result, true); // true indicates error fallback
  } catch (fallbackError) {
    logger.error("Fallback also failed:", fallbackError);
    throw fallbackError;
  }
}

/**
 * Resets streaming state for an agent
 * @param {Object} agent - The agent instance
 * @param {Object} additionalState - Additional state to set (optional)
 */
export function resetStreamingState(agent, additionalState = {}) {
  const resetState = {
    isStreaming: false,
    isTyping: false,
    streamingMessage: "",
    streamingMessageId: null,
    ...additionalState,
  };

  // Reset loading state if present (standardized as isLoadingItem)
  if (agent.state.hasOwnProperty("isLoadingItem")) {
    resetState.isLoadingItem = false;
  }

  agent._updateState(resetState);
}

/**
 * Common input validation for streaming messages
 * @param {Object} agent - The agent instance
 * @param {string} messageContent - The message content to validate
 * @param {string[]} imageS3Keys - Optional array of image S3 keys
 * @returns {boolean} - Whether input is valid
 */
export function validateStreamingInput(
  agent,
  messageContent,
  imageS3Keys = [],
) {
  // Allow sending if there's text OR images
  const hasContent =
    messageContent.trim() || (imageS3Keys && imageS3Keys.length > 0);

  return !!(
    hasContent &&
    !agent.state.isTyping &&
    !agent.state.isStreaming &&
    !agent.state.isLoadingItem &&
    agent.userId &&
    (agent.coachId || agent.sessionId) && // CoachConversation has coachId, CoachCreator has sessionId
    (agent.conversationId || agent.sessionId) // CoachConversation has conversationId, CoachCreator has sessionId
  );
}
