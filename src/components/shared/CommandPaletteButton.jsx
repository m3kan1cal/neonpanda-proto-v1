import React, { useMemo } from "react";
import { commandPalettePatterns } from "../../utils/ui/uiPatterns";

/**
 * CommandPaletteButton - Compact button to trigger command palette
 *
 * Features:
 * - Platform-aware keyboard shortcut display (⌘ + K for Mac, Ctrl+K for Windows/Linux)
 * - Subtle background with hover effects
 * - Synthwave theme styling via uiPatterns
 * - Accessibility support (ARIA labels, keyboard navigation)
 *
 * @param {Function} onClick - Click handler to open command palette
 */
const CommandPaletteButton = ({ onClick }) => {
  // Detect platform for keyboard shortcut display
  const isMac = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      navigator.platform.toUpperCase().indexOf("MAC") >= 0
    );
  }, []);

  return (
    <button
      onClick={onClick}
      aria-label="Open command palette"
      aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      className={`${commandPalettePatterns.triggerButton} hidden md:flex`}
      data-tooltip-id="command-palette-button"
      data-tooltip-content="Show command palette"
    >
      <div className="flex items-center gap-1">
        <kbd className={commandPalettePatterns.triggerButtonKbd}>
          {isMac ? "⌘" : "Ctrl"}
        </kbd>
        <kbd className={commandPalettePatterns.triggerButtonKbd}>K</kbd>
      </div>
    </button>
  );
};

export default CommandPaletteButton;
