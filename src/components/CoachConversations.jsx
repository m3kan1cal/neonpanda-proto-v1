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
} from "../utils/uiPatterns";
import { FullPageLoader, CenteredErrorState } from "./shared/ErrorStates";
import CoachHeader from "./shared/CoachHeader";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { InlineEditField } from "./shared/InlineEditField.jsx";
import ChatInput from "./shared/ChatInput";
import UserAvatar from "./shared/UserAvatar";
import { getUserInitial as getInitialFromUsername } from "./shared/UserAvatar";
import { parseMarkdown } from "../utils/markdownParser.jsx";
import CoachConversationAgent from "../utils/agents/CoachConversationAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import { useToast } from "../contexts/ToastContext";
import ImageWithPresignedUrl from "./shared/ImageWithPresignedUrl";
import {
  sendMessageWithStreaming,
  isMessageStreaming,
  getMessageDisplayContent,
  getStreamingMessageClasses,
  getTypingState,
  handleStreamingError,
  supportsStreaming,
} from "../utils/ui/streamingUiHelper.jsx";
import { FloatingMenuManager } from "./shared/FloatingMenuManager";
import CommandPalette from "./shared/CommandPalette";
import IconButton from "./shared/IconButton";
import {
  WorkoutIconSmall,
  CloseIcon,
  TrashIcon,
  MicIcon,
  PaperclipIcon,
  CameraIcon,
  SmileIcon,
  XIcon,
  SendIcon,
  PlusIcon,
} from "./themes/SynthwaveComponents";
// Icons now imported from SynthwaveComponents for reusability

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
    <div className="flex items-end gap-2 mb-1">
      <div className={`flex-shrink-0 ${avatarPatterns.aiSmall}`}>
        {coachName?.charAt(0) || "C"}
      </div>
      <div className="px-4 py-2">
        <span className="font-rajdhani text-base italic animate-pulse text-synthwave-text-secondary/70">
          {content}
        </span>
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
  }) => {
    return (
      <div
        className={`flex items-end gap-2 mb-1 group ${
          message.type === "user" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {message.type === "user" ? (
            <UserAvatar
              email={userEmail}
              username={userDisplayName}
              size={32}
            />
          ) : (
            <div className={avatarPatterns.aiSmall}>
              {coachName?.charAt(0) || "C"}
            </div>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`max-w-[95%] sm:max-w-[70%] ${message.type === "user" ? "items-end" : "items-start"} flex flex-col`}
        >
          <div
            className={getStreamingMessageClasses(
              message,
              agentState,
              `px-4 py-3 rounded-2xl shadow-sm ${
                message.type === "user"
                  ? "bg-gradient-to-br from-synthwave-neon-pink/80 to-synthwave-neon-pink/60 text-white border-0 rounded-br-md shadow-xl shadow-synthwave-neon-pink/30 backdrop-blur-sm"
                  : containerPatterns.aiChatBubble
              }`
            )}
          >
            <div className="font-rajdhani text-base leading-relaxed">
              {renderMessageContent(message)}
            </div>
          </div>

          <div
            className={`flex items-center gap-1 px-2 mt-1 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <span className="text-xs text-synthwave-text-secondary font-rajdhani">
              {formatTime(message.timestamp)}
            </span>
            {message.type === "user" && (
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink opacity-60"></div>
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink"></div>
              </div>
            )}
            {message.type === "ai" && (
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-cyan opacity-60"></div>
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-cyan"></div>
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

    const messageChanged =
      prevProps.message.id !== nextProps.message.id ||
      prevProps.message.content !== nextProps.message.content;

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
  }
);

// Add display name for debugging
MessageItem.displayName = "MessageItem";

function CoachConversations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");
  const conversationId = searchParams.get("conversationId");

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
  const [showNewConversation, setShowNewConversation] =
    useState(!conversationId);

  // Slash command states moved to ChatInput component

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState("");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modern chat features state
  const [isOnline] = useState(true);
  const textareaRef = useRef(null);

  // Add flag to prevent double execution from React StrictMode
  const isSendingMessage = useRef(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const { success: showSuccess, error: showError } = useToast();

  // Slash commands configuration
  const availableSlashCommands = [
    {
      command: "/log-workout",
      description: "Log a completed workout",
      example: "/log-workout I did Fran in 8:57",
    },
    {
      command: "/save-memory",
      description: "Save a memory or note",
      example: "/save-memory I prefer morning workouts",
    },
  ];

  // Quick suggestions configuration
  const quickSuggestions = [
    { label: "Log Workout", message: "/log-workout " },
    {
      label: "Daily Check-in",
      message: "I'm checking in for the day. What do I need to be aware of?",
    },
    {
      label: "Progression",
      message: "I want to progress/increase the difficulty of my workouts.",
    },
    {
      label: "Motivation",
      message: "I'm feeling unmotivated. Can you help me get back on track?",
    },
    {
      label: "WOD Creation",
      message: "Create a WOD for me today based on my goals and training plan.",
    },
  ];

  // Chat tips content
  const chatTips = {
    items: [
      {
        title: "Slash Commands",
        description:
          "Type '/' to see available commands like /log-workout or /save-memory for quick actions.",
      },
      {
        title: "Be Specific",
        description:
          "The more details you provide about your workouts, goals, and challenges, the better your coach can help.",
      },
      {
        title: "Track Progress",
        description:
          "Regularly log your workouts and share how you're feeling to help your coach adapt your training.",
      },
      {
        title: "Ask Questions",
        description:
          "Don't hesitate to ask about form, modifications, nutrition, or anything fitness-related.",
      },
    ],
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      // Cmd/Ctrl + K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setCommandPaletteCommand("");
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [isCommandPaletteOpen]);

  // Agent state (managed by CoachConversationAgent)
  const [coachConversationAgentState, setCoachConversationAgentState] =
    useState({
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

  // Polling state for newly created conversations
  const [isPollingForMessages, setIsPollingForMessages] = useState(false);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const pollingConversationIdRef = useRef(null); // Track which conversation is being polled
  const hasAttemptedPollingRef = useRef(null); // Track if we've tried to start polling for this conversation

  // Debug: Track component re-renders during streaming

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !coachId || !conversationId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, coachId, conversationId, navigate]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId);
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
      if (coachAgentRef.current) {
        coachAgentRef.current.destroy();
        coachAgentRef.current = null;
      }
    };
  }, [userId]);

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

  // Initialize agent
  useEffect(() => {
    if (!userId || !coachId || !conversationId) return;

    // Reset agent state when conversationId changes to ensure loading state is shown
    setCoachConversationAgentState((prevState) => ({
      ...prevState,
      conversation: null,
      messages: [],
      isLoadingItem: true,
    }));

    if (!agentRef.current) {
      agentRef.current = new CoachConversationAgent({
        userId,
        coachId,
        conversationId,
        onStateChange: (newState) => {
          // Use flushSync for streaming updates to force immediate synchronous rendering
          if (newState.isStreaming || newState.streamingMessage) {
            flushSync(() => {
              setCoachConversationAgentState(newState);
            });
          } else {
            // Normal async update for non-streaming changes
            setCoachConversationAgentState(newState);
          }
        },
        onNavigation: (type, data) => {
          if (type === "conversation-not-found") {
            navigate(
              `/training-grounds/manage-conversations?userId=${userId}&coachId=${coachId}`,
              { replace: true }
            );
          }
        },
        onError: (error) => {
          console.error("Agent error:", error);
          // Could show toast notification here
        },
      });

      // Load the conversation after agent is ready
      setTimeout(() => {
        if (agentRef.current) {
          agentRef.current.loadExistingConversation(
            userId,
            coachId,
            conversationId
          );

          // Note: Conversations list will be loaded when popover is opened via FloatingMenuManager
        }
      }, 50);
    } else {
      // Agent exists, but conversationId changed - load new conversation
      agentRef.current.loadExistingConversation(
        userId,
        coachId,
        conversationId
      );
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId, coachId, conversationId, navigate]);

  // Effect 1: Reset polling state when conversationId changes
  useEffect(() => {
    hasAttemptedPollingRef.current = null;
    pollingConversationIdRef.current = null;

    // Cleanup any existing polling from previous conversation
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setIsPollingForMessages(false);
  }, [conversationId]);

  // Effect 2: Start polling when conversation loads (only once per conversationId)
  useEffect(() => {
    // Skip if we've already attempted polling for this conversation
    if (hasAttemptedPollingRef.current === conversationId) {
      return;
    }

    // Skip if we don't have the basic requirements
    if (!userId || !coachId || !conversationId) return;
    if (!coachConversationAgentState.conversation) return;
    if (coachConversationAgentState.messages.length > 0) return;

    // Mark that we've attempted polling for this conversation
    hasAttemptedPollingRef.current = conversationId;

    const startTime = Date.now();
    console.info(
      `🔄 [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Starting polling for initial messages in conversation: ${conversationId}`
    );

    // Capture values in closure
    const currentConversationId = conversationId;
    const currentUserId = userId;
    const currentCoachId = coachId;

    // Track which conversation we're polling
    pollingConversationIdRef.current = conversationId;

    // Set UI flag to keep skeleton visible
    setIsPollingForMessages(true);

    // Poll every 3 seconds
    const intervalId = setInterval(() => {
      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      console.info(
        `🔄 [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Polling for messages... (${elapsedSeconds}s elapsed)`
      );
      if (agentRef.current) {
        agentRef.current.loadExistingConversation(
          currentUserId,
          currentCoachId,
          currentConversationId
        );
      }
    }, 3000);
    pollingIntervalRef.current = intervalId;

    // Stop polling after 90 seconds
    const timeoutId = setTimeout(() => {
      console.info(
        `⏱️ [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Polling timeout reached (90s), stopping polling`
      );
      setIsPollingForMessages(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        pollingConversationIdRef.current = null;
      }
    }, 90000);
    pollingTimeoutRef.current = timeoutId;
  }, [
    conversationId,
    userId,
    coachId,
    coachConversationAgentState.conversation,
  ]); // React to conversation loading

  // Effect 3: Stop polling when messages arrive
  useEffect(() => {
    if (
      coachConversationAgentState.messages.length > 0 &&
      pollingIntervalRef.current
    ) {
      console.info(
        `✅ [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Messages loaded (${coachConversationAgentState.messages.length} messages), stopping polling`
      );
      setIsPollingForMessages(false);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      pollingConversationIdRef.current = null;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    }
  }, [coachConversationAgentState.messages.length]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Try scrollIntoView first (preferred for smooth scrolling)
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });

      // Fallback: Also try to scroll the messages container directly
      const messagesContainer =
        messagesEndRef.current.closest(".overflow-y-auto");
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

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

  // Voice recording functions moved to ChatInput component

  // Auto-scroll page to top when component loads (with scroll restoration disabled)
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  // Scroll page to top after loading completes
  useEffect(() => {
    if (
      !isValidatingUserId &&
      !coachConversationAgentState.isLoadingItem &&
      !isPollingForMessages
    ) {
      window.scrollTo(0, 0);
    }
  }, [
    isValidatingUserId,
    coachConversationAgentState.isLoadingItem,
    isPollingForMessages,
  ]);

  useEffect(() => {
    // Use a small delay to ensure DOM is fully updated before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    coachConversationAgentState.messages,
    coachConversationAgentState.isTyping,
    coachConversationAgentState.contextualUpdate,
  ]);

  // Scroll to bottom when conversation is first loaded
  useEffect(() => {
    if (
      coachConversationAgentState.messages.length > 0 &&
      !coachConversationAgentState.isLoadingItem &&
      coachConversationAgentState.conversation
    ) {
      // Use a longer delay for initial load to ensure everything is rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [
    coachConversationAgentState.messages.length,
    coachConversationAgentState.isLoadingItem,
    coachConversationAgentState.conversation,
  ]);

  // Focus input when chat interface is visible
  useEffect(() => {
    if (userId && coachId && conversationId && textareaRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Don't call autoResizeTextarea on focus to prevent height jumps
        }
      }, 100);
    }
  }, [userId, coachId, conversationId]);

  // Also focus when the coach data is loaded (for page refresh scenarios)
  useEffect(() => {
    if (
      coachConversationAgentState.coach &&
      textareaRef.current &&
      !coachConversationAgentState.isLoadingItem
    ) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Don't call autoResizeTextarea on focus to prevent height jumps
        }
      }, 100);
    }
  }, [
    coachConversationAgentState.coach,
    coachConversationAgentState.isLoadingItem,
  ]);

  useEffect(() => {
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [inputMessage]);

  // Additional effect to ensure textarea resizes properly when AI stops typing
  useEffect(() => {
    if (textareaRef.current && !coachConversationAgentState.isTyping) {
      // Small delay to ensure the textarea is re-enabled before resizing
      setTimeout(() => {
        if (textareaRef.current) {
          autoResizeTextarea(textareaRef.current);
        }
      }, 10);
    }
  }, [coachConversationAgentState.isTyping]);

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Create coach name handler using the agent's helper method
  const handleSaveCoachName = coachAgentRef.current?.createCoachNameHandler(
    userId,
    coachId,
    (newName) =>
      setCoachConversationAgentState((prevState) => ({
        ...prevState,
        coach: {
          ...prevState.coach,
          name: newName,
        },
      })),
    { success: showSuccess, error: showError }
  );

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
            // Streaming started - scroll to show new message
            setTimeout(() => scrollToBottom(), 100);
          },
          onStreamingError: (error) => {
            handleStreamingError(error, { error: showError });
          },
        }
      );

      // Scroll after message is sent to ensure we're at the bottom
      setTimeout(() => scrollToBottom(), 150);
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

  const handleSaveConversationTitle = async (newTitle) => {
    if (!agentRef.current) {
      throw new Error("Conversation agent not initialized");
    }

    try {
      await agentRef.current.updateCoachConversation(
        userId,
        coachId,
        conversationId,
        { title: newTitle.trim() }
      );
      showSuccess("Conversation title updated successfully");
    } catch (error) {
      console.error("Error updating conversation title:", error);
      showError("Failed to update conversation title");
      throw error;
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting || !agentRef.current) return;

    setIsDeleting(true);
    try {
      const success = await agentRef.current.deleteCoachConversation(
        userId,
        coachId,
        conversationId
      );
      if (success) {
        showSuccess("Conversation deleted successfully");
      } else {
        showError("Failed to delete conversation");
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      showError("Failed to delete conversation");
    } finally {
      setShowDeleteModal(false);
      // Always redirect to training grounds after attempted deletion
      navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`, {
        replace: true,
      });
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  // Slash command parsing moved to ChatInput component

  // Helper function to render message content with line breaks and streaming support
  // Removed useCallback to prevent memoization issues during streaming
  const renderMessageContent = (message) => {
    // Get the appropriate content (streaming or final)
    const displayContent = getMessageDisplayContent(
      message,
      coachConversationAgentState
    );

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
  const typingState = getTypingState(coachConversationAgentState);

  // Slash command functionality moved to ChatInput component

  // Show loading state while initializing coach or loading conversation (but not while deleting)
  if (
    !isDeleting &&
    (isValidatingUserId ||
      coachConversationAgentState.isLoadingItem ||
      isPollingForMessages ||
      !coachConversationAgentState.coach ||
      !coachConversationAgentState.conversation ||
      (coachConversationAgentState.conversation &&
        coachConversationAgentState.conversation.conversationId !==
          conversationId))
  ) {
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

          {/* Main Content Area skeleton */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-7xl">
              <div
                className={`${containerPatterns.mainContent} h-[500px] flex flex-col`}
              >
                {/* Messages Area skeleton */}
                <div className="flex-1 overflow-y-auto overflow-hidden p-6 space-y-3">
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
                        className={`max-w-[70%] ${i % 2 === 1 ? "items-end" : "items-start"} flex flex-col`}
                      >
                        <div
                          className={`px-4 py-3 rounded-2xl ${i % 2 === 1 ? "rounded-br-md" : "rounded-bl-md"} bg-synthwave-text-muted/20 animate-pulse min-w-[600px] min-h-[130px]`}
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
        <ChatInput showSkeleton={true} />
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

  // Show error state
  if (coachConversationAgentState.error && !coachConversationAgentState.coach) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={coachConversationAgentState.error}
        buttonText="Back to Training Grounds"
        onButtonClick={() =>
          navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`)
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
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="coach-conversation-info"
              data-tooltip-content="Get personalized coaching, workout advice, and motivation from your AI coach. The more you share, the more your coach learns."
            >
              Coach Conversation
            </h1>

            {/* Compact Coach Card */}
            {coachConversationAgentState.coach && (
              <CompactCoachCard
                coachData={coachConversationAgentState.coach}
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

        {/* Conversation Title - moved below header */}
        {coachConversationAgentState.conversation &&
          coachConversationAgentState.conversation.title && (
            <div className="font-rajdhani text-base text-synthwave-text-secondary mb-6 flex items-center">
              <span className="text-synthwave-neon-pink mr-2">Topic:</span>
              <InlineEditField
                value={coachConversationAgentState.conversation.title}
                onSave={handleSaveConversationTitle}
                placeholder="Enter conversation title..."
                maxLength={100}
                showCharacterCount={false}
                size="medium"
                displayClassName="text-synthwave-text-secondary font-rajdhani text-base"
                tooltipPrefix="conversation-title"
              />
            </div>
          )}

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            <div
              className={`sm:${containerPatterns.mainContent} h-full flex flex-col`}
            >
              {/* Messages Area - with bottom padding for floating input */}
              <div className="flex-1 overflow-y-auto overflow-hidden p-3 sm:p-6 pb-32 sm:pb-48 space-y-4">
                {coachConversationAgentState.messages
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Ensure chronological order
                  .filter((message) => {
                    // Filter out empty streaming placeholder messages
                    const streaming = isMessageStreaming(
                      message,
                      coachConversationAgentState
                    );
                    const hasContent =
                      message.content && message.content.trim().length > 0;
                    const hasStreamingContent =
                      coachConversationAgentState.streamingMessage &&
                      coachConversationAgentState.streamingMessage.trim()
                        .length > 0;

                    // Show message if: (1) it has content, OR (2) it's streaming and has streaming content
                    return hasContent || (streaming && hasStreamingContent);
                  })
                  .map((message, index) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      agentState={coachConversationAgentState}
                      coachName={coachConversationAgentState.coach?.name}
                      userEmail={userEmail}
                      userDisplayName={userDisplayName}
                      getUserInitial={getUserInitial}
                      formatTime={formatTime}
                      renderMessageContent={renderMessageContent}
                    />
                  ))}

                {/* Contextual Update Indicator - Shows AI processing stages (ephemeral) */}
                {coachConversationAgentState.contextualUpdate && (
                  <ContextualUpdateIndicator
                    content={
                      coachConversationAgentState.contextualUpdate.content
                    }
                    stage={coachConversationAgentState.contextualUpdate.stage}
                    coachName={coachConversationAgentState.coach?.name}
                  />
                )}

                {/* Typing Indicator - Show only when typing but not actively streaming content */}
                {typingState.showTypingIndicator &&
                  !coachConversationAgentState.contextualUpdate && (
                    <div className="flex items-end gap-2 mb-1">
                      <div
                        className={`flex-shrink-0 ${avatarPatterns.aiSmall}`}
                      >
                        {coachConversationAgentState.coach?.name?.charAt(0) ||
                          "C"}
                      </div>
                      <div
                        className={`${containerPatterns.aiChatBubble} px-4 py-3`}
                      >
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Input Component */}
      <ChatInput
        userId={userId}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        onSubmit={handleMessageSubmit}
        isTyping={typingState.isTyping}
        placeholder="How can I help with your training?"
        coachName={coachConversationAgentState.coach?.name || "Coach"}
        isOnline={isOnline}
        context="coaching"
        showDeleteButton={true}
        onDeleteClick={handleDeleteClick}
        enableRecording={true}
        enableSlashCommands={true}
        availableSlashCommands={availableSlashCommands}
        showTipsButton={true}
        tipsContent={chatTips}
        tipsTitle="Chat tips & help"
        textareaRef={textareaRef}
        conversationSize={coachConversationAgentState.conversationSize}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand("");
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={workoutAgentRef.current}
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === "conversation-created") {
            navigate(
              `/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`
            );
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="coach-conversations"
        coachData={coachConversationAgentState.coach}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Conversation
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this conversation? This action
                cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
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

      {/* Tooltips */}
      <Tooltip
        id="coach-conversation-info"
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
    </div>
  );
}

export default CoachConversations;
