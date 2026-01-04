import React from "react";
import { badgePatterns } from "../../utils/ui/uiPatterns";

export const BadgeLegend = () => {
  return (
    <div className="px-6 pb-4 pt-2">
      <div className="flex flex-wrap items-center gap-2 text-xs font-rajdhani text-synthwave-text-secondary">
        <span className="font-semibold uppercase whitespace-nowrap">Badge Legend:</span>
        <span
          className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgePink}`}
        >
          Main Work
        </span>
        <span
          className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgeCyan}`}
        >
          Accessory
        </span>
        <span
          className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgePurple}`}
        >
          Warmup/Technique
        </span>
      </div>
    </div>
  );
};
