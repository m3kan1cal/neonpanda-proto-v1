/**
 * Analytics Library
 *
 * This library provides functionality for analytics processing,
 * batch operations, and user data aggregation.
 */

export { processBatch, processAllUsersInBatches } from "./batch-processing";

export {
  WeeklyAnalyticsEvent,
  HistoricalWorkoutSummary,
  UserWeeklyData,
  NormalizationResult,
  NormalizationIssue,
} from "./types";

export {
  getCurrentWeekRange,
  getLastNWeeksRange,
  getHistoricalWorkoutRange,
  formatDateForQuery,
  isDateInWeekRange,
  getWeekDescription,
  type WeekRange,
} from "./date-utils";

export {
  fetchCurrentWeekWorkouts,
  fetchHistoricalWorkoutSummaries,
  fetchCoachingContext,
  fetchUserContext,
  fetchUserWeeklyData,
  generateAnalytics,
} from "./data-fetching";

export {
  shouldNormalizeAnalytics,
  normalizeAnalytics,
  generateNormalizationSummary,
} from "./normalization";
