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

export interface QueryWeeklyAnalyticsOptions {
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: "weekStart" | "weekEnd" | "workoutCount";
  sortOrder?: "asc" | "desc";
}

export interface QueryWeeklyAnalyticsPaginatedResult {
  items: WeeklyAnalytics[];
  /** Total weekly analytics matching the filter, BEFORE slicing. */
  totalCount: number;
}

/**
 * Shared filter + sort helper for weekly analytics. Applies date range
 * filtering, then sorts by the requested key with a secondary sort on
 * weekId so offset-based pagination is deterministic across requests
 * (two weeks can share a sort key value, e.g. identical workoutCount).
 */
function filterAndSortWeeklyAnalytics(
  allAnalytics: WeeklyAnalytics[],
  options?: QueryWeeklyAnalyticsOptions,
): WeeklyAnalytics[] {
  let filtered = allAnalytics;

  if (options?.fromDate) {
    filtered = filtered.filter(
      (a) => new Date(a.weekStart) >= options.fromDate!,
    );
  }
  if (options?.toDate) {
    filtered = filtered.filter((a) => new Date(a.weekEnd) <= options.toDate!);
  }

  const sortBy = options?.sortBy || "weekStart";
  const sortOrder = options?.sortOrder || "desc";

  const getKey = (r: WeeklyAnalytics): any => {
    switch (sortBy) {
      case "weekEnd":
        return new Date(r.weekEnd).getTime();
      case "workoutCount":
        return r.metadata.workoutCount;
      case "weekStart":
      default:
        return new Date(r.weekStart).getTime();
    }
  };

  filtered.sort((a, b) => {
    const aValue = getKey(a);
    const bValue = getKey(b);
    const primary = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    if (primary !== 0) return sortOrder === "asc" ? primary : -primary;
    // Stable tiebreaker on weekId so identical primary keys produce a
    // deterministic order across requests and paginated slices.
    return (a.weekId || "").localeCompare(b.weekId || "");
  });

  return filtered;
}

/**
 * Query weekly analytics with pagination. Returns both the requested
 * slice and the pre-slice `totalCount` so the Load more UI can compute
 * hasMore without a second request.
 */
export async function queryWeeklyAnalyticsPaginated(
  userId: string,
  options?: QueryWeeklyAnalyticsOptions,
): Promise<QueryWeeklyAnalyticsPaginatedResult> {
  try {
    const allAnalyticsItems = await queryFromDynamoDB<WeeklyAnalytics>(
      `user#${userId}`,
      "weeklyAnalytics#",
      "analytics",
    );

    const allAnalytics = allAnalyticsItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    const filtered = filterAndSortWeeklyAnalytics(allAnalytics, options);
    const totalCount = filtered.length;

    let items = filtered;
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const offset = options?.offset || 0;
      const limit = options?.limit ?? totalCount;
      items = filtered.slice(offset, offset + limit);
    }

    logger.info(
      `Found ${items.length}/${totalCount} weekly analytics records for user ${userId}`,
    );
    return { items, totalCount };
  } catch (error) {
    logger.error("Error querying weekly analytics:", error);
    throw error;
  }
}

/**
 * Query all weekly analytics for a user.
 * Preserved for existing callers; delegates to the paginated helper and
 * returns only the items for backward compatibility.
 */
export async function queryWeeklyAnalytics(
  userId: string,
  options?: QueryWeeklyAnalyticsOptions,
): Promise<WeeklyAnalytics[]> {
  const { items } = await queryWeeklyAnalyticsPaginated(userId, options);
  return items;
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

export interface QueryMonthlyAnalyticsOptions {
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: "monthStart" | "monthEnd" | "workoutCount";
  sortOrder?: "asc" | "desc";
}

export interface QueryMonthlyAnalyticsPaginatedResult {
  items: MonthlyAnalytics[];
  /** Total monthly analytics matching the filter, BEFORE slicing. */
  totalCount: number;
}

/**
 * Shared filter + sort helper for monthly analytics. Includes a secondary
 * sort on monthId so offset-based pagination is deterministic across
 * requests when two months share a primary sort key value.
 */
function filterAndSortMonthlyAnalytics(
  allAnalytics: MonthlyAnalytics[],
  options?: QueryMonthlyAnalyticsOptions,
): MonthlyAnalytics[] {
  let filtered = allAnalytics;

  if (options?.fromDate) {
    filtered = filtered.filter(
      (a) => new Date(a.monthStart) >= options.fromDate!,
    );
  }
  if (options?.toDate) {
    filtered = filtered.filter((a) => new Date(a.monthEnd) <= options.toDate!);
  }

  const sortBy = options?.sortBy || "monthStart";
  const sortOrder = options?.sortOrder || "desc";

  const getKey = (r: MonthlyAnalytics): any => {
    switch (sortBy) {
      case "monthEnd":
        return new Date(r.monthEnd).getTime();
      case "workoutCount":
        return r.metadata.workoutCount;
      case "monthStart":
      default:
        return new Date(r.monthStart).getTime();
    }
  };

  filtered.sort((a, b) => {
    const aValue = getKey(a);
    const bValue = getKey(b);
    const primary = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    if (primary !== 0) return sortOrder === "asc" ? primary : -primary;
    return (a.monthId || "").localeCompare(b.monthId || "");
  });

  return filtered;
}

/**
 * Query monthly analytics with pagination. Returns both the requested
 * slice and the pre-slice `totalCount` for Load more UIs.
 */
export async function queryMonthlyAnalyticsPaginated(
  userId: string,
  options?: QueryMonthlyAnalyticsOptions,
): Promise<QueryMonthlyAnalyticsPaginatedResult> {
  try {
    const allAnalyticsItems = await queryFromDynamoDB<MonthlyAnalytics>(
      `user#${userId}`,
      "monthlyAnalytics#",
      "analytics",
    );

    const allAnalytics = allAnalyticsItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    const filtered = filterAndSortMonthlyAnalytics(allAnalytics, options);
    const totalCount = filtered.length;

    let items = filtered;
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const offset = options?.offset || 0;
      const limit = options?.limit ?? totalCount;
      items = filtered.slice(offset, offset + limit);
    }

    logger.info(
      `Found ${items.length}/${totalCount} monthly analytics records for user ${userId}`,
    );
    return { items, totalCount };
  } catch (error) {
    logger.error("Error querying monthly analytics:", error);
    throw error;
  }
}

/**
 * Query all monthly analytics for a user.
 * Preserved for existing callers; delegates to the paginated helper and
 * returns only the items for backward compatibility.
 */
export async function queryMonthlyAnalytics(
  userId: string,
  options?: QueryMonthlyAnalyticsOptions,
): Promise<MonthlyAnalytics[]> {
  const { items } = await queryMonthlyAnalyticsPaginated(userId, options);
  return items;
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
