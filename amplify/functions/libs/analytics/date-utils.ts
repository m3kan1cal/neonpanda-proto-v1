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
 * Get the current week's date range (Monday to Sunday, ISO-8601)
 * Analytics run on Sunday morning, so "current week" is the week that just ended
 */
export const getCurrentWeekRange = (): WeekRange => {
  const now = new Date();

  // ISO-8601: Week starts on Monday (day 1), ends on Sunday (day 7)
  // Convert JavaScript's getDay() (0=Sunday) to ISO day (1=Monday, 7=Sunday)
  const currentDayOfWeek = now.getDay();
  const isoDay = currentDayOfWeek === 0 ? 7 : currentDayOfWeek; // Sunday becomes 7

  // When analytics runs on Sunday morning, we want the week that just ended
  // (Monday to Sunday of the previous week)
  const weekStart = new Date(now);

  if (isoDay === 7) {
    // Today is Sunday - go back 6 days to get last Monday (start of week that just ended)
    weekStart.setDate(now.getDate() - 6);
  } else {
    // Other days - go back to previous Monday (7 + days since Monday)
    weekStart.setDate(now.getDate() - isoDay - 6);
  }

  // Set to start of day (00:00:00)
  weekStart.setHours(0, 0, 0, 0);

  // Week end is 6 days after Monday (Sunday) at end of day (23:59:59.999)
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
