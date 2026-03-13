import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import {
  containerPatterns,
  heatMapPatterns,
} from "../utils/ui/uiPatterns";
import { getWorkouts } from "../utils/apis/workoutApi";

// Short discipline labels for display inside the 36px tiles
const DISCIPLINE_ABBR = {
  crossfit: "CF",
  powerlifting: "PL",
  running: "RUN",
  bodybuilding: "BB",
  olympic_weightlifting: "OLY",
  gymnastics: "GYM",
  conditioning: "COND",
  yoga: "YOGA",
  swimming: "SWIM",
  cycling: "BIKE",
};

const getRPEColorClass = (rpe) => {
  if (!rpe || rpe === 0) return heatMapPatterns.status.rpe.missing;
  if (rpe <= 3) return heatMapPatterns.status.rpe.low;
  if (rpe <= 6) return heatMapPatterns.status.rpe.medium;
  if (rpe <= 8) return heatMapPatterns.status.rpe.high;
  return heatMapPatterns.status.rpe.highest;
};

// Extract the calendar date key (YYYY-MM-DD) from a completedAt value
const getDateKey = (completedAt) => {
  if (!completedAt) return null;
  if (typeof completedAt === "string") return completedAt.split("T")[0];
  return new Date(completedAt).toISOString().split("T")[0];
};

const formatDateLabel = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

// ─── Workout Tile ─────────────────────────────────────────────────────────────

const WorkoutTile = ({ workout, userId, coachId }) => {
  const navigate = useNavigate();

  const rpe = workout.workoutData?.performance_metrics?.perceived_exertion;
  const intensity = workout.workoutData?.performance_metrics?.intensity;
  const discipline = workout.workoutData?.discipline?.toLowerCase();
  const abbr = DISCIPLINE_ABBR[discipline] || "WOD";
  const durationSec = workout.workoutData?.duration;
  const durationMin = durationSec ? Math.round(durationSec / 60) : null;
  const workoutName =
    workout.workoutName ||
    workout.workoutData?.workout_name ||
    "Workout";
  const dateKey = getDateKey(workout.completedAt);

  const tooltipParts = [
    workoutName,
    dateKey ? formatDateLabel(dateKey) : null,
    rpe != null ? `RPE ${Number(rpe).toFixed(1)}` : null,
    intensity != null ? `Intensity ${Number(intensity).toFixed(0)}%` : null,
    durationMin ? `${durationMin} min` : null,
    discipline || null,
  ].filter(Boolean);

  const handleClick = () => {
    navigate(
      `/training-grounds/workouts?workoutId=${workout.workoutId}&userId=${userId}&coachId=${coachId}`,
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`
        ${heatMapPatterns.workoutTile}
        ${getRPEColorClass(rpe)}
        ${heatMapPatterns.workoutTileInteractive}
      `}
      data-tooltip-id="workout-heat-map-tooltip"
      data-tooltip-content={tooltipParts.join(" · ")}
      data-tooltip-place="top"
    >
      <span className={heatMapPatterns.disciplineLabel}>{abbr}</span>
      {rpe != null && (
        <span className="text-[8px] text-white/60 leading-none mt-0.5">
          {Number(rpe).toFixed(0)}
        </span>
      )}
      <div className={heatMapPatterns.glowOverlay} />
    </div>
  );
};

// ─── Date Group ───────────────────────────────────────────────────────────────

const WorkoutDateGroup = ({ dateKey, workouts, userId, coachId }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <span className={heatMapPatterns.dateSeparatorLabel}>
        {formatDateLabel(dateKey)}
      </span>
      <div className={heatMapPatterns.dateSeparatorLine} />
    </div>
    <div className="flex flex-wrap gap-1.5">
      {workouts.map((workout) => (
        <WorkoutTile
          key={workout.workoutId}
          workout={workout}
          userId={userId}
          coachId={coachId}
        />
      ))}
    </div>
  </div>
);

// ─── RPE Legend ───────────────────────────────────────────────────────────────

