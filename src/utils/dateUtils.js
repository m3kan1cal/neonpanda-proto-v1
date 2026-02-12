import { logger } from "./logger";
/**
 * Date utility functions for the application
 */

/**
 * Check if a report is from the current week (for "NEW" badge indicator)
 * @param {string} weekId - Week ID in format "YYYY-WXX" (e.g., "2025-W03")
 * @returns {boolean} - True if the weekId matches the current week
 */
export const isCurrentWeekReport = (weekId) => {
  if (!weekId) return false;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Calculate current week number (ISO week)
  const startOfYear = new Date(currentYear, 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
  const currentWeek = Math.ceil((dayOfYear - now.getDay() + 1) / 7);

  const expectedWeekId = `${currentYear}-W${currentWeek.toString().padStart(2, "0")}`;
  return weekId === expectedWeekId;
};

/**
 * Get the current week ID in ISO format
 * @returns {string} - Current week ID (e.g., "2025-W03")
 */
export const getCurrentWeekId = () => {
  const now = new Date();
  const currentYear = now.getFullYear();

  const startOfYear = new Date(currentYear, 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
  const currentWeek = Math.ceil((dayOfYear - now.getDay() + 1) / 7);

  return `${currentYear}-W${currentWeek.toString().padStart(2, "0")}`;
};

/**
 * Check if a workout is new (created within the last 24 hours)
 * @param {string} completedAt - Workout completion date in ISO string format
 * @returns {boolean} - True if the workout was completed within the last 24 hours
 */
export const isNewWorkout = (completedAt) => {
  if (!completedAt) return false;

  try {
    const workoutDate = new Date(completedAt);
    const now = new Date();

    // Check if date is valid
    if (isNaN(workoutDate.getTime())) {
      return false;
    }

    // Calculate difference in milliseconds
    const diffInMs = now.getTime() - workoutDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    // Return true if workout is less than 24 hours old
    return diffInHours >= 0 && diffInHours <= 24;
  } catch (error) {
    logger.error("Error checking if workout is new:", error);
    return false;
  }
};

/**
 * Check if a conversation has recent activity (updated within the last 24 hours)
 * @param {string} lastActivity - Last activity date in ISO string format (fallback to createdAt)
 * @param {string} createdAt - Creation date in ISO string format (fallback if lastActivity not available)
 * @returns {boolean} - True if the conversation had activity within the last 24 hours
 */
export const isRecentConversation = (lastActivity, createdAt) => {
  // Use lastActivity if available, otherwise fall back to createdAt
  const activityDate = lastActivity || createdAt;
  if (!activityDate) return false;

  try {
    const conversationDate = new Date(activityDate);
    const now = new Date();

    // Check if date is valid
    if (isNaN(conversationDate.getTime())) {
      return false;
    }

    // Calculate difference in milliseconds
    const diffInMs = now.getTime() - conversationDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    // Return true if conversation had activity less than 24 hours ago
    return diffInHours >= 0 && diffInHours <= 24;
  } catch (error) {
    logger.error("Error checking if conversation is recent:", error);
    return false;
  }
};

/**
 * Get formatted date range for a weekly report
 * Uses actual weekStart/weekEnd if available (most accurate),
 * otherwise falls back to parsing weekId for backwards compatibility
 *
 * @param {Object} report - Report object with weekStart, weekEnd, and/or weekId
 * @returns {string} - Formatted date range (e.g., "Sep 28 - Oct 4")
 */
export const getWeekDateRange = (report) => {
  // Use actual weekStart/weekEnd if available (more accurate than parsing weekId)
  if (report?.weekStart && report?.weekEnd) {
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };
    return `${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}`;
  }

  // Fallback to weekId parsing (for backwards compatibility)
  const weekId = report?.weekId;
  if (!weekId) return "Unknown week";

  const [year, week] = weekId.split("-W");
  if (!year || !week) return weekId;

  const firstDayOfYear = new Date(year, 0, 1);
  const daysToFirstMonday = (8 - firstDayOfYear.getDay()) % 7;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (parseInt(week) - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
};

/**
 * Format workout count with proper pluralization
 * @param {number} count - Number of workouts
 * @returns {string} - Formatted string (e.g., "1 workout" or "5 workouts")
 */
export const formatWorkoutCount = (count) => {
  return `${count} workout${count === 1 ? "" : "s"}`;
};

/**
 * Format a date as a relative timestamp (e.g., "2d ago", "5h ago", "3mo ago")
 * @param {string|Date} dateInput - Date in ISO string format or Date object
 * @returns {string} - Formatted relative time string, or empty string if invalid
 */
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return "";
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / (1000 * 60));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    const days = Math.floor(diffMins / 1440);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return "";
  }
};
