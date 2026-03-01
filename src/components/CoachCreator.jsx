import React, { useState, useRef, useEffect, memo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuth } from "../auth/contexts/AuthContext";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { getUserDisplayName } from "../auth/utils/authHelpers";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import {
  containerPatterns,
  layoutPatterns,
  buttonPatterns,
  avatarPatterns,
  inputPatterns,
  iconButtonPatterns,
  tooltipPatterns,
} from "../utils/ui/uiPatterns";
import {
  SendIcon,
  PlusIcon,
  CameraIcon,
  PaperclipIcon,
  SmileIcon,
  MicIcon,
  TrashIcon,
} from "./themes/SynthwaveComponents";
import ChatInput from "./shared/ChatInput";
import ProgressIndicator from "./shared/ProgressIndicator";
import UserAvatar from "./shared/UserAvatar";
import CompactCoachCard from "./shared/CompactCoachCard";
import ScrollToBottomButton from "./shared/ScrollToBottomButton";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import { MarkdownRenderer } from "./shared/MarkdownRenderer";
import CoachCreatorAgent from "../utils/agents/CoachCreatorAgent";
import { useToast } from "../contexts/ToastContext";
import ImageWithPresignedUrl from "./shared/ImageWithPresignedUrl";
import { logger } from "../utils/logger";
import {
  sendMessageWithStreaming,
  isMessageStreaming,
  getMessageDisplayContent,
  getStreamingMessageClasses,
  getTypingState,
  handleStreamingError,
  supportsStreaming,
  ContextualUpdateIndicator,
} from "../utils/ui/streamingUiHelper.jsx";

// Vesper coach data - static coach for coach creator
const vesperCoachData = {
  coach_id: "vesper-coach-creator",
  coach_name: "Vesper_the_Coach_Creator",
  name: "Vesper",
  avatar: "V",
  metadata: {
    title: "Coach Creator Guide & Mentor",
    description: "Your guide through the coach creation process",
  },
};

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

// SendIcon now imported from SynthwaveComponents

// Feature icons removed - no longer needed

