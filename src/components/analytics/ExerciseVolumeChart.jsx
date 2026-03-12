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
  const chartData = useMemo(() => {
    return exerciseData
      .map((session) => {
        const tonnage = calculateTonnage(session);
        const dateStr = formatDate(session.completedAt || session.date);
        return {
          date: dateStr,
          sortKey: session.completedAt || session.date || "",
          tonnage,
          sets: session.metrics?.sets || 0,
          reps: session.metrics?.reps || 0,
        };
      })
      .filter((d) => d.tonnage > 0)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [exerciseData]);

  const hasData = chartData.length >= 2;

  const avgTonnage =
    hasData
      ? Math.round(chartData.reduce((s, d) => s + d.tonnage, 0) / chartData.length)
      : 0;

  return (
    <ChartCard
      title="Exercise Volume"
      subtitle={exerciseName ? `Tonnage per session — ${exerciseName}` : "Select an exercise to see volume"}
      isLoading={isLoading}
      isEmpty={!hasData && !isLoading}
      emptyMessage={exerciseName ? "Need at least 2 sessions with volume data." : "Select an exercise above to get started."}
    >
      <div className="w-full" style={{ height: 220 }}>
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
            <YAxis
              {...axisDefaults}
              tickFormatter={formatCompact}
              width={48}
            />
            <Tooltip
              content={
                <SynthwaveTooltip
                  formatter={(val, name) =>
                    name === "Tonnage" ? `${val.toLocaleString()} lbs` : val
                  }
                />
              }
            />
            {avgTonnage > 0 && (
              <ReferenceLine
                y={avgTonnage}
                stroke={chartColors.purple}
                strokeDasharray="6 4"
                strokeOpacity={0.4}
                label={{
                  value: `Avg ${formatCompact(avgTonnage)}`,
                  position: "right",
                  fill: chartColors.purple,
                  fontSize: 10,
                  fontFamily: "inherit",
                }}
              />
            )}
            <Bar
              dataKey="tonnage"
              name="Tonnage"
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
            value={formatCompact(chartData[chartData.length - 1]?.tonnage)}
            color={chartColors.cyan}
          />
          <Stat
            label="Avg"
            value={formatCompact(avgTonnage)}
            color={chartColors.purple}
          />
          <DeltaStat data={chartData} />
        </div>
      )}
    </ChartCard>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wide">{label}</p>
      <p className="font-header font-bold text-sm" style={{ color }}>{value}</p>
    </div>
  );
}

function DeltaStat({ data }) {
  if (data.length < 2) return null;
  const prev = data[data.length - 2]?.tonnage || 0;
  const curr = data[data.length - 1]?.tonnage || 0;
  if (prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  const isPositive = pct >= 0;
  return (
    <div className="text-center">
      <p className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wide">vs Prior</p>
      <p className="font-header font-bold text-sm" style={{ color: isPositive ? chartColors.green : chartColors.warning }}>
        {isPositive ? "+" : ""}{pct}%
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
    for (let i = 0; i < Math.min(m.weightsPerSet.length, m.repsPerSet.length); i++) {
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
