import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import { parseMarkdown } from '../utils/markdownParser.jsx';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import { useToast } from '../contexts/ToastContext';
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import {
  WorkoutIcon,
  CloseIcon
} from './themes/SynthwaveComponents';

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

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CancelIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const TypingIndicator = () => (
  <div className="flex space-x-1 p-4">
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
);



function CoachConversations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');
  const conversationId = searchParams.get('conversationId');

  // UI-specific state
  const [inputMessage, setInputMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(!conversationId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);




  // Slash command states
  const [showSlashCommandTooltip, setShowSlashCommandTooltip] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Add flag to prevent double execution from React StrictMode
  const isSendingMessage = useRef(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const { showToast } = useToast();

  // Agent state (managed by CoachConversationAgent)
  const [coachConversationAgentState, setCoachConversationAgentState] = useState({
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
    console.info("Component received coach data:", coachConversationAgentState.coach);
  }, [coachConversationAgentState.coach]);



  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !coachId || !conversationId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, coachId, conversationId, navigate]);



  // Initialize agent
  useEffect(() => {
    if (!userId || !coachId || !conversationId) return;

    // Reset agent state when conversationId changes to ensure loading state is shown
    setCoachConversationAgentState(prevState => ({
      ...prevState,
      conversation: null,
      messages: [],
      isLoadingItem: true
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
          if (type === 'conversation-not-found') {
            navigate('/training-grounds', { replace: true });
          }
        },
        onError: (error) => {
          console.error('Agent error:', error);
          // Could show toast notification here
        }
      });

      console.info('Agent initialized, loading conversation...', { userId, coachId, conversationId });

      // Load the conversation after agent is ready
      setTimeout(() => {
        if (agentRef.current) {
          agentRef.current.loadExistingConversation(userId, coachId, conversationId);

          // If the conversations popover is open, also load conversations list
          if (activePopover === 'conversations') {
            console.info('Loading conversations list after agent initialization...');
            agentRef.current.loadRecentConversations(userId, coachId);
          }
        }
      }, 50);
    } else {
      // Agent exists, but conversationId changed - load new conversation
      console.info('Agent exists, loading new conversation...', { userId, coachId, conversationId });
      agentRef.current.loadExistingConversation(userId, coachId, conversationId);
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId, coachId, conversationId, navigate]);





  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };



  const autoResizeTextarea = (textarea) => {
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Set height based on scrollHeight, with min and max constraints
    const minHeight = 48; // 3rem = 48px
    const maxHeight = 144; // 9rem = 144px
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
  }, [coachConversationAgentState.messages, coachConversationAgentState.isTyping]);

  // Focus input when chat interface is visible
  useEffect(() => {
    if (userId && coachId && conversationId && inputRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          autoResizeTextarea(inputRef.current);
        }
      }, 100);
    }
  }, [userId, coachId, conversationId]);

  // Also focus when the coach data is loaded (for page refresh scenarios)
  useEffect(() => {
    if (coachConversationAgentState.coach && inputRef.current && !coachConversationAgentState.isLoadingItem) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          autoResizeTextarea(inputRef.current);
        }
      }, 100);
    }
  }, [coachConversationAgentState.coach, coachConversationAgentState.isLoadingItem]);

  useEffect(() => {
    if (inputRef.current) {
      autoResizeTextarea(inputRef.current);
    }
  }, [inputMessage]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Prevent double execution from React StrictMode
    if (isSendingMessage.current || !inputMessage.trim() || !agentRef.current) return;

    isSendingMessage.current = true;
    const messageToSend = inputMessage.trim();
    setInputMessage('');

    // Refocus input and reset size after clearing it
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        autoResizeTextarea(inputRef.current);
      }
    }, 100);

    try {
      await agentRef.current.sendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      // Reset flag after message is sent (success or failure)
      isSendingMessage.current = false;
    }
  };

  const clearConversation = () => {
    if (agentRef.current) {
      agentRef.current.clearConversation();
      setInputMessage('');

      // Focus input and reset size after clearing conversation
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          autoResizeTextarea(inputRef.current);
        }
      }, 100);
    }
  };

    const handleKeyPress = (e) => {
    // Handle slash command navigation when tooltip is visible
    if (showSlashCommandTooltip) {
      const availableCommands = getAvailableSlashCommands();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev =>
          prev < availableCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev =>
          prev > 0 ? prev - 1 : availableCommands.length - 1
        );
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const selectedCommand = availableCommands[selectedCommandIndex];
        setInputMessage(selectedCommand.command + ' ');
        setShowSlashCommandTooltip(false); // Close tooltip
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashCommandTooltip(false); // Close tooltip
        return;
      }
    }

    // Default behavior for sending messages
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };



  const handleEditTitle = () => {
    setEditTitleValue(coachConversationAgentState.conversation?.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim() || !agentRef.current) return;

    setIsSavingTitle(true);
    try {
      await agentRef.current.updateCoachConversation(userId, coachId, conversationId, { title: editTitleValue.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating conversation title:', error);
      // Could show toast notification here
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditTitleValue('');
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
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
      content: content.trim()
    };
  };

  // Helper function to render message content with line breaks
  const renderMessageContent = (message) => {
    if (message.type === 'ai') {
      // AI messages use full markdown parsing
      return parseMarkdown(message.content);
    } else {
      // User messages: simple line break rendering
      if (!message.content) return message.content;

      return message.content.split('\n').map((line, index, array) => (
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
      { command: '/log-workout', description: 'Log a completed workout', example: '/log-workout I did Fran in 8:57' }
    ];
  };

      // Simple function to check if we should show slash command tooltip
  const shouldShowTooltip = () => {
    return inputMessage.startsWith('/') && inputMessage.length > 0 && !inputMessage.includes(' ');
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







  // Show loading state while initializing coach or loading conversation
  if (coachConversationAgentState.isLoadingItem && (!coachConversationAgentState.coach || !coachConversationAgentState.conversation ||
      (coachConversationAgentState.conversation && coachConversationAgentState.conversation.conversationId !== conversationId))) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
          <p className="text-synthwave-text-secondary font-rajdhani">
            Loading conversation...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (coachConversationAgentState.error && !coachConversationAgentState.coach) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="mb-6">
            <div className="font-russo text-2xl text-synthwave-neon-cyan mb-4 uppercase tracking-wide">
              Connection Error
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-lg">
              {coachConversationAgentState.error}
            </p>
          </div>
          <button
            onClick={() => navigate('/training-grounds')}
            className={`${themeClasses.neonButton}`}
          >
            Back to Training Grounds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          {coachConversationAgentState.coach ? (
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Chat with: <span className="text-synthwave-neon-pink">{coachConversationAgentState.coach.name}</span>
            </h1>
          ) : (
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Chat with Your Coach
            </h1>
          )}

          {/* Conversation Title */}
          {coachConversationAgentState.conversation && coachConversationAgentState.conversation.title && (
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
                    <span className="text-synthwave-neon-pink">Conversation: </span>
                    <span className="text-synthwave-text-secondary">{coachConversationAgentState.conversation.title}</span>
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
            <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 h-full flex flex-col overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {coachConversationAgentState.messages.map((message) => (
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
                    <div className={`flex-1 ${
                      message.type === 'user' ? 'max-w-[70%] ml-auto' : 'max-w-[70%]'
                    }`}>
                      <div className={`rounded-lg px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30'
                          : 'bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/30'
                      }`}>
                        <div className="font-rajdhani text-synthwave-text-primary">
                          {renderMessageContent(message)}
                        </div>
                        <div className="text-sm text-synthwave-text-muted mt-2 font-rajdhani">
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {coachConversationAgentState.isTyping && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border border-synthwave-neon-cyan/50 flex items-center justify-center">
                      <AIIcon />
                    </div>
                    <div className="bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/30 rounded-lg">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-synthwave-neon-pink/30 p-6">
                <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
                  {/* Message Input */}
                  <div className="flex-1 flex flex-col justify-end relative">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value);
                        autoResizeTextarea(e.target);
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="What's on your mind today? How can I help you with your training?"
                      className="w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-pink/30 rounded-lg text-synthwave-text-primary font-rajdhani outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-synthwave-neon-pink hover:border-synthwave-neon-pink/50 transition-colors duration-150 resize-none placeholder-synthwave-text-muted synthwave-scrollbar"
                      style={{
                        minHeight: '3rem',
                        outline: 'none !important',
                        boxShadow: 'none !important',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      disabled={coachConversationAgentState.isLoadingItem}
                    />

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
                                  ? 'bg-synthwave-bg-primary/30 border-synthwave-neon-pink/20'
                                  : 'hover:bg-synthwave-bg-primary/30 border-transparent'
                              }`}
                              onClick={() => {
                                setInputMessage(cmd.command + ' ');
                                inputRef.current?.focus();
                              }}
                            >
                                                                                                                        <div className={`font-rajdhani text-sm ${
                                index === selectedCommandIndex
                                  ? 'text-synthwave-neon-pink'
                                  : 'text-synthwave-neon-pink'
                              }`}>
                                {cmd.command}
                              </div>
                              <div className="flex-1">
                                <div className={`font-rajdhani text-sm ${
                                  index === selectedCommandIndex
                                    ? 'text-white'
                                    : 'text-white'
                                }`}>
                                  {cmd.description}
                                </div>
                                <div className={`font-rajdhani text-xs mt-1 ${
                                  index === selectedCommandIndex
                                    ? 'text-synthwave-text-secondary'
                                    : 'text-synthwave-text-muted'
                                }`}>
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
                      disabled={!inputMessage.trim() || coachConversationAgentState.isLoadingItem}
                      className={`${themeClasses.neonButton} p-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 min-w-[3rem] flex items-center justify-center`}
                      title="Send message"
                    >
                      {coachConversationAgentState.isLoadingItem ? (
                        <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <SendIcon />
                      )}
                    </button>
                  </div>
                </form>

                {/* Quick Topic Suggestions */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {/* Workout Logging Button */}
                  <button
                    className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setInputMessage("/log-workout ")}
                  >
                    <WorkoutIcon />
                    <span>Log Workout</span>
                  </button>

                  {/* Existing buttons */}
                  <button
                    className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                    onClick={() => setInputMessage("I'm checking in for the day. What do I need to be aware of?")}
                  >
                    Daily Check-in
                  </button>
                  <button
                    className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                    onClick={() => setInputMessage("I want to progress/increase the difficulty of my workouts.")}
                  >
                    Progression
                  </button>
                  <button
                    className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                    onClick={() => setInputMessage("I'm feeling unmotivated. Can you help me get back on track?")}
                  >
                    Motivation
                  </button>
                  <button
                    className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                    onClick={() => setInputMessage("Create a WOD for me today based on my goals and training plan.")}
                  >
                    WOD Creation
                  </button>
                </div>
              </div>
            </NeonBorder>
          </div>
        </div>
      </div>

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="coach-conversations"
      />


    </div>
  );
}

export default CoachConversations;