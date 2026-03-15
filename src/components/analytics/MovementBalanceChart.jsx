import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Tooltip,
} from "recharts";
import { chartColors } from "./chartTheme";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// MovementBalanceChart — radar chart showing push/pull/squat/hinge/carry/core
// Overlays current week vs average of prior weeks.
// ---------------------------------------------------------------------------

const PATTERNS = ["squat", "hinge", "push", "pull", "carry", "core"];
const PATTERN_LABELS = {
  squat: "Squat",
  hinge: "Hinge",
  push: "Push",
  pull: "Pull",
  carry: "Carry",
  core: "Core",
};

export default function MovementBalanceChart({
  weeklyData = [], // full weeklyChartData array with patternBalance per week
  isLoading = false,
  wide = false, // when true, renders chart + callouts side-by-side
}) {
  // Build radar data: current week vs average of all prior weeks
  const { radarData, hasData, imbalanceFlags } = useMemo(() => {
    // Find weeks that have pattern_balance data
    const withBalance = weeklyData.filter((w) => w.patternBalance);
    if (withBalance.length === 0)
      return { radarData: [], hasData: false, imbalanceFlags: [] };

    const current = withBalance[withBalance.length - 1];
    const prior = withBalance.slice(0, -1);

    const radarData = PATTERNS.map((pattern) => {
      const currentVol = current.patternBalance?.[pattern]?.volume || 0;
      const currentFreq = current.patternBalance?.[pattern]?.frequency || 0;

      // Average of prior weeks
      let avgVol = 0;
      let avgFreq = 0;
      if (prior.length > 0) {
        avgVol =
          prior.reduce(
            (sum, w) => sum + (w.patternBalance?.[pattern]?.volume || 0),
            0,
          ) / prior.length;
        avgFreq =
          prior.reduce(
            (sum, w) => sum + (w.patternBalance?.[pattern]?.frequency || 0),
            0,
          ) / prior.length;
      }

      return {
        pattern: PATTERN_LABELS[pattern],
        currentVolume: Math.round(currentVol),
        avgVolume: Math.round(avgVol),
        currentFrequency: currentFreq,
        avgFrequency: Math.round(avgFreq * 10) / 10,
      };
    });

    // Collect imbalance flags from the most recent week
    const imbalanceFlags = current.imbalanceFlags || [];

    return {
      radarData,
      hasData: radarData.some((d) => d.currentVolume > 0 || d.avgVolume > 0),
      imbalanceFlags,
    };
  }, [weeklyData]);

  const radarChart = (
    <div className="w-full" style={{ height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke={chartColors.grid} strokeWidth={1} />
          <PolarAngleAxis
            dataKey="pattern"
            tick={{
              fill: chartColors.axisLabel,
              fontSize: 11,
              fontFamily: "inherit",
            }}
          />
          <PolarRadiusAxis
            tick={{ fill: chartColors.axisTick, fontSize: 9 }}
            axisLine={false}
            tickCount={4}
          />
          <Tooltip content={<BalanceTooltip />} />
          <Radar
            name="Avg (prior weeks)"
            dataKey="avgVolume"
            stroke={chartColors.cyan}
            fill={chartColors.cyan}
            fillOpacity={0.1}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
          <Radar
            name="Latest week"
            dataKey="currentVolume"
            stroke={chartColors.neonPink}
            fill={chartColors.neonPink}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 3, fill: chartColors.neonPink, strokeWidth: 0 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "inherit" }}
            iconType="line"
            formatter={(value) => (
              <span style={{ color: chartColors.axisLabel }}>{value}</span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );

  const flagsPanel =
    imbalanceFlags.length > 0 ? (
      <div className="space-y-1.5">
        {imbalanceFlags.map((flag, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-synthwave-neon-pink shrink-0" />
            <span className="font-body text-xs text-synthwave-neon-pink">
              {formatImbalanceFlag(flag)}
            </span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <ChartCard
      title="Movement Balance"
      subtitle="Volume by movement pattern — latest week vs average"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="Movement pattern data will appear once weekly reports include pattern balance analysis."
    >
      {wide ? (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0 lg:max-w-[55%]">{radarChart}</div>
          {flagsPanel && (
            <div className="flex-[0.75] min-w-0 flex flex-col justify-start gap-2">
              <p className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wider mb-0.5">
                Imbalance Alerts
              </p>
              {flagsPanel}
            </div>
          )}
        </div>
      ) : (
        <>
          {radarChart}
          {flagsPanel && <div className="mt-3">{flagsPanel}</div>}
        </>
      )}
    </ChartCard>
  );
}

function BalanceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-md px-3 py-2.5 shadow-lg border backdrop-blur-sm"
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
            {entry.value.toLocaleString()} lbs
          </span>
        </p>
      ))}
    </div>
  );
}

// Convert snake_case flag to readable text
function formatImbalanceFlag(flag) {
  return flag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
