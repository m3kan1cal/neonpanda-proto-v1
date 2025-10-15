import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from 'react-tooltip';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { containerPatterns, layoutPatterns, tooltipPatterns } from '../utils/uiPatterns';
import { FullPageLoader, CenteredErrorState } from './shared/ErrorStates';
import CoachHeader from './shared/CoachHeader';
import CompactCoachCard from './shared/CompactCoachCard';
import CommandPaletteButton from './shared/CommandPaletteButton';
import WeeklyReportViewer from "./WeeklyReportViewer";
import ReportAgent from "../utils/agents/ReportAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import CommandPalette from './shared/CommandPalette';
import WeeklyHeatMap from './WeeklyHeatMap';
import { ChevronDownIcon } from './themes/SynthwaveComponents';

// Icons for CollapsibleSection
const CalendarHeatMapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// Collapsible section component - matches WeeklyReportViewer pattern
const CollapsibleSection = ({ title, icon, children, defaultOpen = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${containerPatterns.collapsibleSection} overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={containerPatterns.collapsibleHeader}
      >
        <div className="flex items-center space-x-3">
          <div className="text-synthwave-neon-cyan">
            {icon}
          </div>
          <h3 className="font-russo font-bold text-white text-base uppercase">
            {title}
          </h3>
        </div>
        <div className={`text-synthwave-neon-cyan transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {isOpen && (
        <div className={containerPatterns.collapsibleContent}>
          {children}
        </div>
      )}
    </div>
  );
};

function Reports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const weekId = searchParams.get("weekId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);

  const reportsAgentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const [reportAgentState, setReportAgentState] = useState({
    isLoadingItem: true,
    error: null,
  });
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState("formatted");

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');

  // Coach data state (for FloatingMenuManager)
  const [coachData, setCoachData] = useState(null);

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

  useEffect(() => {
    if (!userId || !weekId) {
      const fallbackUrl = coachId
        ? `/training-grounds?userId=${userId}&coachId=${coachId}`
        : "/training-grounds";
      navigate(fallbackUrl, { replace: true });
      return;
    }
  }, [userId, weekId, coachId, navigate]);

  useEffect(() => {
    reportsAgentRef.current = new ReportAgent(userId, (s) =>
      setReportAgentState((prev) => ({ ...prev, ...s }))
    );
    return () => {
      reportsAgentRef.current?.destroy();
      reportsAgentRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      if (!reportsAgentRef.current) return;
      setReportAgentState((prev) => ({
        ...prev,
        isLoadingItem: true,
        error: null,
      }));
      const r = await reportsAgentRef.current.getReport(weekId);
      setReport(r);
      setReportAgentState((prev) => ({ ...prev, isLoadingItem: false }));
    };
    if (userId && weekId) load();
  }, [userId, weekId]);

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
    if (!isValidatingUserId && !reportAgentState.isLoadingItem) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, reportAgentState.isLoadingItem]);

  const handleToggleView = () => {
    setViewMode(viewMode === "formatted" ? "raw" : "formatted");
  };

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Create coach name handler using the agent's helper method (no toast for WeeklyReports)
  const handleSaveCoachName = coachAgentRef.current?.createCoachNameHandler(
    userId,
    coachId,
    setCoachData,
    null // No toast notifications in WeeklyReports
  );

  // Show skeleton loading while validating userId or loading report
  if (isValidatingUserId || reportAgentState.isLoadingItem) {
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

          {/* Main Content Area skeleton */}
          <div className="flex-1">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              <div className="p-6 h-full overflow-y-auto space-y-6">
                {/* Action buttons skeleton */}
                <div className="flex justify-end space-x-2">
                  <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                </div>

                {/* Report sections skeleton */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                      </div>
                      <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
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
        message={userIdError || "You can only access your own weekly reports."}
      />
    );
  }

  if (reportAgentState.error) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={reportAgentState.error}
        buttonText="Back to Training Grounds"
        onButtonClick={() => {
          const fallbackUrl = coachId
            ? `/training-grounds?userId=${userId}&coachId=${coachId}`
            : "/training-grounds";
          navigate(fallbackUrl);
        }}
        variant="error"
      />
    );
  }

  return (
    <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Weekly Report Header"
        >
          {/* Left section: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Hover Tooltip */}
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="weekly-report-info"
              data-tooltip-content="Comprehensive analysis of your weekly training performance including volume, progression, and insights."
            >
              Weekly Report
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

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-7xl">
            <div className={`${containerPatterns.mainContent} h-full flex flex-col`}>
              <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">
                {report ? (
                  <WeeklyReportViewer
                    report={report}
                    onToggleView={handleToggleView}
                    viewMode={viewMode}
                    heatMapComponent={
                      <CollapsibleSection
                        title="Weekly Training Intensity"
                        icon={<CalendarHeatMapIcon />}
                        defaultOpen={true}
                      >
                        <WeeklyHeatMap
                          dailyVolumeData={report.analyticsData?.structured_analytics?.raw_aggregations?.daily_volume || []}
                          weekStart={report.weekStart}
                          weekEnd={report.weekEnd}
                          userId={userId}
                          coachId={coachId}
                        />
                      </CollapsibleSection>
                    }
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-synthwave-text-secondary font-rajdhani text-lg">
                      No report data available
                    </div>
                  </div>
                )}
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
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="weekly-report"
        coachData={coachData}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />

      {/* Tooltips */}
      <Tooltip
        id="weekly-report-info"
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

export default Reports;
