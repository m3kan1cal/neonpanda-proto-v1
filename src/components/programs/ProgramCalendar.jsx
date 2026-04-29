import React, { useState, useMemo } from "react";
import { buttonPatterns } from "../../utils/ui/uiPatterns";
import { CalendarIcon } from "../themes/SynthwaveComponents";
import CalendarDayCell from "./CalendarDayCell";
import CollapsibleSection from "./CollapsibleSection";

export default function ProgramCalendar({
  program,
  programDetails,
  userId,
  coachId,
  programId,
}) {
  const [showAllWeeks, setShowAllWeeks] = useState(false);

  // Build calendar days from program details
  const calendarDays = useMemo(() => {
    if (!program) {
      return [];
    }

    const days = [];
    const workoutsByDay = {};

    // Group workouts by day if programDetails available
    // Try both workoutTemplates and templates properties
    const templates =
      programDetails?.workoutTemplates || programDetails?.templates || [];

    if (templates.length > 0) {
      templates.forEach((template) => {
        if (!workoutsByDay[template.dayNumber]) {
          workoutsByDay[template.dayNumber] = [];
        }
        workoutsByDay[template.dayNumber].push(template);
      });
    }

    // Create day objects for all days in program
    const totalDays = program.totalDays || program.duration || 0;
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        dayNumber: i,
        workouts: workoutsByDay[i] || [],
      });
    }

    return days;
  }, [program, programDetails]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const weeksArray = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarDays]);

  // Find current week index
  const currentWeekIndex = Math.floor((program.currentDay - 1) / 7);

  // Determine which weeks to show
  const visibleWeeks = useMemo(() => {
    if (showAllWeeks) {
      return weeks.map((week, idx) => ({ week, weekIndex: idx }));
    }

    // Show current week + 1 before + 1 after
    const startIndex = Math.max(0, currentWeekIndex - 1);
    const endIndex = Math.min(weeks.length, currentWeekIndex + 2);

    return weeks.slice(startIndex, endIndex).map((week, idx) => ({
      week,
      weekIndex: startIndex + idx,
    }));
  }, [weeks, currentWeekIndex, showAllWeeks]);

  // Get phase for a given day
  const getPhaseForDay = (dayNumber) => {
    if (!program.phases || program.phases.length === 0) {
      return null;
    }

    return program.phases.find(
      (phase) => dayNumber >= phase.startDay && dayNumber <= phase.endDay,
    );
  };

  // Jump to today
  const handleJumpToToday = () => {
    setShowAllWeeks(false);
    // Scroll current week into view
    setTimeout(() => {
      const currentWeekElement = document.getElementById(
        `week-${currentWeekIndex}`,
      );
      if (currentWeekElement) {
        currentWeekElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, 100);
  };

  if (!program || calendarDays.length === 0) {
    return (
      <CollapsibleSection
        title="Training Calendar"
        icon={CalendarIcon}
        iconColor="purple"
        id="training-calendar"
        headerClassName="p-4 md:p-6"
        bodyClassName="px-4 pb-4 md:px-6 md:pb-6"
      >
        <p className="text-center text-synthwave-text-muted py-8 font-body">
          Loading calendar...
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Training Calendar"
      icon={CalendarIcon}
      iconColor="purple"
      id="training-calendar"
      headerClassName="p-4 md:p-6"
      bodyClassName="px-4 pb-4 md:px-6 md:pb-6"
    >
      {/* Controls - stack on mobile to avoid cramping */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs font-body">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-synthwave-neon-pink"></div>
            <span className="text-synthwave-text-secondary">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-synthwave-neon-purple"></div>
            <span className="text-synthwave-text-secondary">Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-synthwave-neon-cyan/40"></div>
            <span className="text-synthwave-text-secondary">Skipped</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-synthwave-text-muted/30"></div>
            <span className="text-synthwave-text-secondary">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-synthwave-bg-primary/30"></div>
            <span className="text-synthwave-text-secondary">Rest</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!showAllWeeks && currentWeekIndex > 1 && (
            <button
              onClick={handleJumpToToday}
              className={buttonPatterns.tabToggleInactive}
            >
              Jump to Today
            </button>
          )}

          <button
            onClick={() => setShowAllWeeks(false)}
            className={
              !showAllWeeks
                ? buttonPatterns.tabToggleActive
                : buttonPatterns.tabToggleInactive
            }
          >
            Current
          </button>
          <button
            onClick={() => setShowAllWeeks(true)}
            className={
              showAllWeeks
                ? buttonPatterns.tabToggleActive
                : buttonPatterns.tabToggleInactive
            }
          >
            All Weeks
          </button>
        </div>
      </div>

      {/* Weeks grid */}
      <div className="space-y-4">
        {visibleWeeks.map(({ week, weekIndex }) => {
          const isCurrentWeek = weekIndex === currentWeekIndex;

          return (
            <div key={weekIndex} id={`week-${weekIndex}`}>
              {/* Week header */}
              <div className="flex items-center justify-between mb-2">
                <h4
                  className={`font-body text-sm font-semibold uppercase tracking-wide ${isCurrentWeek ? "text-synthwave-neon-pink" : "text-synthwave-text-secondary"}`}
                >
                  Week {weekIndex + 1}
                  {isCurrentWeek && (
                    <span className="ml-2 text-xs lowercase text-synthwave-neon-pink/70">
                      • active
                    </span>
                  )}
                </h4>
                <span className="text-xs text-synthwave-text-muted font-body">
                  Days {week[0]?.dayNumber || 1} -{" "}
                  {week[week.length - 1]?.dayNumber || 7}
                </span>
              </div>

              {/* Days grid - tighter spacing on mobile */}
              <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                {week.map((day) => (
                  <CalendarDayCell
                    key={day.dayNumber}
                    day={day}
                    programId={programId}
                    userId={userId}
                    coachId={coachId}
                    isCurrentDay={day.dayNumber === program.currentDay}
                    phase={getPhaseForDay(day.dayNumber)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show count if not showing all */}
      {!showAllWeeks && weeks.length > visibleWeeks.length && (
        <div className="text-center mt-6 font-body text-xs text-synthwave-text-muted">
          Viewing {visibleWeeks.length} of {weeks.length} weeks
        </div>
      )}
    </CollapsibleSection>
  );
}
