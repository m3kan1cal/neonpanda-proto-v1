import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { getUserDisplayName } from "../auth/utils/authHelpers";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import { themeClasses } from "../utils/synthwaveThemeClasses";
import { FullPageLoader, CenteredErrorState } from "./shared/ErrorStates";
import { NeonBorder } from "./themes/SynthwaveComponents";
import { parseMarkdown } from "../utils/markdownParser.jsx";
import CoachConversationAgent from "../utils/agents/CoachConversationAgent";
import { useToast } from "../contexts/ToastContext";
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
  const getUserInitial = () => {
    if (!userAttributes) return 'U';

    // Create a user object compatible with getUserDisplayName
    const userForDisplayName = { attributes: userAttributes };
    const displayName = getUserDisplayName(userForDisplayName);
    return displayName.charAt(0).toUpperCase();
  };

  // UI-specific state
  const [inputMessage, setInputMessage] = useState("");
  const [showNewConversation, setShowNewConversation] =
    useState(!conversationId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Slash command states
  const [showSlashCommandTooltip, setShowSlashCommandTooltip] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState("");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modern chat features state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isOnline] = useState(true);
  const textareaRef = useRef(null);

  // Add flag to prevent double execution from React StrictMode
  const isSendingMessage = useRef(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const { success: showSuccess, error: showError } = useToast();

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
    });

  // Debug: Log when coach data changes
  useEffect(() => {
    console.info(
      "Component received coach data:",
      coachConversationAgentState.coach
    );
  }, [coachConversationAgentState.coach]);

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
          setCoachConversationAgentState(newState);
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

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Set height based on scrollHeight, with min and max constraints
    const minHeight = 48; // 3rem = 48px
    const maxHeight = 120; // Max 120px as per requirements
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight <= maxHeight) {
      textarea.style.height = Math.max(minHeight, scrollHeight) + "px";
      textarea.style.overflowY = "hidden";
    } else {
      textarea.style.height = maxHeight + "px";
      textarea.style.overflowY = "auto";
    }
  };

  // Voice recording functions
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Recording timer effect
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

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
          autoResizeTextarea(textareaRef.current);
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
          autoResizeTextarea(textareaRef.current);
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
        textareaRef.current.focus();
        autoResizeTextarea(textareaRef.current);
      }
    }, 100);

    try {
      await agentRef.current.sendMessage(messageToSend);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      // Reset flag after message is sent (success or failure)
      isSendingMessage.current = false;
    }
  };

  const handleKeyPress = (e) => {
    // Handle slash command navigation when tooltip is visible
    if (showSlashCommandTooltip) {
      const availableCommands = getAvailableSlashCommands();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < availableCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : availableCommands.length - 1
        );
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const selectedCommand = availableCommands[selectedCommandIndex];
        setInputMessage(selectedCommand.command + " ");
        setShowSlashCommandTooltip(false); // Close tooltip
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashCommandTooltip(false); // Close tooltip
        return;
      }
    }

    // Default behavior for sending messages
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  // Helper function to detect slash commands
  const parseSlashCommand = (message) => {
    const slashCommandRegex = /^\/([a-zA-Z0-9-]+)\s*([\s\S]*)$/;
    const match = message.match(slashCommandRegex);

    if (!match) {
      return { isSlashCommand: false };
    }

    const [, command, content] = match;
    return {
      isSlashCommand: true,
      command: command.toLowerCase(),
      content: content.trim(),
    };
  };

  // Helper function to render message content with line breaks
  const renderMessageContent = (message) => {
    if (message.type === "ai") {
      // AI messages use full markdown parsing
      return parseMarkdown(message.content);
    } else {
      // User messages: simple line break rendering
      if (!message.content) return message.content;

      return message.content.split("\n").map((line, index, array) => (
        <span key={index}>
          {line}
          {index < array.length - 1 && <br />}
        </span>
      ));
    }
  };

  // Helper function to get available slash commands
  const getAvailableSlashCommands = () => {
    return [
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
  };

  // Simple function to check if we should show slash command tooltip
  const shouldShowTooltip = () => {
    return (
      inputMessage.startsWith("/") &&
      inputMessage.length > 0 &&
      !inputMessage.includes(" ")
    );
  };

  // Show/hide tooltip based on input
  useEffect(() => {
    if (shouldShowTooltip()) {
      setShowSlashCommandTooltip(true);
      setSelectedCommandIndex(0);
    } else {
      setShowSlashCommandTooltip(false);
    }
  }, [inputMessage]);

  // Show loading state while initializing coach or loading conversation (but not while deleting)
  if (
    !isDeleting &&
    (coachConversationAgentState.isLoadingItem ||
      !coachConversationAgentState.coach ||
      !coachConversationAgentState.conversation ||
      (coachConversationAgentState.conversation &&
        coachConversationAgentState.conversation.conversationId !==
          conversationId))
  ) {
    return <FullPageLoader text="Loading conversation..." />;
  }

  // Show loading while validating userId (but not while deleting)
  if (!isDeleting && isValidatingUserId) {
    return <LoadingScreen message="Loading conversation..." />;
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
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-4 uppercase">
            Coach Conversation
          </h1>

          {/* Coach Status */}
          {coachConversationAgentState.coach && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {coachConversationAgentState.coach.name?.charAt(0) || "C"}
                </div>
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-synthwave-bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-rajdhani font-semibold text-white text-lg">
                    {coachConversationAgentState.coach.name}
                  </h3>
                  {isOnline && (
                    <span className="px-2 py-0.5 bg-green-400/20 text-green-300 rounded-full text-xs font-medium font-rajdhani">
                      Online
                    </span>
                  )}
                </div>
                <p className="text-sm text-synthwave-text-secondary font-rajdhani">
                  {(() => {
                    const config =
                      coachConversationAgentState.coach.rawCoach?.coachConfig;

                    // First priority: Use the new coach_description if available
                    if (config?.coach_description) {
                      return config.coach_description;
                    }

                    // Fallback: Use existing specialty
                    if (coachConversationAgentState.coach.specialty) {
                      return coachConversationAgentState.coach.specialty;
                    }

                    // Fallback: Build from technical config (simplified)
                    const parts = [];

                    if (config?.technical_config?.specializations?.length > 0) {
                      parts.push(
                        ...config.technical_config.specializations.map((s) =>
                          s.replace(/_/g, " ")
                        )
                      );
                    }

                    if (
                      parts.length === 0 &&
                      config?.technical_config?.programming_focus?.length > 0
                    ) {
                      parts.push(
                        ...config.technical_config.programming_focus.map((f) =>
                          f.replace(/_/g, " ")
                        )
                      );
                    }

                    return parts.length > 0
                      ? parts.slice(0, 2).join(" & ")
                      : "Fitness Coach";
                  })()}
                </p>
              </div>
            </div>
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
            <NeonBorder
              color="cyan"
              className="bg-synthwave-bg-card/50 h-full flex flex-col overflow-hidden"
            >
              {/* Messages Area - with bottom padding for floating input */}
              <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-4 custom-scrollbar">
                {coachConversationAgentState.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 mb-1 group ${
                      message.type === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === "user"
                          ? "bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple text-white"
                          : "bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink text-white"
                      }`}
                    >
                      {message.type === "user" ? (
                        <span className="font-bold text-sm">
                          {getUserInitial()}
                        </span>
                      ) : (
                        <span className="font-bold text-sm">
                          {coachConversationAgentState.coach?.name?.charAt(0) ||
                            "C"}
                        </span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[70%] ${message.type === "user" ? "items-end" : "items-start"} flex flex-col`}
                    >
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                          message.type === "user"
                            ? "bg-synthwave-neon-pink/70 text-white border border-synthwave-neon-pink/30 rounded-br-md shadow-lg shadow-synthwave-neon-pink/20"
                            : "bg-synthwave-neon-cyan/10 text-synthwave-text-primary border border-synthwave-neon-cyan/30 rounded-bl-md"
                        }`}
                      >
                        <div className="font-rajdhani text-sm leading-relaxed">
                          {renderMessageContent(message)}
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-1 mt-1 px-2 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <span className="text-xs text-synthwave-text-muted font-rajdhani">
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
                ))}

                {/* Typing Indicator */}
                {coachConversationAgentState.isTyping && (
                  <div className="flex items-end gap-2 mb-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink text-white flex items-center justify-center">
                      <span className="font-bold text-sm">
                        {coachConversationAgentState.coach?.name?.charAt(0) ||
                          "C"}
                      </span>
                    </div>
                    <div className="bg-synthwave-bg-card/80 border border-synthwave-neon-cyan/30 px-4 py-3 rounded-2xl rounded-bl-md">
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
            </NeonBorder>
          </div>
        </div>
      </div>

      {/* Floating Input - Fixed at bottom of viewport, completely outside containers */}
      <div className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-pink/30 shadow-lg shadow-synthwave-neon-pink/20 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Recording indicator */}
          {isRecording && (
            <div className="mb-3 flex items-center justify-center">
              <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <span className="text-sm font-medium font-rajdhani">
                  Recording {formatRecordingTime(recordingTime)}
                </span>
                <button
                  onClick={handleStopRecording}
                  className="ml-2 hover:bg-red-600 rounded-full p-1 transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-2 sm:p-3 text-synthwave-text-secondary hover:text-blue-400 hover:bg-blue-400/10 rounded-full transition-all group min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Quick actions"
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                className="p-2 sm:p-3 text-synthwave-text-secondary hover:text-green-400 hover:bg-green-400/10 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Form check photos"
              >
                <CameraIcon />
              </button>
              <button
                type="button"
                className="p-2 sm:p-3 text-synthwave-text-secondary hover:text-purple-400 hover:bg-purple-400/10 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="File attachments"
              >
                <PaperclipIcon />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={coachConversationAgentState.isTyping}
                className="p-2 sm:p-3 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Delete conversation"
              >
                <TrashIcon />
              </button>
            </div>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  autoResizeTextarea(e.target);
                }}
                onKeyDown={handleKeyPress}
                placeholder="What's on your mind today? How can I help you with your training?"
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-pink/30 rounded-2xl text-synthwave-text-primary font-rajdhani outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-synthwave-neon-pink hover:border-synthwave-neon-pink/50 transition-all resize-none placeholder-synthwave-text-muted synthwave-scrollbar max-h-[120px] overflow-y-auto"
                style={{
                  outline: "none !important",
                  boxShadow: "none !important",
                  WebkitTapHighlightColor: "transparent",
                }}
                disabled={coachConversationAgentState.isTyping}
              />
              <button
                type="button"
                className="absolute right-3 bottom-3 p-1 text-synthwave-text-secondary hover:text-synthwave-neon-cyan rounded-full transition-colors"
                title="Emoji"
              >
                <SmileIcon />
              </button>

              {/* Slash Command Tooltip */}
              {showSlashCommandTooltip && (
                <div className="absolute bottom-full mb-2 left-0 bg-synthwave-bg-card/95 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 shadow-lg backdrop-blur-sm z-10 min-w-[400px]">
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
                    Available Slash Commands
                  </div>
                  <div className="space-y-2">
                    {getAvailableSlashCommands().map((cmd, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-3 py-1 px-2 rounded cursor-pointer transition-colors duration-200 border ${
                          index === selectedCommandIndex
                            ? "bg-synthwave-bg-primary/30 border-synthwave-neon-pink/20"
                            : "hover:bg-synthwave-bg-primary/30 border-transparent"
                        }`}
                        onClick={() => {
                          setInputMessage(cmd.command + " ");
                          textareaRef.current?.focus();
                        }}
                      >
                        <div
                          className={`font-rajdhani text-sm ${
                            index === selectedCommandIndex
                              ? "text-synthwave-neon-pink"
                              : "text-synthwave-neon-pink"
                          }`}
                        >
                          {cmd.command}
                        </div>
                        <div className="flex-1">
                          <div
                            className={`font-rajdhani text-sm ${
                              index === selectedCommandIndex
                                ? "text-white"
                                : "text-white"
                            }`}
                          >
                            {cmd.description}
                          </div>
                          <div
                            className={`font-rajdhani text-xs mt-1 ${
                              index === selectedCommandIndex
                                ? "text-synthwave-text-secondary"
                                : "text-synthwave-text-muted"
                            }`}
                          >
                            {cmd.example}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-muted mt-3 pt-2 border-t border-synthwave-neon-pink/20">
                    Use ↑↓ to navigate, Enter to select, Esc to close
                  </div>
                </div>
              )}
            </div>

            {/* Voice/Send buttons */}
            <div className="flex items-center gap-2">
              {inputMessage.trim() ? (
                <button
                  type="submit"
                  disabled={coachConversationAgentState.isTyping}
                  className="p-3 sm:p-4 bg-synthwave-neon-pink text-white rounded-full hover:bg-synthwave-neon-pink/80 transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px] min-w-[48px]"
                >
                  {coachConversationAgentState.isTyping ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <SendIcon />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onMouseDown={handleStartRecording}
                  onMouseUp={handleStopRecording}
                  onMouseLeave={handleStopRecording}
                  onTouchStart={handleStartRecording}
                  onTouchEnd={handleStopRecording}
                  className={`p-3 sm:p-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg min-h-[48px] min-w-[48px] flex items-center justify-center ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan"
                  }`}
                  title="Hold to record voice message"
                >
                  <MicIcon />
                </button>
              )}
            </div>
          </form>

          {/* Status/Tips */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 text-xs text-synthwave-text-muted font-rajdhani">
            <span className="text-center sm:text-left">
              {coachConversationAgentState.coach?.name || "Coach"} is
              {isOnline ? (
                <span className="text-green-400 ml-1">
                  online and ready to help with your training
                </span>
              ) : (
                <span className="text-synthwave-text-secondary ml-1">away</span>
              )}
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline">
                Press Enter to send • Shift+Enter for new line
              </span>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
                ></div>
                <span>{isOnline ? "Online" : "Away"}</span>
              </div>
            </div>
          </div>

          {/* Quick Topic Suggestions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
              onClick={() => setInputMessage("/log-workout ")}
            >
              Log Workout
            </button>
            <button
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
              onClick={() =>
                setInputMessage(
                  "I'm checking in for the day. What do I need to be aware of?"
                )
              }
            >
              Daily Check-in
            </button>
            <button
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
              onClick={() =>
                setInputMessage(
                  "I want to progress/increase the difficulty of my workouts."
                )
              }
            >
              Progression
            </button>
            <button
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
              onClick={() =>
                setInputMessage(
                  "I'm feeling unmotivated. Can you help me get back on track?"
                )
              }
            >
              Motivation
            </button>
            <button
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
              onClick={() =>
                setInputMessage(
                  "Create a WOD for me today based on my goals and training plan."
                )
              }
            >
              WOD Creation
            </button>
          </div>
        </div>
      </div>

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
          <div className="bg-synthwave-bg-card border-2 border-synthwave-neon-pink/30 rounded-lg shadow-2xl shadow-synthwave-neon-pink/20 p-6 max-w-md w-full mx-4">
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
                  className={`flex-1 ${themeClasses.cyanButton} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className={`flex-1 ${themeClasses.neonButton} text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
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
