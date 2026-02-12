import {
  loadFromDynamoDB,
  saveToDynamoDB,
  queryFromDynamoDB,
  createDynamoDBItem,
} from "./core";
import { logger } from "../functions/libs/logger";
import {
  WeeklyAnalytics,
  MonthlyAnalytics,
} from "../functions/libs/analytics/types";

// ===========================
// WEEKLY ANALYTICS OPERATIONS
// ===========================

/**
 * Save weekly analytics data to DynamoDB
 */
export async function saveWeeklyAnalytics(
  weeklyAnalytics: WeeklyAnalytics,
): Promise<void> {
  const item = createDynamoDBItem<WeeklyAnalytics>(
    "analytics",
    `user#${weeklyAnalytics.userId}`,
    `weeklyAnalytics#${weeklyAnalytics.weekId}`,
    weeklyAnalytics,
    new Date().toISOString(),
  );

  await saveToDynamoDB(item);
  logger.info("Weekly analytics saved successfully:", {
    userId: weeklyAnalytics.userId,
    weekId: weeklyAnalytics.weekId,
    weekRange: `${weeklyAnalytics.weekStart} to ${weeklyAnalytics.weekEnd}`,
    workoutCount: weeklyAnalytics.metadata.workoutCount,
    s3Location: weeklyAnalytics.s3Location,
    analysisConfidence: weeklyAnalytics.metadata.analysisConfidence,
  });
}

/**
 * Query all weekly analytics for a user
 */
export async function queryWeeklyAnalytics(
  userId: string,
  options?: {
    // Date filtering
    fromDate?: Date;
    toDate?: Date;

    // Pagination
    limit?: number;
    offset?: number;

    // Sorting
    sortBy?: "weekStart" | "weekEnd" | "workoutCount";
    sortOrder?: "asc" | "desc";
  },
): Promise<WeeklyAnalytics[]> {
  try {
    // Get all weekly analytics for the user
    const allAnalyticsItems = await queryFromDynamoDB<WeeklyAnalytics>(
      `user#${userId}`,
      "weeklyAnalytics#",
      "analytics",
    );

    // Extract attributes and include timestamps
    let allAnalytics = allAnalyticsItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Apply filters
    let filteredAnalytics = allAnalytics;

    // Date filtering
    if (options?.fromDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const weekStart = new Date(analytics.weekStart);
        return weekStart >= options.fromDate!;
      });
    }

    if (options?.toDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const weekEnd = new Date(analytics.weekEnd);
        return weekEnd <= options.toDate!;
      });
    }

    // Sorting
    const sortBy = options?.sortBy || "weekStart";
    const sortOrder = options?.sortOrder || "desc";

    filteredAnalytics.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "weekStart":
          aValue = new Date(a.weekStart);
          bValue = new Date(b.weekStart);
          break;
        case "weekEnd":
          aValue = new Date(a.weekEnd);
          bValue = new Date(b.weekEnd);
          break;
        case "workoutCount":
          aValue = a.metadata.workoutCount;
          bValue = b.metadata.workoutCount;
          break;
        default:
          aValue = new Date(a.weekStart);
          bValue = new Date(b.weekStart);
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredAnalytics = filteredAnalytics.slice(offset, offset + limit);
    }

    logger.info(
      `Found ${filteredAnalytics.length} weekly analytics records for user ${userId}`,
    );
    return filteredAnalytics;
  } catch (error) {
    logger.error("Error querying weekly analytics:", error);
    throw error;
  }
}

/**
 * Get a specific weekly analytics record
 */
export async function getWeeklyAnalytics(
  userId: string,
  weekId: string,
): Promise<WeeklyAnalytics | null> {
  const item = await loadFromDynamoDB<WeeklyAnalytics>(
    `user#${userId}`,
    `weeklyAnalytics#${weekId}`,
    "analytics",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

// ===========================
// MONTHLY ANALYTICS OPERATIONS
// ===========================

/**
 * Save monthly analytics to DynamoDB
 */
export async function saveMonthlyAnalytics(
  monthlyAnalytics: MonthlyAnalytics,
): Promise<void> {
  const item = createDynamoDBItem<MonthlyAnalytics>(
    "analytics",
    `user#${monthlyAnalytics.userId}`,
    `monthlyAnalytics#${monthlyAnalytics.monthId}`,
    monthlyAnalytics,
    new Date().toISOString(),
  );

  await saveToDynamoDB(item);
  logger.info("Monthly analytics saved successfully:", {
    userId: monthlyAnalytics.userId,
    monthId: monthlyAnalytics.monthId,
    monthRange: `${monthlyAnalytics.monthStart} to ${monthlyAnalytics.monthEnd}`,
    workoutCount: monthlyAnalytics.metadata.workoutCount,
    s3Location: monthlyAnalytics.s3Location,
    analysisConfidence: monthlyAnalytics.metadata.analysisConfidence,
  });
}

/**
 * Query all monthly analytics for a user
 */
export async function queryMonthlyAnalytics(
  userId: string,
  options?: {
    // Date filtering
    fromDate?: Date;
    toDate?: Date;

    // Pagination
    limit?: number;
    offset?: number;

    // Sorting
    sortBy?: "monthStart" | "monthEnd" | "workoutCount";
    sortOrder?: "asc" | "desc";
  },
): Promise<MonthlyAnalytics[]> {
  try {
    // Get all monthly analytics for the user
    const allAnalyticsItems = await queryFromDynamoDB<MonthlyAnalytics>(
      `user#${userId}`,
      "monthlyAnalytics#",
      "analytics",
    );

    // Extract attributes and include timestamps
    let allAnalytics = allAnalyticsItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Apply filters
    let filteredAnalytics = allAnalytics;

    // Date filtering
    if (options?.fromDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const monthStart = new Date(analytics.monthStart);
        return monthStart >= options.fromDate!;
      });
    }

    if (options?.toDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const monthEnd = new Date(analytics.monthEnd);
        return monthEnd <= options.toDate!;
      });
    }

    // Sorting
    const sortBy = options?.sortBy || "monthStart";
    const sortOrder = options?.sortOrder || "desc";

    filteredAnalytics.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "monthStart":
          aValue = new Date(a.monthStart);
          bValue = new Date(b.monthStart);
          break;
        case "monthEnd":
          aValue = new Date(a.monthEnd);
          bValue = new Date(b.monthEnd);
          break;
        case "workoutCount":
          aValue = a.metadata.workoutCount;
          bValue = b.metadata.workoutCount;
          break;
        default:
          aValue = new Date(a.monthStart);
          bValue = new Date(b.monthStart);
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredAnalytics = filteredAnalytics.slice(offset, offset + limit);
    }

    logger.info(
      `Found ${filteredAnalytics.length} monthly analytics records for user ${userId}`,
    );
    return filteredAnalytics;
  } catch (error) {
    logger.error("Error querying monthly analytics:", error);
    throw error;
  }
}

/**
 * Get a specific monthly analytics record
 */
export async function getMonthlyAnalytics(
  userId: string,
  monthId: string,
): Promise<MonthlyAnalytics | null> {
  const item = await loadFromDynamoDB<MonthlyAnalytics>(
    `user#${userId}`,
    `monthlyAnalytics#${monthId}`,
    "analytics",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}
