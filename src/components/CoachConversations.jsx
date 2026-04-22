import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
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
  typographyPatterns,
} from "../utils/ui/uiPatterns";
import { FullPageLoader, CenteredErrorState } from "./shared/ErrorStates";
import CoachHeader from "./shared/CoachHeader";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import { InlineEditField } from "./shared/InlineEditField.jsx";
import ChatInput from "./shared/ChatInput";
import UserAvatar from "./shared/UserAvatar";
import { getUserInitial as getInitialFromUsername } from "./shared/UserAvatar";
import ScrollToBottomButton from "./shared/ScrollToBottomButton";
import { MarkdownRenderer } from "./shared/MarkdownRenderer";
import CoachConversationAgent from "../utils/agents/CoachConversationAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import { useToast } from "../contexts/ToastContext";
import { CONVERSATION_MODES } from "../constants/conversationModes";
import ImageWithPresignedUrl from "./shared/ImageWithPresignedUrl";
import DocumentThumbnail from "./shared/DocumentThumbnail";
import {
  sendMessageWithStreaming,
  isMessageStreaming,
  getMessageDisplayContent,
  getStreamingMessageClasses,
  getTypingState,
  handleStreamingError,
  ContextualUpdateIndicator,
  MessageFooter,
} from "../utils/ui/streamingUiHelper.jsx";
import IconButton from "./shared/IconButton";
import CoachConversationEmptyTips from "./shared/CoachConversationEmptyTips";
import { logger } from "../utils/logger";
import { useChatScroll } from "../hooks/useChatScroll";
import {
  WorkoutIconSmall,
  ChatIconTiny,
  CloseIcon,
  TrashIcon,
  MicIcon,
  PaperclipIcon,
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
  <div className="flex space-x-1.5 p-4">
    <div
      className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
      style={{ animationDelay: "0ms" }}
    ></div>
    <div
      className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
      style={{ animationDelay: "0.2s" }}
    ></div>
    <div
      className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
      style={{ animationDelay: "0.4s" }}
    ></div>
  </div>
);

