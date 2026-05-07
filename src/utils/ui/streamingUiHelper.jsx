/**
 * Small, focused UI helpers for streaming message interactions
 * Each function handles a specific aspect of streaming UI without complex state management
 */
import { memo, useState } from "react";
import { avatarPatterns, messagePatterns, streamingPatterns } from "./uiPatterns";
import CopyButton from "../../components/shared/CopyButton";
import { logger } from "../logger";

/**
 * Sends a message via the streaming agent
 * @param {Object} agent - The agent instance (CoachConversationAgent, CoachCreatorAgent, or ProgramDesignerAgent)
 * @param {string} messageContent - The message to send
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @param {Object} options - Configuration options
 * @param {Function} options.onStreamingStart - Called when streaming starts
 * @param {Function} options.onStreamingError - Called if streaming fails
 * @param {Object} options.editContext - Optional edit context for workout_edit mode
 * @returns {Promise} - Result from sending the message
 */
export async function sendMessageWithStreaming(
  agent,
  messageContent,
  imageS3Keys = [],
  options = {},
  documentS3Keys = [],
) {
  const {
    onStreamingStart = () => {},
    onStreamingError = () => {},
    editContext = null,
  } = options;

  if (
    !agent ||
    (!messageContent.trim() &&
      (!imageS3Keys || imageS3Keys.length === 0) &&
      (!documentS3Keys || documentS3Keys.length === 0))
  ) {
    return;
  }

  try {
    onStreamingStart();
    return await agent.sendMessageStream(
      messageContent,
      imageS3Keys,
      editContext,
      documentS3Keys,
    );
  } catch (streamingError) {
    logger.warn("Streaming failed:", streamingError);
    onStreamingError(streamingError);
    throw streamingError;
  }
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
    const content = agentState.streamingMessage || message.content || "";
    return content;
  }

  // Otherwise use the final message content
  return message.content || "";
}

/**
 * Adds streaming visual effects to message display
 * @param {Object} message - The message object
 * @param {Object} agentState - Current agent state
 * @param {string} baseClassName - Base CSS classes for the message
 * @returns {string} - Enhanced CSS classes with streaming effects
 */
export function getStreamingMessageClasses(
  message,
  agentState,
  baseClassName = "",
) {
  const classes = [baseClassName];

  if (isMessageStreaming(message, agentState)) {
    // Custom class for streaming messages (used by components to add cursor indicator)
    classes.push("streaming-message");
  }

  return classes.filter(Boolean).join(" ");
}

/**
 * Shared message footer row used across all streaming conversation pages.
 * Renders timestamp, status dots, and (when not streaming) a copy button.
 * Memoized with a comparator that excludes streamingMessage so the footer
 * DOM is not recreated on every chunk — only when streaming ends or dot
 * colors change.
 *
 * @param {boolean} isCurrentlyStreaming - Whether this message is actively streaming
 * @param {string} timestamp - ISO timestamp string
 * @param {"ai"|"user"} messageType - Message sender type
 * @param {string} messageContent - Final message text (for copy button)
 * @param {Function} formatTime - Timestamp formatting function
 * @param {string} aiDotColorClass - Tailwind color class for AI status dots (e.g. messagePatterns.statusDotCyan)
 * @param {string} userDotColorClass - Tailwind color class for user status dots
 */
export const MessageFooter = memo(
  ({
    isCurrentlyStreaming,
    timestamp,
    messageType,
    messageContent,
    formatTime,
    aiDotColorClass = messagePatterns.statusDotCyan,
    userDotColorClass = messagePatterns.statusDotPink,
  }) => (
    <div
      className={`flex items-center gap-2 px-1 mt-2 ${messageType === "user" ? "justify-end" : "justify-start"}`}
    >
      {/* User messages: timestamp first, then dots (matches original ordering) */}
      {messageType === "user" && (
        <>
          <span className="text-xs text-synthwave-text-secondary font-body">
            {formatTime(timestamp)}
          </span>
          <div className="flex gap-1">
            <div className={`${messagePatterns.statusDotSecondary} ${userDotColorClass}`} />
            <div className={`${messagePatterns.statusDotPrimary} ${userDotColorClass}`} />
          </div>
        </>
      )}
      {/* AI messages: timestamp, dots, copy button */}
      {messageType === "ai" && (
        <>
          <span className="text-xs text-synthwave-text-secondary font-body">
            {formatTime(timestamp)}
          </span>
          <div className="flex gap-1">
            <div className={`${messagePatterns.statusDotSecondary} ${aiDotColorClass}`} />
            <div className={`${messagePatterns.statusDotPrimary} ${aiDotColorClass}`} />
          </div>
          {!isCurrentlyStreaming && <CopyButton text={messageContent} />}
        </>
      )}
    </div>
  ),
  (prev, next) =>
    prev.isCurrentlyStreaming === next.isCurrentlyStreaming &&
    prev.timestamp === next.timestamp &&
    prev.messageContent === next.messageContent &&
    prev.messageType === next.messageType &&
    prev.aiDotColorClass === next.aiDotColorClass &&
    prev.userDotColorClass === next.userDotColorClass,
);
MessageFooter.displayName = "MessageFooter";

