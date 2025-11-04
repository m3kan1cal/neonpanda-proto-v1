import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied } from './shared/AccessDenied';
import { containerPatterns, buttonPatterns, layoutPatterns, tooltipPatterns } from '../utils/ui/uiPatterns';
import { NeonBorder, NewBadge } from './themes/SynthwaveComponents';
import { isCurrentWeekReport, getWeekDateRange, formatWorkoutCount } from '../utils/dateUtils';
import { useToast } from '../contexts/ToastContext';
import ReportAgent from '../utils/agents/ReportAgent';
import CoachAgent from '../utils/agents/CoachAgent';
import { WorkoutAgent } from '../utils/agents/WorkoutAgent';
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import CoachHeader from './shared/CoachHeader';
import CompactCoachCard from './shared/CompactCoachCard';
import CommandPaletteButton from './shared/CommandPaletteButton';
import { useNavigationContext } from '../contexts/NavigationContext';
import QuickStats from './shared/QuickStats';
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
  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Coach data state (for FloatingMenuManager)
  const [coachData, setCoachData] = useState(null);

  const reportAgentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const { addToast, success, error, info } = useToast();


  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId);
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId]);

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
    allReports: [],               // For main page grid (weekly)
    allMonthlyReports: [],        // For monthly reports grid
    isLoadingAllItems: !!userId,   // Start loading if we have userId
    isLoadingAllMonthlyItems: false,
    isLoadingItem: false,
    error: null,
    totalCount: 0,
    totalMonthlyCount: 0
  });

  // Tab state
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' or 'monthly'

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, navigate]);

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
    if (!isValidatingUserId && !reportAgentState.isLoadingAllItems) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, reportAgentState.isLoadingAllItems]);

  // Initialize report agent (for main page only)
  useEffect(() => {
    if (!userId) return;

    if (!reportAgentRef.current) {
      reportAgentRef.current = new ReportAgent(userId, (newState) => {
        setReportAgentState(prevState => ({
          ...prevState,
          // Handle both weekly and monthly reports
          allReports: newState.allReports || prevState.allReports,
          allMonthlyReports: newState.allMonthlyReports || prevState.allMonthlyReports,
          isLoadingAllItems: newState.isLoadingAllItems || false,
          isLoadingAllMonthlyItems: newState.isLoadingAllMonthlyItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          error: newState.error || null,
          totalCount: newState.allReports?.length || prevState.totalCount,
          totalMonthlyCount: newState.allMonthlyReports?.length || prevState.totalMonthlyCount
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

        // Load all weekly reports without date filtering
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

  // Load all monthly reports
  useEffect(() => {
    if (!userId || !reportAgentRef.current) return;

    const loadMonthlyReports = async () => {
      try {
        // Ensure loading state is active
        setReportAgentState(prevState => ({
          ...prevState,
          isLoadingAllMonthlyItems: true,
          error: null
        }));

        // Load all monthly reports
        await reportAgentRef.current.loadAllMonthlyReports({
          sortBy: 'monthStart',
          sortOrder: 'desc',
          limit: 50
        });
      } catch (error) {
        console.error('Error loading monthly report history:', error);
        // Error handling is done by the agent callback
      }
    };

    loadMonthlyReports();
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

  // Render monthly report card
  const renderMonthlyReportCard = (report) => {
    // Use AI's actual session count (deduped) instead of raw workout count from DB
    const workoutCount = report.analyticsData?.structured_analytics?.metadata?.sessions_completed || report.metadata?.workoutCount || 0;
    const conversationCount = report.metadata?.conversationCount || 0;
    const memoryCount = report.metadata?.memoryCount || 0;
    const analysisConfidence = report.metadata?.analysisConfidence || 'medium';
    const dataCompleteness = Math.round((report.metadata?.dataCompleteness || 0.5) * 100);

    // Extract top priority insight from structured analytics
    const topPriority = report.analyticsData?.structured_analytics?.actionable_insights?.top_priority?.insight;
    const humanSummary = report.analyticsData?.human_summary;

    // Get a preview of the human summary
    const summaryPreview = humanSummary
      ? humanSummary.split('\n').slice(0, 4).join(' ').substring(0, 250) + '...'
      : 'Comprehensive monthly training analysis with performance insights and recommendations.';

    // Format month name (e.g., "2025-10" -> "October 2025")
    const [year, month] = report.monthId.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month) - 1];
    const formattedMonth = `${monthName} ${year}`;

    const createdAt = new Date(report.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Check if this is current month
    const now = new Date();
    const isCurrentMonth = report.monthId === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return (
      <div
        key={report.monthId}
        data-report-card
        className={`${containerPatterns.cardMedium} p-5 group transition-all duration-300 hover:border-synthwave-neon-purple/40 hover:bg-synthwave-bg-card/40 relative cursor-pointer flex flex-col h-full`}
        onClick={() => navigate(`/training-grounds/reports/monthly?userId=${userId}&monthId=${report.monthId}&coachId=${coachId || 'default'}`)}
      >
        {/* NEW badge for current month reports */}
        {isCurrentMonth && <NewBadge />}

        {/* Action buttons - always visible */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {/* Preview button */}
          {topPriority && (
            <button
              onClick={(e) => {
                e.stopPropagation();

                if (activeTooltip === report.monthId) {
                  setActiveTooltip(null);
                } else {
                  const reportCard = e.target.closest('[data-report-card]');
                  if (reportCard) {
                    const rect = reportCard.getBoundingClientRect();
                    setTooltipPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.bottom + 10
                    });
                  }
                  setActiveTooltip(report.monthId);
                }
              }}
              className="p-2 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50"
              title="Preview top insight"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Card header with colored dot */}
        <div className="flex items-start space-x-3 mb-4 pr-16">
          <div className="w-3 h-3 bg-synthwave-neon-purple rounded-full flex-shrink-0 mt-2"></div>
          <h3 className="font-russo text-lg text-white uppercase">
            {formattedMonth}
          </h3>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Month Period Tag */}
          <div className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
            Monthly Report
          </div>

          {/* Memory Count Tag */}
          {memoryCount > 0 && (
            <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
              {memoryCount} memories
            </div>
          )}

          {/* Conversation Count Tag */}
          {conversationCount > 0 && (
            <div className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
              {conversationCount} conversations
            </div>
          )}

          {/* Minimum threshold indicator */}
          {workoutCount >= 4 && (
            <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
              ✓ 4+ workouts
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
              {workoutCount === 1 ? 'Workout' : 'Workouts'}
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

  // Render report card
  const renderReportCard = (report) => {
    const dateRange = getWeekDateRange(report);
    // Use AI's actual session count (deduped) instead of raw workout count from DB
    const workoutCount = report.analyticsData?.structured_analytics?.metadata?.sessions_completed || report.metadata?.workoutCount || 0;
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
              {workoutCount === 1 ? 'Workout' : 'Workouts'}
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

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Create coach name handler using the agent's helper method
  const handleSaveCoachName = coachAgentRef.current?.createCoachNameHandler(
    userId,
    coachId,
    setCoachData,
    { success: (msg) => addToast(msg, 'success'), error: (msg) => addToast(msg, 'error') }
  );

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
  if (isValidatingUserId || (reportAgentState.isLoadingAllItems && reportAgentState.allReports.length === 0) ||
      (reportAgentState.isLoadingAllMonthlyItems && reportAgentState.allMonthlyReports.length === 0)) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              {/* Title skeleton - compact size */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-64"></div>

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
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 -mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                <div className="h-6 w-8 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Tab Switcher skeleton */}
          <div className="flex items-center justify-center gap-2 mb-6 -mt-2">
            <div className="h-10 w-36 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
            <div className="h-10 w-36 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </div>

          {/* Report cards skeleton */}
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

  // Find the active report for tooltip display (works for both weekly and monthly)
  const activeReport = activeTab === 'weekly'
    ? reportAgentState.allReports.find(r => r.weekId === activeTooltip)
    : reportAgentState.allMonthlyReports.find(r => r.monthId === activeTooltip);

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

      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header */}
          <header
            className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
            aria-label="Reports Header"
          >
            {/* Left section: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              {/* Page Title with Hover Tooltip */}
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="reports-info"
                data-tooltip-content="Comprehensive weekly analytics and insights from your training journey. Review performance trends and coaching analysis."
              >
                Your Reports
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
            stats={
              activeTab === 'weekly'
                ? [
                    {
                      icon: StackIcon,
                      value: reportAgentState.allReports.length || 0,
                      tooltip: {
                        title: 'Total Reports',
                        description: 'All weekly reports'
                      },
                      color: 'pink',
                      isLoading: reportAgentState.isLoading,
                      ariaLabel: `${reportAgentState.allReports.length || 0} total reports`
                    },
                    {
                      icon: CalendarMonthIcon,
                      value: reportAgentState.allReports.filter((r) => {
                        const weekStart = new Date(r.weekStart);
                        const weekEnd = new Date(r.weekEnd);
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        const startsInCurrentMonth = weekStart.getMonth() === currentMonth && weekStart.getFullYear() === currentYear;
                        const endsInCurrentMonth = weekEnd.getMonth() === currentMonth && weekEnd.getFullYear() === currentYear;
                        return startsInCurrentMonth || endsInCurrentMonth;
                      }).length || 0,
                      tooltip: {
                        title: 'This Month',
                        description: 'Reports this month'
                      },
                      color: 'cyan',
                      isLoading: reportAgentState.isLoading,
                      ariaLabel: `${reportAgentState.allReports.filter((r) => {
                        const weekStart = new Date(r.weekStart);
                        const weekEnd = new Date(r.weekEnd);
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        const startsInCurrentMonth = weekStart.getMonth() === currentMonth && weekStart.getFullYear() === currentYear;
                        const endsInCurrentMonth = weekEnd.getMonth() === currentMonth && weekEnd.getFullYear() === currentYear;
                        return startsInCurrentMonth || endsInCurrentMonth;
                      }).length || 0} reports this month`
                    },
                    {
                      icon: ClockIcon,
                      value: reportAgentState.allReports.filter((r) => isCurrentWeekReport(r.weekId)).length || 0,
                      tooltip: {
                        title: 'This Week',
                        description: 'Reports this week'
                      },
                      color: 'purple',
                      isLoading: reportAgentState.isLoading,
                      ariaLabel: `${reportAgentState.allReports.filter((r) => isCurrentWeekReport(r.weekId)).length || 0} reports this week`
                    },
                    {
                      icon: TargetIcon,
                      value: reportAgentState.allReports.filter((r) => r.metadata?.analysisConfidence === 'high').length || 0,
                      tooltip: {
                        title: 'High Confidence',
                        description: 'High-confidence analysis'
                      },
                      color: 'pink',
                      isLoading: reportAgentState.isLoading,
                      ariaLabel: `${reportAgentState.allReports.filter((r) => r.metadata?.analysisConfidence === 'high').length || 0} high confidence reports`
                    }
                  ]
                : [
                    {
                      icon: StackIcon,
                      value: reportAgentState.allMonthlyReports.length || 0,
                      tooltip: {
                        title: 'Total Reports',
                        description: 'All monthly reports'
                      },
                      color: 'purple',
                      isLoading: reportAgentState.isLoadingAllMonthlyItems,
                      ariaLabel: `${reportAgentState.allMonthlyReports.length || 0} total monthly reports`
                    },
                    {
                      icon: CalendarMonthIcon,
                      value: reportAgentState.allMonthlyReports.filter((r) => {
                        const now = new Date();
                        const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        return r.monthId === currentMonthId;
                      }).length || 0,
                      tooltip: {
                        title: 'This Month',
                        description: 'Current month report'
                      },
                      color: 'cyan',
                      isLoading: reportAgentState.isLoadingAllMonthlyItems,
                      ariaLabel: `${reportAgentState.allMonthlyReports.filter((r) => {
                        const now = new Date();
                        const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        return r.monthId === currentMonthId;
                      }).length || 0} reports this month`
                    },
                    {
                      icon: TargetIcon,
                      value: reportAgentState.allMonthlyReports.filter((r) => {
                        const workoutCount = r.analyticsData?.structured_analytics?.metadata?.sessions_completed || r.metadata?.workoutCount || 0;
                        return workoutCount >= 4;
                      }).length || 0,
                      tooltip: {
                        title: 'Qualified Months',
                        description: 'Months with 4+ workouts'
                      },
                      color: 'pink',
                      isLoading: reportAgentState.isLoadingAllMonthlyItems,
                      ariaLabel: `${reportAgentState.allMonthlyReports.filter((r) => {
                        const workoutCount = r.analyticsData?.structured_analytics?.metadata?.sessions_completed || r.metadata?.workoutCount || 0;
                        return workoutCount >= 4;
                      }).length || 0} qualified months`
                    },
                    {
                      icon: TargetIcon,
                      value: reportAgentState.allMonthlyReports.filter((r) => r.metadata?.analysisConfidence === 'high').length || 0,
                      tooltip: {
                        title: 'High Confidence',
                        description: 'High-confidence analysis'
                      },
                      color: 'purple',
                      isLoading: reportAgentState.isLoadingAllMonthlyItems,
                      ariaLabel: `${reportAgentState.allMonthlyReports.filter((r) => r.metadata?.analysisConfidence === 'high').length || 0} high confidence reports`
                    }
                  ]
            }
          />

          {/* Tab Switcher */}
          <div className="flex items-center justify-center gap-2 mb-6 -mt-2">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-200 ${
                activeTab === 'weekly'
                  ? 'bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border-2 border-synthwave-neon-cyan/40'
                  : 'bg-synthwave-bg-primary/30 text-synthwave-neon-cyan border-2 border-transparent hover:border-synthwave-neon-cyan/20 hover:bg-synthwave-neon-cyan/10'
              }`}
            >
              Weekly Reports
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-200 ${
                activeTab === 'monthly'
                  ? 'bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border-2 border-synthwave-neon-cyan/40'
                  : 'bg-synthwave-bg-primary/30 text-synthwave-neon-cyan border-2 border-transparent hover:border-synthwave-neon-cyan/20 hover:bg-synthwave-neon-cyan/10'
              }`}
            >
              Monthly Reports
            </button>
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
        {!reportAgentState.isLoadingAllItems && !reportAgentState.isLoadingAllMonthlyItems && !reportAgentState.error &&
         activeTab === 'weekly' && reportAgentState.allReports.length === 0 && (
          <div className="text-center py-12">
            <div className="font-rajdhani text-synthwave-neon-cyan text-base">
              No Weekly Reports Found
            </div>
            <div className="font-rajdhani text-synthwave-text-muted text-sm mt-2">
              Weekly reports are generated automatically when you complete 2+ workouts in a week.
            </div>
          </div>
        )}

        {/* Empty state for monthly */}
        {!reportAgentState.isLoadingAllItems && !reportAgentState.isLoadingAllMonthlyItems && !reportAgentState.error &&
         activeTab === 'monthly' && reportAgentState.allMonthlyReports.length === 0 && (
          <div className="text-center py-12">
            <div className="font-rajdhani text-synthwave-neon-cyan text-base">
              No Monthly Reports Found
            </div>
            <div className="font-rajdhani text-synthwave-text-muted text-sm mt-2">
              Monthly reports are generated automatically when you complete 4+ workouts in a month.
            </div>
          </div>
        )}

        {/* Weekly Reports List */}
        {!reportAgentState.isLoadingAllItems && !reportAgentState.error &&
         activeTab === 'weekly' && reportAgentState.allReports.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reportAgentState.allReports.map(renderReportCard)}
            </div>
          </div>
        )}

        {/* Monthly Reports List */}
        {!reportAgentState.isLoadingAllMonthlyItems && !reportAgentState.error &&
         activeTab === 'monthly' && reportAgentState.allMonthlyReports.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reportAgentState.allMonthlyReports.map(renderMonthlyReportCard)}
            </div>
          </div>
        )}
      </div>
    </div>

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

      {/* Tooltips */}
      <Tooltip
        id="reports-info"
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
    </>
  );
}

export default ViewReports;

