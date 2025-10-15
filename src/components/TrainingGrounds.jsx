import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { useToast } from '../contexts/ToastContext';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { containerPatterns, layoutPatterns, changelogListPatterns, tooltipPatterns } from '../utils/uiPatterns';
import { isCurrentWeekReport, isNewWorkout, isRecentConversation, getWeekDateRange, formatWorkoutCount } from '../utils/dateUtils';
import { getLatestVersions, getTotalChanges, generateVersionAnchor } from '../utils/changelogData';
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
  ChevronRightIcon,
  ProgramIcon,
  ResourcesIcon,
  MessagesIcon,
  BarChartIcon
} from './themes/SynthwaveComponents';
import { FullPageLoader, CenteredErrorState, InlineError, EmptyState } from './shared/ErrorStates';
import CoachHeader from './shared/CoachHeader';
import CompactCoachCard from './shared/CompactCoachCard';
import CommandPaletteButton from './shared/CommandPaletteButton';
import CommandPalette from './shared/CommandPalette';
import QuickStats from './shared/QuickStats';
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import CoachAgent from '../utils/agents/CoachAgent';
import CoachConversationAgent from '../utils/agents/CoachConversationAgent';
import WorkoutAgent from '../utils/agents/WorkoutAgent';
import ReportAgent from '../utils/agents/ReportAgent';

