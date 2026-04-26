import React from "react";
import { ValueDisplay } from "../../shared/ValueDisplay";
import { formatDistanceUnit } from "../../shared/distanceFormatters";

/**
 * TrailRunningSection
 *
 * Viewer for trail_running workouts. Hero metrics (distance, vert, pace) live
 * in the Performance Metrics row upstream; this section shows the remaining
 * context: surface/technicality, ultra/race flag, segments, fueling, weather.
 *
 * Keep this lean for MVP — once trail_running has its own schema plugin we
 * can layer in the same depth as RunningSection.
 */
// Segment units inherit from the parent trail run: trail_running schema
// exposes distance_unit ("miles" | "km") and elevation_unit ("ft" | "m").
// Default to miles/ft if the parent didn't set them (matches US voice).

const TrailRunningSegmentDisplay = ({
  segment,
  distanceUnit,
  elevationUnit,
}) => {
  const distLabel = formatDistanceUnit(distanceUnit);
  const elevLabel = elevationUnit === "m" ? "m" : "ft";
  return (
    <div className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-body">
        <span className="font-bold text-synthwave-neon-cyan text-sm capitalize">
          Segment {segment.segment_number}
          {segment.segment_type ? `: ${segment.segment_type}` : ""}
        </span>
        {segment.distance && (
          <span className="text-synthwave-text-secondary">
            {segment.distance} {distLabel}
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
        {segment.elevation_gain ? (
          <span className="text-synthwave-text-secondary">
            +{segment.elevation_gain}
            {elevLabel}
          </span>
        ) : null}
        {segment.elevation_loss ? (
          <span className="text-synthwave-text-secondary">
            -{segment.elevation_loss}
            {elevLabel}
          </span>
        ) : null}
        {segment.surface && (
          <span className="text-synthwave-text-muted uppercase ml-auto">
            {segment.surface}
          </span>
        )}
      </div>
      {segment.notes && (
        <div className="mt-1 text-sm font-body text-synthwave-text-secondary italic">
          {segment.notes}
        </div>
      )}
    </div>
  );
};

const TrailRunningDetails = ({ trailRunningData, containerPatterns }) => {
  if (!trailRunningData) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {trailRunningData.run_type && (
          <ValueDisplay
            label="Run Type"
            value={trailRunningData.run_type}
            dataPath="workoutData.discipline_specific.trail_running.run_type"
          />
        )}
        {trailRunningData.surface && (
          <ValueDisplay
            label="Surface"
            value={trailRunningData.surface}
            dataPath="workoutData.discipline_specific.trail_running.surface"
          />
        )}
        {trailRunningData.technicality && (
          <ValueDisplay
            label="Technicality"
            value={trailRunningData.technicality}
            dataPath="workoutData.discipline_specific.trail_running.technicality"
          />
        )}
        {trailRunningData.is_ultra && (
          <ValueDisplay
            label="Ultra"
            value="Yes"
            dataPath="workoutData.discipline_specific.trail_running.is_ultra"
          />
        )}
        {trailRunningData.race_name && (
          <ValueDisplay
            label="Race"
            value={trailRunningData.race_name}
            dataPath="workoutData.discipline_specific.trail_running.race_name"
          />
        )}
        {trailRunningData.vertical_meters_per_km != null && (
          <ValueDisplay
            label="VAM (m/km)"
            value={String(trailRunningData.vertical_meters_per_km)}
            dataPath="workoutData.discipline_specific.trail_running.vertical_meters_per_km"
          />
        )}
      </div>

      {trailRunningData.weather && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
            Weather Conditions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {trailRunningData.weather.temperature != null && (
              <ValueDisplay
                label="Temperature"
                value={`${trailRunningData.weather.temperature}°${trailRunningData.weather.temperature_unit || "F"}`}
                dataPath="workoutData.discipline_specific.trail_running.weather.temperature"
              />
            )}
            {trailRunningData.weather.conditions && (
              <ValueDisplay
                label="Conditions"
                value={trailRunningData.weather.conditions}
                dataPath="workoutData.discipline_specific.trail_running.weather.conditions"
              />
            )}
          </div>
        </div>
      )}

      {trailRunningData.notes && (
        <div className={containerPatterns.workoutDescriptionEditable}>
          <span className="text-synthwave-neon-cyan font-body text-base font-medium">
            Notes:{" "}
          </span>
          <span className="text-synthwave-text-primary font-body text-base">
            {trailRunningData.notes}
          </span>
        </div>
      )}
    </div>
  );
};

export const TrailRunningSection = ({
  trailRunningData,
  sectionIds,
  collapsedSections,
  toggleCollapse,
  containerPatterns,
}) => {
  const [detailsId, segmentsId] = sectionIds || [
    "trail_details",
    "trail_segments",
  ];

  return (
    <>
      <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
        <div
          className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
            collapsedSections.has(detailsId) ? "rounded-xl" : "rounded-t-xl"
          }`}
          onClick={() => toggleCollapse(detailsId)}
        >
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
            <h3 className="font-header font-bold text-white text-lg uppercase">
              Trail Running Details
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
            {trailRunningData ? (
              <TrailRunningDetails
                trailRunningData={trailRunningData}
                containerPatterns={containerPatterns}
              />
            ) : (
              <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-xl p-4">
                <div className="text-synthwave-text-secondary font-body text-sm">
                  No trail running details available for this workout.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {trailRunningData?.segments?.length > 0 && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
              collapsedSections.has(segmentsId) ? "rounded-xl" : "rounded-t-xl"
            }`}
            onClick={() => toggleCollapse(segmentsId)}
          >
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
              <h3 className="font-header font-bold text-white text-lg uppercase">
                Trail Segments ({trailRunningData.segments.length})
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
              <div className="space-y-3">
                {trailRunningData.segments.map((segment, index) => (
                  <TrailRunningSegmentDisplay
                    key={index}
                    segment={segment}
                    distanceUnit={trailRunningData.distance_unit}
                    elevationUnit={trailRunningData.elevation_unit}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