const TypingIndicator = () => (
  <div className="flex space-x-1.5 px-4 py-3">
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

// ContextualUpdateIndicator imported from streamingUiHelper.jsx

// Memoized MessageItem component to prevent unnecessary re-renders during streaming
const MessageItem = memo(
  ({
    message,
    agentState,
    userEmail,
    userDisplayName,
    getUserInitial,
    formatTime,
    renderMessageContent,
  }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div
        className={`flex flex-col mb-1 group animate-message-in ${
          message.type === "user" ? "items-end" : "items-start"
        }`}
      >
        {/* Message Content */}
        <div
          className={`w-full md:max-w-[80%] ${message.type === "user" ? "items-end" : "items-start"} flex flex-col`}
        >
          {message.type === "user" ? (
            <div
              className={getStreamingMessageClasses(
                message,
                agentState,
                "px-4 py-3 shadow-sm bg-gradient-to-br from-synthwave-neon-pink/80 to-synthwave-neon-pink/60 text-white border-0 rounded-br-md shadow-xl shadow-synthwave-neon-pink/30",
              )}
            >
              <div className="font-rajdhani text-base leading-relaxed">
                {renderMessageContent(message)}
              </div>
            </div>
          ) : (
            <div className={getStreamingMessageClasses(message, agentState, "")}>
              <div className="font-rajdhani text-base leading-relaxed text-synthwave-text-primary">
                {renderMessageContent(message)}
              </div>
              {!isMessageStreaming(message, agentState) && (
                <button
                  onClick={handleCopy}
                  className="mt-2 flex items-center gap-1 text-synthwave-text-secondary/40 hover:text-synthwave-neon-cyan transition-colors duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title={copied ? "Copied!" : "Copy to clipboard"}
                >
                  {copied ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  {copied && <span className="text-xs font-rajdhani">Copied!</span>}
                </button>
              )}
            </div>
          )}

          {/* Timestamp, status, and avatar on same line */}
          <div
            className={`flex items-start gap-2 px-2 mt-2 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Avatar for AI messages (left side) */}
            {message.type === "ai" && (
              <div className="shrink-0">
                <div className={avatarPatterns.aiSmall}>V</div>
              </div>
            )}

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

            {/* Avatar for user messages (right side) */}
            {message.type === "user" && (
              <div className="shrink-0">
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

    const messageChanged =
      prevProps.message.id !== nextProps.message.id ||
      prevProps.message.content !== nextProps.message.content;

    const streamingStateChanged =
      prevProps.agentState.isStreaming !== nextProps.agentState.isStreaming ||
      prevProps.agentState.streamingMessageId !==
        nextProps.agentState.streamingMessageId ||
      prevProps.agentState.streamingMessage !==
        nextProps.agentState.streamingMessage;

    const userChanged =
      prevProps.userEmail !== nextProps.userEmail ||
      prevProps.userDisplayName !== nextProps.userDisplayName;

    const shouldRerender =
      messageChanged || streamingStateChanged || userChanged;

    // Return true if props are equal (no re-render needed)
    // Return false if props changed (re-render needed)
    return !shouldRerender;
  },
);

// Add display name for debugging
MessageItem.displayName = "MessageItem";

function CoachCreator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const { success: showSuccess, error: showError } = useToast();

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    userAttributes,
    error: userIdError,
  } = useAuthorizeUser(userId);
  const coachCreatorSessionId = searchParams.get("coachCreatorSessionId");

  // Get user's first letter for avatar
  const getUserInitial = () => {
    if (!userAttributes) return "U";

    // Create a user object compatible with getUserDisplayName
    const userForDisplayName = { attributes: userAttributes };
    const displayName = getUserDisplayName(userForDisplayName);
    return displayName.charAt(0).toUpperCase();
  };

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
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const lastScrollTimeRef = useRef(0); // For throttling scroll during streaming

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Command palette state
  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Session loading error state
  const [sessionLoadError, setSessionLoadError] = useState(null);

  // Add flag to prevent double execution from React StrictMode
  const isSendingMessage = useRef(false);

  // Agent state (managed by CoachCreatorAgent)
  const [agentState, setAgentState] = useState({
    messages: [],
    isLoadingItem: false, // Standardized naming to match CoachConversations
    isTyping: false,
    isComplete: false,
    isRedirecting: false,
    error: null,
    // Streaming-specific state (aligned with CoachConversations)
    isStreaming: false,
    streamingMessage: "",
    streamingMessageId: null,
  });

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new CoachCreatorAgent({
        userId,
        sessionId: coachCreatorSessionId,
        onStateChange: (newState) => {
          // Normal React batching handles streaming updates efficiently
          setAgentState(newState);
        },
        onNavigation: (type, data) => {
          if (type === "session-created") {
            const newSearchParams = new URLSearchParams();
            newSearchParams.set("userId", data.userId);
            newSearchParams.set("coachCreatorSessionId", data.sessionId);
            navigate(`/coach-creator?${newSearchParams.toString()}`, {
              replace: true,
            });
          } else if (type === "session-expired") {
            // Don't navigate - let the error handling show the AccessDenied message
            // The sessionLoadError state will be set by the catch block
          } else if (type === "session-complete") {
            // Delay showing completion modal to give user time to read final AI message
            setTimeout(() => {
              setShowCompletionModal(true);
            }, 3000); // 3 second delay for better UX
          }
        },
        onError: (error) => {
          logger.error("Agent error:", error);
          // Could show toast notification here
        },
      });

      // Load existing session if we have both userId and sessionId
      if (userId && coachCreatorSessionId) {
        setTimeout(async () => {
          try {
            await agentRef.current.loadExistingSession(
              userId,
              coachCreatorSessionId,
            );
          } catch (error) {
            logger.error("Error loading existing session:", error);
            // Set session load error for display
            if (error.message === "Session not found or expired") {
              setSessionLoadError(
                "Coach creator session not found or has expired.",
              );
            } else {
              setSessionLoadError("Failed to load coach creator session.");
            }
          }
        }, 100);
      }
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId, coachCreatorSessionId, navigate]);

  // Quick suggestions for coach creator
  const quickSuggestions = [
    {
      label: "Strength Training",
      message: "I want to build muscle and gain strength",
    },
    {
      label: "Weight Loss",
      message: "I want to lose weight and improve cardio",
    },
    { label: "Beginner", message: "I'm a beginner looking to get started" },
    {
      label: "Intermediate",
      message:
        "I have intermediate experience with CrossFit and Olympic lifting",
    },
    {
      label: "Advanced",
      message:
        "My main goals are to improve my olympic lifting through block periodization",
    },
  ];

  // Coach creation tips content
  const coachCreatorTips = {
    items: [
      {
        title: "Be Specific",
        description:
          "The more details you share about your goals, experience, and preferences, the more personalized your coach becomes.",
      },
      {
        title: "Share Your Story",
        description:
          "Tell me about your fitness journey, challenges, and what motivates you.",
      },
      {
        title: "Be Honest",
        description:
          "Authentic information helps create a coach that truly understands and supports you.",
      },
    ],
  };

  const scrollToBottom = useCallback(() => {
    // During streaming, always use instant scroll to prevent animation interruption
    const isStreaming = agentState.isStreaming || agentState.streamingMessage;

    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
    });
  }, [agentState.isStreaming, agentState.streamingMessage]);

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
      const isStreaming = agentState.isStreaming || agentState.streamingMessage;

      // Throttle scroll during streaming to ~100ms intervals
      if (isStreaming) {
        const now = Date.now();
        const timeSinceLastScroll = now - lastScrollTimeRef.current;

        if (timeSinceLastScroll >= 100) {
          lastScrollTimeRef.current = now;
          scrollToBottom();
        }
      } else {
        // No throttling for non-streaming updates
        scrollToBottom();
      }
    }
  }, [
    agentState.messages,
    agentState.isTyping,
    agentState.contextualUpdate,
    agentState.streamingMessage,
    agentState.isStreaming,
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

  // Handle message submission
  const handleMessageSubmit = async (messageContent, imageS3Keys = []) => {
    if (!agentRef.current) return;

    try {
      await sendMessageWithStreaming(
        agentRef.current,
        messageContent,
        imageS3Keys,
        {
          enableStreaming: supportsStreaming(),
          onStreamingStart: () => {
            // Streaming started
          },
          onStreamingError: (error) => {
            handleStreamingError(error, { error: showError });
          },
        },
      );
    } catch (error) {
      logger.error("Error sending message:", error);
      handleStreamingError(error, { error: showError });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to render message content with line breaks and streaming support
  // Removed useCallback to prevent memoization issues during streaming
  const renderMessageContent = (message) => {
    // Get the appropriate content (streaming or final)
    const displayContent = getMessageDisplayContent(message, agentState);
    const streaming = isMessageStreaming(message, agentState);

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

  // Delete handlers
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userId || !coachCreatorSessionId) return;

    setIsDeleting(true);
    try {
      await CoachCreatorAgent.deleteCoachCreatorSession(
        userId,
        coachCreatorSessionId,
      );
      // Redirect to coaches page after successful deletion
      navigate(`/coaches?userId=${userId}`);
    } catch (error) {
      logger.error("Error deleting coach creator session:", error);
      // Close modal even on error
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Handle missing required parameters
  useEffect(() => {
    if (!userId || !coachCreatorSessionId) {
      navigate(`/coaches${userId ? `?userId=${userId}` : ""}`, {
        replace: true,
      });
    }
  }, [userId, coachCreatorSessionId, navigate]);

  // Handle session loading errors first
  if (sessionLoadError) {
    return <AccessDenied message={sessionLoadError} userId={userId} />;
  }

  // Handle userId validation errors - only show AccessDenied if validation is complete and failed
  if (!isValidatingUserId && (userIdError || !isValidUserId)) {
    return (
      <AccessDenied
        message={
          userIdError || "You can only access your own coach creation sessions."
        }
        userId={userId}
      />
    );
  }

  // Redirect if missing required parameters
  if (!userId || !coachCreatorSessionId) {
    return null;
  }

  // Show skeleton loading while validating userId or loading agent state
  if (
    isValidatingUserId ||
    (agentState.isLoadingItem && agentState.messages.length === 0)
  ) {
    return (
      <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
        <div
          className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}
        >
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              {/* Title skeleton */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 animate-pulse w-56"></div>

              {/* Compact coach card skeleton - horizontal pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-md">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right: Command button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-md animate-pulse"></div>
          </header>

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
                      className={`flex flex-col mb-1 ${i % 2 === 0 ? "items-end" : "items-start"}`}
                    >
                      {/* Message bubble skeleton */}
                      <div
                        className={`w-full md:max-w-[80%] ${i % 2 === 0 ? "items-end" : "items-start"} flex flex-col`}
                      >
                        <div
                          className={`rounded-md px-4 py-3 bg-synthwave-text-muted/20 animate-pulse min-w-[min(65vw,600px)] min-h-[130px]`}
                        >
                          <div className="space-y-1">
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 animate-pulse w-3/4"></div>
                          </div>
                        </div>

                        {/* Avatar, timestamp, and status skeleton - all on same line below message */}
                        <div
                          className={`flex items-start gap-2 px-2 mt-2 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                        >
                          {/* Avatar skeleton for AI (left side) */}
                          {i % 2 === 1 && (
                            <div className="shrink-0 w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                          )}

                          <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-12"></div>
                          <div className="flex gap-1">
                            <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                          </div>

                          {/* Avatar skeleton for user (right side) */}
                          {i % 2 === 0 && (
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
        <ChatInput showSkeleton={true} />
      </div>
    );
  }

  // No longer showing features grid - redirect to coaches page if no sessionId

  // Chat interface when userId and sessionId are present
  return (
    <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
      <div
        className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}
      >
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Coach Creator Header"
        >
          {/* Left section: Title + Vesper Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Hover Tooltip */}
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="coach-creator-info"
              data-tooltip-content="Create your personalized AI coach through an interactive conversation. Vesper will guide you through the process."
            >
              Create Your Coach
            </h1>

            {/* Compact Vesper Coach Card */}
            <CompactCoachCard
              coachData={vesperCoachData}
              isOnline={true}
              onClick={() => navigate(`/coaches?userId=${userId}`)}
              tooltipContent="Go to Your Coaches"
            />
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
              {/* Messages Area - with bottom padding for floating input + progress indicator */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-6 sm:py-6 space-y-4 custom-scrollbar"
                style={{
                  paddingBottom: "calc(var(--chat-input-height, 160px) + 16px)",
                }}
              >
                {agentState.messages
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
                  .map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      agentState={agentState}
                      userEmail={userEmail}
                      userDisplayName={userDisplayName}
                      getUserInitial={getUserInitial}
                      formatTime={formatTime}
                      renderMessageContent={renderMessageContent}
                    />
                  ))}

                {/* Contextual Update Indicator - Shows AI processing stages (ephemeral) */}
                {agentState.contextualUpdate && (
                  <ContextualUpdateIndicator
                    content={agentState.contextualUpdate.content}
                    avatarLabel="V"
                  />
                )}

                {/* Typing Indicator - Show only when typing but not actively streaming content */}
                {(() => {
                  const typingState = getTypingState(agentState);
                  return (
                    typingState.showTypingIndicator &&
                    !agentState.contextualUpdate && (
                      <div className="flex flex-col items-start mb-1 animate-message-in">
                        <div className={`${containerPatterns.aiChatBubble}`}>
                          <TypingIndicator />
                        </div>
                        <div className="flex items-start gap-2 px-2 mt-2">
                          <div className={`shrink-0 ${avatarPatterns.aiSmall}`}>
                            V
                          </div>
                        </div>
                      </div>
                    )
                  );
                })()}

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

      {/* Chat Input Section - show completion message when done, otherwise show input */}
      {agentState.isComplete ? (
        <div className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-cyan/30 shadow-lg shadow-synthwave-neon-cyan/20 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex justify-center">
            <div
              className={`${containerPatterns.coachNotesSection} flex items-center justify-between w-full max-w-[75%]`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-synthwave-neon-cyan/10 border-2 border-synthwave-neon-cyan flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-synthwave-neon-cyan"
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
                    Session Complete
                  </h3>
                  <p className="font-rajdhani text-sm text-synthwave-text-secondary mt-0.5">
                    Your coach is being built (2-3 minutes). You can close this
                    page or navigate to your coaches.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/coaches?userId=${userId}`)}
                className={`${buttonPatterns.secondarySmall} shrink-0`}
              >
                View Coaches
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
          isTyping={getTypingState(agentState).isTyping}
          placeholder="Tell me about your fitness goals..."
          coachName="Vesper the Coach Creator"
          isOnline={true}
          context="creation"
          showDeleteButton={true}
          onDeleteClick={handleDeleteClick}
          enableRecording={false}
          showTipsButton={true}
          tipsContent={coachCreatorTips}
          tipsTitle="Coach creation tips"
          textareaRef={inputRef}
          progressData={agentState.progress}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Coach Creator Session
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this coach creator session? This
                action cannot be undone.
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
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-cyan/10 border-2 border-synthwave-neon-cyan flex items-center justify-center shrink-0">
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
                  Coach Creator Session Complete!
                </h3>
              </div>

              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Great work! W're now crafting a personalized coach tailored
                specifically to your journey.
              </p>

              {/* Status Information - Enhanced Glassmorphism (matches Theme.jsx Option 2) */}
              <div
                className={`${containerPatterns.subcontainerEnhanced} mb-6 text-left`}
              >
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-synthwave-neon-cyan shrink-0 mt-0.5"
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
                      We're now building your custom AI coach configuration
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-synthwave-neon-pink shrink-0 mt-0.5"
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
                      This usually takes 2-5 minutes to complete
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-synthwave-neon-purple shrink-0 mt-0.5"
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
                      You can monitor the build progress on your Coaches page
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
                  onClick={() => navigate(`/coaches?userId=${userId}`)}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-base`}
                >
                  Go to Coaches
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltips */}
      <Tooltip
        id="coach-creator-info"
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(21, 23, 35, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}

export default CoachCreator;
