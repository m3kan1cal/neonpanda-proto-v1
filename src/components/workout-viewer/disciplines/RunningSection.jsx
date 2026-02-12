import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";

// Value display component
const ValueDisplay = ({ label, value, dataPath, className = "" }) => {
  if (value === null || value === undefined) return null;

  return (
    <div
      className={`flex justify-between items-center py-1 ${className}`}
      data-json-path={dataPath}
    >
      <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
        {label}:
      </span>
      <span
        className="text-synthwave-text-primary font-rajdhani text-base"
        data-json-value={JSON.stringify(value)}
      >
        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </span>
    </div>
  );
};

// Running segment display - matches WorkoutViewerV2.jsx exactly
const RunningSegmentDisplay = ({ segment, segmentIndex }) => {
  return (
    <div className="py-2">
      {/* Segment Name and All Details on One Line */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-rajdhani">
        <span className="font-bold text-synthwave-neon-cyan text-sm capitalize">
          Segment {segment.segment_number}: {segment.segment_type}
        </span>

        {segment.distance && (
          <span className="text-synthwave-text-secondary">
            {segment.distance}
          </span>
        )}

        {segment.time && (
          <span className="text-synthwave-text-secondary">
            {Math.floor(segment.time / 60)}:
            {String(segment.time % 60).padStart(2, "0")}
          </span>
        )}

        {segment.pace && (
          <span className="text-synthwave-text-secondary">{segment.pace}</span>
        )}

        {segment.heart_rate_avg && (
          <span className="text-synthwave-text-secondary">
            Avg HR: {segment.heart_rate_avg} bpm
          </span>
        )}

        {segment.heart_rate_max && (
          <span className="text-synthwave-text-secondary">
            Max HR: {segment.heart_rate_max} bpm
          </span>
        )}

        {segment.cadence && (
          <span className="text-synthwave-text-secondary">
            Cadence: {segment.cadence} spm
          </span>
        )}

        {segment.elevation_change && (
          <span className="text-synthwave-text-secondary">
            {segment.elevation_change > 0 ? "+" : ""}
            {segment.elevation_change}ft
          </span>
        )}

        {segment.terrain && (
          <span className="text-synthwave-text-muted uppercase ml-auto">
            {segment.terrain}
          </span>
        )}

        {segment.effort_level && (
          <span
            className={`${badgePatterns.workoutBadgeBase} ml-auto ${
              segment.effort_level === "max"
                ? badgePatterns.workoutBadgePink
                : segment.effort_level === "hard"
                  ? badgePatterns.workoutBadgeCyan
                  : segment.effort_level === "moderate" ||
                      segment.effort_level === "easy" ||
                      segment.effort_level === "recovery"
                    ? badgePatterns.workoutBadgePurple
                    : badgePatterns.workoutBadgeCyan
            }`}
          >
            {segment.effort_level}
          </span>
        )}
      </div>

      {/* Notes on Second Line if Present */}
      {segment.notes && (
        <div className="mt-1 text-sm font-rajdhani text-synthwave-text-secondary italic">
          {segment.notes}
        </div>
      )}
    </div>
  );
};

// Running details display - matches WorkoutViewerV2.jsx exactly
const RunningDetails = ({ runningData, containerPatterns }) => {
  if (!runningData) return null;

  return (
    <div className="space-y-3">
      {runningData.weather && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
            Weather Conditions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {runningData.weather.temperature && (
              <ValueDisplay
                label="Temperature"
                value={`${runningData.weather.temperature}°${runningData.weather.temperature_unit || "F"}`}
                dataPath="workoutData.discipline_specific.running.weather.temperature"
              />
            )}
            {runningData.weather.conditions && (
              <ValueDisplay
                label="Conditions"
                value={runningData.weather.conditions}
                dataPath="workoutData.discipline_specific.running.weather.conditions"
              />
            )}
            {runningData.weather.wind_speed && (
              <ValueDisplay
                label="Wind Speed"
                value={`${runningData.weather.wind_speed} mph`}
                dataPath="workoutData.discipline_specific.running.weather.wind_speed"
              />
            )}
            {runningData.weather.humidity && (
              <ValueDisplay
                label="Humidity"
                value={`${runningData.weather.humidity}%`}
                dataPath="workoutData.discipline_specific.running.weather.humidity"
              />
            )}
          </div>
        </div>
      )}

      {runningData.equipment && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
            Equipment
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {runningData.equipment.shoes && (
              <ValueDisplay
                label="Shoes"
                value={runningData.equipment.shoes}
                dataPath="workoutData.discipline_specific.running.equipment.shoes"
              />
            )}
            {runningData.equipment.wearable && (
              <ValueDisplay
                label="Wearable"
                value={runningData.equipment.wearable}
                dataPath="workoutData.discipline_specific.running.equipment.wearable"
              />
            )}
            {runningData.equipment.other_gear &&
              runningData.equipment.other_gear.length > 0 && (
                <div className="col-span-2">
                  <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
                    Other Gear:{" "}
                  </span>
                  <span className="text-synthwave-text-primary font-rajdhani text-base">
                    {runningData.equipment.other_gear.join(", ")}
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      {runningData.route &&
        (runningData.route.name || runningData.route.description) && (
          <div className={containerPatterns.workoutDescriptionEditable}>
            {runningData.route.name && (
              <>
                <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">
                  Route:{" "}
                </span>
                <span
                  className="text-synthwave-text-primary font-rajdhani text-base"
                  data-json-path="workoutData.discipline_specific.running.route.name"
                  data-json-value={JSON.stringify(runningData.route.name)}
                >
                  {runningData.route.name}
                </span>
                {runningData.route.type && (
                  <span className="text-synthwave-text-secondary font-rajdhani text-sm ml-2">
                    ({runningData.route.type.replace(/_/g, " ")})
                  </span>
                )}
              </>
            )}
            {runningData.route.description && (
              <div className="mt-1">
                <span
                  className="text-synthwave-text-secondary font-rajdhani text-base"
                  data-json-path="workoutData.discipline_specific.running.route.description"
                  data-json-value={JSON.stringify(
                    runningData.route.description,
                  )}
                >
                  {runningData.route.description}
                </span>
              </div>
            )}
          </div>
        )}

      {(runningData.warmup || runningData.cooldown) && (
        <div className="grid grid-cols-2 gap-4">
          {runningData.warmup && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
                Warmup
              </h4>
              <div className="space-y-1">
                {runningData.warmup.distance && (
                  <ValueDisplay
                    label="Distance"
                    value={`${runningData.warmup.distance} ${runningData.distance_unit}`}
                    dataPath="workoutData.discipline_specific.running.warmup.distance"
                  />
                )}
                {runningData.warmup.time && (
                  <ValueDisplay
                    label="Time"
                    value={`${Math.floor(runningData.warmup.time / 60)}:${String(runningData.warmup.time % 60).padStart(2, "0")}`}
                    dataPath="workoutData.discipline_specific.running.warmup.time"
                  />
                )}
                {runningData.warmup.description && (
                  <div
                    className="text-synthwave-text-secondary font-rajdhani text-sm"
                    data-json-path="workoutData.discipline_specific.running.warmup.description"
                    data-json-value={JSON.stringify(
                      runningData.warmup.description,
                    )}
                  >
                    {runningData.warmup.description}
                  </div>
                )}
              </div>
            </div>
          )}

          {runningData.cooldown && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
                Cooldown
              </h4>
              <div className="space-y-1">
                {runningData.cooldown.distance && (
                  <ValueDisplay
                    label="Distance"
                    value={`${runningData.cooldown.distance} ${runningData.distance_unit}`}
                    dataPath="workoutData.discipline_specific.running.cooldown.distance"
                  />
                )}
                {runningData.cooldown.time && (
                  <ValueDisplay
                    label="Time"
                    value={`${Math.floor(runningData.cooldown.time / 60)}:${String(runningData.cooldown.time % 60).padStart(2, "0")}`}
                    dataPath="workoutData.discipline_specific.running.cooldown.time"
                  />
                )}
                {runningData.cooldown.description && (
                  <div
                    className="text-synthwave-text-secondary font-rajdhani text-sm"
                    data-json-path="workoutData.discipline_specific.running.cooldown.description"
                    data-json-value={JSON.stringify(
                      runningData.cooldown.description,
                    )}
                  >
                    {runningData.cooldown.description}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {runningData.fueling &&
        (runningData.fueling.pre_run ||
          runningData.fueling.during_run ||
          runningData.fueling.hydration_oz) && (
          <div>
            <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
              Nutrition & Hydration
            </h4>
            <div className="space-y-2">
              {runningData.fueling.pre_run && (
                <div
                  className={`p-2 ${containerPatterns.workoutDescriptionEditable}`}
                >
                  <span className="text-synthwave-neon-cyan font-rajdhani text-sm font-medium">
                    Pre-Run:{" "}
                  </span>
                  <span
                    className="text-synthwave-text-secondary font-rajdhani text-sm"
                    data-json-path="workoutData.discipline_specific.running.fueling.pre_run"
                    data-json-value={JSON.stringify(
                      runningData.fueling.pre_run,
                    )}
                  >
                    {runningData.fueling.pre_run}
                  </span>
                </div>
              )}
              {runningData.fueling.during_run &&
                runningData.fueling.during_run.length > 0 && (
                  <div
                    className={`p-2 ${containerPatterns.workoutDescriptionEditable}`}
                  >
                    <span className="text-synthwave-neon-cyan font-rajdhani text-sm font-medium">
                      During Run:{" "}
                    </span>
                    <span className="text-synthwave-text-secondary font-rajdhani text-sm">
                      {runningData.fueling.during_run.join(", ")}
                    </span>
                  </div>
                )}
              {runningData.fueling.hydration_oz && (
                <ValueDisplay
                  label="Total Hydration"
                  value={`${runningData.fueling.hydration_oz} oz`}
                  dataPath="workoutData.discipline_specific.running.fueling.hydration_oz"
                />
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export const RunningSection = ({
  runningData,
  sectionIds,
  collapsedSections,
  toggleCollapse,
  containerPatterns,
}) => {
  if (!runningData && !true) return null; // Remove || true after styling review

  const [detailsId, segmentsId] = sectionIds;

  return (
    <>
      {/* Section 6: Running Details */}
      {(runningData || true) && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
              collapsedSections.has(detailsId) ? "rounded-2xl" : "rounded-t-2xl"
            }`}
            onClick={() => toggleCollapse(detailsId)}
          >
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Running Details
              </h3>
            </div>
            <svg
              className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(detailsId) ? "rotate-180" : ""}`}
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
          {!collapsedSections.has(detailsId) && (
            <div className="px-6 pb-6">
              {runningData ? (
                <RunningDetails
                  runningData={runningData}
                  containerPatterns={containerPatterns}
                />
              ) : (
                <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                  <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                    No running details data available for this workout.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 7: Running Segments */}
      {(runningData?.segments?.length > 0 || true) && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
              collapsedSections.has(segmentsId)
                ? "rounded-2xl"
                : "rounded-t-2xl"
            }`}
            onClick={() => toggleCollapse(segmentsId)}
          >
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Run Segments ({runningData?.segments?.length || 0})
              </h3>
            </div>
            <svg
              className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(segmentsId) ? "rotate-180" : ""}`}
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
          {!collapsedSections.has(segmentsId) && (
            <div className="px-6 pb-6">
              {runningData?.segments?.length > 0 ? (
                <div className="space-y-3">
                  {runningData.segments.map((segment, index) => (
                    <RunningSegmentDisplay
                      key={index}
                      segment={segment}
                      segmentIndex={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                  <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                    No running segments data available for this workout.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Badge Color Legend */}
          {(runningData?.run_type || runningData?.segments) && <BadgeLegend />}
        </div>
      )}
    </>
  );
};
