import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder, NewBadge } from './themes/SynthwaveComponents';
import { isCurrentWeekReport } from '../utils/dateUtils';
import { useToast } from '../contexts/ToastContext';
import ReportAgent from '../utils/agents/ReportAgent';
import { FloatingMenuManager } from './shared/FloatingMenuManager';

// Icons
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

const BarChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

function ViewReports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const reportAgentRef = useRef(null);
  const { addToast, success, error, info } = useToast();

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
    const analysisConfidence = report.metadata?.analysisConfidence || 'medium';
    const dataCompleteness = Math.round((report.metadata?.dataCompleteness || 0.5) * 100);
    const isNew = isCurrentWeekReport(report.weekId);

    // Extract top priority insight from structured analytics
    const topPriority = report.analyticsData?.structured_analytics?.actionable_insights?.top_priority?.insight;
    const humanSummary = report.analyticsData?.human_summary;

    // Get a short preview of the human summary
    const summaryPreview = humanSummary
      ? humanSummary.split('\n').slice(0, 3).join(' ').substring(0, 150) + '...'
      : 'Comprehensive weekly training analysis with performance insights and recommendations.';

    return (
      <div
        key={report.weekId}
        data-report-card
        className={`${themeClasses.glowCard} group cursor-pointer transition-all duration-300 hover:-translate-y-1 relative`}
        onClick={() => navigate(`/training-grounds/reports/weekly?userId=${userId}&weekId=${report.weekId}&coachId=${coachId || 'default'}`)}
      >
        {/* NEW badge for current week reports */}
        {isNew && <NewBadge />}

        {/* Action buttons - appear on hover at top right */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-3">
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
              className="text-synthwave-neon-pink hover:text-synthwave-neon-pink/70 transition-colors duration-200"
              title="Preview top insight"
            >
              <PreviewIcon />
            </button>
          )}
        </div>

        {/* Report header */}
        <div className="mb-4">
                    <h3 className="font-rajdhani text-xl text-synthwave-neon-pink font-bold mb-2 truncate">
            Weekly Report: Week {report.weekId}
          </h3>

          {/* Metadata with grouped layout */}
          <div className="space-y-1 mb-2">
            {/* Row 1: Period */}
            <div className="flex justify-between items-center">
              <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Period:</span>
              <span className="text-synthwave-text-primary font-rajdhani text-base">{dateRange}</span>
            </div>

            {/* Row 2: Workouts and Confidence */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between items-center">
                <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Workouts:</span>
                <span className="text-synthwave-text-primary font-rajdhani text-base">{workoutCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Confidence:</span>
                <span className="text-synthwave-text-primary font-rajdhani text-base capitalize">{analysisConfidence}</span>
              </div>
            </div>

            {/* Row 3: Data Completeness */}
            <div className="flex justify-between items-center">
              <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Data Completeness:</span>
              <span className="text-synthwave-text-primary font-rajdhani text-base">{dataCompleteness}%</span>
            </div>
          </div>
        </div>

        {/* Report summary */}
        <div className="space-y-2">
          <p className={`${themeClasses.cardText} text-sm line-clamp-2`}>
            {summaryPreview}
          </p>
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

  // Show loading state
  if (reportAgentState.isLoadingAllItems) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
          <p className="text-synthwave-text-secondary font-rajdhani">Loading reports...</p>
        </div>
      </div>
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

      <div className={`${themeClasses.container} min-h-screen pb-8`}>
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            View Reports
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Comprehensive weekly analytics and insights from your training journey. Review performance trends, coaching analysis, and actionable recommendations.
          </p>
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
                className={themeClasses.cyanButton}
              >
                Start Training
              </button>
            </NeonBorder>
          </div>
        )}

        {/* Reports grid */}
        {!reportAgentState.isLoadingAllItems && !reportAgentState.error && reportAgentState.allReports.length > 0 && (
          <div className={themeClasses.cardGrid}>
            {reportAgentState.allReports.map(renderReportCard)}
          </div>
        )}
      </div>
    </div>

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="reports"
      />
    </>
  );
}

export default ViewReports;
