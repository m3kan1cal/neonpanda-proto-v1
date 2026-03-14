import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { chartColors, animationDefaults } from "./chartTheme";

// ---------------------------------------------------------------------------
// Sparkline — tiny inline trend chart (no axes, no labels, no grid)
// Used inside dashboard highlight cards to show at-a-glance trends.
//
// Props:
//   data       — array of objects, each must have a `value` key
//   color      — stroke/fill color (default: neonPink)
//   width      — container width (default: 80)
//   height     — container height (default: 28)
//   variant    — "line" | "area" (default: "area")
//   showDots   — show dots on data points (default: false)
// ---------------------------------------------------------------------------

export default function Sparkline({
  data = [],
  color = chartColors.neonPink,
  width = 80,
  height = 28,
  variant = "area",
  showDots = false,
}) {
  if (!data || data.length < 2) return null;

  const ChartComponent = variant === "area" ? AreaChart : LineChart;
  const DataComponent = variant === "area" ? Area : Line;

  return (
    <div style={{ width, height }} className="inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <DataComponent
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={variant === "area" ? color : "none"}
            fillOpacity={variant === "area" ? 0.15 : 0}
            dot={showDots ? { r: 1.5, fill: color, strokeWidth: 0 } : false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: extract sparkline-ready data from weekly reports
// ---------------------------------------------------------------------------

/**
 * Converts recentReports (from ReportAgent) into sparkline-compatible arrays.
 * Returns { volumeSparkline, frequencySparkline } — each is [{ value }] sorted oldest→newest.
 */
export function extractSparklineData(recentReports = []) {
  if (!recentReports || recentReports.length < 2) {
    return { volumeSparkline: [], frequencySparkline: [] };
  }

  // Reports come sorted desc — reverse for oldest-first
  const sorted = [...recentReports].reverse();

  const volumeSparkline = sorted.map((r) => {
    const sa = r.analyticsData?.structured_analytics || r.structured_analytics || {};
    const tonnage = sa.volume_breakdown?.working_sets?.total_tonnage;
    return { value: Number(tonnage) || 0 };
  });

  const frequencySparkline = sorted.map((r) => {
    const sa = r.analyticsData?.structured_analytics || r.structured_analytics || {};
    const sessions = sa.metadata?.sessions_completed;
    return { value: Number(sessions) || 0 };
  });

  return { volumeSparkline, frequencySparkline };
}
