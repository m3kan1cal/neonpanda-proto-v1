import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
import { flushSync } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { getUserDisplayName } from "../auth/utils/authHelpers";
import { useAuth } from "../auth/contexts/AuthContext";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import {
  containerPatterns,
  layoutPatterns,
  inputPatterns,
  avatarPatterns,
  iconButtonPatterns,
  buttonPatterns,
  tooltipPatterns,
  messagePatterns,
  typographyPatterns,
} from "../utils/ui/uiPatterns";
import { FullPageLoader, CenteredErrorState } from "./shared/ErrorStates";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import ChatInput from "./shared/ChatInput";
import UserAvatar from "./shared/UserAvatar";
import { getUserInitial as getInitialFromUsername } from "./shared/UserAvatar";
import ScrollToBottomButton from "./shared/ScrollToBottomButton";
import { parseMarkdown } from "../utils/markdownParser.jsx";
// No imports needed - session ID comes from URL
import ProgramDesignerAgent from "../utils/agents/ProgramDesignerAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { useToast } from "../contexts/ToastContext";
import { CONVERSATION_MODES } from "../constants/conversationModes";
import ImageWithPresignedUrl from "./shared/ImageWithPresignedUrl";
import { deleteProgramDesignerSession } from "../utils/apis/programDesignerApi";
import { TrashIcon } from "./themes/SynthwaveComponents";
import {
  sendMessageWithStreaming,
  isMessageStreaming,
  getMessageDisplayContent,
  getStreamingMessageClasses,
  getTypingState,
  handleStreamingError,
  supportsStreaming,
} from "../utils/ui/streamingUiHelper.jsx";
import { BuildModeIconTiny } from "./themes/SynthwaveComponents";

// Icons for human and AI messages
const UserIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
      clipRule="evenodd"
    />
  </svg>
);

const AIIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 13h6"
    />
  </svg>
);

const TypingIndicator = () => (
  <div className="flex space-x-1 p-4">
    <div
      className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
      style={{ animationDelay: "0ms" }}
    ></div>
    <div
      className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
      style={{ animationDelay: "150ms" }}
    ></div>
    <div
      className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
      style={{ animationDelay: "300ms" }}
    ></div>
  </div>
);

// Contextual update indicator - shows AI processing stages
const ContextualUpdateIndicator = ({ content, stage, coachName }) => {
  return (
    <div className="flex flex-col items-start mb-1">
      <div className="px-4 py-2">
        <span className="font-rajdhani text-base italic animate-pulse text-synthwave-text-secondary/70">
          {content}
        </span>
      </div>
      <div className="flex items-start gap-2 px-2 mt-2">
        <div className={`flex-shrink-0 ${avatarPatterns.aiSmall}`}>
          {coachName?.charAt(0) || "C"}
        </div>
      </div>
    </div>
  );
};

