import { inputPatterns, fieldPatterns } from "../utils/uiPatterns";

/**
 * Resizable retro textarea.
 *
 * Props:
 *   label   — optional field label
 *   hint    — optional hint text below
 */
export function Textarea({ label, hint, className = "", ...props }) {
  return (
    <div className={fieldPatterns.wrapper}>
      {label && <label className={fieldPatterns.label}>{label}</label>}
      <textarea
        className={`${inputPatterns.textarea} ${className}`.trim()}
        {...props}
      />
      {hint && <span className={fieldPatterns.hint}>{hint}</span>}
    </div>
  );
}

export default Textarea;
