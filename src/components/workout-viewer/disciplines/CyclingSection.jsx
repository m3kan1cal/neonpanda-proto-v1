import React from "react";
import { BadgeLegend } from "../BadgeLegend";
import { badgePatterns } from "../../../utils/ui/uiPatterns";
import { ValueDisplay } from "../../shared/ValueDisplay";
import { formatCyclingDuration } from "../../../utils/dateUtils";

// Cycling segment display
const CyclingSegmentDisplay = ({ segment, elevationUnit }) => {
  return (
    <div className="py-2">
      {/* Segment Name and All Details on One Line */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-body">
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
            {formatCyclingDuration(segment.time)}
          </span>
        )}

        {segment.average_speed && (
          <span className="text-synthwave-text-secondary">
            {segment.average_speed}
          </span>
        )}

        {segment.average_power && (
          <span className="text-synthwave-text-secondary">
            {segment.average_power}w avg
          </span>
        )}

        {segment.normalized_power && (
          <span className="text-synthwave-text-secondary">
            NP {segment.normalized_power}w
          </span>
        )}

        {segment.cadence && (
          <span className="text-synthwave-text-secondary">
            {segment.cadence} rpm
          </span>
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

        {segment.grade_percent != null && (
          <span className="text-synthwave-text-secondary">
            {segment.grade_percent > 0 ? "+" : ""}
            {segment.grade_percent}%
          </span>
        )}

        {segment.elevation_change && (
          <span className="text-synthwave-text-secondary">
            {segment.elevation_change > 0 ? "+" : ""}
            {segment.elevation_change}{elevationUnit || "ft"}
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
        <div className="mt-1 text-sm font-body text-synthwave-text-secondary italic">
          {segment.notes}
        </div>
      )}
    </div>
  );
};

// Cycling details display
const CyclingDetails = ({ cyclingData, containerPatterns }) => {
  if (!cyclingData) return null;

  const hasPowerMetrics =
    cyclingData.average_power ||
    cyclingData.normalized_power ||
    cyclingData.max_power ||
    cyclingData.ftp ||
    cyclingData.intensity_factor ||
    cyclingData.training_stress_score;

  const hasPowerZones =
    cyclingData.power_zones_distribution &&
    Object.values(cyclingData.power_zones_distribution).some(
      (v) => v !== null && v !== undefined,
    );

  return (
    <div className="space-y-3">
      {/* Power Metrics — core to cycling */}
      {hasPowerMetrics && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
            Power Metrics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {cyclingData.average_power && (
              <ValueDisplay
                label="Avg Power"
                value={`${cyclingData.average_power}w`}
                dataPath="workoutData.discipline_specific.cycling.average_power"
              />
            )}
            {cyclingData.normalized_power && (
              <ValueDisplay
                label="NP"
                value={`${cyclingData.normalized_power}w`}
                dataPath="workoutData.discipline_specific.cycling.normalized_power"
              />
            )}
            {cyclingData.max_power && (
              <ValueDisplay
                label="Max Power"
                value={`${cyclingData.max_power}w`}
                dataPath="workoutData.discipline_specific.cycling.max_power"
              />
            )}
            {cyclingData.ftp && (
              <ValueDisplay
                label="FTP"
                value={`${cyclingData.ftp}w`}
                dataPath="workoutData.discipline_specific.cycling.ftp"
              />
            )}
            {cyclingData.intensity_factor && (
              <ValueDisplay
                label="IF"
                value={cyclingData.intensity_factor.toFixed(2)}
                dataPath="workoutData.discipline_specific.cycling.intensity_factor"
              />
            )}
            {cyclingData.training_stress_score && (
              <ValueDisplay
                label="TSS"
                value={cyclingData.training_stress_score}
                dataPath="workoutData.discipline_specific.cycling.training_stress_score"
              />
            )}
          </div>
        </div>
      )}

      {/* Power Zone Distribution */}
      {hasPowerZones && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
            Power Zone Distribution
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: "zone1", label: "Z1 Recovery" },
              { key: "zone2", label: "Z2 Endurance" },
              { key: "zone3", label: "Z3 Tempo" },
              { key: "zone4", label: "Z4 Threshold" },
              { key: "zone5", label: "Z5 VO2max" },
              { key: "zone6", label: "Z6 Anaerobic" },
              { key: "zone7", label: "Z7 Neuromuscular" },
            ].map(({ key, label }) => {
              const seconds = cyclingData.power_zones_distribution[key];
              if (!seconds) return null;
              return (
                <ValueDisplay
                  key={key}
                  label={label}
                  value={formatCyclingDuration(seconds)}
                  dataPath={`workoutData.discipline_specific.cycling.power_zones_distribution.${key}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Cadence & Heart Rate */}
      {(cyclingData.average_cadence ||
        cyclingData.average_heart_rate ||
        cyclingData.max_heart_rate) && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
            Cadence & Heart Rate
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {cyclingData.average_cadence && (
              <ValueDisplay
                label="Avg Cadence"
                value={`${cyclingData.average_cadence} rpm`}
                dataPath="workoutData.discipline_specific.cycling.average_cadence"
              />
            )}
            {cyclingData.average_heart_rate && (
              <ValueDisplay
                label="Avg HR"
                value={`${cyclingData.average_heart_rate} bpm`}
                dataPath="workoutData.discipline_specific.cycling.average_heart_rate"
              />
            )}
            {cyclingData.max_heart_rate && (
              <ValueDisplay
                label="Max HR"
                value={`${cyclingData.max_heart_rate} bpm`}
                dataPath="workoutData.discipline_specific.cycling.max_heart_rate"
              />
            )}
          </div>
        </div>
      )}

      {/* Weather */}
      {cyclingData.weather && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
            Weather Conditions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {cyclingData.weather.temperature != null && (
              <ValueDisplay
                label="Temperature"
                value={`${cyclingData.weather.temperature}°${cyclingData.weather.temperature_unit || "F"}`}
                dataPath="workoutData.discipline_specific.cycling.weather.temperature"
              />
            )}
            {cyclingData.weather.conditions && (
              <ValueDisplay
                label="Conditions"
                value={cyclingData.weather.conditions}
                dataPath="workoutData.discipline_specific.cycling.weather.conditions"
              />
            )}
            {cyclingData.weather.wind_speed != null && (
              <ValueDisplay
                label="Wind Speed"
                value={`${cyclingData.weather.wind_speed}`}
                dataPath="workoutData.discipline_specific.cycling.weather.wind_speed"
              />
            )}
            {cyclingData.weather.humidity && (
              <ValueDisplay
                label="Humidity"
                value={`${cyclingData.weather.humidity}%`}
                dataPath="workoutData.discipline_specific.cycling.weather.humidity"
              />
            )}
          </div>
        </div>
      )}

      {/* Equipment */}
      {cyclingData.equipment && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
            Equipment
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {cyclingData.equipment.bike_type && (
              <ValueDisplay
                label="Bike Type"
                value={cyclingData.equipment.bike_type}
                dataPath="workoutData.discipline_specific.cycling.equipment.bike_type"
              />
            )}
            {cyclingData.equipment.bike_model && (
              <ValueDisplay
                label="Bike"
                value={cyclingData.equipment.bike_model}
                dataPath="workoutData.discipline_specific.cycling.equipment.bike_model"
              />
            )}
            {cyclingData.equipment.power_meter && (
              <ValueDisplay
                label="Power Meter"
                value={cyclingData.equipment.power_meter}
                dataPath="workoutData.discipline_specific.cycling.equipment.power_meter"
              />
            )}
            {cyclingData.equipment.indoor_trainer && (
              <ValueDisplay
                label="Trainer"
                value={cyclingData.equipment.indoor_trainer}
                dataPath="workoutData.discipline_specific.cycling.equipment.indoor_trainer"
              />
            )}
            {cyclingData.equipment.wearable && (
              <ValueDisplay
                label="Wearable"
                value={cyclingData.equipment.wearable}
                dataPath="workoutData.discipline_specific.cycling.equipment.wearable"
              />
            )}
            {cyclingData.equipment.other_gear &&
              cyclingData.equipment.other_gear.length > 0 && (
                <div className="col-span-2">
                  <span className="text-synthwave-neon-pink font-body text-base font-medium">
                    Other Gear:{" "}
                  </span>
                  <span className="text-synthwave-text-primary font-body text-base">
                    {cyclingData.equipment.other_gear.join(", ")}
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Route */}
      {cyclingData.route &&
        (cyclingData.route.name || cyclingData.route.description) && (
          <div className={containerPatterns.workoutDescriptionEditable}>
            {cyclingData.route.name && (
              <>
                <span className="text-synthwave-neon-cyan font-body text-base font-medium">
                  Route:{" "}
                </span>
                <span
                  className="text-synthwave-text-primary font-body text-base"
                  data-json-path="workoutData.discipline_specific.cycling.route.name"
                  data-json-value={JSON.stringify(cyclingData.route.name)}
                >
                  {cyclingData.route.name}
                </span>
                {cyclingData.route.type && (
                  <span className="text-synthwave-text-secondary font-body text-sm ml-2">
                    ({cyclingData.route.type.replace(/_/g, " ")})
                  </span>
                )}
              </>
            )}
            {cyclingData.route.description && (
              <div className="mt-1">
                <span
                  className="text-synthwave-text-secondary font-body text-base"
                  data-json-path="workoutData.discipline_specific.cycling.route.description"
                  data-json-value={JSON.stringify(cyclingData.route.description)}
                >
                  {cyclingData.route.description}
                </span>
              </div>
            )}
          </div>
        )}

      {/* Warmup / Cooldown */}
      {(cyclingData.warmup || cyclingData.cooldown) && (
        <div className="grid grid-cols-2 gap-4">
          {cyclingData.warmup && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
                Warmup
              </h4>
              <div className="space-y-1">
                {cyclingData.warmup.distance && (
                  <ValueDisplay
                    label="Distance"
                    value={`${cyclingData.warmup.distance} ${cyclingData.distance_unit}`}
                    dataPath="workoutData.discipline_specific.cycling.warmup.distance"
                  />
                )}
                {cyclingData.warmup.time && (
                  <ValueDisplay
                    label="Time"
                    value={formatCyclingDuration(cyclingData.warmup.time)}
                    dataPath="workoutData.discipline_specific.cycling.warmup.time"
                  />
                )}
                {cyclingData.warmup.description && (
                  <div
                    className="text-synthwave-text-secondary font-body text-sm"
                    data-json-path="workoutData.discipline_specific.cycling.warmup.description"
                    data-json-value={JSON.stringify(cyclingData.warmup.description)}
                  >
                    {cyclingData.warmup.description}
                  </div>
                )}
              </div>
            </div>
          )}

          {cyclingData.cooldown && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
                Cooldown
              </h4>
              <div className="space-y-1">
                {cyclingData.cooldown.distance && (
                  <ValueDisplay
                    label="Distance"
                    value={`${cyclingData.cooldown.distance} ${cyclingData.distance_unit}`}
                    dataPath="workoutData.discipline_specific.cycling.cooldown.distance"
                  />
                )}
                {cyclingData.cooldown.time && (
                  <ValueDisplay
                    label="Time"
                    value={formatCyclingDuration(cyclingData.cooldown.time)}
                    dataPath="workoutData.discipline_specific.cycling.cooldown.time"
                  />
                )}
                {cyclingData.cooldown.description && (
                  <div
                    className="text-synthwave-text-secondary font-body text-sm"
                    data-json-path="workoutData.discipline_specific.cycling.cooldown.description"
                    data-json-value={JSON.stringify(cyclingData.cooldown.description)}
                  >
                    {cyclingData.cooldown.description}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fueling */}
      {cyclingData.fueling &&
        (cyclingData.fueling.pre_ride ||
          cyclingData.fueling.during_ride ||
          cyclingData.fueling.hydration_oz) && (
          <div>
            <h4 className="text-synthwave-neon-cyan font-body font-bold text-base mb-2">
              Nutrition & Hydration
            </h4>
            <div className="space-y-2">
              {cyclingData.fueling.pre_ride && (
                <div
                  className={`p-2 ${containerPatterns.workoutDescriptionEditable}`}
                >
                  <span className="text-synthwave-neon-cyan font-body text-sm font-medium">
                    Pre-Ride:{" "}
                  </span>
                  <span
                    className="text-synthwave-text-secondary font-body text-sm"
                    data-json-path="workoutData.discipline_specific.cycling.fueling.pre_ride"
                    data-json-value={JSON.stringify(cyclingData.fueling.pre_ride)}
                  >
                    {cyclingData.fueling.pre_ride}
                  </span>
                </div>
              )}
              {cyclingData.fueling.during_ride &&
                cyclingData.fueling.during_ride.length > 0 && (
                  <div
                    className={`p-2 ${containerPatterns.workoutDescriptionEditable}`}
                  >
                    <span className="text-synthwave-neon-cyan font-body text-sm font-medium">
                      During Ride:{" "}
                    </span>
                    <span className="text-synthwave-text-secondary font-body text-sm">
                      {cyclingData.fueling.during_ride.join(", ")}
                    </span>
                  </div>
                )}
              {cyclingData.fueling.hydration_oz && (
                <ValueDisplay
                  label="Total Hydration"
                  value={`${cyclingData.fueling.hydration_oz} oz`}
                  dataPath="workoutData.discipline_specific.cycling.fueling.hydration_oz"
                />
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export const CyclingSection = ({
  cyclingData,
  sectionIds,
  collapsedSections,
  toggleCollapse,
  containerPatterns,
}) => {
  if (!cyclingData) return null;

  const [detailsId, segmentsId] = sectionIds;

  return (
    <>
      {/* Section: Cycling Details */}
      <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
        <div
          className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
            collapsedSections.has(detailsId) ? "rounded-md" : "rounded-t-md"
          }`}
          onClick={() => toggleCollapse(detailsId)}
        >
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
            <h3 className="font-header font-bold text-white text-lg uppercase">
              Cycling Details
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
            <CyclingDetails
              cyclingData={cyclingData}
              containerPatterns={containerPatterns}
            />
          </div>
        )}
      </div>

      {/* Section: Ride Segments */}
      {cyclingData?.segments?.length > 0 && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
              collapsedSections.has(segmentsId) ? "rounded-md" : "rounded-t-md"
            }`}
            onClick={() => toggleCollapse(segmentsId)}
          >
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
              <h3 className="font-header font-bold text-white text-lg uppercase">
                Ride Segments ({cyclingData?.segments?.length || 0})
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
                {cyclingData.segments.map((segment, index) => (
                  <CyclingSegmentDisplay
                    key={index}
                    segment={segment}
                    segmentIndex={index}
                    elevationUnit={cyclingData.elevation_unit}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Badge Color Legend */}
          {(cyclingData?.ride_type || cyclingData?.segments) && <BadgeLegend />}
        </div>
      )}
    </>
  );
};
