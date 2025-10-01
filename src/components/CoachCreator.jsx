import React, { useState, useRef, useEffect, memo } from 'react';
import { flushSync } from "react-dom";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../auth/contexts/AuthContext';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { getUserDisplayName } from '../auth/utils/authHelpers';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { containerPatterns, layoutPatterns, buttonPatterns, avatarPatterns, inputPatterns, iconButtonPatterns } from '../utils/uiPatterns';
import { SendIcon, PlusIcon, CameraIcon, PaperclipIcon, SmileIcon, MicIcon, TrashIcon } from './themes/SynthwaveComponents';
import ChatInput from './shared/ChatInput';
import ProgressIndicator from './shared/ProgressIndicator';
import UserAvatar from './shared/UserAvatar';
import { parseMarkdown } from '../utils/markdownParser.jsx';
import CoachCreatorAgent from '../utils/agents/CoachCreatorAgent';
import CoachCreatorHeader from './shared/CoachCreatorHeader';
import { useToast } from '../contexts/ToastContext';
import {
  sendMessageWithStreaming,
  isMessageStreaming,
  getMessageDisplayContent,
  getStreamingMessageClasses,
  getTypingState,
  handleStreamingError,
  supportsStreaming
} from "../utils/ui/streamingUiHelper.jsx";

// Icons for human and AI messages
const UserIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const AIIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
  </svg>
);

// SendIcon now imported from SynthwaveComponents


// Feature icons removed - no longer needed


const TypingIndicator = () => (
  <div className="flex space-x-1 px-4 py-3">
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
);

