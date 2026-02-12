import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";

export const CalisthenicsSection = ({
  calisthenicsData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  toggleSubsection,
  collapsedSubsections,
  containerPatterns,
}) => {
  if (!calisthenicsData?.exercises && !true) return null;

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
            Calisthenics ({calisthenicsData?.exercises?.length || 0})
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
          {calisthenicsData?.exercises?.length > 0 ? (
            <div className="space-y-3">
              {calisthenicsData.exercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex}>
                  <button
                    onClick={() =>
                      toggleSubsection(`cali-exercise-${exerciseIndex}`)
                    }
                    className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="uppercase">
                        {exercise.exercise_name}
                      </span>
                      {exercise.progression_level && (
                        <span className="text-xs text-synthwave-text-muted normal-case">
                          ({exercise.progression_level})
                        </span>
                      )}
                      {exercise.skill_category && (
                        <span
                          className={`${badgePatterns.workoutBadgeBase} ${
                            exercise.skill_category === "pull" ||
                            exercise.skill_category === "push" ||
                            exercise.skill_category === "dynamic_movement" ||
                            exercise.skill_category === "leg"
                              ? badgePatterns.workoutBadgeCyan
                              : exercise.skill_category === "static_hold" ||
                                  exercise.skill_category === "core" ||
                                  exercise.skill_category === "skill_transfer"
                                ? badgePatterns.workoutBadgePurple
                                : badgePatterns.workoutBadgeCyan
                          }`}
                        >
                          {exercise.skill_category.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${collapsedSubsections.has(`cali-exercise-${exerciseIndex}`) ? "rotate-180" : ""}`}
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
                    `cali-exercise-${exerciseIndex}`,
                  ) && (
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                      <div className="space-y-2">
                        {exercise.sets?.map((set, setIndex) => (
                          <div key={setIndex} className="py-2">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                              <span className="font-bold text-synthwave-neon-cyan text-sm">
                                Set {set.set_number}
                              </span>
                              {set.reps && (
                                <span className="text-synthwave-text-secondary">
                                  × {set.reps} reps
                                </span>
                              )}
                              {set.hold_time && (
                                <span className="text-synthwave-text-secondary">
                                  Hold: {set.hold_time}s
                                </span>
                              )}
                              {exercise.assistance_method && (
                                <span className="text-synthwave-text-secondary">
                                  with {exercise.assistance_method}
                                </span>
                              )}
                              {set.quality_rating && (
                                <span className="text-synthwave-text-secondary">
                                  Quality: {set.quality_rating}/10
                                </span>
                              )}
                              {set.success !== undefined && (
                                <span className="text-synthwave-text-muted text-sm italic">
                                  {set.success ? "Success" : "Missed"}
                                </span>
                              )}
                              {set.set_type && (
                                <span
                                  className={`${badgePatterns.workoutBadgeBase} ml-auto ${
                                    set.set_type === "max_effort" ||
                                    set.set_type === "working"
                                      ? badgePatterns.workoutBadgePink
                                      : set.set_type === "skill_practice" ||
                                          set.set_type === "warmup" ||
                                          set.set_type === "endurance"
                                        ? badgePatterns.workoutBadgePurple
                                        : badgePatterns.workoutBadgeCyan
                                  }`}
                                >
                                  {set.set_type.replace(/_/g, " ")}
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
                No Calisthenics data available. Include skills, progression
                levels, hold times/reps, and assistance methods when logging.
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
