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
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import { containerPatterns, layoutPatterns, inputPatterns, avatarPatterns, iconButtonPatterns, buttonPatterns } from "../utils/uiPatterns";
import { FullPageLoader, CenteredErrorState } from "./shared/ErrorStates";
import CoachHeader from "./shared/CoachHeader";
import ChatInput from "./shared/ChatInput";
import { parseMarkdown } from "../utils/markdownParser.jsx";
import CoachConversationAgent from "../utils/agents/CoachConversationAgent";
import { useToast } from "../contexts/ToastContext";
import {
  sendMessageWithStreaming,
  isMessageStreaming,
  getMessageDisplayContent,
  getStreamingMessageClasses,
  getTypingState,
  handleStreamingError,
  supportsStreaming
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

const EditIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const SaveIcon = () => (
  <svg
    className="w-4 h-4"
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
);

const CancelIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
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

// Memoized MessageItem component to prevent unnecessary re-renders
const MessageItem = memo(({
  message,
  agentState,
  coachName,
  getUserInitial,
  formatTime,
  renderMessageContent
}) => {
  return (
    <div
      className={`flex items-end gap-2 mb-1 group ${
        message.type === "user" ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 ${
          message.type === "user"
            ? avatarPatterns.userSmall
            : avatarPatterns.aiSmall
        }`}
      >
        {message.type === "user" ? (
          getUserInitial()
        ) : (
          coachName?.charAt(0) || "C"
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[70%] ${message.type === "user" ? "items-end" : "items-start"} flex flex-col`}
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
}, (prevProps, nextProps) => {
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
    prevProps.agentState.streamingMessageId !== nextProps.agentState.streamingMessageId ||
    prevProps.agentState.streamingMessage !== nextProps.agentState.streamingMessage;

  const coachNameChanged = prevProps.coachName !== nextProps.coachName;

  const shouldRerender = messageChanged || streamingStateChanged || coachNameChanged;

  if (nextProps.message.type === 'ai' && nextProps.agentState.isStreaming) {
    console.info('🎬 MessageItem memo check:', {
      messageId: nextProps.message.id,
      messageChanged,
      streamingStateChanged,
      shouldRerender,
      streamingMessageLength: nextProps.agentState.streamingMessage?.length || 0
    });
  }

  // Return true if props are equal (no re-render needed)
  // Return false if props changed (re-render needed)
  return !shouldRerender;
});

// Add display name for debugging
MessageItem.displayName = 'MessageItem';

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

  // Get user's first letter for avatar
  const getUserInitial = useCallback(() => {
    if (!userAttributes) return 'U';

    // Create a user object compatible with getUserDisplayName
    const userForDisplayName = { attributes: userAttributes };
    const displayName = getUserDisplayName(userForDisplayName);
    return displayName.charAt(0).toUpperCase();
  }, [userAttributes]);

  // UI-specific state
  const [inputMessage, setInputMessage] = useState("");
  const [showNewConversation, setShowNewConversation] =
    useState(!conversationId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

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
    { label: "Daily Check-in", message: "I'm checking in for the day. What do I need to be aware of?" },
    { label: "Progression", message: "I want to progress/increase the difficulty of my workouts." },
    { label: "Motivation", message: "I'm feeling unmotivated. Can you help me get back on track?" },
    { label: "WOD Creation", message: "Create a WOD for me today based on my goals and training plan." }
  ];

  // Chat tips content
  const chatTips = {
    items: [
      {
        title: "Slash Commands",
        description: "Type '/' to see available commands like /log-workout or /save-memory for quick actions."
      },
      {
        title: "Be Specific",
        description: "The more details you provide about your workouts, goals, and challenges, the better your coach can help."
      },
      {
        title: "Track Progress",
        description: "Regularly log your workouts and share how you're feeling to help your coach adapt your training."
      },
      {
        title: "Ask Questions",
        description: "Don't hesitate to ask about form, modifications, nutrition, or anything fitness-related."
      }
    ]
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
      streamingMessage: '',
      streamingMessageId: null,
    });

  // Debug: Track component re-renders during streaming


  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !coachId || !conversationId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, coachId, conversationId, navigate]);

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
          console.info('🔥 onStateChange received:', {
            isStreaming: newState.isStreaming,
            streamingMessageId: newState.streamingMessageId,
            streamingMessageLength: newState.streamingMessage?.length || 0,
            messagesCount: newState.messages?.length || 0
          });

          // Use flushSync for streaming updates to force immediate synchronous rendering
          if (newState.isStreaming || newState.streamingMessage) {
            flushSync(() => {
              setCoachConversationAgentState(prevState => {
                console.info('🚀 React SYNC state update (streaming):', {
                  prevStreamingLength: prevState.streamingMessage?.length || 0,
                  newStreamingLength: newState.streamingMessage?.length || 0,
                  isStreaming: newState.isStreaming
                });
                return newState;
              });
            });
          } else {
            // Normal async update for non-streaming changes
            setCoachConversationAgentState(prevState => {
              console.info('🚀 React ASYNC state update (normal):', {
                prevStreamingLength: prevState.streamingMessage?.length || 0,
                newStreamingLength: newState.streamingMessage?.length || 0,
                isStreaming: newState.isStreaming
              });
              return newState;
            });
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

      console.info("Agent initialized, loading conversation...", {
        userId,
        coachId,
        conversationId,
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
      console.info("Agent exists, loading new conversation...", {
        userId,
        coachId,
        conversationId,
      });
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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Try scrollIntoView first (preferred for smooth scrolling)
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });

      // Fallback: Also try to scroll the messages container directly
      const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
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

  useEffect(() => {
    // Use a small delay to ensure DOM is fully updated before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    coachConversationAgentState.messages,
    coachConversationAgentState.isTyping,
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
        }
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
  const handleMessageSubmit = async (messageContent) => {
    if (!agentRef.current) return;

    try {
      await sendMessageWithStreaming(agentRef.current, messageContent, {
        enableStreaming: supportsStreaming(),
        onStreamingStart: () => {
          // Streaming started
        },
        onStreamingError: (error) => {
          handleStreamingError(error, { error: showError });
        }
      });
    } catch (error) {
      console.error("Error sending message:", error);
      handleStreamingError(error, { error: showError });
    }
  };

  // Key press handling moved to ChatInput component

  const formatTime = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const handleEditTitle = () => {
    setEditTitleValue(coachConversationAgentState.conversation?.title || "");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim() || !agentRef.current) return;

    setIsSavingTitle(true);
    try {
      await agentRef.current.updateCoachConversation(
        userId,
        coachId,
        conversationId,
        { title: editTitleValue.trim() }
      );
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating conversation title:", error);
      // Could show toast notification here
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditTitleValue("");
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
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
    // Debug: Log what React component is seeing
    if (message.id === coachConversationAgentState.streamingMessageId) {
      console.info('🎭 renderMessageContent for streaming message:', {
        messageId: message.id,
        isStreaming: coachConversationAgentState.isStreaming,
        streamingMessageId: coachConversationAgentState.streamingMessageId,
        streamingMessageLength: coachConversationAgentState.streamingMessage?.length || 0,
        messageContentLength: message.content?.length || 0,
        streamingMessagePreview: coachConversationAgentState.streamingMessage?.substring(0, 30) + '...' || '[empty]'
      });
    }

    // Get the appropriate content (streaming or final)
    const displayContent = getMessageDisplayContent(message, coachConversationAgentState);

    if (message.type === "ai") {
      // AI messages use full markdown parsing
      return parseMarkdown(displayContent);
    } else {
      // User messages: simple line break rendering
      if (!displayContent) return displayContent;

      return displayContent.split("\n").map((line, index, array) => (
        <span key={index}>
          {line}
          {index < array.length - 1 && <br />}
        </span>
      ));
    }
  };

  // Typing state without memoization to ensure real-time updates during streaming
  const typingState = getTypingState(coachConversationAgentState);

  // Slash command functionality moved to ChatInput component

  // Show loading state while initializing coach or loading conversation (but not while deleting)
  if (
    !isDeleting &&
    (isValidatingUserId ||
      coachConversationAgentState.isLoadingItem ||
      !coachConversationAgentState.coach ||
      !coachConversationAgentState.conversation ||
      (coachConversationAgentState.conversation &&
        coachConversationAgentState.conversation.conversationId !==
          conversationId))
  ) {
    return (
      <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
        <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
          {/* Header skeleton */}
          <div className="mb-8 text-center">
            <div className="h-12 bg-synthwave-text-muted/20 rounded animate-pulse w-64 mx-auto mb-6"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-4"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mx-auto"></div>
          </div>

          {/* Coach header skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
              <div className="text-left">
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mb-2"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
              </div>
            </div>
          </div>

          {/* Main Content Area skeleton */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-7xl">
              <div className={`${containerPatterns.mainContent} h-[500px] flex flex-col`}>
                {/* Messages Area skeleton */}
                <div className="flex-1 overflow-y-auto overflow-hidden p-6 space-y-3">
                  {/* Chat message skeletons */}
                  {[1, 2].map((i) => (
                    <div key={i} className={`flex items-end gap-2 ${i % 2 === 1 ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar skeleton */}
                      <div className="flex-shrink-0 w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>

                      {/* Message bubble skeleton */}
                      <div className={`max-w-[70%] ${i % 2 === 1 ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-3 rounded-2xl ${i % 2 === 1 ? 'rounded-br-md' : 'rounded-bl-md'} bg-synthwave-text-muted/20 animate-pulse min-w-[600px] min-h-[130px]`}>
                          <div className="space-y-1">
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-3/4"></div>
                          </div>
                        </div>

                        {/* Timestamp and status skeleton */}
                        <div className={`flex items-center gap-1 px-2 ${i % 2 === 1 ? 'justify-end mt-1' : 'justify-start'}`}>
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
    <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-4 uppercase">
            Coach Conversation
          </h1>

          {/* Coach Header */}
          {coachConversationAgentState.coach && (
            <CoachHeader
              coachData={coachConversationAgentState.coach}
              isOnline={isOnline}
            />
          )}

          <p className="font-rajdhani text-lg text-synthwave-text-secondary mb-6 max-w-3xl mx-auto">
            Get personalized coaching, workout advice, and motivation from your
            AI coach. The more you share, the more your coach learns about you
            and provides better guidance.
          </p>

          {/* Conversation Title */}
          {coachConversationAgentState.conversation &&
            coachConversationAgentState.conversation.title && (
              <div className="font-rajdhani text-lg text-synthwave-text-secondary mb-2">
                {isEditingTitle ? (
                  <div className="flex items-center justify-center space-x-2">
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={handleTitleKeyPress}
                      className="bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-cyan/30 rounded px-3 py-1 text-synthwave-neon-cyan font-rajdhani text-lg focus:outline-none focus:border-synthwave-neon-cyan transition-all duration-200"
                      placeholder="Enter conversation title..."
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTitle}
                      disabled={isSavingTitle || !editTitleValue.trim()}
                      className="text-synthwave-neon-cyan hover:text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save title"
                    >
                      {isSavingTitle ? (
                        <div className="w-4 h-4 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <SaveIcon />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSavingTitle}
                      className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300 disabled:opacity-50"
                      title="Cancel"
                    >
                      <CancelIcon />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>
                      <span className="text-synthwave-neon-pink">
                        Conversation:{" "}
                      </span>
                      <span className="text-synthwave-text-secondary">
                        {coachConversationAgentState.conversation.title}
                      </span>
                    </span>
                    <button
                      onClick={handleEditTitle}
                      className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-300"
                      title="Edit title"
                    >
                      <EditIcon />
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              {/* Messages Area - with bottom padding for floating input */}
              <div className="flex-1 overflow-y-auto overflow-hidden p-6 pb-28 space-y-4">
                {coachConversationAgentState.messages.map((message, index) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    agentState={coachConversationAgentState}
                    coachName={coachConversationAgentState.coach?.name}
                    getUserInitial={getUserInitial}
                    formatTime={formatTime}
                    renderMessageContent={renderMessageContent}
                  />
                ))}

                {/* Typing Indicator - Show only when typing but not actively streaming content */}
                {typingState.showTypingIndicator && (
                    <div className="flex items-end gap-2 mb-1">
                      <div className={`flex-shrink-0 ${avatarPatterns.aiSmall}`}>
                        {coachConversationAgentState.coach?.name?.charAt(0) || "C"}
                      </div>
                      <div className={`${containerPatterns.aiChatBubble} px-4 py-3`}>
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
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand("");
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={null} // Will need to be provided if workout functionality is needed
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
          <div className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}>
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
                  className={`flex-1 ${buttonPatterns.secondary} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primary} text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
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

    </div>
  );
}

export default CoachConversations;
