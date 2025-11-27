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
 * @param {string} props.mode - Current mode ('CHAT' or 'PROGRAM_DESIGN')
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
  // Chat is active for any mode that's NOT program_design (includes CHAT and WORKOUT_LOG)
  // This provides visual feedback that user is in a conversational mode
  const isChatMode = mode !== CONVERSATION_MODES.PROGRAM_DESIGN;
  const isProgramDesignMode = mode === CONVERSATION_MODES.PROGRAM_DESIGN;

  const chatButtonClasses = `
    ${buttonPatterns.modeToggleBase}
    ${isChatMode
      ? buttonPatterns.modeToggleChatActive
      : buttonPatterns.modeToggleChatInactive
    }
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
  `;

  const programDesignButtonClasses = `
    ${buttonPatterns.modeToggleBase}
    ${isProgramDesignMode
      ? buttonPatterns.modeToggleProgramDesignActive
      : buttonPatterns.modeToggleProgramDesignInactive
    }
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
  `;

  return (
    <div className={`${buttonPatterns.modeToggleContainer} ${className}`}>
      {/* Chat Mode Button - Active for CHAT and WORKOUT_LOG modes */}
      <button
        onClick={() => handleModeClick(CONVERSATION_MODES.CHAT)}
        disabled={disabled}
        className={chatButtonClasses}
        title="Chat mode - Have a conversation with your coach"
        aria-label="Switch to Chat mode"
        aria-pressed={isChatMode}
        type="button"
      >
        <span className="translate-y-px">Chat</span>
      </button>

      {/* Program Design Mode Button - Active only for PROGRAM_DESIGN mode */}
      <button
        onClick={() => handleModeClick(CONVERSATION_MODES.PROGRAM_DESIGN)}
        disabled={disabled}
        className={programDesignButtonClasses}
        title="Program Design mode - Create a structured training program artifact"
        aria-label="Switch to Program Design mode"
        aria-pressed={isProgramDesignMode}
        type="button"
      >
        <BuildModeIconTiny />
        <span className="translate-y-px">Program</span>
      </button>
    </div>
  );
};

export default CoachConversationModeToggle;

