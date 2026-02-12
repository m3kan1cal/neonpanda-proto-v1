import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";

export const FunctionalBodybuildingSection = ({
  functionalBodybuildingData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  toggleSubsection,
  collapsedSubsections,
  containerPatterns,
}) => {
  if (!functionalBodybuildingData?.exercises && !true) return null;

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
            Functional Bodybuilding (
            {functionalBodybuildingData?.exercises?.length || 0})
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
          {functionalBodybuildingData?.exercises?.length > 0 ? (
            <div className="space-y-3">
              {functionalBodybuildingData.exercises.map(
                (exercise, exerciseIndex) => (
                  <div key={exerciseIndex}>
                    <button
                      onClick={() =>
                        toggleSubsection(`funcbb-exercise-${exerciseIndex}`)
                      }
                      className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="uppercase">
                          {exercise.exercise_name}
                        </span>
                        {exercise.structure === "emom" &&
                          exercise.emom_details && (
                            <span className="text-xs text-synthwave-text-secondary normal-case">
                              (EMOM {exercise.emom_details.rounds} ×{" "}
                              {exercise.emom_details.reps_per_round} every{" "}
                              {exercise.emom_details.interval}s)
                            </span>
                          )}
                        {exercise.movement_pattern && (
                          <span
                            className={`${badgePatterns.workoutBadgeBase} ${
                              exercise.movement_pattern === "push" ||
                              exercise.movement_pattern === "pull" ||
                              exercise.movement_pattern === "squat" ||
                              exercise.movement_pattern === "hinge"
                                ? badgePatterns.workoutBadgePink
                                : exercise.movement_pattern === "accessory" ||
                                    exercise.movement_pattern === "carry"
                                  ? badgePatterns.workoutBadgeCyan
                                  : exercise.movement_pattern === "core"
                                    ? badgePatterns.workoutBadgePurple
                                    : badgePatterns.workoutBadgeCyan
                            }`}
                          >
                            {exercise.movement_pattern}
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${collapsedSubsections.has(`funcbb-exercise-${exerciseIndex}`) ? "rotate-180" : ""}`}
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
                      `funcbb-exercise-${exerciseIndex}`,
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
                                {set.quality_focus && (
                                  <span className="text-synthwave-text-secondary italic">
                                    Focus: {set.quality_focus}
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
                ),
              )}
            </div>
          ) : (
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
              <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                No Functional Bodybuilding data available. Include EMOM
                structure, movement patterns, tempo, and quality focus when
                logging.
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
