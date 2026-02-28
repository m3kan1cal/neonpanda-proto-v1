import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  containerPatterns,
  badgePatterns,
  listItemPatterns,
} from "../../utils/ui/uiPatterns";
import {
  TrophySolidIcon,
  TrendingUpIconTiny,
  NewBadge,
} from "../themes/SynthwaveComponents";
import { getPrTypeLabel, getPrUnit } from "../../utils/workout/constants";
import { formatRelativeTime } from "../../utils/dateUtils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGINATION_LIMIT = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts an exercise name to Pascal Case (e.g., "back_squat" -> "Back Squat").
 */
function toPascalCase(name) {
  if (!name) return "";
  return name
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Returns badge classes based on significance level.
 */
function getSignificanceBadgeClass(significance) {
  switch (significance) {
    case "major":
      return badgePatterns.pinkBorder;
    case "moderate":
      return badgePatterns.cyanBorder;
    default:
      return badgePatterns.workoutDetail;
  }
}

/**
 * Returns true if the completedAt date is within the past 7 days.
 */
function isWithinPastWeek(completedAt) {
  if (!completedAt) return false;
  try {
    const date = new Date(completedAt);
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - date.getTime() <= sevenDaysMs;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RecentPRsCard({
  prAchievements = [],
  isLoading = false,
  userId,
  coachId,
  unitSystem = "imperial",
}) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

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

  // ------ No PRs ------
  if (prAchievements.length === 0) return null;

  const visiblePrs = showAll
    ? prAchievements
    : prAchievements.slice(0, PAGINATION_LIMIT);

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <span className="text-synthwave-neon-pink shrink-0 mt-1.5">
          <TrophySolidIcon />
        </span>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Recent PRs
        </h3>
      </div>

      {/* PR achievement cards -- 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        {visiblePrs.map((pr, index) => {
          const unit = getPrUnit(pr.prType, unitSystem, pr.unit);
          const relTime = formatRelativeTime(pr.completedAt);
          const isNew = isWithinPastWeek(pr.completedAt);

          return (
            <div
              key={`${pr.workoutId}-${pr.exercise}-${pr.prType}-${index}`}
              onClick={() =>
                navigate(
                  `/training-grounds/workouts?workoutId=${pr.workoutId}&userId=${userId}&coachId=${coachId}`,
                )
              }
              className="relative bg-synthwave-bg-primary/40 border border-synthwave-neon-cyan/15 px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-synthwave-bg-primary/60 hover:border-synthwave-neon-cyan/30 hover:shadow-lg hover:shadow-synthwave-neon-cyan/5 group"
            >
              {isNew && <NewBadge />}

              {/* Exercise name -- small muted uppercase section header */}
              <div className="font-rajdhani text-[11px] text-synthwave-text-secondary uppercase font-semibold tracking-wider truncate mb-0.5">
                {toPascalCase(pr.exercise)}
              </div>

              {/* Hero number with unit */}
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-russo text-2xl text-white leading-none">
                  {pr.newBest}
                </span>
                {unit && (
                  <span className="font-rajdhani text-sm text-synthwave-text-muted font-medium">
                    {unit}
                  </span>
                )}
              </div>

              {/* Badge row: PR type + time + improvement */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`${getSignificanceBadgeClass(pr.significance)} text-[10px] uppercase leading-none py-0.5 px-1.5`}
                >
                  {getPrTypeLabel(pr.prType)}
                </span>
                {relTime && (
                  <span
                    className={`${badgePatterns.workoutDetail} text-[10px] leading-none py-0.5 px-1.5`}
                    title={pr.workoutName || ""}
                  >
                    {relTime}
                  </span>
                )}
                {(pr.improvement != null ||
                  pr.improvementPercentage != null) && (
                  <div className="flex items-center gap-0.5">
                    <span className="text-green-400 shrink-0">
                      <TrendingUpIconTiny className="w-2.5 h-2.5" />
                    </span>
                    {pr.improvement != null && (
                      <span className="font-rajdhani text-[10px] text-green-400 font-semibold leading-none">
                        +{pr.improvement}
                      </span>
                    )}
                    {pr.improvementPercentage != null && (
                      <span className="font-rajdhani text-[10px] text-green-400/70 leading-none">
                        ({pr.improvementPercentage}%)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Hover caret -- slides in from right */}
              <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out pointer-events-none">
                <svg
                  className="w-5 h-5 text-synthwave-neon-pink animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More / Show Less toggle */}
      {prAchievements.length > PAGINATION_LIMIT && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className={`${listItemPatterns.showMoreLink} mt-3`}
        >
          {showAll ? "Show Less" : `Show More (${prAchievements.length})`}
        </button>
      )}
    </div>
  );
}
