import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import WorkoutAgent from '../utils/agents/WorkoutAgent';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import { useToast } from '../contexts/ToastContext';
import WorkoutViewer from './WorkoutViewer';

// Icons
const WorkoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const WorkoutIconLarge = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function Workouts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const workoutId = searchParams.get('workoutId');
  const coachId = searchParams.get('coachId');

  // Modern popover state
  const [activePopover, setActivePopover] = useState(null);
  const conversationsIconRef = useRef(null);
  const workoutsIconRef = useRef(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' or 'raw'

  const workoutAgentRef = useRef(null);
  const agentRef = useRef(null);
  const { showToast } = useToast();

  // Workout state
  const [workoutAgentState, setWorkoutAgentState] = useState({
    currentWorkout: null,
    recentWorkouts: [],
    isLoadingRecentItems: false,
    isLoadingItem: false,
    error: null,
  });

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

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !workoutId || !coachId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, workoutId, coachId, navigate]);

  // Load conversations when popover is opened
  useEffect(() => {
    if (activePopover === 'conversations' && userId && coachId && agentRef.current) {
      console.info('Loading conversations for popover...', { userId, coachId });
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

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
                  workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        // Use the agent states directly
        setWorkoutAgentState(prevState => ({
          ...prevState,
          // Get loading states from agent
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          // Get data from agent
          recentWorkouts: newState.recentWorkouts || [],
          error: newState.error || null,
          // Keep our current workout separate from the agent's state
          currentWorkout: prevState.currentWorkout
        }));
      });

      // Set up additional callbacks
      workoutAgentRef.current.onError = (error) => {
        console.error('Workout agent error:', error);
      };

      workoutAgentRef.current.onNewWorkout = (workout) => {
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

  // Initialize conversation agent (for popover functionality only)
  useEffect(() => {
    if (!userId || !coachId) return;

    if (!agentRef.current) {
      agentRef.current = new CoachConversationAgent({
        userId,
        coachId,
        conversationId: null, // We don't need a specific conversation for popover
        onStateChange: (newState) => {
          // Only update conversation-related state for popover
          setCoachConversationAgentState(prevState => ({
            ...prevState,
            historicalConversations: newState.historicalConversations || [],
            isLoadingRecentItems: newState.isLoadingRecentItems || false,
            error: newState.error || null,
          }));
        },
        onNavigation: (type, data) => {
          // Handle navigation if needed
        },
        onError: (error) => {
          console.error('Conversation agent error:', error);
        }
      });
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Auto-scroll to top when workoutId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [workoutId]);

  // Load specific workout
  useEffect(() => {
    if (!userId || !workoutId || !workoutAgentRef.current) return;

    const loadWorkout = async () => {
      try {
        // Use the workout agent to get the specific workout
        // The agent will handle isLoadingDetails state internally
        const workout = await workoutAgentRef.current.getWorkout(workoutId);

        setWorkoutAgentState(prevState => ({
          ...prevState,
          currentWorkout: workout,
        }));
      } catch (error) {
        console.error('Error loading workout:', error);
        // Error state is handled by the agent
      }
    };

    loadWorkout();
  }, [userId, workoutId]);

  // Modern popover handlers
  const handleTogglePopover = (popoverType) => {
    setActivePopover(activePopover === popoverType ? null : popoverType);
  };

  const handleClosePopover = () => {
    setActivePopover(null);
  };

  const handleToggleView = () => {
    setViewMode(viewMode === 'formatted' ? 'raw' : 'formatted');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${selectedConversationId}`);
  };

  const handleNewConversation = async () => {
    if (!agentRef.current || !userId || !coachId || isCreatingConversation) return;

    setIsCreatingConversation(true);

    try {
      console.info('Workouts.jsx: Creating new conversation...', { userId, coachId });

      // Create new conversation using the agent
      const result = await agentRef.current.createConversation(userId, coachId);

      console.info('Workouts.jsx: Conversation created successfully:', result);

      // Navigate to the new conversation
      if (result && result.conversationId) {
        console.info('Workouts.jsx: Navigating to conversation:', result.conversationId);
        // Close the popover before navigation
        handleClosePopover();
        navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${result.conversationId}`);
      } else {
        console.error('Workouts.jsx: No conversationId in result:', result);
        showToast('Failed to create conversation - no ID returned', 'error');
      }
    } catch (error) {
      console.error('Workouts.jsx: Error creating new conversation:', error);
      showToast('Failed to create conversation', 'error');
      // Fall back to training grounds if creation fails
      navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
    } finally {
      setIsCreatingConversation(false);
    }
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
                if (workout.workoutId !== workoutId) {
                  navigate(`/training-grounds/workouts?userId=${userId}&workoutId=${workout.workoutId}&coachId=${coachId}`);
                }
                // Close the popover after clicking
                handleClosePopover();
              }}
              className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                workout.workoutId === workoutId
                  ? 'bg-synthwave-bg-primary/50 border-synthwave-neon-pink'
                  : 'bg-synthwave-bg-primary/30 border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50'
              }`}
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
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
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

  // Show loading state (only for main workout, not recent workouts)
  if (workoutAgentState.isLoadingItem && (!workoutAgentState.currentWorkout || workoutAgentState.currentWorkout.workoutId !== workoutId)) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
          <p className="text-synthwave-text-secondary font-rajdhani">Loading workout...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (workoutAgentState.error) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{workoutAgentState.error}</p>
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

  const workout = workoutAgentState.currentWorkout;

  return (
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Workout Details
          </h1>

          {workout && (
            <div className="space-y-2">
              <div className="font-rajdhani text-2xl text-synthwave-neon-pink font-bold">
                {workout.workoutData?.workout_name || 'Unnamed Workout'}
              </div>
              <div className="font-rajdhani text-lg text-synthwave-text-secondary space-y-1 text-center">
                <div>
                  <span className="text-synthwave-neon-pink">Completed:</span> {formatDate(workout.completedAt)}
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                  <div>
                    <span className="text-synthwave-neon-pink">Discipline:</span> {workout.workoutData?.discipline || 'Unknown'}
                  </div>
                  {workout.workoutData?.duration && (
                    <div>
                      <span className="text-synthwave-neon-pink">Duration:</span> {Math.round(workout.workoutData.duration)} minutes
                    </div>
                  )}
                  {workout.extractionMetadata?.confidence && (
                    <div>
                      <span className="text-synthwave-neon-pink">Confidence:</span>
                      <span className={`ml-2 ${workoutAgentRef.current?.getConfidenceColorClass(workout.extractionMetadata.confidence) || 'text-synthwave-text-secondary'}`}>
                        {workoutAgentRef.current?.getConfidenceDisplay(workout.extractionMetadata.confidence) || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 h-full overflow-hidden">
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
              {workout ? (
                <div className="space-y-4">
                  {viewMode === 'formatted' ? (
                    <WorkoutViewer workout={workout} onToggleView={handleToggleView} />
                  ) : (
                    <div className="space-y-6">
                      {/* Toggle View Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={handleToggleView}
                          className={`${themeClasses.neonButton} text-sm px-4 py-2 flex items-center space-x-2`}
                        >
                          <WorkoutIcon />
                          <span>View Formatted</span>
                        </button>
                      </div>

                      {/* Raw JSON Container */}
                      <div className="border border-synthwave-neon-pink/30 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-synthwave-bg-primary/30 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-synthwave-neon-pink">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                            </div>
                            <h3 className="font-russo font-bold text-white text-sm uppercase">
                              Raw Workout Data
                            </h3>
                          </div>
                        </div>
                        <div className="p-4 bg-synthwave-bg-card/20">
                          <pre className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded-lg p-4 text-synthwave-text-primary font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(workout, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-synthwave-text-secondary font-rajdhani text-lg">
                      No workout data available
                    </div>
                  </div>
                </div>
              )}
            </div>
          </NeonBorder>
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
              <div className="flex items-center space-x-2">
                <ChatIcon />
                <span>Start Conversation</span>
              </div>
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
        {/* Action Buttons */}
        <div className="flex flex-col space-y-2 mb-4">
          <button
            onClick={() => {
              // TODO: Implement workout logging functionality
              console.info('Log Workout clicked - functionality to be implemented');
            }}
            className={`${themeClasses.neonButton} text-sm px-4 py-2 transition-all duration-300 flex items-center space-x-2 justify-center`}
          >
            <WorkoutIcon />
            <span>Log Workout</span>
          </button>

          <button
            onClick={() => navigate(`/training-grounds/manage-workouts?userId=${userId}&coachId=${coachId}`)}
            className={`${themeClasses.cyanButton} text-sm px-4 py-2 transition-all duration-300 flex items-center space-x-2 justify-center`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Manage Workouts</span>
          </button>
        </div>

        {/* Workouts List */}
        {renderWorkoutList()}
      </ModernPopover>
    </div>
  );
}

export default Workouts;
