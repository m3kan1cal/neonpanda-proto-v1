import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import { useToast } from '../contexts/ToastContext';
import { WorkoutAgent } from '../utils/agents/WorkoutAgent';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import {
  FloatingIconButton,
  ModernPopover,
  FloatingIconBar,
  WorkoutIcon,
  ChatIcon,
  LightningIcon,
  CloseIcon,
  ChevronRightIcon
} from './shared/FloatingMenu';

// Icons
const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FireIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1-4 4-4 2.5 0 4 1.5 4 4 0 .5 0 1 0 1s1-.5 1-1c0-1-1-2-1-2z" />
  </svg>
);

const PreviewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);



function ManageWorkouts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modern popover state
  const [activePopover, setActivePopover] = useState(null);
  const conversationsIconRef = useRef(null);
  const workoutsIconRef = useRef(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const workoutAgentRef = useRef(null);
  const agentRef = useRef(null);
  const { addToast, success, error, info } = useToast();

  // Unified workout state (like Workouts.jsx)
  const [workoutAgentState, setWorkoutAgentState] = useState({
    allWorkouts: [],               // For main page grid
    recentWorkouts: [],            // For popover
    isLoadingAllItems: !!userId,   // Start loading if we have userId
    isLoadingRecentItems: false,   // For popover loading
    isLoadingItem: false,
    error: null,
    totalCount: 0
  });

  // Agent state for conversations (managed by CoachConversationAgent)
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

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, navigate]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        setWorkoutAgentState(prevState => ({
          ...prevState,
          // Map agent state to component state with separate loading flags
          allWorkouts: newState.allWorkouts || prevState.allWorkouts,
          recentWorkouts: newState.recentWorkouts || prevState.recentWorkouts,
          isLoadingAllItems: newState.isLoadingAllItems || false,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          error: newState.error || null,
          totalCount: newState.totalWorkoutCount || 0
        }));
      });

      // Set up error callback
      workoutAgentRef.current.onError = (error) => {
        console.error('Workout agent error:', error);
        setWorkoutAgentState(prevState => ({
          ...prevState,
          error: error.message || 'Failed to load workouts'
        }));
      };
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId]);

  // Load all workouts (no date filtering)
  useEffect(() => {
    if (!userId || !workoutAgentRef.current) return;

    const loadWorkouts = async () => {
      try {
        // Ensure loading state is active
        setWorkoutAgentState(prevState => ({
          ...prevState,
          isLoadingAllItems: true,
          error: null
        }));

        // Load all workouts without date filtering
        await workoutAgentRef.current.loadAllWorkouts({
          sortBy: 'completedAt',
          sortOrder: 'desc',
          limit: 100  // Get up to 100 workouts (increased from 50)
        });
      } catch (error) {
        console.error('Error loading workout history:', error);
        // Error handling is done by the agent callback
      }
    };

    loadWorkouts();
  }, [userId]);

  // Load conversations when popover is opened
  useEffect(() => {
    if (activePopover === 'conversations' && userId && coachId && agentRef.current) {
      console.info('Loading conversations for popover...', { userId, coachId });
      agentRef.current.loadRecentConversations(userId, coachId, 10);
    }
  }, [activePopover, userId, coachId]);

  // Load workouts when popover is opened
  useEffect(() => {
    if (activePopover === 'workouts' && userId && workoutAgentRef.current) {
      console.info('Loading workouts for popover...', { userId, activePopover });
      workoutAgentRef.current.loadRecentWorkouts(10);
    }
  }, [activePopover, userId]);

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
            recentConversations: newState.recentConversations || [],
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

  // Handle delete click
  const handleDeleteClick = (workout) => {
    setWorkoutToDelete(workout);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!workoutToDelete || !workoutAgentRef.current || !userId) return;

    setIsDeleting(true);
    try {
      await workoutAgentRef.current.deleteWorkout(userId, workoutToDelete.workoutId);
      success('Workout deleted successfully');
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } catch (error) {
      console.error('Error deleting workout:', error);
      error('Failed to delete workout');
      // Close modal even on error so user can try again
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  // Format date for display
  const formatWorkoutDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  // Modern popover handlers
  const handleTogglePopover = (popoverType) => {
    setActivePopover(activePopover === popoverType ? null : popoverType);
  };

  const handleClosePopover = () => {
    setActivePopover(null);
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
      console.info('ManageWorkouts.jsx: Creating new conversation...', { userId, coachId });

      // Create new conversation using the agent
      const result = await agentRef.current.createConversation(userId, coachId);

      console.info('ManageWorkouts.jsx: Conversation created successfully:', result);

      // Navigate to the new conversation
      if (result && result.conversationId) {
        console.info('ManageWorkouts.jsx: Navigating to conversation:', result.conversationId);
        // Close the popover before navigation
        handleClosePopover();
        navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${result.conversationId}`);
      } else {
        console.error('ManageWorkouts.jsx: No conversationId in result:', result);
        error('Failed to create conversation - no ID returned');
      }
    } catch (error) {
      console.error('ManageWorkouts.jsx: Error creating new conversation:', error);
              error('Failed to create conversation');
      // Fall back to training grounds if creation fails
      navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Render workout card
  const renderWorkoutCard = (workout) => {
    const dateInfo = formatWorkoutDate(workout.completedAt || workout.date);
    const workoutName = workoutAgentRef.current?.formatWorkoutSummary(workout, true) || 'Workout';

    const duration = workout.duration ? Math.round(workout.duration / 60) : null;
    const discipline = workout.discipline || 'fitness';
    const intensity = workout.performanceMetrics?.intensity || "~";

    return (
      <div
        key={workout.workoutId}
        data-workout-card
        className={`${themeClasses.glowCard} group cursor-pointer transition-all duration-300 hover:-translate-y-1 relative`}
        onClick={() => navigate(`/training-grounds/workouts?userId=${userId}&workoutId=${workout.workoutId}&coachId=${workout.coachIds?.[0] || 'default'}`)}
      >

                {/* Action buttons - appear on hover at top right */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-3">
          {/* Preview button */}
          {workout.summary && (
            <button
              onClick={(e) => {
                e.stopPropagation();

                if (activeTooltip === workout.workoutId) {
                  setActiveTooltip(null);
                } else {
                  // Get the workout card element (the parent with relative positioning)
                  const workoutCard = e.target.closest('[data-workout-card]');
                  if (workoutCard) {
                    const rect = workoutCard.getBoundingClientRect();
                    setTooltipPosition({
                      x: rect.left + rect.width / 2, // Center horizontally on the card
                      y: rect.bottom + 10 // Position below the card with some spacing
                    });
                  }
                  setActiveTooltip(workout.workoutId);
                }
              }}
              className="text-synthwave-neon-pink hover:text-synthwave-neon-pink/70 transition-colors duration-200"
              title="Preview workout summary"
            >
              <PreviewIcon />
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(workout);
            }}
            className="text-synthwave-neon-pink hover:text-synthwave-neon-pink/70 transition-colors duration-200"
            title="Delete workout"
          >
            <TrashIcon />
          </button>
        </div>

        {/* Workout header */}
        <div className="mb-4">
          <h3 className="font-rajdhani text-xl text-synthwave-neon-pink font-bold mb-2 truncate">
            {workoutName}
          </h3>

                    {/* Metadata with grouped layout */}
          <div className="space-y-1 mb-2">
            {/* Row 1: Discipline and Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between items-center">
                <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Discipline:</span>
                <span className="text-synthwave-text-primary font-rajdhani text-base">{discipline}</span>
              </div>
              {duration && (
                <div className="flex justify-between items-center">
                  <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Duration:</span>
                  <span className="text-synthwave-text-primary font-rajdhani text-base">{duration} min</span>
                </div>
              )}
            </div>

            {/* Row 2: Location and Intensity */}
            <div className="grid grid-cols-2 gap-3">
              {workout.location && (
                <div className="flex justify-between items-center">
                  <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Location:</span>
                  <span className="text-synthwave-text-primary font-rajdhani text-base">{workout.location}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Intensity:</span>
                <span className="text-synthwave-text-primary font-rajdhani text-base">{intensity}/10</span>
              </div>
            </div>

            {/* Row 3: Completed */}
            <div className="flex justify-between items-center">
              <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Completed:</span>
              <span className="text-synthwave-text-primary font-rajdhani text-base">{dateInfo.date}, {dateInfo.time}</span>
            </div>
          </div>
        </div>

        {/* Workout summary */}
        {workout.summary && (
          <div className="space-y-2">
            <p className={`${themeClasses.cardText} text-sm line-clamp-2`}>
              {workout.summary}
            </p>
          </div>
        )}

        {/* Performance indicators */}
        {workout.workoutData?.performance_metrics && (
          <div className="mt-3 pt-3 border-t border-synthwave-neon-pink/20">
            <div className="flex justify-between text-xs text-synthwave-text-muted">
              {workout.workoutData.performance_metrics.intensity && (
                <span>Intensity: {workout.workoutData.performance_metrics.intensity}/10</span>
              )}
              {workout.workoutData.performance_metrics.perceived_exertion && (
                <span>RPE: {workout.workoutData.performance_metrics.perceived_exertion}/10</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render workout list for popover
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
                // Close the popover after clicking
                handleClosePopover();
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

  // Render conversation list for popover
  const renderConversationList = () => (
    <div className="space-y-2">
      {coachConversationAgentState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading conversations...</span>
          </div>
        </div>
      ) : coachConversationAgentState.recentConversations.length === 0 ? (
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
          {coachConversationAgentState.recentConversations.map((conv) => (
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

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Close tooltip when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTooltip && !event.target.closest('[data-tooltip-content]')) {
        setActiveTooltip(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (activeTooltip) {
          setActiveTooltip(null);
        }
        if (showDeleteModal) {
          handleCancelDelete();
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTooltip, showDeleteModal]);

  // Show loading state
  if (workoutAgentState.isLoadingAllItems) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
          <p className="text-synthwave-text-secondary font-rajdhani">Loading workout history...</p>
        </div>
      </div>
    );
  }

  // Find the active workout for tooltip display
  const activeWorkout = workoutAgentState.allWorkouts.find(w => w.workoutId === activeTooltip);

  return (
    <>
      {/* Global tooltip - rendered outside all containers */}
      {activeTooltip && activeWorkout && activeWorkout.summary && (
        <div
          className="fixed w-[32rem] max-w-screen-md opacity-100 transition-opacity duration-300 z-[9999] transform -translate-x-1/2"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`
          }}
        >
          <div className="bg-synthwave-bg-card/95 backdrop-blur-md border-2 border-synthwave-neon-cyan/30 rounded-lg shadow-2xl shadow-synthwave-neon-cyan/20 p-4" data-tooltip-content>
            <div className="flex justify-between items-center mb-2">
              <div className="text-synthwave-neon-cyan font-rajdhani font-bold text-sm uppercase">
                Workout Summary
              </div>
              <button
                onClick={() => setActiveTooltip(null)}
                className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-synthwave-text-primary font-rajdhani text-sm leading-relaxed">
              {activeWorkout.summary}
            </div>
          </div>
        </div>
      )}

      <div className={`${themeClasses.container} min-h-screen pb-8`}>
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Manage Workouts
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Review, organize, and analyze your complete workout history. Track your fitness journey and monitor your progress over time.
          </p>
          {workoutAgentState.totalCount > 0 && (
            <p className="text-synthwave-text-secondary">
              {workoutAgentState.allWorkouts.length} workouts found
            </p>
          )}
        </div>

        {/* Log Workout Button */}
        <div className="flex justify-end mb-6 px-8">
          <button
            onClick={() => {
              // TODO: Implement workout logging functionality
              console.info('Log Workout clicked - functionality to be implemented');
              info('Workout logging functionality coming soon!');
            }}
            className={`${themeClasses.neonButton} text-sm px-6 py-3 flex items-center space-x-2`}
          >
            <WorkoutIcon />
            <span>Log Workout</span>
          </button>
        </div>

        {/* Error state */}
        {workoutAgentState.error && (
          <div className="text-center py-12">
            <NeonBorder color="pink" className="max-w-md mx-auto p-6">
              <p className="text-synthwave-neon-pink mb-2">Error Loading Workouts</p>
              <p className="text-synthwave-text-secondary text-sm">{workoutAgentState.error}</p>
            </NeonBorder>
          </div>
        )}

        {/* Empty state */}
        {!workoutAgentState.isLoadingAllItems && !workoutAgentState.error && workoutAgentState.allWorkouts.length === 0 && (
          <div className="text-center py-12">
            <NeonBorder color="cyan" className="max-w-md mx-auto p-8">
              <h3 className="text-synthwave-neon-cyan mb-4">No Workouts Found</h3>
              <p className="text-synthwave-text-secondary mb-6">
                You haven't logged any workouts yet.
              </p>
              <button
                onClick={() => navigate(`/training-grounds?userId=${userId}`)}
                className={themeClasses.cyanButton}
              >
                Start Training
              </button>
            </NeonBorder>
          </div>
        )}

        {/* Workouts grid */}
        {!workoutAgentState.isLoadingAllItems && !workoutAgentState.error && workoutAgentState.allWorkouts.length > 0 && (
          <div className={themeClasses.cardGrid}>
            {workoutAgentState.allWorkouts.map(renderWorkoutCard)}
          </div>
        )}
      </div>
    </div>

      {/* Modern Floating Icon Bar */}
      <FloatingIconBar>
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
      </FloatingIconBar>

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
            className={`${themeClasses.neonButton} text-sm px-6 py-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2 w-3/4 justify-center`}
          >
            {isCreatingConversation ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <ChatIcon />
                <span>Start Conversation</span>
              </>
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
            className={`${themeClasses.neonButton} text-sm px-6 py-3 transition-all duration-300 inline-flex items-center space-x-2 w-3/4 justify-center`}
          >
            <WorkoutIcon />
            <span>Log Workout</span>
          </button>
        </div>

        {/* Workouts List */}
        {renderWorkoutList()}
      </ModernPopover>

            {/* Delete Confirmation Modal */}
      {showDeleteModal && workoutToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-synthwave-bg-card border-2 border-synthwave-neon-pink/30 rounded-lg shadow-2xl shadow-synthwave-neon-pink/20 p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Workout
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete "{workoutAgentRef.current?.formatWorkoutSummary(workoutToDelete, true) || 'this workout'}"? This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${themeClasses.cyanButton} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
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
    </>
  );
}

export default ManageWorkouts;
