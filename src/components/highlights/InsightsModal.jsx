import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";
import { CloseIcon } from "../themes/SynthwaveComponents";
import { SparklesIcon } from "./icons";

// ---------------------------------------------------------------------------
// Icons (inline SVG -- matches synthwave icon patterns)
// ---------------------------------------------------------------------------

function TrendUpIcon() {
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
        d="M2 20l7.5-7.5L14 17l8-10"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7h5v5" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 3h14v2h2v6h-2v2h-2v2h-2v2h-1v4h3v2H7v-2h3v-4H9v-2H7v-2H5v-2H3V5h2V3zm2 2v2h2v4h2v2h2v-2h2V7h2V5H7z" />
    </svg>
  );
}

function HeartPulseIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M2 9h3l2-4 3 8 2-4h10v2h-9l-2 4-3-8-2 4H2V9z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v4h2v2h6v-2h2v-4c1-1 2-3 2-5 0-4-3-7-7-7zm-1 16h2v-1h-2v1zm3-4h-1v-2h-2v2H9v-1l-1-1c-1-1-2-2.5-2-4 0-3 2.5-5.5 6-5.5S18 6 18 9c0 1.5-1 3-2 4l-1 1v1z" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3v2h-1v2H9v2H7v2H5v4h4v-2h2v-2h2v2h2v2h4v-4h-2V9h-2V7h-2V5h-1V3z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Insight Section -- reusable row for each insight field
// ---------------------------------------------------------------------------

