import { getWeeklyReports } from "../apis/reportApi.js";
import { logger } from "../logger";

// ---------------------------------------------------------------------------
// AnalyticsAgent — transforms weekly/monthly report data into chart-ready
// arrays for the analytics page. Fetches reports then normalises fields
// into flat objects suitable for Recharts.
// ---------------------------------------------------------------------------

export class AnalyticsAgent {
  constructor(userId, onStateChange = null) {
    this.userId = userId || null;
    this.onStateChange =
      typeof onStateChange === "function" ? onStateChange : null;

    this.analyticsState = {
      // Chart-ready arrays
      weeklyChartData: [], // [{ weekId, label, weekStart, tonnage, sessions, recoveryScore, acRatio, patternBalance, bodyPartFrequency, ... }]

      // Loading / error
      isLoading: false,
      error: null,
    };

    this.state = this.analyticsState;
  }

  _updateState(patch) {
    this.analyticsState = { ...this.analyticsState, ...patch };
    this.state = this.analyticsState;
    if (this.onStateChange) {
      try {
        this.onStateChange(this.analyticsState);
      } catch (_) {}
    }
  }

  setUserId(userId) {
    this.userId = userId;
  }

  // ------------------------------------------------------------------
  // Primary loader: fetch weekly reports for a given number of weeks
  // and transform into chart-ready data.
  // ------------------------------------------------------------------
  async loadWeeklyChartData(numWeeks = 8) {
    if (!this.userId) return;

    this._updateState({ isLoading: true, error: null });

    try {
      // Calculate the "from" date
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - numWeeks * 7);

      const result = await getWeeklyReports(this.userId, {
        limit: numWeeks + 2, // small buffer
        sortBy: "weekStart",
        sortOrder: "asc",
        fromDate: fromDate.toISOString().split("T")[0],
      });

      const reports = result.reports || result.analytics || [];
      const weeklyChartData = reports.map((r) =>
        this._transformReport(r),
      );

      this._updateState({ weeklyChartData, isLoading: false });
      return weeklyChartData;
    } catch (error) {
      logger.error("AnalyticsAgent: failed to load weekly chart data", error);
      this._updateState({
        isLoading: false,
        error: error.message || "Failed to load analytics data",
        weeklyChartData: [],
      });
      throw error;
    }
  }

  // ------------------------------------------------------------------
  // Transform a single weekly report into a flat chart-ready object.
  // Handles both direct fields and nested analyticsData.
  // ------------------------------------------------------------------
  _transformReport(report) {
    // The structured analytics can live at different nesting levels
    const sa =
      report.analyticsData?.structured_analytics ||
      report.structured_analytics ||
      {};

    const meta = sa.metadata || {};
    const volume = sa.volume_breakdown?.working_sets || {};
    const fatigue = sa.fatigue_management || {};
    const progression = sa.weekly_progression || {};
    const pacing = sa.training_intelligence?.workout_pacing || {};
    const movement = sa.movement_analysis || {};

    // Week label — try weekId first, fall back to date range
    const weekId = report.weekId || meta.week_id || "";
    const weekStart = report.weekStart || meta.date_range?.start || "";
    const weekEnd = report.weekEnd || meta.date_range?.end || "";

    return {
      weekId,
      weekStart,
      weekEnd,
      label: this._formatWeekLabel(weekId, weekStart, weekEnd),

      // Volume
      tonnage: this._num(volume.total_tonnage),
      totalReps: this._num(volume.total_reps),
      totalSets: this._num(volume.total_sets),

      // Frequency
      sessions: this._num(meta.sessions_completed),

      // Intensity / progression
      volumeChange: this._pct(progression.vs_last_week?.volume_change),
      intensityChange: this._pct(progression.vs_last_week?.intensity_change),
      overloadScore: this._num(progression.progressive_overload_score),

      // Fatigue
      recoveryScore: this._num(fatigue.recovery_score),
      acRatio: this._num(fatigue.acute_chronic_ratio),

      // Pacing
      avgDuration: this._num(pacing.avg_session_duration),
      densityScore: this._num(pacing.density_score),

      // Data quality
      completeness: this._num(meta.data_completeness),

      // Movement analysis — pattern_balance is an object like { squat: { volume, frequency }, ... }
      patternBalance: movement.pattern_balance || null,
      bodyPartFrequency: movement.body_part_frequency || null,
      imbalanceFlags: movement.imbalance_flags || [],

      // Fatigue details
      suggestedAction: fatigue.suggested_action || null,
      volumeSpike: !!fatigue.volume_spike,
    };
  }

  // Helpers
  _num(val) {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  _pct(val) {
    // Decimal percentage from schema (e.g. 0.12 → 12)
    const n = Number(val);
    return isNaN(n) ? 0 : Math.round(n * 100);
  }

  _formatWeekLabel(weekId, weekStart, weekEnd) {
    // Try to build "Mar 3–9" from dates
    if (weekStart) {
      try {
        const s = new Date(weekStart);
        const e = weekEnd ? new Date(weekEnd) : null;
        const mo = s.toLocaleString("en-US", { month: "short" });
        if (e) {
          const eMo = e.toLocaleString("en-US", { month: "short" });
          if (mo === eMo)
            return `${mo} ${s.getDate()}–${e.getDate()}`;
          return `${mo} ${s.getDate()}–${eMo} ${e.getDate()}`;
        }
        return `${mo} ${s.getDate()}`;
      } catch {
        // fall through
      }
    }
    // Fallback: "W10"
    const match = weekId?.match(/W(\d+)$/i);
    return match ? `W${match[1]}` : weekId || "";
  }

  destroy() {
    this.userId = null;
    this.analyticsState = {
      weeklyChartData: [],
      isLoading: false,
      error: null,
    };
    this.state = this.analyticsState;
    this.onStateChange = null;
  }
}

export default AnalyticsAgent;
