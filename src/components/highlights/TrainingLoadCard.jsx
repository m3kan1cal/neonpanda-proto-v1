import React from "react";
import { containerPatterns } from "../../utils/ui/uiPatterns";
import Sparkline from "../analytics/Sparkline";
import { chartColors } from "../analytics/chartTheme";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTonnage(value) {
  if (!value || value === 0) return "—";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k lbs`;
  }
  return `${Math.round(value).toLocaleString()} lbs`;
}

// Threshold above which a percentage swing is too extreme to display literally.
// Instead we show the absolute change (e.g. "+62.5k lbs") which is more honest.
const DELTA_PCT_CAP = 99;

function formatDelta(current, prior) {
  if (!current || !prior || prior === 0) return null;
  const pct = ((current - prior) / prior) * 100;
  const rounded = Math.round(pct);
  const up = rounded >= 0;
  const extreme = Math.abs(rounded) > DELTA_PCT_CAP;
  return { pct: rounded, up, extreme };
}

function formatAbsoluteDelta(current, prior) {
  const diff = current - prior;
  const sign = diff >= 0 ? "+" : "−";
  const abs = Math.abs(diff);
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k lbs`;
  return `${sign}${Math.round(abs).toLocaleString()} lbs`;
}

function getWeekLabel(report) {
  if (!report) return null;
  const sa =
    report.analyticsData?.structured_analytics ||
    report.structured_analytics ||
    {};
  const weekStart = report.weekStart;
  const weekEnd = report.weekEnd;
  if (weekStart && weekEnd) {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const opts = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
  }
  if (report.weekId) return `Week ${report.weekId}`;
  return null;
}

function extractReportData(report) {
  if (!report) return { tonnage: 0, sets: 0, sessions: 0 };
  const sa =
    report.analyticsData?.structured_analytics ||
    report.structured_analytics ||
    {};
  return {
    tonnage: sa.volume_breakdown?.working_sets?.total_tonnage || 0,
    sets: sa.volume_breakdown?.working_sets?.total_sets || 0,
    sessions:
      sa.metadata?.sessions_completed || report.metadata?.workoutCount || 0,
  };
}

// ---------------------------------------------------------------------------
// BarChartUpIcon — inline SVG, no external dep
// ---------------------------------------------------------------------------
function BarChartUpIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon points="10 11 11 11 11 21 10 21 10 22 8 22 8 21 7 21 7 11 8 11 8 10 10 10 10 11" />
      <rect x="11" y="5" width="1" height="1" />
      <rect x="12" y="6" width="1" height="1" />
      <polygon points="16 8 17 8 17 10 16 10 16 11 14 11 14 10 13 10 13 8 14 8 14 7 16 7 16 8" />
      <polygon points="16 15 17 15 17 21 16 21 16 22 14 22 14 21 13 21 13 15 14 15 14 14 16 14 16 15" />
      <rect x="17" y="6" width="1" height="1" />
      <rect x="18" y="5" width="1" height="1" />
      <polygon points="23 2 23 4 22 4 22 5 20 5 20 4 19 4 19 2 20 2 20 1 22 1 22 2 23 2" />
      <polygon points="22 11 23 11 23 21 22 21 22 22 20 22 20 21 19 21 19 11 20 11 20 10 22 10 22 11" />
      <rect x="5" y="7" width="1" height="1" />
      <polygon points="4 9 5 9 5 11 4 11 4 12 2 12 2 11 1 11 1 9 2 9 2 8 4 8 4 9" />
      <polygon points="4 16 5 16 5 21 4 21 4 22 2 22 2 21 1 21 1 16 2 16 2 15 4 15 4 16" />
      <rect x="6" y="6" width="1" height="1" />
      <polygon points="8 4 7 4 7 2 8 2 8 1 10 1 10 2 11 2 11 4 10 4 10 5 8 5 8 4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// TrainingLoadCard
//
// Props:
//   recentReports  — array of weekly reports, sorted newest-first (from ReportAgent)
//   volumeSparkline — [{ value }] array, oldest-first (from extractSparklineData)
//   isLoading       — show skeleton while reports are loading
// ---------------------------------------------------------------------------
export default function TrainingLoadCard({
  recentReports = [],
  volumeSparkline = [],
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded-full animate-pulse shrink-0 mt-1" />
          <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-40" />
        </div>
        <div className="h-12 bg-synthwave-text-muted/10 animate-pulse mb-3" />
        <div className="h-8 bg-synthwave-text-muted/10 animate-pulse" />
      </div>
    );
  }

  const currentReport = recentReports[0] || null;
  const priorReport = recentReports[1] || null;

  const current = extractReportData(currentReport);
  const prior = extractReportData(priorReport);
  const delta = formatDelta(current.tonnage, prior.tonnage);
  const weekLabel = getWeekLabel(currentReport);
  const hasData = current.tonnage > 0;
  const sparklineWeeks = volumeSparkline.length;

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <span className="shrink-0 mt-1.5 text-synthwave-neon-purple">
          <BarChartUpIcon />
        </span>
        <h3 className="font-header font-bold text-white text-lg uppercase">
          Training Volume
        </h3>
      </div>

      {!hasData ? (
        <p className="font-body text-sm text-synthwave-text-muted">
          Volume data appears here after your first weekly report is generated.
        </p>
      ) : (
        <>
          {/* Headline metric */}
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-header text-4xl leading-none text-synthwave-neon-pink">
              {formatTonnage(current.tonnage)}
            </span>
            {delta && (
              <span
                className={`font-body text-sm font-semibold ${
                  delta.up ? "text-synthwave-neon-green" : "text-red-400"
                }`}
              >
                {delta.extreme
                  ? formatAbsoluteDelta(current.tonnage, prior.tonnage)
                  : `${delta.up ? "↑" : "↓"}${Math.abs(delta.pct)}%`}
              </span>
            )}
          </div>

          {/* Context row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-4">
            {weekLabel && (
              <span className="font-body text-xs text-synthwave-text-secondary">
                {weekLabel}
              </span>
            )}
            {current.sets > 0 && (
              <span className="font-body text-xs text-synthwave-text-muted">
                &bull; {current.sets} working sets
              </span>
            )}
            {current.sessions > 0 && (
              <span className="font-body text-xs text-synthwave-text-muted">
                &bull; {current.sessions} session
                {current.sessions !== 1 ? "s" : ""}
              </span>
            )}
            {delta?.extreme && prior.tonnage > 0 && (
              <span className="font-body text-xs text-synthwave-text-muted">
                &bull; prev {formatTonnage(prior.tonnage)}
              </span>
            )}
          </div>

          {/* Sparkline with label */}
          {volumeSparkline.length >= 2 && (
            <div className="border-t border-synthwave-text-muted/10 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body text-[10px] text-synthwave-text-muted uppercase tracking-wider">
                  {sparklineWeeks}-week trend
                </span>
                {prior.tonnage > 0 && !delta?.extreme && (
                  <span className="font-body text-[10px] text-synthwave-text-muted">
                    prev: {formatTonnage(prior.tonnage)}
                  </span>
                )}
              </div>
              <Sparkline
                data={volumeSparkline}
                color={chartColors.neonPink}
                height={36}
                variant="area"
                fullWidth
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
