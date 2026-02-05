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
  // Use getUTCDay() consistently to avoid local/UTC timezone mismatch
  const currentDayOfWeek = now.getUTCDay();
  const isoDay = currentDayOfWeek === 0 ? 7 : currentDayOfWeek; // Sunday becomes 7

  // When analytics runs on Sunday morning, we want the week that just ended
  // (Monday to Sunday of the previous week)
  const weekStart = new Date(now);

  if (isoDay === 7) {
    // Today is Sunday - go back 6 days to get last Monday (start of week that just ended)
    weekStart.setUTCDate(now.getUTCDate() - 6);
  } else {
    // Other days - go back to previous Monday (7 + days since Monday)
    weekStart.setUTCDate(now.getUTCDate() - isoDay - 6);
  }

  // Set to start of day (00:00:00 UTC)
  weekStart.setUTCHours(0, 0, 0, 0);

  // Week end is 6 days after Monday (Sunday) at end of day (23:59:59.999 UTC)
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

/**
 * Get date range for the last N weeks of coaching conversations
 * Used for fetching recent coaching context
 */
export const getLastNWeeksRange = (weeks: number): WeekRange => {
  const currentWeek = getCurrentWeekRange();

  const rangeStart = new Date(currentWeek.weekStart);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - weeks * 7);

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
  historyEnd.setUTCDate(historyEnd.getUTCDate() - 1);
  historyEnd.setUTCHours(23, 59, 59, 999);

  // Start of historical range is 4 weeks (28 days) before that
  const historyStart = new Date(historyEnd);
  historyStart.setUTCDate(historyStart.getUTCDate() - 27); // 28 days total including end day
  historyStart.setUTCHours(0, 0, 0, 0);

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
  weekRange: WeekRange,
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

/**
 * Month date range for analytics calculations
 */
export interface MonthRange {
  monthStart: Date;
  monthEnd: Date;
}

/**
 * Get the current month's date range (1st to last day of month)
 * For current month processing - includes incomplete months
 */
export const getCurrentMonthRange = (): MonthRange => {
  const now = new Date();

  // First day of current month at 00:00:00 UTC
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  // Last day of current month at 23:59:59.999 UTC
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  return { monthStart, monthEnd };
};

/**
 * Get date range for the last N months
 * Used for fetching historical context
 */
export const getLastNMonthsRange = (months: number): MonthRange => {
  const now = new Date();

  // Start from N months ago (1st of that month) in UTC
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1, 0, 0, 0, 0),
  );

  // End at last day of current month in UTC
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  return { monthStart, monthEnd };
};

/**
 * Get historical month range (N months before current month, excluding current month)
 * Used for fetching historical workout summaries
 */
export const getHistoricalMonthRange = (months: number = 3): MonthRange => {
  const currentMonth = getCurrentMonthRange();

  // End of historical range is the day before current month starts
  const historyEnd = new Date(currentMonth.monthStart);
  historyEnd.setUTCDate(historyEnd.getUTCDate() - 1);
  historyEnd.setUTCHours(23, 59, 59, 999);

  // Start of historical range is N months before that (in UTC)
  const historyStart = new Date(
    Date.UTC(
      historyEnd.getUTCFullYear(),
      historyEnd.getUTCMonth() - months + 1,
      1,
      0,
      0,
      0,
      0,
    ),
  );

  return {
    monthStart: historyStart,
    monthEnd: historyEnd,
  };
};

/**
 * Generate month ID in YYYY-MM format
 */
export const generateMonthId = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Get a human-readable month description for logging
 */
export const getMonthDescription = (monthRange: MonthRange): string => {
  const start = monthRange.monthStart.toLocaleDateString();
  const end = monthRange.monthEnd.toLocaleDateString();
  return `${start} - ${end}`;
};

/**
 * Check if a date falls within a month range
 */
export const isDateInMonthRange = (
  date: Date,
  monthRange: MonthRange,
): boolean => {
  return date >= monthRange.monthStart && date <= monthRange.monthEnd;
};

/**
 * Convert a UTC timestamp to a date string in the user's timezone
 * Returns YYYY-MM-DD format in the user's local timezone
 *
 * @param utcTimestamp - UTC timestamp (Date object or ISO string)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date string in YYYY-MM-DD format
 */
export const convertUtcToUserDate = (
  utcTimestamp: Date | string,
  timezone: string,
): string => {
  const date =
    typeof utcTimestamp === "string" ? new Date(utcTimestamp) : utcTimestamp;

  // Use Intl.DateTimeFormat to convert to user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
};

/**
 * Get user's timezone with fallback to Pacific time
 * @param userTimezone - User's preferred timezone from profile
 * @returns IANA timezone string
 */
export const getUserTimezoneOrDefault = (
  userTimezone?: string | null,
): string => {
  // Default to Pacific time if no timezone is set
  // UTC should only be used for storage, never for display
  return userTimezone || "America/Los_Angeles";
};

/**
 * Parse completedAt value from various formats into a valid Date object
 *
 * This is the centralized utility for parsing workout completion timestamps.
 * Handles multiple input formats that can come from different sources:
 * - ISO strings: "2025-12-21T16:09:00-08:00"
 * - Unix timestamps (seconds): 1766362020
 * - Unix timestamps (milliseconds): 1766362020000
 * - Numeric strings: "1766362020"
 * - Date objects: new Date()
 *
 * @param completedAt - Date value in any supported format
 * @param context - Optional context for error messages (e.g., "save_workout_tool")
 * @returns Valid Date object
 * @throws Error if date is invalid or cannot be parsed
 *
 * @example
 * parseCompletedAt("2025-12-21T16:09:00Z") // ISO string
 * parseCompletedAt(1766362020) // Unix timestamp (seconds)
 * parseCompletedAt("1766362020") // Numeric string
 */
export const parseCompletedAt = (
  completedAt: string | number | Date,
  context?: string,
): Date => {
  const contextPrefix = context ? `[${context}] ` : "";

  // Already a Date object
  if (completedAt instanceof Date) {
    if (isNaN(completedAt.getTime())) {
      throw new Error(`${contextPrefix}Invalid Date object provided`);
    }
    return completedAt;
  }

  // Normalize numeric strings (e.g., "1766362020" → 1766362020)
  let value: number | string;
  if (
    typeof completedAt === "string" &&
    !isNaN(Number(completedAt)) &&
    completedAt.trim() !== ""
  ) {
    value = Number(completedAt);
    console.info(
      `${contextPrefix}📅 Converted numeric string to number: ${completedAt} → ${value}`,
    );
  } else {
    value = completedAt;
  }

  // Handle numbers (Unix timestamps)
  if (typeof value === "number") {
    // Unix timestamps in seconds are < 10,000,000,000 (roughly year 2286)
    // Anything larger is assumed to be milliseconds
    const timestamp = value < 10000000000 ? value * 1000 : value;
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      throw new Error(
        `${contextPrefix}Invalid Unix timestamp: ${completedAt} (normalized: ${value})`,
      );
    }

    console.info(
      `${contextPrefix}📅 Parsed Unix timestamp: ${value} → ${date.toISOString()}`,
    );
    return date;
  }

  // Handle ISO/date strings
  if (typeof value === "string") {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`${contextPrefix}Invalid date string: ${completedAt}`);
    }

    console.info(
      `${contextPrefix}📅 Parsed date string: ${value} → ${date.toISOString()}`,
    );
    return date;
  }

  // Unexpected type
  throw new Error(
    `${contextPrefix}Invalid completedAt type: ${typeof value}. Expected string, number, or Date.`,
  );
};
