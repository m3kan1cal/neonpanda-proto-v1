import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import { parseMarkdown } from '../utils/markdownParser.jsx';
import CoachCreatorAgent from '../utils/agents/CoachCreatorAgent';

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

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Feature icons
const TargetIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l9 18-9-18-9 18 9-18z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const PersonalizedIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const GoalFocusedIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SafetyFirstIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// New icons for coach features
const BrainIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const AdaptiveIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExpertIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const TypingIndicator = () => (
  <div className="flex space-x-1 p-4">
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
);

function CoachCreator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachCreatorSessionId = searchParams.get('coachCreatorSessionId');

  // UI-specific state
  const [inputMessage, setInputMessage] = useState('');
  const [showTips, setShowTips] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(6);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);

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
            navigate('/coach-creator', { replace: true });
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

  const autoResizeTextarea = (textarea) => {
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Set height based on scrollHeight, with min and max constraints
    const minHeight = 48; // 3rem = 48px
    const maxHeight = 144; // 9rem = 144px (increased from 6rem)
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight <= maxHeight) {
      textarea.style.height = Math.max(minHeight, scrollHeight) + 'px';
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [agentState.messages, agentState.isTyping]);

  // Focus input when chat interface is visible
  useEffect(() => {
    if (userId && coachCreatorSessionId && inputRef.current) {
      inputRef.current.focus();
      autoResizeTextarea(inputRef.current);
    }
  }, [userId, coachCreatorSessionId]);

  // Auto-resize textarea when input message changes
  useEffect(() => {
    if (inputRef.current) {
      autoResizeTextarea(inputRef.current);
    }
  }, [inputMessage]);

  // Load existing session when agent is ready and URL parameters are present
  useEffect(() => {
    const loadExistingSession = async () => {
      if (userId && coachCreatorSessionId && agentRef.current && agentState.messages.length <= 1) {
        try {
          await agentRef.current.loadExistingSession(userId, coachCreatorSessionId);
        } catch (error) {
          // Error handling is managed by the agent via onError callback
        }
      }
    };

    loadExistingSession();
  }, [userId, coachCreatorSessionId, agentState.messages.length]);

  const handleCreateCoach = async () => {
    if (!agentRef.current) return;

    try {
      await agentRef.current.createSession(userId);
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || agentState.isLoading || !agentRef.current) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');

    // Refocus input and reset size after clearing it
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        autoResizeTextarea(inputRef.current);
      }
    }, 100);

    try {
      await agentRef.current.sendMessage(messageContent);
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    }
  };

  const clearConversation = () => {
    if (!agentRef.current) return;

    agentRef.current.clearConversation();

    // Focus input and reset size after clearing conversation
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        autoResizeTextarea(inputRef.current);
      }
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show initial coach creator UI if no userId or sessionId
  if (!userId || !coachCreatorSessionId) {
      return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="text-center mb-16">
                        <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Create Your Virtual Fitness Coach
            </h1>
            <p className="font-rajdhani text-xl text-synthwave-text-secondary max-w-3xl mx-auto leading-relaxed mb-8">
              Get a personalized virtual coach with adaptive intelligence tailored to your goals, experience, and preferences.
              Takes about 15-20 minutes to set up your perfect training partner.
            </p>

            {/* Create Coach Button */}
            <button
              onClick={handleCreateCoach}
              className={`${themeClasses.neonButton} text-xl px-12 py-4 mb-16`}
            >
              Create My Coach
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 - Personalized */}
            <NeonBorder color="pink" className="bg-synthwave-bg-card/50 p-8 text-center">
              <div className="text-synthwave-neon-pink mb-6 flex justify-center">
                <BrainIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase mb-4">
                AI-Powered Intelligence
              </h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Advanced AI that understands your unique goals, limitations, and preferences to create truly personalized training programs.
              </p>
            </NeonBorder>

            {/* Feature 2 - Adaptive */}
            <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 p-8 text-center">
              <div className="text-synthwave-neon-cyan mb-6 flex justify-center">
                <AdaptiveIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase mb-4">
                Adaptive Programming
              </h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Your coach evolves with you, adjusting workouts based on your progress, recovery, and changing goals.
              </p>
            </NeonBorder>

            {/* Feature 3 - Expert */}
            <NeonBorder color="purple" className="bg-synthwave-bg-card/50 p-8 text-center">
              <div className="text-synthwave-neon-purple mb-6 flex justify-center">
                <ExpertIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase mb-4">
                Expert Knowledge
              </h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Built on proven training methodologies and safety protocols to help you achieve your goals effectively and safely.
              </p>
            </NeonBorder>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
              <InfoIcon />
              <span>Your coach will be ready in about 15-20 minutes after creation</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original chat interface when userId and sessionId are present
  return (
    <>
      <div className={`${themeClasses.container} min-h-screen pb-8`}>
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Create Your Virtual Fitness Coach
            </h1>
            <p className="font-rajdhani text-xl text-synthwave-text-secondary max-w-3xl mx-auto leading-relaxed">
              Get a personalized virtual coach with adaptive intelligence tailored to your goals, experience, and preferences.
              Takes about 15-20 minutes to set up your perfect training partner.
            </p>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex justify-center">
            {/* Chat Container - Centered */}
            <div className="w-full max-w-4xl">
              <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 h-full flex flex-col overflow-hidden">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {agentState.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 ${
                        message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        message.type === 'user'
                          ? 'bg-synthwave-neon-pink/20 text-synthwave-neon-pink border border-synthwave-neon-pink/50'
                          : 'bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border border-synthwave-neon-cyan/50'
                      }`}>
                        {message.type === 'user' ? <UserIcon /> : <AIIcon />}
                      </div>

                      {/* Message Bubble */}
                      <div className={`flex-1 max-w-md ${message.type === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-4 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 text-synthwave-text-primary'
                            : 'bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/30 text-synthwave-text-primary'
                        }`}>
                          <div className="font-rajdhani text-base leading-normal">
                            {message.type === 'user' ? (
                              <span className="whitespace-pre-wrap">{message.content}</span>
                            ) : (
                              parseMarkdown(message.content)
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-synthwave-text-muted mt-1 px-2">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {agentState.isTyping && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border border-synthwave-neon-cyan/50">
                        <AIIcon />
                      </div>
                      <div className="bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/30 rounded-2xl">
                        <TypingIndicator />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area or Redirect Countdown */}
                <div className="border-t border-synthwave-neon-cyan/30 p-6">
                  {agentState.isRedirecting ? (
                    /* Redirect Countdown Display */
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
                        className="bg-transparent border border-synthwave-neon-pink/50 text-synthwave-neon-pink px-4 py-2 rounded font-rajdhani text-sm uppercase tracking-wide transition-all duration-300 hover:bg-synthwave-neon-pink/10 hover:border-synthwave-neon-pink"
                      >
                        Go to Coaches Now
                      </button>
                    </div>
                  ) : (
                    /* Normal Input Form */
                    <>
                      <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
                        {/* Message Input */}
                        <div className="flex-1 flex flex-col justify-end">
                          <textarea
                            ref={inputRef}
                            value={inputMessage}
                            onChange={(e) => {
                              setInputMessage(e.target.value);
                              autoResizeTextarea(e.target);
                            }}
                            onKeyPress={handleKeyPress}
                            placeholder="Tell me about your fitness goals..."
                            className="w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-cyan/30 rounded-lg text-synthwave-text-primary font-rajdhani focus:outline-none focus:border-synthwave-neon-cyan transition-all duration-200 resize-none placeholder-synthwave-text-muted"
                            style={{ minHeight: '3rem' }}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={clearConversation}
                            className="bg-transparent border-2 border-synthwave-text-secondary/50 text-synthwave-text-secondary hover:border-synthwave-text-secondary hover:text-synthwave-text-primary p-3 rounded-lg transition-all duration-300 hover:-translate-y-0.5"
                            title="Clear conversation"
                          >
                            <ClearIcon />
                          </button>

                          <button
                            type="submit"
                            disabled={!inputMessage.trim() || agentState.isLoading}
                            className={`${themeClasses.cyanButton} p-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 min-w-[3rem] flex items-center justify-center`}
                            title="Send message"
                          >
                            {agentState.isLoading ? (
                              <div className="w-4 h-4 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <SendIcon />
                            )}
                          </button>
                        </div>
                      </form>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                          onClick={() => setInputMessage("I want to build muscle and gain strength")}
                        >
                          Strength Training
                        </button>
                        <button
                          className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                          onClick={() => setInputMessage("I want to lose weight and improve cardio")}
                        >
                          Weight Loss
                        </button>
                        <button
                          className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                          onClick={() => setInputMessage("I'm a beginner looking to get started")}
                        >
                          Beginner
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </NeonBorder>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Tips Panel - Right Edge */}
      <div className="hidden lg:block">
        {/* Toggle Button */}
        <button
          onClick={() => setShowTips(!showTips)}
          className={`fixed top-1/2 -translate-y-1/2 bg-synthwave-bg-card/90 border-2 border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:border-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 p-3 rounded-l-lg transition-all duration-300 hover:-translate-x-1 z-50 ${
            showTips ? 'right-80' : 'right-0'
          }`}
          title={showTips ? "Hide tips" : "Show helpful tips"}
        >
          <div className="flex items-center space-x-1">
            <InfoIcon />
            {showTips ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </div>
        </button>

        {/* Tips Panel - Slides from Right */}
        <div className={`fixed top-20 right-0 h-[calc(100vh-5rem)] bg-synthwave-bg-card/95 backdrop-blur-sm border-l-2 border-synthwave-neon-cyan/30 transition-all duration-300 z-40 ${
          showTips ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className="w-80 h-full overflow-y-auto p-6 space-y-6">
            <h3 className="font-russo font-bold text-white text-lg uppercase mb-6 text-center border-b border-synthwave-neon-cyan/30 pb-4">
              Helpful Tips
            </h3>

            {/* Tip 1 */}
            <div className="flex items-start space-x-3">
              <div className="text-synthwave-neon-pink flex-shrink-0 mt-1">
                <PersonalizedIcon />
              </div>
              <div>
                <h4 className="font-russo font-semibold text-white text-sm uppercase mb-1">
                  Personalized
                </h4>
                <p className="text-xs font-rajdhani text-synthwave-text-secondary leading-relaxed">
                  Your coach will be tailored to your experience level and specific goals
                </p>
              </div>
            </div>

            {/* Tip 2 */}
            <div className="flex items-start space-x-3">
              <div className="text-synthwave-neon-cyan flex-shrink-0 mt-1">
                <GoalFocusedIcon />
              </div>
              <div>
                <h4 className="font-russo font-semibold text-white text-sm uppercase mb-1">
                  Goal-Focused
                </h4>
                <p className="text-xs font-rajdhani text-synthwave-text-secondary leading-relaxed">
                  Programming that matches your specific objectives and timeline
                </p>
              </div>
            </div>

            {/* Tip 3 */}
            <div className="flex items-start space-x-3">
              <div className="text-synthwave-neon-purple flex-shrink-0 mt-1">
                <SafetyFirstIcon />
              </div>
              <div>
                <h4 className="font-russo font-semibold text-white text-sm uppercase mb-1">
                  Safety-First
                </h4>
                <p className="text-xs font-rajdhani text-synthwave-text-secondary leading-relaxed">
                  Considers your limitations and injury history for safe training
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
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
    </>
  );
}

export default CoachCreator;