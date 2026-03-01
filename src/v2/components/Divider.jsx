import { miscPatterns } from "../utils/uiPatterns";

/**
 * Horizontal divider.
 *
 * Props:
 *   label — if provided, renders a centered label with lines on both sides
 */
export function Divider({ label, className = "" }) {
  if (label) {
    return (
      <div className={`${miscPatterns.dividerLabel} ${className}`.trim()}>
        {label}
      </div>
    );
  }

  return <div className={`${miscPatterns.divider} ${className}`.trim()} />;
}

export default Divider;
