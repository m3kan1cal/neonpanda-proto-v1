import React from "react";
import { ValueDisplay } from "../../shared/ValueDisplay";

/**
 * BackpackingSection
 *
 * Viewer for backpacking workouts (trail + pack context, including
 * mountaineering prep). Hero metrics (distance, vert, pack weight, duration)
 * render in the upstream Performance Metrics row; this section shows
 * trip-level context, segments, fueling, and equipment.
 */

// Moving time comes from extraction in seconds (e.g. "7h moving" → 25200).
// Render it in a friendly Hh Mm / Mm format without surprising the reader.
const formatMovingTime = (seconds) => {
  if (seconds == null) return null;
  const total = Math.round(Number(seconds));
  if (!Number.isFinite(total) || total <= 0) return null;
  const totalMinutes = Math.round(total / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};
const BackpackingSegmentDisplay = ({ segment }) => {
  return (
    <div className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-body">
        <span className="font-bold text-synthwave-neon-cyan text-sm capitalize">
          Segment {segment.segment_number}
          {segment.segment_type ? `: ${segment.segment_type}` : ""}
        </span>
        {segment.distance && (
          <span className="text-synthwave-text-secondary">
            {segment.distance} mi
          </span>
        )}
        {segment.duration_min && (
          <span className="text-synthwave-text-secondary">
            {segment.duration_min} min
          </span>
        )}
        {segment.pack_weight_lb ? (
          <span className="text-synthwave-text-secondary">
            {segment.pack_weight_lb}lb pack
          </span>
        ) : null}
        {segment.elevation_gain_ft ? (
          <span className="text-synthwave-text-secondary">
            +{segment.elevation_gain_ft}ft
          </span>
        ) : null}
        {segment.elevation_loss_ft ? (
          <span className="text-synthwave-text-secondary">
            -{segment.elevation_loss_ft}ft
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

const BackpackingDetails = ({ backpackingData, containerPatterns }) => {
  if (!backpackingData) return null;

  const tripRange =
    backpackingData.trip_day && backpackingData.total_trip_days
      ? `Day ${backpackingData.trip_day} of ${backpackingData.total_trip_days}`
      : backpackingData.trip_day
        ? `Day ${backpackingData.trip_day}`
        : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {backpackingData.trip_name && (
          <ValueDisplay
            label="Trip"
            value={backpackingData.trip_name}
            dataPath="workoutData.discipline_specific.backpacking.trip_name"
          />
        )}
        {tripRange && (
          <ValueDisplay
            label="Trip Day"
            value={tripRange}
            dataPath="workoutData.discipline_specific.backpacking.trip_day"
          />
        )}
        {backpackingData.pack_weight != null && (
          <ValueDisplay
            label="Pack Weight"
            value={`${backpackingData.pack_weight} ${backpackingData.pack_weight_unit || "lbs"}`}
            dataPath="workoutData.discipline_specific.backpacking.pack_weight"
          />
        )}
        {backpackingData.surface && (
          <ValueDisplay
            label="Surface"
            value={backpackingData.surface}
            dataPath="workoutData.discipline_specific.backpacking.surface"
          />
        )}
        {formatMovingTime(backpackingData.moving_time) && (
          <ValueDisplay
            label="Moving Time"
            value={formatMovingTime(backpackingData.moving_time)}
            dataPath="workoutData.discipline_specific.backpacking.moving_time"
          />
        )}
      </div>

      {backpackingData.terrain_notes && (
        <div className={containerPatterns.workoutDescriptionEditable}>
          <span className="text-synthwave-neon-cyan font-body text-base font-medium">
            Terrain Notes:{" "}
          </span>
          <span className="text-synthwave-text-primary font-body text-base">
            {backpackingData.terrain_notes}
          </span>
        </div>
      )}

      {backpackingData.notes && (
        <div className={containerPatterns.workoutDescriptionEditable}>
          <span className="text-synthwave-neon-cyan font-body text-base font-medium">
            Notes:{" "}
          </span>
          <span className="text-synthwave-text-primary font-body text-base">
            {backpackingData.notes}
          </span>
        </div>
      )}
    </div>
  );
};

export const BackpackingSection = ({
  backpackingData,
  sectionIds,
  collapsedSections,
  toggleCollapse,
  containerPatterns,
}) => {
  const [detailsId, segmentsId] = sectionIds || [
    "backpacking_details",
    "backpacking_segments",
  ];

  return (
    <>
      <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
        <div
          className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
            collapsedSections.has(detailsId) ? "rounded-md" : "rounded-t-md"
          }`}
          onClick={() => toggleCollapse(detailsId)}
        >
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 rounded-full bg-synthwave-neon-cyan shrink-0 mt-2" />
            <h3 className="font-header font-bold text-white text-lg uppercase">
              Backpacking Details
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
            {backpackingData ? (
              <BackpackingDetails
                backpackingData={backpackingData}
                containerPatterns={containerPatterns}
              />
            ) : (
              <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
                <div className="text-synthwave-text-secondary font-body text-sm">
                  No backpacking details available for this workout.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {backpackingData?.segments?.length > 0 && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
              collapsedSections.has(segmentsId) ? "rounded-md" : "rounded-t-md"
            }`}
            onClick={() => toggleCollapse(segmentsId)}
          >
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-synthwave-neon-cyan shrink-0 mt-2" />
              <h3 className="font-header font-bold text-white text-lg uppercase">
                Backpacking Segments ({backpackingData.segments.length})
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
                {backpackingData.segments.map((segment, index) => (
                  <BackpackingSegmentDisplay key={index} segment={segment} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