function InsightSection({ icon, label, text, accentColor = "cyan" }) {
  if (!text) return null;

  const colorMap = {
    cyan: "text-synthwave-neon-cyan",
    pink: "text-synthwave-neon-pink",
    purple: "text-synthwave-neon-purple",
    yellow: "text-yellow-400",
  };

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={colorMap[accentColor] || colorMap.cyan}>{icon}</span>
        <span className="font-header text-xs uppercase tracking-wider text-synthwave-text-secondary">
          {label}
        </span>
      </div>
      <MarkdownRenderer
        content={text}
        className="font-body text-sm text-synthwave-text-primary leading-relaxed pl-6"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Win Pill
// ---------------------------------------------------------------------------

function QuickWinPill({ text }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-synthwave-neon-cyan mt-0.5 shrink-0">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </span>
      <span className="font-body text-sm text-synthwave-text-secondary">
        {text}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * InsightsModal -- full-screen overlay showing expanded insight details.
 *
 * @param {Object} props
 * @param {Object} props.source - The source object from selectBriefingSource()
 * @param {Function} props.onClose - Close handler
 */
export default function InsightsModal({ source, onClose, userId, coachId }) {
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!source || source.type === "empty") return null;

  // ---- Workout Insights content ----
  const renderWorkoutInsights = () => {
    const { insights, workout } = source;
    return (
      <>
        <ModalHeader
          title="Session Replay"
          subtitle={
            workout?.workoutName ||
            workout?.workoutData?.workout_name ||
            "Recent Session"
          }
          accentColor="cyan"
        />

        <div>
          <InsightSection
            icon={<TrendUpIcon />}
            label="Performance"
            text={insights.performanceComparison}
            accentColor="cyan"
          />
          <InsightSection
            icon={<TrophyIcon />}
            label="Achievements"
            text={insights.achievements}
            accentColor="pink"
          />
          <InsightSection
            icon={<ScaleIcon />}
            label="Template Adherence"
            text={insights.scalingAnalysis}
            accentColor="purple"
          />
          <InsightSection
            icon={<HeartPulseIcon />}
            label="Recovery Impact"
            text={insights.recoveryImpact}
            accentColor="yellow"
          />
          <InsightSection
            icon={<BrainIcon />}
            label="Coach's Note"
            text={insights.coachNote}
            accentColor="cyan"
          />
        </div>

        <ModalFooter
          label="View Workout"
          onClick={() => {
            onClose();
            navigate(
              `/training-grounds/workouts?userId=${userId}&coachId=${coachId}${workout?.workoutId ? `&workoutId=${workout.workoutId}` : ""}`,
            );
          }}
        />
      </>
    );
  };

  // ---- Weekly Analytics content ----
  const renderWeeklyAnalytics = () => {
    const { report } = source;
    const analytics = report?.analyticsData?.structured_analytics;
    const insights = analytics?.actionable_insights;
    const fatigue = analytics?.fatigue_management;

    return (
      <>
        <ModalHeader
          title="Weekly Insights"
          subtitle={`Week of ${formatDateRange(report?.weekStart, report?.weekEnd)}`}
          accentColor="purple"
        />

        {/* Top Priority */}
        {insights?.top_priority && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-synthwave-neon-purple">
                <BrainIcon />
              </span>
              <span className="font-header text-xs uppercase tracking-wider text-synthwave-text-secondary">
                Top Priority
              </span>
            </div>
            <MarkdownRenderer
              content={insights.top_priority.insight}
              className="font-body text-sm text-synthwave-text-primary leading-relaxed pl-6 mb-2"
            />
            {insights.top_priority.recommended_action && (
              <MarkdownRenderer
                content={`Action: ${insights.top_priority.recommended_action}`}
                className="font-body text-xs text-synthwave-neon-cyan/80 pl-6"
              />
            )}
          </div>
        )}

        {/* Quick Wins */}
        {insights?.quick_wins?.length > 0 && (
          <div className="mb-5">
            <span className="font-header text-xs uppercase tracking-wider text-synthwave-text-secondary">
              Quick Wins
            </span>
            <div className="mt-1.5 pl-4">
              {insights.quick_wins.map((win, i) => (
                <QuickWinPill key={i} text={win} />
              ))}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {insights?.red_flags?.length > 0 && (
          <div className="mb-5 border-l-2 border-synthwave-neon-pink/40 pl-4">
            <span className="font-header text-xs uppercase tracking-wider text-synthwave-neon-pink">
              Flags
            </span>
            <div className="mt-1.5">
              {insights.red_flags.map((flag, i) => (
                <p
                  key={i}
                  className="font-body text-sm text-synthwave-text-secondary mb-1"
                >
                  {flag}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Fatigue / Recovery */}
        {fatigue?.suggested_action && (
          <InsightSection
            icon={<HeartPulseIcon />}
            label={`Recovery — ${fatigue.suggested_action}`}
            text={
              fatigue.recovery_score
                ? `Recovery score: ${fatigue.recovery_score}/10`
                : null
            }
            accentColor="yellow"
          />
        )}

        <ModalFooter
          label="View Full Report"
          onClick={() => {
            onClose();
            navigate(
              `/training-grounds/reports/weekly?userId=${userId}&coachId=${coachId}&weekId=${report?.weekId}`,
            );
          }}
        />
      </>
    );
  };

  // ---- Combined content ----
  const renderCombined = () => {
    const { report, workout } = source;
    const insights =
      report?.analyticsData?.structured_analytics?.actionable_insights;

    return (
      <>
        <ModalHeader
          title="Coach Briefing"
          subtitle="Weekly insights + recent session"
          accentColor="purple"
        />

        {/* Weekly headline */}
        {insights?.top_priority && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-synthwave-neon-purple">
                <BrainIcon />
              </span>
              <span className="font-header text-xs uppercase tracking-wider text-synthwave-text-secondary">
                This Week's Focus
              </span>
            </div>
            <MarkdownRenderer
              content={insights.top_priority.insight}
              className="font-body text-sm text-synthwave-text-primary leading-relaxed pl-6"
            />
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-synthwave-neon-cyan/20 via-synthwave-neon-cyan/10 to-transparent my-4" />

        {/* Workout summary */}
        {workout?.summary && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-synthwave-neon-cyan">
                <TrendUpIcon />
              </span>
              <span className="font-header text-xs uppercase tracking-wider text-synthwave-text-secondary">
                Last Session
              </span>
            </div>
            <MarkdownRenderer
              content={workout.summary}
              className="font-body text-sm text-synthwave-text-secondary leading-relaxed pl-6"
            />
          </div>
        )}

        <ModalFooter
          label="View Full Report"
          onClick={() => {
            onClose();
            navigate(
              `/training-grounds/reports/weekly?userId=${userId}&coachId=${coachId}&weekId=${report?.weekId}`,
            );
          }}
        />
      </>
    );
  };

  // ---- Workout Summary content ----
  const renderWorkoutSummary = () => {
    const { workout } = source;
    return (
      <>
        <ModalHeader
          title="Session Recap"
          subtitle={
            workout?.workoutName ||
            workout?.workoutData?.workout_name ||
            "Recent Workout"
          }
          accentColor="cyan"
        />

        <div>
          <MarkdownRenderer
            content={workout?.summary}
            className="font-body text-sm text-synthwave-text-primary leading-relaxed"
          />
        </div>

        <ModalFooter
          label="View Workout"
          onClick={() => {
            onClose();
            navigate(
              `/training-grounds/workouts?userId=${userId}&coachId=${coachId}${workout?.workoutId ? `&workoutId=${workout.workoutId}` : ""}`,
            );
          }}
        />
      </>
    );
  };

  // ---- Render based on source type ----
  const contentRenderers = {
    workout_insights: renderWorkoutInsights,
    weekly_analytics: renderWeeklyAnalytics,
    combined: renderCombined,
    workout_summary: renderWorkoutSummary,
  };

  const renderContent = contentRenderers[source.type];
  if (!renderContent) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 p-4 flex items-center justify-center animate-fade-in"
        onClick={onClose}
      >
        <div
          className={`${containerPatterns.successModal} p-6 relative w-full max-w-lg max-h-[85vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors cursor-pointer"
            aria-label="Close"
          >
            <CloseIcon />
          </button>

          {renderContent()}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModalHeader({ title, subtitle, accentColor = "cyan" }) {
  const accentMap = {
    cyan: "border-synthwave-neon-cyan/20",
    purple: "border-synthwave-neon-purple/20",
    pink: "border-synthwave-neon-pink/20",
  };

  return (
    <div
      className={`pb-4 mb-4 border-b ${accentMap[accentColor] || accentMap.cyan}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-synthwave-neon-cyan drop-shadow-[0_0_6px_#00ffff]">
          <SparklesIcon className="w-5 h-5" />
        </span>
        <h3 className={typographyPatterns.cardTitle}>{title}</h3>
      </div>
      {subtitle && (
        <p className="font-body text-sm font-semibold text-synthwave-neon-cyan mt-1 pl-7">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ModalFooter({ label, onClick }) {
  return (
    <div className="mt-6 pt-4 border-t border-synthwave-neon-cyan/10">
      <button
        onClick={onClick}
        className={`${buttonPatterns.secondaryMedium} w-full`}
      >
        {label}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDateRange(start, end) {
  if (!start || !end) return "";
  const fmt = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
