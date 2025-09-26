/**
 * Smaller, focused streaming helpers for agent classes
 * Each function handles a specific aspect of streaming without managing complex state
 */

/**
 * Processes streaming chunks and delegates to handlers
 * @param {AsyncGenerator} messageStream - The streaming API response
 * @param {Function} onChunk - Called for each content chunk (chunk)
 * @param {Function} onComplete - Called when streaming completes (chunk)
 * @param {Function} onFallback - Called for fallback response (data)
 * @param {Function} onError - Called for errors (errorMessage)
 * @returns {Promise} - Result from the appropriate handler
 */
export async function processStreamingChunks(messageStream, { onChunk, onComplete, onFallback, onError }) {
  try {
    for await (const chunk of messageStream) {
      if (chunk.type === 'chunk') {
        await onChunk(chunk.content);
      } else if (chunk.type === 'complete') {
        return await onComplete(chunk);
      } else if (chunk.type === 'fallback') {
        return await onFallback(chunk.data);
      } else if (chunk.type === 'error') {
        throw new Error(chunk.error || 'Streaming failed');
      } else {
        console.warn('⚠️ Unknown chunk type:', chunk.type, chunk);
      }
    }
  } catch (error) {
    await onError(error.message || 'Stream processing failed');
    throw error;
  }
}

/**
 * Creates and manages a streaming message placeholder
 * @param {Object} agent - The agent instance
 * @returns {Object} - Object with messageId and update function
 */
export function createStreamingMessage(agent) {
  const messageId = agent._generateMessageId();
  const placeholderMessage = {
    id: messageId,
    type: "ai",
    content: "",
    timestamp: new Date().toISOString(),
  };

  agent._addMessage(placeholderMessage);

  console.info('🔄 createStreamingMessage created placeholder:', {
    messageId,
    totalMessages: agent.state.messages.length,
    streamingMessageId: agent.state.streamingMessageId
  });

  return {
    messageId,
    append: (chunk) => {
      // Append chunk to current streaming content
      console.info('📝 StreamingMessage.append:', { messageId, chunkLength: chunk.length });
      agent._appendToStreamingMessage(messageId, chunk);
    },
    update: (content) => {
      // Set full content (used for final update)
      console.info('📝 StreamingMessage.update:', { messageId, contentLength: content.length });
      agent._updateStreamingMessage(messageId, content);
    },
    remove: () => {
      console.info('🗑️ StreamingMessage.remove:', { messageId });
      agent._removeMessage(messageId);
    }
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
export async function handleStreamingFallback(fallbackApiFunction, fallbackApiParams, handleResult, operationName) {
  console.info(`🔄 Streaming failed, falling back to non-streaming for ${operationName}`);

  try {
    const result = await fallbackApiFunction(...fallbackApiParams);
    return await handleResult(result, true); // true indicates error fallback
  } catch (fallbackError) {
    console.error("Fallback also failed:", fallbackError);
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
    streamingMessage: '',
    streamingMessageId: null,
    ...additionalState
  };

  // Add isLoading reset for coach creator agents
  if (agent.state.hasOwnProperty('isLoading')) {
    resetState.isLoading = false;
  }

  agent._updateState(resetState);
}

/**
 * Common input validation for streaming messages
 * @param {Object} agent - The agent instance
 * @param {string} messageContent - The message content to validate
 * @returns {boolean} - Whether input is valid
 */
export function validateStreamingInput(agent, messageContent) {
  return !!(
    messageContent.trim() &&
    !agent.state.isTyping &&
    !agent.state.isStreaming &&
    !agent.state.isLoadingItem &&
    agent.userId &&
    (agent.coachId || agent.sessionId) && // CoachConversation has coachId, CoachCreator has sessionId
    (agent.conversationId || agent.sessionId) // CoachConversation has conversationId, CoachCreator has sessionId
  );
}
