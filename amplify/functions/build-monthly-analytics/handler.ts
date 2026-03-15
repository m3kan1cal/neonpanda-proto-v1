import {
  createOkResponse,
  createErrorResponse,
  LambdaContext,
} from "../libs/api-helpers";
import {
  processAllUsersInBatchesMonthly,
  MonthlyAnalyticsEvent,
} from "../libs/analytics";
import { withHeartbeat } from "../libs/heartbeat";
import { logger } from "../libs/logger";

/**
 * Monthly Analytics Lambda Handler
 * Triggered by EventBridge cron on the 1st of each month at 9:00 AM UTC
 */
export const handler = async (
  event: MonthlyAnalyticsEvent,
  context: LambdaContext,
) => {
  return withHeartbeat("Monthly Analytics Processing", async () => {
    try {
      logger.info("📊 Starting monthly analytics processing:", {
        source: event.source,
        timestamp: new Date().toISOString(),
        triggerEvent: event,
      });

      // Process all users in batches, passing context for remaining-time checks
      const totalProcessedUsers = await processAllUsersInBatchesMonthly(
        50,
        context.getRemainingTimeInMillis.bind(context),
      );

      logger.info("✅ Monthly analytics processing completed successfully:", {
        totalProcessedUsers,
        completedAt: new Date().toISOString(),
      });

      return createOkResponse({
        message: "Monthly analytics processing completed successfully",
        totalProcessedUsers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("❌ Monthly analytics processing failed:", error);

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
