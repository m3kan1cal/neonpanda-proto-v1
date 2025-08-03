import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import WorkoutAgent from '../utils/agents/WorkoutAgent';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import { useToast } from '../contexts/ToastContext';
import WorkoutViewer from './WorkoutViewer';
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

// Local icons (not shared)
const WorkoutIconLarge = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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

  // Workout title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const workoutAgentRef = useRef(null);
  const agentRef = useRef(null);
  const { addToast, success, error, info } = useToast();

  // Workout state
  const [workoutAgentState, setWorkoutAgentState] = useState({
    currentWorkout: null,
    recentWorkouts: [],
    isLoadingRecentItems: false,
    isLoadingItem: !!(userId && workoutId && coachId), // Start loading if we have required params
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
    recentConversations: [],
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
        success(`Workout logged: ${title}`);
      };
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId, success]);

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

  // Auto-scroll to top when workoutId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [workoutId]);

  // Load specific workout
  useEffect(() => {
    if (!userId || !workoutId || !workoutAgentRef.current) return;

    const loadWorkout = async () => {
      try {
        // Clear any existing workout and set loading state
        setWorkoutAgentState(prevState => ({
          ...prevState,
          currentWorkout: null,
          isLoadingItem: true,
          error: null
        }));

        // Use the workout agent to get the specific workout
        // The agent will handle isLoadingItem state internally via state callback
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
        error('Failed to create conversation - no ID returned');
      }
    } catch (error) {
      console.error('Workouts.jsx: Error creating new conversation:', error);
      error('Failed to create conversation');
      // Fall back to training grounds if creation fails
      navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Workout title editing handlers
  const handleEditTitle = () => {
    setEditTitleValue(workoutAgentState.currentWorkout?.workoutData?.workout_name || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim() || !workoutAgentRef.current || !workoutAgentState.currentWorkout) return;

    setIsSavingTitle(true);
    try {
      await workoutAgentRef.current.updateWorkout(userId, workoutAgentState.currentWorkout.workoutId, {
        workoutData: {
          workout_name: editTitleValue.trim()
        }
      });

      // Update local state with the new title
      setWorkoutAgentState(prevState => ({
        ...prevState,
        currentWorkout: {
          ...prevState.currentWorkout,
          workoutData: {
            ...prevState.currentWorkout.workoutData,
            workout_name: editTitleValue.trim()
          }
        }
      }));

      setIsEditingTitle(false);
      success('Workout title updated successfully');
    } catch (error) {
      console.error('Error updating workout title:', error);
      error('Failed to update workout title');
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

  // Delete workout handlers
  const handleDeleteClick = (workout) => {
    setWorkoutToDelete(workout);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete || !workoutAgentRef.current || !userId) return;

    setIsDeleting(true);
    try {
      await workoutAgentRef.current.deleteWorkout(userId, workoutToDelete.workoutId);
      success('Workout deleted successfully');
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
      // Navigate back to manage workouts after successful deletion
      navigate(`/training-grounds/manage-workouts?userId=${userId}&coachId=${coachId}`);
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

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  // Close delete modal when pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showDeleteModal) {
        handleCancelDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDeleteModal, handleCancelDelete]);

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
                {isEditingTitle ? (
                  <div className="flex items-center justify-center space-x-2">
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={handleTitleKeyPress}
                      className="bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-cyan/30 rounded px-3 py-1 text-synthwave-neon-cyan font-rajdhani text-lg font-normal focus:outline-none focus:border-synthwave-neon-cyan transition-all duration-200"
                      placeholder="Enter workout title..."
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
                    <span>{workout.workoutData?.workout_name || 'Unnamed Workout'}</span>
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
                    <WorkoutViewer
                      workout={workout}
                      onToggleView={handleToggleView}
                      onDeleteWorkout={handleDeleteClick}
                    />
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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

export default Workouts;