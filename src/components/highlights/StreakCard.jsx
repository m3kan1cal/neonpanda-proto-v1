import React from "react";
import { containerPatterns } from "../../utils/ui/uiPatterns";
import { FireIconSmall } from "../themes/SynthwaveComponents";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const WEEKLY_TARGET = 5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * StreakCard -- displays the user's current workout streak and weekly progress.
 *
 * @param {Object} props
 * @param {number} props.currentStreak - Consecutive days with a logged workout
 * @param {number} props.bestStreak - Longest consecutive day streak in history
 * @param {number} props.thisWeekWorkoutCount - Workouts completed this week (Mon-Sun)
 * @param {number} props.lastWorkoutDaysAgo - Days since most recent workout
 * @param {boolean} props.isLoading - Show skeleton while loading
 */
export default function StreakCard({
  currentStreak = 0,
  bestStreak = 0,
  thisWeekWorkoutCount = 0,
  lastWorkoutDaysAgo = 0,
  isLoading = false,
}) {
  // ------ Loading skeleton ------
  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-full animate-pulse flex-shrink-0 mt-1" />
          <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-32" />
        </div>
        <div className="h-16 bg-synthwave-text-muted/10 rounded-xl animate-pulse" />
      </div>
    );
  }

  const weeklyPercent = Math.min(
    100,
    Math.round((thisWeekWorkoutCount / WEEKLY_TARGET) * 100),
  );
  const streakActive = currentStreak > 0;

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <span
          className={`flex-shrink-0 mt-1.5 ${streakActive ? "text-synthwave-neon-pink" : "text-synthwave-text-muted"}`}
        >
          <FireIconSmall />
        </span>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Streak
        </h3>
      </div>

      {/* Streak numbers: current and best */}
      <div className="flex items-baseline gap-6 mb-4">
        <div className="flex items-baseline gap-2">
          <span
            className={`font-russo text-4xl leading-none ${streakActive ? "text-synthwave-neon-pink" : "text-synthwave-text-muted"}`}
          >
            {currentStreak}
          </span>
          <span className="font-rajdhani text-sm text-synthwave-text-secondary font-medium">
            {currentStreak === 1 ? "day" : "days"}
          </span>
        </div>
        {bestStreak > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="font-rajdhani text-xs text-synthwave-text-muted uppercase tracking-wider">
              Best:
            </span>
            <span className="font-russo text-4xl text-synthwave-neon-cyan leading-none">
              {bestStreak}
            </span>
            <span className="font-rajdhani text-sm text-synthwave-text-secondary font-medium">
              {bestStreak === 1 ? "day" : "days"}
            </span>
          </div>
        )}
      </div>

      {/* Weekly progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider">
            This Week
          </span>
          <span className="font-rajdhani text-xs text-synthwave-text-muted">
            {thisWeekWorkoutCount}/{WEEKLY_TARGET}
          </span>
        </div>
        <div className="h-2 bg-synthwave-bg-primary/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-synthwave-neon-pink to-synthwave-neon-purple transition-all duration-500"
            style={{ width: `${weeklyPercent}%` }}
          />
        </div>
      </div>

      {/* Nudge / motivation line */}
      <p className="font-rajdhani text-xs text-synthwave-text-muted">
        {streakActive && lastWorkoutDaysAgo === 0
          ? "You trained today. Keep it going."
          : streakActive && lastWorkoutDaysAgo === 1
            ? "Don't break the streak -- log today's workout."
            : "Log a workout to start a new streak."}
      </p>
    </div>
  );
}
