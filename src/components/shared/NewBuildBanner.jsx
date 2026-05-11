import React from "react";
import { createPortal } from "react-dom";
import useBuildStaleness from "../../hooks/useBuildStaleness";
import { containerPatterns } from "../../utils/ui/uiPatterns";
import { CloseIcon } from "../themes/SynthwaveComponents";

// Local overrides of buttonPatterns.primarySmall / secondarySmall:
//   - active:scale-[0.95] (instead of 0.97) — more visible press shrink on
//     small buttons (~32–40px tall)
//   - secondary ring opacity bumped to /80 because the modal container is
//     cyan-tinted (see containerPatterns.successModal), so a cyan/50 ring
//     blends in
//   - touched-up shared pattern otherwise. Inlined because the project does
//     not use tailwind-merge, so appending overrides is unreliable.
const reloadPrimaryButton =
  "bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-full font-body font-medium text-sm uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-pink/90 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/80 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary active:ring-2 active:ring-synthwave-neon-pink/80 active:ring-offset-2 active:ring-offset-synthwave-bg-primary active:scale-[0.95] active:shadow-neon-pink touch-manipulation [-webkit-tap-highlight-color:transparent] min-h-[32px] flex items-center justify-center";

const reloadSecondaryButton =
  "bg-transparent border border-synthwave-neon-cyan text-synthwave-neon-cyan px-3 py-1.5 rounded-full font-body font-medium text-sm uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/80 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary active:ring-2 active:ring-synthwave-neon-cyan/80 active:ring-offset-2 active:ring-offset-synthwave-bg-primary active:scale-[0.95] active:shadow-neon-cyan touch-manipulation [-webkit-tap-highlight-color:transparent] min-h-[32px] flex items-center justify-center";

// Empty handler exists solely to make iOS Safari fire :active reliably on
// <button> elements. Without it, tapping can produce no visual feedback at
// all because [-webkit-tap-highlight-color:transparent] suppresses the
// default tap flash.
const noopTouchStart = () => {};

/**
 * Centered modal that appears when a newer build is deployed than the one
 * currently running in the tab. Mounted once at the app root and shown on
 * every route. Matches the app's standard success-modal pattern so buttons
 * have unambiguous tap targets on mobile.
 */
const NewBuildBanner = () => {
  const { isStale, reload, snooze } = useBuildStaleness();

  if (!isStale) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App update available"
      aria-live="polite"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]"
      onClick={snooze}
    >
      <div
        className={`${containerPatterns.successModal} p-6 relative max-w-md w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={snooze}
          className="absolute top-4 right-4 p-1 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors cursor-pointer"
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        <div className="text-center">
          <h3 className="text-synthwave-neon-cyan font-body text-xl font-bold mb-2 pr-6">
            A new version of NeonPanda is available
          </h3>
          <p className="font-body text-base text-synthwave-text-secondary mb-6">
            Reload the app to pick up the latest fixes and improvements.
          </p>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={snooze}
              onTouchStart={noopTouchStart}
              className={`flex-1 ${reloadSecondaryButton} text-base`}
              autoFocus
            >
              Not now
            </button>
            <button
              type="button"
              onClick={reload}
              onTouchStart={noopTouchStart}
              className={`flex-1 ${reloadPrimaryButton} text-base`}
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default NewBuildBanner;
