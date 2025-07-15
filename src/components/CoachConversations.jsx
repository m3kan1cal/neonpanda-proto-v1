import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import { parseMarkdown } from '../utils/markdownParser.jsx';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import WorkoutAgent from '../utils/agents/WorkoutAgent';
import { useToast } from '../contexts/ToastContext';

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

const WorkoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const LightningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

// Modern Floating Icon Button Component
const FloatingIconButton = React.forwardRef(({ icon, isActive, onClick, title, className = "" }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className={`
      p-3 rounded-xl transition-all duration-200 backdrop-blur-sm border
      ${isActive
        ? 'bg-synthwave-neon-pink/20 border-synthwave-neon-pink text-synthwave-neon-pink shadow-lg shadow-synthwave-neon-pink/30'
        : 'bg-synthwave-bg-card/40 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 hover:border-synthwave-neon-pink/50 hover:shadow-md'
      }
      ${className}
    `}
    title={title}
  >
    {icon}
  </button>
));

// Modern Popover Component
const ModernPopover = ({ isOpen, onClose, anchorRef, children, title, className = "" }) => {
  const popoverRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen &&
          popoverRef.current &&
          !popoverRef.current.contains(event.target) &&
          anchorRef.current &&
          !anchorRef.current.contains(event.target)) {
        onClose();
      }
    };

    // ESC key to close
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

                  {/* Popover */}
      <div
        ref={popoverRef}
        className={`
          fixed z-50 bg-synthwave-bg-card/95 backdrop-blur-md
          border-2 border-synthwave-neon-pink/30 rounded-xl shadow-2xl
          shadow-synthwave-neon-pink/20 flex flex-col
          ${className}

          /* Mobile positioning - bottom sheet style */
          inset-x-4 bottom-4 top-20

          /* Desktop positioning - to the right of the floating icons */
          lg:left-20 lg:top-1/2 lg:-translate-y-1/2
          lg:w-96 lg:h-[32rem]
          lg:inset-auto
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-synthwave-neon-pink/30 flex-shrink-0">
          <h3 className="font-russo font-bold text-white text-sm uppercase">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300 p-1"
          >
            <CloseIcon />
          </button>
        </div>

                {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto synthwave-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#ff007f40 transparent'
          }}
        >
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

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
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Modern popover state
  const [activePopover, setActivePopover] = useState(null);
  const conversationsIconRef = useRef(null);
  const workoutsIconRef = useRef(null);

  // Slash command states
  const [showSlashCommandTooltip, setShowSlashCommandTooltip] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Add flag to prevent double execution from React StrictMode
  const isSendingMessage = useRef(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const { showToast } = useToast();

  // Agent state (managed by CoachConversationAgent)
  const [coachConversationAgentState, setCoachConversationAgentState] = useState({
    messages: [],
    isLoadingItem: true,
    isTyping: false,
    error: null,
    coach: null,
    conversation: null,
    historicalConversations: [],
    isLoadingRecentItems: false,
  });

  // Workout agent state (managed by WorkoutAgent)
  const [workoutAgentState, setWorkoutAgentState] = useState({
    recentWorkouts: [],
    allWorkouts: [],
    isLoadingRecentItems: false,
    error: null,
    lastCheckTime: null
  });

  // Debug: Log when coach data changes
  useEffect(() => {
    console.info("Component received coach data:", coachConversationAgentState.coach);
  }, [coachConversationAgentState.coach]);

  // Debug: Log when workout state changes
  useEffect(() => {
    console.info("Workout state updated:", workoutAgentState);
  }, [workoutAgentState]);

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !coachId || !conversationId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, coachId, conversationId, navigate]);

  // Load conversations when popover is opened
  useEffect(() => {
    if (activePopover === 'conversations' && userId && coachId && agentRef.current) {
      console.info('Loading conversations for popover...', { userId, coachId, conversationId });
      agentRef.current.loadHistoricalConversations(userId, coachId);
    }
  }, [activePopover, userId, coachId]);

  // Load workouts when popover is opened
  useEffect(() => {
    if (activePopover === 'workouts' && userId && workoutAgentRef.current) {
      console.info('Loading workouts for popover...', { userId, activePopover });
      workoutAgentRef.current.loadRecentWorkouts();
    }
  }, [activePopover, userId]);

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
            agentRef.current.loadHistoricalConversations(userId, coachId);
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

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        // Use agent states directly
        setWorkoutAgentState(prevState => ({
          ...prevState,
          // Get loading states from agent
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          // Get data from agent
          recentWorkouts: newState.recentWorkouts || [],
          error: newState.error || null,
          lastCheckTime: newState.lastCheckTime || null
        }));
      });

      // Set up additional callbacks
      workoutAgentRef.current.onError = (error) => {
        console.error('Workout agent error:', error);
      };

      workoutAgentRef.current.onNewWorkout = (workout) => {
        // Show toast notification for new workout
        const title = workoutAgentRef.current.formatWorkoutSummary(workout, true);
        showToast(`Workout logged: ${title}`, 'success');
      };
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId, showToast]);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Modern popover handlers
  const handleTogglePopover = (popoverType) => {
    setActivePopover(activePopover === popoverType ? null : popoverType);
  };

  const handleClosePopover = () => {
    setActivePopover(null);
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatConversationDate = (dateString) => {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const truncateTitle = (title, maxLength = 40) => {
    if (!title || title.length <= maxLength) return title || 'Untitled';
        return title.substring(0, maxLength) + '...';
  };

  const handleConversationClick = (selectedConversationId) => {
    if (selectedConversationId !== conversationId) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set('userId', userId);
      newSearchParams.set('coachId', coachId);
      newSearchParams.set('conversationId', selectedConversationId);
      navigate(`/training-grounds/coach-conversations?${newSearchParams.toString()}`);
    }
    // Note: Slideout state is now persisted via localStorage, so it stays open across navigation
  };

  const handleNewConversation = async () => {
    if (!agentRef.current || !userId || !coachId || isCreatingConversation) return;

    setIsCreatingConversation(true);

    try {
      console.info('CoachConversations.jsx: Creating new conversation...', { userId, coachId });

      // Create new conversation using the agent
      const result = await agentRef.current.createConversation(userId, coachId);

      console.info('CoachConversations.jsx: Conversation created successfully:', result);

      // Navigate to the new conversation
      // The useEffect will handle refreshing historical conversations when conversationId changes
      if (result && result.conversationId) {
        console.info('CoachConversations.jsx: Navigating to conversation:', result.conversationId);
        // Close the popover before navigation
        handleClosePopover();
        navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${result.conversationId}`);
      } else {
        console.error('CoachConversations.jsx: No conversationId in result:', result);
        showToast('Failed to create conversation - no ID returned', 'error');
      }
    } catch (error) {
      console.error('CoachConversations.jsx: Error creating new conversation:', error);
      showToast('Failed to create conversation', 'error');
      // Fall back to training grounds if creation fails
      navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
    } finally {
      setIsCreatingConversation(false);
    }
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
    const slashCommandRegex = /^\/(\w+)\s*(.*)$/;
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

  // Helper function to check if current input starts with slash command
  const isTypingSlashCommand = () => {
    return inputMessage.startsWith('/') && inputMessage.length > 1;
  };

  // Helper function to get available slash commands
  const getAvailableSlashCommands = () => {
    return [
      { command: '/log-workout', description: 'Log a completed workout', example: '/log-workout I did Fran in 8:57' },
      { command: '/log', description: 'Quick workout log', example: '/log Deadlifted 405x3' },
      { command: '/workout', description: 'Log workout session', example: '/workout 5k run in 24:30' }
    ];
  };



  // Render workout list
  const renderWorkoutList = () => (
    <div className="space-y-2">
      {workoutAgentState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading workouts...</span>
          </div>
        </div>
              ) : workoutAgentState.recentWorkouts.length === 0 ? (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            No workouts found
          </div>
        </div>
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Workouts
          </div>
          {workoutAgentState.recentWorkouts.map((workout) => (
            <div
              key={workout.workoutId}
              onClick={() => {
                navigate(`/training-grounds/workouts?userId=${userId}&workoutId=${workout.workoutId}&coachId=${coachId}`);
              }}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    {workoutAgentRef.current?.formatWorkoutSummary(workout, true) || 'Workout'}
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 flex items-center space-x-2">
                    <span>{workoutAgentRef.current?.formatWorkoutTime(workout.completedAt) || 'Unknown time'}</span>
                    {workout.extractionMetadata?.confidence && (
                      <span className={`${workoutAgentRef.current?.getConfidenceColorClass(workout.extractionMetadata.confidence) || 'text-synthwave-text-secondary'}`}>
                        • {workoutAgentRef.current?.getConfidenceDisplay(workout.extractionMetadata.confidence) || 'Unknown'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-synthwave-neon-pink ml-2">
                  <LightningIcon />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // Render conversation list
  const renderConversationList = () => (
    <div className="space-y-2">
      {coachConversationAgentState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading conversations...</span>
          </div>
        </div>
              ) : coachConversationAgentState.historicalConversations.length === 0 ? (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            No conversations found
          </div>
        </div>
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Conversations
          </div>
          {coachConversationAgentState.historicalConversations.map((conv) => (
            <div
              key={conv.conversationId}
              onClick={() => handleConversationClick(conv.conversationId)}
              className={`bg-synthwave-bg-primary/30 border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                conv.conversationId === conversationId
                  ? 'border-synthwave-neon-pink bg-synthwave-bg-primary/50'
                  : 'border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    {truncateTitle(conv.title)}
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {formatConversationDate(conv.metadata?.lastActivity || conv.createdAt)} • {conv.metadata?.totalMessages || 0} messages
                  </div>
                </div>
                <div className="text-synthwave-neon-pink ml-2">
                  <ChevronRightIcon />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

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
          <p className="text-red-400 mb-4">{coachConversationAgentState.error}</p>
          <button
            onClick={() => navigate('/training-grounds')}
            className={`${themeClasses.buttonPrimary} px-6 py-2 rounded-lg`}
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
                    <span className="text-synthwave-text-secondary">Conversation: </span>
                    <span className="text-synthwave-neon-cyan">{coachConversationAgentState.conversation.title}</span>
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
                        <div className="text-xs text-synthwave-text-muted mt-2">
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
              <div className="border-t border-synthwave-neon-cyan/30 p-6">
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
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => {
                        // Delay hiding tooltip to allow clicking on it
                        setTimeout(() => setIsInputFocused(false), 200);
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="What's on your mind today? How can I help you with your training?"
                      className="w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-cyan/30 rounded-lg text-synthwave-text-primary font-rajdhani focus:outline-none focus:border-synthwave-neon-cyan transition-all duration-200 resize-none placeholder-synthwave-text-muted"
                      style={{ minHeight: '3rem' }}
                      disabled={coachConversationAgentState.isLoadingItem}
                    />

                    {/* Slash Command Tooltip */}
                    {isInputFocused && isTypingSlashCommand() && (
                      <div className="absolute bottom-full mb-2 left-0 bg-synthwave-bg-card/95 border-2 border-synthwave-neon-cyan/30 rounded-lg p-4 shadow-lg backdrop-blur-sm z-10 min-w-[400px]">
                        <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
                          Available Slash Commands
                        </div>
                        <div className="space-y-2">
                          {getAvailableSlashCommands().map((cmd, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-3 p-2 hover:bg-synthwave-bg-primary/30 rounded cursor-pointer transition-colors duration-200"
                              onClick={() => {
                                setInputMessage(cmd.command + ' ');
                                inputRef.current?.focus();
                              }}
                            >
                              <code className="font-mono text-synthwave-neon-cyan text-sm font-bold">
                                {cmd.command}
                              </code>
                              <div className="flex-1">
                                <div className="font-rajdhani text-white text-sm">
                                  {cmd.description}
                                </div>
                                <div className="font-rajdhani text-synthwave-text-muted text-xs mt-1">
                                  {cmd.example}
                                </div>
                              </div>
                            </div>
                          ))}
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
                      className={`${themeClasses.cyanButton} p-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 min-w-[3rem] flex items-center justify-center`}
                      title="Send message"
                    >
                      {coachConversationAgentState.isLoadingItem ? (
                        <div className="w-4 h-4 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
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
                    onClick={() => setInputMessage("I'm experiencing some pain/discomfort. What should I do?")}
                  >
                    Pain/Injury
                  </button>
                  <button
                    className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                    onClick={() => setInputMessage("I want to progress/increase the difficulty of my workouts")}
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
                    onClick={() => setInputMessage("Create a WOD for me today based on my goals and training plan")}
                  >
                    WOD Creation
                  </button>
                </div>
              </div>
            </NeonBorder>
          </div>
        </div>
      </div>

      {/* Modern Floating Icon Bar */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
        <div className="flex flex-col space-y-3">
          <FloatingIconButton
            ref={conversationsIconRef}
            icon={<ChatIcon />}
            isActive={activePopover === 'conversations'}
            onClick={() => handleTogglePopover('conversations')}
            title="Recent Conversations"
          />
          <FloatingIconButton
            ref={workoutsIconRef}
            icon={<LightningIcon />}
            isActive={activePopover === 'workouts'}
            onClick={() => handleTogglePopover('workouts')}
            title="Recent Workouts"
          />
        </div>
      </div>

      {/* Modern Popovers */}
      <ModernPopover
        isOpen={activePopover === 'conversations'}
        onClose={handleClosePopover}
        anchorRef={conversationsIconRef}
        title="Recent Conversations"
      >
        {/* New Conversation Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleNewConversation}
            disabled={isCreatingConversation}
            className={`${themeClasses.neonButton} text-sm px-4 py-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCreatingConversation ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </div>
            ) : (
              'Start New Conversation'
            )}
          </button>
        </div>

        {/* Conversations List */}
        {renderConversationList()}
      </ModernPopover>

      <ModernPopover
        isOpen={activePopover === 'workouts'}
        onClose={handleClosePopover}
        anchorRef={workoutsIconRef}
        title="Recent Workouts"
      >
        {/* Log Workout Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              // TODO: Implement workout logging functionality
              console.info('Log Workout clicked - functionality to be implemented');
            }}
            className={`${themeClasses.neonButton} text-sm px-4 py-2 transition-all duration-300 flex items-center space-x-2`}
          >
            <WorkoutIcon />
            <span>Log Workout</span>
          </button>
        </div>

        {/* Workouts List */}
        {renderWorkoutList()}
      </ModernPopover>


    </div>
  );
}

export default CoachConversations;