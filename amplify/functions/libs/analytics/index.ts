/**
 * Analytics Library
 *
 * This library provides functionality for analytics processing,
 * batch operations, and user data aggregation.
 */

export { processBatch, processAllUsersInBatches, processMonthlyBatch, processAllUsersInBatchesMonthly } from "./batch-processing";

export {
  WeeklyAnalyticsEvent,
  MonthlyAnalyticsEvent,
  HistoricalWorkoutSummary,
  WorkoutSummary,
  UserWeeklyData,
  UserMonthlyData,
  NormalizationResult,
  NormalizationIssue,
} from "./types";

export {
  getCurrentWeekRange,
  getLastNWeeksRange,
  getHistoricalWorkoutRange,
  getCurrentMonthRange,
  getLastNMonthsRange,
  getHistoricalMonthRange,
  generateMonthId,
  getMonthDescription,
  isDateInMonthRange,
  formatDateForQuery,
  isDateInWeekRange,
  getWeekDescription,
  type WeekRange,
  type MonthRange,
} from "./date-utils";

export {
  fetchCurrentWeekWorkouts,
  fetchHistoricalWorkoutSummaries,
  fetchCoachingContext,
  fetchUserContext,
  fetchUserWeeklyData,
  fetchUserMonthlyData,
  fetchWorkoutSummaries,
  fetchCoachConversationSummaries,
  generateAnalytics,
} from "./data-fetching";

export {
  shouldNormalizeAnalytics,
  normalizeAnalytics,
  generateNormalizationSummary,
} from "./normalization";
