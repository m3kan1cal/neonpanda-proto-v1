import React from "react";
import { ValueDisplay } from "../../shared/ValueDisplay";
import { formatDistanceUnit } from "../../shared/distanceFormatters";
import {
  SectionHeader,
  TargetIcon,
} from "../../themes/SynthwaveComponents";

/**
 * RuckingSection
 *
 * Viewer for rucking workouts (structured loaded-march training). Hero metrics
 * (distance, pack weight, pace) render upstream in the Performance Metrics
 * row; this section shows ruck type, cadence, event context, and segments.
 */

const RuckingSegmentDisplay = ({ segment, distanceUnit }) => {
  const distLabel = formatDistanceUnit(distanceUnit);
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
        {segment.duration_min && (
          <span className="text-synthwave-text-secondary">
            {segment.duration_min} min
          </span>
        )}
        {segment.pace && (
          <span className="text-synthwave-text-secondary">{segment.pace}</span>
        )}
        {segment.pack_weight_lb ? (
          <span className="text-synthwave-text-secondary">
            {segment.pack_weight_lb}lb pack
          </span>
        ) : null}
        {segment.cadence ? (
          <span className="text-synthwave-text-secondary">
            {segment.cadence} spm
          </span>
        ) : null}
      </div>
      {segment.notes && (
        <div className="mt-1 text-sm font-body text-synthwave-text-secondary italic">
          {segment.notes}
        </div>
      )}
    </div>
  );
};

const RuckingDetails = ({ ruckingData, containerPatterns }) => {
  if (!ruckingData) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ruckingData.ruck_type && (
          <ValueDisplay
            label="Ruck Type"
            value={ruckingData.ruck_type}
            dataPath="workoutData.discipline_specific.rucking.ruck_type"
          />
        )}
        {ruckingData.event_name && (
          <ValueDisplay
            label="Event"
            value={ruckingData.event_name}
            dataPath="workoutData.discipline_specific.rucking.event_name"
          />
        )}
        {ruckingData.pack_weight != null && (
          <ValueDisplay
            label="Pack Weight"
            value={`${ruckingData.pack_weight} ${ruckingData.pack_weight_unit || "lbs"}`}
            dataPath="workoutData.discipline_specific.rucking.pack_weight"
          />
        )}
        {ruckingData.cadence != null && (
          <ValueDisplay
            label="Cadence"
            value={`${ruckingData.cadence} spm`}
            dataPath="workoutData.discipline_specific.rucking.cadence"
          />
        )}
        {ruckingData.surface && (
          <ValueDisplay
            label="Surface"
            value={ruckingData.surface}
            dataPath="workoutData.discipline_specific.rucking.surface"
          />
        )}
        {ruckingData.elevation_gain != null && (
          <ValueDisplay
            label="Elevation Gain"
            value={`${ruckingData.elevation_gain} ${ruckingData.elevation_unit || "ft"}`}
            dataPath="workoutData.discipline_specific.rucking.elevation_gain"
          />
        )}
      </div>

      {ruckingData.notes && (
        <div className={containerPatterns.workoutDescriptionEditable}>
          <span className="text-synthwave-neon-cyan font-body text-base font-medium">
            Notes:{" "}
          </span>
          <span className="text-synthwave-text-primary font-body text-base">
            {ruckingData.notes}
          </span>
        </div>
      )}
    </div>
  );
};

export const RuckingSection = ({
  ruckingData,
  sectionIds,
  collapsedSections,
  toggleCollapse,
  containerPatterns,
}) => {
  const [detailsId, segmentsId] = sectionIds || [
    "rucking_details",
    "rucking_segments",
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
          <SectionHeader icon={TargetIcon} color="purple">
            Rucking Details
          </SectionHeader>
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
            {ruckingData ? (
              <RuckingDetails
                ruckingData={ruckingData}
                containerPatterns={containerPatterns}
              />
            ) : (
              <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-xl p-4">
                <div className="text-synthwave-text-secondary font-body text-sm">
                  No rucking details available for this workout.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {ruckingData?.segments?.length > 0 && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
              collapsedSections.has(segmentsId) ? "rounded-xl" : "rounded-t-xl"
            }`}
            onClick={() => toggleCollapse(segmentsId)}
          >
            <SectionHeader icon={TargetIcon} color="purple">
              Ruck Segments ({ruckingData.segments.length})
            </SectionHeader>
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
                {ruckingData.segments.map((segment, index) => (
                  <RuckingSegmentDisplay
                    key={index}
                    segment={segment}
                    distanceUnit={ruckingData.distance_unit}
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
