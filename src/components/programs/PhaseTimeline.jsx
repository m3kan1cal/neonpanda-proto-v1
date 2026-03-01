import React, { useState } from "react";
import {
  containerPatterns,
  badgePatterns,
  messagePatterns,
} from "../../utils/ui/uiPatterns";

export default function PhaseTimeline({ program }) {
  const [expandedPhases, setExpandedPhases] = useState({});
  const totalDays = program.totalDays || program.duration || 1;

  const togglePhase = (phaseId) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  if (!program.phases || program.phases.length === 0) {
    return null;
  }

  // Calculate visual width for each phase segment
  const getPhaseWidth = (phase) => {
    const phaseDays = phase.endDay - phase.startDay + 1;
    return (phaseDays / totalDays) * 100;
  };

  // Determine if phase is current, completed, or upcoming
  const getPhaseStatus = (phase) => {
    if (program.currentDay < phase.startDay) {
      return "upcoming";
    } else if (program.currentDay > phase.endDay) {
      return "completed";
    } else {
      return "current";
    }
  };

  // Get phase color (rotating through 3 colors)
  const getPhaseColor = (index) => {
    const colors = [
      {
        bg: "bg-synthwave-neon-pink/20",
        border: "border-synthwave-neon-pink/40",
        text: "text-synthwave-neon-pink",
        progress: "bg-synthwave-neon-pink",
      },
      {
        bg: "bg-synthwave-neon-cyan/20",
        border: "border-synthwave-neon-cyan/40",
        text: "text-synthwave-neon-cyan",
        progress: "bg-synthwave-neon-cyan",
      },
      {
        bg: "bg-synthwave-neon-purple/20",
        border: "border-synthwave-neon-purple/40",
        text: "text-synthwave-neon-purple",
        progress: "bg-synthwave-neon-purple",
      },
    ];

    return colors[index % colors.length];
  };

  // Calculate progress within current phase
  const getCurrentPhaseProgress = (phase) => {
    if (program.currentDay < phase.startDay) {
      return 0;
    } else if (program.currentDay > phase.endDay) {
      return 100;
    } else {
      const daysIntoPhase = program.currentDay - phase.startDay + 1;
      const phaseDays = phase.endDay - phase.startDay + 1;
      return (daysIntoPhase / phaseDays) * 100;
    }
  };

  // Format phase name for timeline display (show "Phase X" or first 10 chars)
  const getTimelinePhaseName = (phaseName, index) => {
    if (!phaseName) {
      return `Phase ${index + 1}`;
    }

    // Check if name matches "Phase X" pattern (case-insensitive)
    const phaseMatch = phaseName.match(/^phase\s+(\d+)/i);
    if (phaseMatch) {
      return `Phase ${phaseMatch[1]}`;
    }

    // Otherwise, truncate to first 10 characters
    return phaseName.length > 10 ? phaseName.substring(0, 10) : phaseName;
  };

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Section Header */}
      <div className="flex items-start space-x-3 mb-6">
        <div
          className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotCyan} shrink-0 mt-2`}
        ></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Phase Timeline
        </h3>
      </div>

      {/* Phase Timeline */}
      <div className="mb-4">
        {/* Phase names as headers above timeline */}
        <div className="flex mb-3">
          {program.phases.map((phase, index) => {
            const width = getPhaseWidth(phase);
            const status = getPhaseStatus(phase);
            const colors = getPhaseColor(index);

            return (
              <div
                key={`header-${phase.phaseId || index}`}
                style={{ width: `${width}%` }}
                className="px-2"
              >
                <div className="font-rajdhani font-bold text-sm uppercase tracking-wide text-synthwave-text-secondary">
                  {getTimelinePhaseName(phase.name, index)}
                </div>
                <div className="text-xs text-synthwave-text-muted font-rajdhani mt-0.5">
                  Days {phase.startDay}-{phase.endDay}
                </div>
              </div>
            );
          })}
        </div>

        {/* Visual progress bar - wrapper for positioning current day badge */}
        <div className="relative">
          <div className="relative h-12 bg-synthwave-bg-secondary overflow-hidden flex shadow-lg">
            {program.phases.map((phase, index) => {
              const width = getPhaseWidth(phase);
              const status = getPhaseStatus(phase);
              const colors = getPhaseColor(index);
              const progress = getCurrentPhaseProgress(phase);

              return (
                <div
                  key={phase.phaseId || index}
                  className={`
                    relative border-r border-synthwave-bg-primary/50 last:border-r-0 first:rounded-l-lg last:rounded-r-lg
                    ${colors.bg}
                  `}
                  style={{ width: `${width}%` }}
                >
                  {/* Progress fill for current phase */}
                  {status === "current" && (
                    <div
                      className={`absolute inset-0 ${colors.progress} opacity-50 transition-all duration-300`}
                      style={{ width: `${progress}%` }}
                    />
                  )}

                  {/* Completed phase fill */}
                  {status === "completed" && (
                    <div
                      className={`absolute inset-0 ${colors.progress} opacity-40`}
                    />
                  )}

                  {/* Current day indicator */}
                  {status === "current" && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-synthwave-neon-pink"
                      style={{ left: `${progress}%` }}
                    >
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-synthwave-neon-pink rounded-full animate-pulse" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-synthwave-neon-pink rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current day badge - positioned outside overflow container */}
          {program.phases.map((phase, index) => {
            const width = getPhaseWidth(phase);
            const status = getPhaseStatus(phase);
            const progress = getCurrentPhaseProgress(phase);

            if (status !== "current") return null;

            // Calculate cumulative width up to this phase
            const cumulativeWidth = program.phases
              .slice(0, index)
              .reduce((sum, p) => sum + getPhaseWidth(p), 0);

            // Calculate exact position within the timeline
            const exactPosition = cumulativeWidth + (width * progress) / 100;

            return (
              <div
                key={`badge-${phase.phaseId || index}`}
                className="absolute top-full mt-1 -translate-x-1/2 whitespace-nowrap z-10"
                style={{ left: `${exactPosition}%` }}
              >
                <span
                  className={`${badgePatterns.pink} text-xs font-bold uppercase`}
                >
                  Day {program.currentDay}
                </span>
              </div>
            );
          })}
        </div>

        {/* Day markers */}
        <div className="flex justify-between mt-2 px-1 font-rajdhani">
          <span className="text-xs text-synthwave-text-muted">Day 1</span>
          <span className="text-xs text-synthwave-text-muted">
            Day {totalDays}
          </span>
        </div>
      </div>

      {/* Phase cards */}
      <div className="space-y-3 mt-4">
        {program.phases.map((phase, index) => {
          const status = getPhaseStatus(phase);
          const colors = getPhaseColor(index);
          const phaseDays = phase.endDay - phase.startDay + 1;
          const phaseKey = phase.phaseId || `phase-${index}`;
          const isExpanded = expandedPhases[phaseKey];

          return (
            <div
              key={phaseKey}
              className={`${containerPatterns.coachNotesSection} font-rajdhani`}
            >
              <button
                onClick={() => togglePhase(phaseKey)}
                className="w-full flex items-start justify-between mb-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base text-white">
                      {phase.name || `Phase ${index + 1}`}
                    </h3>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 text-synthwave-text-secondary ${
                        isExpanded ? "rotate-180" : ""
                      }`}
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
                  </div>
                  <p className="text-xs mt-1">
                    <span className="text-synthwave-text-secondary">
                      Duration:{" "}
                    </span>
                    <span className="text-synthwave-neon-cyan">
                      Days {phase.startDay}-{phase.endDay} • {phaseDays} days
                    </span>
                  </p>
                </div>

                <div className="shrink-0">
                  {status === "current" && (
                    <span className={`${badgePatterns.pinkBorder} uppercase`}>
                      Current
                    </span>
                  )}
                  {status === "completed" && (
                    <span className={`${badgePatterns.cyanBorder} uppercase`}>
                      ✓ Complete
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="animate-fadeIn">
                  {phase.description && (
                    <p className="text-sm text-synthwave-text-secondary mb-2">
                      {phase.description}
                    </p>
                  )}

                  {/* Focus areas */}
                  {phase.focusAreas && phase.focusAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {phase.focusAreas.map((area, idx) => (
                        <span key={idx} className={badgePatterns.workoutDetail}>
                          {area.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
