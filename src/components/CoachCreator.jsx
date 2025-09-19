import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { getUserDisplayName } from '../auth/utils/authHelpers';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { containerPatterns, layoutPatterns, buttonPatterns, avatarPatterns, inputPatterns, iconButtonPatterns } from '../utils/uiPatterns';
import { SendIcon, PlusIcon, CameraIcon, PaperclipIcon, SmileIcon, MicIcon, TrashIcon } from './themes/SynthwaveComponents';
import ChatInput from './shared/ChatInput';
import ProgressIndicator from './shared/ProgressIndicator';
import { parseMarkdown } from '../utils/markdownParser.jsx';
import CoachCreatorAgent from '../utils/agents/CoachCreatorAgent';
import CoachCreatorHeader from './shared/CoachCreatorHeader';

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

function CoachCreator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');

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
    isLoading: false,
    isTyping: false,
    isComplete: false,
    isRedirecting: false,
    error: null
  });

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new CoachCreatorAgent({
        userId,
        sessionId: coachCreatorSessionId,
        onStateChange: (newState) => {
          setAgentState(newState);
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
    if (agentState.messages.length > 0 && !agentState.isLoading) {
      // Use a longer delay for initial load to ensure everything is rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [agentState.messages.length, agentState.isLoading]);

  // Handle message submission
  const handleMessageSubmit = async (messageContent) => {
    if (!agentRef.current) return;

    try {
      await agentRef.current.sendMessage(messageContent);
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  if (isValidatingUserId || (agentState.isLoading && agentState.messages.length === 0)) {
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

        {/* Floating Input skeleton */}
        <div className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-pink/30 shadow-lg shadow-synthwave-neon-pink/20 z-50">
          <div className="max-w-7xl mx-auto px-8 py-6">
            {/* Input area skeleton */}
            <div className="flex items-end gap-3">
              {/* Action buttons skeleton */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-11 h-11 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                ))}
              </div>

              {/* Text input skeleton */}
              <div className="flex-1 relative">
                <div className="w-full h-12 bg-synthwave-text-muted/20 rounded-2xl animate-pulse"></div>
              </div>

              {/* Send button skeleton */}
              <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
            </div>

            {/* Status skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
              <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
              </div>
            </div>

            {/* Quick suggestions skeleton */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse w-24"></div>
              ))}
            </div>
          </div>
        </div>
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
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-4 uppercase">
            Create Your Coach
          </h1>

          {/* Coach Creator Header */}
          <CoachCreatorHeader isOnline={true} />

          <p className="font-rajdhani text-lg text-synthwave-text-secondary mb-6 max-w-3xl mx-auto">
            Get a personalized coach with adaptive intelligence that learns from your interactions and evolves with your progress.
            Takes about 15-20 minutes to set up your perfect training partner.
          </p>

        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              {/* Messages Area - with bottom padding for floating input */}
              <div className="flex-1 overflow-y-auto overflow-hidden p-6 pb-32 space-y-4 custom-scrollbar">
                {agentState.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 mb-1 group ${
                      message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 ${
                        message.type === 'user'
                          ? avatarPatterns.userSmall
                          : avatarPatterns.aiSmall
                      }`}
                    >
                      {message.type === 'user' ? (
                        getUserInitial()
                      ) : (
                        'V'
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[70%] ${message.type === 'user' ? 'items-end' : 'items-start'} flex flex-col`}
                    >
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                          message.type === 'user'
                            ? 'bg-gradient-to-br from-synthwave-neon-pink/80 to-synthwave-neon-pink/60 text-white border-0 rounded-br-md shadow-xl shadow-synthwave-neon-pink/30 backdrop-blur-sm'
                            : containerPatterns.aiChatBubble
                        }`}
                      >
                        <div className="font-rajdhani text-base leading-relaxed">
                          {message.type === 'user' ? (
                            <span className="whitespace-pre-wrap">{message.content}</span>
                          ) : (
                            parseMarkdown(message.content)
                          )}
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
                ))}

                {/* Typing Indicator */}
                {agentState.isTyping && (
                  <div className="flex items-end gap-2 mb-1">
                    <div className={`flex-shrink-0 ${avatarPatterns.aiSmall}`}>
                      V
                    </div>
                    <div className={`${containerPatterns.aiChatBubble}`}>
                      <TypingIndicator />
                    </div>
                  </div>
                )}

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
            isTyping={agentState.isTyping}
            placeholder="Tell me about your fitness goals..."
            coachName="Vesper the Coach Creator"
            isOnline={true}
            showDeleteButton={true}
            onDeleteClick={handleDeleteClick}
            quickSuggestions={quickSuggestions}
            enableRecording={true}
            showTipsButton={true}
            tipsContent={coachCreatorTips}
            tipsTitle="Coach Creation Tips"
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