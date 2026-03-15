import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import {
  layoutPatterns,
  containerPatterns,
  typographyPatterns,
  tooltipPatterns,
} from "../../utils/ui/uiPatterns";
import { useAuthorizeUser } from "../../auth/hooks/useAuthorizeUser";
import { useNavigationContext } from "../../contexts/NavigationContext";
import { BarChartIcon } from "../themes/SynthwaveComponents";
import { CenteredErrorState } from "../shared/ErrorStates";
import CompactCoachCard from "../shared/CompactCoachCard";
import CommandPaletteButton from "../shared/CommandPaletteButton";
import AppFooter from "../shared/AppFooter";
import TimeRangeSelector, { TIME_RANGES } from "./TimeRangeSelector";
import VolumeTrendChart from "./VolumeTrendChart";
import FrequencyChart from "./FrequencyChart";
import ExerciseSelector from "./ExerciseSelector";
import StrengthCurveChart from "./StrengthCurveChart";
import ExerciseVolumeChart from "./ExerciseVolumeChart";
import PRTimelineChart from "./PRTimelineChart";
import MovementBalanceChart from "./MovementBalanceChart";
import BodyPartChart from "./BodyPartChart";
import RecoveryLoadChart from "./RecoveryLoadChart";
import WeeklyComparisonChart from "./WeeklyComparisonChart";
import AnalyticsAgent from "../../utils/agents/AnalyticsAgent";
import ExerciseAgent from "../../utils/agents/ExerciseAgent";
import CoachAgent from "../../utils/agents/CoachAgent";
import { getExercises } from "../../utils/apis/exerciseApi";
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Analytics — visual analytics hub
// ---------------------------------------------------------------------------

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");
  const { isValid: isAuthorized, isValidating: isAuthLoading } =
    useAuthorizeUser(userId);

  const { setIsCommandPaletteOpen } = useNavigationContext();

  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Time range state
  const [timeRange, setTimeRange] = useState("8w");

  // Coach data
  const coachAgentRef = useRef(null);
  const [coachData, setCoachData] = useState(null);

  // Analytics agent + weekly chart data
  const agentRef = useRef(null);
  const [analyticsState, setAnalyticsState] = useState({
    weeklyChartData: [],
    isLoading: true,
    error: null,
  });

  // Exercise agent + exercise deep dive state
  const exerciseAgentRef = useRef(null);
  const [exerciseNames, setExerciseNames] = useState([]);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseHistory, setExerciseHistory] = useState({
    exercises: [],
    aggregations: null,
    isLoading: false,
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load coach data
  useEffect(() => {
    if (!userId || !coachId) return;
    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loaded = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );
        setCoachData(loaded);
      } catch (error) {
        logger.error("Analytics: failed to load coach data", error);
      }
    };
    loadCoachData();
    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current.destroy();
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Initialize analytics agent
  useEffect(() => {
    if (!userId) return;

    if (!agentRef.current) {
      agentRef.current = new AnalyticsAgent(userId, (newState) =>
        setAnalyticsState(newState),
      );
    } else {
      agentRef.current.setUserId(userId);
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId]);

  // Initialize exercise agent + load names
  useEffect(() => {
    if (!userId) return;

    if (!exerciseAgentRef.current) {
      exerciseAgentRef.current = new ExerciseAgent(userId, (newState) => {
        if (newState.exerciseNames) setExerciseNames(newState.exerciseNames);
        if (newState.isLoadingNames !== undefined)
          setIsLoadingNames(newState.isLoadingNames);
      });
      exerciseAgentRef.current.loadExerciseNames({ limit: 500 });
    }

    return () => {
      if (exerciseAgentRef.current) {
        exerciseAgentRef.current.destroy();
        exerciseAgentRef.current = null;
      }
    };
  }, [userId]);

  // Fetch weekly chart data when time range changes
  const loadData = useCallback(async () => {
    if (!agentRef.current) return;
    const range = TIME_RANGES.find((r) => r.key === timeRange);
    const weeks = range?.weeks || 8;
    try {
      await agentRef.current.loadWeeklyChartData(weeks);
    } catch {
      // Error state handled by agent
    }
  }, [timeRange]);

  useEffect(() => {
    if (userId && agentRef.current) {
      loadData();
    }
  }, [userId, loadData]);

  // Fetch exercise history when selection changes
  const loadExerciseHistory = useCallback(
    async (exerciseName) => {
      if (!userId || !exerciseName) return;

      setExerciseHistory((prev) => ({ ...prev, isLoading: true }));

      try {
        const result = await getExercises(userId, exerciseName, {
          limit: 100,
          sortOrder: "asc",
        });

        setExerciseHistory({
          exercises: result.exercises || [],
          aggregations: result.aggregations || null,
          isLoading: false,
        });
      } catch {
        setExerciseHistory({
          exercises: [],
          aggregations: null,
          isLoading: false,
        });
      }
    },
    [userId],
  );

  const handleExerciseSelect = useCallback(
    (exerciseName) => {
      setSelectedExercise(exerciseName);
      loadExerciseHistory(exerciseName);
    },
    [loadExerciseHistory],
  );

  // Get display name for selected exercise
  const selectedDisplayName =
    exerciseNames.find((ex) => ex.exerciseName === selectedExercise)
      ?.displayName ||
    selectedExercise ||
    "";

  // Auth gate — skeleton while validating
  if (isAuthLoading) return <AnalyticsSkeleton />;
  if (!isAuthorized)
    return (
      <CenteredErrorState
        title="Access denied"
        message="You are not authorized to view this page."
      />
    );

  const { weeklyChartData, isLoading, error } = analyticsState;
  const hasAnyData = weeklyChartData.length >= 2;

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* ---------------------------------------------------------------- */}
        {/* HEADER                                                           */}
        {/* ---------------------------------------------------------------- */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Analytics Header"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <h1
                className="font-header font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="training-pulse-info"
                data-tooltip-content="Track your training trends, exercise progression, and movement balance."
              >
                Training Pulse
              </h1>
              <div
                className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 text-synthwave-neon-purple font-body text-xs font-bold uppercase tracking-wider cursor-help"
                data-tooltip-id="beta-badge"
                data-tooltip-content="Training Pulse is in beta. You may experience pre-release behavior. We appreciate your feedback!"
              >
                Beta
              </div>
            </div>
            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={handleCoachCardClick}
                tooltipContent="Back to Training Grounds"
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <CommandPaletteButton
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* ERROR STATE                                                      */}
        {/* ---------------------------------------------------------------- */}
        {error && !isLoading && (
          <div
            className={`${containerPatterns.cardMedium} p-5 mb-6 border-synthwave-neon-pink/30`}
          >
            <p className="font-body text-sm text-synthwave-neon-pink">
              {error}
            </p>
            <button
              onClick={loadData}
              className="mt-2 font-body text-xs text-synthwave-neon-cyan underline hover:no-underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* EMPTY STATE (first-time user)                                    */}
        {/* ---------------------------------------------------------------- */}
        {!isLoading && !error && !hasAnyData && (
          <div
            className={`${containerPatterns.cardMedium} p-8 text-center mb-8`}
          >
            <div className="text-synthwave-neon-purple mb-3 flex justify-center">
              <BarChartIcon />
            </div>
            <h2 className="font-header font-bold text-white text-lg uppercase mb-2">
              Analytics Unlock Soon
            </h2>
            <p className="font-body text-sm text-synthwave-text-secondary max-w-md mx-auto">
              Keep training! Charts and trend data will appear here after you
              have at least 2 weekly reports. Reports generate automatically
              every Sunday.
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* PERFORMANCE OVERVIEW CHARTS                                      */}
        {/* ---------------------------------------------------------------- */}
        {(isLoading || hasAnyData) && (
          <>
            <SectionHeader
              title="Performance Overview"
              rightSlot={
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              }
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <VolumeTrendChart data={weeklyChartData} isLoading={isLoading} />
              <FrequencyChart data={weeklyChartData} isLoading={isLoading} />
            </div>
            <div className="mb-10">
              <WeeklyComparisonChart
                data={weeklyChartData}
                isLoading={isLoading}
              />
            </div>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* EXERCISE DEEP DIVE                                               */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeader title="Exercise Deep Dive" />
        <div className="mb-5">
          <ExerciseSelector
            exercises={exerciseNames}
            isLoading={isLoadingNames}
            selectedExercise={selectedExercise}
            onSelect={handleExerciseSelect}
          />
        </div>

        {selectedExercise && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <StrengthCurveChart
              exerciseData={exerciseHistory.exercises}
              aggregations={exerciseHistory.aggregations}
              exerciseName={selectedDisplayName}
              isLoading={exerciseHistory.isLoading}
            />
            <ExerciseVolumeChart
              exerciseData={exerciseHistory.exercises}
              exerciseName={selectedDisplayName}
              isLoading={exerciseHistory.isLoading}
            />
          </div>
        )}

        {selectedExercise && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
            <PRTimelineChart
              exerciseData={exerciseHistory.exercises}
              exerciseName={selectedDisplayName}
              isLoading={exerciseHistory.isLoading}
            />
            <ExerciseStatsCard
              aggregations={exerciseHistory.aggregations}
              exerciseName={selectedDisplayName}
              sessionCount={exerciseHistory.exercises.length}
              isLoading={exerciseHistory.isLoading}
            />
          </div>
        )}

        {!selectedExercise && (
          <div
            className={`${containerPatterns.cardMedium} p-6 mb-10 text-center border-dashed`}
          >
            <p className="font-body text-sm text-synthwave-text-muted">
              Select an exercise above to see strength progression, volume
              trends, and PR history.
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* BODY BALANCE & RECOVERY                                          */}
        {/* ---------------------------------------------------------------- */}
        {(isLoading || hasAnyData) && (
          <>
            <SectionHeader title="Body Balance & Recovery" />

            {/* Row 1: Movement Balance full-width with side callouts */}
            <div className="mb-5">
              <MovementBalanceChart
                weeklyData={weeklyChartData}
                isLoading={isLoading}
                wide
              />
            </div>

            {/* Row 2: Body Part Frequency + Recovery & Load at 50/50 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
              <BodyPartChart
                weeklyData={weeklyChartData}
                isLoading={isLoading}
              />
              <RecoveryLoadChart data={weeklyChartData} isLoading={isLoading} />
            </div>
          </>
        )}

        <AppFooter />
      </div>

      <Tooltip
        id="training-pulse-info"
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
        id="beta-badge"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader — synthwave style with dot, title, gradient divider, rightSlot
// ---------------------------------------------------------------------------

function SectionHeader({ title, rightSlot }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={typographyPatterns.sectionDivider}>{title}</div>
      <div className={typographyPatterns.sectionDividerLine}></div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalyticsSkeleton — skeleton loading state matching page structure
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header: h1 + beta badge + coach pill + command palette button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="h-9 w-44 bg-synthwave-text-muted/20 animate-pulse" />
              <div className="h-6 w-12 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/20 animate-pulse rounded-sm" />
            </div>
            <div className="h-8 w-32 bg-synthwave-text-muted/10 animate-pulse rounded-full" />
          </div>
          <div className="h-8 w-8 bg-synthwave-text-muted/10 animate-pulse rounded-md" />
        </div>

        {/* Performance Overview section header + time range selector */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-48 bg-synthwave-text-muted/20 animate-pulse" />
          <div className="flex-1 h-px bg-gradient-to-r from-synthwave-neon-cyan/10 to-transparent" />
          <div className="h-8 w-44 bg-synthwave-text-muted/10 animate-pulse rounded-full" />
        </div>

        {/* Volume Trend + Frequency charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {[1, 2].map((i) => (
            <div key={i} className={`${containerPatterns.cardMedium} p-5`}>
              <div className="h-4 w-32 bg-synthwave-text-muted/20 animate-pulse mb-2" />
              <div className="h-3 w-48 bg-synthwave-text-muted/10 animate-pulse mb-5" />
              <div className="h-60 bg-synthwave-text-muted/5 animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Weekly Comparison chart */}
        <div className={`${containerPatterns.cardMedium} p-5 mb-10`}>
          <div className="h-4 w-44 bg-synthwave-text-muted/20 animate-pulse mb-2" />
          <div className="h-3 w-56 bg-synthwave-text-muted/10 animate-pulse mb-5" />
          <div className="grid grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-3 w-20 bg-synthwave-text-muted/10 animate-pulse mb-2" />
                <div className="h-28 bg-synthwave-text-muted/5 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Exercise Deep Dive section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-40 bg-synthwave-text-muted/20 animate-pulse" />
          <div className="flex-1 h-px bg-gradient-to-r from-synthwave-neon-cyan/10 to-transparent" />
        </div>

        {/* Exercise selector input placeholder */}
        <div className="mb-5 max-w-sm">
          <div className="relative w-full h-[44px] rounded-md bg-synthwave-text-muted/10 border border-synthwave-neon-cyan/10 animate-pulse flex items-center px-3 gap-2">
            <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded-sm shrink-0" />
            <div className="h-3 w-40 bg-synthwave-text-muted/20 rounded" />
          </div>
        </div>

        {/* Exercise deep-dive empty state placeholder */}
        <div
          className={`${containerPatterns.cardMedium} p-6 mb-10 border-dashed`}
        >
          <div className="h-3 w-64 bg-synthwave-text-muted/10 animate-pulse mx-auto rounded" />
        </div>

        {/* Body Balance & Recovery section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-52 bg-synthwave-text-muted/20 animate-pulse" />
          <div className="flex-1 h-px bg-gradient-to-r from-synthwave-neon-cyan/10 to-transparent" />
        </div>

        {/* Movement Balance — full-width */}
        <div className={`${containerPatterns.cardMedium} p-5 mb-5`}>
          <div className="h-4 w-40 bg-synthwave-text-muted/20 animate-pulse mb-2" />
          <div className="h-3 w-56 bg-synthwave-text-muted/10 animate-pulse mb-5" />
          <div className="h-[340px] bg-synthwave-text-muted/5 animate-pulse rounded" />
        </div>

        {/* Body Part + Recovery side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className={`${containerPatterns.cardMedium} p-5`}>
              <div className="h-4 w-32 bg-synthwave-text-muted/20 animate-pulse mb-2" />
              <div className="h-3 w-44 bg-synthwave-text-muted/10 animate-pulse mb-5" />
              <div className="h-52 bg-synthwave-text-muted/5 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExerciseStatsCard
// ---------------------------------------------------------------------------

function ExerciseStatsCard({
  aggregations,
  exerciseName,
  sessionCount,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-5`}>
        <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-4 bg-synthwave-text-muted/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const agg = aggregations || {};

  return (
    <div className={`${containerPatterns.cardMedium} p-5`}>
      <h3 className="font-header font-bold text-white text-base uppercase tracking-wide mb-1">
        Exercise Stats
      </h3>
      <p className="font-body text-xs text-synthwave-text-secondary mb-4">
        Aggregated data for {exerciseName}
      </p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <StatRow
          label="Total Sessions"
          value={sessionCount}
          color="text-white"
        />
        <StatRow
          label="PR Weight"
          value={agg.prWeight ? `${agg.prWeight} lbs` : "—"}
          color="text-synthwave-neon-pink"
        />
        <StatRow
          label="Avg Weight"
          value={
            agg.averageWeight ? `${Math.round(agg.averageWeight)} lbs` : "—"
          }
          color="text-synthwave-neon-cyan"
        />
        <StatRow
          label="Avg Reps"
          value={
            agg.averageReps ? `${Number(agg.averageReps).toFixed(1)}` : "—"
          }
          color="text-synthwave-neon-cyan"
        />
        <StatRow
          label="PR Volume"
          value={agg.prVolume ? `${agg.prVolume.toLocaleString()} lbs` : "—"}
          color="text-synthwave-neon-purple"
        />
        <StatRow
          label="Total Occurrences"
          value={agg.totalOccurrences || sessionCount}
          color="text-white"
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div>
      <p className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wide">
        {label}
      </p>
      <p className={`font-header font-bold text-sm ${color}`}>{value}</p>
    </div>
  );
}
