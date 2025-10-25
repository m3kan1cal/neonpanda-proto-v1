import React from 'react';
import { CONVERSATION_MODES } from '../../constants/conversationModes';
import { buttonPatterns } from '../../utils/ui/uiPatterns';
import { BuildModeIconTiny } from '../themes/SynthwaveComponents';

/**
 * CoachConversationModeToggle - Synthwave-themed toggle for Chat/Build conversation modes
 *
 * Uses the modern synthwave design system from Theme.jsx with glassmorphism,
 * neon colors, and smooth transitions. Follows the Tab Button pattern.
 *
 * @param {Object} props
 * @param {string} props.mode - Current mode ('chat' or 'build')
 * @param {Function} props.onModeChange - Callback when mode changes (receives new mode string)
 * @param {boolean} props.disabled - Whether the toggle is disabled (e.g., during streaming)
 * @param {string} props.className - Additional CSS classes
 */
export const CoachConversationModeToggle = ({
  mode = CONVERSATION_MODES.CHAT,
  onModeChange,
  disabled = false,
  className = '',
}) => {
  const handleModeClick = (newMode) => {
    if (disabled || mode === newMode) return;

    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  // Build button classes using uiPatterns
  const chatButtonClasses = `
    ${buttonPatterns.modeToggleBase}
    ${mode === CONVERSATION_MODES.CHAT
      ? buttonPatterns.modeToggleChatActive
      : buttonPatterns.modeToggleChatInactive
    }
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
  `;

  const buildButtonClasses = `
    ${buttonPatterns.modeToggleBase}
    ${mode === CONVERSATION_MODES.BUILD
      ? buttonPatterns.modeToggleBuildActive
      : buttonPatterns.modeToggleBuildInactive
    }
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
  `;

  return (
    <div className={`${buttonPatterns.modeToggleContainer} ${className}`}>
      {/* Chat Mode Button */}
      <button
        onClick={() => handleModeClick(CONVERSATION_MODES.CHAT)}
        disabled={disabled}
        className={chatButtonClasses}
        title="Chat mode - Have a conversation with your coach"
        aria-label="Switch to Chat mode"
        aria-pressed={mode === CONVERSATION_MODES.CHAT}
        type="button"
      >
        Chat
      </button>

      {/* Build Mode Button */}
      <button
        onClick={() => handleModeClick(CONVERSATION_MODES.BUILD)}
        disabled={disabled}
        className={buildButtonClasses}
        title="Build mode - Create a structured training program"
        aria-label="Switch to Build mode"
        aria-pressed={mode === CONVERSATION_MODES.BUILD}
        type="button"
      >
        <BuildModeIconTiny />
        <span className="translate-y-px">Build</span>
      </button>
    </div>
  );
};

export default CoachConversationModeToggle;

