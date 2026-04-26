import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  chartColors,
  axisDefaults,
  gridDefaults,
  animationDefaults,
  formatCompact,
  tooltipDefaults,
  cursorBar,
} from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// WeeklyComparisonChart — 2x2 grid of per-metric mini bar charts comparing
// this week vs last week vs 4-week rolling average.
// ---------------------------------------------------------------------------

const METRICS = [
  { key: "tonnage", label: "Volume", unit: "lbs", color: chartColors.neonPink },
  { key: "sessions", label: "Sessions", unit: "", color: chartColors.cyan },
  { key: "totalSets", label: "Sets", unit: "", color: chartColors.purple },
  {
    key: "avgDuration",
    label: "Avg Duration",
    unit: "min",
    color: chartColors.green,
  },
];

export default function WeeklyComparisonChart({
  data = [],
  isLoading = false,
}) {
  const { metricData, hasData, seriesLabels } = useMemo(() => {
    if (data.length < 2)
      return { metricData: {}, hasData: false, seriesLabels: [] };

    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    const currentLabel = current.label || "Current";
    const previousLabel = previous.label || "Previous";

    const recentN = data.slice(-Math.min(data.length, 4));
    const avg = {};
    for (const m of METRICS) {
      avg[m.key] = Math.round(
        recentN.reduce((sum, w) => sum + (w[m.key] || 0), 0) / recentN.length,
      );
    }

    const metricData = {};
    for (const m of METRICS) {
      metricData[m.key] = [
        {
          name: currentLabel,
          value: current[m.key] || 0,
          color: chartColors.neonPink,
        },
        {
          name: previousLabel,
          value: previous[m.key] || 0,
          color: chartColors.cyan,
        },
        {
          name: "4W Avg",
          value: avg[m.key] || 0,
          color: chartColors.purple,
        },
      ];
    }

    const seriesLabels = [
      { key: currentLabel, color: chartColors.neonPink },
      { key: previousLabel, color: chartColors.cyan },
      { key: "4W Avg", color: chartColors.purple, opacity: 0.6 },
    ];

    return { metricData, hasData: true, seriesLabels };
  }, [data]);

  return (
    <ChartCard
      title="Weekly Comparison"
      subtitle="Recent weeks vs 4-week average"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="At least 2 weeks of reports needed for comparison."
    >
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {seriesLabels.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-sm shrink-0"
              style={{ background: s.color, opacity: s.opacity ?? 1 }}
            />
            <span
              className="font-body text-[10px] uppercase tracking-wide"
              style={{ color: chartColors.axisLabel }}
            >
              {s.key}
            </span>
          </div>
        ))}
      </div>

      {/* 2x2 grid of mini charts */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {METRICS.map((m) => (
          <MiniMetricChart
            key={m.key}
            label={m.label}
            unit={m.unit}
            seriesData={metricData[m.key] || []}
          />
        ))}
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// MiniMetricChart — a single small grouped bar chart for one metric
// ---------------------------------------------------------------------------

function MiniMetricChart({ label, unit, seriesData }) {
  return (
    <div>
      <p className="font-body text-[10px] uppercase tracking-wider mb-2 text-synthwave-text-secondary">
        {label}
        {unit ? ` (${unit})` : ""}
      </p>
      <div style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={seriesData}
            margin={{ top: 4, right: 4, bottom: 0, left: -8 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid vertical={false} {...gridDefaults} />
            <XAxis dataKey="name" {...axisDefaults} tickMargin={6} />
            <YAxis
              {...axisDefaults}
              tickFormatter={formatCompact}
              width={40}
              tickCount={4}
              domain={[0, "auto"]}
            />
            <Tooltip
              {...tooltipDefaults}
              cursor={cursorBar}
              content={<MiniTooltip unit={unit} />}
            />
            <Bar
              dataKey="value"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
              {...animationDefaults}
            >
              {seriesData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={`${entry.color}${entry.name === "4W Avg" ? "20" : "33"}`}
                  stroke={entry.color}
                  strokeWidth={1.5}
                  strokeOpacity={entry.name === "4W Avg" ? 0.5 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MiniTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div
      className="rounded-xl px-2.5 py-1.5 shadow-lg border backdrop-blur-sm"
      style={{
        background: chartColors.tooltipBg,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      <p className="font-header font-bold text-white text-xs uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="font-body text-xs" style={{ color: entry.color }}>
        <span className="font-semibold">
          {typeof entry.value === "number"
            ? entry.value.toLocaleString()
            : entry.value}
          {unit ? ` ${unit}` : ""}
        </span>
      </p>
    </div>
  );
}
