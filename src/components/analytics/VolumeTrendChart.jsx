import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
// VolumeTrendChart — area chart showing total tonnage over weeks
// ---------------------------------------------------------------------------

export default function VolumeTrendChart({ data = [], isLoading = false }) {
  const hasData = data.length >= 2;

  // Compute average for reference line
  const avgTonnage =
    hasData
      ? Math.round(
          data.reduce((sum, d) => sum + d.tonnage, 0) / data.length,
        )
      : 0;

  return (
    <ChartCard
      title="Volume Trend"
      subtitle="Total training tonnage per week"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="At least 2 weeks of reports needed to show volume trends."
    >
      <div className="w-full" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
          >
            <ChartGradients />
            <CartesianGrid vertical={false} {...gridDefaults} />
            <XAxis
              dataKey="label"
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
                    name === "Tonnage"
                      ? `${val.toLocaleString()} lbs`
                      : val
                  }
                />
              }
            />
            {avgTonnage > 0 && (
              <ReferenceLine
                y={avgTonnage}
                stroke={chartColors.cyan}
                strokeDasharray="6 4"
                strokeOpacity={0.4}
                label={{
                  value: `Avg ${formatCompact(avgTonnage)}`,
                  position: "right",
                  fill: chartColors.cyan,
                  fontSize: 10,
                  fontFamily: "inherit",
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="tonnage"
              name="Tonnage"
              stroke={chartColors.neonPink}
              strokeWidth={2}
              fill="url(#pinkGradient)"
              dot={{
                r: 3,
                fill: chartColors.neonPink,
                strokeWidth: 0,
              }}
              activeDot={{
                r: 5,
                fill: chartColors.neonPink,
                stroke: "#fff",
                strokeWidth: 2,
              }}
              {...animationDefaults}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      {hasData && (
        <div className="flex items-center justify-between mt-3 px-1">
          <Stat
            label="Latest"
            value={formatCompact(data[data.length - 1]?.tonnage)}
            color={chartColors.neonPink}
          />
          <Stat
            label="Period Avg"
            value={formatCompact(avgTonnage)}
            color={chartColors.cyan}
          />
          <DeltaStat data={data} />
        </div>
      )}
    </ChartCard>
  );
}

// Mini stat below chart
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

// Percentage change from second-to-last → last
function DeltaStat({ data }) {
  if (data.length < 2) return null;
  const prev = data[data.length - 2]?.tonnage || 0;
  const curr = data[data.length - 1]?.tonnage || 0;
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