function TrainingGrounds() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);
  const { success: showSuccess, error: showError } = useToast();

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
    // Map specific loading states to general isLoading for backward compatibility
    const mappedState = {
      ...newState,
      isLoading: newState.isLoadingCount || newState.isLoadingRecentItems || newState.isLoadingItem || newState.isLoadingTrainingDays
    };

    setWorkoutState(mappedState);
  }, []); // Empty dependency array = stable reference

  // Auto-scroll to top when page loads (with scroll restoration disabled)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // Scroll to top after loading completes
  useEffect(() => {
    if (!isValidatingUserId) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId]);

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
      workoutAgentRef.current = new WorkoutAgent(null, handleWorkoutStateChange);
    }

    return () => {
      if (workoutAgentRef.current) {
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
      workoutAgentRef.current.setUserId(userId);
      // Note: setUserId already loads recent workouts, total count, and training days count

      // Force a re-render to ensure CommandPalette gets updated WorkoutAgent
      // This is a workaround for the race condition between agent initialization and userId setting
      setWorkoutState(prev => ({ ...prev, lastCheckTime: Date.now() }));
    }
    if (reportsAgentRef.current && userId) {
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

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Create coach name handler using the agent's helper method
  // Note: TrainingGrounds needs to reload coach data after update
  const handleSaveCoachName = async (newName) => {
    if (!coachAgentRef.current || !newName || !newName.trim()) {
      return false;
    }

    try {
      await coachAgentRef.current.updateCoachConfig(
        userId,
        coachId,
        { coach_name: newName.trim() }
      );

      // Reload coach data to reflect changes
      const loadedCoachData = await coachAgentRef.current.loadCoachDetails(userId, coachId);
      setCoachData(loadedCoachData);

      showSuccess('Coach name updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating coach name:', error);
      showError('Failed to update coach name');
      return false;
    }
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
      navigate('/auth', { replace: true });
    }
  }, [isValidatingUserId, userIdError, isValidUserId, navigate]);

  // Show skeleton loading while validating or if not authorized (will redirect)
  if (isValidatingUserId || userIdError || !isValidUserId) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              {/* Title skeleton - compact size */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-72"></div>

              {/* Compact coach card skeleton - horizontal pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right: Command button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Quick Stats skeleton */}
          <QuickStats
            stats={[1, 2, 3, 4, 5, 6, 7].map((i) => ({
              icon: null,
              value: 0,
              tooltip: { title: '', description: '' },
              color: 'cyan',
              isLoading: true,
              id: `skeleton-stat-${i}`
            }))}
          />

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
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Training Grounds Header"
        >
          {/* Left section: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Hover Tooltip */}
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="training-grounds-info"
              data-tooltip-content="Your central hub to track progress, access resources, chat with your coach, and manage your complete fitness journey."
            >
              Training Grounds
            </h1>

            {/* Compact Coach Card */}
            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={handleCoachCardClick}
              />
            )}
          </div>

          {/* Right section: Command Palette Button */}
          <div className="flex items-center gap-3">
            <CommandPaletteButton onClick={() => setIsCommandPaletteOpen(true)} />
          </div>
        </header>

        {/* Quick Stats */}
        <QuickStats
          stats={[
            {
              icon: ConversationIcon,
              value: conversationAgentState.conversationCount || 0,
              tooltip: {
                title: `${conversationAgentState.conversationCount || 0} Chats`,
                description: "Total coach conversations you've started"
              },
              color: "pink",
              isLoading: conversationAgentState.isLoadingConversationCount,
              ariaLabel: `${conversationAgentState.conversationCount || 0} total chats`,
              id: "training-stat-chats"
            },
            {
              icon: MessagesIcon,
              value: conversationAgentState.totalMessages || 0,
              tooltip: {
                title: `${conversationAgentState.totalMessages || 0} Messages`,
                description: "Total messages exchanged with your coaches"
              },
              color: "cyan",
              isLoading: conversationAgentState.isLoadingConversationCount,
              ariaLabel: `${conversationAgentState.totalMessages || 0} total messages`,
              id: "training-stat-messages"
            },
            {
              icon: WorkoutIcon,
              value: workoutState.totalWorkoutCount || 0,
              tooltip: {
                title: `${workoutState.totalWorkoutCount || 0} Workouts`,
                description: "Total workouts logged with this coach"
              },
              color: "purple",
              isLoading: workoutState.isLoadingCount,
              ariaLabel: `${workoutState.totalWorkoutCount || 0} total workouts`,
              id: "training-stat-workouts"
            },
            {
              icon: WorkoutIcon,
              value: workoutState.thisWeekWorkoutCount || 0,
              tooltip: {
                title: `${workoutState.thisWeekWorkoutCount || 0} This Week`,
                description: "Workouts completed this week (Sunday-Saturday)"
              },
              color: "pink",
              isLoading: workoutState.isLoadingCount,
              ariaLabel: `${workoutState.thisWeekWorkoutCount || 0} workouts this week`,
              id: "training-stat-this-week"
            },
            {
              icon: ProgramIcon,
              value: coachData?.activePrograms || 0,
              tooltip: {
                title: `${coachData?.activePrograms || 0} Programs`,
                description: "Active training programs you're currently following"
              },
              color: "cyan",
              isLoading: isLoadingCoachData,
              ariaLabel: `${coachData?.activePrograms || 0} active programs`,
              id: "training-stat-programs"
            },
            {
              icon: LightningIcon,
              value: workoutState.trainingDaysCount || 0,
              tooltip: {
                title: `${workoutState.trainingDaysCount || 0} Days`,
                description: "Your current training streak"
              },
              color: "purple",
              isLoading: workoutState.isLoadingTrainingDays,
              ariaLabel: `${workoutState.trainingDaysCount || 0} training days`,
              id: "training-stat-days"
            },
            {
              icon: ReportIcon,
              value: reportsState.recentReports.length || 0,
              tooltip: {
                title: `${reportsState.recentReports.length || 0} Reports`,
                description: "Weekly performance reports generated"
              },
              color: "pink",
              isLoading: reportsState.isLoadingRecentItems,
              ariaLabel: `${reportsState.recentReports.length || 0} reports`,
              id: "training-stat-reports"
            }
          ]}
        />

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
                              {getWeekDateRange(rep)} • <span className="text-synthwave-neon-cyan">{formatWorkoutCount(rep.analyticsData?.structured_analytics?.metadata?.sessions_completed || rep.metadata?.workoutCount || 0)}</span>
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

            {/* Recent Changelog Versions */}
            <div className="space-y-2 mb-2">
              <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">Recent Updates</div>
              {getLatestVersions(5).map((entry, index) => {
                const counts = getTotalChanges(entry);
                // Check if release is within 3 days
                const releaseDate = new Date(entry.date);
                const today = new Date();
                const diffInDays = Math.floor((today - releaseDate) / (1000 * 60 * 60 * 24));
                const isNewRelease = diffInDays <= 3;

                return (
                  <Link
                    key={index}
                    to={`/changelog#${generateVersionAnchor(entry.version)}`}
                    className="relative bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200 flex items-center justify-between"
                  >
                    {/* NEW badge for releases within 3 days */}
                    {isNewRelease && <NewBadge />}

                    <div className="flex-1 min-w-0">
                      <div className="font-rajdhani text-sm text-white font-medium truncate">
                        {entry.version}
                      </div>
                      <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                        {entry.date} • <span className="text-synthwave-neon-cyan">{counts.total} changes</span>
                      </div>
                    </div>
                    <div className="ml-2 text-synthwave-neon-pink">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
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

      {/* Tooltips */}
      <Tooltip
        id="training-grounds-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="coach-card-tooltip"
        {...tooltipPatterns.standard}
        place="bottom"
      />
      <Tooltip
        id="command-palette-button"
        {...tooltipPatterns.standard}
        place="bottom"
      />

    </div>
  );
}

export default TrainingGrounds;
