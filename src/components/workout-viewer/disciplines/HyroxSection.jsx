import React from "react";
import { BadgeLegend } from "../BadgeLegend";

export const HyroxSection = ({
  hyroxData,
  sectionId,
  collapsedSections,
  toggleCollapse,
  containerPatterns,
}) => {
  if (!hyroxData?.stations && !hyroxData?.runs && !true) return null;

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
            Hyrox Race ({hyroxData?.stations?.length || 0} stations,{" "}
            {hyroxData?.runs?.length || 0} runs)
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
          {hyroxData?.stations?.length > 0 || hyroxData?.runs?.length > 0 ? (
            <div className="space-y-3">
              {/* Stations */}
              {hyroxData?.stations?.length > 0 && (
                <div>
                  <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                    Stations
                  </h4>
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
                    <div className="space-y-2">
                      {hyroxData.stations.map((station, idx) => (
                        <div key={idx} className="py-2">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                            <span className="font-bold text-synthwave-neon-cyan text-sm">
                              Station {station.station_number}:{" "}
                              {station.station_name}
                            </span>
                            {station.distance && (
                              <span className="text-synthwave-text-secondary">
                                {station.distance}m
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
                                {station.weight_unit || "kg"}
                              </span>
                            )}
                            {station.time && (
                              <span className="text-synthwave-text-secondary">
                                Time: {Math.floor(station.time / 60)}:
                                {String(station.time % 60).padStart(2, "0")}
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
              )}
              {/* Runs */}
              {hyroxData?.runs?.length > 0 && (
                <div>
                  <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                    Runs
                  </h4>
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
                    <div className="space-y-2">
                      {hyroxData.runs.map((run, idx) => (
                        <div key={idx} className="py-2">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
                            <span className="font-bold text-synthwave-neon-cyan text-sm">
                              Run {run.run_number}
                            </span>
                            <span className="text-synthwave-text-secondary">
                              {run.distance}m
                            </span>
                            {run.time && (
                              <span className="text-synthwave-text-secondary">
                                Time: {Math.floor(run.time / 60)}:
                                {String(run.time % 60).padStart(2, "0")}
                              </span>
                            )}
                            {run.pace && (
                              <span className="text-synthwave-text-secondary">
                                Pace: {run.pace}/km
                              </span>
                            )}
                          </div>
                          {run.notes && (
                            <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary italic">
                              {run.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
              <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                No Hyrox data available. Include station details, times,
                weights, and run splits when logging.
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
