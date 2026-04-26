import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Tooltip } from "react-tooltip";
import {
  buttonPatterns,
  containerPatterns,
  typographyPatterns,
  tooltipPatterns,
} from "../../utils/ui/uiPatterns";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";
import InsightsModal from "./InsightsModal";
import { SparklesIcon } from "./icons";
import { normalizeListFieldToStringArray } from "../../utils/objectUtils";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dismiss / localStorage helpers
// ---------------------------------------------------------------------------

const DISMISS_KEY_PREFIX = "neonpanda_dismissed_insight_";

/**
 * Builds a unique source fingerprint so we can detect when new insights arrive.
 * Returns a string like "workout_insights:<workoutId>:<generatedAt>" or
 * "weekly_analytics:<weekId>" etc.
 */
function getSourceFingerprint(source) {
  if (!source) return null;
  switch (source.type) {
    case "workout_insights":
      return `workout_insights:${source.workout?.workoutId}:${source.insights?.generatedAt || ""}`;
    case "weekly_analytics":
      return `weekly_analytics:${source.report?.weekId || ""}`;
    case "combined":
      return `combined:${source.report?.weekId || ""}:${source.workout?.workoutId || ""}`;
    case "workout_summary":
      return `workout_summary:${source.workout?.workoutId || ""}`;
    default:
      return null;
  }
}

