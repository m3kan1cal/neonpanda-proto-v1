import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";

export const PowerliftingSection = ({
  powerliftingData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  toggleSubsection,
  collapsedSubsections,
  containerPatterns,
}) => {
  if (!powerliftingData?.exercises && !true) return null; // Remove || true after styling review

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
            Powerlifting Exercises ({powerliftingData?.exercises?.length || 0})
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
          {powerliftingData?.exercises?.length > 0 ? (
            powerliftingData.exercises.map((exercise, exerciseIndex) => (
              <div key={exerciseIndex}>
                <button
                  onClick={() => toggleSubsection(`exercise-${exerciseIndex}`)}
                  className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="uppercase">
                      {exercise.exercise_name?.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-synthwave-text-muted normal-case">
                      ({exercise.sets?.length || 0} sets)
                    </span>
                    {exercise.movement_category && (
                      <span
                        className={`${badgePatterns.workoutBadgeBase} ${
                          exercise.movement_category === "main_lift"
                            ? badgePatterns.workoutBadgePink
                            : exercise.movement_category === "accessory"
                              ? badgePatterns.workoutBadgeCyan
                              : badgePatterns.workoutBadgeMuted
                        }`}
                      >
                        {exercise.movement_category?.replace(/_/g, " ") ||
                          "main lift"}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      collapsedSubsections.has(`exercise-${exerciseIndex}`)
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
                {!collapsedSubsections.has(`exercise-${exerciseIndex}`) && (
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                    <div className="space-y-2">
                      {exercise.sets?.map((set, setIndex) => (
                        <div key={setIndex} className="py-2">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                            <span className="font-bold text-synthwave-neon-cyan text-sm">
                              Set {setIndex + 1}
                            </span>
                            {set.weight && (
                              <span className="text-synthwave-text-secondary">
                                {set.weight}lbs
                              </span>
                            )}
                            {set.reps && (
                              <span className="text-synthwave-text-secondary">
                                × {set.reps} reps
                              </span>
                            )}
                            {set.rpe && (
                              <span className="text-synthwave-text-secondary">
                                @ RPE {set.rpe}
                              </span>
                            )}
                            {set.percentage_1rm && (
                              <span className="text-synthwave-text-secondary">
                                ({set.percentage_1rm}% 1RM)
                              </span>
                            )}
                            {set.rest_time && (
                              <span className="text-synthwave-text-secondary">
                                Rest: {Math.floor(set.rest_time / 60)}:
                                {String(set.rest_time % 60).padStart(2, "0")}
                              </span>
                            )}
                            {set.bar_speed && (
                              <span className="text-synthwave-text-secondary">
                                Speed: {set.bar_speed}
                              </span>
                            )}
                            {set.set_type && (
                              <span
                                className={`${badgePatterns.workoutBadgeBase} ml-auto ${
                                  set.set_type === "working"
                                    ? badgePatterns.workoutBadgePink
                                    : set.set_type === "warmup"
                                      ? badgePatterns.workoutBadgePurple
                                      : set.set_type === "accessory"
                                        ? badgePatterns.workoutBadgeCyan
                                        : badgePatterns.workoutBadgeMuted
                                }`}
                              >
                                {set.set_type}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {exercise.attempts && (
                        <div className="mt-3">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                            <span className="font-semibold text-synthwave-neon-cyan text-sm">
                              Attempts:
                            </span>
                            {exercise.attempts.opener && (
                              <span className="text-synthwave-text-secondary">
                                Opener: {exercise.attempts.opener}lbs
                              </span>
                            )}
                            {exercise.attempts.second_attempt && (
                              <span className="text-synthwave-text-secondary">
                                2nd: {exercise.attempts.second_attempt}lbs
                              </span>
                            )}
                            {exercise.attempts.third_attempt && (
                              <span className="text-synthwave-text-secondary">
                                3rd: {exercise.attempts.third_attempt}lbs
                              </span>
                            )}
                          </div>
                          {exercise.attempts.successful_attempts &&
                            exercise.attempts.successful_attempts.length >
                              0 && (
                              <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary">
                                ✓ Successful:{" "}
                                {exercise.attempts.successful_attempts.join(
                                  "lbs, ",
                                )}
                                lbs
                              </div>
                            )}
                          {exercise.attempts.missed_attempts &&
                            exercise.attempts.missed_attempts.length > 0 && (
                              <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary">
                                ✗ Missed:{" "}
                                {exercise.attempts.missed_attempts.join(
                                  "lbs, ",
                                )}
                                lbs
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
              <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                No powerlifting exercises data available for this workout.
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
