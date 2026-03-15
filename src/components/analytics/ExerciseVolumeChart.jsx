import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  chartColors,
  ChartGradients,
  SynthwaveTooltip,
  axisDefaults,
  gridDefaults,
  animationDefaults,
  formatCompact,
  tooltipDefaults,
  cursorBar,
} from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// ExerciseVolumeChart — bar chart showing per-session tonnage for an exercise
// ---------------------------------------------------------------------------

export default function ExerciseVolumeChart({
  exerciseData = [],
  exerciseName = "",
  isLoading = false,
}) {
  // Transform into chart data sorted oldest → newest
  const { chartData, isRepsMode } = useMemo(() => {
    const mapped = exerciseData
      .map((session) => {
        const tonnage = calculateTonnage(session);
        const sets = session.metrics?.sets || 1;
        const reps =
          session.metrics?.bestSet?.reps || session.metrics?.reps || 0;
        const totalReps = reps * sets;
        const dateStr = formatDate(session.completedAt || session.date);
        return {
          date: dateStr,
          sortKey: session.completedAt || session.date || "",
          tonnage,
          totalReps,
          sets,
          reps,
        };
      })
      .filter((d) => d.tonnage > 0 || d.totalReps > 0)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Detect bodyweight mode: no sessions have tonnage > 0 but some have reps
    const hasWeightData = mapped.some((d) => d.tonnage > 0);
    const repsMode = !hasWeightData && mapped.some((d) => d.totalReps > 0);

    return { chartData: mapped, isRepsMode: repsMode };
  }, [exerciseData]);

  const hasData = chartData.length >= 2;
  const primaryKey = isRepsMode ? "totalReps" : "tonnage";

  const avgPrimary = hasData
    ? Math.round(
        chartData.reduce((s, d) => s + d[primaryKey], 0) / chartData.length,
      )
    : 0;

  const tooltipUnit = isRepsMode ? "reps" : "lbs";
  const metricLabel = isRepsMode ? "Total Reps" : "Tonnage";

  return (
    <ChartCard
      title="Exercise Volume"
      subtitle={
        exerciseName
          ? isRepsMode
            ? `Total reps per session — ${exerciseName}`
            : `Tonnage per session — ${exerciseName}`
          : "Select an exercise to see volume"
      }
      isLoading={isLoading}
      isEmpty={!hasData && !isLoading}
      emptyMessage={
        exerciseName
          ? "Need at least 2 sessions with data."
          : "Select an exercise above to get started."
      }
    >
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
          >
            <ChartGradients />
            <CartesianGrid vertical={false} {...gridDefaults} />
            <XAxis
              dataKey="date"
              {...axisDefaults}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis {...axisDefaults} tickFormatter={formatCompact} width={48} />
            <Tooltip
              {...tooltipDefaults}
              cursor={cursorBar}
              content={
                <SynthwaveTooltip
                  formatter={(val, name) =>
                    name === metricLabel
                      ? `${val.toLocaleString()} ${tooltipUnit}`
                      : val
                  }
                />
              }
            />
            {avgPrimary > 0 && (
              <ReferenceLine
                y={avgPrimary}
                stroke={chartColors.purple}
                strokeDasharray="6 4"
                strokeOpacity={0.4}
                label={{
                  value: `Avg ${formatCompact(avgPrimary)}`,
                  position: "right",
                  fill: chartColors.purple,
                  fontSize: 10,
                  fontFamily: "inherit",
                }}
              />
            )}
            <Bar
              dataKey={primaryKey}
              name={metricLabel}
              fill={chartColors.cyan}
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
              {...animationDefaults}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      {hasData && (
        <div className="flex items-center justify-between mt-3 px-1">
          <Stat
            label="Latest"
            value={`${formatCompact(chartData[chartData.length - 1]?.[primaryKey])}${isRepsMode ? " reps" : ""}`}
            color={chartColors.cyan}
          />
          <Stat
            label="Avg"
            value={`${formatCompact(avgPrimary)}${isRepsMode ? " reps" : ""}`}
            color={chartColors.purple}
          />
          <DeltaStat
            data={chartData}
            primaryKey={primaryKey}
            isRepsMode={isRepsMode}
          />
        </div>
      )}
    </ChartCard>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wide">
        {label}
      </p>
      <p className="font-header font-bold text-sm" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function DeltaStat({ data, primaryKey = "tonnage", isRepsMode = false }) {
  if (data.length < 2) return null;
  const prev = data[data.length - 2]?.[primaryKey] || 0;
  const curr = data[data.length - 1]?.[primaryKey] || 0;
  if (prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  const isPositive = pct >= 0;
  return (
    <div className="text-center">
      <p className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wide">
        vs Prior
      </p>
      <p
        className="font-header font-bold text-sm"
        style={{ color: isPositive ? chartColors.green : chartColors.warning }}
      >
        {isPositive ? "+" : ""}
        {pct}%
      </p>
    </div>
  );
}

// Calculate total tonnage for a session
function calculateTonnage(session) {
  const m = session.metrics || {};

  // If we have detailed per-set data, compute precisely
  if (m.weightsPerSet?.length && m.repsPerSet?.length) {
    let total = 0;
    for (
      let i = 0;
      i < Math.min(m.weightsPerSet.length, m.repsPerSet.length);
      i++
    ) {
      total += (m.weightsPerSet[i] || 0) * (m.repsPerSet[i] || 0);
    }
    if (total > 0) return total;
  }

  // Fallback: weight × reps × sets
  const weight = m.bestSet?.weight || m.maxWeight || m.weight || 0;
  const reps = m.bestSet?.reps || m.reps || 0;
  const sets = m.sets || 1;
  return weight * reps * sets;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
