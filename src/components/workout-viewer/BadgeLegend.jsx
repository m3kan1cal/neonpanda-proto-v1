import React from "react";
import { badgePatterns } from "../../utils/ui/uiPatterns";

export const BadgeLegend = () => {
  return (
    <div className="px-6 pb-4 pt-2">
      <div className="flex items-center gap-4 text-xs font-rajdhani text-synthwave-text-secondary">
        <span className="font-semibold uppercase">Badge Colors:</span>
        <div className="flex items-center gap-1">
          <span
            className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgePink}`}
          >
            Pink
          </span>
          <span>= Main Work</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgeCyan}`}
          >
            Cyan
          </span>
          <span>= Accessory</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgePurple}`}
          >
            Purple
          </span>
          <span>= Warmup/Technique</span>
        </div>
      </div>
    </div>
  );
};