function isDismissed(userId, source) {
  if (!userId) return false;
  try {
    const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${userId}`);
    if (!raw) return false;
    const stored = JSON.parse(raw);
    const fingerprint = getSourceFingerprint(source);
    return stored.fingerprint === fingerprint;
  } catch {
    return false;
  }
}

function dismissSource(userId, source) {
  if (!userId) return;
  try {
    const fingerprint = getSourceFingerprint(source);
    localStorage.setItem(
      `${DISMISS_KEY_PREFIX}${userId}`,
      JSON.stringify({ fingerprint, dismissedAt: new Date().toISOString() }),
    );
  } catch {
    // localStorage may be unavailable
  }
}

// ---------------------------------------------------------------------------
// Source Selection Logic
// ---------------------------------------------------------------------------

/**
 * Selects the best insight source based on data freshness.
 *
 * Priority:
 * 1. Workout insights (most recent workout has AI analysis)
 * 2. Fresh weekly report (0-3 days since weekEnd)
 * 3. Combined (4-5 days -- weekly headline + workout summary)
 * 4. Workout summary fallback (>5 days or no reports)
 * 5. Empty (no data)
 */
function selectBriefingSource(recentReports, recentWorkouts) {
  const now = new Date();
  const mostRecentReport = recentReports?.[0];
  const mostRecentWorkout = recentWorkouts?.[0];

  // Priority 1: If most recent workout has AI insights, prefer those
  if (mostRecentWorkout?.insights) {
    return {
      type: "workout_insights",
      workout: mostRecentWorkout,
      insights: mostRecentWorkout.insights,
    };
  }

  // Check report freshness
  if (mostRecentReport?.weekEnd) {
    const weekEnd = new Date(mostRecentReport.weekEnd);
    const daysSinceWeekEnd = Math.floor(
      (now - weekEnd) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceWeekEnd <= 3) {
      return {
        type: "weekly_analytics",
        report: mostRecentReport,
        daysSince: daysSinceWeekEnd,
      };
    }

    if (daysSinceWeekEnd <= 5 && mostRecentWorkout?.summary) {
      return {
        type: "combined",
        report: mostRecentReport,
        workout: mostRecentWorkout,
        daysSince: daysSinceWeekEnd,
      };
    }
  }

  // Priority 4: Fall back to most recent workout summary
  if (mostRecentWorkout?.summary) {
    return {
      type: "workout_summary",
      workout: mostRecentWorkout,
    };
  }

  return { type: "empty" };
}

// ---------------------------------------------------------------------------
// Text Helpers
// ---------------------------------------------------------------------------

function truncate(text, maxLen = 140) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_{2}(.*?)_{2}/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CoachBriefingCard -- surfaces the most relevant AI insight on Training Grounds.
 *
 * Designed to be its own section at the top of the page. Includes a dismiss
 * button that hides the card until new insight data arrives (tracked via
 * localStorage fingerprint).
 *
 * @param {Object} props
 * @param {Array} props.recentReports - Recent weekly report objects (sorted desc by weekStart)
 * @param {Array} props.recentWorkouts - Recent workout objects (sorted desc by completedAt)
 * @param {boolean} props.isLoading - Show skeleton while loading
 * @param {string} props.userId - Current user ID
 * @param {string} props.coachId - Current coach ID
 */
export default function CoachBriefingCard({
  recentReports = [],
  recentWorkouts = [],
  isLoading = false,
  userId,
  coachId,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const source = useMemo(
    () => selectBriefingSource(recentReports, recentWorkouts),
    [recentReports, recentWorkouts],
  );

  useEffect(() => {
    setDismissed(false);
  }, [source]);

  // Check localStorage on source change
  const isCurrentlyDismissed = useMemo(
    () => dismissed || isDismissed(userId, source),
    [dismissed, userId, source],
  );

  const handleDismiss = useCallback(
    (e) => {
      e.stopPropagation();
      dismissSource(userId, source);
      setDismissed(true);
    },
    [userId, source],
  );

  // ------ Loading skeleton ------
  if (isLoading) {
    return (
      <div className="mb-8">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={typographyPatterns.sectionDivider}>
            Training Intel
          </div>
          <div className={typographyPatterns.sectionDividerLine}></div>
        </div>
        {/* Grid -- matches workout card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className={containerPatterns.neonGlassSkeleton}>
            <div
              className={`${containerPatterns.neonGlassSkeletonInner} relative`}
            >
              {/* Dismiss button placeholder */}
              <div className="absolute top-4 right-4">
                <div className="w-8 h-8 bg-synthwave-text-muted/10 rounded-md animate-pulse" />
              </div>
              {/* Header row */}
              <div className="flex items-center gap-2 pr-10">
                <span className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse shrink-0" />
                <span className="h-5 bg-synthwave-text-muted/20 animate-pulse w-28 rounded" />
              </div>
              {/* Body lines */}
              <div className="space-y-2">
                <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-full rounded" />
                <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-3/4 rounded" />
                <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-1/2 rounded" />
              </div>
              {/* View details placeholder */}
              <div className="h-4 bg-synthwave-text-muted/10 animate-pulse w-24 rounded mt-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------ Don't render if no data or dismissed ------
  if (source.type === "empty" || isCurrentlyDismissed) return null;

  // ------ Render helpers for each mode ------

  const renderWorkoutInsights = () => {
    const { insights } = source;
    return (
      <>
        <MarkdownRenderer
          content={truncate(insights.performanceComparison)}
          className="font-body text-sm text-synthwave-text-secondary leading-relaxed mb-2"
        />
        {insights.achievements && insights.achievements !== "null" && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/20 rounded-sm">
            <svg
              className="w-3 h-3 text-synthwave-neon-pink"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M5 3h14v2h2v6h-2v2h-2v2h-2v2h-1v4h3v2H7v-2h3v-4H9v-2H7v-2H5v-2H3V5h2V3zm2 2v2h2v4h2v2h2v-2h2V7h2V5H7z" />
            </svg>
            <span className="font-body text-xs text-synthwave-neon-pink">
              {truncate(insights.achievements, 60)}
            </span>
          </div>
        )}
        <MarkdownRenderer
          content={truncate(insights.coachNote, 100)}
          className="font-body text-xs text-synthwave-text-muted mt-2 italic"
        />
      </>
    );
  };

  const renderWeeklyAnalytics = () => {
    const { report } = source;
    const analytics = report?.analyticsData?.structured_analytics;
    const insights = analytics?.actionable_insights;
    const fatigue = analytics?.fatigue_management;
    const quickWins = normalizeListFieldToStringArray(insights?.quick_wins);
    const hasDeloadWarning =
      fatigue?.suggested_action === "deload" ||
      fatigue?.suggested_action === "reduce";

    return (
      <>
        {/* Deload warning banner */}
        {hasDeloadWarning && (
          <div className="mb-3 px-3 py-1.5 bg-synthwave-neon-pink/10 border-l-2 border-synthwave-neon-pink/50">
            <span className="font-body text-xs text-synthwave-neon-pink uppercase tracking-wider">
              Recovery recommended
            </span>
          </div>
        )}

        {/* Top priority insight + quick wins as one block to avoid double gap */}
        <div className="flex flex-col gap-1.5">
          {insights?.top_priority?.insight && (
            <MarkdownRenderer
              content={truncate(insights.top_priority.insight)}
              className="font-body text-sm text-synthwave-text-secondary leading-relaxed"
            />
          )}

          {quickWins.length > 0 && (
            <div>
              {quickWins.slice(0, 2).map((win, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  <span className="text-synthwave-neon-cyan mt-0.5 shrink-0">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </span>
                  <span className="font-body text-xs text-synthwave-text-muted">
                    {truncate(win, 80)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderCombined = () => {
    const { report, workout } = source;
    const insights =
      report?.analyticsData?.structured_analytics?.actionable_insights;

    return (
      <>
        {insights?.top_priority?.insight && (
          <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
            {truncate(stripMarkdown(insights.top_priority.insight), 100)}
          </p>
        )}
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-synthwave-neon-cyan/20 via-synthwave-neon-cyan/10 to-transparent" />
        {workout?.summary && (
          <div>
            <span className="font-header text-xs uppercase tracking-wider text-synthwave-text-muted">
              Session Recap
            </span>
            <p className="font-body text-xs text-synthwave-text-muted mt-1">
              {truncate(stripMarkdown(workout.summary), 100)}
            </p>
          </div>
        )}
      </>
    );
  };

  const renderWorkoutSummary = () => {
    const { workout } = source;
    return (
      <MarkdownRenderer
        content={truncate(workout?.summary)}
        className="font-body text-sm text-synthwave-text-secondary leading-relaxed"
      />
    );
  };

  const renderers = {
    workout_insights: renderWorkoutInsights,
    weekly_analytics: renderWeeklyAnalytics,
    combined: renderCombined,
    workout_summary: renderWorkoutSummary,
  };

  // Section title by source type
  const sectionTitle = {
    workout_insights: "Session Replay",
    weekly_analytics: "Coach's Take",
    combined: "Coach's Take",
    workout_summary: "Session Recap",
  };

  const render = renderers[source.type];
  if (!render) return null;

  return (
    <>
      {/* Own section -- sits above Today's Lineup */}
      <div className="mb-8">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={typographyPatterns.sectionDivider}>
            Training Intel
          </div>
          <div className={typographyPatterns.sectionDividerLine}></div>
        </div>

        {/* Grid -- matches TodaysWorkoutRow so card is same width as workout cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card -- neon glass border wrapper */}
          <div
            className={`${containerPatterns.neonGlassWrapper} group focus:outline-none focus-visible:ring-2 focus-visible:ring-synthwave-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-synthwave-bg-primary`}
            onClick={() => setModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setModalOpen(true);
              }
            }}
          >
            {/* Inner card -- matches neonGlassInner visually but uses
                ManageWorkouts.jsx positioning strategy (no [&>*]:relative)
                so absolute positioning works for the dismiss button */}
            <div className="rounded-md relative bg-synthwave-bg-card p-6 h-full flex flex-col gap-3.5 before:absolute before:inset-0 before:rounded-md before:bg-gradient-to-br before:from-[#7099C8]/[0.08] before:to-transparent before:pointer-events-none before:z-[-1]">
              {/* Dismiss button -- absolute top-right, matches delete button on ManageWorkouts.jsx */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={handleDismiss}
                  className="p-2 rounded-md text-synthwave-neon-cyan/60 hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-200 cursor-pointer"
                  data-tooltip-id="dismiss-insight-tooltip"
                  data-tooltip-content="Dismiss until next insight"
                  aria-label="Dismiss insight"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Card header -- sparkles icon + title */}
              <div className="flex items-center gap-2 pr-10">
                <SparklesIcon className="w-4 h-4 text-synthwave-neon-cyan drop-shadow-[0_0_6px_#00ffff]" />
                <span className="font-header font-bold text-lg text-white uppercase tracking-wider">
                  {sectionTitle[source.type] || "Session Replay"}
                </span>
              </div>

              {render()}

              {/* Click is delegated to the parent card's onClick. */}
              <div className={`${buttonPatterns.secondaryMedium} w-full space-x-2`}>
                <span>View Details</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <InsightsModal
          source={source}
          onClose={() => setModalOpen(false)}
          userId={userId}
          coachId={coachId}
        />
      )}

      {/* Tooltip */}
      <Tooltip
        id="dismiss-insight-tooltip"
        {...tooltipPatterns.standard}
        place="bottom"
      />
    </>
  );
}
