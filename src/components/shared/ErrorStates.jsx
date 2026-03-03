import React from "react";
import { themeClasses } from "../../utils/synthwaveThemeClasses";
import { containerPatterns, buttonPatterns } from "../../utils/ui/uiPatterns";

// Standardized loading spinner component
export const LoadingSpinner = ({ size = "large", text = "Loading..." }) => {
  const spinnerSize =
    size === "large" ? "h-12 w-12" : size === "medium" ? "h-8 w-8" : "h-4 w-4";
  const textSize =
    size === "large"
      ? "text-base"
      : size === "medium"
        ? "text-base"
        : "text-sm";

  return (
    <div className="text-center">
      <div
        className={`animate-spin rounded-full ${spinnerSize} border-b-2 border-synthwave-neon-cyan mx-auto mb-4`}
      ></div>
      <p className={`text-synthwave-text-secondary font-rajdhani ${textSize}`}>
        {text}
      </p>
    </div>
  );
};

// Standardized full-screen loading state
export const FullPageLoader = ({ text = "Loading..." }) => (
  <div
    className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}
  >
    <LoadingSpinner size="large" text={text} />
  </div>
);

// Standardized error state component
export const ErrorState = ({
  title = "Error",
  message = "Something went wrong",
  buttonText = "Go Back",
  onButtonClick,
  variant = "error", // 'error', 'warning', 'info'
}) => {
  return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-4xl mx-auto px-8 py-12 flex justify-center">
        <div className={`${containerPatterns.errorState} w-full max-w-4xl`}>
          <div className="flex items-center space-x-3 mb-4">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h5 className="font-barlow text-lg text-red-400 uppercase">
              {title}
            </h5>
          </div>
          <p className="text-red-300 font-rajdhani text-sm mb-6">{message}</p>
          {onButtonClick && (
            <button onClick={onButtonClick} className={buttonPatterns.primary}>
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Standardized centered error state (for smaller areas)
export const CenteredErrorState = ({
  title = "Error",
  message = "Something went wrong",
  buttonText = "Go Back",
  onButtonClick,
  variant = "error",
}) => {
  return (
    <div
      className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}
    >
      <div className={`${containerPatterns.errorState} w-full max-w-lg mx-6`}>
        <div className="flex items-center space-x-3 mb-4">
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h5 className="font-barlow text-lg text-red-400 uppercase">
            {title}
          </h5>
        </div>
        <p className="text-red-300 font-rajdhani text-sm mb-6">{message}</p>
        {onButtonClick && (
          <button onClick={onButtonClick} className={buttonPatterns.primary}>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

// Inline error component for smaller sections
export const InlineError = ({
  title = "Error",
  message = "Something went wrong",
  variant = "error",
  size = "medium", // 'small', 'medium', 'large'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return {
          container: "py-4",
          title: "text-sm",
          message: "text-xs",
        };
      case "large":
        return {
          container: "py-8",
          title: "text-lg",
          message: "text-base",
        };
      case "medium":
      default:
        return {
          container: "py-6",
          title: "text-base",
          message: "text-sm",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div
      className={`${containerPatterns.inlineError} ${sizeClasses.container}`}
    >
      <div className="flex items-center space-x-3 mb-2">
        <svg
          className="w-4 h-4 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div
          className={`font-barlow text-red-400 ${sizeClasses.title} font-bold uppercase`}
        >
          {title}
        </div>
      </div>
      <div className={`font-rajdhani text-red-300 ${sizeClasses.message}`}>
        {message}
      </div>
    </div>
  );
};

/**
 * SectionEmptyState - Minimal single-line empty state for dashboard section cards.
 *
 * Replaces the verbose numbered-step pattern with a clean message + optional
 * inline action link. Keeps visual weight low so the empty state doesn't
 * compete with real content or CTAs elsewhere on the page.
 *
 * @param {string} message - Short descriptive text (e.g. "No programs yet.")
 * @param {string} [actionLabel] - Label for the inline action link (e.g. "Design one")
 * @param {Function} [onAction] - Callback invoked when the action link is clicked
 * @param {string} [className] - Classes applied to the wrapper (replaces default py-3 when provided)
 */
export const SectionEmptyState = ({
  message,
  actionLabel,
  onAction,
  className,
}) => (
  <div className={className || "py-3"}>
    <p className="font-rajdhani text-sm text-synthwave-text-muted">
      {message}
      {actionLabel && onAction && (
        <>
          {" "}
          <button
            onClick={onAction}
            className="text-synthwave-neon-cyan hover:text-synthwave-neon-cyan/80 transition-colors duration-200 cursor-pointer font-semibold"
          >
            {actionLabel} →
          </button>
        </>
      )}
    </p>
  </div>
);

// Empty state component
export const EmptyState = ({
  title = "No Data",
  message = "Nothing to show here",
  size = "medium",
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return {
          container: "py-4",
          title: "text-sm",
          message: "text-xs",
        };
      case "large":
        return {
          container: "py-8",
          title: "text-lg",
          message: "text-base",
        };
      case "medium":
      default:
        return {
          container: "py-6",
          title: "text-base",
          message: "text-sm",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`text-center ${sizeClasses.container}`}>
      <div
        className={`font-rajdhani text-synthwave-text-muted ${sizeClasses.title}`}
      >
        {title}
      </div>
      {message && (
        <div
          className={`font-rajdhani text-synthwave-text-muted ${sizeClasses.message} mt-1`}
        >
          {message}
        </div>
      )}
    </div>
  );
};
