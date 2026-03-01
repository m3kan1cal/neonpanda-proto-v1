import React from "react";
import {
  containerPatterns,
  badgePatterns,
  listItemPatterns,
} from "../../utils/ui/uiPatterns";
import { WeightPlateIconTiny } from "../themes/SynthwaveComponents";
import { formatRelativeTime } from "../../utils/dateUtils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DISPLAY_LIMIT = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TopExercisesCard -- displays the user's most-performed exercises,
 * celebrating consistency alongside PRs that celebrate peaks.
 *
 * @param {Object} props
 * @param {Array} props.exercises - Exercise name entries from ExerciseAgent
 * @param {boolean} props.isLoading - Show skeleton while loading
 */
export default function TopExercisesCard({
  exercises = [],
  isLoading = false,
}) {
  // ------ Loading skeleton ------
  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-full animate-pulse shrink-0 mt-1" />
          <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-synthwave-bg-primary/30 border border-synthwave-text-muted/10 p-3"
            >
              <div className="h-2.5 bg-synthwave-text-muted/20 animate-pulse w-2/3 mb-2" />
              <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-1/2 mb-2" />
              <div className="h-2.5 bg-synthwave-text-muted/20 animate-pulse w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ------ No data ------
  if (exercises.length === 0) return null;

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <span className="text-synthwave-neon-cyan shrink-0 mt-1.5">
          <WeightPlateIconTiny className="w-5 h-5" />
        </span>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Top Exercises
        </h3>
      </div>

      {/* Exercise list -- 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        {exercises.slice(0, DISPLAY_LIMIT).map((ex) => (
          <div
            key={ex.exerciseName}
            className="bg-synthwave-bg-primary/40 border border-synthwave-neon-cyan/15 px-3 py-2 transition-all duration-200 hover:bg-synthwave-bg-primary/60 hover:border-synthwave-neon-cyan/30 hover:shadow-lg hover:shadow-synthwave-neon-cyan/5"
          >
            {/* Exercise name -- small muted uppercase section header */}
            <div className="font-rajdhani text-[11px] text-synthwave-text-secondary uppercase font-semibold tracking-wider truncate mb-0.5">
              {ex.displayName}
            </div>

            {/* Count hero number with label */}
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="font-russo text-2xl text-white leading-none">
                {ex.count}
              </span>
              <span className="font-rajdhani text-sm text-synthwave-text-muted font-medium">
                workouts
              </span>
            </div>

            {/* Time badge and discipline tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {formatRelativeTime(ex.lastPerformed) && (
                <span
                  className={`${badgePatterns.workoutDetail} text-[10px] leading-none py-0.5 px-1.5`}
                >
                  {formatRelativeTime(ex.lastPerformed)}
                </span>
              )}
              {ex.disciplines?.length > 0 &&
                ex.disciplines.map((d) => (
                  <span
                    key={d}
                    className={`${badgePatterns.cyanBorder} text-[10px] uppercase leading-none py-0.5 px-1.5`}
                  >
                    {d}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
