import React from "react";
import { Link } from "react-router-dom";
import { getLatestVersions } from "../../utils/changelogData";

/**
 * Shared footer for all authenticated app screens.
 * Displays "Powered by NeonPanda", the current version (retro tag icon),
 * and a link to the changelog.
 *
 * Place inside `layoutPatterns.contentWrapper` as the last child element.
 */
function AppFooter() {
  const version =
    getLatestVersions(1)[0]?.version.replace("Release ", "") || "";

  return (
    <div className="mt-auto pt-8">
      {/* Subtle gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-synthwave-neon-cyan/15 to-transparent mb-6" />
      <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="font-body text-sm text-synthwave-text-muted">
            Powered by
          </span>
          <span className="font-header text-sm text-synthwave-neon-cyan uppercase tracking-wider">
            NeonPanda
          </span>
          <span className="hidden md:inline text-synthwave-text-muted/30 mx-1">
            /
          </span>
          {/* Retro pixel-art tag icon */}
          <svg
            className="hidden md:inline w-3.5 h-3.5 text-synthwave-neon-cyan"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m22,13v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1H2v1h-1v9h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h2v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-2h-1ZM4,5h1v-1h2v1h1v2h-1v1h-2v-1h-1v-2Z" />
          </svg>
          <span className="hidden md:inline font-body text-sm text-synthwave-text-muted">
            {version}
          </span>
        </div>
        <Link
          to="/changelog"
          className="hidden md:inline font-body text-sm text-synthwave-text-muted hover:text-synthwave-neon-cyan transition-colors"
        >
          Changelog
        </Link>
      </div>
    </div>
  );
}

export default AppFooter;
