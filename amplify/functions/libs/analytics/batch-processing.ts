import { UserProfile } from "../user/types";
import { DynamoDBItem } from "../coach-creator/types";
import {
  queryAllUsers,
  QueryAllUsersResult,
  saveWeeklyAnalytics,
  saveMonthlyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
} from "../../../dynamodb/operations";
import {
  fetchUserWeeklyData,
  fetchUserMonthlyData,
  generateAnalytics,
} from "./data-fetching";
import {
  UserWeeklyData,
  UserMonthlyData,
  WeeklyAnalytics,
  MonthlyAnalytics,
} from "./types";
import { storeDebugDataInS3 } from "../api-helpers";
import { generateMonthId, getCurrentWeekRange, getCurrentMonthRange } from "./date-utils";
import { logger } from "../logger";

// Minimum remaining Lambda time (ms) required before starting a new user.
// Prevents a new user from starting when there is insufficient budget to complete it.
const MIN_REMAINING_TIME_MS = 180_000;

/**
 * Helper function to generate week ID from date range
 * Uses ISO-8601 week numbering (Monday-based weeks)
 * Week 1 is the first week containing a Thursday (or equivalently, Jan 4)
 */
const generateWeekId = (weekStart: Date): string => {
  // ISO-8601 week calculation
  // Week 1 is the first week with a Thursday in it (or containing Jan 4)

  const target = new Date(weekStart);
  target.setHours(0, 0, 0, 0);

  // Get the ISO day (1=Monday, 7=Sunday)
  const dayOfWeek = target.getDay();
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  // Get Thursday of this week (ISO week is defined by its Thursday)
  const thursday = new Date(target);
  thursday.setDate(target.getDate() + (4 - isoDay));

  // Get the year from Thursday's date (handles edge cases near year boundaries)
  const year = thursday.getFullYear();

  // Get Thursday of week 1 (Jan 4 is always in week 1)
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay();
  const jan4IsoDay = jan4Day === 0 ? 7 : jan4Day;
  const week1Thursday = new Date(jan4);
  week1Thursday.setDate(jan4.getDate() + (4 - jan4IsoDay));

  // Calculate week number by counting weeks between Thursdays
  const weeksDiff = Math.round(
    (thursday.getTime() - week1Thursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const weekNumber = weeksDiff + 1;

  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
};

/**
 * Process users in batches for weekly analytics generation
 */
export const processBatch = async (
  users: UserProfile[],
  batchNumber: number,
  getRemainingTimeInMillis?: () => number,
): Promise<number> => {
  logger.info(`📊 Processing batch ${batchNumber} with ${users.length} users`);

  // Compute the current weekId once for the entire batch (all users share the same period)
  const currentWeekRange = getCurrentWeekRange();
  const currentWeekId = generateWeekId(currentWeekRange.weekStart);

  let processedCount = 0;

  for (const user of users) {
    // Time guard: if Lambda is running low on time, stop processing to avoid a timeout mid-user
    if (getRemainingTimeInMillis) {
      const remainingMs = getRemainingTimeInMillis();
      if (remainingMs < MIN_REMAINING_TIME_MS) {
        logger.warn(
          `⏱️ Insufficient Lambda time remaining (${Math.round(remainingMs / 1000)}s). ` +
            `Stopping batch ${batchNumber} after ${processedCount} users. ` +
            `Remaining users will be picked up on next invocation (idempotency ensures no re-processing).`,
        );
        break;
      }
    }

    try {
      // Idempotency check: skip user if analytics for this week were already generated
      try {
        const existingAnalytics = await getWeeklyAnalytics(
          user.userId,
          currentWeekId,
        );
        if (existingAnalytics) {
          logger.info(
            `⏭️ Skipping user ${user.userId}: weekly analytics for ${currentWeekId} already exist (idempotency).`,
          );
          processedCount++;
          continue;
        }
      } catch (idempotencyError) {
        // Log but do not skip -- safer to re-process than to silently miss a user
        logger.warn(
          `⚠️ Idempotency check failed for user ${user.userId}, proceeding with generation:`,
          idempotencyError,
        );
      }

      logger.info(`🔍 Processing user: ${user.userId} (${user.email})`);

      // Fetch all weekly data for this user
      const weeklyData: UserWeeklyData = await fetchUserWeeklyData(user);

      // Check if user has >= 2 workouts this week (Phase 1 requirement)
      if (weeklyData.workouts.count < 2) {
        logger.info(
          `⏭️  Skipping user ${user.userId}: only ${weeklyData.workouts.count} workouts this week (minimum 2 required)`,
        );
        continue;
      }

      // Generate analytics for this user using LLM
      try {
        const analytics = await generateAnalytics(weeklyData, user);

        // Store analytics in S3
        try {
          const s3Location = await storeDebugDataInS3(
            JSON.stringify(analytics, null, 2),
            {
              userId: user.userId,
              type: "weekly-analytics",
              weekStart: weeklyData.weekRange.weekStart.toISOString(),
              weekEnd: weeklyData.weekRange.weekEnd.toISOString(),
              workoutCount: weeklyData.workouts.count,
              conversationCount: weeklyData.coaching.count,
              memoryCount: weeklyData.userContext.memoryCount,
              historicalSummaryCount: weeklyData.historical.summaryCount,
              analyticsLength: JSON.stringify(analytics).length,
              hasAthleteProfile: !!user.athleteProfile?.summary,
              hasDualOutput: !!(
                analytics.structured_analytics && analytics.human_summary
              ),
              humanSummaryLength: analytics.human_summary?.length || 0,
            },
          );

          // Create shared log data
          const logData = {
            s3Location,
            workoutCount: weeklyData.workouts.count,
            historicalSummaryCount: weeklyData.historical.summaryCount,
            conversationCount: weeklyData.coaching.count,
            memoryCount: weeklyData.userContext.memoryCount,
            analyticsSize: JSON.stringify(analytics).length,
            humanSummaryLength: analytics.human_summary?.length || 0,
            hasBothOutputs: !!(
              analytics.structured_analytics && analytics.human_summary
            ),
            weekRange: `${weeklyData.weekRange.weekStart.toISOString().split("T")[0]} to ${weeklyData.weekRange.weekEnd.toISOString().split("T")[0]}`,
          };

          // Store analytics in DynamoDB
          try {
            const weekId = generateWeekId(weeklyData.weekRange.weekStart);
            const weeklyAnalytics: WeeklyAnalytics = {
              userId: user.userId,
              weekId,
              weekStart: weeklyData.weekRange.weekStart
                .toISOString()
                .split("T")[0],
              weekEnd: weeklyData.weekRange.weekEnd.toISOString().split("T")[0],
              analyticsData: analytics,
              s3Location,
              metadata: {
                workoutCount: weeklyData.workouts.count,
                conversationCount: weeklyData.coaching.count,
                memoryCount: weeklyData.userContext.memoryCount,
                historicalSummaryCount: weeklyData.historical.summaryCount,
                analyticsLength: JSON.stringify(analytics).length,
                hasAthleteProfile: !!user.athleteProfile?.summary,
                hasDualOutput: !!(
                  analytics.structured_analytics && analytics.human_summary
                ),
                humanSummaryLength: analytics.human_summary?.length || 0,
                normalizationApplied:
                  !!analytics.structured_analytics?.metadata
                    ?.normalization_applied,
                analysisConfidence:
                  analytics.structured_analytics?.metadata
                    ?.analysis_confidence ?? "medium",
                dataCompleteness:
                  analytics.structured_analytics?.metadata?.data_completeness ??
                  0.8,
              },
            };

            await saveWeeklyAnalytics(weeklyAnalytics);
            logger.info(
              `✅ User ${user.userId} analytics completed and stored:`,
              {
                ...logData,
                dynamodbKey: `user#${user.userId} / weeklyAnalytics#${weekId}`,
              },
            );
          } catch (dynamoError) {
            logger.warn(
              `⚠️ Failed to store analytics in DynamoDB for user ${user.userId}:`,
              dynamoError,
            );

            logger.warn(
              `⚠️ User ${user.userId} analytics completed (S3 only - DynamoDB failed):`,
              logData,
            );
          }
        } catch (s3Error) {
          logger.warn(
            `⚠️ Failed to store analytics in S3 for user ${user.userId}:`,
            s3Error,
          );
        }
      } catch (analyticsError) {
        logger.error(
          `❌ Failed to generate analytics for user ${user.userId}:`,
          analyticsError,
        );
        logger.info(`⚠️  Continuing with next user despite analytics failure`);

        // Log data collection success even if analytics failed
        logger.info(
          `✅ User ${user.userId} data collected (analytics failed):`,
          {
            workoutCount: weeklyData.workouts.count,
            historicalSummaryCount: weeklyData.historical.summaryCount,
            conversationCount: weeklyData.coaching.count,
            memoryCount: weeklyData.userContext.memoryCount,
          },
        );
      }

      processedCount++;
    } catch (userError) {
      logger.error(`❌ Failed to process user ${user.userId}:`, userError);
      // Continue processing other users even if one fails
    }
  }

  logger.info(
    `📋 Batch ${batchNumber} completed: ${processedCount}/${users.length} users processed`,
  );
  return processedCount;
};

/**
 * Process all active users in batches for analytics
 */
export const processAllUsersInBatches = async (
  batchSize: number = 50,
  getRemainingTimeInMillis?: () => number,
): Promise<number> => {
  let totalProcessedUsers = 0;
  let lastEvaluatedKey: any = undefined;
  let batchNumber = 0;

  do {
    // Time guard at the batch loop level: stop fetching new batches if time is low
    if (getRemainingTimeInMillis) {
      const remainingMs = getRemainingTimeInMillis();
      if (remainingMs < MIN_REMAINING_TIME_MS) {
        logger.warn(
          `⏱️ Insufficient Lambda time remaining (${Math.round(remainingMs / 1000)}s). ` +
            `Stopping after ${batchNumber} batches. Remaining users will be handled on next invocation.`,
        );
        break;
      }
    }

    batchNumber++;
    const result: QueryAllUsersResult = await queryAllUsers(
      batchSize,
      lastEvaluatedKey,
    );

    if (result.users.length > 0) {
      const processedInBatch = await processBatch(
        result.users,
        batchNumber,
        getRemainingTimeInMillis,
      );
      totalProcessedUsers += processedInBatch;
    }

    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  return totalProcessedUsers;
};

// ===========================
// MONTHLY ANALYTICS BATCH PROCESSING
// ===========================

/**
 * Process users in batches for monthly analytics generation
 */
export const processMonthlyBatch = async (
  users: UserProfile[],
  batchNumber: number,
  getRemainingTimeInMillis?: () => number,
): Promise<number> => {
  logger.info(
    `📊 Processing monthly batch ${batchNumber} with ${users.length} users`,
  );

  // Compute the current monthId once for the entire batch (all users share the same period)
  const currentMonthRange = getCurrentMonthRange();
  const currentMonthId = generateMonthId(currentMonthRange.monthStart);

  let processedCount = 0;

  for (const user of users) {
    // Time guard: if Lambda is running low on time, stop processing to avoid a timeout mid-user
    if (getRemainingTimeInMillis) {
      const remainingMs = getRemainingTimeInMillis();
      if (remainingMs < MIN_REMAINING_TIME_MS) {
        logger.warn(
          `⏱️ Insufficient Lambda time remaining (${Math.round(remainingMs / 1000)}s). ` +
            `Stopping monthly batch ${batchNumber} after ${processedCount} users. ` +
            `Remaining users will be picked up on next invocation (idempotency ensures no re-processing).`,
        );
        break;
      }
    }

    try {
      // Idempotency check: skip user if analytics for this month were already generated
      try {
        const existingAnalytics = await getMonthlyAnalytics(
          user.userId,
          currentMonthId,
        );
        if (existingAnalytics) {
          logger.info(
            `⏭️ Skipping user ${user.userId}: monthly analytics for ${currentMonthId} already exist (idempotency).`,
          );
          processedCount++;
          continue;
        }
      } catch (idempotencyError) {
        // Log but do not skip -- safer to re-process than to silently miss a user
        logger.warn(
          `⚠️ Monthly idempotency check failed for user ${user.userId}, proceeding with generation:`,
          idempotencyError,
        );
      }

      logger.info(`🔍 Processing user: ${user.userId} (${user.email})`);

      // Fetch all monthly data for this user
      const monthlyData: UserMonthlyData = await fetchUserMonthlyData(user);

      // Check if user has >= 4 workouts this month (Phase 1 requirement)
      if (monthlyData.workouts.count < 4) {
        logger.info(
          `⏭️  Skipping user ${user.userId}: only ${monthlyData.workouts.count} workouts this month (minimum 4 required)`,
        );
        continue;
      }

      // Generate analytics for this user using LLM
      try {
        const analytics = await generateAnalytics(monthlyData, user);

        // Store analytics in S3
        try {
          const s3Location = await storeDebugDataInS3(
            JSON.stringify(analytics, null, 2),
            {
              userId: user.userId,
              type: "monthly-analytics",
              monthStart: monthlyData.monthRange.monthStart.toISOString(),
              monthEnd: monthlyData.monthRange.monthEnd.toISOString(),
              workoutCount: monthlyData.workouts.count,
              conversationCount: monthlyData.coaching.count,
              memoryCount: monthlyData.userContext.memoryCount,
              historicalSummaryCount: monthlyData.historical.summaryCount,
              analyticsLength: JSON.stringify(analytics).length,
              hasAthleteProfile: !!user.athleteProfile?.summary,
              hasDualOutput: !!(
                analytics.structured_analytics && analytics.human_summary
              ),
              humanSummaryLength: analytics.human_summary?.length || 0,
            },
          );

          // Create shared log data
          const logData = {
            s3Location,
            workoutCount: monthlyData.workouts.count,
            historicalSummaryCount: monthlyData.historical.summaryCount,
            conversationCount: monthlyData.coaching.count,
            memoryCount: monthlyData.userContext.memoryCount,
            analyticsSize: JSON.stringify(analytics).length,
            humanSummaryLength: analytics.human_summary?.length || 0,
            hasBothOutputs: !!(
              analytics.structured_analytics && analytics.human_summary
            ),
            monthRange: `${monthlyData.monthRange.monthStart.toISOString().split("T")[0]} to ${monthlyData.monthRange.monthEnd.toISOString().split("T")[0]}`,
          };

          // Store analytics in DynamoDB
          try {
            const monthId = generateMonthId(monthlyData.monthRange.monthStart);
            const monthlyAnalytics: MonthlyAnalytics = {
              userId: user.userId,
              monthId,
              monthStart: monthlyData.monthRange.monthStart
                .toISOString()
                .split("T")[0],
              monthEnd: monthlyData.monthRange.monthEnd
                .toISOString()
                .split("T")[0],
              analyticsData: analytics,
              s3Location,
              metadata: {
                workoutCount: monthlyData.workouts.count,
                conversationCount: monthlyData.coaching.count,
                memoryCount: monthlyData.userContext.memoryCount,
                historicalSummaryCount: monthlyData.historical.summaryCount,
                analyticsLength: JSON.stringify(analytics).length,
                hasAthleteProfile: !!user.athleteProfile?.summary,
                hasDualOutput: !!(
                  analytics.structured_analytics && analytics.human_summary
                ),
                humanSummaryLength: analytics.human_summary?.length || 0,
                normalizationApplied:
                  !!analytics.structured_analytics?.metadata
                    ?.normalization_applied,
                analysisConfidence:
                  analytics.structured_analytics?.metadata
                    ?.analysis_confidence ?? "medium",
                dataCompleteness:
                  analytics.structured_analytics?.metadata?.data_completeness ??
                  0.8,
              },
            };

            await saveMonthlyAnalytics(monthlyAnalytics);
            logger.info(
              `✅ User ${user.userId} monthly analytics completed and stored:`,
              {
                ...logData,
                dynamodbKey: `user#${user.userId} / monthlyAnalytics#${monthId}`,
              },
            );
          } catch (dynamoError) {
            logger.warn(
              `⚠️ Failed to store monthly analytics in DynamoDB for user ${user.userId}:`,
              dynamoError,
            );

            logger.warn(
              `⚠️ User ${user.userId} monthly analytics completed (S3 only - DynamoDB failed):`,
              logData,
            );
          }
        } catch (s3Error) {
          logger.warn(
            `⚠️ Failed to store monthly analytics in S3 for user ${user.userId}:`,
            s3Error,
          );
        }
      } catch (analyticsError) {
        logger.error(
          `❌ Failed to generate monthly analytics for user ${user.userId}:`,
          analyticsError,
        );
        logger.info(`⚠️  Continuing with next user despite analytics failure`);

        // Log data collection success even if analytics failed
        logger.info(
          `✅ User ${user.userId} monthly data collected (analytics failed):`,
          {
            workoutCount: monthlyData.workouts.count,
            historicalSummaryCount: monthlyData.historical.summaryCount,
            conversationCount: monthlyData.coaching.count,
            memoryCount: monthlyData.userContext.memoryCount,
          },
        );
      }

      processedCount++;
    } catch (userError) {
      logger.error(`❌ Failed to process user ${user.userId}:`, userError);
      // Continue processing other users even if one fails
    }
  }

  logger.info(
    `📋 Monthly batch ${batchNumber} completed: ${processedCount}/${users.length} users processed`,
  );
  return processedCount;
};

/**
 * Process all active users in batches for monthly analytics
 */
export const processAllUsersInBatchesMonthly = async (
  batchSize: number = 50,
  getRemainingTimeInMillis?: () => number,
): Promise<number> => {
  let totalProcessedUsers = 0;
  let lastEvaluatedKey: any = undefined;
  let batchNumber = 0;

  do {
    // Time guard at the batch loop level: stop fetching new batches if time is low
    if (getRemainingTimeInMillis) {
      const remainingMs = getRemainingTimeInMillis();
      if (remainingMs < MIN_REMAINING_TIME_MS) {
        logger.warn(
          `⏱️ Insufficient Lambda time remaining (${Math.round(remainingMs / 1000)}s). ` +
            `Stopping monthly processing after ${batchNumber} batches. Remaining users will be handled on next invocation.`,
        );
        break;
      }
    }

    batchNumber++;
    const result: QueryAllUsersResult = await queryAllUsers(
      batchSize,
      lastEvaluatedKey,
    );

    if (result.users.length > 0) {
      const processedInBatch = await processMonthlyBatch(
        result.users,
        batchNumber,
        getRemainingTimeInMillis,
      );
      totalProcessedUsers += processedInBatch;
    }

    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  return totalProcessedUsers;
};
