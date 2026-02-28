import { inputPatterns, fieldPatterns } from "../utils/uiPatterns";

/**
 * Retro range slider.
 *
 * Props:
 *   label — optional field label
 *   hint  — optional hint below (e.g. "65% TRAINING MAX")
 */
export function Range({ label, hint, className = "", ...props }) {
  return (
    <div className={fieldPatterns.wrapper}>
      {label && <label className={fieldPatterns.label}>{label}</label>}
      <input
        type="range"
        className={`${inputPatterns.range} ${className}`.trim()}
        {...props}
      />
      {hint && <span className={fieldPatterns.hint}>{hint}</span>}
    </div>
  );
}

export default Range;
