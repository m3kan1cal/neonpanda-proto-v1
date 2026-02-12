import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";

export const BodybuildingSection = ({
  bodybuildingData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  toggleSubsection,
  collapsedSubsections,
  containerPatterns,
}) => {
  if (!bodybuildingData?.exercises && !true) return null;

  return (
    <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
      <div
        className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
          collapsedSections.has(sectionId) ? "rounded-2xl" : "rounded-t-2xl"
        }`}
        onClick={() => toggleCollapse(sectionId)}
      >
        <div className="flex items-start space-x-3">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Bodybuilding Exercises ({bodybuildingData?.exercises?.length || 0})
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
        <div className="px-6 pb-6">
          {bodybuildingData?.exercises?.length > 0 ? (
            <div className="space-y-3">
              {bodybuildingData.exercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex}>
                  <button
                    onClick={() =>
                      toggleSubsection(`bb-exercise-${exerciseIndex}`)
                    }
                    className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="uppercase">
                        {exercise.exercise_name}
                      </span>
                      <span className="text-xs text-synthwave-text-muted normal-case">
                        ({exercise.sets?.length || 0} sets)
                      </span>
                      {exercise.movement_category && (
                        <span
                          className={`${badgePatterns.workoutBadgeBase} ${
                            exercise.movement_category === "compound"
                              ? badgePatterns.workoutBadgePink
                              : exercise.movement_category === "isolation" ||
                                  exercise.movement_category === "accessory"
                                ? badgePatterns.workoutBadgeCyan
                                : badgePatterns.workoutBadgeCyan
                          }`}
                        >
                          {exercise.movement_category}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${collapsedSubsections.has(`bb-exercise-${exerciseIndex}`) ? "rotate-180" : ""}`}
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
                  {!collapsedSubsections.has(
                    `bb-exercise-${exerciseIndex}`,
                  ) && (
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                      <div className="space-y-2">
                        {exercise.sets?.map((set, setIndex) => (
                          <div key={setIndex} className="py-2">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                              <span className="font-bold text-synthwave-neon-cyan text-sm">
                                Set {set.set_number}
                              </span>
                              {set.weight && (
                                <span className="text-synthwave-text-secondary">
                                  {set.weight}
                                  {set.weight_unit || "lbs"}
                                </span>
                              )}
                              {set.reps && (
                                <span className="text-synthwave-text-secondary">
                                  × {set.reps} reps
                                </span>
                              )}
                              {set.tempo && (
                                <span className="text-synthwave-text-secondary">
                                  Tempo: {set.tempo}
                                </span>
                              )}
                              {set.time_under_tension && (
                                <span className="text-synthwave-text-secondary">
                                  TUT: {set.time_under_tension}s
                                </span>
                              )}
                              {set.rpe && (
                                <span className="text-synthwave-text-secondary">
                                  @ RPE {set.rpe}
                                </span>
                              )}
                              {set.set_type && (
                                <span
                                  className={`${badgePatterns.workoutBadgeBase} ml-auto ${
                                    set.set_type === "working"
                                      ? badgePatterns.workoutBadgePink
                                      : set.set_type === "warmup" ||
                                          set.set_type === "drop"
                                        ? badgePatterns.workoutBadgePurple
                                        : set.set_type === "accessory"
                                          ? badgePatterns.workoutBadgeCyan
                                          : badgePatterns.workoutBadgeCyan
                                  }`}
                                >
                                  {set.set_type}
                                </span>
                              )}
                            </div>
                            {set.notes && (
                              <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary italic">
                                {set.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
              <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                No bodybuilding exercises data available. Include exercise
                details, sets, reps, tempo, and rest periods when logging.
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
