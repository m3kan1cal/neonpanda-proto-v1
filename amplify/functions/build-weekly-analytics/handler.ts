/**
 * Build Weekly Analytics Lambda Handler
 *
 * Uses WeeklyAnalytics agent to generate, validate, and save weekly analytics.
 * Triggered by EventBridge cron every Sunday at 9:00 AM UTC.
 *
 * Processes all active users in batches, generating analytics for users
 * with >= 2 workouts per week (Phase 1 requirement).
 */

import {
  createOkResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import { WeeklyAnalyticsAgent } from "../libs/agents/weekly-analytics/agent";
import type { WeeklyAnalyticsContext } from "../libs/agents/weekly-analytics/types";
import { generateWeekId } from "../libs/agents/weekly-analytics/helpers";
import { getCurrentWeekRange, getUserTimezoneOrDefault } from "../libs/analytics/date-utils";
import { queryAllUsers, QueryAllUsersResult } from "../../dynamodb/operations";
import type { UserProfile } from "../libs/user/types";

/**
 * Event type for weekly analytics trigger from EventBridge
 */
interface WeeklyAnalyticsEvent {
  source: string;
  detail: any;
}

/**
 * Process a batch of users using the WeeklyAnalytics agent
 */
async function processUserBatch(
  users: UserProfile[],
  batchNumber: number,
  weekRange: { weekStart: Date; weekEnd: Date },
  weekId: string,
): Promise<{ processed: number; skipped: number; failed: number }> {
  console.info(`📊 Processing batch ${batchNumber} with ${users.length} users`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    try {
      console.info(`🔍 Processing user: ${user.userId} (${user.email})`);

      // Get user timezone
      const userTimezone = getUserTimezoneOrDefault(user.preferences?.timezone);

      // Build agent context
      const context: WeeklyAnalyticsContext = {
        userId: user.userId,
        userProfile: user,
        weekId,
        weekStart: weekRange.weekStart,
        weekEnd: weekRange.weekEnd,
        userTimezone,
      };

      // Create WeeklyAnalytics agent
      const agent = new WeeklyAnalyticsAgent(context);

      // Let agent handle the entire workflow
      console.info("🤖 Starting agent workflow...");
      const result = await agent.generateAnalytics();

      if (result.success) {
        console.info(`✅ Analytics generated for user ${user.userId}:`, {
          weekId: result.weekId,
          s3Location: result.s3Location,
          workoutCount: result.metadata?.workoutCount,
          hasAthleteProfile: result.metadata?.hasAthleteProfile,
          analysisConfidence: result.metadata?.analysisConfidence,
        });
        processed++;
      } else if (result.skipped) {
        console.info(`⏭️ Skipping user ${user.userId}: ${result.reason}`);
        skipped++;
      } else {
        console.warn(`⚠️ Analytics generation failed for user ${user.userId}:`, {
          reason: result.reason,
          blockingFlags: result.blockingFlags,
        });
        failed++;
      }
    } catch (userError) {
      console.error(`❌ Failed to process user ${user.userId}:`, userError);
      failed++;
      // Continue processing other users even if one fails
    }
  }

  console.info(`📋 Batch ${batchNumber} completed:`, {
    processed,
    skipped,
    failed,
    total: users.length,
  });

  return { processed, skipped, failed };
}

/**
 * Process all active users in batches for weekly analytics
 */
async function processAllUsersWithAgent(
  batchSize: number = 50,
): Promise<{ totalProcessed: number; totalSkipped: number; totalFailed: number }> {
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let lastEvaluatedKey: any = undefined;
  let batchNumber = 0;

  // Get current week range
  const weekRange = getCurrentWeekRange();
  const weekId = generateWeekId(weekRange.weekStart);

  console.info("📅 Processing analytics for week:", {
    weekId,
    weekStart: weekRange.weekStart.toISOString().split("T")[0],
    weekEnd: weekRange.weekEnd.toISOString().split("T")[0],
  });

  do {
    batchNumber++;
    const result: QueryAllUsersResult = await queryAllUsers(
      batchSize,
      lastEvaluatedKey,
    );

    if (result.users.length > 0) {
      const batchResult = await processUserBatch(
        result.users,
        batchNumber,
        weekRange,
        weekId,
      );
      totalProcessed += batchResult.processed;
      totalSkipped += batchResult.skipped;
      totalFailed += batchResult.failed;
    }

    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  return { totalProcessed, totalSkipped, totalFailed };
}

/**
 * Weekly Analytics Lambda Handler
 * Triggered by EventBridge cron every Sunday at 9:00 AM UTC
 */
export const handler = async (event: WeeklyAnalyticsEvent) => {
  return withHeartbeat("Weekly Analytics Agent Processing", async () => {
    try {
      console.info("📊 Starting weekly analytics processing (Agent V2):", {
        source: event.source,
        timestamp: new Date().toISOString(),
        triggerEvent: event,
      });

      // Process all users in batches using the agent
      const result = await processAllUsersWithAgent(50);

      console.info("✅ Weekly analytics processing completed successfully:", {
        totalProcessed: result.totalProcessed,
        totalSkipped: result.totalSkipped,
        totalFailed: result.totalFailed,
        completedAt: new Date().toISOString(),
      });

      return createOkResponse({
        message: "Weekly analytics processing completed successfully",
        totalProcessed: result.totalProcessed,
        totalSkipped: result.totalSkipped,
        totalFailed: result.totalFailed,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Weekly analytics processing failed:", error);

      return createErrorResponse(
        500,
        error instanceof Error ? error.message : "Unknown error occurred",
        {
          error: error instanceof Error ? error.stack : String(error),
          timestamp: new Date().toISOString(),
        },
      );
    }
  }); // 10 second default heartbeat interval
};
