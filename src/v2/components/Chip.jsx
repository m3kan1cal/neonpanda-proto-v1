import { chipPatterns } from "../utils/uiPatterns";

/**
 * Removable chip / tag.
 * Pass `onRemove` to show the × button; omit it for a static chip.
 */
export function Chip({ children, onRemove, className = "", ...props }) {
  return (
    <span className={`${chipPatterns.chip} ${className}`.trim()} {...props}>
      {children}
      {onRemove && (
        <span
          className={chipPatterns.remove}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          role="button"
          aria-label="Remove"
        >
          ×
        </span>
      )}
    </span>
  );
}

export default Chip;
