import { typographyPatterns } from "../utils/uiPatterns";

/**
 * Blinking block cursor — appended to display text.
 * Colors: cyan (default) | pink.
 */
export function Cursor({ color = "cyan", className = "", ...props }) {
  const base =
    color === "pink"
      ? typographyPatterns.cursorPink
      : typographyPatterns.cursor;

  return <span className={`${base} ${className}`.trim()} {...props} />;
}

export default Cursor;
