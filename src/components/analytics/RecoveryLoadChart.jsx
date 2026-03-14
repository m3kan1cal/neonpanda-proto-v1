import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  chartColors,
  ChartGradients,
  axisDefaults,
  gridDefaults,
  animationDefaults,
} from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// RecoveryLoadChart — dual-axis line chart:
//   Left Y-axis:  Recovery score (1-10)
//   Right Y-axis: Acute:Chronic workload ratio (0.5-2.0)
// With danger-zone shading for A:C ratio.
// ---------------------------------------------------------------------------

// A:C ratio zones
const ZONE_GREEN_LOW = 0.8;
const ZONE_GREEN_HIGH = 1.3;
const ZONE_YELLOW_HIGH = 1.5;

export default function RecoveryLoadChart({
  data = [], // weeklyChartData with recoveryScore and acRatio
  isLoading = false,
}) {
  // Filter to weeks that have recovery or ac ratio data
  const chartData = data.filter(
    (d) => d.recoveryScore > 0 || d.acRatio > 0,
  );
  const hasData = chartData.length >= 2;

  return (
    <ChartCard
      title="Recovery & Load"
      subtitle="Recovery score vs acute:chronic workload ratio"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="Recovery and load data will appear once weekly reports include fatigue management analysis."
    >
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
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

            {/* Left Y: Recovery Score (1-10) */}
            <YAxis
              yAxisId="recovery"
              orientation="left"
              domain={[0, 10]}
              {...axisDefaults}
              width={32}
              tickFormatter={(v) => v}
              label={{
                value: "Recovery",
                angle: -90,
                position: "insideLeft",
                fill: chartColors.green,
                fontSize: 9,
                dy: 30,
              }}
            />

            {/* Right Y: A:C Ratio */}
            <YAxis
              yAxisId="acr"
              orientation="right"
              domain={[0, 2.2]}
              {...axisDefaults}
              width={36}
              tickFormatter={(v) => v.toFixed(1)}
              label={{
                value: "A:C Ratio",
                angle: 90,
                position: "insideRight",
                fill: chartColors.warning,
                fontSize: 9,
                dy: -25,
              }}
            />

            <Tooltip content={<RecoveryTooltip />} />

            {/* Zone shading for A:C ratio */}
            {/* Green zone: 0.8 - 1.3 */}
            <ReferenceArea
              yAxisId="acr"
              y1={ZONE_GREEN_LOW}
              y2={ZONE_GREEN_HIGH}
              fill={chartColors.green}
              fillOpacity={0.04}
              strokeOpacity={0}
            />
            {/* Yellow zone: 1.3 - 1.5 */}
            <ReferenceArea
              yAxisId="acr"
              y1={ZONE_GREEN_HIGH}
              y2={ZONE_YELLOW_HIGH}
              fill={chartColors.yellow}
              fillOpacity={0.04}
              strokeOpacity={0}
            />
            {/* Red zone: > 1.5 */}
            <ReferenceArea
              yAxisId="acr"
              y1={ZONE_YELLOW_HIGH}
              y2={2.2}
              fill={chartColors.warning}
              fillOpacity={0.05}
              strokeOpacity={0}
            />

            {/* Sweet spot reference line */}
            <ReferenceLine
              yAxisId="acr"
              y={1.0}
              stroke={chartColors.green}
              strokeDasharray="4 4"
              strokeOpacity={0.3}
            />

            {/* Recovery score — green area */}
            <Area
              yAxisId="recovery"
              type="monotone"
              dataKey="recoveryScore"
              name="Recovery"
              stroke={chartColors.green}
              strokeWidth={2}
              fill="url(#greenGradient)"
              dot={{
                r: 3,
                fill: chartColors.green,
                strokeWidth: 0,
              }}
              activeDot={{
                r: 5,
                fill: chartColors.green,
                stroke: "#fff",
                strokeWidth: 2,
              }}
              {...animationDefaults}
            />

            {/* A:C Ratio — warning-colored line */}
            <Line
              yAxisId="acr"
              type="monotone"
              dataKey="acRatio"
              name="A:C Ratio"
              stroke={chartColors.warning}
              strokeWidth={2}
              dot={{
                r: 3,
                fill: chartColors.warning,
                strokeWidth: 0,
              }}
              activeDot={{
                r: 5,
                fill: chartColors.warning,
                stroke: "#fff",
                strokeWidth: 2,
              }}
              {...animationDefaults}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + zone guide */}
      {hasData && (
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-3">
            <LegendDot color={chartColors.green} label="Recovery (1-10)" />
            <LegendDot color={chartColors.warning} label="A:C Ratio" />
          </div>
          <div className="flex items-center gap-2">
            <ZoneBadge color={chartColors.green} label="Safe" range="0.8–1.3" />
            <ZoneBadge color={chartColors.yellow} label="Caution" range="1.3–1.5" />
            <ZoneBadge color={chartColors.warning} label="Danger" range=">1.5" />
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function RecoveryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

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
      {payload.map((entry, i) => {
        let formatted = entry.value;
        if (entry.name === "Recovery") formatted = `${entry.value}/10`;
        if (entry.name === "A:C Ratio") {
          formatted = entry.value.toFixed(2);
          // Add zone label
          const zone =
            entry.value <= ZONE_GREEN_HIGH
              ? " (safe)"
              : entry.value <= ZONE_YELLOW_HIGH
                ? " (caution)"
                : " (danger)";
          formatted += zone;
        }
        return (
          <p key={i} className="font-body text-xs" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{formatted}</span>
          </p>
        );
      })}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="font-body text-[10px] text-synthwave-text-muted">{label}</span>
    </div>
  );
}

function ZoneBadge({ color, label, range }) {
  return (
    <span
      className="font-body text-[9px] px-1.5 py-0.5 rounded"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {label} {range}
    </span>
  );
}
