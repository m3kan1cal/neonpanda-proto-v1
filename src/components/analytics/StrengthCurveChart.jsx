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
  tooltipDefaults,
  cursorLine,
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
  // Transform exercise sessions into chart data — sorted oldest first, with PR markers
  const { dataWithPRs, isRepsMode } = useMemo(() => {
    const sorted = exerciseData
      .map((session) => {
        const weight = extractWeight(session);
        const reps = extractReps(session);
        const dateStr = formatDate(session.completedAt || session.date);
        return {
          date: dateStr,
          sortKey: session.completedAt || session.date || "",
          weight,
          reps,
        };
      })
      .filter((d) => d.weight > 0 || d.reps > 0)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Detect bodyweight mode: no sessions have weight > 0 but some have reps
    const hasWeightData = sorted.some((d) => d.weight > 0);
    const repsMode = !hasWeightData && sorted.some((d) => d.reps > 0);

    // Mark PRs using running max of primary metric
    let runningMax = 0;
    const dataWithPRs = sorted.map((d) => {
      const primaryVal = repsMode ? d.reps : d.weight;
      const isPR = primaryVal > runningMax;
      if (isPR) runningMax = primaryVal;
      return { ...d, isPR };
    });

    return { dataWithPRs, isRepsMode: repsMode };
  }, [exerciseData]);

  const hasData = dataWithPRs.length >= 2;
  const avgWeight = aggregations?.averageWeight || 0;
  const prWeight = aggregations?.prWeight || 0;
  const avgReps = aggregations?.averageReps || 0;
  const prReps = aggregations?.prReps || 0;

  // Derived summary values for both modes
  const latestPrimary = dataWithPRs[dataWithPRs.length - 1];
  const latestValue = isRepsMode ? latestPrimary?.reps : latestPrimary?.weight;
  const latestDisplay =
    latestValue != null
      ? isRepsMode
        ? `${latestValue} reps`
        : `${latestValue} lbs`
      : "—";
  const prDisplay = isRepsMode
    ? prReps
      ? `${prReps} reps`
      : "—"
    : prWeight
      ? `${prWeight} lbs`
      : "—";
  const avgDisplay = isRepsMode
    ? avgReps
      ? `${Math.round(avgReps)} reps`
      : "—"
    : avgWeight
      ? `${Math.round(avgWeight)} lbs`
      : "—";
  const avgRefValue = isRepsMode ? avgReps : avgWeight;

  return (
    <ChartCard
      title="Strength Curve"
      subtitle={
        exerciseName
          ? isRepsMode
            ? `Rep progression for ${exerciseName}`
            : `Weight progression for ${exerciseName}`
          : "Select an exercise to see progression"
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
              {...tooltipDefaults}
              cursor={cursorLine}
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
            {/* Average reference line */}
            {avgRefValue > 0 && (
              <ReferenceLine
                y={avgRefValue}
                stroke={chartColors.cyan}
                strokeDasharray="6 4"
                strokeOpacity={0.35}
                label={{
                  value: `Avg ${Math.round(avgRefValue)}`,
                  position: "right",
                  fill: chartColors.cyan,
                  fontSize: 10,
                  fontFamily: "inherit",
                }}
              />
            )}
            {/* Primary line — weight or reps depending on mode */}
            <Line
              type="monotone"
              dataKey={isRepsMode ? "reps" : "weight"}
              name={isRepsMode ? "Reps" : "Weight"}
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
            {/* Secondary reps line — only shown in weight mode */}
            {!isRepsMode && (
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
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      {hasData && (
        <div className="flex items-center justify-between mt-3 px-1">
          <Stat
            label="Latest"
            value={latestDisplay}
            color={chartColors.neonPink}
          />
          <Stat label="PR" value={prDisplay} color={chartColors.green} />
          <Stat label="Average" value={avgDisplay} color={chartColors.cyan} />
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
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={chartColors.green}
          fillOpacity={0.25}
        />
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={chartColors.green}
          stroke="#fff"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  return <circle cx={cx} cy={cy} r={3} fill={chartColors.neonPink} />;
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
