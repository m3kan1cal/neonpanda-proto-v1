import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied } from './shared/AccessDenied';
import { containerPatterns, buttonPatterns, layoutPatterns } from '../utils/uiPatterns';
import { NeonBorder, NewBadge } from './themes/SynthwaveComponents';
import { isCurrentWeekReport } from '../utils/dateUtils';
import { useToast } from '../contexts/ToastContext';
import ReportAgent from '../utils/agents/ReportAgent';
import CoachAgent from '../utils/agents/CoachAgent';
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import CommandPalette from './shared/CommandPalette';
import CoachHeader from './shared/CoachHeader';
import {
  StackIcon,
  CalendarMonthIcon,
  ClockIcon,
  TargetIcon,
} from './themes/SynthwaveComponents';

// Icons
const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);


const PreviewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const BarChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

function ViewReports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');

  // Coach data state (for FloatingMenuManager)
  const [coachData, setCoachData] = useState(null);

  const reportAgentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const { addToast, success, error, info } = useToast();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
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

  // Load coach data for FloatingMenuManager
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loadedCoachData = await coachAgentRef.current.loadCoachDetails(userId, coachId);
        setCoachData(loadedCoachData);
      } catch (error) {
        console.error('Failed to load coach data:', error);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Report state for main page only (popover state handled by FloatingMenuManager)
  const [reportAgentState, setReportAgentState] = useState({
    allReports: [],               // For main page grid
    isLoadingAllItems: !!userId,   // Start loading if we have userId
    isLoadingItem: false,
    error: null,
    totalCount: 0
  });

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, navigate]);

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize report agent (for main page only)
  useEffect(() => {
    if (!userId) return;

    if (!reportAgentRef.current) {
      reportAgentRef.current = new ReportAgent(userId, (newState) => {
        setReportAgentState(prevState => ({
          ...prevState,
          // Only handle main page state, popover handled by FloatingMenuManager
          allReports: newState.allReports || prevState.allReports,
          isLoadingAllItems: newState.isLoadingAllItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          error: newState.error || null,
          totalCount: newState.allReports?.length || 0
        }));
      });

      // Set up error callback
      reportAgentRef.current.onError = (error) => {
        console.error('Report agent error:', error);
        setReportAgentState(prevState => ({
          ...prevState,
          error: error.message || 'Failed to load reports'
        }));
      };
    }

    return () => {
      if (reportAgentRef.current) {
        reportAgentRef.current.destroy();
        reportAgentRef.current = null;
      }
    };
  }, [userId]);



  // Load all reports (recent descending order)
  useEffect(() => {
    if (!userId || !reportAgentRef.current) return;

    const loadReports = async () => {
      try {
        // Ensure loading state is active
        setReportAgentState(prevState => ({
          ...prevState,
          isLoadingAllItems: true,
          error: null
        }));

        // Load all reports without date filtering
        await reportAgentRef.current.loadAllReports({
          sortBy: 'weekStart',
          sortOrder: 'desc',
          limit: 100  // Get up to 100 reports (increased from 50)
        });
      } catch (error) {
        console.error('Error loading report history:', error);
        // Error handling is done by the agent callback
      }
    };

    loadReports();
  }, [userId]);



  // Format date for display
  const formatReportDate = (dateString) => {
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

  // Get week date range from weekId (for report cards)
  const getWeekDateRange = (weekId) => {
    if (!weekId) return 'Unknown week';

    // Parse weekId format: YYYY-WW
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

  // Render report card
  const renderReportCard = (report) => {
    const dateRange = getWeekDateRange(report.weekId);
    const workoutCount = report.metadata?.workoutCount || 0;
    const conversationCount = report.metadata?.conversationCount || 0;
    const memoryCount = report.metadata?.memoryCount || 0;
    const analysisConfidence = report.metadata?.analysisConfidence || 'medium';
    const dataCompleteness = Math.round((report.metadata?.dataCompleteness || 0.5) * 100);
    const isNew = isCurrentWeekReport(report.weekId);

    // Extract top priority insight from structured analytics
    const topPriority = report.analyticsData?.structured_analytics?.actionable_insights?.top_priority?.insight;
    const humanSummary = report.analyticsData?.human_summary;

    // Get a preview of the human summary
    const summaryPreview = humanSummary
      ? humanSummary.split('\n').slice(0, 4).join(' ').substring(0, 250) + '...'
      : 'Comprehensive weekly training analysis with performance insights and recommendations.';

    // Format dates
    const weekStart = new Date(report.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = new Date(report.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const createdAt = new Date(report.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <div
        key={report.weekId}
        data-report-card
        className={`${containerPatterns.cardMedium} p-5 group transition-all duration-300 hover:border-synthwave-neon-cyan/40 hover:bg-synthwave-bg-card/40 relative cursor-pointer flex flex-col h-full`}
        onClick={() => navigate(`/training-grounds/reports/weekly?userId=${userId}&weekId=${report.weekId}&coachId=${coachId || 'default'}`)}
      >
        {/* NEW badge for current week reports */}
        {isNew && <NewBadge />}

        {/* Action buttons - always visible */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {/* Preview button */}
          {topPriority && (
            <button
              onClick={(e) => {
                e.stopPropagation();

                if (activeTooltip === report.weekId) {
                  setActiveTooltip(null);
                } else {
                  // Get the report card element (the parent with relative positioning)
                  const reportCard = e.target.closest('[data-report-card]');
                  if (reportCard) {
                    const rect = reportCard.getBoundingClientRect();
                    setTooltipPosition({
                      x: rect.left + rect.width / 2, // Center horizontally on the card
                      y: rect.bottom + 10 // Position below the card with some spacing
                    });
                  }
                  setActiveTooltip(report.weekId);
                }
              }}
              className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
              title="Preview top insight"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Card header with colored dot */}
        <div className="flex items-start space-x-3 mb-4 pr-16">
          <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
          <h3 className="font-russo text-lg text-white uppercase">
            Weekly Report: Week {report.weekId}
          </h3>
        </div>

        {/* Tags Section - Moved above sub-containers */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Week Period Tag */}
          <div className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
            {weekStart} - {weekEnd}
          </div>

          {/* Memory Count Tag */}
          {memoryCount > 0 && (
            <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
              {memoryCount} memories
            </div>
          )}

          {/* Conversation Count Tag */}
          {conversationCount > 0 && (
            <div className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
              {conversationCount} conversations
            </div>
          )}
        </div>

        {/* Performance Stats Grid - 3 Center Sections */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Workout Count */}
          <div className="text-center p-2 bg-synthwave-bg-primary/30 rounded-lg">
            <div className="text-lg font-russo font-bold text-white mb-1">
              {workoutCount}
            </div>
            <div className="text-xs text-synthwave-text-muted font-rajdhani flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Workouts
            </div>
          </div>

          {/* AI Confidence */}
          <div className="text-center p-2 bg-synthwave-bg-primary/30 rounded-lg">
            <div className="text-lg font-russo font-bold text-white mb-1">
              {analysisConfidence === 'high' ? 'High' : analysisConfidence === 'medium' ? 'Med' : 'Low'}
            </div>
            <div className="text-xs text-synthwave-text-muted font-rajdhani flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Confidence
            </div>
          </div>

          {/* Data Completeness */}
          <div className="text-center p-2 bg-synthwave-bg-primary/30 rounded-lg">
            <div className="text-lg font-russo font-bold text-white mb-1">
              {dataCompleteness}%
            </div>
            <div className="text-xs text-synthwave-text-muted font-rajdhani flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Complete
            </div>
          </div>
        </div>

        {/* Report summary - Flexible content area in sub-container */}
        <div className="flex-1 mb-3">
          {summaryPreview && (
            <div className="p-3 bg-synthwave-bg-primary/30 rounded-lg">
              <p className="font-rajdhani text-synthwave-text-secondary text-sm leading-relaxed line-clamp-4">
                {summaryPreview}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Metadata Section - Created Date Only */}
        <div className="mt-auto">
          {/* Created Date Line */}
          <div className="flex items-center space-x-1 text-xs text-synthwave-text-secondary font-rajdhani">
            <CalendarIcon />
            <span>Generated {createdAt}</span>
          </div>
        </div>
      </div>
    );
  };









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
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTooltip]);

  // Show loading while validating userId or loading reports
  if (isValidatingUserId || reportAgentState.isLoadingAllItems) {
    return (
      <div className="bg-synthwave-bg-tertiary min-h-screen pb-8">
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
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

          {/* Quick stats bar skeleton */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-2xl">
              <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
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
          </div>

          {/* Report cards skeleton */}
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`${containerPatterns.cardMedium} p-5 flex flex-col h-72`}>
                  {/* Action button skeleton */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>

                  {/* Header with dot skeleton */}
                  <div className="flex items-start space-x-3 mb-4 pr-16">
                    <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>

                  {/* Performance stats grid skeleton */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="text-center p-2 bg-synthwave-bg-primary/30 rounded-lg">
                        <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mx-auto mb-1"></div>
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-12 mx-auto"></div>
                      </div>
                    ))}
                  </div>

                  {/* Summary skeleton */}
                  <div className="flex-1 mb-3">
                    <div className="p-3 bg-synthwave-bg-primary/30 rounded-lg">
                      <div className="space-y-2">
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-4/5"></div>
                      </div>
                    </div>
                  </div>

                  {/* Tags and metadata skeleton */}
                  <div className="mt-auto space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                    </div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own reports."}
      />
    );
  }

  // Find the active report for tooltip display
  const activeReport = reportAgentState.allReports.find(r => r.weekId === activeTooltip);

  return (
    <>
      {/* Global tooltip - rendered outside all containers */}
      {activeTooltip && activeReport && activeReport.analyticsData?.structured_analytics?.actionable_insights?.top_priority && (
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
                Top Priority Insight
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
              {activeReport.analyticsData.structured_analytics.actionable_insights.top_priority.insight}
            </div>
          </div>
        </div>
      )}

      <div className="bg-synthwave-bg-tertiary min-h-screen pb-8">
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Your Reports
          </h1>

          {/* Coach Header */}
          {coachData && (
            <CoachHeader coachData={coachData} />
          )}

          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Comprehensive weekly analytics and insights from your training journey. Review performance trends, coaching analysis, and actionable recommendations for optimal fitness progress.
          </p>
          <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
            <div className="flex items-center space-x-1 bg-synthwave-bg-primary/30 px-2 py-1 rounded border border-synthwave-neon-pink/20">
              <span className="text-synthwave-neon-pink">⌘</span>
              <span>+ K</span>
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

        {/* Quick Stats Bar */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-2xl">
            <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-4">
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                {/* Total Reports - Pink */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50">
                    <StackIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                      {reportAgentState.allReports.length || 0}
                    </div>
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Total</div>
                  </div>
                </div>

                {/* This Month - Cyan */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50">
                    <CalendarMonthIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
            {reportAgentState.allReports.filter((r) => {
              const weekStart = new Date(r.weekStart);
              const weekEnd = new Date(r.weekEnd);
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();

              // Check if the report spans into the current month
              // Either starts in current month OR ends in current month
              const startsInCurrentMonth = weekStart.getMonth() === currentMonth && weekStart.getFullYear() === currentYear;
              const endsInCurrentMonth = weekEnd.getMonth() === currentMonth && weekEnd.getFullYear() === currentYear;

              return startsInCurrentMonth || endsInCurrentMonth;
            }).length || 0}
                    </div>
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">This Month</div>
                  </div>
                </div>

                {/* This Week - Purple */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 hover:text-synthwave-neon-purple rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50">
                    <ClockIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                      {reportAgentState.allReports.filter((r) => isCurrentWeekReport(r.weekId)).length || 0}
                    </div>
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">This Week</div>
                  </div>
                </div>

                {/* High Confidence - Pink */}
                <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                  <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50">
                    <TargetIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                      {reportAgentState.allReports.filter((r) => r.metadata?.analysisConfidence === 'high').length || 0}
                    </div>
                    <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">High %</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error state */}
        {reportAgentState.error && (
          <div className="text-center py-12">
            <NeonBorder color="pink" className="max-w-md mx-auto p-6">
              <p className="text-synthwave-neon-pink mb-2">Error Loading Reports</p>
              <p className="text-synthwave-text-secondary text-sm">{reportAgentState.error}</p>
            </NeonBorder>
          </div>
        )}

        {/* Empty state */}
        {!reportAgentState.isLoadingAllItems && !reportAgentState.error && reportAgentState.allReports.length === 0 && (
          <div className="text-center py-12">
            <NeonBorder color="cyan" className="max-w-md mx-auto p-8">
              <h3 className="text-synthwave-neon-cyan mb-4">No Reports Found</h3>
              <p className="text-synthwave-text-secondary mb-6">
                Weekly reports are generated automatically based on your training activity.
              </p>
              <button
                onClick={() => navigate(`/training-grounds?userId=${userId}`)}
                className={buttonPatterns.secondary}
              >
                Start Training
              </button>
            </NeonBorder>
          </div>
        )}

        {/* Reports List */}
        {!reportAgentState.isLoadingAllItems && !reportAgentState.error && reportAgentState.allReports.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {reportAgentState.allReports.map(renderReportCard)}
            </div>
          </div>
        )}
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
        workoutAgent={null} // Will need to be provided if workout functionality is needed
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === 'conversation-created') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="reports"
        coachData={coachData}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />
    </>
  );
}

export default ViewReports;

