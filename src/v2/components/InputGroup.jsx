import { inputPatterns, fieldPatterns } from "../utils/uiPatterns";

/**
 * Input with a fixed prefix symbol (e.g. ">_" or "$").
 *
 * Props:
 *   label   — field label above
 *   prefix  — prefix symbol string (default ">_")
 */
export function InputGroup({ label, prefix = ">_", className = "", ...props }) {
  return (
    <div className={fieldPatterns.wrapper}>
      {label && <label className={fieldPatterns.label}>{label}</label>}
      <div className={`${inputPatterns.group} ${className}`.trim()}>
        <span className={inputPatterns.groupPrefix}>{prefix}</span>
        <input className={inputPatterns.groupInput} {...props} />
      </div>
    </div>
  );
}

export default InputGroup;
