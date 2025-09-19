import {
  createOkResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import {
  processAllUsersInBatches,
  WeeklyAnalyticsEvent,
} from "../libs/analytics";

/**
 * Weekly Analytics Lambda Handler
 * Triggered by EventBridge cron every Sunday at 6:00 AM UTC
 */
export const handler = async (event: WeeklyAnalyticsEvent) => {
  try {
    console.info("📊 Starting weekly analytics processing:", {
      source: event.source,
      timestamp: new Date().toISOString(),
      triggerEvent: event,
    });

    const totalProcessedUsers = await processAllUsersInBatches(50);

    console.info("✅ Weekly analytics processing completed successfully:", {
      totalProcessedUsers,
      completedAt: new Date().toISOString(),
    });

    return createOkResponse({
      message: "Weekly analytics processing completed successfully",
      totalProcessedUsers,
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
      }
    );
  }
};
