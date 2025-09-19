/**
 * Date utilities for analytics processing
 */

/**
 * Week date range for analytics calculations
 */
export interface WeekRange {
  weekStart: Date;
  weekEnd: Date;
}

/**
 * Get the current week's date range (Sunday to Saturday)
 * Analytics run on Sunday, so "current week" is the week that just ended
 */
export const getCurrentWeekRange = (): WeekRange => {
  const now = new Date();

  // Get the most recent Sunday (yesterday if today is Monday, or last week if today is Sunday)
  const weekStart = new Date(now);
  const daysSinceLastSunday = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  if (daysSinceLastSunday === 0) {
    // Today is Sunday, so we want last week's range
    weekStart.setDate(now.getDate() - 7);
  } else {
    // Go back to the most recent Sunday
    weekStart.setDate(now.getDate() - daysSinceLastSunday);
  }

  // Set to start of day (00:00:00)
  weekStart.setHours(0, 0, 0, 0);

  // Week end is the following Saturday at end of day (23:59:59.999)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

/**
 * Get date range for the last N weeks of coaching conversations
 * Used for fetching recent coaching context
 */
export const getLastNWeeksRange = (weeks: number): WeekRange => {
  const currentWeek = getCurrentWeekRange();

  const rangeStart = new Date(currentWeek.weekStart);
  rangeStart.setDate(rangeStart.getDate() - weeks * 7);

  return {
    weekStart: rangeStart,
    weekEnd: currentWeek.weekEnd,
  };
};

/**
 * Get historical range (4 weeks before current week, excluding current week)
 * Used for fetching historical workout summaries
 */
export const getHistoricalWorkoutRange = (): WeekRange => {
  const currentWeek = getCurrentWeekRange();

  // End of historical range is the day before current week starts
  const historyEnd = new Date(currentWeek.weekStart);
  historyEnd.setDate(historyEnd.getDate() - 1);
  historyEnd.setHours(23, 59, 59, 999);

  // Start of historical range is 4 weeks (28 days) before that
  const historyStart = new Date(historyEnd);
  historyStart.setDate(historyStart.getDate() - 27); // 28 days total including end day
  historyStart.setHours(0, 0, 0, 0);

  return {
    weekStart: historyStart,
    weekEnd: historyEnd,
  };
};

/**
 * Format date for DynamoDB queries (ISO string format)
 */
export const formatDateForQuery = (date: Date): string => {
  return date.toISOString();
};

/**
 * Check if a date falls within a week range
 */
export const isDateInWeekRange = (
  date: Date,
  weekRange: WeekRange
): boolean => {
  return date >= weekRange.weekStart && date <= weekRange.weekEnd;
};

/**
 * Get a human-readable week description for logging
 */
export const getWeekDescription = (weekRange: WeekRange): string => {
  const start = weekRange.weekStart.toLocaleDateString();
  const end = weekRange.weekEnd.toLocaleDateString();
  return `${start} - ${end}`;
};
