import { loadingPatterns } from "../utils/uiPatterns";

/**
 * Circular spinner.
 * Sizes: sm | default | lg.
 */
export function Spinner({ size = "default", className = "", ...props }) {
  const base =
    size === "sm"
      ? loadingPatterns.spinnerSm
      : size === "lg"
        ? loadingPatterns.spinnerLg
        : loadingPatterns.spinner;

  return <div className={`${base} ${className}`.trim()} {...props} />;
}

export default Spinner;
