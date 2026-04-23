import {
  getWeeklyReports,
  getWeeklyReport,
  getMonthlyReports,
  getMonthlyReport,
} from "../apis/reportApi.js";
import { logger } from "../logger";

export class ReportAgent {
  constructor(userId, onStateChange = null) {
    this.userId = userId || null;
    this.onStateChange =
      typeof onStateChange === "function" ? onStateChange : null;

    this.reportsState = {
      // Weekly reports
      recentReports: [],
      allReports: [],
      // Monthly reports
      recentMonthlyReports: [],
      allMonthlyReports: [],
      // Loading states
      isLoadingRecentItems: false,
      isLoadingAllItems: false,
      isLoadingMoreAllItems: false,
      isLoadingItem: false,
      isLoadingRecentMonthlyItems: false,
      isLoadingAllMonthlyItems: false,
      isLoadingMoreAllMonthlyItems: false,
      isLoadingMonthlyItem: false,
      error: null,
      // Pagination (weekly and monthly are tracked independently so the
      // two tabs can Load more at their own pace).
      allReportsOffset: 0,
      allReportsTotalCount: 0,
      allReportsFilters: null,
      allMonthlyReportsOffset: 0,
      allMonthlyReportsTotalCount: 0,
      allMonthlyReportsFilters: null,
      lastCheckTime: null,
    };

    this.state = this.reportsState;
  }

  _updateState(newStateData) {
    this.reportsState = { ...this.reportsState, ...newStateData };
    this.state = this.reportsState;
    if (this.onStateChange) {
      try {
        this.onStateChange(this.reportsState);
      } catch (_) {}
    }
  }

  async setUserId(userId) {
    if (!userId) return;
    this.userId = userId;
    await this.loadRecentReports(5);
  }

  async loadRecentReports(limit = 10) {
    if (!this.userId) return;
    this._updateState({ isLoadingRecentItems: true, error: null });
    try {
      const result = await getWeeklyReports(this.userId, {
        limit,
        sortBy: "weekStart",
        sortOrder: "desc",
      });
      const reports = result.reports || result.analytics || [];
      this._updateState({
        recentReports: reports,
        isLoadingRecentItems: false,
        lastCheckTime: new Date(),
      });
      return reports;
    } catch (error) {
      this._updateState({
        isLoadingRecentItems: false,
        error: error.message || "Failed to load reports",
      });
      throw error;
    }
  }

  /**
   * Loads the first page of weekly reports and captures the filters and
   * pagination cursor so subsequent `loadMoreReports` calls can resume
   * where this left off.
   */
  async loadAllReports(options = {}) {
    if (!this.userId) return;

    const { limit, offset: _offset, ...rest } = options;
    const filters = {
      sortBy: rest.sortBy || "weekStart",
      sortOrder: rest.sortOrder || "desc",
      ...rest,
    };

    this._updateState({
      isLoadingAllItems: true,
      error: null,
      allReportsFilters: filters,
    });

    try {
      const result = await getWeeklyReports(this.userId, {
        ...filters,
        ...(limit !== undefined ? { limit } : {}),
        offset: 0,
      });

      const allReports = result.reports || result.analytics || [];
      const totalCount =
        typeof result.totalCount === "number"
          ? result.totalCount
          : typeof result.count === "number"
            ? result.count
            : allReports.length;

      this._updateState({
        allReports,
        isLoadingAllItems: false,
        allReportsOffset: allReports.length,
        allReportsTotalCount: totalCount,
      });

      return allReports;
    } catch (error) {
      logger.error("Error loading all reports:", error);
      this._updateState({
        isLoadingAllItems: false,
        error: error.message || "Failed to load reports",
        allReports: [],
        allReportsOffset: 0,
        allReportsTotalCount: 0,
      });
      throw error;
    }
  }

