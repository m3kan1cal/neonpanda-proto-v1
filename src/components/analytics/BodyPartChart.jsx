import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  chartColors,
  SynthwaveTooltip,
  axisDefaults,
  gridDefaults,
  animationDefaults,
} from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// BodyPartChart — horizontal bar chart showing body part training frequency
// Aggregates across multiple weeks or shows the latest week.
// ---------------------------------------------------------------------------

const BODY_PARTS = ["legs", "back", "chest", "shoulders", "arms"];
const BODY_PART_LABELS = {
  legs: "Legs",
  back: "Back",
  chest: "Chest",
  shoulders: "Shoulders",
  arms: "Arms",
};
const BODY_PART_COLORS = {
  legs: chartColors.neonPink,
  back: chartColors.cyan,
  chest: chartColors.purple,
  shoulders: chartColors.green,
  arms: chartColors.yellow,
};

export default function BodyPartChart({
  weeklyData = [],
  isLoading = false,
}) {
  // Aggregate body part frequency across all available weeks
  const { chartData, hasData } = useMemo(() => {
    const withBodyParts = weeklyData.filter((w) => w.bodyPartFrequency);
    if (withBodyParts.length === 0) return { chartData: [], hasData: false };

    // Sum across all weeks, then compute average per week
    const totals = {};
    BODY_PARTS.forEach((bp) => (totals[bp] = 0));

    for (const week of withBodyParts) {
      for (const bp of BODY_PARTS) {
        totals[bp] += week.bodyPartFrequency[bp] || 0;
      }
    }

    const chartData = BODY_PARTS.map((bp) => ({
      name: BODY_PART_LABELS[bp],
      key: bp,
      total: totals[bp],
      avgPerWeek: Math.round((totals[bp] / withBodyParts.length) * 10) / 10,
    }))
      .sort((a, b) => b.total - a.total); // Sort by most trained

    return { chartData, hasData: chartData.some((d) => d.total > 0) };
  }, [weeklyData]);

  return (
    <ChartCard
      title="Body Part Frequency"
      subtitle="Total training frequency per body part across selected period"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="Body part frequency data will appear once weekly reports include body part analysis."
    >
      <div className="w-full" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid horizontal={false} {...gridDefaults} />
            <XAxis
              type="number"
              {...axisDefaults}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              {...axisDefaults}
              width={72}
              tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "inherit" }}
            />
            <Tooltip
              content={
                <SynthwaveTooltip
                  formatter={(val, name) =>
                    name === "Frequency"
                      ? `${val} session${val !== 1 ? "s" : ""}`
                      : val
                  }
                />
              }
            />
            <Bar
              dataKey="total"
              name="Frequency"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
              {...animationDefaults}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={BODY_PART_COLORS[entry.key] || chartColors.cyan}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Avg per week row */}
      {hasData && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 px-1">
          {chartData.map((d) => (
            <div key={d.key} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: BODY_PART_COLORS[d.key] }}
              />
              <span className="font-body text-[10px] text-synthwave-text-muted">
                {d.name}: {d.avgPerWeek}/wk
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