/**
 * Contextual update indicator - shows AI processing stages during streaming (ephemeral)
 * Displays a left-bordered message with animated processing dots and contextual text,
 * followed by the AI avatar. Used consistently across all conversation flows.
 *
 * @param {string} content - The contextual update text to display
 * @param {string} avatarLabel - Single character for the AI avatar (default: "C")
 * @param {boolean} showAvatar - Whether to show the avatar row below (default: true)
 * @param {boolean} compact - Reduces vertical padding on the border accent (default: false)
 * @returns {JSX.Element} - Contextual update indicator
 */
export function ContextualUpdateIndicator({
  content,
  avatarLabel = "C",
  showAvatar = true,
  compact = false,
}) {
  const borderAccentClass = compact
    ? streamingPatterns.contextualUpdate.borderAccentCompact
    : streamingPatterns.contextualUpdate.borderAccent;
  const textClass = compact
    ? streamingPatterns.contextualUpdate.textCompact
    : streamingPatterns.contextualUpdate.text;
  const avatarClass = compact ? avatarPatterns.aiXSmall : avatarPatterns.aiSmall;

  return (
    <div className="flex flex-row items-start gap-3 mb-1 animate-message-in">
      {showAvatar && (
        <div className={`shrink-0 mt-1 ${avatarClass}`}>
          {avatarLabel}
        </div>
      )}
      <div className={borderAccentClass}>
        <div className={streamingPatterns.contextualUpdate.contentRow}>
          <div className={streamingPatterns.contextualUpdate.dotsContainer}>
            <div
              className={streamingPatterns.contextualUpdate.dot}
              style={{ animationDelay: "0ms" }}
            />
            <div
              className={streamingPatterns.contextualUpdate.dot}
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className={streamingPatterns.contextualUpdate.dot}
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <span className={textClass}>
            {content}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Faint, persistent block that surfaces a single agent tool call in the AI
 * message bubble — Claude-Code-style.
 *
 * Reads one element of `toolCalls` (either upserted live during streaming or
 * persisted in `metadata.agent.toolCalls` after reload) and renders:
 *   - status: "running"  → cyan-accented row with animated dot
 *   - status: "complete" → cyan-accented row with duration
 *   - status: "error"    → pink/red-accented row with error message
 *
 * When `toolInput` is present (i.e. the tool wasn't flagged `redactInput`
 * server-side), an expandable disclosure shows the input as pretty-printed
 * JSON. Collapsed by default to keep the bubble visually quiet.
 *
 * @param {Object} toolCall - { toolUseId, toolName, status, durationMs?, errorMessage?, toolInput? }
 */
export const ToolCallBlock = memo(function ToolCallBlock({ toolCall }) {
  const [inputExpanded, setInputExpanded] = useState(false);

  if (!toolCall || !toolCall.toolName) return null;

  const status = toolCall.status || "running";
  const containerVariant =
    status === "error"
      ? streamingPatterns.toolCallBlock.containerError
      : status === "complete"
        ? streamingPatterns.toolCallBlock.containerComplete
        : streamingPatterns.toolCallBlock.containerRunning;
  const dotVariant =
    status === "error"
      ? streamingPatterns.toolCallBlock.statusDotError
      : status === "complete"
        ? streamingPatterns.toolCallBlock.statusDotComplete
        : streamingPatterns.toolCallBlock.statusDotRunning;
  const nameVariant =
    status === "error"
      ? streamingPatterns.toolCallBlock.toolNameError
      : streamingPatterns.toolCallBlock.toolName;

  const hasInputDisclosure =
    toolCall.toolInput !== undefined && toolCall.toolInput !== null;
  const inputJson = hasInputDisclosure
    ? safeStringifyToolInput(toolCall.toolInput)
    : null;

  return (
    <div
      className={`${streamingPatterns.toolCallBlock.container} ${containerVariant}`}
    >
      <div className={streamingPatterns.toolCallBlock.headerRow}>
        <span className={dotVariant} />
        <span className={streamingPatterns.toolCallBlock.toolNameLabel}>
          tool
        </span>
        <span className={nameVariant}>{toolCall.toolName}</span>
        <span className={streamingPatterns.toolCallBlock.metaText}>
          {status === "running"
            ? "running…"
            : typeof toolCall.durationMs === "number"
              ? `${formatToolDuration(toolCall.durationMs)} · ${status}`
              : status}
        </span>
      </div>
      {status === "error" && toolCall.errorMessage && (
        <div className={streamingPatterns.toolCallBlock.errorMessage}>
          {toolCall.errorMessage}
        </div>
      )}
      {hasInputDisclosure && inputJson && (
        <details
          open={inputExpanded}
          onToggle={(e) => setInputExpanded(e.currentTarget.open)}
        >
          <summary
            className={streamingPatterns.toolCallBlock.inputDisclosureSummary}
          >
            {inputExpanded ? "hide input" : "show input"}
          </summary>
          <pre className={streamingPatterns.toolCallBlock.inputDisclosurePre}>
            {inputJson}
          </pre>
        </details>
      )}
    </div>
  );
});

function formatToolDuration(ms) {
  if (typeof ms !== "number" || !isFinite(ms)) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
}

function safeStringifyToolInput(input) {
  try {
    const json = JSON.stringify(input, null, 2);
    if (typeof json !== "string") return null;
    // Cap to keep the disclosure pane manageable. The full payload is in the
    // persisted message metadata for power users; the UI just shows a digest.
    return json.length > 4000 ? json.slice(0, 4000) + "\n…(truncated)" : json;
  } catch {
    return null;
  }
}

/**
 * Renders a list of ToolCallBlock children for a message. Reads from the
 * streaming `message.toolCalls` array first (populated mid-stream by the
 * `tool_call` SSE handler) and falls back to `message.metadata.agent.toolCalls`
 * for rehydrated messages. Returns null when there's nothing to show so
 * callers can render the slot unconditionally.
 *
 * @param {Object} message - The message object from agent state or DB
 */
export function ToolCallList({ message }) {
  if (!message) return null;
  const live = Array.isArray(message.toolCalls) ? message.toolCalls : null;
  const persisted = Array.isArray(message?.metadata?.agent?.toolCalls)
    ? message.metadata.agent.toolCalls
    : null;
  const calls = live && live.length > 0 ? live : persisted;
  if (!calls || calls.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2 w-full">
      {calls.map((tc, i) => (
        <ToolCallBlock
          key={tc.toolUseId || `${tc.toolName}-${i}`}
          toolCall={tc}
        />
      ))}
    </div>
  );
}

/**
 * Creates a typing indicator component for streaming
 * @param {boolean} isVisible - Whether to show the indicator
 * @param {string} customClass - Additional CSS classes
 * @returns {JSX.Element|null} - Typing indicator or null
 */
export function StreamingTypingIndicator({
  isVisible = false,
  customClass = "",
}) {
  if (!isVisible) return null;

  return (
    <div className={`flex space-x-1.5 px-4 py-3 ${customClass}`}>
      <div
        className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
        style={{ animationDelay: "0ms" }}
      />
      <div
        className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
        style={{ animationDelay: "0.2s" }}
      />
      <div
        className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
        style={{ animationDelay: "0.4s" }}
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
  const hasStreamingContent = !!(
    agentState.streamingMessage && agentState.streamingMessage.length > 0
  );
  const hasStreamingMessage = !!(
    agentState.isStreaming && agentState.streamingMessageId
  );

  return {
    isTyping: agentState.isTyping || agentState.isStreaming || false,
    isStreaming: agentState.isStreaming || false,
    // Don't show typing indicator if we have a streaming message bubble, even if no content yet
    showTypingIndicator:
      (agentState.isTyping || agentState.isStreaming) &&
      !hasStreamingContent &&
      !hasStreamingMessage,
    streamingMessageId: agentState.streamingMessageId || null,
  };
}

/**
 * Handles errors in streaming UI with user-friendly messages
 * @param {Error} error - The error that occurred
 * @param {Function} showToast - Toast notification function (optional)
 * @returns {string} - User-friendly error message
 */
export function handleStreamingError(error, showToast = null) {
  const errorMessage = error?.message || "An unexpected error occurred";
  let userMessage = "Message sending failed. Please try again.";

  // Customize message based on error type
  if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
    userMessage =
      "Network issue detected. Your message will be retried automatically.";
  } else if (errorMessage.includes("rate limit")) {
    userMessage =
      "Too many messages sent. Please wait a moment before trying again.";
  }

  if (showToast && showToast.error && typeof showToast.error === "function") {
    showToast.error(userMessage);
  }

  logger.error("Streaming UI error:", error);
  return userMessage;
}

/**
 * Feature detection for streaming capability
 * @returns {boolean} - Whether streaming is supported in current environment
 */
export function supportsStreaming() {
  // Check for ReadableStream support (needed for SSE parsing)
  if (typeof ReadableStream === "undefined") {
    logger.warn("ReadableStream not supported, streaming disabled");
    return false;
  }

  // Check for EventSource support (SSE)
  if (typeof EventSource === "undefined") {
    logger.warn("EventSource not supported, streaming disabled");
    return false;
  }

  return true;
}
