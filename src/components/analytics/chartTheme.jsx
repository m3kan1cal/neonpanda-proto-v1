// ---------------------------------------------------------------------------
// Chart Theme — Synthwave-native styling for Recharts
// ---------------------------------------------------------------------------

export const chartColors = {
  neonPink: "#FF006E",
  cyan: "#00D9FF",
  purple: "#9D4EDD",
  green: "#00FF88",
  warning: "#FF3366",
  yellow: "#FFD600",

  // Muted variants for grids and axes
  grid: "rgba(255,255,255,0.06)",
  axisLabel: "rgba(255,255,255,0.45)",
  axisTick: "rgba(255,255,255,0.15)",
  tooltipBg: "rgba(15, 23, 42, 0.95)",
  tooltipBorder: "rgba(0, 217, 255, 0.25)",
};

// Recharts axis/grid shared props
export const axisDefaults = {
  tick: { fill: chartColors.axisLabel, fontSize: 11, fontFamily: "inherit" },
  axisLine: { stroke: chartColors.axisTick },
  tickLine: { stroke: chartColors.axisTick },
};

export const gridDefaults = {
  stroke: chartColors.grid,
  strokeDasharray: "3 3",
};

// Animation
export const animationDefaults = {
  animationDuration: 800,
  animationEasing: "ease-out",
};

// SVG gradient definitions — render inside <defs> in any chart
export function ChartGradients() {
  return (
    <defs>
      <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={chartColors.neonPink} stopOpacity={0.35} />
        <stop
          offset="100%"
          stopColor={chartColors.neonPink}
          stopOpacity={0.0}
        />
      </linearGradient>
      <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={chartColors.cyan} stopOpacity={0.3} />
        <stop offset="100%" stopColor={chartColors.cyan} stopOpacity={0.0} />
      </linearGradient>
      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={chartColors.purple} stopOpacity={0.3} />
        <stop offset="100%" stopColor={chartColors.purple} stopOpacity={0.0} />
      </linearGradient>
      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={chartColors.green} stopOpacity={0.3} />
        <stop offset="100%" stopColor={chartColors.green} stopOpacity={0.0} />
      </linearGradient>
      <filter id="neonGlow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// Custom tooltip wrapper matching synthwave card style
export function SynthwaveTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-lg border backdrop-blur-sm"
      style={{
        background: chartColors.tooltipBg,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      {label && (
        <p className="font-header font-bold text-white text-xs uppercase tracking-wide mb-1.5">
          {label}
        </p>
      )}
      {payload.map((entry, i) => {
        const value = formatter
          ? formatter(entry.value, entry.name)
          : entry.value;
        return (
          <p
            key={i}
            className="font-body text-xs"
            style={{ color: entry.color }}
          >
            {entry.name}: <span className="font-semibold">{value}</span>
          </p>
        );
      })}
    </div>
  );
}

// Format large numbers compactly (e.g., 12500 → "12.5K", 10000 → "10K")
export function formatCompact(num) {
  if (num == null || isNaN(num)) return "—";
  if (num >= 1_000_000) {
    const v = num / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (num >= 1_000) {
    const v = num / 1_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Shared Tooltip defaults — spread onto <Tooltip> to disable slide animation
export const tooltipDefaults = {
  isAnimationActive: false,
  offset: 10,
};

// Cursor styling for bar charts — very subtle dark overlay
export const cursorBar = { fill: "rgba(255,255,255,0.04)" };

// Cursor styling for line/area charts — thin subtle stroke
export const cursorLine = { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 };

// Format a weekId like "2025-W10" → "W10"
export function formatWeekShort(weekId) {
  if (!weekId) return "";
  const match = weekId.match(/W(\d+)$/i);
  return match ? `W${match[1]}` : weekId;
}

// Format a week date range to short form "Mar 3–9"
export function formatWeekRange(weekStart, weekEnd) {
  if (!weekStart) return "";
  try {
    const start = new Date(weekStart);
    const end = weekEnd ? new Date(weekEnd) : null;
    const monthShort = start.toLocaleString("en-US", { month: "short" });
    const dayStart = start.getDate();
    if (end) {
      const dayEnd = end.getDate();
      const endMonth = end.toLocaleString("en-US", { month: "short" });
      if (monthShort === endMonth) return `${monthShort} ${dayStart}–${dayEnd}`;
      return `${monthShort} ${dayStart}–${endMonth} ${dayEnd}`;
    }
    return `${monthShort} ${dayStart}`;
  } catch {
    return weekStart;
  }
}

// Extract the best weight from a session's metrics
export function extractWeight(session) {
  const m = session.metrics || {};
  return m.bestSet?.weight || m.maxWeight || m.weight || 0;
}

// Extract the best reps from a session's metrics
export function extractReps(session) {
  const m = session.metrics || {};
  return m.bestSet?.reps || m.reps || 0;
}

// Format ISO date to short "Mar 3" format
export function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// Stat component for displaying labeled values with color
export function Stat({ label, value, color }) {
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
