import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";

/**
 * HybridSection Component
 *
 * Displays mixed-modality workouts that don't fit a single discipline.
 * Supports two data structures:
 * 1. Phases-based: Workouts with distinct sections (warmup, strength, conditioning, etc.)
 * 2. Flat exercises: Workouts without clear phase separation
 *
 * Automatically detects which structure is present and renders accordingly.
 */
export const HybridSection = ({
  hybridData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  toggleSubsection,
  collapsedSubsections,
  containerPatterns,
}) => {
  // Determine if we have phases or flat exercises
  const hasPhases = hybridData?.phases?.length > 0;
  const hasExercises = hybridData?.exercises?.length > 0;

  // Calculate total exercise count for display
  const totalExerciseCount = hasPhases
    ? hybridData.phases.reduce(
        (total, phase) => total + (phase.exercises?.length || 0),
        0,
      )
    : hybridData?.exercises?.length || 0;

  if (!hasPhases && !hasExercises) {
    return (
      <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
        <div
          className="flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 rounded-md"
          onClick={() => toggleCollapse(sectionId)}
        >
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
            <h3 className="font-russo font-bold text-white text-lg uppercase">
              Hybrid Workout (0)
            </h3>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
            <div className="text-synthwave-text-secondary font-rajdhani text-sm">
              No hybrid workout data available. This discipline is for
              mixed-modality workouts that don't fit a single training style.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get phase type badge color
  const getPhaseTypeBadgeColor = (phaseType) => {
    switch (phaseType) {
      case "warmup":
      case "mobility":
      case "cooldown":
        return badgePatterns.workoutBadgeCyan;
      case "strength":
      case "working":
        return badgePatterns.workoutBadgePink;
      case "conditioning":
      case "circuit":
      case "cardio":
        return badgePatterns.workoutBadgePurple;
      case "skill":
      case "accessory":
        return badgePatterns.workoutBadgeCyan;
      default:
        return badgePatterns.workoutBadgeCyan;
    }
  };

  // Get movement pattern badge color
  const getMovementPatternBadgeColor = (pattern) => {
    switch (pattern) {
      case "push":
      case "pull":
      case "squat":
      case "hinge":
        return badgePatterns.workoutBadgePink;
      case "accessory":
      case "carry":
        return badgePatterns.workoutBadgeCyan;
      case "core":
        return badgePatterns.workoutBadgePurple;
      case "cardio":
      case "mobility":
        return badgePatterns.workoutBadgeCyan;
      default:
        return badgePatterns.workoutBadgeCyan;
    }
  };

  // Render a single exercise
  const renderExercise = (exercise, exerciseIndex, keyPrefix) => {
    const subKey = `${keyPrefix}-exercise-${exerciseIndex}`;

    return (
      <div key={exerciseIndex}>
        <button
          onClick={() => toggleSubsection(subKey)}
          className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="uppercase">{exercise.exercise_name}</span>
            {exercise.movement_pattern && (
              <span
                className={`${badgePatterns.workoutBadgeBase} ${getMovementPatternBadgeColor(exercise.movement_pattern)}`}
              >
                {exercise.movement_pattern}
              </span>
            )}
            {exercise.equipment && (
              <span
                className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgeCyan}`}
              >
                {exercise.equipment}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsedSubsections.has(subKey) ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {!collapsedSubsections.has(subKey) && (
          <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4 animate-fadeIn mb-2">
            <div className="space-y-2">
              {exercise.sets?.length > 0 ? (
                exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} className="py-2">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                      {set.set_number && (
                        <span className="font-bold text-synthwave-neon-cyan text-sm">
                          Set {set.set_number}
                        </span>
                      )}
                      {set.weight?.value && (
                        <span className="text-synthwave-text-secondary">
                          {set.weight.value}
                          {set.weight.unit || "lbs"}
                        </span>
                      )}
                      {set.reps && (
                        <span className="text-synthwave-text-secondary">
                          × {set.reps} reps
                        </span>
                      )}
                      {set.duration && (
                        <span className="text-synthwave-text-secondary">
                          {set.duration}s
                        </span>
                      )}
                      {set.distance && (
                        <span className="text-synthwave-text-secondary">
                          {set.distance}
                        </span>
                      )}
                      {set.rpe && (
                        <span className="text-synthwave-text-secondary">
                          RPE {set.rpe}
                        </span>
                      )}
                    </div>
                    {set.notes && (
                      <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary italic">
                        {set.notes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                  No set data recorded
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render phases-based structure
  const renderPhases = () => (
    <div className="space-y-4">
      {hybridData.phases.map((phase, phaseIndex) => {
        const phaseKey = `hybrid-phase-${phaseIndex}`;
        const phaseName =
          phase.phase_name || phase.phase_type || `Phase ${phaseIndex + 1}`;

        return (
          <div
            key={phaseIndex}
            className="border border-synthwave-neon-cyan/10 rounded-md overflow-hidden"
          >
            <button
              onClick={() => toggleSubsection(phaseKey)}
              className="w-full flex items-center justify-between p-4 bg-synthwave-bg-primary/40 hover:bg-synthwave-bg-primary/60 transition-colors duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-russo font-bold text-white text-sm uppercase">
                  {phaseName} ({phase.exercises?.length || 0})
                </span>
                {phase.phase_type && (
                  <span
                    className={`${badgePatterns.workoutBadgeBase} ${getPhaseTypeBadgeColor(phase.phase_type)}`}
                  >
                    {phase.phase_type}
                  </span>
                )}
                {phase.duration && (
                  <span className="text-xs text-synthwave-text-secondary">
                    {Math.floor(phase.duration / 60)}:
                    {String(phase.duration % 60).padStart(2, "0")}
                  </span>
                )}
                {phase.rounds && (
                  <span className="text-xs text-synthwave-text-secondary">
                    {phase.rounds} rounds
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSubsections.has(phaseKey) ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {!collapsedSubsections.has(phaseKey) && (
              <div className="p-4 space-y-2 animate-fadeIn">
                {phase.notes && (
                  <div className="text-sm font-rajdhani text-synthwave-text-secondary italic mb-3">
                    {phase.notes}
                  </div>
                )}
                {phase.exercises?.length > 0 ? (
                  phase.exercises.map((exercise, exerciseIndex) =>
                    renderExercise(exercise, exerciseIndex, phaseKey),
                  )
                ) : (
                  <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                    No exercises recorded for this phase
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render flat exercises structure
  const renderFlatExercises = () => (
    <div className="space-y-3">
      {hybridData.exercises.map((exercise, exerciseIndex) =>
        renderExercise(exercise, exerciseIndex, "hybrid-flat"),
      )}
    </div>
  );

  return (
    <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
      <div
        className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
          collapsedSections.has(sectionId) ? "rounded-md" : "rounded-t-md"
        }`}
        onClick={() => toggleCollapse(sectionId)}
      >
        <div className="flex items-start space-x-3">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
          <div className="flex flex-col">
            <h3 className="font-russo font-bold text-white text-lg uppercase">
              Hybrid Workout ({totalExerciseCount})
            </h3>
            {/* Show workout style or primary focus if available */}
            {(hybridData?.workout_style || hybridData?.primary_focus) && (
              <span className="text-xs text-synthwave-text-secondary font-rajdhani mt-1">
                {hybridData.workout_style || hybridData.primary_focus}
              </span>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(sectionId) ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      {!collapsedSections.has(sectionId) && (
        <div className="px-6 pb-6">
          {hasPhases ? renderPhases() : renderFlatExercises()}
        </div>
      )}

      {/* Badge Color Legend */}
      <BadgeLegend />
    </div>
  );
};
