import {
  createOkResponse,
  createErrorResponse,
  LambdaContext,
} from "../libs/api-helpers";
import {
  processAllUsersInBatches,
  WeeklyAnalyticsEvent,
} from "../libs/analytics";
import { withHeartbeat } from "../libs/heartbeat";
import { logger } from "../libs/logger";

/**
 * Weekly Analytics Lambda Handler
 * Triggered by EventBridge cron every Sunday at 9:00 AM UTC
 */
export const handler = async (
  event: WeeklyAnalyticsEvent,
  context: LambdaContext,
) => {
  return withHeartbeat("Weekly Analytics Processing", async () => {
    try {
      logger.info("📊 Starting weekly analytics processing:", {
        source: event.source,
        timestamp: new Date().toISOString(),
        triggerEvent: event,
      });

      // Process all users in batches, passing context for remaining-time checks
      const totalProcessedUsers = await processAllUsersInBatches(
        50,
        context.getRemainingTimeInMillis.bind(context),
      );

      logger.info("✅ Weekly analytics processing completed successfully:", {
        totalProcessedUsers,
        completedAt: new Date().toISOString(),
      });

      return createOkResponse({
        message: "Weekly analytics processing completed successfully",
        totalProcessedUsers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("❌ Weekly analytics processing failed:", error);

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
