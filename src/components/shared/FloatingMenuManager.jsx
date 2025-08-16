import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { themeClasses } from '../../utils/synthwaveThemeClasses';
import ReportAgent from '../../utils/agents/ReportAgent';
import WorkoutAgent from '../../utils/agents/WorkoutAgent';
import CoachConversationAgent from '../../utils/agents/CoachConversationAgent';
import {
  FloatingIconButton,
  ModernPopover,
  FloatingIconBar
} from './FloatingMenu';
import {
  WorkoutIcon,
  ChatIcon,
  LightningIcon,
  ChevronRightIcon
} from '../themes/SynthwaveComponents';

// Local icon definitions
const BarChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

/**
 * FloatingMenuManager - A comprehensive floating menu system with agent management
 * Handles conversations, workouts, and reports with their respective agents and state
 */
export const FloatingMenuManager = ({
  userId,
  coachId,
  currentPage = 'default',
  className = ""
}) => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Modern popover state
  const [activePopover, setActivePopover] = useState(null);
  const conversationsIconRef = useRef(null);
  const workoutsIconRef = useRef(null);
  const reportsIconRef = useRef(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Agent refs
  const reportAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const conversationAgentRef = useRef(null);

  // Agent states
  const [reportAgentState, setReportAgentState] = useState({
    recentReports: [],
    isLoadingRecentItems: false,
    error: null,
  });

  const [workoutAgentState, setWorkoutAgentState] = useState({
    recentWorkouts: [],
    isLoadingRecentItems: false,
    error: null,
  });

  const [conversationAgentState, setConversationAgentState] = useState({
    recentConversations: [],
    isLoadingRecentItems: false,
    error: null,
  });

  // Initialize report agent
  useEffect(() => {
    if (!userId) return;

    if (!reportAgentRef.current) {
      reportAgentRef.current = new ReportAgent(userId, (newState) => {
        setReportAgentState(prevState => ({
          ...prevState,
          recentReports: newState.recentReports || prevState.recentReports,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          error: newState.error || null,
        }));
      });

      reportAgentRef.current.onError = (error) => {
        console.error('Report agent error:', error);
      };
    }

    return () => {
      if (reportAgentRef.current) {
        reportAgentRef.current.destroy();
        reportAgentRef.current = null;
      }
    };
  }, [userId]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        setWorkoutAgentState(prevState => ({
          ...prevState,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          recentWorkouts: newState.recentWorkouts || [],
          error: newState.error || null,
        }));
      });

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

  // Initialize conversation agent
  useEffect(() => {
    if (!userId || !coachId) return;

    if (!conversationAgentRef.current) {
      conversationAgentRef.current = new CoachConversationAgent({
        userId,
        coachId,
        conversationId: null,
        onStateChange: (newState) => {
          setConversationAgentState(prevState => ({
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
      if (conversationAgentRef.current) {
        conversationAgentRef.current.destroy();
        conversationAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Load data when popovers are opened
  useEffect(() => {
    if (activePopover === 'conversations' && userId && coachId && conversationAgentRef.current) {
      console.info('Loading conversations for popover...', { userId, coachId });
      conversationAgentRef.current.loadRecentConversations(userId, coachId, 10);
    }
  }, [activePopover, userId, coachId]);

  useEffect(() => {
    if (activePopover === 'workouts' && userId && workoutAgentRef.current) {
      console.info('Loading workouts for popover...', { userId, activePopover });
      workoutAgentRef.current.loadRecentWorkouts(10);
    }
  }, [activePopover, userId]);

  useEffect(() => {
    if (activePopover === 'reports' && userId && reportAgentRef.current) {
      console.info('Loading recent reports for popover...', { userId, activePopover });
      reportAgentRef.current.loadRecentReports(10);
    }
  }, [activePopover, userId]);

  // Handlers
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
    if (!conversationAgentRef.current || !userId || !coachId || isCreatingConversation) return;

    setIsCreatingConversation(true);

    try {
      console.info('FloatingMenuManager: Creating new conversation...', { userId, coachId });
      const result = await conversationAgentRef.current.createConversation(userId, coachId);

      console.info('FloatingMenuManager: Conversation created successfully:', result);

      if (result && result.conversationId) {
        console.info('FloatingMenuManager: Navigating to conversation:', result.conversationId);
        handleClosePopover();
        navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${result.conversationId}`);
      } else {
        console.error('FloatingMenuManager: No conversationId in result:', result);
        error('Failed to create conversation - no ID returned');
      }
    } catch (error) {
      console.error('FloatingMenuManager: Error creating new conversation:', error);
      error('Failed to create conversation');
      navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Get week date range from weekId
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

  // Render functions
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
                handleClosePopover();
              }}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
            >
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
                  <LightningIcon />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  const renderReportList = () => (
    <div className="space-y-2">
      {reportAgentState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading reports...</span>
          </div>
        </div>
      ) : reportAgentState.recentReports.length === 0 ? (
        <div className="text-center py-8">
          <div className="font-rajdhani text-synthwave-text-muted text-sm">
            No reports found
          </div>
        </div>
      ) : (
        <>
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
            Recent Reports
          </div>
          {reportAgentState.recentReports.slice(0, 10).map((report) => (
            <div
              key={report.weekId}
              onClick={() => {
                navigate(`/training-grounds/reports/weekly?userId=${userId}&weekId=${report.weekId}&coachId=${coachId}`);
                handleClosePopover();
              }}
              className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-rajdhani text-sm text-white font-medium truncate">
                    Week {report.weekId}
                  </div>
                  <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                    {getWeekDateRange(report.weekId)} • <span className="text-synthwave-neon-cyan">{report.metadata?.workoutCount || 0} workouts</span>
                  </div>
                </div>
                <div className="text-synthwave-neon-pink ml-2">
                  <BarChartIcon />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  const renderConversationList = () => (
    <div className="space-y-2">
      {conversationAgentState.isLoadingRecentItems ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-synthwave-text-secondary font-rajdhani">
            <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
            <span>Loading conversations...</span>
          </div>
        </div>
      ) : conversationAgentState.recentConversations.length === 0 ? (
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
          {conversationAgentState.recentConversations.map((conv) => (
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
                    {formatConversationDate(conv.metadata?.lastActivity || conv.createdAt)} • <span className="text-synthwave-neon-cyan">{conv.metadata?.totalMessages || 0} messages</span>
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

  // Don't render if missing required props
  if (!userId) return null;

  return (
    <>
      {/* Modern Floating Icon Bar */}
      <FloatingIconBar className={className}>
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
        <FloatingIconButton
          ref={reportsIconRef}
          icon={<BarChartIcon />}
          isActive={activePopover === 'reports'}
          onClick={() => handleTogglePopover('reports')}
          title="Recent Reports"
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

      <ModernPopover
        isOpen={activePopover === 'reports'}
        onClose={handleClosePopover}
        anchorRef={reportsIconRef}
        title="Recent Reports"
      >
        {/* Reports List */}
        {renderReportList()}
      </ModernPopover>
    </>
  );
};

export default FloatingMenuManager;
