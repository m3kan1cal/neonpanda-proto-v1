import React from "react";
import { buttonPatterns } from "../../utils/ui/uiPatterns";

// Shared Load more button for paginated Manage list surfaces.
// Hidden when there is nothing more to fetch so consumers don't need to gate
// rendering on hasMore themselves; keep it in a centered wrapper at the bottom
// of the list. Keeps the button enabled even during an error so a failed
// fetch can be retried with a single click (see ToastContext for the error
// surface).
const LoadMoreButton = ({
  onClick,
  isLoading = false,
  hasMore,
  className = "",
}) => {
  if (!hasMore) {
    return null;
  }

  const disabled = Boolean(isLoading);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={disabled}
      className={`${buttonPatterns.secondary} ${
        disabled ? "opacity-70 cursor-wait" : ""
      } ${className}`.trim()}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>Loading</span>
        </span>
      ) : (
        <span>Load more</span>
      )}
    </button>
  );
};

export default LoadMoreButton;