  /**
   * Fetches the next page of weekly reports using the filters captured
   * during the initial load. On failure we rethrow so the caller can
   * show a toast and leave items/offset/totalCount untouched — clicking
   * Load more again retries the same page.
   */
  async loadMoreReports(limit) {
    if (!this.userId) return;
    const state = this.reportsState;
    if (state.isLoadingMoreAllItems) return;
    if (state.allReports.length >= state.allReportsTotalCount) return;

    this._updateState({ isLoadingMoreAllItems: true });

    try {
      const result = await getWeeklyReports(this.userId, {
        ...(state.allReportsFilters || {}),
        ...(limit !== undefined ? { limit } : {}),
        offset: state.allReportsOffset,
      });

      const pageItems = result.reports || result.analytics || [];
      const totalCount =
        typeof result.totalCount === "number"
          ? result.totalCount
          : typeof result.count === "number"
            ? result.count
            : state.allReportsTotalCount;

      const seen = new Set(state.allReports.map((r) => r.weekId));
      const appended = pageItems.filter((r) => !seen.has(r.weekId));

      this._updateState({
        allReports: [...state.allReports, ...appended],
        allReportsOffset: state.allReportsOffset + pageItems.length,
        allReportsTotalCount: totalCount,
        isLoadingMoreAllItems: false,
      });

      return appended;
    } catch (error) {
      logger.error("Error loading more weekly reports:", error);
      this._updateState({ isLoadingMoreAllItems: false });
      throw error;
    }
  }

  async getReport(weekId) {
    if (!this.userId || !weekId) return null;
    this._updateState({ isLoadingItem: true, error: null });
    try {
      const result = await getWeeklyReport(this.userId, weekId);
      this._updateState({ isLoadingItem: false });
      return result.report || result.analytics || null;
    } catch (error) {
      this._updateState({
        isLoadingItem: false,
        error: error.message || "Failed to load report",
      });
      return null;
    }
  }

  // ============================================================================
  // MONTHLY REPORTS
  // ============================================================================

  async loadRecentMonthlyReports(limit = 10) {
    if (!this.userId) return;
    this._updateState({ isLoadingRecentMonthlyItems: true, error: null });
    try {
      const result = await getMonthlyReports(this.userId, {
        limit,
        sortBy: "monthStart",
        sortOrder: "desc",
      });
      const reports = result.reports || result.analytics || [];
      this._updateState({
        recentMonthlyReports: reports,
        isLoadingRecentMonthlyItems: false,
        lastCheckTime: new Date(),
      });
      return reports;
    } catch (error) {
      this._updateState({
        isLoadingRecentMonthlyItems: false,
        error: error.message || "Failed to load monthly reports",
      });
      throw error;
    }
  }

  /**
   * Loads the first page of monthly reports and captures the filters and
   * pagination cursor so subsequent `loadMoreMonthlyReports` calls can
   * resume from the right offset.
   */
  async loadAllMonthlyReports(options = {}) {
    if (!this.userId) return;

    const { limit, offset: _offset, ...rest } = options;
    const filters = {
      sortBy: rest.sortBy || "monthStart",
      sortOrder: rest.sortOrder || "desc",
      ...rest,
    };

    this._updateState({
      isLoadingAllMonthlyItems: true,
      error: null,
      allMonthlyReportsFilters: filters,
    });

    try {
      const result = await getMonthlyReports(this.userId, {
        ...filters,
        ...(limit !== undefined ? { limit } : {}),
        offset: 0,
      });

      const allMonthlyReports = result.reports || result.analytics || [];
      const totalCount =
        typeof result.totalCount === "number"
          ? result.totalCount
          : typeof result.count === "number"
            ? result.count
            : allMonthlyReports.length;

      this._updateState({
        allMonthlyReports,
        isLoadingAllMonthlyItems: false,
        allMonthlyReportsOffset: allMonthlyReports.length,
        allMonthlyReportsTotalCount: totalCount,
      });

      return allMonthlyReports;
    } catch (error) {
      logger.error("Error loading all monthly reports:", error);
      this._updateState({
        isLoadingAllMonthlyItems: false,
        error: error.message || "Failed to load monthly reports",
        allMonthlyReports: [],
        allMonthlyReportsOffset: 0,
        allMonthlyReportsTotalCount: 0,
      });
      throw error;
    }
  }

