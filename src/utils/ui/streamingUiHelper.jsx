/**
 * Small, focused UI helpers for streaming message interactions
 * Each function handles a specific aspect of streaming UI without complex state management
 */

/**
 * Handles message sending with streaming first, fallback to non-streaming
 * @param {Object} agent - The agent instance (CoachConversationAgent or CoachCreatorAgent)
 * @param {string} messageContent - The message to send
 * @param {Object} options - Configuration options
 * @param {Function} options.onStreamingStart - Called when streaming starts
 * @param {Function} options.onStreamingError - Called if streaming fails
 * @param {boolean} options.enableStreaming - Whether to use streaming (default: true)
 * @returns {Promise} - Result from sending the message
 */
export async function sendMessageWithStreaming(agent, messageContent, options = {}) {
  const {
    onStreamingStart = () => {},
    onStreamingError = () => {},
    enableStreaming = true
  } = options;

  if (!agent || !messageContent.trim()) {
    return;
  }

  // Try streaming first if enabled
  if (enableStreaming && agent.sendMessageStream) {
    try {
      onStreamingStart();
      return await agent.sendMessageStream(messageContent);
    } catch (streamingError) {
      console.warn('⚠️ Streaming failed, falling back to non-streaming:', streamingError);
      onStreamingError(streamingError);

      // DON'T call sendMessage here - it would create duplicate messages!
      // The streaming method should handle its own fallback internally
      throw streamingError; // Re-throw to let the caller handle the error
    }
  }

  // Use non-streaming directly
  return await agent.sendMessage(messageContent);
}

/**
 * Determines if a message should show streaming effects
 * @param {Object} message - The message object
 * @param {Object} agentState - Current agent state
 * @returns {boolean} - Whether this message is currently streaming
 */
export function isMessageStreaming(message, agentState) {
  return !!(
    agentState.isStreaming &&
    agentState.streamingMessageId &&
    message.id === agentState.streamingMessageId
  );
}

/**
 * Gets the appropriate content for a message (handles streaming vs final content)
 * @param {Object} message - The message object
 * @param {Object} agentState - Current agent state
 * @returns {string} - The content to display
 */
export function getMessageDisplayContent(message, agentState) {
  const streaming = isMessageStreaming(message, agentState);

  // If this message is currently streaming, use the streaming content
  if (streaming) {
    const content = agentState.streamingMessage || message.content || '';
    return content;
  }

  // Otherwise use the final message content
  return message.content || '';
}

/**
 * Adds streaming visual effects to message display
 * @param {Object} message - The message object
 * @param {Object} agentState - Current agent state
 * @param {string} baseClassName - Base CSS classes for the message
 * @returns {string} - Enhanced CSS classes with streaming effects
 */
export function getStreamingMessageClasses(message, agentState, baseClassName = '') {
  const classes = [baseClassName];

  if (isMessageStreaming(message, agentState)) {
    // Add streaming-specific classes
    classes.push('animate-pulse');  // Subtle pulse effect while streaming
    classes.push('streaming-message'); // Custom class for streaming messages
  }

  return classes.filter(Boolean).join(' ');
}

/**
 * Creates a typing indicator component for streaming
 * @param {boolean} isVisible - Whether to show the indicator
 * @param {string} customClass - Additional CSS classes
 * @returns {JSX.Element|null} - Typing indicator or null
 */
export function StreamingTypingIndicator({ isVisible = false, customClass = '' }) {
  if (!isVisible) return null;

  return (
    <div className={`flex space-x-1 px-4 py-3 ${customClass}`}>
      <div
        className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <div
        className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

/**
 * Determines the appropriate typing/loading state for UI
 * @param {Object} agentState - Current agent state
 * @returns {Object} - Object with typing state information
 */
export function getTypingState(agentState) {
  const hasStreamingContent = !!(agentState.streamingMessage && agentState.streamingMessage.length > 0);
  const hasStreamingMessage = !!(agentState.isStreaming && agentState.streamingMessageId);

  return {
    isTyping: agentState.isTyping || agentState.isStreaming || false,
    isStreaming: agentState.isStreaming || false,
    // Don't show typing indicator if we have a streaming message bubble, even if no content yet
    showTypingIndicator: (agentState.isTyping || agentState.isStreaming) && !hasStreamingContent && !hasStreamingMessage,
    streamingMessageId: agentState.streamingMessageId || null
  };
}

/**
 * Handles errors in streaming UI with user-friendly messages
 * @param {Error} error - The error that occurred
 * @param {Function} showToast - Toast notification function (optional)
 * @returns {string} - User-friendly error message
 */
export function handleStreamingError(error, showToast = null) {
  const errorMessage = error?.message || 'An unexpected error occurred';
  let userMessage = 'Message sending failed. Please try again.';

  // Customize message based on error type
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    userMessage = 'Network issue detected. Your message will be retried automatically.';
  } else if (errorMessage.includes('rate limit')) {
    userMessage = 'Too many messages sent. Please wait a moment before trying again.';
  }

  if (showToast && showToast.error && typeof showToast.error === 'function') {
    showToast.error(userMessage);
  }

  console.error('Streaming UI error:', error);
  return userMessage;
}

/**
 * Feature detection for streaming capability
 * @returns {boolean} - Whether streaming is supported in current environment
 */
export function supportsStreaming() {
  // Check for ReadableStream support (needed for SSE parsing)
  if (typeof ReadableStream === 'undefined') {
    console.warn('ReadableStream not supported, streaming disabled');
    return false;
  }

  // Check for EventSource support (SSE)
  if (typeof EventSource === 'undefined') {
    console.warn('EventSource not supported, streaming disabled');
    return false;
  }

  return true;
}