// Memoized MessageItem component to prevent unnecessary re-renders
const MessageItem = memo(
  ({
    message,
    agentState,
    coachName,
    userEmail,
    userDisplayName,
    getUserInitial,
    formatTime,
    renderMessageContent,
    conversationMode,
  }) => {
    return (
      <div
        className={`flex flex-col mb-1 group ${
          message.type === "user" ? "items-end" : "items-start"
        }`}
      >
        {/* Message Bubble */}
        <div
          className={`max-w-[95%] md:max-w-[80%] ${message.type === "user" ? "items-end" : "items-start"} flex flex-col`}
        >
          {/* Workout Log Indicator Badge (only for AI messages created during workout log artifact creation) */}
          {message.type === "ai" &&
            message.metadata?.mode === CONVERSATION_MODES.WORKOUT_LOG && (
              <div className={`${buttonPatterns.modeBadgeWorkoutLog} mb-1`}>
                <span>Workout Log</span>
              </div>
            )}

          {/* Program Design Indicator Badge (only for AI messages created during program design artifact creation) */}
          {message.type === "ai" &&
            message.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN && (
              <div className={`${buttonPatterns.modeBadgeProgramDesign} mb-1`}>
                <BuildModeIconTiny />
                <span className="translate-y-px">Program Design</span>
              </div>
            )}

          <div
            className={getStreamingMessageClasses(
              message,
              agentState,
              message.type === "user"
                ? containerPatterns.userMessageBubble
                : message.type === "ai" &&
                    message.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN
                  ? containerPatterns.aiProgramDesignModeBubble
                  : `${containerPatterns.aiChatBubble} px-4 py-3`,
            )}
          >
            <div className="font-rajdhani text-base leading-relaxed">
              {renderMessageContent(message)}
            </div>
          </div>

          {/* Timestamp, status, and avatar on same line */}
          <div
            className={`flex items-start gap-2 px-2 mt-2 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Avatar for AI messages (left side) */}
            {message.type === "ai" && (
              <div className="flex-shrink-0">
                <div className={avatarPatterns.aiSmall}>
                  {coachName?.charAt(0) || "C"}
                </div>
              </div>
            )}

            <span className="text-xs text-synthwave-text-secondary font-rajdhani">
              {formatTime(message.timestamp)}
            </span>
            {message.type === "user" && (
              <div className="flex gap-1">
                <div
                  className={`${messagePatterns.statusDotSecondary} ${messagePatterns.statusDotPink}`}
                ></div>
                <div
                  className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotPink}`}
                ></div>
              </div>
            )}
            {message.type === "ai" && (
              <div className="flex gap-1">
                <div
                  className={`${messagePatterns.statusDotSecondary} ${
                    message.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN
                      ? messagePatterns.statusDotPurple
                      : messagePatterns.statusDotCyan
                  }`}
                ></div>
                <div
                  className={`${messagePatterns.statusDotPrimary} ${
                    message.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN
                      ? messagePatterns.statusDotPurple
                      : messagePatterns.statusDotCyan
                  }`}
                ></div>
              </div>
            )}

            {/* Avatar for user messages (right side) */}
            {message.type === "user" && (
              <div className="flex-shrink-0">
                <UserAvatar
                  email={userEmail}
                  username={userDisplayName}
                  size={32}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Re-render if:
    // 1. Message content changed (for streaming updates)
    // 2. Message ID changed (different message)
    // 3. Agent streaming state changed (affects this message's rendering)
    // 4. Coach name changed (affects avatar)
    // 5. Message metadata changed (affects badges like Multi-Turn or Build Mode)

    const messageChanged =
      prevProps.message.id !== nextProps.message.id ||
      prevProps.message.content !== nextProps.message.content ||
      prevProps.message.metadata !== nextProps.message.metadata;

    const streamingStateChanged =
      prevProps.agentState.isStreaming !== nextProps.agentState.isStreaming ||
      prevProps.agentState.streamingMessageId !==
        nextProps.agentState.streamingMessageId ||
      prevProps.agentState.streamingMessage !==
        nextProps.agentState.streamingMessage;

    const coachNameChanged = prevProps.coachName !== nextProps.coachName;
    const userChanged =
      prevProps.userEmail !== nextProps.userEmail ||
      prevProps.userDisplayName !== nextProps.userDisplayName;

    const shouldRerender =
      messageChanged ||
      streamingStateChanged ||
      coachNameChanged ||
      userChanged;

    // Return true if props are equal (no re-render needed)
    // Return false if props changed (re-render needed)
    return !shouldRerender;
  },
);

// Add display name for debugging
MessageItem.displayName = "MessageItem";

function ProgramDesigner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");
  const programDesignerSessionId = searchParams.get("programDesignerSessionId");

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    userAttributes,
    error: userIdError,
  } = useAuthorizeUser(userId);

  // Get user's first letter for avatar and email for Gravatar
  const getUserInitial = useCallback(() => {
    if (!userAttributes) return "U";

    // Create a user object compatible with getUserDisplayName
    const userForDisplayName = { attributes: userAttributes };
    const displayName = getUserDisplayName(userForDisplayName);
    return displayName.charAt(0).toUpperCase();
  }, [userAttributes]);

  // Get user email and display name from profile (preferred) or Cognito (fallback)
  const { userProfile } = useAuth();
  const userEmail = userAttributes?.email;
  const userDisplayName =
    userProfile?.displayName ||
    (userAttributes
      ? getUserDisplayName({ attributes: userAttributes })
      : "User");

  // UI-specific state
  const [inputMessage, setInputMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Slash command states moved to ChatInput component

  // Command palette state
  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Modern chat features state
  const [isOnline] = useState(true);
  const textareaRef = useRef(null);

  // Add flag to prevent double execution from React StrictMode
  const isSendingMessage = useRef(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const { success: showSuccess, error: showError } = useToast();

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Agent state (managed by ProgramDesignerAgent)
  const [agentState, setAgentState] = useState({
    messages: [],
    isLoadingItem: true,
    isTyping: false,
    error: null,
    coach: null,
    conversation: null,
    recentConversations: [],
    isLoadingRecentItems: false,
    // Initialize streaming state
    isStreaming: false,
    streamingMessage: "",
    streamingMessageId: null,
  });

  // Slash commands configuration (minimal for program designer)
  const availableSlashCommands = [
    {
      command: "/save-memory",
      description: "Save a memory or note",
      example: "/save-memory I prefer morning workouts",
    },
  ];

  // Quick suggestions configuration (program design focused)
  const quickSuggestions = [
    {
      label: "Start Design",
      message: "I'm ready to design my training program",
    },
    {
      label: "Strength Focus",
      message: "I want to build strength over the next 8-12 weeks",
    },
    {
      label: "Endurance Focus",
      message: "I need to improve my conditioning and endurance",
    },
    {
      label: "Hybrid Training",
      message: "I want a balanced program with both strength and conditioning",
    },
  ];

  // Chat tips content
  const chatTips = {
    items: [
      {
        title: "Answer Thoroughly",
        description:
          "Provide detailed answers to each question about your goals, experience, schedule, and equipment.",
      },
      {
        title: "Be Honest",
        description:
          "Share your true experience level, constraints, and preferences so the program matches your needs.",
      },
      {
        title: "Share Constraints",
        description:
          "Tell me about time limitations, equipment access, injuries, and recovery considerations.",
      },
      {
        title: "Final Considerations",
        description:
          "At the end, you'll have a chance to add any exercises you love/hate or additional context.",
      },
    ],
  };

  // Removed polling logic - not needed for program designer sessions (mirrors CoachCreator)

  // NOTE: conversationMode state removed - mode is now AI-detected automatically
  // Mode is determined from message metadata for UI indicators

  // Derive current mode from active sessions for UI styling (typing indicator, etc.)
  const getCurrentMode = () => {
    // PRIORITY 1: Use conversation mode set by backend (set during program design, workout logging, etc.)
    if (agentState.conversation?.mode) {
      return agentState.conversation.mode;
    }

    // PRIORITY 2: Check for active workout session (backward compatibility for embedded sessions)
    if (agentState.conversation?.workoutCreatorSession?.isComplete === false) {
      return CONVERSATION_MODES.WORKOUT_LOG;
    }

    // Default to chat mode
    return CONVERSATION_MODES.CHAT;
  };

  const conversationMode = getCurrentMode();

  // Debug: Track component re-renders during streaming

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !coachId || !programDesignerSessionId) {
      navigate(`/training-grounds/programs?userId=${userId || ""}`, {
        replace: true,
      });
      return;
    }
  }, [userId, coachId, programDesignerSessionId, navigate]);

  // Cleanup for coach agent
  useEffect(() => {
    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current.destroy();
        coachAgentRef.current = null;
      }
    };
  }, []);

  // Initialize CoachAgent for coach name editing
  useEffect(() => {
    if (!userId || !coachId) return;

    if (!coachAgentRef.current) {
      coachAgentRef.current = new CoachAgent({ userId });
    }

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current.destroy();
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Session loading error state
  const [sessionLoadError, setSessionLoadError] = useState(null);

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current && userId && coachId && programDesignerSessionId) {
      agentRef.current = new ProgramDesignerAgent({
        userId,
        coachId,
        sessionId: programDesignerSessionId, // Pass sessionId to agent
        onStateChange: (newState) => {
          // Use flushSync for streaming updates to force immediate synchronous rendering
          if (newState.isStreaming || newState.streamingMessage) {
            flushSync(() => {
              setAgentState(newState);
            });
          } else {
            // Normal async update for non-streaming changes
            setAgentState(newState);
          }
        },
        onNavigation: (type, data) => {
          if (type === "program-complete") {
            navigate(
              `/training-grounds/programs?userId=${data.userId}&coachId=${data.coachId}`,
              { replace: true },
            );
          } else if (type === "session-complete") {
            // Delay showing completion modal to give user time to read final AI message
            setTimeout(() => {
              setShowCompletionModal(true);
            }, 3000); // 3 second delay for better UX
          }
        },
        onError: (error) => {
          console.error("Agent error:", error);
          showError(error.message || "An error occurred");
        },
      });

      // Load coach details and session data
      setTimeout(async () => {
        try {
          // Load coach and session in parallel
          await Promise.all([
            agentRef.current.loadCoachDetails(userId, coachId),
            agentRef.current.loadSession(userId, programDesignerSessionId),
          ]);
          setSessionLoadError(null); // Clear any previous errors
        } catch (error) {
          console.error("Error loading session data:", error);
          setSessionLoadError(
            error.message ||
              "Failed to load session. Please try again or start a new session.",
          );
        }
      }, 100);
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId, coachId, programDesignerSessionId, navigate, showError]);

  // Polling removed - not needed for program designer sessions (mirrors CoachCreator)

  const autoResizeTextarea = (textarea) => {
    if (!textarea) return;

    const minHeight = 48; // 3rem = 48px
    const maxHeight = 120; // Max 120px as per requirements

    // Get current height to avoid unnecessary changes
    const currentHeight = parseInt(textarea.style.height) || minHeight;

    // If textarea is disabled and input is empty, force reset to minimum
    if (textarea.disabled && !inputMessage.trim()) {
      textarea.style.height = minHeight + "px";
      textarea.style.overflowY = "hidden";
      return;
    }

    // Temporarily enable textarea to get accurate scrollHeight if needed
    const wasDisabled = textarea.disabled;
    if (wasDisabled) {
      textarea.disabled = false;
    }

    const scrollHeight = textarea.scrollHeight;

    // Restore disabled state
    if (wasDisabled) {
      textarea.disabled = true;
    }

    // Determine target height
    let targetHeight;
    let targetOverflow;

    if (scrollHeight <= minHeight) {
      targetHeight = minHeight;
      targetOverflow = "hidden";
    } else if (scrollHeight <= maxHeight) {
      targetHeight = scrollHeight;
      targetOverflow = "hidden";
    } else {
      targetHeight = maxHeight;
      targetOverflow = "auto";
    }

    // Only update if height actually needs to change (avoid micro-adjustments)
    if (Math.abs(currentHeight - targetHeight) > 1) {
      textarea.style.height = targetHeight + "px";
      textarea.style.overflowY = targetOverflow;
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Handle scroll events to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100;

    // Only show button if there's actually content to scroll to
    const hasScrollableContent = scrollHeight > clientHeight;

    setShowScrollButton(hasScrollableContent && !isNearBottom);
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if user is already at bottom)
  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom();
    }
  }, [
    agentState.messages,
    agentState.isTyping,
    agentState.contextualUpdate,
    agentState.streamingMessage,
    showScrollButton,
    scrollToBottom,
  ]);

  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      handleScroll();
    };

    container.addEventListener("scroll", checkScroll);
    // Check initial scroll position
    const timeout1 = setTimeout(checkScroll, 100);
    const timeout2 = setTimeout(checkScroll, 500);
    const timeout3 = setTimeout(checkScroll, 1000);

    return () => {
      container.removeEventListener("scroll", checkScroll);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [handleScroll, agentState.messages.length]);

  // Voice recording functions moved to ChatInput component

  // Focus input when chat interface is visible
  useEffect(() => {
    if (userId && coachId && programDesignerSessionId && textareaRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Don't call autoResizeTextarea on focus to prevent height jumps
        }
      }, 100);
    }
  }, [userId, coachId, programDesignerSessionId]);

  // Also focus when the coach data is loaded (for page refresh scenarios)
  useEffect(() => {
    if (agentState.coach && textareaRef.current && !agentState.isLoadingItem) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Don't call autoResizeTextarea on focus to prevent height jumps
        }
      }, 100);
    }
  }, [agentState.coach, agentState.isLoadingItem]);

  useEffect(() => {
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [inputMessage]);

  // Additional effect to ensure textarea resizes properly when AI stops typing
  useEffect(() => {
    if (textareaRef.current && !agentState.isTyping) {
      // Small delay to ensure the textarea is re-enabled before resizing
      setTimeout(() => {
        if (textareaRef.current) {
          autoResizeTextarea(textareaRef.current);
        }
      }, 10);
    }
  }, [agentState.isTyping]);

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Create coach name handler using the agent's helper method
  const handleSaveCoachName = coachAgentRef.current?.createCoachNameHandler(
    userId,
    coachId,
    (newName) =>
      setAgentState((prevState) => ({
        ...prevState,
        coach: {
          ...prevState.coach,
          name: newName,
        },
      })),
    { success: showSuccess, error: showError },
  );

  // Delete handlers
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userId || !programDesignerSessionId) return;

    setIsDeleting(true);
    try {
      await deleteProgramDesignerSession(userId, programDesignerSessionId);
      showSuccess("Program design session deleted successfully");
      // Redirect to programs page after successful deletion
      navigate(
        `/training-grounds/programs?userId=${userId}&coachId=${coachId}`,
      );
    } catch (error) {
      console.error("Error deleting program designer session:", error);
      showError("Failed to delete session. Please try again.");
      // Close modal even on error
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Prevent double execution from React StrictMode
    if (isSendingMessage.current || !inputMessage.trim() || !agentRef.current)
      return;

    isSendingMessage.current = true;
    const messageToSend = inputMessage.trim();
    setInputMessage("");

    // Refocus input and reset size after clearing it
    setTimeout(() => {
      if (textareaRef.current) {
        // Force reset to minimum height after clearing content
        textareaRef.current.style.height = "48px";
        textareaRef.current.style.overflowY = "hidden";
        textareaRef.current.focus();
        // Call autoResize to ensure proper state
        autoResizeTextarea(textareaRef.current);
      }
    }, 50);

    try {
      await sendMessageWithStreaming(agentRef.current, messageToSend, {
        enableStreaming: supportsStreaming(),
        onStreamingStart: () => {
          // Streaming started
        },
        onStreamingError: (error) => {
          handleStreamingError(error, { error: showError });
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      handleStreamingError(error, { error: showError });
    } finally {
      // Reset flag after message is sent (success or failure)
      isSendingMessage.current = false;
    }
  };

  // Message submission handler for ChatInput component
  const handleMessageSubmit = async (messageContent, imageS3Keys = []) => {
    // Prevent double execution from React StrictMode or duplicate events
    if (isSendingMessage.current || !agentRef.current) return;

    // Validate input - require either text or images
    if (!messageContent?.trim() && (!imageS3Keys || imageS3Keys.length === 0)) {
      return;
    }

    isSendingMessage.current = true;

    try {
      await sendMessageWithStreaming(
        agentRef.current,
        messageContent,
        imageS3Keys,
        {
          enableStreaming: supportsStreaming(),
          onStreamingStart: () => {
            // Streaming started - instant scroll to show new message
            setTimeout(() => scrollToBottom(true), 50);
          },
          onStreamingError: (error) => {
            handleStreamingError(error, { error: showError });
          },
        },
      );

      // Scroll after message is sent to ensure we're at the bottom
      // Use timeout to ensure React has rendered the new message
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error("Error sending message:", error);
      handleStreamingError(error, { error: showError });
    } finally {
      // Reset flag after message is sent (success or failure)
      isSendingMessage.current = false;
    }
  };

  // Key press handling moved to ChatInput component

  const formatTime = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // NOTE: Mode toggle removed - mode is now AI-detected automatically
  // The UI still shows mode badges based on message metadata

  // Session deletion removed - sessions are managed from ManagePrograms page
  // Users can delete in-progress sessions from there if needed

  // Slash command parsing moved to ChatInput component

  // Helper function to render message content with line breaks and streaming support
  // Removed useCallback to prevent memoization issues during streaming
  const renderMessageContent = (message) => {
    // Get the appropriate content (streaming or final)
    const displayContent = getMessageDisplayContent(message, agentState);

    return (
      <>
        {/* Render images if present */}
        {message.imageS3Keys && message.imageS3Keys.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.imageS3Keys.map((s3Key, index) => (
              <ImageWithPresignedUrl
                key={index}
                s3Key={s3Key}
                userId={userId}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Render text content */}
        {displayContent &&
          (message.type === "ai"
            ? // AI messages use full markdown parsing
              parseMarkdown(displayContent)
            : // User messages: simple line break rendering
              displayContent.split("\n").map((line, index, array) => (
                <span key={index}>
                  {line}
                  {index < array.length - 1 && <br />}
                </span>
              )))}
      </>
    );
  };

  // Typing state without memoization to ensure real-time updates during streaming
  const typingState = getTypingState(agentState);

  // Slash command functionality moved to ChatInput component

  // Show loading state while initializing coach or session
  if (isValidatingUserId || agentState.isLoadingItem || !agentState.coach) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              {/* Title skeleton - compact size */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-72"></div>

              {/* Compact coach card skeleton - horizontal pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right: Command button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Conversation Title skeleton */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-2">
                {/* "Conversation Title:" label skeleton */}
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                {/* Title value skeleton */}
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
              </div>
            </div>
          </div>

          {/* Main Content Area skeleton */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-7xl">
              <div className="h-[500px] flex flex-col">
                {/* Messages Area skeleton */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-3">
                  {/* Chat message skeletons */}
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className={`flex items-end gap-2 ${i % 2 === 1 ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar skeleton */}
                      <div className="flex-shrink-0 w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>

                      {/* Message bubble skeleton */}
                      <div
                        className={`max-w-[95%] md:max-w-[80%] ${i % 2 === 1 ? "items-end" : "items-start"} flex flex-col`}
                      >
                        <div
                          className={`px-4 py-3 rounded-2xl ${i % 2 === 1 ? "rounded-br-md" : "rounded-bl-md"} bg-synthwave-text-muted/20 animate-pulse min-w-[min(65vw,600px)] min-h-[130px]`}
                        >
                          <div className="space-y-1">
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-3/4"></div>
                          </div>
                        </div>

                        {/* Timestamp and status skeleton */}
                        <div
                          className={`flex items-center gap-1 px-2 mt-1 ${i % 2 === 1 ? "justify-end" : "justify-start"}`}
                        >
                          <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                          <div className="flex gap-1">
                            <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input Skeleton */}
        <ChatInput
          showSkeleton={true}
          conversationMode={CONVERSATION_MODES.CHAT}
        />
      </div>
    );
  }

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own conversations."}
      />
    );
  }

  // Show error state for session loading
  if (sessionLoadError) {
    return (
      <CenteredErrorState
        title="Session Error"
        message={sessionLoadError}
        buttonText="Back to Programs"
        onButtonClick={() =>
          navigate(`/training-grounds/programs?userId=${userId}`)
        }
        variant="error"
      />
    );
  }

  // Show error state for coach loading
  if (agentState.error && !agentState.coach) {
    return (
      <CenteredErrorState
        title="Program Designer Error"
        message={agentState.error}
        buttonText="Back to Programs"
        onButtonClick={() =>
          navigate(`/training-grounds/programs?userId=${userId}`)
        }
        variant="error"
      />
    );
  }

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Coach Conversation Header"
        >
          {/* Left section: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Hover Tooltip */}
            <div className="flex items-center gap-3">
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="program-designer-info"
                data-tooltip-content="Design a structured training program with your AI coach through guided conversation"
              >
                Program Designer
              </h1>
              <div
                className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded text-synthwave-neon-purple font-rajdhani text-xs font-bold uppercase tracking-wider cursor-help"
                data-tooltip-id="beta-badge"
                data-tooltip-content="Training programs are in beta. You may experience pre-release behavior. We appreciate your feedback!"
              >
                Beta
              </div>
            </div>

            {/* Compact Coach Card */}
            {agentState.coach && (
              <CompactCoachCard
                coachData={agentState.coach}
                isOnline={isOnline}
                onClick={handleCoachCardClick}
              />
            )}
          </div>

          {/* Right section: Command Palette Button */}
          <div className="flex items-center gap-3">
            <CommandPaletteButton
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            {/* Removed mainContent container for immersive chat UX - messages flow edge-to-edge */}
            <div className="h-full flex flex-col">
              {/* Messages Area - with bottom padding for floating input */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 pb-40 sm:pb-56 space-y-4"
              >
                {/* Empty State - Show tips when no messages */}
                {agentState.messages.length === 0 &&
                  !agentState.isTyping &&
                  !agentState.isStreaming && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 px-4">
                      {/* Welcome Header */}
                      <div className="text-center space-y-2">
                        <h2 className={typographyPatterns.emptyStateHeader}>
                          Let's Build Your Program
                        </h2>
                        <p className={typographyPatterns.emptyStateDescription}>
                          I'll walk you through 5-10 questions to create
                          something custom. No boring forms – just you and me
                          figuring out what works.
                        </p>
                      </div>

                      {/* Command Tips Grid */}
                      <div className="flex flex-col gap-6 w-full max-w-2xl">
                        {/* Program Design Tips */}
                        <div>
                          <h4
                            className={
                              typographyPatterns.emptyStateSectionHeader
                            }
                          >
                            How This Works
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Be Real */}
                            <div
                              className={containerPatterns.emptyStateTipCard}
                            >
                              <h3
                                className={
                                  typographyPatterns.emptyStateCardTitle
                                }
                              >
                                Keep It Real
                              </h3>
                              <p
                                className={
                                  typographyPatterns.emptyStateCardText
                                }
                              >
                                Tell me what you've got – your goals, your
                                equipment, your schedule, your limits. The real
                                you, not the fantasy version.
                              </p>
                            </div>

                            {/* Final Pass */}
                            <div
                              className={containerPatterns.emptyStateTipCard}
                            >
                              <h3
                                className={
                                  typographyPatterns.emptyStateCardTitle
                                }
                              >
                                One Last Thing
                              </h3>
                              <p
                                className={
                                  typographyPatterns.emptyStateCardText
                                }
                              >
                                Before I build it, you'll get a final chance to
                                add anything – exercises you hate, movements you
                                love, whatever matters.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Program Design Process */}
                        <div>
                          <h4
                            className={
                              typographyPatterns.emptyStateSectionHeader
                            }
                          >
                            What Happens Next
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Questions */}
                            <div
                              className={containerPatterns.emptyStateTipCard}
                            >
                              <h3
                                className={
                                  typographyPatterns.emptyStateCardTitle
                                }
                              >
                                Quick Q&A
                              </h3>
                              <p
                                className={
                                  typographyPatterns.emptyStateCardText
                                }
                              >
                                I'll ask about your experience, what you're
                                training for, your schedule, and what you've got
                                to work with.
                              </p>
                            </div>

                            {/* Generation */}
                            <div
                              className={containerPatterns.emptyStateTipCard}
                            >
                              <h3
                                className={
                                  typographyPatterns.emptyStateCardTitle
                                }
                              >
                                AI Does Its Thing
                              </h3>
                              <p
                                className={
                                  typographyPatterns.emptyStateCardText
                                }
                              >
                                Answer the questions, I build your program.
                                Customized workouts, structured progression, the
                                whole deal.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Additional Tips */}
                        <div>
                          <h4
                            className={
                              typographyPatterns.emptyStateSectionHeader
                            }
                          >
                            Pro Tips
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Don't Hold Back */}
                            <div
                              className={containerPatterns.emptyStateTipCard}
                            >
                              <h3
                                className={
                                  typographyPatterns.emptyStateCardTitle
                                }
                              >
                                Don't Hold Back
                              </h3>
                              <p
                                className={
                                  typographyPatterns.emptyStateCardText
                                }
                              >
                                Got a wonky shoulder? Only 30 minutes to train?
                                Hate burpees with a passion? Tell me. I can't
                                help if I don't know.
                              </p>
                            </div>

                            {/* More = Better */}
                            <div
                              className={containerPatterns.emptyStateTipCard}
                            >
                              <h3
                                className={
                                  typographyPatterns.emptyStateCardTitle
                                }
                              >
                                More Detail = Better Program
                              </h3>
                              <p
                                className={
                                  typographyPatterns.emptyStateCardText
                                }
                              >
                                The more you tell me about what works for you,
                                the better I can dial in your program. Simple as
                                that. Trust the process.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pro Tip */}
                      <div className="text-center">
                        <p className={typographyPatterns.emptyStateProTip}>
                          Ready? Just send a message and let's get rolling.
                        </p>
                      </div>
                    </div>
                  )}

                {agentState.messages
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Ensure chronological order
                  .filter((message) => {
                    // Filter out empty streaming placeholder messages
                    const streaming = isMessageStreaming(message, agentState);
                    const hasContent =
                      message.content && message.content.trim().length > 0;
                    const hasStreamingContent =
                      agentState.streamingMessage &&
                      agentState.streamingMessage.trim().length > 0;

                    // Show message if: (1) it has content, OR (2) it's streaming and has streaming content
                    return hasContent || (streaming && hasStreamingContent);
                  })
                  .map((message, index) => (
                    <React.Fragment key={message.id}>
                      <MessageItem
                        message={message}
                        agentState={agentState}
                        coachName={agentState.coach?.name}
                        userEmail={userEmail}
                        userDisplayName={userDisplayName}
                        getUserInitial={getUserInitial}
                        formatTime={formatTime}
                        renderMessageContent={renderMessageContent}
                        conversationMode={conversationMode}
                      />
                    </React.Fragment>
                  ))}

                {/* Contextual Update Indicator - Shows AI processing stages (ephemeral) */}
                {agentState.contextualUpdate && (
                  <ContextualUpdateIndicator
                    content={agentState.contextualUpdate.content}
                    stage={agentState.contextualUpdate.stage}
                    coachName={agentState.coach?.name}
                  />
                )}

                {/* Typing Indicator - Show only when typing but not actively streaming content */}
                {typingState.showTypingIndicator &&
                  !agentState.contextualUpdate && (
                    <div className="flex flex-col items-start mb-1">
                      <div
                        className={
                          conversationMode === CONVERSATION_MODES.PROGRAM_DESIGN
                            ? containerPatterns.aiBuildModeBubble
                            : `${containerPatterns.aiChatBubble} px-4 py-3`
                        }
                      >
                        <div className="flex space-x-1">
                          <div
                            className={`w-2 h-2 rounded-full animate-bounce ${
                              conversationMode ===
                              CONVERSATION_MODES.PROGRAM_DESIGN
                                ? "bg-synthwave-neon-purple"
                                : "bg-synthwave-neon-cyan"
                            }`}
                          ></div>
                          <div
                            className={`w-2 h-2 rounded-full animate-bounce ${
                              conversationMode ===
                              CONVERSATION_MODES.PROGRAM_DESIGN
                                ? "bg-synthwave-neon-purple"
                                : "bg-synthwave-neon-cyan"
                            }`}
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className={`w-2 h-2 rounded-full animate-bounce ${
                              conversationMode ===
                              CONVERSATION_MODES.PROGRAM_DESIGN
                                ? "bg-synthwave-neon-purple"
                                : "bg-synthwave-neon-cyan"
                            }`}
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 px-2 mt-2">
                        <div
                          className={`flex-shrink-0 ${avatarPatterns.aiSmall}`}
                        >
                          {agentState.coach?.name?.charAt(0) || "C"}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Scroll anchor - always at the bottom */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Bottom Button - FORCE SHOWING FOR DEBUG */}
      <ScrollToBottomButton
        onClick={() => scrollToBottom()}
        show={showScrollButton}
      />

      {/* Chat Input Section - show completion banner when done, otherwise show input */}
      {agentState.isComplete ? (
        <div className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-purple/30 shadow-lg shadow-synthwave-neon-purple/20 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex justify-center">
            <div
              className={`${containerPatterns.coachNotesSection} flex items-center justify-between w-full max-w-[75%]`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-synthwave-neon-purple/10 border-2 border-synthwave-neon-purple flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-synthwave-neon-purple"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-russo text-base text-white uppercase tracking-wider">
                    Training Program Design Complete
                  </h3>
                  <p className="font-rajdhani text-sm text-synthwave-text-secondary mt-0.5">
                    Your program is being built (2-3 minutes). You can close
                    this page or navigate to your programs.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  navigate(
                    `/training-grounds/programs?userId=${userId}&coachId=${coachId}`,
                  )
                }
                className={`${buttonPatterns.secondarySmall} flex-shrink-0`}
              >
                View Training Programs
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ChatInput
          userId={userId}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSubmit={handleMessageSubmit}
          isTyping={typingState.isTyping}
          placeholder="What do you want to build?"
          coachName={agentState.coach?.name || "Coach"}
          isOnline={isOnline}
          context="program-design"
          showDeleteButton={true}
          onDeleteClick={handleDeleteClick}
          enableRecording={false}
          enableSlashCommands={false}
          availableSlashCommands={availableSlashCommands}
          showTipsButton={true}
          tipsContent={chatTips}
          tipsTitle="Program Design Tips"
          textareaRef={textareaRef}
          progressData={agentState.progress}
        />
      )}

      {/* Tooltips */}
      <Tooltip
        id="program-designer-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="beta-badge"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="coach-card-tooltip"
        {...tooltipPatterns.standard}
        place="bottom"
      />
      <Tooltip
        id="command-palette-button"
        {...tooltipPatterns.standard}
        place="bottom"
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Program Design Session
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this program design session?
                This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.successModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              {/* Header with inline icon */}
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-cyan/10 border-2 border-synthwave-neon-cyan flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-synthwave-neon-cyan"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-synthwave-neon-cyan font-rajdhani text-xl font-bold">
                  Training Program Design Complete!
                </h3>
              </div>

              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Great work! We're now crafting a personalized training program
                tailored specifically to your goals.
              </p>

              {/* Status Information - Enhanced Glassmorphism */}
              <div
                className={`${containerPatterns.subcontainerEnhanced} mb-6 text-left`}
              >
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-synthwave-neon-purple flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                      We're now building your custom training program
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-synthwave-neon-pink flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                      This usually takes 2-3 minutes to complete
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-synthwave-neon-cyan flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                      You can monitor the build progress on your Programs page
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base`}
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    navigate(
                      `/training-grounds/programs?userId=${userId}&coachId=${coachId}`,
                    )
                  }
                  className={`flex-1 ${buttonPatterns.primarySmall} text-base`}
                >
                  Go to Programs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramDesigner;
