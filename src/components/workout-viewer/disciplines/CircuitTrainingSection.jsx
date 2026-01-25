import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";

export const CircuitTrainingSection = ({
  circuitTrainingData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  containerPatterns,
}) => {
  if (!circuitTrainingData?.stations && !true) return null;

  // Format time from seconds to MM:SS
  const formatTime = (seconds) => {
    if (!seconds) return null;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };

  // Get display name for circuit format
  const getFormatDisplay = (format) => {
    const formatMap = {
      stations: "Stations",
      amrap: "AMRAP",
      emom: "EMOM",
      tabata: "Tabata",
      rounds: "Rounds",
      custom: "Custom",
    };
    return formatMap[format] || format;
  };

  // Get display name for class style
  const getClassStyleDisplay = (style) => {
    const styleMap = {
      f45: "F45",
      orange_theory: "Orange Theory",
      barrys: "Barry's",
      community_class: "Community Class",
      custom: "Custom",
    };
    return styleMap[style] || style;
  };

  // Get display name for session focus
  const getSessionFocusDisplay = (focus) => {
    const focusMap = {
      cardio: "Cardio",
      strength: "Strength",
      hybrid: "Hybrid",
      endurance: "Endurance",
      power: "Power",
    };
    return focusMap[focus] || focus;
  };

  return (
    <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
      <div
        className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
          collapsedSections.has(sectionId) ? "rounded-2xl" : "rounded-t-2xl"
        }`}
        onClick={() => toggleCollapse(sectionId)}
      >
        <div className="flex items-start space-x-3">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
          <div className="flex flex-col gap-2">
            <h3 className="font-russo font-bold text-white text-lg uppercase">
              Circuit Training ({circuitTrainingData?.stations?.length || 0}{" "}
              stations)
            </h3>
            <div className="flex flex-wrap gap-2">
              {circuitTrainingData?.circuit_format && (
                <span
                  className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgePink}`}
                >
                  {getFormatDisplay(circuitTrainingData.circuit_format)}
                </span>
              )}
              {circuitTrainingData?.session_focus && (
                <span
                  className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgePurple}`}
                >
                  {getSessionFocusDisplay(circuitTrainingData.session_focus)}
                </span>
              )}
              {circuitTrainingData?.class_style && (
                <span
                  className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgeCyan}`}
                >
                  {getClassStyleDisplay(circuitTrainingData.class_style)}
                </span>
              )}
              {circuitTrainingData?.total_rounds && (
                <span
                  className={`${badgePatterns.workoutBadgeBase} ${badgePatterns.workoutBadgeMuted}`}
                >
                  {circuitTrainingData.total_rounds} rounds
                </span>
              )}
            </div>
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
          {/* Class Name */}
          {circuitTrainingData?.class_name && (
            <div className="mb-4 text-synthwave-text-secondary font-rajdhani">
              <span className="text-synthwave-neon-cyan">Class:</span>{" "}
              {circuitTrainingData.class_name}
            </div>
          )}

          {/* Global Work/Rest Intervals */}
          {(circuitTrainingData?.work_interval ||
            circuitTrainingData?.rest_interval) && (
            <div className="mb-4 flex flex-wrap gap-4 text-sm font-rajdhani text-synthwave-text-secondary">
              {circuitTrainingData.work_interval && (
                <span>
                  <span className="text-synthwave-neon-cyan">Work:</span>{" "}
                  {circuitTrainingData.work_interval}s
                </span>
              )}
              {circuitTrainingData.rest_interval && (
                <span>
                  <span className="text-synthwave-neon-cyan">Rest:</span>{" "}
                  {circuitTrainingData.rest_interval}s
                </span>
              )}
            </div>
          )}

          {circuitTrainingData?.stations?.length > 0 ? (
            <div className="space-y-3">
              {/* Stations */}
              <div>
                <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                  Stations
                </h4>
                <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                  <div className="space-y-2">
                    {circuitTrainingData.stations.map((station, idx) => (
                      <div key={idx} className="py-2">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                          <span className="font-bold text-synthwave-neon-cyan text-sm">
                            Station {station.station_number}:{" "}
                            {station.exercise_name}
                          </span>
                          {station.work_time && (
                            <span className="text-synthwave-text-secondary">
                              Work: {station.work_time}s
                            </span>
                          )}
                          {station.rest_time && (
                            <span className="text-synthwave-text-secondary">
                              Rest: {station.rest_time}s
                            </span>
                          )}
                          {station.reps && (
                            <span className="text-synthwave-text-secondary">
                              × {station.reps} reps
                            </span>
                          )}
                          {station.weight && (
                            <span className="text-synthwave-text-secondary">
                              {station.weight}
                              {station.weight_unit || "lbs"}
                            </span>
                          )}
                          {station.equipment && (
                            <span className="text-synthwave-text-secondary italic">
                              ({station.equipment})
                            </span>
                          )}
                        </div>
                        {station.notes && (
                          <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary italic">
                            {station.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance Data */}
              {circuitTrainingData?.performance_data && (
                <div>
                  <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                    Performance
                  </h4>
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                    <div className="flex flex-wrap gap-4 text-sm font-rajdhani">
                      {circuitTrainingData.performance_data.total_time && (
                        <span className="text-synthwave-text-secondary">
                          <span className="text-synthwave-neon-cyan">
                            Total Time:
                          </span>{" "}
                          {formatTime(
                            circuitTrainingData.performance_data.total_time,
                          )}
                        </span>
                      )}
                      {circuitTrainingData.performance_data
                        .rounds_completed && (
                        <span className="text-synthwave-text-secondary">
                          <span className="text-synthwave-neon-cyan">
                            Rounds Completed:
                          </span>{" "}
                          {
                            circuitTrainingData.performance_data
                              .rounds_completed
                          }
                        </span>
                      )}
                      {circuitTrainingData.performance_data.total_work_time && (
                        <span className="text-synthwave-text-secondary">
                          <span className="text-synthwave-neon-cyan">
                            Work Time:
                          </span>{" "}
                          {formatTime(
                            circuitTrainingData.performance_data
                              .total_work_time,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
              <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                No Circuit Training data available. Include station details,
                work/rest times, and exercises when logging.
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
