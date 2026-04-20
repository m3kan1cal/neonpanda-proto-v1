import React from "react";
import { createPortal } from "react-dom";
import useBuildStaleness from "../../hooks/useBuildStaleness";
import { buttonPatterns } from "../../utils/ui/uiPatterns";

/**
 * Calm, dismissible banner that appears when a newer build is deployed than the
 * one currently running in the tab. Mounted once at the app root and shown on
 * every route.
 */
const NewBuildBanner = () => {
  const { isStale, reload, snooze } = useBuildStaleness();

  if (!isStale) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="region"
      aria-label="App update available"
      aria-live="polite"
      className="fixed inset-x-0 z-[9998] flex justify-center px-4 pointer-events-none bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto max-w-lg w-full rounded-lg border border-synthwave-neon-cyan/40 bg-synthwave-bg-card/95 backdrop-blur-sm shadow-lg shadow-synthwave-neon-cyan/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <p className="font-heading text-base text-synthwave-text-primary">
            A new version of NeonPanda is available
          </p>
          <p className="font-body text-sm text-synthwave-text-secondary mt-1">
            Reload the app to pick up the latest fixes and improvements.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={snooze}
            className={buttonPatterns.secondarySmall}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={reload}
            className={buttonPatterns.primarySmall}
            autoFocus={false}
          >
            Reload app
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default NewBuildBanner;