// ContextualUpdateIndicator and MessageFooter imported from streamingUiHelper.jsx

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
    const isCurrentlyStreaming = isMessageStreaming(message, agentState);

    if (message.type === "user") {
      return (
        <div className="flex flex-row-reverse items-start gap-3 mb-8 group animate-message-in">
          {/* User avatar: anchored top-right, never shifts */}
          <div className="shrink-0 mt-1">
            <UserAvatar
              email={userEmail}
              username={userDisplayName}
              size={32}
            />
          </div>
          {/* Content column */}
          <div className="min-w-0 flex flex-col items-end md:max-w-[85%]">
            <div
              className={getStreamingMessageClasses(
                message,
                agentState,
                containerPatterns.userMessageBubble,
              )}
            >
              <div className="font-body text-base leading-relaxed">
                {renderMessageContent(message)}
              </div>
            </div>
            <MessageFooter
              isCurrentlyStreaming={isCurrentlyStreaming}
              timestamp={message.timestamp}
              messageType={message.type}
              messageContent={message.content}
              formatTime={formatTime}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-row items-start gap-3 mb-8 group animate-message-in">
        {/* AI avatar: anchored top-left, never shifts as content grows */}
        <div className="shrink-0 mt-1">
          <div className={avatarPatterns.aiSmall}>
            {coachName?.charAt(0) || "C"}
          </div>
        </div>
        {/* Content column */}
        <div className="min-w-0 flex-1 flex flex-col">
          {/* Coaching Chat Indicator Badge */}
          {message.metadata?.mode === CONVERSATION_MODES.CHAT && (
            <div className={`${buttonPatterns.modeBadgeChat} mb-1`}>
              <ChatIconTiny className="w-3 h-3" />
              <span className="translate-y-px">Coaching Chat</span>
            </div>
          )}

          {/* Guardrail Warning Banner */}
          {message.metadata?.guardrailWarning && (
            <div className={`${containerPatterns.guardrailWarningBanner}`}>
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              <span>Safety review flagged this response.</span>
            </div>
          )}

          <div
            className={getStreamingMessageClasses(
              message,
              agentState,
              "w-full min-w-0",
            )}
          >
            <div className="font-ai text-base leading-relaxed text-synthwave-text-secondary break-words">
              {renderMessageContent(message)}
            </div>
          </div>

          <MessageFooter
            isCurrentlyStreaming={isCurrentlyStreaming}
            timestamp={message.timestamp}
            messageType={message.type}
            messageContent={message.content}
            formatTime={formatTime}
          />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
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

    return !(messageChanged || streamingStateChanged || coachNameChanged || userChanged);
  },
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
  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modern chat features state
  const [isOnline] = useState(true);
  const textareaRef = useRef(null);

  // Add flag to prevent double execution from React StrictMode
  const isSendingMessage = useRef(false);

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const { success: showSuccess, error: showError } = useToast();

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

  // Polling state for newly created conversations
  const [isPollingForMessages, setIsPollingForMessages] = useState(false);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const pollingConversationIdRef = useRef(null); // Track which conversation is being polled
  const hasAttemptedPollingRef = useRef(null); // Track if we've tried to start polling for this conversation

  // NOTE: conversationMode state removed - mode is now AI-detected automatically
  // Mode is determined from message metadata for UI indicators

  // Derive current mode from active sessions for UI styling (typing indicator, etc.)
  const getCurrentMode = () => {
    // Check for active workout session
    if (
      coachConversationAgentState.conversation?.workoutCreatorSession
        ?.isComplete === false
    ) {
      return CONVERSATION_MODES.WORKOUT_LOG;
    }

    // Default to chat mode (program design is now in dedicated screen)
    return CONVERSATION_MODES.CHAT;
  };

  const conversationMode = getCurrentMode();

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
          // Normal React batching handles streaming updates efficiently
          setCoachConversationAgentState(newState);
        },
        onNavigation: (type, data) => {
          if (type === "conversation-not-found") {
            navigate(
              `/training-grounds/manage-conversations?userId=${userId}&coachId=${coachId}`,
              { replace: true },
            );
          }
        },
        onError: (error) => {
          logger.error("Agent error:", error);
          // Could show toast notification here
        },
      });

      // Load the conversation after agent is ready
      setTimeout(() => {
        if (agentRef.current) {
          agentRef.current.loadExistingConversation(
            userId,
            coachId,
            conversationId,
          );

          // Note: Conversations list will be loaded when popover is opened via FloatingMenuManager
        }
      }, 50);
    } else {
      // Agent exists, but conversationId changed - load new conversation
      agentRef.current.loadExistingConversation(
        userId,
        coachId,
        conversationId,
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

    // NEVER poll if there are no messages - polling is ONLY for conversations with pending AI responses
    // Empty conversations show the canned greeting instead
    if (coachConversationAgentState.messages.length === 0) {
      logger.info(
        `⏭️ Skipping polling for empty conversation (no messages to wait for)`,
      );
      hasAttemptedPollingRef.current = conversationId;
      return;
    }

    // If there ARE messages, don't poll (messages already loaded)
    if (coachConversationAgentState.messages.length > 0) {
      hasAttemptedPollingRef.current = conversationId;
      return;
    }

    // Mark that we've attempted polling for this conversation
    hasAttemptedPollingRef.current = conversationId;

    const startTime = Date.now();
    logger.info(
      `🔄 [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Starting polling for initial messages in conversation: ${conversationId}`,
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
      logger.info(
        `🔄 [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Polling for messages... (${elapsedSeconds}s elapsed)`,
      );
      if (agentRef.current) {
        agentRef.current.loadExistingConversation(
          currentUserId,
          currentCoachId,
          currentConversationId,
        );
      }
    }, 3000);
    pollingIntervalRef.current = intervalId;

    // Stop polling after 90 seconds
    const timeoutId = setTimeout(() => {
      logger.info(
        `⏱️ [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Polling timeout reached (90s), stopping polling`,
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
      logger.info(
        `✅ [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Messages loaded (${coachConversationAgentState.messages.length} messages), stopping polling`,
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

  const { scrollToBottom, showScrollButton, messagesEndRef } = useChatScroll(
    coachConversationAgentState,
    [
      coachConversationAgentState.messages,
      coachConversationAgentState.isTyping,
      coachConversationAgentState.contextualUpdate,
      coachConversationAgentState.isLoadingItem,
    ],
  );

  // Voice recording functions moved to ChatInput component

  // Focus input when chat interface is visible
  useEffect(() => {
    if (userId && coachId && conversationId && textareaRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Focus the editor via textareaRef compatibility layer
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
          // Focus the editor via textareaRef compatibility layer
        }
      }, 100);
    }
  }, [
    coachConversationAgentState.coach,
    coachConversationAgentState.isLoadingItem,
  ]);

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
    { success: showSuccess, error: showError },
  );

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Prevent double execution from React StrictMode
    if (isSendingMessage.current || !inputMessage.trim() || !agentRef.current)
      return;

    isSendingMessage.current = true;
    const messageToSend = inputMessage.trim();
    setInputMessage("");

    // Refocus input after clearing
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);

    try {
      await sendMessageWithStreaming(agentRef.current, messageToSend, [], {
        onStreamingStart: () => {},
        onStreamingError: (error) => {
          handleStreamingError(error, { error: showError });
        },
      });
    } catch (error) {
      logger.error("Error sending message:", error);
      handleStreamingError(error, { error: showError });
    } finally {
      // Reset flag after message is sent (success or failure)
      isSendingMessage.current = false;
    }
  };

  // Message submission handler for ChatInput component
  const handleMessageSubmit = async (
    messageContent,
    imageS3Keys = [],
    documentS3Keys = [],
  ) => {
    // Prevent double execution from React StrictMode or duplicate events
    if (isSendingMessage.current || !agentRef.current) return;

    // Validate input - require either text, images, or documents
    const hasImages = imageS3Keys && imageS3Keys.length > 0;
    const hasDocuments = documentS3Keys && documentS3Keys.length > 0;
    if (!messageContent?.trim() && !hasImages && !hasDocuments) {
      return;
    }

    isSendingMessage.current = true;

    try {
      await sendMessageWithStreaming(
        agentRef.current,
        messageContent,
        imageS3Keys,
        {
          onStreamingStart: () => {
            // Streaming started - instant scroll to show new message
            setTimeout(() => scrollToBottom(true), 50);
          },
          onStreamingError: (error) => {
            handleStreamingError(error, { error: showError });
          },
        },
        documentS3Keys,
      );

      // Scroll after message is sent to ensure we're at the bottom
      // Use timeout to ensure React has rendered the new message
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      logger.error("Error sending message:", error);
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
        { title: newTitle.trim() },
      );
      showSuccess("Conversation title updated successfully");
    } catch (error) {
      logger.error("Error updating conversation title:", error);
      showError("Failed to update conversation title");
      throw error;
    }
  };

  // NOTE: Mode toggle removed - mode is now AI-detected automatically
  // The UI still shows mode badges based on message metadata

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
        conversationId,
      );
      if (success) {
        showSuccess("Conversation deleted successfully");
      } else {
        showError("Failed to delete conversation");
      }
    } catch (error) {
      logger.error("Error deleting conversation:", error);
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
      coachConversationAgentState,
    );
    const streaming = isMessageStreaming(message, coachConversationAgentState);

    return (
      <>
        {/* Render attachments — images and documents share one row */}
        {((message.imageS3Keys && message.imageS3Keys.length > 0) ||
          (message.documentS3Keys && message.documentS3Keys.length > 0)) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.imageS3Keys?.map((s3Key, index) => (
              <ImageWithPresignedUrl
                key={index}
                s3Key={s3Key}
                userId={userId}
                index={index}
              />
            ))}
            {message.documentS3Keys?.map((s3Key, index) => (
              <DocumentThumbnail key={index} s3Key={s3Key} userId={userId} />
            ))}
          </div>
        )}

        {/* Render text content */}
        {displayContent &&
          (message.type === "ai" ? (
            // AI messages use full markdown parsing with streaming cursor
            <MarkdownRenderer
              content={displayContent}
              className={streaming && displayContent ? "streaming-cursor" : ""}
            />
          ) : (
            // User messages: simple line break rendering
            displayContent.split("\n").map((line, index, array) => (
              <span key={index}>
                {line}
                {index < array.length - 1 && <br />}
              </span>
            ))
          ))}
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
        <div className={`${layoutPatterns.contentWrapper} !px-4 sm:!px-6`}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              {/* Title skeleton - compact size */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 animate-pulse w-72"></div>

              {/* Compact coach card skeleton - horizontal pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right: Command button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-md animate-pulse"></div>
          </header>

          {/* Conversation Title skeleton */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-2">
                {/* "Conversation Title:" label skeleton */}
                <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-36"></div>
                {/* Title value skeleton */}
                <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
              </div>
            </div>
          </div>

          {/* Main Content Area skeleton */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-5xl">
              <div className="h-[500px] flex flex-col">
                {/* Messages Area skeleton */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-3">
                  {/* Chat message skeletons */}
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className={`flex flex-col mb-1 ${i % 2 === 1 ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`w-full min-w-0 ${i % 2 === 1 ? "md:max-w-[85%] items-end" : "items-start"} flex flex-col`}
                      >
                        {i % 2 === 1 ? (
                          /* User message: keep bubble container */
                          <div className="rounded-md px-4 py-3 bg-synthwave-text-muted/20 animate-pulse w-full min-h-[100px]">
                            <div className="space-y-1">
                              <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                              <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                              <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-3/4"></div>
                            </div>
                          </div>
                        ) : (
                          /* AI message: no bubble, text lines printed directly */
                          <div className="space-y-1 py-3 w-full min-h-[100px]">
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-3/4"></div>
                          </div>
                        )}

                        {/* Avatar, timestamp, and status skeleton - all on same line below message */}
                        <div
                          className={`flex items-start gap-2 px-2 mt-2 ${i % 2 === 1 ? "justify-end" : "justify-start"}`}
                        >
                          {/* Avatar skeleton for AI (left side) */}
                          {i % 2 === 0 && (
                            <div className="shrink-0 w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                          )}

                          <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-12"></div>
                          <div className="flex gap-1">
                            <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                          </div>

                          {/* Avatar skeleton for user (right side) */}
                          {i % 2 === 1 && (
                            <div className="shrink-0 w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                          )}
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
      <div className={`${layoutPatterns.contentWrapper} !px-4 sm:!px-6`}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Coach Conversation Header"
        >
          {/* Left section: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Hover Tooltip */}
            <h1
              className="font-header font-bold text-2xl md:text-3xl text-gradient-neon uppercase tracking-wider cursor-help"
              data-tooltip-id="coach-conversation-info"
              data-tooltip-content="Get personalized coaching, workout advice, and motivation from your AI coach. The more you share, the more your coach learns."
            >
              Conversation Details
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

        {/* Conversation Title - styled to match ViewWorkouts metadata section */}
        {coachConversationAgentState.conversation &&
          coachConversationAgentState.conversation.title && (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="font-body text-lg text-white flex flex-col md:flex-row md:items-center">
                  <span className="text-synthwave-neon-cyan md:mr-2 whitespace-nowrap mb-1 md:mb-0">
                    Topic:
                  </span>
                  <InlineEditField
                    value={coachConversationAgentState.conversation.title}
                    onSave={handleSaveConversationTitle}
                    placeholder="Enter conversation title..."
                    maxLength={100}
                    showCharacterCount={false}
                    size="medium"
                    displayClassName="text-white font-body text-lg"
                    tooltipPrefix="conversation-title"
                  />
                </div>
              </div>
            </div>
          )}

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-5xl">
            {/* Removed mainContent container for immersive chat UX - messages flow edge-to-edge */}
            <div className="h-full flex flex-col">
              {/* Messages Area - with bottom padding for floating input */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-x-hidden px-2 sm:px-6 py-3 sm:py-6 space-y-8 synthwave-scrollbar-cyan"
                style={{
                  paddingBottom: "calc(var(--chat-input-height, 160px) + 8px)",
                }}
              >
                {/* Empty State - Show tips when no messages */}
                {coachConversationAgentState.messages.length === 0 &&
                  !coachConversationAgentState.isTyping &&
                  !coachConversationAgentState.isStreaming && (
                    <CoachConversationEmptyTips variant="page" />
                  )}

                {coachConversationAgentState.messages
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Ensure chronological order
                  .filter((message) => {
                    // Filter out empty streaming placeholder messages
                    const streaming = isMessageStreaming(
                      message,
                      coachConversationAgentState,
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
                    <React.Fragment key={message.id}>
                      <MessageItem
                        message={message}
                        agentState={coachConversationAgentState}
                        coachName={coachConversationAgentState.coach?.name}
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
                {coachConversationAgentState.contextualUpdate && (
                  <ContextualUpdateIndicator
                    content={
                      coachConversationAgentState.contextualUpdate.content
                    }
                    avatarLabel={
                      coachConversationAgentState.coach?.name?.charAt(0) || "C"
                    }
                  />
                )}

                {/* Typing Indicator - Show only when typing but not actively streaming content */}
                {typingState.showTypingIndicator &&
                  !coachConversationAgentState.contextualUpdate && (
                    <div className="flex flex-row items-start gap-3 mb-1 animate-message-in">
                      <div className={`shrink-0 mt-1 ${avatarPatterns.aiSmall}`}>
                        {coachConversationAgentState.coach?.name?.charAt(0) ||
                          "C"}
                      </div>
                      <div
                        className={`${containerPatterns.aiChatBubble} px-4 py-3`}
                      >
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"></div>
                          <div
                            className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-typing-dot"
                            style={{ animationDelay: "0.4s" }}
                          ></div>
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
        enableRecording={false}
        enableSlashCommands={true}
        availableSlashCommands={availableSlashCommands}
        showTipsButton={true}
        tipsContent={chatTips}
        tipsTitle="Chat tips & help"
        textareaRef={textareaRef}
        conversationSize={coachConversationAgentState.conversationSize}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-body text-xl font-bold mb-2">
                Delete Conversation
              </h3>
              <p className="font-body text-base text-synthwave-text-secondary mb-6">
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
