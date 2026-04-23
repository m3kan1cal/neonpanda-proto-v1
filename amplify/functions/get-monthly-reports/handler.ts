import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryMonthlyAnalyticsPaginated } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { parsePaginationParams } from "../libs/pagination";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;

  const queryParams = event.queryStringParameters || {};
  const { fromDate, toDate, sortBy, sortOrder } = queryParams;

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

  if (sortBy && !["monthStart", "monthEnd", "workoutCount"].includes(sortBy)) {
    return createErrorResponse(
      400,
      "Invalid sortBy. Must be monthStart, monthEnd, or workoutCount.",
    );
  }
  if (sortBy) options.sortBy = sortBy;

  if (sortOrder && !["asc", "desc"].includes(sortOrder)) {
    return createErrorResponse(400, "Invalid sortOrder. Must be asc or desc.");
  }
  if (sortOrder) options.sortOrder = sortOrder;

  logger.info("Querying monthly reports:", {
    userId,
    options,
  });

  const { items: analytics, totalCount } = await queryMonthlyAnalyticsPaginated(
    userId,
    options,
  );

  const analyticsResponse = analytics.map((analyticsRecord) => ({
    ...analyticsRecord,
  }));

  return createOkResponse({
    reports: analyticsResponse,
    count: analyticsResponse.length,
    totalCount,
    userId,
    filters: options,
  });
};

export const handler = withAuth(baseHandler);
