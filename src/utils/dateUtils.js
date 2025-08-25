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

  const expectedWeekId = `${currentYear}-W${currentWeek.toString().padStart(2, '0')}`;
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

  return `${currentYear}-W${currentWeek.toString().padStart(2, '0')}`;
};
