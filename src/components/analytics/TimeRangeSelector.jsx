import React from "react";

// ---------------------------------------------------------------------------
// TimeRangeSelector — pill toggle for analytics time ranges
// ---------------------------------------------------------------------------

const RANGES = [
  { key: "4w", label: "4W", weeks: 4 },
  { key: "8w", label: "8W", weeks: 8 },
  { key: "12w", label: "12W", weeks: 12 },
  { key: "26w", label: "6M", weeks: 26 },
  { key: "52w", label: "1Y", weeks: 52 },
];

export { RANGES as TIME_RANGES };

export default function TimeRangeSelector({ value = "8w", onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-synthwave-bg-card/50 border border-synthwave-neon-cyan/10 p-0.5 cursor-pointer">
      {RANGES.map((r) => {
        const isActive = value === r.key;
        return (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            className={`px-2.5 py-1 rounded-full font-body font-bold text-xs uppercase tracking-wide transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border border-synthwave-neon-cyan/40"
                : "text-synthwave-text-muted border border-transparent hover:text-synthwave-neon-cyan/70 hover:bg-synthwave-neon-cyan/5"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
