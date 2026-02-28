import { statCardPatterns } from "../utils/uiPatterns";

/**
 * Single-metric stat card with label, large value, sub-text, and optional delta.
 *
 * Props:
 *   label     — overline label (e.g. "BACK SQUAT MAX")
 *   value     — primary value (e.g. "285")
 *   unit      — small suffix after the value (e.g. " LB")
 *   accent    — if true, value renders in cyan glow
 *   sub       — sub-text line below the value
 *   delta     — change indicator (e.g. "↑ +15 LB")
 *   deltaDir  — "up" | "down" (controls color)
 *   deltaLabel— text after the delta (e.g. "SINCE START")
 */
export function StatCard({
  label,
  value,
  unit,
  accent = false,
  sub,
  delta,
  deltaDir = "up",
  deltaLabel,
  className = "",
  ...props
}) {
  return (
    <div className={`${statCardPatterns.card} ${className}`.trim()} {...props}>
      {label && <div className={statCardPatterns.label}>{label}</div>}
      <div
        className={
          accent ? statCardPatterns.valueAccent : statCardPatterns.value
        }
      >
        {value}
        {unit && <span style={{ fontSize: "20px", opacity: 0.5 }}>{unit}</span>}
      </div>
      {(sub || delta) && (
        <div className={statCardPatterns.sub}>
          {delta && (
            <span
              className={
                deltaDir === "down"
                  ? statCardPatterns.deltaDown
                  : statCardPatterns.deltaUp
              }
            >
              {delta}
            </span>
          )}{" "}
          {deltaLabel ?? sub}
        </div>
      )}
    </div>
  );
}

export default StatCard;
