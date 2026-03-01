import React from "react";
import { BadgeLegend } from "../BadgeLegend";

export const CrossFitSection = ({
  crossfitData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  toggleSubsection,
  collapsedSubsections,
  containerPatterns,
}) => {
  if (!crossfitData?.rounds && !true) return null; // Remove || true after styling review

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
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Workout Rounds ({crossfitData?.rounds?.length || 0})
          </h3>
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
        <div className="px-6 pb-6 space-y-3">
          {crossfitData?.rounds ? (
            crossfitData.rounds.map((round, roundIndex) => (
              <div key={roundIndex}>
                <button
                  onClick={() =>
                    toggleSubsection(`round-${round.round_number}`)
                  }
                  className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>Round {round.round_number}</span>
                    <span className="text-xs text-synthwave-text-muted normal-case">
                      ({round.exercises?.length || 0} exercises)
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      collapsedSubsections.has(`round-${round.round_number}`)
                        ? "rotate-180"
                        : ""
                    }`}
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
                {!collapsedSubsections.has(`round-${round.round_number}`) && (
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4 animate-fadeIn">
                    <div className="space-y-2">
                      {round.exercises?.map((exercise, exerciseIndex) => (
                        <div key={exerciseIndex} className="py-2">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                            <span className="font-bold text-synthwave-neon-cyan text-sm capitalize">
                              {exercise.exercise_name}
                              {exercise.variation && (
                                <span className="text-synthwave-text-secondary text-xs ml-1">
                                  ({exercise.variation})
                                </span>
                              )}
                            </span>
                            {exercise.reps?.prescribed && (
                              <span className="text-synthwave-text-secondary">
                                × {exercise.reps.prescribed} reps
                                {exercise.reps?.completed &&
                                  exercise.reps.completed !==
                                    exercise.reps.prescribed && (
                                    <span className="text-synthwave-neon-cyan ml-1">
                                      ({exercise.reps.completed} done)
                                    </span>
                                  )}
                              </span>
                            )}
                            {exercise.weight?.value && (
                              <span className="text-synthwave-text-secondary">
                                {exercise.weight.value}
                                {exercise.weight.unit}
                                {exercise.weight.percentage_1rm &&
                                  ` (${exercise.weight.percentage_1rm}% 1RM)`}
                              </span>
                            )}
                            {exercise.distance && (
                              <span className="text-synthwave-text-secondary">
                                {exercise.distance}m
                              </span>
                            )}
                            {exercise.time && (
                              <span className="text-synthwave-text-secondary">
                                {exercise.time}s
                              </span>
                            )}
                            {exercise.movement_type && (
                              <span className="text-synthwave-text-muted uppercase ml-auto">
                                {exercise.movement_type}
                              </span>
                            )}
                          </div>
                          {exercise.form_notes && (
                            <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary italic">
                              {exercise.form_notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
              <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                No CrossFit rounds data available for this workout.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Badge Color Legend */}
      <BadgeLegend />
    </div>
  );
};
