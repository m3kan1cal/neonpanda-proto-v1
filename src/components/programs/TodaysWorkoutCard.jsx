import React from "react";
import { useNavigate } from "react-router-dom";
import { containerPatterns, buttonPatterns } from "../../utils/ui/uiPatterns";
import { WorkoutIconSmall } from "../themes/SynthwaveComponents";
import { EmptyState, InlineError } from "../shared/ErrorStates";

/**
 * TodaysWorkoutCard - Displays today's workout from the active training program
 * Highest priority component for Training Grounds
 */
function TodaysWorkoutCard({
  todaysWorkout,
  program,
  isLoading,
  error,
  userId,
  coachId,
  onViewWorkout,
  onCompleteRestDay,
  isCompletingRestDay = false, // Loading state for completing rest day
  showViewProgramButton = true, // Show button by default, but can be hidden when on program dashboard
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full shrink-0 mt-2 animate-pulse"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
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

  if (error) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full shrink-0 mt-2"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>
        <InlineError
          title="Error loading today's workout"
          message={error}
          variant="error"
          size="medium"
        />
      </div>
    );
  }

  // Show rest day card if no workout data
  if (
    !todaysWorkout ||
    !program ||
    !todaysWorkout.templates ||
    todaysWorkout.templates.length === 0
  ) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full shrink-0 mt-2"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>

        {/* Program name */}
        {program && (
          <>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-3">
              {program.name}
            </div>
          </>
        )}

        {/* Rest day message */}
        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="text-synthwave-neon-cyan opacity-50">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="font-rajdhani text-white text-lg uppercase mb-2">
            Rest Day
          </div>
          <div className="font-rajdhani text-sm text-synthwave-text-secondary">
            No workout scheduled for today. Enjoy your recovery!
          </div>
        </div>

        {/* Complete Rest Day button */}
        {program && onCompleteRestDay && (
          <button
            onClick={() => onCompleteRestDay(program)}
            disabled={isCompletingRestDay}
            className={`w-full mt-4 ${buttonPatterns.secondaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCompletingRestDay ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Completing...
              </span>
            ) : (
              "Complete Rest Day"
            )}
          </button>
        )}

        {/* View program button - only show if showViewProgramButton is true */}
        {program && showViewProgramButton && (
          <button
            onClick={() =>
              navigate(
                `/training-grounds/programs/${program.programId}?userId=${userId}&coachId=${coachId}`,
              )
            }
            className={`w-full mt-4 ${buttonPatterns.secondaryMedium}`}
          >
            View Training Program
          </button>
        )}
      </div>
    );
  }

  const { dayNumber, phaseName, templates } = todaysWorkout;
  // Sort templates by templateId to get the "primary" template consistently
  // (the first template sorted by ID is considered the main workout for the day)
  const sortedTemplates = [...templates].sort((a, b) =>
    a.templateId.localeCompare(b.templateId),
  );
  const primaryTemplate = sortedTemplates[0];

  if (!primaryTemplate) {
    // No primary template - show rest day
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full shrink-0 mt-2"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>

        {/* Day info */}
        <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-3">
          Day {dayNumber} of {program.totalDays}
        </div>

        {/* Program name */}
        <div className="font-rajdhani text-sm text-synthwave-neon-cyan mb-1">
          {program.name}
        </div>

        {/* Phase name */}
        {phaseName && (
          <div className="font-rajdhani text-xs text-synthwave-text-secondary mb-4">
            {phaseName}
          </div>
        )}

        {/* Rest day message */}
        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="text-synthwave-neon-cyan opacity-50">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="font-rajdhani text-white text-lg uppercase mb-2">
            Rest Day
          </div>
          <div className="font-rajdhani text-sm text-synthwave-text-secondary">
            No workout scheduled for today. Enjoy your recovery!
          </div>
        </div>

        {/* Complete Rest Day button */}
        {onCompleteRestDay && (
          <button
            onClick={() => onCompleteRestDay(program)}
            disabled={isCompletingRestDay}
            className={`w-full mt-4 ${buttonPatterns.secondaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCompletingRestDay ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Completing...
              </span>
            ) : (
              "Complete Rest Day"
            )}
          </button>
        )}

        {/* View program button - only show if showViewProgramButton is true */}
        {showViewProgramButton && (
          <button
            onClick={() =>
              navigate(
                `/training-grounds/programs/${program.programId}?userId=${userId}&coachId=${coachId}`,
              )
            }
            className={`w-full mt-4 ${buttonPatterns.secondaryMedium}`}
          >
            View Training Program
          </button>
        )}
      </div>
    );
  }

  const handleViewWorkout = () => {
    if (onViewWorkout) {
      onViewWorkout(primaryTemplate);
    } else {
      // Navigate to today's workouts page
      navigate(
        `/training-grounds/programs/workouts?userId=${userId}&coachId=${coachId}&programId=${program.programId}`,
      );
    }
  };

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full shrink-0 mt-2"></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Today's Workout
        </h3>
        <div
          className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded text-synthwave-neon-purple font-rajdhani text-xs font-bold uppercase tracking-wider cursor-help"
          data-tooltip-id="beta-badge-todays-workout"
          data-tooltip-content="Training programs are in beta. You may experience pre-release behavior. We appreciate your feedback!"
        >
          Beta
        </div>
      </div>

      {/* Program name - clickable */}
      <button
        onClick={handleViewWorkout}
        className="text-left mb-4 block w-full"
      >
        <div className="font-rajdhani text-lg text-white hover:text-synthwave-neon-cyan transition-colors mb-2 font-semibold">
          {program.name}
        </div>
        {phaseName && (
          <div className="font-rajdhani text-sm text-synthwave-text-secondary">
            {phaseName}{" "}
            <span className="text-synthwave-text-muted">
              (Day {dayNumber || program.currentDay || 1} of {program.totalDays}
              )
            </span>
          </div>
        )}
      </button>

      {/* Workout details */}
      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-rajdhani font-semibold text-base text-white mb-1">
              {primaryTemplate.name}
            </h3>
            {primaryTemplate.estimatedDuration && (
              <div className="font-rajdhani text-xs text-synthwave-text-secondary">
                Estimated Duration:{" "}
                <span className="text-synthwave-neon-cyan">
                  {primaryTemplate.estimatedDuration} minutes
                </span>
              </div>
            )}
          </div>
          <div className="text-synthwave-neon-cyan ml-2">
            <WorkoutIconSmall />
          </div>
        </div>
      </div>

      {/* Multiple workouts indicator */}
      {templates.length > 1 && (
        <div className="flex items-center justify-center mb-4">
          <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani">
            +{templates.length - 1} more workout
            {templates.length > 2 ? "s" : ""} scheduled today
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleViewWorkout}
        className={`w-full ${buttonPatterns.secondaryMedium}`}
      >
        {templates.length > 1 ? "View Workouts" : "View Workout"}
      </button>
    </div>
  );
}

export default TodaysWorkoutCard;