const WorkoutHeatMapLegend = () => {
  const legendItems = [
    { label: "Rest", color: heatMapPatterns.status.rpe.missing, range: "" },
    { label: "Low", color: heatMapPatterns.status.rpe.low, range: "(1-3)" },
    { label: "Medium", color: heatMapPatterns.status.rpe.medium, range: "(4-6)" },
    { label: "High", color: heatMapPatterns.status.rpe.high, range: "(7-8)" },
    { label: "Highest", color: heatMapPatterns.status.rpe.highest, range: "(9-10)" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
      <span className="text-synthwave-text-secondary font-body text-sm font-medium">
        RPE Scale:
      </span>
      {legendItems.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-md border ${item.color}`} />
          <span className="text-synthwave-text-secondary font-body text-xs">
            {item.label} {item.range}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[2, 1, 3].map((tileCount, i) => (
      <div key={i} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-16 h-3 rounded bg-synthwave-bg-secondary/40 animate-pulse shrink-0" />
          <div className="flex-1 h-px bg-synthwave-neon-cyan/20" />
        </div>
        <div className="flex gap-1.5">
          {[...Array(tileCount)].map((_, j) => (
            <div
              key={j}
              className="w-9 h-9 rounded-lg bg-synthwave-bg-secondary/40 animate-pulse"
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const WorkoutHeatMapV2 = ({ weekStart, weekEnd, userId, coachId }) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !weekStart || !weekEnd) return;

    setLoading(true);
    setError(null);

    getWorkouts(userId, {
      fromDate: weekStart,
      toDate: weekEnd,
      sortBy: "completedAt",
      sortOrder: "asc",
      limit: 20,
    })
      .then((response) => {
        setWorkouts(response.workouts || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load workouts");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, weekStart, weekEnd]);

  // Group workouts by calendar date in chronological order
  const workoutGroups = workouts.reduce((groups, workout) => {
    const dateKey = getDateKey(workout.completedAt);
    if (!dateKey) return groups;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(workout);
    return groups;
  }, {});
  const sortedDates = Object.keys(workoutGroups).sort();

  // Summary stats
  const totalWorkouts = workouts.length;
  const trainingDays = sortedDates.length;
  const rpeValues = workouts
    .map((w) => w.workoutData?.performance_metrics?.perceived_exertion)
    .filter((r) => r != null && Number(r) > 0);
  const avgRPE =
    rpeValues.length > 0
      ? rpeValues.reduce((sum, r) => sum + Number(r), 0) / rpeValues.length
      : null;

  return (
    <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start justify-between p-6">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
          <h3 className="font-header font-bold text-white text-lg uppercase">
            Workout Intensity
          </h3>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Summary stats */}
        {!loading && !error && (
          <div className="flex justify-center items-center space-x-6 text-sm font-body">
            <div className="text-synthwave-text-secondary">
              <span className="text-synthwave-neon-cyan font-semibold">
                {totalWorkouts}
              </span>{" "}
              workouts
            </div>
            <div className="text-synthwave-text-secondary">
              <span className="text-synthwave-neon-pink font-semibold">
                {trainingDays}
              </span>{" "}
              training days
            </div>
            {avgRPE && (
              <div className="text-synthwave-text-secondary">
                Avg RPE:{" "}
                <span className="text-synthwave-neon-cyan font-semibold">
                  {avgRPE.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSkeleton />}

        {/* Error */}
        {!loading && error && (
          <p className="text-synthwave-text-secondary font-body text-sm text-center py-4">
            Could not load workouts
          </p>
        )}

        {/* Empty */}
        {!loading && !error && totalWorkouts === 0 && (
          <p className="text-synthwave-text-secondary font-body text-sm text-center py-4">
            No workouts recorded this week
          </p>
        )}

        {/* Workout groups */}
        {!loading && !error && totalWorkouts > 0 && (
          <div className="space-y-3">
            {sortedDates.map((dateKey) => (
              <WorkoutDateGroup
                key={dateKey}
                dateKey={dateKey}
                workouts={workoutGroups[dateKey]}
                userId={userId}
                coachId={coachId}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <WorkoutHeatMapLegend />

        {/* Tooltip */}
        <Tooltip
          id="workout-heat-map-tooltip"
          offset={12}
          delayShow={0}
          place="top"
          style={{
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: "8px",
            fontFamily: "Rajdhani",
            fontSize: "13px",
            padding: "8px 12px",
            zIndex: 99999,
            maxWidth: "220px",
            whiteSpace: "normal",
            wordWrap: "break-word",
          }}
        />
      </div>
    </div>
  );
};

export default WorkoutHeatMapV2;
