import { getWeeklyReports, getWeeklyReport, getMonthlyReports, getMonthlyReport } from '../apis/reportApi.js';

export class ReportAgent {
  constructor(userId, onStateChange = null) {
    this.userId = userId || null;
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null;

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
      isLoadingItem: false,
      isLoadingRecentMonthlyItems: false,
      isLoadingAllMonthlyItems: false,
      isLoadingMonthlyItem: false,
      error: null,
      lastCheckTime: null,
    };

    this.state = this.reportsState;
  }

  _updateState(newStateData) {
    this.reportsState = { ...this.reportsState, ...newStateData };
    this.state = this.reportsState;
    if (this.onStateChange) {
      try { this.onStateChange(this.reportsState); } catch (_) {}
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
        sortBy: 'weekStart',
        sortOrder: 'desc',
      });
      const reports = result.reports || result.analytics || [];
      this._updateState({
        recentReports: reports,
        isLoadingRecentItems: false,
        lastCheckTime: new Date(),
      });
      return reports;
    } catch (error) {
      this._updateState({ isLoadingRecentItems: false, error: error.message || 'Failed to load reports' });
      throw error;
    }
  }

  /**
   * Loads all reports with optional filtering (same pattern as WorkoutAgent.loadAllWorkouts)
   */
  async loadAllReports(options = {}) {
    if (!this.userId) return;

    this._updateState({ isLoadingAllItems: true, error: null });

    try {
      console.info('Loading all reports for userId:', this.userId, 'with options:', options);
      const result = await getWeeklyReports(this.userId, {
        limit: options.limit || 50,
        sortBy: options.sortBy || 'weekStart',
        sortOrder: options.sortOrder || 'desc',
        ...options
      });

      const allReports = result.reports || result.analytics || [];

      this._updateState({
        allReports,
        isLoadingAllItems: false
      });

      return allReports;

    } catch (error) {
      console.error('Error loading all reports:', error);
      this._updateState({
        isLoadingAllItems: false,
        error: error.message || 'Failed to load reports',
        allReports: []
      });
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
      this._updateState({ isLoadingItem: false, error: error.message || 'Failed to load report' });
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
        sortBy: 'monthStart',
        sortOrder: 'desc',
      });
      const reports = result.reports || result.analytics || [];
      this._updateState({
        recentMonthlyReports: reports,
        isLoadingRecentMonthlyItems: false,
        lastCheckTime: new Date(),
      });
      return reports;
    } catch (error) {
      this._updateState({ isLoadingRecentMonthlyItems: false, error: error.message || 'Failed to load monthly reports' });
      throw error;
    }
  }

  /**
   * Loads all monthly reports with optional filtering
   */
  async loadAllMonthlyReports(options = {}) {
    if (!this.userId) return;

    this._updateState({ isLoadingAllMonthlyItems: true, error: null });

    try {
      console.info('Loading all monthly reports for userId:', this.userId, 'with options:', options);
      const result = await getMonthlyReports(this.userId, {
        limit: options.limit || 50,
        sortBy: options.sortBy || 'monthStart',
        sortOrder: options.sortOrder || 'desc',
        ...options
      });

      const allMonthlyReports = result.reports || result.analytics || [];

      this._updateState({
        allMonthlyReports,
        isLoadingAllMonthlyItems: false
      });

      return allMonthlyReports;

    } catch (error) {
      console.error('Error loading all monthly reports:', error);
      this._updateState({
        isLoadingAllMonthlyItems: false,
        error: error.message || 'Failed to load monthly reports',
        allMonthlyReports: []
      });
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
      this._updateState({ isLoadingMonthlyItem: false, error: error.message || 'Failed to load monthly report' });
      return null;
    }
  }

  formatReportTitle(report) {
    if (!report) return 'Weekly Report';
    const weekId = report.weekId || report.structured_analytics?.metadata?.week_id;
    const workoutCount = report.metadata?.workoutCount || report.structured_analytics?.metadata?.workout_count;
    if (weekId && workoutCount !== undefined) return `Weekly Report ${weekId} (${workoutCount} workouts)`;
    if (weekId) return `Weekly Report ${weekId}`;
    const ws = report.weekStart, we = report.weekEnd;
    if (ws && we) return `Weekly Report ${ws} → ${we}`;
    return 'Weekly Report';
  }

  formatMonthlyReportTitle(report) {
    if (!report) return 'Monthly Report';
    const monthId = report.monthId || report.structured_analytics?.metadata?.month_id;
    const workoutCount = report.metadata?.workoutCount || report.structured_analytics?.metadata?.workout_count;

    // Format YYYY-MM to "Month YYYY" (e.g., "2025-10" -> "October 2025")
    if (monthId) {
      const [year, month] = monthId.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[parseInt(month) - 1];
      const formattedMonth = `${monthName} ${year}`;

      if (workoutCount !== undefined) return `${formattedMonth} (${workoutCount} workouts)`;
      return formattedMonth;
    }

    const ms = report.monthStart, me = report.monthEnd;
    if (ms && me) return `Monthly Report ${ms} → ${me}`;
    return 'Monthly Report';
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
      isLoadingItem: false,
      isLoadingRecentMonthlyItems: false,
      isLoadingAllMonthlyItems: false,
      isLoadingMonthlyItem: false,
      error: null,
      lastCheckTime: null,
    };
    this.state = this.reportsState;
    this.onStateChange = null;
  }
}

export default ReportAgent;

