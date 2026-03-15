import {
  queryWorkouts,
  getWorkout,
  queryCoachConversations,
  getCoachConversation,
  queryMemories,
  queryCoachConversationSummaries,
  queryWorkoutSummaries,
} from "../../../dynamodb/operations";
import { assembleAnalytics } from "./assembler";
import {
  getCurrentWeekRange,
  getLastNWeeksRange,
  getHistoricalWorkoutRange,
  getWeekDescription,
  getCurrentMonthRange,
  getHistoricalMonthRange,
  getUserTimezoneOrDefault,
  parseCompletedAt,
} from "./date-utils";
import { Workout } from "../workout/types";
import { CoachMessage } from "../coach-conversation/types";
import {
  CoachConversation,
  CoachConversationSummary,
} from "../coach-conversation/types";
import { UserProfile } from "../user/types";
import { UserMemory } from "../memory/types";
import { DynamoDBItem } from "../coach-creator/types";
import {
  HistoricalWorkoutSummary,
  UserWeeklyData,
  UserMonthlyData,
  WorkoutSummary,
} from "./types";
import { logger } from "../logger";

/**
 * Fetch workout summaries for a date range (for analytics)
 * Uses efficient ProjectionExpression to only fetch summary fields, not full workout data
 * Converts completedAt timestamps to user's timezone for proper date aggregation
 */
export const fetchWorkoutSummaries = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  periodLabel: string,
  userTimezone?: string,
): Promise<WorkoutSummary[]> => {
  logger.info(
    `Fetching workout summaries for user ${userId} for ${periodLabel}`,
    {
      dateRange: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
    },
  );

  try {
    // Use specialized query that only fetches summary fields (much more efficient)
    const workoutList = await queryWorkoutSummaries(userId, startDate, endDate);

    logger.info(
      `Found ${workoutList.length} workout summaries for user ${userId} in ${periodLabel}`,
    );

    if (workoutList.length === 0) {
      return [];
    }

    // Map to WorkoutSummary format
    const workoutSummaries: WorkoutSummary[] = [];

    for (let i = 0; i < workoutList.length; i++) {
      const workout = workoutList[i];

      // Only include workouts that have summaries
      if (workout.summary && workout.summary.length > 50) {
        workoutSummaries.push({
          date: parseCompletedAt(
            workout.completedAt,
            "fetchCurrentWeekWorkoutSummaries",
          ),
          workoutId: workout.workoutId,
          workoutName: workout.workoutName,
          discipline: workout.discipline,
          summary: workout.summary,
          userTimezone: userTimezone, // Pass timezone for later conversion
        });

        logger.info(
          `Workout summary ${i + 1}/${workoutList.length}: ${workout.workoutName || workout.workoutId} (${workout.summary.length} chars)`,
        );
      } else {
        logger.warn(
          `Workout ${i + 1}/${workoutList.length}: ${workout.workoutId} - no summary available, skipping`,
        );
      }
    }

    logger.info(
      `Successfully extracted ${workoutSummaries.length} workout summaries for user ${userId} in ${periodLabel}`,
    );
    return workoutSummaries;
  } catch (error) {
    logger.error(
      `Error fetching workout summaries for user ${userId} in ${periodLabel}:`,
      error,
    );
    return [];
  }
};

/**
 * Extract unique coach IDs from workout summaries
 * Uses efficient query to avoid fetching full workout data
 */
