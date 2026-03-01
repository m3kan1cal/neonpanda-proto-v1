import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { AccessDenied } from "./shared/AccessDenied";
import {
  containerPatterns,
  layoutPatterns,
  tooltipPatterns,
} from "../utils/ui/uiPatterns";
import { CenteredErrorState } from "./shared/ErrorStates";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import QuickStats from "./shared/QuickStats";
import AppFooter from "./shared/AppFooter";
import { useNavigationContext } from "../contexts/NavigationContext";
import WeeklyReportViewer from "./WeeklyReportViewer";
import ReportAgent from "../utils/agents/ReportAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import { logger } from "../utils/logger";
import {
  MetricsIcon,
  CheckIcon,
  TargetIcon,
  ClockIcon,
  TrophyIcon,
  TrendingUpIcon,
  HeartIcon,
} from "./themes/SynthwaveComponents";

function WeeklyReports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const weekId = searchParams.get("weekId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    error: userIdError,
  } = useAuthorizeUser(userId);

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
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Coach data state
  const [coachData, setCoachData] = useState(null);

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
      setReportAgentState((prev) => ({ ...prev, ...s })),
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

  // Load coach data
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loadedCoachData = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );
        setCoachData(loadedCoachData);
      } catch (error) {
        logger.error("Failed to load coach data:", error);
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
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
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

  // Calculate QuickStats metrics from report data
  const getQuickStatsData = () => {
    if (!report) return [];

    const structured =
      report.analyticsData?.structured_analytics ||
      report.structured_analytics ||
      {};
    const weekMeta = structured.metadata || {};

    // Extract metrics safely
    const totalVolume =
      structured.volume_breakdown?.working_sets?.total_tonnage || 0;
    const sessionsCompleted = weekMeta.sessions_completed || 0;
    const progressiveOverloadScore =
      structured.weekly_progression?.progressive_overload_score || 0;

    // Calculate average RPE from daily volume data
    const dailyVolumeData = structured.raw_aggregations?.daily_volume || [];
    const rpeValues = dailyVolumeData
      .map((day) => day.avg_rpe)
      .filter((rpe) => rpe && rpe > 0);
    const avgRpe =
      rpeValues.length > 0
        ? (
            rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length
          ).toFixed(1)
        : 0;

    const recoveryScore = structured.fatigue_management?.recovery_score || 0;

    // Calculate total training time from session summaries
    const sessionSummaries =
      structured.raw_aggregations?.session_summaries || [];
    const totalTimeMinutes = dailyVolumeData.reduce(
      (sum, day) => sum + (day.duration || 0),
      0,
    );

    const recordsSet = structured.performance_markers?.records_set?.length || 0;

    return [
      {
        icon: MetricsIcon,
        value: totalVolume ? totalVolume.toLocaleString() : 0,
        tooltip: {
          title: "Total Volume",
          description: `${totalVolume ? totalVolume.toLocaleString() : 0} lbs moved this week`,
        },
        color: "pink",
        isLoading: false,
        ariaLabel: `${totalVolume ? totalVolume.toLocaleString() : 0} lbs total volume`,
        id: "report-stat-volume",
      },
      {
        icon: CheckIcon,
        value: sessionsCompleted,
        tooltip: {
          title: "Sessions Completed",
          description: `${sessionsCompleted} training sessions completed this week`,
        },
        color: "cyan",
        isLoading: false,
        ariaLabel: `${sessionsCompleted} sessions completed`,
        id: "report-stat-sessions",
      },
      {
        icon: TrendingUpIcon,
        value: progressiveOverloadScore
          ? `${progressiveOverloadScore}/10`
          : "--",
        tooltip: {
          title: "Progressive Overload Score",
          description: `${progressiveOverloadScore}/10 - Measure of training progression`,
        },
        color: "purple",
        isLoading: false,
        ariaLabel: `Progressive overload score ${progressiveOverloadScore} out of 10`,
        id: "report-stat-overload",
      },
      {
        icon: TargetIcon,
        value: avgRpe || "--",
        tooltip: {
          title: "Average RPE",
          description: `${avgRpe || 0} average rate of perceived exertion`,
        },
        color: "cyan",
        isLoading: false,
        ariaLabel: `Average RPE ${avgRpe}`,
        id: "report-stat-rpe",
      },
      {
        icon: HeartIcon,
        value: recoveryScore ? `${recoveryScore}/10` : "--",
        tooltip: {
          title: "Recovery Score",
          description: `${recoveryScore}/10 - Overall recovery and readiness`,
        },
        color: "pink",
        isLoading: false,
        ariaLabel: `Recovery score ${recoveryScore} out of 10`,
        id: "report-stat-recovery",
      },
      {
        icon: ClockIcon,
        value: totalTimeMinutes ? `${totalTimeMinutes}m` : "--",
        tooltip: {
          title: "Total Training Time",
          description: `${totalTimeMinutes} minutes of training this week`,
        },
        color: "purple",
        isLoading: false,
        ariaLabel: `${totalTimeMinutes} minutes total`,
        id: "report-stat-time",
      },
      {
        icon: TrophyIcon,
        value: recordsSet,
        tooltip: {
          title: "Records Set",
          description: `${recordsSet} personal records achieved this week`,
        },
        color: "cyan",
        isLoading: false,
        ariaLabel: `${recordsSet} records set`,
        id: "report-stat-records",
      },
    ];
  };

  // Show skeleton loading while validating userId or loading report
  if (isValidatingUserId || reportAgentState.isLoadingItem) {
    return <ReportsSkeleton />;
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
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Weekly Report Header"
        >
          {/* Left section: Title + Beta Badge + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title with Beta Badge */}
            <div className="flex items-center gap-3">
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="weekly-report-info"
                data-tooltip-content="Comprehensive analysis of your weekly training performance including volume, progression, and insights."
              >
                Weekly Report
              </h1>
              <div
                className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded text-synthwave-neon-purple font-rajdhani text-xs font-bold uppercase tracking-wider cursor-help"
                data-tooltip-id="beta-badge"
                data-tooltip-content="Weekly reports v2 are in beta. You may experience pre-release behavior. We appreciate your feedback!"
              >
                Beta
              </div>
            </div>

            {/* Compact Coach Card */}
            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={handleCoachCardClick}
                tooltipContent="Go to the Training Grounds"
              />
            )}
          </div>

          {/* Right section: Command Palette Button */}
          <div className="flex items-center gap-3">
            <CommandPaletteButton
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>
        </header>

        {/* Quick Stats */}
        {report && <QuickStats stats={getQuickStatsData()} />}

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center">
          {report ? (
            <WeeklyReportViewer
              report={report}
              onToggleView={handleToggleView}
              viewMode={viewMode}
              userId={userId}
              coachId={coachId}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-synthwave-text-secondary font-rajdhani text-lg">
                No report data available
              </div>
            </div>
          )}
        </div>
        <AppFooter />
      </div>

      {/* Tooltips */}
      <Tooltip
        id="weekly-report-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="beta-badge"
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

// Skeleton loading component matching ProgramDashboard pattern
function ReportsSkeleton() {
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header Skeleton */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
          {/* Left: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
            {/* Title skeleton - compact size */}
            <div className="h-8 md:h-9 bg-synthwave-text-muted/20 animate-pulse w-64"></div>

            {/* Compact coach card skeleton - horizontal pill */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
              <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
              <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
            </div>
          </div>

          {/* Right: Command button skeleton */}
          <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-none animate-pulse"></div>
        </header>

        {/* Quick Stats skeleton */}
        <QuickStats
          stats={[1, 2, 3, 4, 5, 6, 7].map((i) => ({
            icon: null,
            value: 0,
            tooltip: { title: "", description: "" },
            color: "cyan",
            isLoading: true,
            id: `skeleton-stat-${i}`,
          }))}
        />

        {/* Two-column layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column - 60% */}
          <div className="lg:col-span-3 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 animate-pulse"></div>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right column - 40% */}
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-40"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 animate-pulse"></div>
                </div>
                <div className="px-6 pb-6">
                  <div className="h-16 bg-synthwave-text-muted/20 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklyReports;
