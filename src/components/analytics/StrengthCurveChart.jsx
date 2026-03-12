import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  chartColors,
  SynthwaveTooltip,
  axisDefaults,
  gridDefaults,
  animationDefaults,
  formatCompact,
} from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// StrengthCurveChart — line chart showing weight progression for an exercise
// ---------------------------------------------------------------------------

export default function StrengthCurveChart({
  exerciseData = [], // [{ date, completedAt, metrics: { bestSet, weight, ... } }]
  aggregations = null, // { prWeight, averageWeight, ... }
  exerciseName = "",
  isLoading = false,
}) {
  // Transform exercise sessions into chart data — sorted oldest first
  const chartData = useMemo(() => {
    return exerciseData
      .map((session) => {
        const weight = extractWeight(session);
        const reps = extractReps(session);
        const dateStr = formatDate(session.completedAt || session.date);
        return {
          date: dateStr,
          sortKey: session.completedAt || session.date || "",
          weight,
          reps,
          isPR: false, // will mark below
        };
      })
      .filter((d) => d.weight > 0)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((d, i, arr) => {
        // Mark PRs — any point where weight is the highest seen so far
        let maxSoFar = 0;
        for (let j = 0; j <= i; j++) maxSoFar = Math.max(maxSoFar, arr[j].weight);
        return { ...d, isPR: d.weight >= maxSoFar && (i === 0 || d.weight > arr[i - 1].weight || maxSoFar > (i > 0 ? Math.max(...arr.slice(0, i).map(x => x.weight)) : 0)) };
      });
  }, [exerciseData]);

  // Re-calculate PR markers more cleanly
  const dataWithPRs = useMemo(() => {
    let runningMax = 0;
    return chartData.map((d) => {
      const isPR = d.weight > runningMax;
      if (isPR) runningMax = d.weight;
      return { ...d, isPR };
    });
  }, [chartData]);

  const hasData = dataWithPRs.length >= 2;
  const avgWeight = aggregations?.averageWeight || 0;
  const prWeight = aggregations?.prWeight || 0;

  return (
    <ChartCard
      title="Strength Curve"
      subtitle={exerciseName ? `Weight progression for ${exerciseName}` : "Select an exercise to see progression"}
      isLoading={isLoading}
      isEmpty={!hasData && !isLoading}
      emptyMessage={exerciseName ? "Need at least 2 sessions with weight data." : "Select an exercise above to get started."}
    >
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={dataWithPRs}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
          >
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
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={
                <SynthwaveTooltip
                  formatter={(val, name) => {
                    if (name === "Weight") return `${val} lbs`;
                    if (name === "Reps") return `${val} reps`;
                    return val;
                  }}
                />
              }
            />
            {/* Average weight reference */}
            {avgWeight > 0 && (
              <ReferenceLine
                y={avgWeight}
                stroke={chartColors.cyan}
                strokeDasharray="6 4"
                strokeOpacity={0.35}
                label={{
                  value: `Avg ${Math.round(avgWeight)}`,
                  position: "right",
                  fill: chartColors.cyan,
                  fontSize: 10,
                  fontFamily: "inherit",
                }}
              />
            )}
            {/* Weight line */}
            <Line
              type="monotone"
              dataKey="weight"
              name="Weight"
              stroke={chartColors.neonPink}
              strokeWidth={2}
              dot={(props) => <CustomDot {...props} data={dataWithPRs} />}
              activeDot={{
                r: 6,
                fill: chartColors.neonPink,
                stroke: "#fff",
                strokeWidth: 2,
              }}
              {...animationDefaults}
            />
            {/* Reps as secondary line */}
            <Line
              type="monotone"
              dataKey="reps"
              name="Reps"
              stroke={chartColors.purple}
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
              {...animationDefaults}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      {hasData && (
        <div className="flex items-center justify-between mt-3 px-1">
          <Stat label="Latest" value={`${dataWithPRs[dataWithPRs.length - 1]?.weight} lbs`} color={chartColors.neonPink} />
          <Stat label="PR" value={prWeight ? `${prWeight} lbs` : "—"} color={chartColors.green} />
          <Stat label="Average" value={avgWeight ? `${Math.round(avgWeight)} lbs` : "—"} color={chartColors.cyan} />
        </div>
      )}
    </ChartCard>
  );
}

// Custom dot — larger & glowing for PRs
function CustomDot({ cx, cy, index, data }) {
  if (!data || !data[index]) return null;
  const isPR = data[index].isPR;

  if (isPR) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={chartColors.green} fillOpacity={0.25} />
        <circle cx={cx} cy={cy} r={4} fill={chartColors.green} stroke="#fff" strokeWidth={1.5} />
      </g>
    );
  }

  return <circle cx={cx} cy={cy} r={3} fill={chartColors.neonPink} />;
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wide">{label}</p>
      <p className="font-header font-bold text-sm" style={{ color }}>{value}</p>
    </div>
  );
}

// Extract the best weight from a session's metrics
function extractWeight(session) {
  const m = session.metrics || {};
  return m.bestSet?.weight || m.maxWeight || m.weight || 0;
}

// Extract the best reps from a session's metrics
function extractReps(session) {
  const m = session.metrics || {};
  return m.bestSet?.reps || m.reps || 0;
}

// Format ISO date to short "Mar 3" format
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