const extractCoachIdsFromSummaries = async (
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> => {
  // Use specialized query that only fetches needed fields
  const workoutList = await queryWorkoutSummaries(userId, startDate, endDate);

  const coachIds = new Set<string>();

  workoutList.forEach((workout) => {
    if (workout.coachIds && workout.coachIds.length > 0) {
      workout.coachIds.forEach((id) => coachIds.add(id));
    }
  });

  const uniqueCoachIds = Array.from(coachIds);
  logger.info(
    `Extracted ${uniqueCoachIds.length} unique coach IDs: [${uniqueCoachIds.join(", ")}]`,
  );

  return uniqueCoachIds;
};

/**
 * Fetch coach conversation summaries for a date range (for analytics)
 * Returns conversation summaries instead of full message history
 */
export const fetchCoachConversationSummaries = async (
  userId: string,
  coachIds: string[],
  startDate: Date,
  endDate: Date,
  periodLabel: string,
): Promise<CoachConversationSummary[]> => {
  logger.info(
    `Fetching conversation summaries for user ${userId}, coaches [${coachIds.join(", ")}] for ${periodLabel}`,
  );

  try {
    if (coachIds.length === 0) {
      logger.info(
        `No coaches found for user ${userId}, skipping conversation summaries`,
      );
      return [];
    }

    const allSummaries: CoachConversationSummary[] = [];

    for (const coachId of coachIds) {
      try {
        // Query conversation summaries for this coach
        const summaries = await queryCoachConversationSummaries(
          userId,
          coachId,
        );
        logger.info(
          `Found ${summaries.length} conversation summaries for user ${userId} and coach ${coachId}`,
        );

        if (summaries.length === 0) {
          continue;
        }

        // Filter summaries to the date range based on their createdAt timestamp
        const filteredSummaries = summaries
          .filter((summaryItem) => {
            const summaryDate = new Date(summaryItem.metadata.createdAt);
            return summaryDate >= startDate && summaryDate <= endDate;
          })
          .map((summaryItem) => summaryItem); // Extract attributes from DynamoDBItem

        logger.info(
          `Filtered to ${filteredSummaries.length} conversation summaries in date range for coach ${coachId}`,
        );

        allSummaries.push(...filteredSummaries);
      } catch (error) {
        logger.error(
          `Failed to fetch conversation summaries for user ${userId} and coach ${coachId}:`,
          error,
        );
        // Continue with other coaches
      }
    }

    logger.info(
      `Successfully fetched ${allSummaries.length} conversation summaries for user ${userId} across ${coachIds.length} coaches in ${periodLabel}`,
    );
    return allSummaries;
  } catch (error) {
    logger.error(
      `Error fetching conversation summaries for user ${userId} in ${periodLabel}:`,
      error,
    );
    return [];
  }
};

/**
 * Extract unique coach IDs from a list of workouts
 * @deprecated Use extractCoachIdsFromSummaries instead
 */
const extractCoachIds = (workouts: Workout[]): string[] => {
  const coachIds = new Set<string>();

  workouts.forEach((workout) => {
    if (workout.coachIds && workout.coachIds.length > 0) {
      workout.coachIds.forEach((id) => coachIds.add(id));
    }
  });

  const uniqueCoachIds = Array.from(coachIds);
  logger.info(
    `Extracted ${uniqueCoachIds.length} unique coach IDs: [${uniqueCoachIds.join(", ")}]`,
  );

  return uniqueCoachIds;
};

/**
 * Step 4: Fetch current week workout data for a user
 */
export const fetchCurrentWeekWorkouts = async (
  userId: string,
): Promise<Workout[]> => {
  const weekRange = getCurrentWeekRange();

  logger.info(
    `Fetching workouts for user ${userId} for week: ${getWeekDescription(weekRange)}`,
  );

  try {
    // Step 4a: Get simplified workout list for current week
    const workoutList = await queryWorkouts(userId, {
      fromDate: weekRange.weekStart,
      toDate: weekRange.weekEnd,
      sortBy: "completedAt",
      sortOrder: "desc",
    });

    logger.info(
      `Found ${workoutList.length} workouts for user ${userId} in current week`,
    );

    if (workoutList.length === 0) {
      return [];
    }

    // Step 4b: Get full workout details for each workout
    const fullWorkouts: Workout[] = [];

    for (let i = 0; i < workoutList.length; i++) {
      const workoutSummary = workoutList[i];
      try {
        logger.info(
          `Loading workout ${i + 1}/${workoutList.length}: ${workoutSummary.workoutId} (${workoutSummary.workoutData?.workout_name || "Unnamed Workout"})`,
        );

        const fullWorkout = await getWorkout(userId, workoutSummary.workoutId);
        if (fullWorkout) {
          fullWorkouts.push(fullWorkout);
        }
      } catch (error) {
        logger.error(
          `❌ Failed to fetch workout ${i + 1}/${workoutList.length} (${workoutSummary.workoutId}) for user ${userId}:`,
          error,
        );
        // Continue with other workouts
      }
    }

    logger.info(
      `Successfully fetched ${fullWorkouts.length} full workouts for user ${userId}`,
    );
    return fullWorkouts;
  } catch (error) {
    logger.error(`Error fetching workouts for user ${userId}:`, error);
    return [];
  }
};

/**
 * Step 5: Fetch historical workout summaries (4 weeks before current week)
 */
export const fetchHistoricalWorkoutSummaries = async (
  userId: string,
): Promise<HistoricalWorkoutSummary[]> => {
  const historicalRange = getHistoricalWorkoutRange();

  logger.info(
    `Fetching historical workout summaries for user ${userId} for period: ${getWeekDescription(historicalRange)}`,
  );

  try {
    // Query historical workouts (simplified list only)
    const historicalWorkouts = await queryWorkouts(userId, {
      fromDate: historicalRange.weekStart,
      toDate: historicalRange.weekEnd,
      sortBy: "completedAt",
      sortOrder: "desc", // Most recent first for chronological order
    });

    logger.info(
      `Found ${historicalWorkouts.length} historical workouts for user ${userId}`,
    );

    if (historicalWorkouts.length === 0) {
      return [];
    }

    // Extract summaries from workouts that have them
    const workoutSummaries: HistoricalWorkoutSummary[] = [];

    for (let i = 0; i < historicalWorkouts.length; i++) {
      const workout = historicalWorkouts[i];

      // Only include workouts that have substantial summaries
      if (workout.summary && workout.summary.length > 50) {
        workoutSummaries.push({
          date: parseCompletedAt(
            workout.completedAt,
            "fetchHistoricalWorkoutSummaries",
          ),
          workoutId: workout.workoutId,
          workoutName: workout.workoutData?.workout_name,
          discipline: workout.workoutData?.discipline,
          summary: workout.summary,
        });

        logger.info(
          `Loaded workout (historical) ${i + 1}: ${workout.workoutData?.workout_name || workout.workoutId} loaded (${workout.summary.length} chars)`,
        );
      } else {
        logger.info(
          `Skipped workout (historical) ${i + 1}: ${workout.workoutId} (no substantial summary)`,
        );
      }
    }

    logger.info(
      `Successfully extracted ${workoutSummaries.length} historical workout summaries for user ${userId}`,
    );
    return workoutSummaries;
  } catch (error) {
    logger.error(
      `Error fetching historical workout summaries for user ${userId}:`,
      error,
    );
    return [];
  }
};

/**
 * Step 6: Fetch coaching context (last 2 weeks of conversations)
 */
export const fetchCoachingContext = async (
  userId: string,
  coachIds: string[],
): Promise<CoachConversation[]> => {
  const twoWeeksRange = getLastNWeeksRange(2);

  logger.info(
    `Fetching coaching context for user ${userId}, coaches [${coachIds.join(", ")}] for period: ${getWeekDescription(twoWeeksRange)}`,
  );

  try {
    if (coachIds.length === 0) {
      logger.info(
        `No coaches found in workouts for user ${userId}, skipping coaching context`,
      );
      return [];
    }

    // Step 6a: Get simplified conversation list for each coach
    let allConversations: CoachConversation[] = [];

    for (const coachId of coachIds) {
      try {
        const conversationList = await queryCoachConversations(userId, coachId);
        logger.info(
          `Found ${conversationList.length} total conversations for user ${userId} and coach ${coachId} (will filter to last 2 weeks)`,
        );

        if (conversationList.length === 0) {
          continue;
        }

        // Step 6b: Get full conversation details with messages for this coach
        for (let j = 0; j < conversationList.length; j++) {
          const conversationSummary = conversationList[j];
          try {
            logger.info(
              `Loading conversation ${j + 1}/${conversationList.length} for coach ${coachId}: ${conversationSummary.conversationId}`,
            );

            const fullConversation = await getCoachConversation(
              userId,
              coachId,
              conversationSummary.conversationId,
            );

            if (fullConversation) {
              // Filter messages to last 2 weeks
              const filteredMessages = fullConversation.messages.filter(
                (message: CoachMessage) => {
                  const messageDate = new Date(message.timestamp);
                  return (
                    messageDate >= twoWeeksRange.weekStart &&
                    messageDate <= twoWeeksRange.weekEnd
                  );
                },
              );

              if (filteredMessages.length > 0) {
                // Create a copy with filtered messages
                const filteredConversation = {
                  ...fullConversation,
                  attributes: {
                    ...fullConversation,
                    messages: filteredMessages,
                  },
                };
                allConversations.push(filteredConversation);
                logger.info(
                  `Conversation (historical) ${j + 1} included: ${filteredMessages.length} messages in last 2 weeks`,
                );
              } else {
                logger.info(
                  `Conversation (historical) ${j + 1} skipped: no messages in last 2 weeks`,
                );
              }
            }
          } catch (error) {
            logger.error(
              `Failed to fetch full conversation ${conversationSummary.conversationId} for user ${userId} and coach ${coachId}:`,
              error,
            );
            // Continue with other conversations
          }
        }
      } catch (error) {
        logger.error(
          `Failed to fetch conversations for user ${userId} and coach ${coachId}:`,
          error,
        );
        // Continue with other coaches
      }
    }

    logger.info(
      `Successfully fetched ${allConversations.length} conversations with recent messages for user ${userId} across ${coachIds.length} coaches`,
    );
    return allConversations;
  } catch (error) {
    logger.error(`Error fetching coaching context for user ${userId}:`, error);
    return [];
  }
};

/**
 * Step 7: Fetch user context (memories, goals, constraints)
 */
export const fetchUserContext = async (
  userId: string,
): Promise<UserMemory[]> => {
  logger.info(`Fetching user context for user ${userId}`);

  try {
    // Query memories (function already exists) - get all memories for user
    const memories = await queryMemories(userId, undefined, {
      limit: 50, // Get more memories for comprehensive context
    });

    logger.info(
      `Successfully fetched ${memories.length} memories for user ${userId}`,
    );
    return memories;
  } catch (error) {
    logger.error(`Error fetching user context for user ${userId}:`, error);
    return [];
  }
};

/**
 * Aggregate all data for a single user (weekly, using summaries)
 */
export const fetchUserWeeklyData = async (
  user: UserProfile,
): Promise<UserWeeklyData> => {
  const userId = user.userId;
  const weekRange = getCurrentWeekRange();
  const historicalRange = getHistoricalWorkoutRange();

  // Get user's timezone preference (defaults to Pacific if not set)
  const userTimezone = getUserTimezoneOrDefault(user.preferences?.timezone);

  logger.info(
    `📊 Fetching complete weekly data (summary-based) for user ${userId}`,
    {
      timezone: userTimezone,
      weekRange: {
        start: weekRange.weekStart.toISOString(),
        end: weekRange.weekEnd.toISOString(),
      },
    },
  );

  // Step 1: Extract coach IDs from current week workouts
  const coachIds = await extractCoachIdsFromSummaries(
    userId,
    weekRange.weekStart,
    weekRange.weekEnd,
  );

  // Step 2: Fetch all data in parallel (passing timezone for proper date conversion)
  const [
    currentWeekSummaries,
    historicalSummaries,
    conversationSummaries,
    memories,
  ] = await Promise.all([
    fetchWorkoutSummaries(
      userId,
      weekRange.weekStart,
      weekRange.weekEnd,
      "current week",
      userTimezone,
    ),
    fetchWorkoutSummaries(
      userId,
      historicalRange.weekStart,
      historicalRange.weekEnd,
      "historical (4 weeks)",
      userTimezone,
    ),
    fetchCoachConversationSummaries(
      userId,
      coachIds,
      getLastNWeeksRange(2).weekStart, // Last 2 weeks of conversations
      weekRange.weekEnd,
      "last 2 weeks",
    ),
    fetchUserContext(userId),
  ]);

  const userData: UserWeeklyData = {
    userId,
    weekRange,
    workouts: {
      summaries: currentWeekSummaries,
      count: currentWeekSummaries.length,
    },
    coaching: {
      summaries: conversationSummaries,
      count: conversationSummaries.length,
    },
    userContext: {
      memories,
      memoryCount: memories.length,
    },
    historical: {
      workoutSummaries: historicalSummaries,
      summaryCount: historicalSummaries.length,
    },
  };

  logger.info(`✅ Completed weekly data fetch for user ${userId}:`, {
    workoutCount: userData.workouts.count,
    historicalSummaryCount: userData.historical.summaryCount,
    conversationSummaryCount: userData.coaching.count,
    memoryCount: userData.userContext.memoryCount,
    timezone: userTimezone,
  });

  return userData;
};

/**
 * Generate analytics for a user by delegating to the assembler.
 *
 * The assembler replaces the former monolithic Bedrock call with three
 * parallel focused sub-task calls followed by a human summary call.
 * See amplify/functions/libs/analytics/assembler.ts for implementation details.
 */
export const generateAnalytics = async (
  weeklyData: UserWeeklyData | UserMonthlyData,
  userProfile?: any,
): Promise<any> => {
  const userId = weeklyData.userId;
  logger.info(
    `Generating ${"weekRange" in weeklyData ? "weekly" : "monthly"} analytics for user ${userId} via assembler.`,
  );

  try {
    const result = await assembleAnalytics(weeklyData, userProfile);
    logger.info(`Analytics assembly complete for user ${userId}.`);
    return result;
  } catch (error) {
    logger.error(`Failed to generate analytics for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Aggregate all data for a single user (monthly version, using summaries)
 */
export const fetchUserMonthlyData = async (
  user: UserProfile,
): Promise<UserMonthlyData> => {
  const userId = user.userId;
  const monthRange = getCurrentMonthRange();
  const historicalRange = getHistoricalMonthRange(3);

  // Get user's timezone preference (defaults to Pacific if not set)
  const userTimezone = getUserTimezoneOrDefault(user.preferences?.timezone);

  logger.info(
    `📊 Fetching complete monthly data (summary-based) for user ${userId}`,
    {
      timezone: userTimezone,
    },
  );

  // Step 1: Extract coach IDs from current month workouts
  const coachIds = await extractCoachIdsFromSummaries(
    userId,
    monthRange.monthStart,
    monthRange.monthEnd,
  );

  // Step 2: Fetch all data in parallel (passing timezone for proper date conversion)
  const [
    currentMonthSummaries,
    historicalSummaries,
    conversationSummaries,
    memories,
  ] = await Promise.all([
    fetchWorkoutSummaries(
      userId,
      monthRange.monthStart,
      monthRange.monthEnd,
      "current month",
      userTimezone,
    ),
    fetchWorkoutSummaries(
      userId,
      historicalRange.monthStart,
      historicalRange.monthEnd,
      "historical (3 months)",
      userTimezone,
    ),
    fetchCoachConversationSummaries(
      userId,
      coachIds,
      monthRange.monthStart,
      monthRange.monthEnd,
      "current month",
    ),
    fetchUserContext(userId),
  ]);

  const userData: UserMonthlyData = {
    userId,
    monthRange,
    workouts: {
      summaries: currentMonthSummaries,
      count: currentMonthSummaries.length,
    },
    coaching: {
      summaries: conversationSummaries,
      count: conversationSummaries.length,
    },
    userContext: {
      memories,
      memoryCount: memories.length,
    },
    historical: {
      workoutSummaries: historicalSummaries,
      summaryCount: historicalSummaries.length,
    },
  };

  logger.info(`✅ Completed monthly data fetch for user ${userId}:`, {
    workoutCount: userData.workouts.count,
    historicalSummaryCount: userData.historical.summaryCount,
    conversationSummaryCount: userData.coaching.count,
    memoryCount: userData.userContext.memoryCount,
    timezone: userTimezone,
    monthRange: `${monthRange.monthStart.toISOString().split("T")[0]} to ${monthRange.monthEnd.toISOString().split("T")[0]}`,
  });

  return userData;
};
