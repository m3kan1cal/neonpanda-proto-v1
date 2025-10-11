import { UserProfile } from "../user/types";
import { DynamoDBItem } from "../coach-creator/types";
import {
  queryAllUsers,
  QueryAllUsersResult,
  saveWeeklyAnalytics,
} from "../../../dynamodb/operations";
import { fetchUserWeeklyData, generateAnalytics } from "./data-fetching";
import { UserWeeklyData, WeeklyAnalytics } from "./types";
import { storeDebugDataInS3 } from "../api-helpers";

/**
 * Helper function to generate week ID from date range
 * Uses Sunday-based week counting (matching our analytics week definition)
 * Week 1 starts on the first Sunday of the year
 */
const generateWeekId = (weekStart: Date): string => {
  const year = weekStart.getFullYear();
  const startOfYear = new Date(year, 0, 1);

  // Find the first Sunday of the year
  const firstSunday = new Date(startOfYear);
  const dayOfWeek = startOfYear.getDay(); // 0 = Sunday
  if (dayOfWeek !== 0) {
    // Move to the first Sunday
    firstSunday.setDate(startOfYear.getDate() + (7 - dayOfWeek));
  }

  // Calculate weeks since first Sunday
  const daysDiff = Math.floor((weekStart.getTime() - firstSunday.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.floor(daysDiff / 7) + 1;

  // Handle edge case: dates before first Sunday are week 0 (or previous year's last week)
  if (weekStart < firstSunday) {
    // This date belongs to the previous year's week numbering
    const prevYear = year - 1;
    const prevYearEnd = new Date(prevYear, 11, 31);
    return generateWeekId(prevYearEnd); // Recursively get previous year's last week
  }

  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

/**
 * Process users in batches for weekly analytics generation
 */
export const processBatch = async (
  users: DynamoDBItem<UserProfile>[],
  batchNumber: number
): Promise<number> => {
  console.info(`📊 Processing batch ${batchNumber} with ${users.length} users`);

  let processedCount = 0;

  for (const user of users) {
    try {
      console.info(
        `🔍 Processing user: ${user.attributes.userId} (${user.attributes.email})`
      );

      // Fetch all weekly data for this user
      const weeklyData: UserWeeklyData = await fetchUserWeeklyData(user);

      // Check if user has >= 2 workouts this week (Phase 1 requirement)
      if (weeklyData.workouts.count < 2) {
        console.info(
          `⏭️  Skipping user ${user.attributes.userId}: only ${weeklyData.workouts.count} workouts this week (minimum 2 required)`
        );
        continue;
      }

      // Generate analytics for this user using LLM
      try {
        const analytics = await generateAnalytics(weeklyData, user.attributes);

        // Store analytics in S3
        try {
          const s3Location = await storeDebugDataInS3(
            JSON.stringify(analytics, null, 2),
            {
              userId: user.attributes.userId,
              type: "weekly-analytics",
              weekStart: weeklyData.weekRange.weekStart.toISOString(),
              weekEnd: weeklyData.weekRange.weekEnd.toISOString(),
              workoutCount: weeklyData.workouts.count,
              conversationCount: weeklyData.coaching.conversations.length,
              memoryCount: weeklyData.userContext.memoryCount,
              historicalSummaryCount: weeklyData.historical.summaryCount,
              analyticsLength: JSON.stringify(analytics).length,
              hasAthleteProfile: !!user.attributes.athleteProfile?.summary,
              hasDualOutput: !!(analytics.structured_analytics && analytics.human_summary),
              humanSummaryLength: analytics.human_summary?.length || 0,
            }
          );

          // Create shared log data
          const logData = {
            s3Location,
            workoutCount: weeklyData.workouts.count,
            historicalSummaryCount: weeklyData.historical.summaryCount,
            conversationCount: weeklyData.coaching.conversations.length,
            messageCount: weeklyData.coaching.totalMessages,
            memoryCount: weeklyData.userContext.memoryCount,
            analyticsSize: JSON.stringify(analytics).length,
            humanSummaryLength: analytics.human_summary?.length || 0,
            hasBothOutputs: !!(analytics.structured_analytics && analytics.human_summary),
            weekRange: `${weeklyData.weekRange.weekStart.toISOString().split("T")[0]} to ${weeklyData.weekRange.weekEnd.toISOString().split("T")[0]}`,
          };

          // Store analytics in DynamoDB
          try {
            const weekId = generateWeekId(weeklyData.weekRange.weekStart);
            const weeklyAnalytics: WeeklyAnalytics = {
              userId: user.attributes.userId,
              weekId,
              weekStart: weeklyData.weekRange.weekStart.toISOString().split("T")[0],
              weekEnd: weeklyData.weekRange.weekEnd.toISOString().split("T")[0],
              analyticsData: analytics,
              s3Location,
              metadata: {
                workoutCount: weeklyData.workouts.count,
                conversationCount: weeklyData.coaching.conversations.length,
                memoryCount: weeklyData.userContext.memoryCount,
                historicalSummaryCount: weeklyData.historical.summaryCount,
                analyticsLength: JSON.stringify(analytics).length,
                hasAthleteProfile: !!user.attributes.athleteProfile?.summary,
                hasDualOutput: !!(analytics.structured_analytics && analytics.human_summary),
                humanSummaryLength: analytics.human_summary?.length || 0,
                normalizationApplied: !!analytics.structured_analytics?.metadata?.normalization_applied,
                analysisConfidence: analytics.structured_analytics?.metadata?.analysis_confidence || "medium",
                dataCompleteness: analytics.structured_analytics?.metadata?.data_completeness || 0.8,
              },
            };

            await saveWeeklyAnalytics(weeklyAnalytics);
            console.info(
              `✅ User ${user.attributes.userId} analytics completed and stored:`,
              {
                ...logData,
                dynamodbKey: `user#${user.attributes.userId} / weeklyAnalytics#${weekId}`,
              }
            );
          } catch (dynamoError) {
            console.warn(
              `⚠️ Failed to store analytics in DynamoDB for user ${user.attributes.userId}:`,
              dynamoError
            );

            console.warn(
              `⚠️ User ${user.attributes.userId} analytics completed (S3 only - DynamoDB failed):`,
              logData
            );
          }
        } catch (s3Error) {
          console.warn(
            `⚠️ Failed to store analytics in S3 for user ${user.attributes.userId}:`,
            s3Error
          );
        }
      } catch (analyticsError) {
        console.error(
          `❌ Failed to generate analytics for user ${user.attributes.userId}:`,
          analyticsError
        );
        console.info(`⚠️  Continuing with next user despite analytics failure`);

        // Log data collection success even if analytics failed
        console.info(
          `✅ User ${user.attributes.userId} data collected (analytics failed):`,
          {
            workoutCount: weeklyData.workouts.count,
            historicalSummaryCount: weeklyData.historical.summaryCount,
            conversationCount: weeklyData.coaching.conversations.length,
            messageCount: weeklyData.coaching.totalMessages,
            memoryCount: weeklyData.userContext.memoryCount,
          }
        );
      }

      processedCount++;
    } catch (userError) {
      console.error(
        `❌ Failed to process user ${user.attributes.userId}:`,
        userError
      );
      // Continue processing other users even if one fails
    }
  }

  console.info(
    `📋 Batch ${batchNumber} completed: ${processedCount}/${users.length} users processed`
  );
  return processedCount;
};

/**
 * Process all active users in batches for analytics
 */
export const processAllUsersInBatches = async (
  batchSize: number = 50
): Promise<number> => {
  let totalProcessedUsers = 0;
  let lastEvaluatedKey: any = undefined;
  let batchNumber = 0;

  do {
    batchNumber++;
    const result: QueryAllUsersResult = await queryAllUsers(
      batchSize,
      lastEvaluatedKey
    );

    if (result.users.length > 0) {
      const processedInBatch = await processBatch(result.users, batchNumber);
      totalProcessedUsers += processedInBatch;
    }

    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  return totalProcessedUsers;
};
