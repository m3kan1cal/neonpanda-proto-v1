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
 * Layout:
 *   Mobile (<sm)  : Title row with H1 + (optional) compact Beta + (optional)
 *                   small avatar circle floated to the right.
 *   sm: and up    : Title + full Beta + CompactCoachCard pill on left;
 *                   rightSlot (e.g. CommandPaletteButton) on right.
 *
 * Pages that previously hand-rolled an <header> with this content should pass
 * their existing tooltip props through unchanged.
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
      className={`flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6 ${className}`}
      aria-label={`${title} Header`}
    >
      {/* Left section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
        {/* Title row (mobile: title + compact beta + avatar circle) */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
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
              <>
                <span
                  className={`${badgePatterns.betaSmall} text-[10px] shrink-0 sm:hidden ${
                    betaTooltipId ? "cursor-help" : ""
                  }`}
                  {...betaTooltipProps}
                >
                  Beta
                </span>
                <span
                  className={`${badgePatterns.beta} hidden sm:inline-flex shrink-0 ${
                    betaTooltipId ? "cursor-help" : ""
                  }`}
                  {...betaTooltipProps}
                >
                  Beta
                </span>
              </>
            )}
          </div>

          {/* Mobile-only avatar circle */}
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

        {/* Desktop-only coach pill */}
        {coachData && (
          <div className="hidden sm:block">
            <CompactCoachCard
              coachData={coachData}
              isOnline={coachOnline}
              onClick={onCoachClick}
              tooltipContent={coachTooltipContent}
            />
          </div>
        )}
      </div>

      {/* Right section */}
      {rightSlot && (
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {rightSlot}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
