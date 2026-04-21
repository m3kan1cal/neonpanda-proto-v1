import React from "react";
import { createPortal } from "react-dom";
import useBuildStaleness from "../../hooks/useBuildStaleness";
import {
  buttonPatterns,
  containerPatterns,
} from "../../utils/ui/uiPatterns";
import { CloseIcon } from "../themes/SynthwaveComponents";

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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] px-4"
      onClick={snooze}
    >
      <div
        className={`${containerPatterns.successModal} p-6 relative max-w-md w-full`}
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
              className={`flex-1 ${buttonPatterns.secondarySmall} text-base`}
              autoFocus
            >
              Not now
            </button>
            <button
              type="button"
              onClick={reload}
              className={`flex-1 ${buttonPatterns.primarySmall} text-base`}
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
