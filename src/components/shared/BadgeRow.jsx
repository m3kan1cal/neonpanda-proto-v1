import React, { useRef, useState } from "react";
import { useVisibleCount } from "../../hooks/useVisibleCount";

/**
 * BadgeRow
 *
 * Renders a list of badges on a single line. When badges overflow the container
 * width a "+N more" button is shown. Clicking it expands to show all badges in
 * a wrapped layout.
 *
 * Uses a hidden absolute measurement div (always containing all badges) as the
 * source of truth for useVisibleCount. This ensures:
 *   - Accurate initial measurement
 *   - Correct re-measurement on resize-to-wider (more badges may now fit)
 *
 * Props:
 *   badges              - array of { key: string, label: string, className?: string }
 *                          Per-badge className overrides badgeClassName when provided.
 *   badgeClassName      - Tailwind classes applied to every badge span (default)
 *   className           - optional extra classes for the outer container
 *   moreButtonClassName - optional classes for the "+N more" / "less" button
 */
const BadgeRow = ({
  badges = [],
  badgeClassName = "",
  className = "",
  moreButtonClassName = "",
}) => {
  const [expanded, setExpanded] = useState(false);

  // measureRef is on a hidden div that ALWAYS contains all badges.
  // This is the source of truth — never sliced, so resize events work correctly.
  const measureRef = useRef(null);
  const { visibleCount } = useVisibleCount(measureRef, badges.length);

  const hasOverflow = visibleCount < badges.length;
  const overflowCount = badges.length - visibleCount;

  const defaultMoreButton =
    "text-synthwave-neon-cyan hover:text-synthwave-neon-pink hover:bg-synthwave-neon-cyan/5 text-xs font-body font-semibold uppercase transition-all duration-200 px-1 py-0.5 shrink-0";

  if (expanded) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {badges.map((badge) => (
          <span key={badge.key} className={badge.className || badgeClassName}>
            {badge.label}
          </span>
        ))}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className={moreButtonClassName || defaultMoreButton}
        >
          less
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hidden measurement div — always renders ALL badges, never sliced.
          absolute + invisible so it occupies the same width as the visible row
          but doesn't affect layout or accessibility. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 flex flex-nowrap items-center gap-2 invisible pointer-events-none"
      >
        {badges.map((badge) => (
          <span
            key={badge.key}
            className={`${badge.className || badgeClassName} shrink-0`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      {/* Visible row — renders only the badges that fit + "+N more" button */}
      <div
        className={`flex flex-nowrap items-center gap-2 overflow-hidden ${className}`}
      >
        {badges.slice(0, visibleCount).map((badge) => (
          <span
            key={badge.key}
            className={`${badge.className || badgeClassName} shrink-0`}
          >
            {badge.label}
          </span>
        ))}

        {hasOverflow && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className={moreButtonClassName || defaultMoreButton}
          >
            +{overflowCount} more
          </button>
        )}
      </div>
    </div>
  );
};

export default BadgeRow;
