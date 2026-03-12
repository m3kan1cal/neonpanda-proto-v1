import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  layoutPatterns,
  containerPatterns,
} from "../../utils/ui/uiPatterns";
import { useAuthorizeUser } from "../../auth/hooks/useAuthorizeUser";
import { BarChartIcon, ChevronRightIcon } from "../themes/SynthwaveComponents";
import {
  FullPageLoader,
  CenteredErrorState,
} from "../shared/ErrorStates";
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
import { getExercises } from "../../utils/apis/exerciseApi";

// ---------------------------------------------------------------------------
// AnalyticsPage — visual analytics hub
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizeUser(userId);

  // Time range state
  const [timeRange, setTimeRange] = useState("8w");

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

    exerciseAgentRef.current = new ExerciseAgent(userId, (newState) => {
      if (newState.exerciseNames) setExerciseNames(newState.exerciseNames);
      if (newState.isLoadingNames !== undefined) setIsLoadingNames(newState.isLoadingNames);
    });

    exerciseAgentRef.current.loadExerciseNames({ limit: 500 });

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
        setExerciseHistory({ exercises: [], aggregations: null, isLoading: false });
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
    exerciseNames.find((ex) => ex.exerciseName === selectedExercise)?.displayName ||
    selectedExercise ||
    "";

  // Auth gate
  if (isAuthLoading) return <FullPageLoader />;
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
        <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-synthwave-neon-purple">
              <BarChartIcon />
            </span>
            <h1 className="font-header font-bold text-2xl md:text-3xl text-white uppercase tracking-wider">
              Analytics
            </h1>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </header>

        {/* Back link */}
        <Link
          to={`/training-grounds?userId=${userId}&coachId=${coachId}`}
          className="inline-flex items-center gap-1.5 font-body text-xs text-synthwave-text-muted hover:text-synthwave-neon-cyan transition-colors mb-6"
        >
          <span className="rotate-180">
            <ChevronRightIcon />
          </span>
          Back to Training Grounds
        </Link>

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
              className="mt-2 font-body text-xs text-synthwave-neon-cyan underline hover:no-underline"
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
            <SectionHeader title="Performance Overview" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <VolumeTrendChart
                data={weeklyChartData}
                isLoading={isLoading}
              />
              <FrequencyChart
                data={weeklyChartData}
                isLoading={isLoading}
              />
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
            {/* Exercise aggregation stats card */}
            <ExerciseStatsCard
              aggregations={exerciseHistory.aggregations}
              exerciseName={selectedDisplayName}
              sessionCount={exerciseHistory.exercises.length}
              isLoading={exerciseHistory.isLoading}
            />
          </div>
        )}

        {!selectedExercise && (
          <div className={`${containerPatterns.cardMedium} p-6 mb-10 text-center border-dashed`}>
            <p className="font-body text-sm text-synthwave-text-muted">
              Select an exercise above to see strength progression, volume trends, and PR history.
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* BODY BALANCE & RECOVERY                                          */}
        {/* ---------------------------------------------------------------- */}
        {(isLoading || hasAnyData) && (
          <>
            <SectionHeader title="Body Balance & Recovery" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <MovementBalanceChart
                weeklyData={weeklyChartData}
                isLoading={isLoading}
              />
              <BodyPartChart
                weeklyData={weeklyChartData}
                isLoading={isLoading}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 mb-8">
              <RecoveryLoadChart
                data={weeklyChartData}
                isLoading={isLoading}
              />
            </div>
          </>
        )}

        <AppFooter />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title }) {
  return (
    <h2 className="font-header font-bold text-white text-lg uppercase tracking-wide mb-4">
      {title}
    </h2>
  );
}

function ExerciseStatsCard({ aggregations, exerciseName, sessionCount, isLoading }) {
  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-5`}>
        <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-synthwave-text-muted/10 animate-pulse" />
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
        <StatRow label="Total Sessions" value={sessionCount} color="text-white" />
        <StatRow
          label="PR Weight"
          value={agg.prWeight ? `${agg.prWeight} lbs` : "—"}
          color="text-synthwave-neon-pink"
        />
        <StatRow
          label="Avg Weight"
          value={agg.averageWeight ? `${Math.round(agg.averageWeight)} lbs` : "—"}
          color="text-synthwave-neon-cyan"
        />
        <StatRow
          label="Avg Reps"
          value={agg.averageReps ? `${Number(agg.averageReps).toFixed(1)}` : "—"}
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

