/**
 * Metadata tag for the Training Grounds FAB inline chat "home" thread.
 * Stored on normal CHAT-mode conversations via updateCoachConversation tags.
 */
export const INLINE_TRAINING_GROUNDS_TAG = "training_grounds_inline";

/**
 * Metadata tag prefix for the Program Dashboard inline chat "home" thread.
 * Never used directly — call `getProgramDashboardInlineTag(programId)` so
 * the tag is scoped per program. Each program gets its own home chat, so
 * switching programs naturally switches conversations and the tag-based
 * fallback lookup can't return another program's home thread.
 */
export const INLINE_PROGRAM_DASHBOARD_TAG_PREFIX = "program_dashboard_inline";

/** Per-program tag used by the Program Dashboard inline drawer. */
export function getProgramDashboardInlineTag(programId) {
  return `${INLINE_PROGRAM_DASHBOARD_TAG_PREFIX}:${programId}`;
}

/**
 * Metadata tag prefix for the View Workouts inline chat "home" thread.
 * Scoped per program so different programs (and the Program Dashboard's
 * own home thread) don't share a chat. Day-N views reuse the same per-
 * program thread; the active dayNumber is forwarded via streamClientContext
 * so the agent always knows which day the user is currently viewing.
 */
export const INLINE_VIEW_WORKOUTS_TAG_PREFIX = "view_workouts_inline";

/** Per-program tag used by the View Workouts inline drawer. */
export function getViewWorkoutsInlineTag(programId) {
  return `${INLINE_VIEW_WORKOUTS_TAG_PREFIX}:${programId}`;
}

/** sessionStorage key for last conversation opened from the inline Training Grounds drawer picker */
export function getTrainingGroundsInlineSessionKey(userId, coachId) {
  return `neonpanda-tg-inline-chat:${userId}:${coachId}`;
}

/**
 * Metadata tag for the Training Pulse inline chat "home" thread. The pulse page
 * exposes a TimeRangeSelector but we intentionally use ONE home thread per
 * (user, coach) — the time range is forwarded each turn via streamClientContext
 * rather than fragmenting conversations across ranges.
 */
export const INLINE_TRAINING_PULSE_TAG = "training_pulse_inline";

/** sessionStorage key for last conversation opened from the Training Pulse inline drawer. */
export function getTrainingPulseInlineSessionKey(userId, coachId) {
  return `neonpanda-tp-inline-chat:${userId}:${coachId}`;
}

/**
 * Metadata tag for the Reports list (View Reports) inline chat "home" thread.
 * One thread per (user, coach); the active tab (weekly | monthly) is forwarded
 * each turn via streamClientContext.reportType.
 */
export const INLINE_VIEW_REPORTS_TAG = "view_reports_inline";

/** sessionStorage key for last conversation opened from the Reports list inline drawer. */
export function getViewReportsInlineSessionKey(userId, coachId) {
  return `neonpanda-vr-inline-chat:${userId}:${coachId}`;
}

/**
 * Metadata tag prefix for the Weekly Report viewer inline chat "home" thread.
 * Scoped per weekId — each report week is its own conversation, mirroring the
 * Program Dashboard's per-program scoping.
 */
export const INLINE_WEEKLY_REPORT_TAG_PREFIX = "weekly_report_inline";

/** Per-week tag used by the Weekly Report viewer inline drawer. */
export function getWeeklyReportInlineTag(weekId) {
  return `${INLINE_WEEKLY_REPORT_TAG_PREFIX}:${weekId}`;
}

/** sessionStorage key for last conversation opened from the Weekly Report inline drawer. */
export function getWeeklyReportInlineSessionKey(userId, coachId, weekId) {
  return `neonpanda-wr-inline-chat:${userId}:${coachId}:${weekId}`;
}

/**
 * Metadata tag prefix for the Monthly Report viewer inline chat "home" thread.
 * Reserved for a future standalone monthly viewer page. The streaming validator
 * accepts `surface: "monthly_report"` today so the page can ship in a single
 * frontend PR without a coordinated Lambda redeploy.
 */
export const INLINE_MONTHLY_REPORT_TAG_PREFIX = "monthly_report_inline";

/** Per-month tag (reserved for a future monthly report viewer page). */
export function getMonthlyReportInlineTag(monthId) {
  return `${INLINE_MONTHLY_REPORT_TAG_PREFIX}:${monthId}`;
}

/** sessionStorage key (reserved for a future monthly report viewer page). */
export function getMonthlyReportInlineSessionKey(userId, coachId, monthId) {
  return `neonpanda-mr-inline-chat:${userId}:${coachId}:${monthId}`;
}

/**
 * sessionStorage key for last conversation opened from the Program Dashboard
 * inline drawer. Scoped by programId so each program has its own "home" chat.
 */
export function getProgramDashboardInlineSessionKey(
  userId,
  coachId,
  programId,
) {
  return `neonpanda-pd-inline-chat:${userId}:${coachId}:${programId}`;
}

/**
 * sessionStorage key for last conversation opened from the View Workouts
 * inline drawer. Scoped by programId so each program has its own home chat,
 * matching the Program Dashboard pattern.
 */
export function getViewWorkoutsInlineSessionKey(userId, coachId, programId) {
  return `neonpanda-vw-inline-chat:${userId}:${coachId}:${programId}`;
}

/** ~10 recent chats in drawer picker */
export const TRAINING_GROUNDS_INLINE_PICKER_LIMIT = 10;
