import { chatPatterns } from "../utils/uiPatterns";

/**
 * Coach message bubble (left-aligned).
 */
export function CoachMessage({ who = "COACH", children }) {
  return (
    <div className={chatPatterns.msg}>
      <div className={chatPatterns.whoCoach}>{who} &gt;&gt;</div>
      <div className={chatPatterns.bubble}>{children}</div>
    </div>
  );
}

/**
 * User message bubble (right-aligned).
 */
export function UserMessage({ who = "YOU", children }) {
  return (
    <div className={chatPatterns.msgUser}>
      <div className={chatPatterns.whoUser}>&lt;&lt; {who}</div>
      <div className={chatPatterns.bubbleUser}>{children}</div>
    </div>
  );
}

/**
 * Animated typing indicator (three blinking dots).
 */
export function TypingDots() {
  return (
    <div className={chatPatterns.typingDots}>
      <div className={chatPatterns.typingDot} />
      <div className={`${chatPatterns.typingDot} retro-tdot-2`} />
      <div className={`${chatPatterns.typingDot} retro-tdot-3`} />
    </div>
  );
}

/**
 * Chat input bar with prompt symbol and send slot.
 *
 * Props:
 *   prompt      — prefix symbol (default ">_")
 *   sendSlot    — React node for the send button area
 *   inputProps  — spread onto the inner <input>
 */
export function ChatInputBar({
  prompt = ">_",
  sendSlot,
  inputProps = {},
  className = "",
}) {
  return (
    <div className={`${chatPatterns.inputBar} ${className}`.trim()}>
      <span className={chatPatterns.prompt}>{prompt}</span>
      <input className={chatPatterns.input} {...inputProps} />
      {sendSlot}
    </div>
  );
}

/**
 * Scrollable chat message stream container.
 */
export function ChatStream({ children, className = "" }) {
  return (
    <div className={`${chatPatterns.stream} ${className}`.trim()}>
      {children}
    </div>
  );
}

export default ChatStream;
