import React from "react";
import { useNavigate } from "react-router-dom";
import { containerPatterns } from "../../utils/ui/uiPatterns";

/**
 * ActiveProgramSummary - Displays a summary of the user's active training program
 * Shows progress, phase, and link to full program dashboard
 */
function ActiveProgramSummary({
  program,
  todaysWorkout,
  isLoading,
  userId,
  coachId,
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full shrink-0 mt-2 animate-pulse"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Training Programs
          </h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-synthwave-text-muted/20 animate-pulse"></div>
          <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-3/4"></div>
          <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!program) {
    return null; // Don't show if there's no active program
  }

  // Use program.currentDay instead of todaysWorkout.currentDayNumber to avoid NaN
  const currentDayNumber = program.currentDay || 1;
  const { phaseName } = todaysWorkout || {};
  const progressPercentage =
    program.totalDays > 0
      ? Math.round((currentDayNumber / program.totalDays) * 100)
      : 0;

  const completedWorkouts = program.completedWorkouts || 0;
  const totalWorkouts = program.totalWorkouts || program.totalDays;

  const handleViewProgram = () => {
    navigate(
      `/training-grounds/programs/dashboard?userId=${userId}&coachId=${coachId}&programId=${program.programId}`,
    );
  };

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full shrink-0 mt-2"></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Training Programs
        </h3>
        <div
          className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded-md text-synthwave-neon-purple font-rajdhani text-xs font-bold uppercase tracking-wider cursor-help"
          data-tooltip-id="beta-badge-program-summary"
          data-tooltip-content="Training programs are in beta. You may experience pre-release behavior. We appreciate your feedback!"
        >
          Beta
        </div>
      </div>

      {/* Program name - clickable */}
      <button
        onClick={handleViewProgram}
        className="font-rajdhani text-lg text-white hover:text-synthwave-neon-cyan transition-colors mb-2 text-left font-semibold"
      >
        {program.name}
      </button>

      {/* Progress info */}
      <div className="font-rajdhani text-sm text-synthwave-text-secondary mb-4">
        Day {currentDayNumber} of {program.totalDays} • {progressPercentage}%
        Complete
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2 bg-synthwave-bg-primary/50 rounded-full overflow-hidden mb-4">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-synthwave-neon-cyan to-synthwave-neon-purple rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Completion stats */}
      <div className="font-rajdhani text-xs text-synthwave-text-secondary mb-4">
        <span className="text-synthwave-neon-cyan font-semibold">
          {completedWorkouts}/{totalWorkouts}
        </span>{" "}
        workouts completed
      </div>

      {/* Current phase */}
      {phaseName && (
        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-3 mb-4">
          <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-1">
            Current Phase
          </div>
          <div className="font-rajdhani text-sm text-white font-medium">
            {phaseName}
          </div>
        </div>
      )}

      {/* View Dashboard button */}
      <button
        onClick={handleViewProgram}
        className="w-full bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-4 py-2 font-rajdhani font-semibold text-base uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-md hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[40px] flex items-center justify-center"
      >
        View Dashboard
      </button>
    </div>
  );
}

export default ActiveProgramSummary;
