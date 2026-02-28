import { inputPatterns, fieldPatterns } from "../utils/uiPatterns";

/**
 * Retro text input with optional field wrapper.
 *
 * Props:
 *   label     — field label above the input
 *   hint      — hint text below
 *   error     — error message (also applies error border)
 *   success   — success message (also applies success border)
 *   disabled  — disabled state
 *   wrapField — if true (default), wraps in a field container
 */
export function Input({
  label,
  hint,
  error,
  success,
  disabled = false,
  wrapField = true,
  className = "",
  ...props
}) {
  const inputClass = error
    ? inputPatterns.error
    : success
      ? inputPatterns.success
      : disabled
        ? inputPatterns.disabled
        : inputPatterns.base;

  const inputEl = (
    <input
      className={`${inputClass} ${className}`.trim()}
      disabled={disabled}
      {...props}
    />
  );

  if (!wrapField) return inputEl;

  return (
    <div className={fieldPatterns.wrapper}>
      {label && <label className={fieldPatterns.label}>{label}</label>}
      {inputEl}
      {error && <span className={fieldPatterns.error}>{error}</span>}
      {success && <span className={fieldPatterns.success}>{success}</span>}
      {hint && !error && !success && (
        <span className={fieldPatterns.hint}>{hint}</span>
      )}
    </div>
  );
}

export default Input;