  /**
   * Fetches the next page of monthly reports using the filters from the
   * initial load. Rethrows on error so the caller can surface a toast
   * without mutating local state.
   */
  async loadMoreMonthlyReports(limit) {
    if (!this.userId) return;
    const state = this.reportsState;
    if (state.isLoadingMoreAllMonthlyItems) return;
    if (state.allMonthlyReports.length >= state.allMonthlyReportsTotalCount)
      return;

    this._updateState({ isLoadingMoreAllMonthlyItems: true });

    try {
      const result = await getMonthlyReports(this.userId, {
        ...(state.allMonthlyReportsFilters || {}),
        ...(limit !== undefined ? { limit } : {}),
        offset: state.allMonthlyReportsOffset,
      });

      const pageItems = result.reports || result.analytics || [];
      const totalCount =
        typeof result.totalCount === "number"
          ? result.totalCount
          : typeof result.count === "number"
            ? result.count
            : state.allMonthlyReportsTotalCount;

      const seen = new Set(state.allMonthlyReports.map((r) => r.monthId));
      const appended = pageItems.filter((r) => !seen.has(r.monthId));

      this._updateState({
        allMonthlyReports: [...state.allMonthlyReports, ...appended],
        allMonthlyReportsOffset:
          state.allMonthlyReportsOffset + pageItems.length,
        allMonthlyReportsTotalCount: totalCount,
        isLoadingMoreAllMonthlyItems: false,
      });

      return appended;
    } catch (error) {
      logger.error("Error loading more monthly reports:", error);
      this._updateState({ isLoadingMoreAllMonthlyItems: false });
      throw error;
    }
  }

  async getMonthlyReport(monthId) {
    if (!this.userId || !monthId) return null;
    this._updateState({ isLoadingMonthlyItem: true, error: null });
    try {
      const result = await getMonthlyReport(this.userId, monthId);
      this._updateState({ isLoadingMonthlyItem: false });
      return result.report || result.analytics || null;
    } catch (error) {
      this._updateState({
        isLoadingMonthlyItem: false,
        error: error.message || "Failed to load monthly report",
      });
      return null;
    }
  }

  formatReportTitle(report) {
    if (!report) return "Weekly Report";
    const weekId =
      report.weekId || report.structured_analytics?.metadata?.week_id;
    const workoutCount =
      report.metadata?.workoutCount ||
      report.structured_analytics?.metadata?.workout_count;
    if (weekId && workoutCount !== undefined)
      return `Weekly Report ${weekId} (${workoutCount} workouts)`;
    if (weekId) return `Weekly Report ${weekId}`;
    const ws = report.weekStart,
      we = report.weekEnd;
    if (ws && we) return `Weekly Report ${ws} → ${we}`;
    return "Weekly Report";
  }

  formatMonthlyReportTitle(report) {
    if (!report) return "Monthly Report";
    const monthId =
      report.monthId || report.structured_analytics?.metadata?.month_id;
    const workoutCount =
      report.metadata?.workoutCount ||
      report.structured_analytics?.metadata?.workout_count;

    // Format YYYY-MM to "Month YYYY" (e.g., "2025-10" -> "October 2025")
    if (monthId) {
      const [year, month] = monthId.split("-");
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const monthName = monthNames[parseInt(month) - 1];
      const formattedMonth = `${monthName} ${year}`;

      if (workoutCount !== undefined)
        return `${formattedMonth} (${workoutCount} workouts)`;
      return formattedMonth;
    }

    const ms = report.monthStart,
      me = report.monthEnd;
    if (ms && me) return `Monthly Report ${ms} → ${me}`;
    return "Monthly Report";
  }

  destroy() {
    this.userId = null;
    this.reportsState = {
      recentReports: [],
      allReports: [],
      recentMonthlyReports: [],
      allMonthlyReports: [],
      isLoadingRecentItems: false,
      isLoadingAllItems: false,
      isLoadingMoreAllItems: false,
      isLoadingItem: false,
      isLoadingRecentMonthlyItems: false,
      isLoadingAllMonthlyItems: false,
      isLoadingMoreAllMonthlyItems: false,
      isLoadingMonthlyItem: false,
      error: null,
      allReportsOffset: 0,
      allReportsTotalCount: 0,
      allReportsFilters: null,
      allMonthlyReportsOffset: 0,
      allMonthlyReportsTotalCount: 0,
      allMonthlyReportsFilters: null,
      lastCheckTime: null,
    };
    this.state = this.reportsState;
    this.onStateChange = null;
  }
}

export default ReportAgent;
