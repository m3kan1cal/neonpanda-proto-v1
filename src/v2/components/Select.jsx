import { inputPatterns, fieldPatterns } from "../utils/uiPatterns";

/**
 * Styled select / dropdown using the retro input appearance.
 *
 * Props:
 *   label    — optional field label
 *   options  — array of strings or { value, label } objects
 */
export function Select({ label, options = [], className = "", ...props }) {
  return (
    <div className={fieldPatterns.wrapper}>
      {label && <label className={fieldPatterns.label}>{label}</label>}
      <select
        className={`${inputPatterns.base} ${className}`.trim()}
        {...props}
      >
        {options.map((opt) =>
          typeof opt === "string" ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}

export default Select;
