import React from "react";
import {
  avatarPatterns,
  badgePatterns,
  compactCardPatterns,
} from "../../utils/ui/uiPatterns";
import CompactCoachCard from "./CompactCoachCard";

const getFirstChar = (name) => {
  if (!name) return "C";
  return name.charAt(0).toUpperCase();
};

/**
 * PageHeader - Shared header for authenticated management/detail pages.
 *
 * Layout (single row across breakpoints so rightSlot mounts exactly once):
 *   Mobile (<sm)  : [title] [rightSlot] [compact avatar circle]
 *   sm: and up    : [title] [CompactCoachCard pill] [rightSlot]
 */
const PageHeader = ({
  title,
  titleTooltipId,
  titleTooltipContent,
  beta = false,
  betaTooltipId,
  betaTooltipContent,
  coachData,
  coachOnline = true,
  coachTooltipContent = "Go to the Training Grounds",
  onCoachClick,
  rightSlot,
  className = "",
}) => {
  const titleTooltipProps = titleTooltipId
    ? {
        "data-tooltip-id": titleTooltipId,
        "data-tooltip-content": titleTooltipContent,
      }
    : {};

  const betaTooltipProps = betaTooltipId
    ? {
        "data-tooltip-id": betaTooltipId,
        "data-tooltip-content": betaTooltipContent,
      }
    : {};

  return (
    <header
      className={`flex items-center gap-2 sm:gap-4 mb-4 sm:mb-5 md:mb-6 ${className}`}
      aria-label={`${title} Header`}
    >
      {/* Title + Beta */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <h1
          className={`font-header font-bold text-xl sm:text-2xl md:text-3xl text-gradient-neon uppercase tracking-wider truncate ${
            titleTooltipId ? "cursor-help" : ""
          }`}
          {...titleTooltipProps}
        >
          {title}
        </h1>

        {beta && (
          <span
            className={`${badgePatterns.betaSmall} text-[10px] sm:text-xs shrink-0 ${
              betaTooltipId ? "cursor-help" : ""
            }`}
            {...betaTooltipProps}
          >
            Beta
          </span>
        )}
      </div>

      {/* Desktop-only coach pill (next to title) */}
      {coachData && (
        <div className="hidden sm:block shrink-0">
          <CompactCoachCard
            coachData={coachData}
            isOnline={coachOnline}
            onClick={onCoachClick}
            tooltipContent={coachTooltipContent}
          />
        </div>
      )}

      {/* Right cluster: rightSlot (single render) + mobile-only avatar */}
      {(rightSlot || coachData) && (
        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          {rightSlot}
          {coachData && (
            <button
              type="button"
              onClick={onCoachClick}
              className="sm:hidden relative shrink-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary rounded-full"
              aria-label={coachTooltipContent}
            >
              <div className={avatarPatterns.coachCompact}>
                {getFirstChar(coachData.name)}
              </div>
              {coachOnline && (
                <div className={compactCardPatterns.coachPillStatusBadge}>
                  <div
                    className={compactCardPatterns.coachPillStatusDot}
                  ></div>
                </div>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
