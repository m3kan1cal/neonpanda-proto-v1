import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { containerPatterns, heatMapPatterns } from "../utils/ui/uiPatterns";
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

// Short M/D format for the horizontal tile layout (e.g. "2/18")
const formatShortDate = (dateKey) => {
  if (!dateKey) return "";
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}/${day}`;
};

// ─── Workout Tile ─────────────────────────────────────────────────────────────

const WorkoutTile = ({ workout, userId, coachId }) => {
  const navigate = useNavigate();

  const rpe =
    workout.performanceMetrics?.perceived_exertion ??
    workout.workoutData?.performance_metrics?.perceived_exertion;
  const intensity =
    workout.performanceMetrics?.intensity ??
    workout.workoutData?.performance_metrics?.intensity;
  const discipline = workout.workoutData?.discipline?.toLowerCase();
  const abbr = DISCIPLINE_ABBR[discipline] || "WOD";
  const durationSec = workout.workoutData?.duration;
  const durationMin = durationSec ? Math.round(durationSec / 60) : null;
  const workoutName =
    workout.workoutName || workout.workoutData?.workout_name || "Workout";
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
// Each date group is a compact column: short date label above, tiles below.
// These columns are laid out horizontally by the parent flex-wrap container.

const WorkoutDateGroup = ({ dateKey, workouts, userId, coachId }) => (
  <div className="flex flex-col gap-1 items-start">
    <span className="text-[10px] font-body text-synthwave-text-secondary/70 tracking-wide px-0.5">
      {formatShortDate(dateKey)}
    </span>
    <div className="flex gap-1.5">
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

// ─── RPE Legend Tooltip Trigger ───────────────────────────────────────────────

const RPE_LEGEND_HTML = `
  <div style="max-width: 280px;">
    <div style="font-weight: 600; margin-bottom: 8px; color: #ffffff;">RPE Scale (Rate of Perceived Exertion)</div>
    <div style="font-size: 13px; line-height: 1.6;">
      <div style="margin-bottom: 4px;"><span style="color: #9f00ff; font-weight: 600;">10</span> — Maximum effort, can't continue</div>
      <div style="margin-bottom: 4px;"><span style="color: #bf40ff; font-weight: 600;">9</span> — Very hard, barely sustainable</div>
      <div style="margin-bottom: 4px;"><span style="color: #ff1493; font-weight: 600;">7–8</span> — Hard, challenging but manageable</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffaa00; font-weight: 600;">4–6</span> — Moderate, can hold conversation</div>
      <div style="margin-bottom: 4px;"><span style="color: #7fff00; font-weight: 600;">2–3</span> — Light, could do for hours</div>
      <div><span style="color: #00ffff; font-weight: 600;">1</span> — Very light, minimal exertion</div>
    </div>
  </div>
`;

const RPELegendTrigger = () => (
  <div
    className="flex items-center gap-1.5 cursor-help w-fit"
    data-tooltip-id="rpe-legend-tooltip"
    data-tooltip-html={RPE_LEGEND_HTML}
    data-tooltip-place="top"
  >
    <svg
      className="w-4 h-4 text-synthwave-neon-cyan shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span className="font-body text-xs text-synthwave-text-secondary">
      RPE Scale
    </span>
  </div>
);

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {/* Stats subcontainer skeleton */}
    <div>
      <div className="w-16 h-2.5 rounded bg-synthwave-bg-secondary/40 animate-pulse mb-2" />
      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="w-16 h-2.5 rounded bg-synthwave-bg-secondary/40 animate-pulse" />
              <div className="w-8 h-3.5 rounded bg-synthwave-bg-secondary/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* Heatmap subcontainer skeleton */}
    <div>
      <div className="w-16 h-2.5 rounded bg-synthwave-bg-secondary/40 animate-pulse mb-2" />
      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          {[2, 1, 3].map((tileCount, i) => (
            <div key={i} className="flex flex-col gap-1 items-start">
              <div className="w-6 h-2.5 rounded bg-synthwave-bg-secondary/40 animate-pulse" />
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
      </div>
    </div>
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
    .map(
      (w) =>
        w.performanceMetrics?.perceived_exertion ??
        w.workoutData?.performance_metrics?.perceived_exertion,
    )
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
        {/* Summary stats subcontainer */}
        {!loading && !error && (
          <div>
            <h4 className="font-body text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
              Summary
            </h4>
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
              <div className="grid grid-cols-3 gap-4 font-body text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-synthwave-text-secondary">
                    Workouts
                  </span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {totalWorkouts}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-synthwave-text-secondary">
                    Training Days
                  </span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {trainingDays}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-synthwave-text-secondary">Avg RPE</span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {avgRPE ? avgRPE.toFixed(1) : "—"}
                  </span>
                </div>
              </div>
            </div>
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

        {/* Workout groups — horizontal flow, in subcontainer */}
        {!loading && !error && totalWorkouts > 0 && (
          <div>
            <h4 className="font-body text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
              Workouts
            </h4>
            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-md p-4">
              <div className="flex flex-wrap gap-x-4 gap-y-3">
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
            </div>
          </div>
        )}

        {/* RPE legend hover trigger */}
        <div className="flex justify-end">
          <RPELegendTrigger />
        </div>
      </div>

      {/* Tooltips — outside space-y-4 to avoid height expansion */}
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
      <Tooltip
        id="rpe-legend-tooltip"
        place="top"
        offset={10}
        style={{
          backgroundColor: "#111",
          color: "#fff",
          borderRadius: "8px",
          fontFamily: "Rajdhani",
          fontSize: "13px",
          padding: "10px 14px",
          zIndex: 99999,
          maxWidth: "280px",
        }}
      />
    </div>
  );
};

export default WorkoutHeatMapV2;
