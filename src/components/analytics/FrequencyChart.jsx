import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  chartColors,
  SynthwaveTooltip,
  axisDefaults,
  gridDefaults,
  animationDefaults,
  tooltipDefaults,
  cursorBar,
  Stat,
} from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// FrequencyChart — bar chart showing sessions per week
// ---------------------------------------------------------------------------

const WEEKLY_TARGET = 5; // Same default as StreakCard

export default function FrequencyChart({
  data = [],
  isLoading = false,
  weeklyTarget = WEEKLY_TARGET,
}) {
  const hasData = data.length >= 2;

  // Compute average
  const avgSessions = hasData
    ? (data.reduce((sum, d) => sum + d.sessions, 0) / data.length).toFixed(1)
    : 0;

  return (
    <ChartCard
      title="Training Frequency"
      subtitle="Sessions completed per week"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="At least 2 weeks of reports needed to show frequency trends."
    >
      <div className="w-full" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
          >
            <CartesianGrid vertical={false} {...gridDefaults} />
            <XAxis
              dataKey="label"
              {...axisDefaults}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              {...axisDefaults}
              allowDecimals={false}
              width={32}
              domain={[0, (max) => Math.max(max, weeklyTarget + 1)]}
            />
            <Tooltip
              {...tooltipDefaults}
              cursor={cursorBar}
              content={
                <SynthwaveTooltip
                  formatter={(val, name) =>
                    name === "Sessions"
                      ? `${val} session${val !== 1 ? "s" : ""}`
                      : val
                  }
                />
              }
            />
            {/* Target line */}
            <ReferenceLine
              y={weeklyTarget}
              stroke={chartColors.neonPink}
              strokeDasharray="6 4"
              strokeOpacity={0.5}
              label={{
                value: `Target ${weeklyTarget}`,
                position: "right",
                fill: chartColors.neonPink,
                fontSize: 10,
                fontFamily: "inherit",
              }}
            />
            <Bar
              dataKey="sessions"
              name="Sessions"
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
              {...animationDefaults}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.sessions >= weeklyTarget
                      ? `${chartColors.cyan}33`
                      : `${chartColors.cyan}1A`
                  }
                  stroke={
                    entry.sessions >= weeklyTarget
                      ? chartColors.cyan
                      : `${chartColors.cyan}80`
                  }
                  strokeWidth={1.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      {hasData && (
        <div className="flex items-center justify-between mt-3 px-1">
          <Stat
            label="Latest"
            value={data[data.length - 1]?.sessions}
            color={chartColors.cyan}
          />
          <Stat
            label="Avg / Week"
            value={avgSessions}
            color={chartColors.axisLabel}
          />
          <Stat
            label="Target"
            value={weeklyTarget}
            color={chartColors.neonPink}
          />
        </div>
      )}
    </ChartCard>
  );
}
