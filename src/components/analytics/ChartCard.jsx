import React from "react";
import { containerPatterns } from "../../utils/ui/uiPatterns";

// ---------------------------------------------------------------------------
// ChartCard — reusable wrapper for chart sections
// ---------------------------------------------------------------------------

export default function ChartCard({
  title,
  subtitle,
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "Not enough data yet.",
  className = "",
}) {
  return (
    <div className={`${containerPatterns.cardMedium} p-5 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-header font-bold text-white text-base uppercase tracking-wide">
          {title}
        </h3>
        {subtitle && (
          <p className="font-body text-xs text-synthwave-text-secondary mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 py-4">
          <div className="h-40 bg-synthwave-text-muted/10 rounded-md animate-pulse" />
          <div className="flex gap-3">
            <div className="h-3 bg-synthwave-text-muted/15 rounded animate-pulse flex-1" />
            <div className="h-3 bg-synthwave-text-muted/15 rounded animate-pulse w-20" />
          </div>
        </div>
      ) : isEmpty ? (
        <div className="py-10 text-center">
          <p className="font-body text-sm text-synthwave-text-muted">
            {emptyMessage}
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
