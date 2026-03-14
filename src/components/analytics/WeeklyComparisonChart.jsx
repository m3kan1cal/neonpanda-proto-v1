import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
// WeeklyComparisonChart — grouped bar comparing this week vs last week
// vs 4-week rolling average across key metrics.
// ---------------------------------------------------------------------------

const METRICS = [
  { key: "tonnage", label: "Volume", unit: "lbs" },
  { key: "sessions", label: "Sessions", unit: "" },
  { key: "totalSets", label: "Sets", unit: "" },
  { key: "avgDuration", label: "Avg Duration", unit: "min" },
];

export default function WeeklyComparisonChart({
  data = [], // weeklyChartData array — last entry is "current"
  isLoading = false,
}) {
  const { chartData, hasData } = useMemo(() => {
    if (data.length < 2) return { chartData: [], hasData: false };

    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    // Rolling 4-week average (or however many weeks we have, up to 4)
    const recentN = data.slice(-Math.min(data.length, 4));
    const avg = {};
    for (const m of METRICS) {
      avg[m.key] = Math.round(
        recentN.reduce((sum, w) => sum + (w[m.key] || 0), 0) / recentN.length,
      );
    }

    const chartData = METRICS.map((m) => ({
      metric: m.label,
      "This Week": current[m.key] || 0,
      "Last Week": previous[m.key] || 0,
      "4W Avg": avg[m.key] || 0,
      unit: m.unit,
    }));

    return { chartData, hasData: true };
  }, [data]);

  return (
    <ChartCard
      title="Weekly Comparison"
      subtitle="This week vs last week vs 4-week average"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="At least 2 weeks of reports needed for comparison."
    >
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
          >
            <CartesianGrid vertical={false} {...gridDefaults} />
            <XAxis
              dataKey="metric"
              {...axisDefaults}
              tickMargin={8}
            />
            <YAxis
              {...axisDefaults}
              tickFormatter={formatCompact}
              width={44}
            />
            <Tooltip content={<ComparisonTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: "inherit" }}
              iconType="square"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: chartColors.axisLabel }}>{value}</span>
              )}
            />
            <Bar
              dataKey="This Week"
              fill={chartColors.neonPink}
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
              {...animationDefaults}
            />
            <Bar
              dataKey="Last Week"
              fill={chartColors.cyan}
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
              {...animationDefaults}
            />
            <Bar
              dataKey="4W Avg"
              fill={chartColors.purple}
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
              fillOpacity={0.6}
              {...animationDefaults}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function ComparisonTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const unit = payload[0]?.payload?.unit || "";

  return (
    <div
      className="rounded-none px-3 py-2.5 shadow-lg border backdrop-blur-sm"
      style={{
        background: chartColors.tooltipBg,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      <p className="font-header font-bold text-white text-xs uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="font-body text-xs" style={{ color: entry.color }}>
          {entry.name}:{" "}
          <span className="font-semibold">
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            {unit ? ` ${unit}` : ""}
          </span>
        </p>
      ))}
    </div>
  );
}
