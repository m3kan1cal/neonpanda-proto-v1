import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  Cell,
} from "recharts";
import {
  chartColors,
  axisDefaults,
  gridDefaults,
  animationDefaults,
  extractWeight,
  extractReps,
  formatDate,
} from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// PRTimelineChart — scatter plot showing PR achievements over time
// ---------------------------------------------------------------------------

const SIGNIFICANCE_COLORS = {
  major: chartColors.neonPink,
  breakthrough: chartColors.neonPink,
  moderate: chartColors.cyan,
  minor: chartColors.purple,
};

const SIGNIFICANCE_SIZES = {
  major: 200,
  breakthrough: 250,
  moderate: 140,
  minor: 80,
};

export default function PRTimelineChart({
  exerciseData = [],
  exerciseName = "",
  isLoading = false,
}) {
  // Find all PRs by scanning for new highs
  const prData = useMemo(() => {
    const sorted = [...exerciseData]
      .filter((s) => extractWeight(s) > 0)
      .sort((a, b) =>
        (a.completedAt || a.date || "").localeCompare(
          b.completedAt || b.date || "",
        ),
      );

    let runningMax = 0;
    const prs = [];

    for (const session of sorted) {
      const weight = extractWeight(session);
      if (weight > runningMax) {
        const previousBest = runningMax;
        runningMax = weight;
        const improvement =
          previousBest > 0
            ? Math.round(((weight - previousBest) / previousBest) * 100)
            : 0;
        const baseSignificance =
          improvement >= 10 ? "major" : improvement >= 5 ? "moderate" : "minor";
        const finalSignificance = previousBest === 0 ? "major" : baseSignificance; // first ever is always "major"

        prs.push({
          date: formatDate(session.completedAt || session.date),
          sortKey: session.completedAt || session.date || "",
          weight,
          previousBest: previousBest || null,
          improvement,
          significance: finalSignificance,
          reps: extractReps(session),
          size: SIGNIFICANCE_SIZES[finalSignificance] || 100,
        });
      }
    }

    return prs;
  }, [exerciseData]);

  const hasData = prData.length >= 1;

  return (
    <ChartCard
      title="PR Timeline"
      subtitle={
        exerciseName
          ? `Personal records — ${exerciseName}`
          : "Select an exercise to see PRs"
      }
      isLoading={isLoading}
      isEmpty={!hasData && !isLoading}
      emptyMessage={
        exerciseName
          ? "No PRs found for this exercise yet."
          : "Select an exercise above to get started."
      }
    >
      <div className="w-full" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid {...gridDefaults} />
            <XAxis
              dataKey="date"
              type="category"
              {...axisDefaults}
              tickMargin={8}
              allowDuplicatedCategory={false}
            />
            <YAxis
              dataKey="weight"
              type="number"
              {...axisDefaults}
              width={48}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v}`}
            />
            <ZAxis dataKey="size" range={[60, 250]} />
            <Tooltip content={<PRTooltip />} />
            <Scatter data={prData} {...animationDefaults}>
              {prData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    SIGNIFICANCE_COLORS[entry.significance] || chartColors.cyan
                  }
                  fillOpacity={0.85}
                  stroke={
                    SIGNIFICANCE_COLORS[entry.significance] || chartColors.cyan
                  }
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* PR legend & count */}
      {hasData && (
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-3">
            <Legend color={chartColors.neonPink} label="Major" />
            <Legend color={chartColors.cyan} label="Moderate" />
            <Legend color={chartColors.purple} label="Minor" />
          </div>
          <span className="font-body text-xs text-synthwave-text-muted">
            {prData.length} PR{prData.length !== 1 ? "s" : ""} total
          </span>
        </div>
      )}
    </ChartCard>
  );
}

// Custom tooltip for PR scatter points
function PRTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div
      className="rounded-md px-3 py-2.5 shadow-lg border backdrop-blur-sm"
      style={{
        background: chartColors.tooltipBg,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      <p className="font-header font-bold text-white text-xs uppercase tracking-wide mb-1">
        {d.date}
      </p>
      <p className="font-body text-xs" style={{ color: chartColors.neonPink }}>
        New PR: <span className="font-semibold">{d.weight} lbs</span>
        {d.reps > 0 && (
          <span className="text-synthwave-text-muted"> × {d.reps} reps</span>
        )}
      </p>
      {d.previousBest && (
        <p className="font-body text-xs text-synthwave-text-secondary">
          Previous: {d.previousBest} lbs
          {d.improvement > 0 && (
            <span style={{ color: chartColors.green }}>
              {" "}
              (+{d.improvement}%)
            </span>
          )}
        </p>
      )}
      <p
        className="font-body text-[10px] mt-1 uppercase"
        style={{ color: SIGNIFICANCE_COLORS[d.significance] }}
      >
        {d.significance} PR
      </p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="font-body text-[10px] text-synthwave-text-muted uppercase">
        {label}
      </span>
    </div>
  );
}
