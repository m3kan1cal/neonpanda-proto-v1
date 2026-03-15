import React from "react";
import { containerPatterns } from "../../utils/ui/uiPatterns";
import Sparkline from "../analytics/Sparkline";
import { chartColors } from "../analytics/chartTheme";
import { BarChartUpIcon } from "../themes/SynthwaveComponents";

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
          <BarChartUpIcon className="w-5 h-5" />
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
