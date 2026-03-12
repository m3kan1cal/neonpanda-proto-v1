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
import AnalyticsAgent from "../../utils/agents/AnalyticsAgent";

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

  // Agent + data state
  const agentRef = useRef(null);
  const [analyticsState, setAnalyticsState] = useState({
    weeklyChartData: [],
    isLoading: true,
    error: null,
  });

  // Initialize agent
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

  // Fetch data when time range changes
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
            className={`${containerPatterns.cardMedium} p-8 text-center`}
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
        {/* CHART GRID                                                       */}
        {/* ---------------------------------------------------------------- */}
        {(isLoading || hasAnyData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <VolumeTrendChart
              data={weeklyChartData}
              isLoading={isLoading}
            />
            <FrequencyChart
              data={weeklyChartData}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* COMING SOON TEASER                                               */}
        {/* ---------------------------------------------------------------- */}
        {hasAnyData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <ComingSoonCard
              title="Exercise Deep Dive"
              description="Track strength progression for any exercise over time"
            />
            <ComingSoonCard
              title="Body Balance"
              description="Radar chart of push, pull, squat, hinge, carry, and core"
            />
            <ComingSoonCard
              title="Recovery & Load"
              description="Monitor fatigue and acute:chronic workload ratio"
            />
          </div>
        )}

        <AppFooter />
      </div>
    </div>
  );
}

// Placeholder card for upcoming chart types
function ComingSoonCard({ title, description }) {
  return (
    <div
      className={`${containerPatterns.cardMedium} p-5 border-dashed opacity-60`}
    >
      <h4 className="font-header font-bold text-white text-sm uppercase mb-1">
        {title}
      </h4>
      <p className="font-body text-xs text-synthwave-text-muted">
        {description}
      </p>
      <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-synthwave-neon-purple/10 text-synthwave-neon-purple font-body text-[10px] uppercase tracking-wide">
        Coming Soon
      </span>
    </div>
  );
}
