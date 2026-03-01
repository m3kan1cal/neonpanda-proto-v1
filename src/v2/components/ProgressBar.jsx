import { progressPatterns } from "../utils/uiPatterns";

const FILL_VARIANTS = {
  cyan: progressPatterns.fillCyan,
  pink: progressPatterns.fillPink,
  lime: progressPatterns.fillLime,
  amber: progressPatterns.fillAmber,
  red: progressPatterns.fillRed,
  animated: progressPatterns.fillAnimated,
};

/**
 * Retro progress bar with glow tip.
 *
 * Props:
 *   name     — left label (e.g. "BACK SQUAT")
 *   value    — right value label (e.g. "285 / 300 LB")
 *   percent  — fill width 0–100
 *   color    — cyan | pink | lime | amber | red | animated
 *   thick    — use 6px track instead of 2px
 */
export function ProgressBar({
  name,
  value,
  percent = 0,
  color = "cyan",
  thick = false,
  className = "",
}) {
  const fill = FILL_VARIANTS[color] ?? FILL_VARIANTS.cyan;
  const track = thick ? progressPatterns.trackThick : progressPatterns.track;

  return (
    <div className={`${progressPatterns.wrapper} ${className}`.trim()}>
      {(name || value) && (
        <div className={progressPatterns.meta}>
          {name && <span className={progressPatterns.name}>{name}</span>}
          {value && <span className={progressPatterns.val}>{value}</span>}
        </div>
      )}
      <div className={track}>
        <div
          className={fill}
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
