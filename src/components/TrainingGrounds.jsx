import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { containerPatterns, layoutPatterns } from '../utils/uiPatterns';
import { isCurrentWeekReport, isNewWorkout, isRecentConversation } from '../utils/dateUtils';
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
import CoachHeader from './shared/CoachHeader';
import CommandPalette from './shared/CommandPalette';
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import CoachAgent from '../utils/agents/CoachAgent';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import WorkoutAgent from '../utils/agents/WorkoutAgent';
import ReportAgent from '../utils/agents/ReportAgent';

// Local icons not in SynthwaveComponents
const ProgramIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');
  const coachAgentRef = useRef(null);
  const conversationAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const reportsAgentRef = useRef(null);

  // Coach data state (managed by CoachAgent)
  const [coachData, setCoachData] = useState(null);
  const [isLoadingCoachData, setIsLoadingCoachData] = useState(!!(userId && coachId));
  const [coachDataError, setCoachDataError] = useState(null);

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
    trainingDaysCount: 0,
    lastWorkoutDaysAgo: 0,
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
      // Escape key to close command palette
      if (event.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
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
  }, [isCommandPaletteOpen]);

  // Load coach data for FloatingMenuManager and stats
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        setIsLoadingCoachData(true);
        setCoachDataError(null);

        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loadedCoachData = await coachAgentRef.current.loadCoachDetails(userId, coachId);
        setCoachData(loadedCoachData);
        setIsLoadingCoachData(false);
      } catch (error) {
        console.error('Failed to load coach data:', error);
        setCoachDataError(error.message);
        setIsLoadingCoachData(false);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

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
    if (conversationAgentRef.current && userId && coachId) {
      conversationAgentRef.current.loadRecentConversations(userId, coachId, 5);
      conversationAgentRef.current.loadConversationCount(userId, coachId);
    }
    if (workoutAgentRef.current && userId) {
      console.info('TrainingGrounds: Setting userId and loading workouts for:', userId);
      workoutAgentRef.current.setUserId(userId);
      // Note: setUserId already loads recent workouts, total count, and training days count

      // Force a re-render to ensure CommandPalette gets updated WorkoutAgent
      // This is a workaround for the race condition between agent initialization and userId setting
      setWorkoutState(prev => ({ ...prev, lastCheckTime: Date.now() }));
    } else {
      console.warn('TrainingGrounds: NOT setting userId for WorkoutAgent:', {
        hasWorkoutAgent: !!workoutAgentRef.current,
        userId: userId,
        userIdType: typeof userId
      });
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
        <div className="space-y-3">
          <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
          <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
          <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
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
                  <WorkoutIconSmall />
                </div>
              </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  // Handle authorization silently - redirect if unauthorized
  useEffect(() => {
    if (!isValidatingUserId && (userIdError || !isValidUserId)) {
      // Redirect to login/auth page instead of showing error
      navigate('/auth/login', { replace: true });
    }
  }, [isValidatingUserId, userIdError, isValidUserId, navigate]);

  // Show skeleton loading while validating or if not authorized (will redirect)
  if (isValidatingUserId || userIdError || !isValidUserId) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Header skeleton */}
          <div className="mb-8 text-center">
            <div className="h-12 bg-synthwave-text-muted/20 rounded animate-pulse w-64 mx-auto mb-6"></div>

            {/* Coach header skeleton */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
              <div className="text-left">
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mb-2"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
              </div>
            </div>

            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-4"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mx-auto"></div>
          </div>

          {/* Compact Quick Stats skeleton */}
          <div className="flex justify-center mb-8">
            <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-6">
                <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-center gap-2 min-w-[120px]">
                      <div className="p-2 bg-synthwave-text-muted/20 rounded-lg">
                        <div className="w-4 h-4 bg-synthwave-text-muted/30 rounded"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          {/* Main sections skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-6 h-80">
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-32 mb-4"></div>
                <div className="space-y-3 mb-6">
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-5/6"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-4/5"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/5"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  if (coachDataError) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={coachDataError}
        buttonText="Back to Coaches"
        onButtonClick={() => navigate(`/coaches?userId=${userId || ''}`)}
        variant="error"
      />
    );
  }

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header */}
        <div className="mb-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Training Grounds
            </h1>

            {/* Coach Header */}
            {coachData && (
              <CoachHeader
                coachData={coachData}
                isOnline={true}
              />
            )}

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


        {/* Compact Quick Stats */}
        <div className="flex justify-center mb-8">
          <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-4">
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                {/* Total Conversations */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 flex items-center justify-center">
                    <ConversationIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    {conversationAgentState.isLoadingConversationCount ? (
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                    ) : (
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {conversationAgentState.conversationCount || 0}
                      </div>
                    )}
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                      Chats
                    </div>
                  </div>
                </div>

                {/* Total Messages */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 flex items-center justify-center">
                    <MessagesIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    {conversationAgentState.isLoadingConversationCount ? (
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                    ) : (
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {conversationAgentState.totalMessages || 0}
                      </div>
                    )}
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                      Messages
                    </div>
                  </div>
                </div>

                {/* Total Workouts */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 hover:text-synthwave-neon-purple rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50 flex items-center justify-center">
                    <WorkoutIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    {workoutState.isLoadingCount ? (
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                    ) : (
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {workoutState.totalWorkoutCount || 0}
                      </div>
                    )}
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                      Workouts
                    </div>
                  </div>
                </div>

                {/* This Week's Workouts */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 flex items-center justify-center">
                    <WorkoutIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    {workoutState.isLoadingCount ? (
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                    ) : (
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {workoutState.thisWeekWorkoutCount || 0}
                      </div>
                    )}
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                      This Week
                    </div>
                  </div>
                </div>


                {/* Active Programs */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 hover:text-synthwave-neon-purple rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50 flex items-center justify-center">
                    <ProgramIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isLoadingCoachData ? (
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                    ) : (
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {coachData?.activePrograms || 0}
                      </div>
                    )}
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                      Programs
                    </div>
                  </div>
                </div>

                {/* Day Streak */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 flex items-center justify-center">
                    <LightningIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    {workoutState.isLoadingTrainingDays ? (
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                    ) : (
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {workoutState.trainingDaysCount || 0}
                      </div>
                    )}
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                      Days
                    </div>
                  </div>
                </div>

                {/* Total Reports */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 flex items-center justify-center">
                    <ReportIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    {reportsState.isLoadingRecentItems ? (
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                    ) : (
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {reportsState.recentReports.length || 0}
                      </div>
                    )}
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                      Reports
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Conversations Section */}
          <div className={`${containerPatterns.cardMedium} p-6`}>
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
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
                <div className="space-y-3">
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                </div>
              ) : conversationAgentState.recentConversations.length > 0 ? (
                <>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
                    Recent Conversations
                  </div>
                  {conversationAgentState.recentConversations.map((conversation) => {
                    const isRecent = isRecentConversation(conversation.metadata?.lastActivity, conversation.createdAt);
                    return (
                      <div
                        key={conversation.conversationId}
                        onClick={() => handleViewConversation(conversation.conversationId)}
                        className="relative bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50"
                      >
                        {/* NEW badge for conversations with recent activity */}
                        {isRecent && <NewBadge />}
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
                    );
                  })}
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
          <div className={`${containerPatterns.cardMedium} p-6`}>
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
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
          <div className={`${containerPatterns.cardMedium} p-6`}>
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-3 h-3 bg-synthwave-neon-purple rounded-full flex-shrink-0 mt-2"></div>
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Reports & Insights
              </h3>
            </div>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">Weekly and monthly reports with insights and recommendations.</p>

            <div className="space-y-2 mb-2">
              {reportsState.isLoadingRecentItems ? (
                <div className="space-y-3">
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
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
          <div className={`${containerPatterns.cardMedium} p-6`}>
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
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
          <div className={`${containerPatterns.cardMedium} p-6`}>
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
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
          <div className={`${containerPatterns.cardMedium} p-6`}>
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-3 h-3 bg-synthwave-neon-purple rounded-full flex-shrink-0 mt-2"></div>
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
        onNavigation={(type, data) => {
          if (type === 'conversation-created') {
            // Navigate to the new conversation
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="training-grounds"
        coachData={coachData}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />

    </div>
  );
}

export default TrainingGrounds;