// Memoized MessageItem component to prevent unnecessary re-renders during streaming
const MessageItem = memo(({
  message,
  agentState,
  userEmail,
  userDisplayName,
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
      <div className="flex-shrink-0">
        {message.type === "user" ? (
          <UserAvatar
            email={userEmail}
            username={userDisplayName}
            size={32}
          />
        ) : (
          <div className={avatarPatterns.aiSmall}>
            V
          </div>
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

  const messageChanged =
    prevProps.message.id !== nextProps.message.id ||
    prevProps.message.content !== nextProps.message.content;

  const streamingStateChanged =
    prevProps.agentState.isStreaming !== nextProps.agentState.isStreaming ||
    prevProps.agentState.streamingMessageId !== nextProps.agentState.streamingMessageId ||
    prevProps.agentState.streamingMessage !== nextProps.agentState.streamingMessage;

  const userChanged = prevProps.userEmail !== nextProps.userEmail ||
    prevProps.userDisplayName !== nextProps.userDisplayName;

  const shouldRerender = messageChanged || streamingStateChanged || userChanged;

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

function CoachCreator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const { success: showSuccess, error: showError } = useToast();

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    userAttributes,
    error: userIdError
  } = useAuthorizeUser(userId);
  const coachCreatorSessionId = searchParams.get('coachCreatorSessionId');

  // Get user's first letter for avatar
  const getUserInitial = () => {
    if (!userAttributes) return 'U';

    // Create a user object compatible with getUserDisplayName
    const userForDisplayName = { attributes: userAttributes };
    const displayName = getUserDisplayName(userForDisplayName);
    return displayName.charAt(0).toUpperCase();
  };

  // Get user email and display name from profile (preferred) or Cognito (fallback)
  const { userProfile } = useAuth();
  const userEmail = userAttributes?.email;
  const userDisplayName = userProfile?.displayName || (userAttributes ? getUserDisplayName({ attributes: userAttributes }) : 'User');

  // UI-specific state
  const [inputMessage, setInputMessage] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(6);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    streamingMessage: '',
    streamingMessageId: null,
  });

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new CoachCreatorAgent({
        userId,
        sessionId: coachCreatorSessionId,
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
              setAgentState(prevState => {
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
            setAgentState(prevState => {
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
          if (type === 'session-created') {
            const newSearchParams = new URLSearchParams();
            newSearchParams.set('userId', data.userId);
            newSearchParams.set('coachCreatorSessionId', data.sessionId);
            navigate(`/coach-creator?${newSearchParams.toString()}`, { replace: true });
          } else if (type === 'session-expired') {
            // Don't navigate - let the error handling show the AccessDenied message
            // The sessionLoadError state will be set by the catch block
          } else if (type === 'session-complete') {
            setRedirectCountdown(6);
            const countdownInterval = setInterval(() => {
              setRedirectCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  navigate(`/coaches?userId=${data.userId}`);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        },
        onError: (error) => {
          console.error('Agent error:', error);
          // Could show toast notification here
        }
      });

      // Load existing session if we have both userId and sessionId
      if (userId && coachCreatorSessionId) {
        setTimeout(async () => {
          try {
            await agentRef.current.loadExistingSession(userId, coachCreatorSessionId);
          } catch (error) {
            console.error('Error loading existing session:', error);
            // Set session load error for display
            if (error.message === "Session not found or expired") {
              setSessionLoadError("Coach creator session not found or has expired.");
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Quick suggestions for coach creator
  const quickSuggestions = [
    { label: "Strength Training", message: "I want to build muscle and gain strength" },
    { label: "Weight Loss", message: "I want to lose weight and improve cardio" },
    { label: "Beginner", message: "I'm a beginner looking to get started" },
    { label: "Intermediate", message: "I have intermediate experience with CrossFit and Olympic lifting" },
    { label: "Advanced", message: "My main goals are to improve my olympic lifting through block periodization" }
  ];

  // Coach creation tips content
  const coachCreatorTips = {
    items: [
      {
        title: "Be Specific",
        description: "The more details you share about your goals, experience, and preferences, the more personalized your coach becomes."
      },
      {
        title: "Share Your Story",
        description: "Tell me about your fitness journey, challenges, and what motivates you."
      },
      {
        title: "Be Honest",
        description: "Authentic information helps create a coach that truly understands and supports you."
      }
    ]
  };

  useEffect(() => {
    scrollToBottom();
  }, [agentState.messages, agentState.isTyping]);

  // Auto-scroll to bottom on page load when messages are first loaded
  useEffect(() => {
    if (agentState.messages.length > 0 && !agentState.isLoadingItem) {
      // Use a longer delay for initial load to ensure everything is rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [agentState.messages.length, agentState.isLoadingItem]);

  // Handle message submission
  const handleMessageSubmit = async (messageContent) => {
    if (!agentRef.current) return;

    try {
      await sendMessageWithStreaming(agentRef.current, messageContent, {
        enableStreaming: supportsStreaming(),
        onStreamingStart: () => {
          console.info('🔄 Started streaming message in CoachCreator');
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to render message content with line breaks and streaming support
  // Removed useCallback to prevent memoization issues during streaming
  const renderMessageContent = (message) => {
    // Debug: Log what React component is seeing
    if (message.id === agentState.streamingMessageId) {
      console.info('🎭 renderMessageContent for streaming message:', {
        messageId: message.id,
        isStreaming: agentState.isStreaming,
        streamingMessageId: agentState.streamingMessageId,
        streamingMessageLength: agentState.streamingMessage?.length || 0,
        messageContentLength: message.content?.length || 0,
        streamingMessagePreview: agentState.streamingMessage?.substring(0, 30) + '...' || '[empty]'
      });
    }

    // Get the appropriate content (streaming or final)
    const displayContent = getMessageDisplayContent(message, agentState);

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

  // Delete handlers
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userId || !coachCreatorSessionId) return;

    setIsDeleting(true);
    try {
      await CoachCreatorAgent.deleteCoachCreatorSession(userId, coachCreatorSessionId);
      // Redirect to coaches page after successful deletion
      navigate(`/coaches?userId=${userId}`);
    } catch (error) {
      console.error('Error deleting coach creator session:', error);
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
      navigate(`/coaches${userId ? `?userId=${userId}` : ''}`, { replace: true });
    }
  }, [userId, coachCreatorSessionId, navigate]);

  // Handle session loading errors first
  if (sessionLoadError) {
    return (
      <AccessDenied
        message={sessionLoadError}
        userId={userId}
      />
    );
  }

  // Handle userId validation errors - only show AccessDenied if validation is complete and failed
  if (!isValidatingUserId && (userIdError || !isValidUserId)) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own coach creation sessions."}
        userId={userId}
      />
    );
  }

  // Redirect if missing required parameters
  if (!userId || !coachCreatorSessionId) {
    return null;
  }

  // Show skeleton loading while validating userId or loading agent state
  if (isValidatingUserId || (agentState.isLoadingItem && agentState.messages.length === 0)) {
    return (
      <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
        <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
          {/* Header skeleton */}
          <div className="mb-8 text-center">
            <div className="h-12 bg-synthwave-text-muted/20 rounded animate-pulse w-64 mx-auto mb-6"></div>

            {/* Coach creator header skeleton */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
              <div className="text-center">
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-24 mb-2"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
              </div>
            </div>

            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-4"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mx-auto"></div>
          </div>

          {/* Main Content Area skeleton */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-7xl">
              <div className={`${containerPatterns.mainContent} h-[500px] flex flex-col`}>
                {/* Messages Area skeleton */}
                <div className="flex-1 overflow-y-auto overflow-hidden p-6 space-y-3">
                  {/* Chat message skeletons */}
                  {[1, 2].map((i) => (
                    <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar skeleton */}
                      <div className="flex-shrink-0 w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>

                      {/* Message bubble skeleton */}
                      <div className={`max-w-[70%] ${i % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-3 rounded-2xl ${i % 2 === 0 ? 'rounded-br-md' : 'rounded-bl-md'} bg-synthwave-text-muted/20 animate-pulse min-w-[600px] min-h-[130px]`}>
                          <div className="space-y-1">
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-synthwave-text-muted/30 rounded animate-pulse w-3/4"></div>
                          </div>
                        </div>

                        {/* Timestamp and status skeleton */}
                        <div className={`flex items-center gap-1 px-2 ${i % 2 === 0 ? 'justify-end mt-1' : 'justify-start'}`}>
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

  // No longer showing features grid - redirect to coaches page if no sessionId

  // Chat interface when userId and sessionId are present
  return (
    <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Create Your Coach
          </h1>

          {/* Coach Creator Header */}
          <CoachCreatorHeader isOnline={true} />

          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Get a personalized coach with adaptive intelligence that learns from your interactions and evolves with your progress.
            Takes about 15-20 minutes to set up your perfect training partner.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              {/* Messages Area - with bottom padding for floating input + progress indicator */}
              <div className="flex-1 overflow-y-auto overflow-hidden p-6 pb-32 space-y-4 custom-scrollbar">
                {agentState.messages.map((message) => (
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

                {/* Typing Indicator - Show only when typing but not actively streaming content */}
                {(() => {
                  const typingState = getTypingState(agentState);
                  return typingState.showTypingIndicator && (
                    <div className="flex items-end gap-2 mb-1">
                      <div className={`flex-shrink-0 ${avatarPatterns.aiSmall}`}>
                        V
                      </div>
                      <div className={`${containerPatterns.aiChatBubble}`}>
                        <TypingIndicator />
                      </div>
                    </div>
                  );
                })()}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Chat Input Section */}
      {agentState.isRedirecting ? (
        /* Redirect Countdown Display */
        <div className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-pink/30 shadow-lg shadow-synthwave-neon-pink/20 z-50">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="font-rajdhani text-lg text-synthwave-neon-pink font-semibold">
                    Coach creation complete!
                  </p>
                  <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                    Redirecting to your coaches in {redirectCountdown} seconds...
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-synthwave-bg-primary/50 rounded-full h-2 border border-synthwave-neon-pink/30">
                <div
                  className="bg-synthwave-neon-pink h-full rounded-full transition-all duration-1000 shadow-neon-pink"
                  style={{ width: `${((6 - redirectCountdown) / 6) * 100}%` }}
                ></div>
              </div>

              <button
                onClick={() => navigate(`/coaches?userId=${userId}`)}
                className={buttonPatterns.secondary}
              >
                Go to Coaches Now
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>

          <ChatInput
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
            enableRecording={true}
            showTipsButton={true}
            tipsContent={coachCreatorTips}
            tipsTitle="Coach creation tips"
            textareaRef={inputRef}
            progressData={agentState.progress}
          />
        </>
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="p-6 max-w-md w-full mx-4 bg-synthwave-bg-card/95 border border-synthwave-neon-pink/30 rounded-2xl shadow-xl shadow-synthwave-neon-pink/20">
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Coach Creator Session
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this coach creator session? This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-6 py-3 rounded-lg font-rajdhani font-semibold text-sm uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-synthwave-neon-pink text-synthwave-bg-primary px-6 py-3 rounded-lg font-rajdhani font-semibold text-sm uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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