import React from "react";

/**
 * Scroll to Bottom Button Component
 * A fixed-position button that scrolls the user to the bottom of a scrollable container
 *
 * Features:
 * - Primary neon pink styling matching standard CTA buttons
 * - Rounded square shape (like ChatInput submit button)
 * - Responsive positioning for mobile/tablet/desktop
 * - Hover, active, and focus states
 * - Prevents context menu and tap highlighting
 */
function ScrollToBottomButton({ onClick, show = true, className = "" }) {
  // Force show for now as requested, but keep the prop for future use
  const shouldShow = show || true;

  if (!shouldShow) return null;

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-32 sm:bottom-36 md:bottom-[186px] left-1/2 -translate-x-1/2 w-12 h-12 bg-synthwave-neon-pink text-synthwave-bg-primary rounded-2xl cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary flex items-center justify-center flex-shrink-0 z-[99999] ${className}`}
      aria-label="Scroll to bottom"
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  );
}

export default ScrollToBottomButton;
