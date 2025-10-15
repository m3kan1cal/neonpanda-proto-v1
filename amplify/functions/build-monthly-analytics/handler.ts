import {
  createOkResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import {
  processAllUsersInBatchesMonthly,
  MonthlyAnalyticsEvent,
} from "../libs/analytics";

/**
 * Monthly Analytics Lambda Handler
 * Triggered by EventBridge cron on the 1st of each month at 9:00 AM UTC
 */
export const handler = async (event: MonthlyAnalyticsEvent) => {
  try {
    console.info("📊 Starting monthly analytics processing:", {
      source: event.source,
      timestamp: new Date().toISOString(),
      triggerEvent: event,
    });

    const totalProcessedUsers = await processAllUsersInBatchesMonthly(50);

    console.info("✅ Monthly analytics processing completed successfully:", {
      totalProcessedUsers,
      completedAt: new Date().toISOString(),
    });

    return createOkResponse({
      message: "Monthly analytics processing completed successfully",
      totalProcessedUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Monthly analytics processing failed:", error);

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
