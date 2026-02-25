import React from "react";
import { useNavigate } from "react-router-dom";
import { BrainIcon, ChevronRightIcon } from "../themes/SynthwaveComponents";
import { getWeekDateRange, formatRelativeTime } from "../../utils/dateUtils";

// ---------------------------------------------------------------------------
// Freshness helpers
// ---------------------------------------------------------------------------

/**
 * Returns the number of days since the report's weekEnd (or weekStart as fallback).
 * Used to decide which insight source to surface.
 */
function getReportAgeDays(report) {
  const refDate = report?.weekEnd || report?.weekStart;
  if (!refDate) return Infinity;
  const now = new Date();
  const end = new Date(refDate);
  return Math.floor((now - end) / (1000 * 60 * 60 * 24));
}

function getInsights(report) {
  return report?.analyticsData?.structured_analytics?.actionable_insights || null;
}

function getFatigue(report) {
  return report?.analyticsData?.structured_analytics?.fatigue_management || null;
}

function truncate(text, maxLen = 200) {
  if (!text || text.length <= maxLen) return text;
  return text.substring(0, maxLen).trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// Insight source selector
// ---------------------------------------------------------------------------

/**
 * Picks the right insight source based on freshness rules:
 *   ≤3 days since weekEnd  → weekly analytics only
 *   4–5 days              → weekly analytics headline + most recent workout summary
 *   >5 days               → most recent workout AI summary only
 *
 * Falls through to workout summary when no weekly analytics are available.
 */
function selectInsightSource(recentReports, recentWorkouts) {
  const latestReport = recentReports?.[0];
  const latestWorkout = recentWorkouts?.[0];

  if (latestReport) {
    const ageDays = getReportAgeDays(latestReport);
    const insights = getInsights(latestReport);
    const hasInsights = !!insights?.top_priority;

    if (hasInsights && ageDays <= 3) {
      return { type: "weekly", report: latestReport };
    }
    if (hasInsights && ageDays <= 5 && latestWorkout?.summary) {
      return { type: "combined", report: latestReport, workout: latestWorkout };
    }
    if (hasInsights && ageDays <= 5) {
      // No workout summary to pair with — just show weekly
      return { type: "weekly", report: latestReport };
    }
  }

  // Fall back to workout summary when analytics are stale or missing
  if (latestWorkout?.summary) {
    return { type: "workout", workout: latestWorkout };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CoachBriefingCard — surfaces the most recent AI-generated insight on the
 * Training Grounds dashboard above Today's Lineup.
 *
 * Freshness rules (see selectInsightSource above) ensure the card stays
 * relevant: older weekly analytics yield to recent workout summaries so
 * users always see something current rather than stale advice.
 */
export default function CoachBriefingCard({
  recentReports = [],
  recentWorkouts = [],
  isLoading = false,
  userId,
  coachId,
}) {
  const navigate = useNavigate();

  // ------ Loading skeleton ------
  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="bg-synthwave-neon-purple/5 border border-synthwave-neon-purple/20 rounded-2xl p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-full shrink-0" />
            <div className="h-4 bg-synthwave-text-muted/20 rounded w-28" />
            <div className="h-3 bg-synthwave-text-muted/10 rounded w-24 ml-auto" />
          </div>
          <div className="h-4 bg-synthwave-text-muted/20 rounded w-full mb-2" />
          <div className="h-4 bg-synthwave-text-muted/20 rounded w-4/5 mb-4" />
          <div className="h-3 bg-synthwave-text-muted/10 rounded w-3/5 mb-1.5" />
          <div className="h-3 bg-synthwave-text-muted/10 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const source = selectInsightSource(recentReports, recentWorkouts);
  if (!source) return null;

  // Check for deload / red flag alert regardless of source type
  const latestReport = recentReports?.[0];
  const fatigue = getFatigue(latestReport);
  const reportInsights = getInsights(latestReport);
  const isDeloadWarning =
    fatigue?.suggested_action === "deload" || !!reportInsights?.red_flags;

  const handleViewReport = (report) => {
    if (!report?.weekId) return;
    navigate(
      `/training-grounds/reports/weekly?userId=${userId}&weekId=${report.weekId}&coachId=${coachId}`,
    );
  };

  const handleViewWorkout = (workout) => {
    if (!workout?.workoutId) return;
    navigate(
      `/training-grounds/workouts?workoutId=${workout.workoutId}&userId=${userId}&coachId=${coachId}`,
    );
  };

  // ---- Weekly or Combined ----
  if (source.type === "weekly" || source.type === "combined") {
    const { report, workout } = source;
    const weekInsights = getInsights(report);
    const dateRange = getWeekDateRange(report);
    const workoutCount = report?.metadata?.workoutCount;

    const borderClass = isDeloadWarning
      ? "bg-gradient-to-r from-synthwave-neon-pink/10 to-synthwave-bg-card/60 border-synthwave-neon-pink/40 shadow-synthwave-neon-pink/10"
      : "bg-gradient-to-r from-synthwave-neon-purple/10 to-synthwave-bg-card/60 border-synthwave-neon-purple/30 shadow-synthwave-neon-purple/10";

    const accentClass = isDeloadWarning
      ? "text-synthwave-neon-pink"
      : "text-synthwave-neon-purple";

    return (
      <div className="mb-6">
        <div
          className={`relative rounded-2xl border p-5 shadow-lg transition-all duration-300 ${borderClass}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`shrink-0 ${accentClass}`}>
              <BrainIcon />
            </span>
            <span
              className={`font-russo font-bold text-sm uppercase tracking-wider ${accentClass}`}
            >
              Coach's Take
            </span>
            <span className="font-rajdhani text-xs text-synthwave-text-muted ml-1">
              {dateRange}
              {workoutCount != null ? ` · ${workoutCount} workouts` : ""}
            </span>
            <button
              onClick={() => handleViewReport(report)}
              className="ml-auto flex items-center gap-1 text-synthwave-text-muted hover:text-synthwave-neon-purple transition-colors duration-200 cursor-pointer shrink-0"
              aria-label="View full weekly report"
            >
              <span className="font-rajdhani text-xs uppercase tracking-wide">
                Full report
              </span>
              <ChevronRightIcon />
            </button>
          </div>

          {/* Deload / red flag alert */}
          {isDeloadWarning && (
            <div className="mb-3 px-3 py-2 bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-lg">
              <p className="font-rajdhani text-sm text-synthwave-neon-pink font-semibold leading-snug">
                {reportInsights?.red_flags ||
                  "Recovery week recommended — fatigue markers are elevated."}
              </p>
            </div>
          )}

          {/* Top priority insight */}
          {weekInsights?.top_priority && (
            <p className="font-rajdhani text-base text-white leading-relaxed mb-3">
              {truncate(weekInsights.top_priority, 220)}
            </p>
          )}

          {/* Quick wins */}
          {weekInsights?.quick_wins?.length > 0 && (
            <div>
              <p className="font-rajdhani text-[11px] text-synthwave-text-muted uppercase tracking-wider font-semibold mb-1.5">
                Quick Wins
              </p>
              <ul className="space-y-1">
                {weekInsights.quick_wins.slice(0, 3).map((win, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-rajdhani text-xs text-synthwave-neon-purple font-bold shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <span className="font-rajdhani text-sm text-synthwave-text-secondary leading-snug">
                      {truncate(win, 130)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Combined: append most recent workout summary below a divider */}
          {source.type === "combined" && workout?.summary && (
            <div className="mt-3 pt-3 border-t border-synthwave-neon-purple/15">
              <div
                className="flex items-start gap-2 cursor-pointer group"
                onClick={() => handleViewWorkout(workout)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleViewWorkout(workout)
                }
              >
                <div className="flex-1 min-w-0">
                  <p className="font-rajdhani text-[11px] text-synthwave-text-muted uppercase tracking-wider font-semibold mb-1">
                    Last Workout
                    {workout.workoutName ? ` — ${workout.workoutName}` : ""}
                    {workout.completedAt
                      ? ` · ${formatRelativeTime(workout.completedAt)}`
                      : ""}
                  </p>
                  <p className="font-rajdhani text-sm text-synthwave-text-secondary leading-snug group-hover:text-white transition-colors duration-200">
                    {truncate(workout.summary, 150)}
                  </p>
                </div>
                <span className="text-synthwave-text-muted group-hover:text-synthwave-neon-cyan transition-colors duration-200 shrink-0 mt-1">
                  <ChevronRightIcon />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Workout-only ----
  if (source.type === "workout") {
    const { workout } = source;
    return (
      <div className="mb-6">
        <div
          className="relative rounded-2xl border bg-gradient-to-r from-synthwave-neon-cyan/5 to-synthwave-bg-card/60 border-synthwave-neon-cyan/25 p-5 shadow-lg shadow-synthwave-neon-cyan/5 transition-all duration-300 cursor-pointer hover:border-synthwave-neon-cyan/40 hover:shadow-synthwave-neon-cyan/10 group"
          onClick={() => handleViewWorkout(workout)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleViewWorkout(workout)}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="shrink-0 text-synthwave-neon-cyan">
              <BrainIcon />
            </span>
            <span className="font-russo font-bold text-sm uppercase tracking-wider text-synthwave-neon-cyan">
              Last Session
            </span>
            {workout.workoutName && (
              <span className="font-rajdhani text-xs text-synthwave-text-muted">
                — {workout.workoutName}
              </span>
            )}
            {workout.completedAt && (
              <span className="font-rajdhani text-xs text-synthwave-text-muted ml-auto shrink-0">
                {formatRelativeTime(workout.completedAt)}
              </span>
            )}
          </div>
          <p className="font-rajdhani text-sm text-synthwave-text-secondary leading-relaxed group-hover:text-white transition-colors duration-200 pr-6">
            {truncate(workout.summary, 220)}
          </p>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none">
            <span className="text-synthwave-neon-cyan">
              <ChevronRightIcon />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
