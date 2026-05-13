import React, { useState } from "react";
import { containerPatterns } from "../../utils/ui/uiPatterns";
import { LightningIconSmall } from "../themes/SynthwaveComponents";
import CollapsibleSection from "./CollapsibleSection";

/**
 * ProgramInsights — sidebar card that surfaces the AI-generated synthesis of
 * how the athlete is progressing through their training program. Driven by
 * the `programInsights` record from the backend (regenerated after each
 * workout and weekly analytics run).
 *
 * Renders:
 *   - loading skeleton while fetching
 *   - empty state when no synthesis exists yet
 *   - error state on fetch failure (non-blocking — other sections render)
 *   - loaded sub-sections, hiding null/empty fields
 */

const STATUS_PILL = {
  on_track: "border-synthwave-neon-cyan/40 text-synthwave-neon-cyan",
  ahead: "border-synthwave-neon-purple/40 text-synthwave-neon-purple",
  behind: "border-synthwave-neon-pink/40 text-synthwave-neon-pink",
  unclear: "border-synthwave-text-secondary/40 text-synthwave-text-secondary",
};

const STATUS_LABEL = {
  on_track: "On Track",
  ahead: "Ahead",
  behind: "Behind",
  unclear: "Unclear",
};

const formatRelativeTime = (iso) => {
  if (!iso) return "";
  const generated = new Date(iso);
  const now = new Date();
  const diffMs = now - generated;
  if (Number.isNaN(diffMs) || diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return generated.toLocaleDateString();
};

const TextBlock = ({ children }) => (
  <div className={containerPatterns.coachNotesSection}>
    <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
      {children}
    </p>
  </div>
);

export default function ProgramInsights({
  insights,
  isLoading,
  error,
}) {
  // Local "collapsed sub-section" state for the long-form sections.
  const [showAdherence, setShowAdherence] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [showPhase, setShowPhase] = useState(true);
  const [showRisks, setShowRisks] = useState(true);
  const [showExercisePrTrends, setShowExercisePrTrends] = useState(false);
  const [showMemorySignals, setShowMemorySignals] = useState(false);
  const [showLivingProfileShifts, setShowLivingProfileShifts] = useState(false);
  const [showCoachRecommendation, setShowCoachRecommendation] = useState(false);

  // Render container — preserved across all states so the dashboard layout
  // doesn't jump as data resolves.
  const body = (() => {
    if (isLoading) {
      return (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <div className="h-4 w-3/4 rounded bg-synthwave-bg-primary/40 animate-pulse" />
          <div className="h-4 w-full rounded bg-synthwave-bg-primary/40 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-synthwave-bg-primary/40 animate-pulse" />
          <div className="h-20 w-full rounded-xl bg-synthwave-bg-primary/40 animate-pulse" />
        </div>
      );
    }

    if (error) {
      return (
        <div className={containerPatterns.coachNotesSection}>
          <p className="font-body text-sm text-synthwave-neon-pink">
            Couldn't load program insights right now. Other dashboard sections
            are unaffected — try refreshing in a moment.
          </p>
        </div>
      );
    }

    if (!insights) {
      return (
        <div className={containerPatterns.coachNotesSection}>
          <p className="font-body text-sm text-synthwave-text-secondary">
            Insights will appear after your next workout. Each session you log
            (whether from your program, the command palette, or coach chat)
            sharpens this view of how you're tracking against your goals.
          </p>
        </div>
      );
    }

    const {
      adherenceTrend,
      goalProgress = [],
      exercisePrTrends,
      memorySignals,
      livingProfileShifts,
      phaseProgress,
      riskFlags = [],
      coachRecommendation,
      coachNote,
      generatedAt,
    } = insights;

    return (
      <div className="space-y-5">
        {/* Coach note — hero */}
        {coachNote && <TextBlock>{coachNote}</TextBlock>}

        {/* Adherence trend */}
        {adherenceTrend && (
          <div>
            <button
              onClick={() => setShowAdherence((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showAdherence}
            >
              <span>Adherence Trend</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showAdherence ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showAdherence && <TextBlock>{adherenceTrend}</TextBlock>}
          </div>
        )}

        {/* Goal progress */}
        {goalProgress.length > 0 && (
          <div>
            <button
              onClick={() => setShowGoals((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showGoals}
            >
              <span>Goal Progress</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showGoals ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showGoals && (
              <div className={containerPatterns.coachNotesSection}>
                <ul className="space-y-3">
                  {goalProgress.map((g, idx) => (
                    <li key={idx} className="font-body text-sm">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className="text-white font-medium">{g.goal}</span>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${STATUS_PILL[g.status] || STATUS_PILL.unclear}`}
                        >
                          {STATUS_LABEL[g.status] || g.status}
                        </span>
                      </div>
                      <p className="text-synthwave-text-secondary leading-relaxed">
                        {g.evidence}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Phase progress */}
        {phaseProgress?.currentPhase && (
          <div>
            <button
              onClick={() => setShowPhase((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showPhase}
            >
              <span>Phase Progress</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showPhase ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showPhase && (
              <div className={containerPatterns.coachNotesSection}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-white font-medium font-body text-sm">
                    {phaseProgress.currentPhase}
                  </span>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${phaseProgress.onPace ? STATUS_PILL.on_track : STATUS_PILL.behind}`}
                  >
                    {phaseProgress.onPace ? "On Pace" : "Off Pace"}
                  </span>
                </div>
                {phaseProgress.notes && (
                  <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
                    {phaseProgress.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Risk flags */}
        {riskFlags.length > 0 && (
          <div>
            <button
              onClick={() => setShowRisks((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showRisks}
            >
              <span>Watch-outs</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showRisks ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showRisks && (
              <div className={containerPatterns.coachNotesSection}>
                <ul className="space-y-4">
                  {riskFlags.map((r, idx) => (
                    <li key={idx} className="font-body text-sm">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full border ${STATUS_PILL.behind} mb-2`}
                      >
                        {r.type.replace(/_/g, " ")}
                      </span>
                      <p className="text-synthwave-text-secondary leading-relaxed">
                        {r.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Exercise & PR trends */}
        {exercisePrTrends && (
          <div>
            <button
              onClick={() => setShowExercisePrTrends((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showExercisePrTrends}
            >
              <span>Exercise &amp; PR Trends</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showExercisePrTrends ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showExercisePrTrends && <TextBlock>{exercisePrTrends}</TextBlock>}
          </div>
        )}

        {/* Memory signals */}
        {memorySignals && (
          <div>
            <button
              onClick={() => setShowMemorySignals((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showMemorySignals}
            >
              <span>Memory Signals</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showMemorySignals ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showMemorySignals && <TextBlock>{memorySignals}</TextBlock>}
          </div>
        )}

        {/* Living profile shifts */}
        {livingProfileShifts && (
          <div>
            <button
              onClick={() => setShowLivingProfileShifts((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showLivingProfileShifts}
            >
              <span>Living Profile Shifts</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showLivingProfileShifts ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showLivingProfileShifts && (
              <TextBlock>{livingProfileShifts}</TextBlock>
            )}
          </div>
        )}

        {/* Coach recommendation */}
        {coachRecommendation && (
          <div>
            <button
              onClick={() => setShowCoachRecommendation((v) => !v)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
              aria-expanded={showCoachRecommendation}
            >
              <span>Coach Recommendation</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showCoachRecommendation ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showCoachRecommendation && (
              <TextBlock>{coachRecommendation}</TextBlock>
            )}
          </div>
        )}

        {/* Footer: generation metadata */}
        {generatedAt && (
          <div className="font-body text-xs text-synthwave-text-secondary/70 text-right">
            Updated {formatRelativeTime(generatedAt)}
          </div>
        )}
      </div>
    );
  })();

  return (
    <CollapsibleSection
      title="Program Insights"
      icon={LightningIconSmall}
      iconColor="purple"
    >
      {body}
    </CollapsibleSection>
  );
}
