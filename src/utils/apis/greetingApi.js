import { authenticatedFetch, getApiUrl } from "./apiConfig";

/**
 * Generate an AI-powered contextual greeting from the coach's perspective
 * for the Training Grounds dashboard.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} coachId - The coach whose personality shapes the greeting
 * @param {Object} context - Context for personalized greeting generation
 * @param {"morning" | "afternoon" | "evening" | "night"} context.timeOfDay - Current time of day
 * @param {number} context.activeProgramCount - Number of active training programs
 * @param {number} context.todaysWorkoutCount - Number of workouts scheduled today
 * @param {string} [context.lastWorkoutDate] - ISO date of last completed workout
 * @param {AbortSignal} [signal] - Optional AbortSignal for request cancellation
 * @returns {Promise<{greeting: string, generatedAt: string}>}
 */
export const generateGreeting = async (userId, coachId, context, signal) => {
  const url = getApiUrl(`/users/${userId}/coaches/${coachId}/greeting`);

  const response = await authenticatedFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to generate greeting");
  }

  const data = await response.json();
  return data; // { greeting, generatedAt }
};
