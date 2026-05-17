import React from "react";
import { useNavigate } from "react-router-dom";
import { badgePatterns } from "../../utils/ui/uiPatterns";
import { useLongPress } from "../../hooks/useLongPress";

export default function CalendarDayCell({
  day,
  programId,
  userId,
  coachId,
  isCurrentDay,
  phase,
  onLongPress,
}) {
  const navigate = useNavigate();

  const longPressEnabled = typeof onLongPress === "function" && !isCurrentDay;
  const longPress = useLongPress(
    () => {
      if (longPressEnabled) onLongPress(day.dayNumber);
    },
    { disabled: !longPressEnabled },
  );

  const handleClick = () => {
    // If a long-press just fired, swallow this click so we don't also navigate.
    if (longPress.consumeClick()) return;

    if (!day.workouts || day.workouts.length === 0) return;

    // If clicking on current day, navigate to "today" (no day parameter)
    // Otherwise, navigate to specific day
    if (isCurrentDay) {
      navigate(
        `/training-grounds/programs/workouts?userId=${userId}&coachId=${coachId}&programId=${programId}`,
      );
    } else {
      navigate(
        `/training-grounds/programs/workouts?userId=${userId}&coachId=${coachId}&programId=${programId}&day=${day.dayNumber}`,
      );
    }
  };

  // Determine status
  const getStatus = () => {
    if (!day.workouts || day.workouts.length === 0) {
      return "rest";
    }

    // Check if workouts have status property (from workout logs)
    const hasStatusData = day.workouts.some((w) => w.status !== undefined);

    if (hasStatusData) {
      const allCompleted = day.workouts.every((w) => w.status === "completed");
      const allSkipped = day.workouts.every((w) => w.status === "skipped");
      const someCompleted = day.workouts.some((w) => w.status === "completed");
      const someSkipped = day.workouts.some((w) => w.status === "skipped");

      if (allCompleted) return "completed";
      if (allSkipped) return "skipped";
      if (someCompleted || someSkipped) return "partial";
    }

    // Default to pending if workouts exist but no status data
    // (these are workout templates, not yet logged)
    return "pending";
  };

  const status = getStatus();
  const hasWorkouts = day.workouts && day.workouts.length > 0;
  const workoutCount = hasWorkouts ? day.workouts.length : 0;

  // Status-based styling
  const getStatusStyles = () => {
    // Mobile: 44px tap target (Apple HIG); desktop keeps the roomier 80px cell.
    const baseStyles =
      "relative flex flex-col min-h-[44px] md:h-20 rounded-xl transition-all duration-200 overflow-hidden font-body border border-synthwave-neon-cyan/10 select-none";

    // When long-press is enabled the cell should be interactive even without
    // workouts (so users can re-anchor currentDay onto a rest day).
    const interactive = hasWorkouts || longPressEnabled;
    const cursorClass = interactive ? "cursor-pointer" : "cursor-default";

    switch (status) {
      case "completed":
        return `${baseStyles} bg-synthwave-neon-pink/10 border-synthwave-neon-pink/40 ${cursorClass} hover:bg-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/60 hover:shadow-lg hover:shadow-synthwave-neon-pink/20`;
      case "skipped":
        return `${baseStyles} bg-synthwave-neon-cyan/5 border-synthwave-neon-cyan/20 ${cursorClass} hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/40`;
      case "partial":
        return `${baseStyles} bg-synthwave-neon-purple/10 border-synthwave-neon-purple/30 ${cursorClass} hover:bg-synthwave-neon-purple/20 hover:border-synthwave-neon-purple/50`;
      case "pending":
        return `${baseStyles} bg-synthwave-bg-secondary/30 border-synthwave-neon-cyan/15 ${cursorClass} hover:bg-synthwave-bg-secondary/50 hover:border-synthwave-neon-cyan/30`;
      case "rest":
      default:
        return `${baseStyles} border-synthwave-neon-cyan/10 bg-synthwave-bg-primary/20 ${cursorClass} ${longPressEnabled ? "opacity-70 hover:opacity-90" : "opacity-60"}`;
    }
  };

  // iOS Safari shows a callout / magnifier on long touch; suppress when wired
  // for long-press. Browser default for desktop is unaffected.
  const longPressStyle = longPressEnabled
    ? { WebkitTouchCallout: "none" }
    : undefined;
  const pressingClass = longPress.isPressing
    ? " scale-95 ring-2 ring-synthwave-neon-cyan/60"
    : "";

  return (
    <div
      onClick={hasWorkouts || longPressEnabled ? handleClick : undefined}
      className={getStatusStyles() + pressingClass}
      style={longPressStyle}
      {...longPress.handlers}
    >
      {/* Current day ring indicator */}
      {isCurrentDay && (
        <div className="absolute inset-0 border-2 border-synthwave-neon-cyan rounded-xl animate-pulse pointer-events-none" />
      )}

      {/* Day number header */}
      <div className="flex items-center justify-between px-1 md:px-2 py-1">
        <span
          className={`text-[10px] md:text-xs font-semibold ${isCurrentDay ? "text-synthwave-neon-cyan" : status === "rest" ? "text-synthwave-text-muted" : "text-white"}`}
        >
          {day.dayNumber}
        </span>

        {/* Status indicator dot */}
        {hasWorkouts && (
          <div
            className={`w-2 h-2 rounded-full ${
              status === "completed"
                ? "bg-synthwave-neon-pink"
                : status === "skipped"
                  ? "bg-synthwave-neon-cyan/40"
                  : status === "partial"
                    ? "bg-synthwave-neon-purple"
                    : "bg-synthwave-text-muted/30"
            }`}
          />
        )}
      </div>

      {/* Day body - workout info (hidden on mobile; the dot + day number communicate state) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center px-2 py-1">
        {hasWorkouts ? (
          <>
            {/* Workout count badge - styled like SidebarNav badges */}
            <div
              className={`
              ${badgePatterns.countBase} rounded-xl
              ${status === "completed" ? badgePatterns.countPink : ""}
              ${status === "skipped" ? badgePatterns.countCyan : ""}
              ${status === "partial" ? badgePatterns.countPurple : ""}
              ${status === "pending" ? badgePatterns.countMuted : ""}
            `}
            >
              {workoutCount}
            </div>
            <div className="text-[10px] text-synthwave-text-muted uppercase tracking-wide mt-1">
              {workoutCount === 1 ? "workout" : "workouts"}
            </div>
          </>
        ) : (
          <div className="text-xs text-synthwave-text-muted">—</div>
        )}
      </div>
    </div>
  );
}
