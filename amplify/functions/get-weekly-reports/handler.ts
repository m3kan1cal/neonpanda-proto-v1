import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryWeeklyAnalyticsPaginated } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { parsePaginationParams } from "../libs/pagination";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;

  const queryParams = event.queryStringParameters || {};
  const { fromDate, toDate, sortBy, sortOrder } = queryParams;

  // Shared limit/offset parser so every paginated endpoint rejects
  // invalid input with the same 400 shape as get-workouts.
  const paginationResult = parsePaginationParams(queryParams);
  if (!paginationResult.ok) {
    return paginationResult.response;
  }
  const { limit, offset } = paginationResult.params;

  const options: any = {};

  if (fromDate) {
    options.fromDate = new Date(fromDate);
    if (isNaN(options.fromDate.getTime())) {
      return createErrorResponse(
        400,
        "Invalid fromDate format. Use ISO 8601 format.",
      );
    }
  }

  if (toDate) {
    options.toDate = new Date(toDate);
    if (isNaN(options.toDate.getTime())) {
      return createErrorResponse(
        400,
        "Invalid toDate format. Use ISO 8601 format.",
      );
    }
  }

  if (limit !== undefined) options.limit = limit;
  if (offset !== undefined) options.offset = offset;

  if (sortBy && !["weekStart", "weekEnd", "workoutCount"].includes(sortBy)) {
    return createErrorResponse(
      400,
      "Invalid sortBy. Must be weekStart, weekEnd, or workoutCount.",
    );
  }
  if (sortBy) options.sortBy = sortBy;

  if (sortOrder && !["asc", "desc"].includes(sortOrder)) {
    return createErrorResponse(400, "Invalid sortOrder. Must be asc or desc.");
  }
  if (sortOrder) options.sortOrder = sortOrder;

  logger.info("Querying weekly reports:", {
    userId,
    options,
  });

  const { items: analytics, totalCount } = await queryWeeklyAnalyticsPaginated(
    userId,
    options,
  );

  const analyticsResponse = analytics.map((analyticsRecord) => ({
    ...analyticsRecord,
  }));

  return createOkResponse({
    reports: analyticsResponse,
    // Dual-emit during the Load more rollout.
    count: analyticsResponse.length,
    totalCount,
    userId,
    filters: options,
  });
};

export const handler = withAuth(baseHandler);
