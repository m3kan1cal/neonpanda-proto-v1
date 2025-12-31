/**
 * Weekly Analytics Agent Helpers
 *
 * Helper functions for the weekly analytics agent.
 */

import { storeDebugDataInS3 } from "../../api-helpers";

/**
 * Enforce blocking decisions from validation
 *
 * Code-level enforcement that prevents generate_weekly_analytics and
 * save_analytics_to_database from executing when validation returned
 * shouldGenerate: false. This ensures blocking decisions are AUTHORITATIVE,
 * not advisory.
 *
 * Returns error result if tool should be blocked, null if should proceed.
 */
export const enforceValidationBlocking = (
  toolId: string,
  validationResult: any,
): {
  error: boolean;
  blocked: boolean;
  reason: string;
  blockingFlags?: string[];
} | null => {
  // No validation result yet, allow tool to proceed
  if (!validationResult) {
    return null;
  }

  // Validation passed, allow tool to proceed
  if (validationResult.shouldGenerate !== false) {
    return null;
  }

  // Block generate_weekly_analytics if validation said don't generate
  if (toolId === "generate_weekly_analytics") {
    console.error(
      "⛔ BLOCKING generate_weekly_analytics: Validation returned shouldGenerate=false",
      {
        blockingFlags: validationResult.blockingFlags,
        reason: validationResult.reason,
        toolAttempted: toolId,
      },
    );

    return {
      error: true,
      blocked: true,
      reason: `Cannot generate analytics - validation blocked: ${validationResult.reason}`,
      blockingFlags: validationResult.blockingFlags,
    };
  }

  // Block save_analytics_to_database if validation said don't generate
  if (toolId === "save_analytics_to_database") {
    console.error(
      "⛔ BLOCKING save_analytics_to_database: Validation returned shouldGenerate=false",
      {
        blockingFlags: validationResult.blockingFlags,
        reason: validationResult.reason,
        toolAttempted: toolId,
      },
    );

    return {
      error: true,
      blocked: true,
      reason: `Cannot save analytics - validation blocked generation: ${validationResult.reason}`,
      blockingFlags: validationResult.blockingFlags,
    };
  }

  // Tool is not subject to blocking enforcement
  return null;
};

/**
 * Store analytics debug data in S3
 *
 * Centralized helper for storing analytics generation debug information.
 * Handles success, error, and partial completion scenarios.
 */
export const storeAnalyticsDebugData = async (
  type: "success" | "error" | "skipped",
  data: {
    userId: string;
    weekId: string;
    s3Location?: string;
    dynamoDbSaved?: boolean;
    workoutCount?: number;
    normalizationApplied?: boolean;
    errorMessage?: string;
    skipReason?: string;
    [key: string]: any;
  },
) => {
  try {
    const debugData = {
      timestamp: new Date().toISOString(),
      type,
      ...data,
    };

    const metadata = {
      type: `weekly-analytics-${type}`,
      userId: data.userId,
      weekId: data.weekId,
      ...(data.errorMessage && { errorMessage: data.errorMessage }),
      ...(data.skipReason && { skipReason: data.skipReason }),
    };

    await storeDebugDataInS3(
      JSON.stringify(debugData, null, 2),
      metadata,
      "weekly-analytics-debug",
    );

    console.info(`✅ Stored ${type} debug data in S3`);
  } catch (err) {
    console.warn(`⚠️ Failed to store ${type} data in S3 (non-critical):`, err);
  }
};

/**
 * Generate week ID from date (ISO-8601 format: YYYY-WW)
 *
 * Uses ISO-8601 week numbering (Monday-based weeks)
 * Week 1 is the first week containing a Thursday (or equivalently, Jan 4)
 */
export const generateWeekId = (weekStart: Date): string => {
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
 * Calculate analytics metrics from generated data
 * Used for metadata and result building
 */
export function calculateAnalyticsMetrics(analyticsData: any): {
  analysisConfidence: string;
  dataCompleteness: number;
  hasDualOutput: boolean;
  humanSummaryLength: number;
} {
  const structuredAnalytics = analyticsData.structured_analytics || analyticsData.structuredAnalytics;
  const humanSummary = analyticsData.human_summary || analyticsData.humanSummary || "";

  return {
    analysisConfidence: structuredAnalytics?.metadata?.analysis_confidence || "medium",
    dataCompleteness: structuredAnalytics?.metadata?.data_completeness || 0.8,
    hasDualOutput: !!(structuredAnalytics && humanSummary),
    humanSummaryLength: humanSummary.length,
  };
}
