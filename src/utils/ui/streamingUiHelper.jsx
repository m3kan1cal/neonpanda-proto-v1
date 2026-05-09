/**
 * Small, focused UI helpers for streaming message interactions
 * Each function handles a specific aspect of streaming UI without complex state management
 */
import { Fragment, memo, useState } from "react";
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
 * Renders timestamp, status dots, an optional sender avatar, and (when not
 * streaming) a copy button. Memoized with a comparator that excludes
 * streamingMessage so the footer DOM is not recreated on every chunk —
 * only when streaming ends, dot colors change, or the avatar slot changes.
 *
 * Layout (matches the contextual chat drawer):
 *   - AI message:   [avatar] [timestamp] [dots] [copy?]
 *   - User message: [timestamp] [dots] [avatar]
 *
 * @param {boolean} isCurrentlyStreaming - Whether this message is actively streaming
 * @param {string} timestamp - ISO timestamp string
 * @param {"ai"|"user"} messageType - Message sender type
 * @param {string} messageContent - Final message text (for copy button)
 * @param {Function} formatTime - Timestamp formatting function
 * @param {string} aiDotColorClass - Tailwind color class for AI status dots (e.g. messagePatterns.statusDotCyan)
 * @param {string} userDotColorClass - Tailwind color class for user status dots
 * @param {React.ReactNode} [avatarSlot] - Optional avatar element. Rendered as the
 *   leading element on AI messages and the trailing element on user messages so
 *   the avatar always sits on the message's outer edge.
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
    avatarSlot = null,
  }) => (
    <div
      className={`flex items-center gap-2 px-1 mt-2 ${messageType === "user" ? "justify-end" : "justify-start"}`}
    >
      {/* User messages: timestamp, dots, avatar (avatar on the right edge) */}
      {messageType === "user" && (
        <>
          <span className="text-xs text-synthwave-text-secondary font-body">
            {formatTime(timestamp)}
          </span>
          <div className="flex gap-1">
            <div className={`${messagePatterns.statusDotSecondary} ${userDotColorClass}`} />
            <div className={`${messagePatterns.statusDotPrimary} ${userDotColorClass}`} />
          </div>
          {avatarSlot && <div className="shrink-0">{avatarSlot}</div>}
        </>
      )}
      {/* AI messages: avatar, timestamp, dots, copy button (avatar on the left edge) */}
      {messageType === "ai" && (
        <>
          {avatarSlot && <div className="shrink-0">{avatarSlot}</div>}
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
    prev.userDotColorClass === next.userDotColorClass &&
    prev.avatarSlot === next.avatarSlot,
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
 * Reads `toolCalls` (live first, persisted fallback) and returns a sorted list
 * of tool calls anchored to character offsets in `content`. Tools missing a
 * `contentOffset` (legacy persisted messages) fall through to end-of-text so
 * they render below the text — matching the pre-interleaving behavior.
 */
function getOrderedToolCalls(message, content) {
  const live = Array.isArray(message?.toolCalls) ? message.toolCalls : null;
  const persisted = Array.isArray(message?.metadata?.agent?.toolCalls)
    ? message.metadata.agent.toolCalls
    : null;
  const calls = live && live.length > 0 ? live : persisted;
  if (!calls || calls.length === 0) return [];
  const fallback = typeof content === "string" ? content.length : 0;
  // Stable sort preserves emit order for tools that share an offset (e.g.
  // multiple parallel tools fired in the same iteration with no intervening
  // text). Modern V8 / SpiderMonkey sorts are stable, which we rely on here.
  return [...calls].sort(
    (a, b) =>
      (a.contentOffset ?? fallback) - (b.contentOffset ?? fallback),
  );
}

/**
 * Interleaves a streaming AI message's text with its tool-call blocks based on
 * each tool call's `contentOffset` (the character position in the cumulative
 * response text where the tool fired). Without this, all tool cards stack
 * below the message and "snowplow" downward as more text streams in.
 *
 * The caller supplies a `renderText(text, { isLastText })` adapter so each
 * surface keeps its existing markdown / styling wrapper. `isLastText` is true
 * for the final text segment (used to scope streaming-cursor decoration).
 *
 * @param {Object} props.message - Message object (reads `toolCalls` live or `metadata.agent.toolCalls`)
 * @param {string} props.content - The cumulative response text to slice
 * @param {(text: string, opts: { isLastText: boolean }) => JSX.Element} props.renderText - Renders a text slice
 */
export function MessageContentWithToolCalls({ message, content, renderText }) {
  const text = typeof content === "string" ? content : "";
  const sorted = getOrderedToolCalls(message, text);

  if (sorted.length === 0) {
    // No tool calls — preserve the single-bubble shape callers had before.
    return renderText(text, { isLastText: true });
  }

  const segments = [];
  let cursor = 0;
  sorted.forEach((tc, i) => {
    // Clamp the offset between the previous cursor and the end of text so a
    // bogus or out-of-range offset can't reorder segments or slice past the
    // string. Missing offsets land at end-of-text via the fallback in
    // getOrderedToolCalls — preserves legacy render for old persisted tools.
    const raw = tc.contentOffset ?? text.length;
    const offset = Math.min(Math.max(raw, cursor), text.length);
    if (offset > cursor) {
      segments.push({
        kind: "text",
        key: `t-${cursor}-${offset}`,
        text: text.slice(cursor, offset),
      });
    }
    segments.push({
      kind: "tool",
      key: tc.toolUseId || `tc-${tc.toolName || "x"}-${i}`,
      toolCall: tc,
    });
    cursor = offset;
  });
  if (cursor < text.length) {
    segments.push({
      kind: "text",
      key: `t-${cursor}-end`,
      text: text.slice(cursor),
    });
  }

  // Find the index of the last text segment so we can flag it for the caller's
  // streaming-cursor decoration. A message that ends with a tool call (no
  // trailing text) won't have any flagged segment, which is correct — there's
  // no live text to put a cursor on.
  let lastTextIndex = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].kind === "text") {
      lastTextIndex = i;
      break;
    }
  }

  return segments.map((s, i) =>
    s.kind === "text" ? (
      <Fragment key={s.key}>
        {renderText(s.text, { isLastText: i === lastTextIndex })}
      </Fragment>
    ) : (
      // Wrap each tool block in a div with vertical margin so it visually
      // separates from the surrounding text without requiring callers to wrap
      // the whole interleaved render in a flex column.
      <div key={s.key} className="my-2 w-full">
        <ToolCallBlock toolCall={s.toolCall} />
      </div>
    ),
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
