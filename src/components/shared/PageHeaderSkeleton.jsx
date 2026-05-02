import React from "react";

/**
 * PageHeaderSkeleton - Loading placeholder that mirrors PageHeader.jsx layout.
 * Keeps mobile sizing/spacing in lockstep with the real header so the swap
 * from skeleton to loaded content does not jump.
 */
const PageHeaderSkeleton = ({
  showBeta = false,
  showCoach = false,
  showRightSlot = false,
  rightSlotWidth = "w-20",
  className = "",
}) => (
  <header
    className={`flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6 ${className}`}
    aria-hidden="true"
  >
    {/* Left section */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
      {/* Title row (mobile: title + beta + avatar circle) */}
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Title placeholder — heights track text-xl / text-2xl / text-3xl */}
          <div className="h-6 sm:h-7 md:h-9 bg-synthwave-text-muted/20 animate-pulse w-40 sm:w-56 md:w-72" />
          {showBeta && (
            <div className="h-4 sm:h-5 w-10 sm:w-12 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/20 rounded-full animate-pulse shrink-0" />
          )}
        </div>

        {/* Mobile-only avatar circle */}
        {showCoach && (
          <div className="sm:hidden w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse shrink-0" />
        )}
      </div>

      {/* Desktop-only coach pill (mirrors CompactCoachCard) */}
      {showCoach && (
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
          <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse" />
          <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20" />
        </div>
      )}
    </div>

    {/* Right section */}
    {showRightSlot && (
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
        <div
          className={`h-10 ${rightSlotWidth} bg-synthwave-text-muted/20 rounded-full animate-pulse`}
        />
      </div>
    )}
  </header>
);

export default PageHeaderSkeleton;
