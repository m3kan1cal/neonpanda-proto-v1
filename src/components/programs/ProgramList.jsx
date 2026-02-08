import React from "react";
import { useNavigate } from "react-router-dom";
import { badgePatterns, listItemPatterns } from "../../utils/ui/uiPatterns";
import { ChevronRightIcon } from "../themes/SynthwaveComponents";

/**
 * ProgressRing - Small SVG donut ring showing completion percentage
 * Uses cyan-to-purple gradient fill on the completed arc.
 */
function ProgressRing({ percentage = 0, size = 40, strokeWidth = 3.5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0 -rotate-90"
    >
      <defs>
        <linearGradient
          id={`progress-grad-${percentage}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stopColor="var(--color-synthwave-neon-cyan, #00ffff)"
          />
          <stop
            offset="100%"
            stopColor="var(--color-synthwave-neon-purple, #9F00FF)"
          />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-synthwave-bg-primary/50"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#progress-grad-${percentage})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white font-rajdhani text-[9px] font-bold rotate-90"
        style={{ transformOrigin: "center" }}
      >
        {percentage}%
      </text>
    </svg>
  );
}

/**
 * ProgramList - Stacked program cards with distinct visual treatment
 *
 * Each card has a left accent border, gradient background, progress ring,
 * and program details -- visually distinct from the standard list rows
 * used by conversations, workouts, and reports.
 *
 * @param {Object} props
 * @param {Array} props.programs - Array of program objects
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.userId
 * @param {string} props.coachId
 * @param {number} [props.maxItems] - Max items to show before "Show More" (default: show all)
 * @param {boolean} [props.showAll] - Whether all items are currently expanded
 * @param {Function} [props.onToggleShowAll] - Callback to toggle show all
 */
function ProgramList({
  programs = [],
  isLoading,
  userId,
  coachId,
  maxItems,
  showAll,
  onToggleShowAll,
}) {
  const navigate = useNavigate();

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="border-l-2 border-synthwave-text-muted/20 bg-synthwave-bg-primary/20 rounded-lg p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-synthwave-text-muted/20 animate-pulse flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
              <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!programs || programs.length === 0) {
    return (
      <div className="text-center pb-2">
        <div className="max-w-xs mx-auto">
          <p className="font-rajdhani text-sm text-synthwave-text-muted mb-4 text-left">
            No active programs yet. Design a structured training program with
            your coach to start building toward your goals.
          </p>
          <div className="space-y-2 text-left">
            <div className="flex items-start gap-2">
              <span className={badgePatterns.numberedCircle}>
                <span className={badgePatterns.numberedCircleText}>1</span>
              </span>
              <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                Click "Design Program" above or use ⌘+K → /design-program
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className={badgePatterns.numberedCircle}>
                <span className={badgePatterns.numberedCircleText}>2</span>
              </span>
              <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                Answer a few questions and your coach will build a custom
                program
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className={badgePatterns.numberedCircle}>
                <span className={badgePatterns.numberedCircleText}>3</span>
              </span>
              <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                Active programs and today's workouts will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const visiblePrograms =
    maxItems && !showAll ? programs.slice(0, maxItems) : programs;
  const hasMore = maxItems && programs.length > maxItems;

  return (
    <div className="space-y-3">
      {visiblePrograms.map((program) => {
        const currentDay = program.currentDay || 1;
        const progressPercentage =
          program.totalDays > 0
            ? Math.round((currentDay / program.totalDays) * 100)
            : 0;
        const completedWorkouts = program.completedWorkouts || 0;
        const totalWorkouts = program.totalWorkouts || program.totalDays;
        const isActive = program.status === "active";
        const isPaused = program.status === "paused";

        return (
          <div
            key={program.programId}
            onClick={() =>
              navigate(
                `/training-grounds/programs/dashboard?userId=${userId}&coachId=${coachId}&programId=${program.programId}`,
              )
            }
            className={
              isActive
                ? listItemPatterns.rowCyan
                : `group border-l-2 border-l-synthwave-text-muted/40 bg-gradient-to-r from-synthwave-text-muted/5 to-transparent rounded-lg p-4 cursor-pointer transition-all duration-200 hover:from-synthwave-neon-cyan/10 hover:shadow-md hover:shadow-synthwave-neon-cyan/5`
            }
          >
            <div className="flex items-center gap-4">
              {/* Progress ring */}
              <ProgressRing percentage={progressPercentage} />

              {/* Program details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-rajdhani text-sm text-white font-semibold truncate">
                    {program.name}
                  </div>
                  {isPaused && (
                    <span className="px-1.5 py-0.5 bg-synthwave-text-muted/20 text-synthwave-text-muted rounded text-[10px] font-rajdhani uppercase tracking-wider">
                      Paused
                    </span>
                  )}
                </div>
                <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-0.5">
                  Day {currentDay} of {program.totalDays} &middot;{" "}
                  <span className="text-synthwave-neon-cyan">
                    {completedWorkouts}/{totalWorkouts} workouts
                  </span>
                </div>
              </div>

              {/* Navigation chevron */}
              <div className={listItemPatterns.chevronCyan}>
                <ChevronRightIcon />
              </div>
            </div>
          </div>
        );
      })}
      {hasMore && onToggleShowAll && (
        <button
          onClick={onToggleShowAll}
          className={listItemPatterns.showMoreLink}
        >
          {showAll ? "Show Less" : `Show More (${programs.length})`}
        </button>
      )}
    </div>
  );
}

export default ProgramList;
