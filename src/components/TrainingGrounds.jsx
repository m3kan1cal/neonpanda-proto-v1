import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { isCurrentWeekReport, isNewWorkout } from '../utils/dateUtils';
import {
  NeonBorder,
  NewBadge,
  ConversationIcon,
  ReportIcon,
  WorkoutIcon,
  WorkoutIconSmall,
  LightningIcon,
  LightningIconSmall,
  ChevronLeftIcon,
  ChevronRightIcon
} from './themes/SynthwaveComponents';
import { FullPageLoader, CenteredErrorState, InlineError, EmptyState } from './shared/ErrorStates';
import CommandPalette from './shared/CommandPalette';
import TrainingGroundsAgent from '../utils/agents/TrainingGroundsAgent';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import WorkoutAgent from '../utils/agents/WorkoutAgent';
import ReportAgent from '../utils/agents/ReportAgent';

// Local icons not in SynthwaveComponents
const ProgramIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const ResourcesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const MessagesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BarChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

function TrainingGrounds() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');

  const [showCoachDetails, setShowCoachDetails] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');
  const trainingGroundsAgentRef = useRef(null);
  const conversationAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const reportsAgentRef = useRef(null);

  // Training Grounds state (managed by TrainingGroundsAgent - coach data only)
  const [trainingGroundsState, setTrainingGroundsState] = useState({
    coachData: null,
    isLoading: !!(userId && coachId), // Start loading if we have required params
    error: null,
  });

  // Conversation state (managed by CoachConversationAgent)
  const [conversationAgentState, setConversationAgentState] = useState({
    recentConversations: [],
    conversationCount: 0,
    isLoadingRecentItems: false,
    isLoadingConversationCount: !!(userId && coachId), // Start loading count if we have required params
    isLoadingItem: false,
    error: null,
  });



  // Workout state (managed by WorkoutAgent)
  const [workoutState, setWorkoutState] = useState({
    recentWorkouts: [],
    totalWorkoutCount: 0,
    isLoading: false,
    error: null,
  });

  // Reports state (managed by ReportsAgent)
  const [reportsState, setReportsState] = useState({
    recentReports: [],
    isLoadingRecentItems: false,
    isLoadingItem: false,
    error: null,
  });

  // Create stable callback reference with useCallback
  const handleWorkoutStateChange = useCallback((newState) => {
    console.info('TrainingGrounds: WorkoutAgent state changed:', newState);

    // Map specific loading states to general isLoading for backward compatibility
    const mappedState = {
      ...newState,
      isLoading: newState.isLoadingCount || newState.isLoadingRecentItems || newState.isLoadingItem || newState.isLoadingTrainingDays
    };

    setWorkoutState(mappedState);
  }, []); // Empty dependency array = stable reference

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      // Escape key to close coach details or command palette
      if (event.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (showCoachDetails) {
          setShowCoachDetails(false);
        }
      }

      // Cmd/Ctrl + K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteCommand('');
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [showCoachDetails, isCommandPaletteOpen]);

    // Initialize Training Grounds agent (coach data only)
  useEffect(() => {
    if (!trainingGroundsAgentRef.current) {
      trainingGroundsAgentRef.current = new TrainingGroundsAgent({
        userId,
        coachId,
        onStateChange: (newState) => {
          setTrainingGroundsState(newState);
        },
        onError: (error) => {
          console.error('TrainingGroundsAgent error:', error);
          // Could show toast notification here
        }
      });
    }

    return () => {
      if (trainingGroundsAgentRef.current) {
        trainingGroundsAgentRef.current.destroy();
        trainingGroundsAgentRef.current = null;
      }
    };
  }, []); // Remove navigate dependency to prevent re-mounting

  // Initialize conversation agent
  useEffect(() => {
    if (!conversationAgentRef.current) {
      conversationAgentRef.current = new CoachConversationAgent({
        onStateChange: (newState) => {
          setConversationAgentState(newState);
        },
        onNavigation: (type, data) => {
          if (type === 'conversation-created') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          } else if (type === 'view-conversation') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        },
        onError: (error) => {
          console.error('CoachConversationAgent error:', error);
          // Could show toast notification here
        }
      });
    }

    return () => {
      if (conversationAgentRef.current) {
        conversationAgentRef.current.destroy();
        conversationAgentRef.current = null;
      }
    };
  }, []); // Remove navigate dependency to prevent re-mounting

  // Initialize workout agent with stable callback
  useEffect(() => {
    if (!workoutAgentRef.current) {
      console.info('TrainingGrounds: Creating new WorkoutAgent with stable callback');
      workoutAgentRef.current = new WorkoutAgent(null, handleWorkoutStateChange);
    }

    return () => {
      if (workoutAgentRef.current) {
        console.info('TrainingGrounds: Cleaning up WorkoutAgent');
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [handleWorkoutStateChange]);

  // Initialize reports agent
  useEffect(() => {
    if (!reportsAgentRef.current) {
      reportsAgentRef.current = new ReportAgent(null, (newState) => {
        setReportsState(prev => ({
          ...prev,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          recentReports: newState.recentReports || [],
          error: newState.error || null,
        }));
      });
    }
    return () => {
      if (reportsAgentRef.current) {
        reportsAgentRef.current.destroy();
        reportsAgentRef.current = null;
      }
    };
  }, []);

  // Initialize data when userId or coachId changes
  useEffect(() => {
    if (trainingGroundsAgentRef.current && userId && coachId) {
      trainingGroundsAgentRef.current.initialize(userId, coachId);
    }
    if (conversationAgentRef.current && userId && coachId) {
      conversationAgentRef.current.loadRecentConversations(userId, coachId, 5);
      conversationAgentRef.current.loadConversationCount(userId, coachId);
    }
    if (workoutAgentRef.current && userId) {
      console.info('TrainingGrounds: Setting userId and loading workouts for:', userId);
      workoutAgentRef.current.setUserId(userId);
      // Note: setUserId already loads recent workouts, total count, and training days count
    }
    if (reportsAgentRef.current && userId) {
      console.info('TrainingGrounds: Setting userId and loading reports for:', userId);
      reportsAgentRef.current.setUserId(userId);
      reportsAgentRef.current.loadRecentReports(5);
    }
  }, [userId, coachId]);

  const handleStartNewConversation = async () => {
    if (!conversationAgentRef.current || !userId || !coachId || conversationAgentState.isLoadingItem) return;

    try {
      await conversationAgentRef.current.createConversation(userId, coachId);
    } catch (error) {
      // Error handling is managed by the agent via onError callback
    }
  };

  const handleViewConversation = (conversationId) => {
    if (!conversationId || !userId || !coachId) return;
    navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${conversationId}`);
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

  const truncateTitle = (title, maxLength = 30) => {
    if (!title || title.length <= maxLength) return title || 'Untitled';
    return title.substring(0, maxLength) + '...';
  };

  const getWeekDateRange = (weekId) => {
    if (!weekId) return 'Unknown week';

    const [year, week] = weekId.split('-W');
    if (!year || !week) return weekId;

    const firstDayOfYear = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - firstDayOfYear.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (parseInt(week) - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };





  const renderWorkoutList = () => (
    <div className="space-y-2">
      {workoutState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading workouts...</span>
          </div>
        </div>
      ) : workoutState.error ? (
        <InlineError
          title="Workout API Error"
          message={workoutState.error}
          variant="error"
          size="medium"
        />
      ) : workoutState.recentWorkouts.length === 0 ? (
        <EmptyState
          title="No workouts found"
          size="medium"
        />
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Workouts
          </div>
          {workoutState.recentWorkouts.map((workout) => {
            const isNew = isNewWorkout(workout.completedAt);
            return (
              <div
                key={workout.workoutId}
                onClick={() => {
                  navigate(`/training-grounds/workouts?userId=${userId}&workoutId=${workout.workoutId}&coachId=${coachId}`);
                }}
                className="relative bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
              >
                {/* NEW badge for workouts within 24 hours */}
                {isNew && <NewBadge />}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    {workoutAgentRef.current?.formatWorkoutSummary(workout, true) || 'Workout'}
                  </div>
                                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                  {workoutAgentRef.current?.formatWorkoutTime(workout.completedAt) || 'Unknown time'}{workout.duration ? ` • ` : ''}<span className="text-synthwave-neon-cyan">{workout.duration ? `${Math.round(workout.duration / 60)}min` : ''}</span>{workout.extractionMetadata?.confidence ? ` • ` : ''}{workout.extractionMetadata?.confidence ? <span className={`${workoutAgentRef.current?.getConfidenceColorClass(workout.extractionMetadata.confidence) || 'text-synthwave-text-secondary'}`}>{workoutAgentRef.current?.getConfidenceDisplay(workout.extractionMetadata.confidence) || 'Unknown'}</span> : ''}
                </div>
                </div>
                <div className="text-synthwave-neon-pink ml-2">
                  <LightningIconSmall />
                </div>
              </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );





  if (!userId || !coachId) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message="Both User ID and Coach ID are required to access the Training Grounds."
        buttonText="Back to Coaches"
        onButtonClick={() => navigate(`/coaches?userId=${userId || ''}`)}
        variant="error"
      />
    );
  }

  if (trainingGroundsState.isLoading) {
    return <FullPageLoader text="Loading Training Grounds..." />;
  }

  if (trainingGroundsState.error) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={trainingGroundsState.error}
        buttonText="Back to Coaches"
        onButtonClick={() => navigate(`/coaches?userId=${userId || ''}`)}
        variant="error"
      />
    );
  }

  return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Training Grounds
            </h1>
            <div className="font-rajdhani text-xl text-synthwave-text-secondary mb-6 flex items-center justify-center space-x-3">
              <span className="text-synthwave-neon-pink">{trainingGroundsState.coachData?.name}</span>
              <button
                onClick={() => setShowCoachDetails(!showCoachDetails)}
                className={`text-synthwave-neon-pink hover:text-synthwave-neon-pink transition-all duration-300 p-1 rounded-full hover:bg-synthwave-neon-pink/10 hover:shadow-lg hover:shadow-synthwave-neon-pink/50 ${
                  showCoachDetails ? 'bg-synthwave-neon-pink/20 shadow-lg shadow-synthwave-neon-pink/50' : ''
                }`}
                title={showCoachDetails ? "Hide coach details" : "View coach details"}
              >
                <InfoIcon />
              </button>
            </div>
            <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
              Track progress, access resources, stay connected, and manage your complete fitness journey. Everything you need to achieve your goals is centralized here.
            </p>
            <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <div className="flex items-center space-x-1 bg-synthwave-bg-primary/30 px-2 py-1 rounded border border-synthwave-neon-pink/20">
                <span className="text-synthwave-neon-pink">⌘</span>
                <span>K</span>
              </div>
              <span>for Command Palette</span>
              <div className="flex items-center space-x-1">
                <span>(</span>
                <svg className="w-4 h-4 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Works on any page )</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-12">
          <div className="max-w-4xl mx-auto bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="text-synthwave-neon-pink">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h2 className="font-russo font-bold text-white text-lg uppercase">
                Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* CYAN BUTTONS - Management Actions */}
              {/* Manage Workouts */}
              <button
                onClick={() => {
                  navigate(`/training-grounds/manage-workouts?userId=${userId}&coachId=${coachId}`);
                }}
                className={`${themeClasses.cyanButton} text-sm px-4 py-3 flex items-center justify-center space-x-2`}
              >
                <WorkoutIconSmall />
                <span>Manage Workouts</span>
              </button>

              {/* Manage Memories */}
              <button
                onClick={() => {
                  navigate(`/training-grounds/manage-memories?userId=${userId}&coachId=${coachId}`);
                }}
                className={`${themeClasses.cyanButton} text-sm px-4 py-3 flex items-center justify-center space-x-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Manage Memories</span>
              </button>

              {/* Manage Conversations */}
              <button
                onClick={() => {
                  navigate(`/training-grounds/manage-conversations?userId=${userId}&coachId=${coachId}`);
                }}
                className={`${themeClasses.cyanButton} text-sm px-4 py-3 flex items-center justify-center space-x-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Manage Conversations</span>
              </button>

              {/* View Reports */}
              <button
                onClick={() => {
                  navigate(`/training-grounds/reports?userId=${userId}&coachId=${coachId}`);
                }}
                className={`${themeClasses.cyanButton} text-sm px-4 py-3 flex items-center justify-center space-x-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>View Reports</span>
              </button>

              {/* PINK BUTTONS - Creation/Writing Actions */}
              {/* Log Workout */}
              <button
                onClick={() => {
                  setCommandPaletteCommand('/log-workout ');
                  setIsCommandPaletteOpen(true);
                }}
                className={`${themeClasses.neonButton} text-sm px-4 py-3 flex items-center justify-center space-x-2`}
              >
                <WorkoutIconSmall />
                <span>Log Workout</span>
              </button>

              {/* Start Conversation */}
              <button
                onClick={handleStartNewConversation}
                disabled={conversationAgentState.isLoadingItem}
                className={`${themeClasses.neonButton} text-sm px-4 py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {conversationAgentState.isLoadingItem ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Start Conversation</span>
                  </>
                )}
              </button>

              {/* Save Memory */}
              <button
                onClick={() => {
                  setCommandPaletteCommand('/save-memory ');
                  setIsCommandPaletteOpen(true);
                }}
                className={`${themeClasses.neonButton} text-sm px-4 py-3 flex items-center justify-center space-x-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Save Memory</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-4xl">
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            {conversationAgentState.isLoadingConversationCount ? (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1 flex items-center justify-center h-8">
                  <div className="w-6 h-6 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Total Conversations
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {conversationAgentState.conversationCount || 0}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Total Conversations
                </div>
              </>
            )}
          </div>
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            {workoutState.isLoadingCount ? (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1 flex items-center justify-center h-8">
                  <div className="w-6 h-6 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Total Workouts
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {workoutState.totalWorkoutCount || 0}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Total Workouts
                </div>
              </>
            )}
          </div>
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            {trainingGroundsState.isLoading ? (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1 flex items-center justify-center h-8">
                  <div className="w-6 h-6 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Active Programs
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {trainingGroundsState.coachData?.activePrograms || 0}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Active Programs
                </div>
              </>
            )}
          </div>
          <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
            {workoutState.isLoadingTrainingDays ? (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1 flex items-center justify-center h-8">
                  <div className="w-6 h-6 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Days Training
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {workoutState.trainingDaysCount || 0}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Days Training
                </div>
              </>
            )}
          </div>
          </div>
        </div>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Conversations Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <ConversationIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Conversations
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Chat with your coach for personalized guidance and support.
            </p>

            {/* Recent Conversations List */}
            <div className="space-y-2 mb-6">
              {conversationAgentState.isLoadingRecentItems ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
                    <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading conversations...</span>
                  </div>
                </div>
              ) : conversationAgentState.recentConversations.length > 0 ? (
                <>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
                    Recent Conversations
                  </div>
                  {conversationAgentState.recentConversations.map((conversation) => (
                    <div
                      key={conversation.conversationId}
                      onClick={() => handleViewConversation(conversation.conversationId)}
                      className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-rajdhani text-sm text-white font-medium truncate">
                            {truncateTitle(conversation.title)}
                          </div>
                          <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                            {formatConversationDate(conversation.metadata?.lastActivity || conversation.createdAt)} • <span className="text-synthwave-neon-cyan">{conversation.metadata?.totalMessages || 0} messages</span>
                          </div>
                        </div>
                        <div className="text-synthwave-neon-pink ml-2">
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                    No conversations yet
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workout History Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <WorkoutIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Workout History
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Recent completed workouts and detailed session logs with performance tracking.
            </p>

            {/* Workout List */}
            <div>
              {renderWorkoutList()}
            </div>
          </div>

          {/* Reports & Insights Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <ReportIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Reports & Insights
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">Weekly and monthly reports with insights and recommendations.</p>

            <div className="space-y-2 mb-2">
              {reportsState.isLoadingRecentItems ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
                    <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading reports...</span>
                  </div>
                </div>
              ) : reportsState.error ? (
                <InlineError
                  title="Reports API Error"
                  message={reportsState.error}
                  variant="error"
                  size="small"
                />
              ) : reportsState.recentReports.length === 0 ? (
                <EmptyState
                  title="No reports found"
                  size="small"
                />
              ) : (
                <>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">Recent Reports</div>
                  {reportsState.recentReports.map((rep) => {
                    const isNew = isCurrentWeekReport(rep.weekId);
                    return (
                      <div
                        key={rep.weekId}
                        onClick={() => navigate(`/training-grounds/reports/weekly?userId=${userId}&weekId=${rep.weekId}&coachId=${coachId}`)}
                                                className="relative bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
                      >
                        {/* NEW badge for current week reports */}
                        {isNew && <NewBadge />}

                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-rajdhani text-sm text-white font-medium truncate">
                              Week {rep.weekId}
                            </div>
                            <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                              {getWeekDateRange(rep.weekId)} • <span className="text-synthwave-neon-cyan">{rep.metadata?.workoutCount || 0} workouts</span>
                            </div>
                          </div>
                          <div className="ml-2 text-synthwave-neon-pink">
                            <BarChartIcon />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Training Programs Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <ProgramIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Training Programs
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Structured training programs and workout plans designed by you and your coach.
            </p>
            <div className="text-center py-8">
              <div className="font-rajdhani text-synthwave-text-muted text-sm">
                This feature is in active development and is coming soon
              </div>
            </div>
          </div>

          {/* Resources & Tools Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <ResourcesIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Resources & Tools
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Exercise library, training tools, and educational resources to enhance your training.
            </p>
            <div className="text-center py-8">
              <div className="font-rajdhani text-synthwave-text-muted text-sm">
                This feature is in active development and is coming soon
              </div>
            </div>
          </div>

          {/* Messages & Notifications Section */}
          <div className="bg-synthwave-bg-card/50 border-2 border-synthwave-neon-pink/30 rounded-lg p-6 transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-synthwave-neon-pink">
                <MessagesIcon />
              </div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Messages & Notifications
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
              Important messages and notifications from your coach and the platform.
            </p>
            <div className="text-center py-8">
              <div className="font-rajdhani text-synthwave-text-muted text-sm">
                This feature is in active development and is coming soon
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Coach Details Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowCoachDetails(!showCoachDetails)}
          className={`bg-synthwave-bg-card/90 border-2 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:border-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
            showCoachDetails ? 'bg-synthwave-neon-pink/20 shadow-lg shadow-synthwave-neon-pink/50' : ''
          }`}
          title={showCoachDetails ? "Hide coach details" : "View coach details"}
        >
          <InfoIcon />
        </button>
      </div>

      {/* Mobile Coach Details Modal */}
      {showCoachDetails && (
        <div className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-synthwave-bg-card/95 border-2 border-synthwave-neon-pink/30 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-synthwave-neon-pink/30 pb-4 mb-6">
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Coach Details
                </h3>
                <button
                  onClick={() => setShowCoachDetails(false)}
                  className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300"
                >
                  <ChevronRightIcon />
                </button>
              </div>

              {trainingGroundsState.coachData && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Basic Information
                    </h4>
                    <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                                          <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Name:</span>
                      <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Created:</span>
                      <span className="text-synthwave-neon-cyan">{new Date(trainingGroundsState.coachData.rawCoach?.coachConfig?.metadata?.created_date).toLocaleDateString()}</span>
                    </div>
                    </div>
                  </div>

                  {/* Training Configuration */}
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Training Configuration
                    </h4>
                    <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Experience Level:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.experienceLevel}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Programming Focus:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.programmingFocus}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Specializations:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.specialization}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Activity Statistics
                    </h4>
                    <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Total Conversations:</span>
                        <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.totalConversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Active Programs:</span>
                        <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.activePrograms}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Mobile Sections - abbreviated for space */}
                  {(trainingGroundsState.coachData.rawCoach?.coachConfig?.metadata?.methodology_profile ||
                    trainingGroundsState.coachData.rawCoach?.coachConfig?.technical_config?.methodology ||
                    trainingGroundsState.coachData.rawCoach?.coachConfig?.selected_methodology) && (
                    <div>
                      <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                        Methodology
                      </h4>
                      <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Primary:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.primaryMethodology}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {trainingGroundsState.coachData.rawCoach?.coachConfig?.metadata?.safety_profile?.equipment && (
                    <div>
                      <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                        Equipment
                      </h4>
                      <div className={`${themeClasses.cardText} text-sm`}>
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Available Equipment:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.equipment.map(eq => eq.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Coach Details Panel - Slides from Right */}
      <div className="hidden lg:block">
        {/* Toggle Button */}
        <button
          onClick={() => setShowCoachDetails(!showCoachDetails)}
          className={`fixed top-1/2 -translate-y-1/2 bg-synthwave-bg-card/90 border-2 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:border-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 p-3 rounded-l-lg transition-all duration-300 hover:-translate-x-1 z-50 ${
            showCoachDetails ? 'right-[28rem]' : 'right-0'
          }`}
          title={showCoachDetails ? "Hide coach details" : "Show coach details"}
        >
          <div className="flex items-center space-x-1">
            <InfoIcon />
            {showCoachDetails ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </div>
        </button>

        {/* Details Panel - Slides from Right */}
        <div className={`fixed top-20 right-0 h-[calc(100vh-5rem)] bg-synthwave-bg-card/95 backdrop-blur-sm border-l-2 border-synthwave-neon-pink/30 transition-all duration-300 z-40 ${
          showCoachDetails ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className="w-[28rem] h-full overflow-y-auto synthwave-scrollbar p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-synthwave-neon-pink/30 pb-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="text-synthwave-neon-pink">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Coach Details
                </h3>
              </div>
              <button
                onClick={() => setShowCoachDetails(false)}
                className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300"
              >
                <ChevronRightIcon />
              </button>
            </div>

            {trainingGroundsState.coachData && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    Basic Information
                  </h4>
                                      <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Name:</span>
                      <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Coach ID:</span>
                      <span className="text-synthwave-neon-cyan">{coachId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Created:</span>
                      <span className="text-synthwave-neon-cyan">{new Date(trainingGroundsState.coachData.rawCoach?.coachConfig?.metadata?.created_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Training Configuration */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    Training Configuration
                  </h4>
                                      <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Experience Level:</span>
                      <span className="text-synthwave-neon-cyan font-medium">
                        {trainingGroundsState.coachData.experienceLevel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Programming Focus:</span>
                      <span className="text-synthwave-neon-cyan font-medium">
                        {trainingGroundsState.coachData.programmingFocus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Specializations:</span>
                      <span className="text-synthwave-neon-cyan font-medium">
                        {trainingGroundsState.coachData.specialization}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    Activity Statistics
                  </h4>
                  <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Total Conversations:</span>
                        <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.totalConversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Active Programs:</span>
                        <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.activePrograms}</span>
                      </div>
                  </div>
                </div>

                {/* Methodology Profile - Show if we have methodology data from any source */}
                {(trainingGroundsState.coachData.rawCoach?.coachConfig?.metadata?.methodology_profile ||
                  trainingGroundsState.coachData.rawCoach?.coachConfig?.technical_config?.methodology ||
                  trainingGroundsState.coachData.rawCoach?.coachConfig?.selected_methodology) && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Methodology Profile
                    </h4>
                    <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Primary Methodology:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.primaryMethodology}
                        </span>
                      </div>
                      {trainingGroundsState.coachData.rawCoach.coachConfig?.metadata?.methodology_profile?.experience && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Experience:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.methodology_profile.experience.map(exp => exp.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      )}
                      {trainingGroundsState.coachData.rawCoach.coachConfig?.metadata?.methodology_profile?.preferences && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Preferences:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.methodology_profile.preferences.map(pref => pref.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      )}
                      {/* Show note if only basic methodology is available */}
                      {!trainingGroundsState.coachData.rawCoach.coachConfig?.metadata?.methodology_profile && (
                        <div className={`${themeClasses.cardText} text-sm text-synthwave-text-muted bg-synthwave-bg-card/20 border border-synthwave-text-muted/20 p-3 rounded-lg`}>
                          Basic methodology configuration. Extended profile available in newer coach versions.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Safety Profile */}
                {trainingGroundsState.coachData.rawCoach?.coachConfig?.metadata?.safety_profile && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Safety & Equipment Profile
                    </h4>
                    <div className={`space-y-3 ${themeClasses.cardText} text-sm`}>
                      {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.equipment && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Available Equipment:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.equipment.map(eq => eq.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      )}
                      {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.contraindications && trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.contraindications.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Contraindications:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.contraindications.map(contra => contra.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      )}
                      {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.modifications && trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.modifications.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Required Modifications:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.modifications.map(mod => mod.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      )}
                      {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Time Constraints:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration && typeof trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration === 'string'
                              ? trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration.replace(/_/g, ' ')
                              : trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.session_duration || 'Not specified'
                            } • {trainingGroundsState.coachData.rawCoach.coachConfig.metadata.safety_profile.timeConstraints.preferred_time || 'Not specified'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Personality */}
                {trainingGroundsState.coachData.rawCoach?.coachConfig?.selected_personality && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Personality Configuration
                    </h4>
                    <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Primary Template:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.primary_template && typeof trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.primary_template === 'string'
                            ? trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.primary_template.replace(/_/g, ' ')
                            : trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.primary_template || 'Not specified'}
                        </span>
                      </div>
                      {trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.secondary_influences && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Secondary Influences:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.secondary_influences.map(inf => inf.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      )}
                      {trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.selection_reasoning && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-2">Selection Reasoning:</span>
                          <span className="text-synthwave-neon-cyan">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.selected_personality.selection_reasoning}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Advanced Technical Configuration */}
                {trainingGroundsState.coachData.rawCoach?.coachConfig?.technical_config && (
                  <div>
                    <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                      Advanced Technical Config
                    </h4>
                    <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Goal Timeline:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.goal_timeline && typeof trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.goal_timeline === 'string'
                            ? trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.goal_timeline.replace(/_/g, ' ')
                            : trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.goal_timeline || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Training Frequency:</span>
                        <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.training_frequency} days/week</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Intensity:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity && typeof trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity === 'string'
                            ? trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity.replace(/_/g, ' ')
                            : trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.preferred_intensity || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-synthwave-text-secondary">Methodology:</span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.methodology && typeof trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.methodology === 'string'
                            ? trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.methodology.replace(/_/g, ' ')
                            : trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.methodology || 'Not specified'}
                        </span>
                      </div>
                      {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.injury_considerations && trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.injury_considerations.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-synthwave-text-secondary">Injury Considerations:</span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.injury_considerations.map(inj => inj.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </div>
                      )}
                      {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.safety_constraints && (
                        <div>
                          <span className="text-synthwave-text-secondary block mb-2">Safety Constraints:</span>
                          <div className="text-synthwave-neon-cyan space-y-1">
                            {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.volume_progression_limit && (
                              <div>Volume Progression: {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.volume_progression_limit}</div>
                            )}
                            {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.contraindicated_exercises && (
                              <div>Contraindicated: {trainingGroundsState.coachData.rawCoach.coachConfig.technical_config.safety_constraints.contraindicated_exercises.join(', ').replace(/_/g, ' ')}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* System Information */}
                <div>
                  <h4 className="font-russo font-semibold text-synthwave-neon-pink text-sm uppercase mb-3">
                    System Information
                  </h4>
                  <div className={`space-y-2 ${themeClasses.cardText} text-sm`}>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Coach Type:</span>
                      <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.rawCoach.type || 'AI Coach'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Version:</span>
                      <span className="text-synthwave-neon-cyan font-medium">
                        {trainingGroundsState.coachData.rawCoach.coachConfig?.metadata?.version || 'v1.0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-synthwave-text-secondary">Entity Type:</span>
                      <span className="text-synthwave-neon-cyan font-medium">{trainingGroundsState.coachData.rawCoach?.entityType || 'coach'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand('');
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={workoutAgentRef.current}
        userId={userId}
        coachId={coachId}
      />

    </div>
  );
}

export default TrainingGrounds;
