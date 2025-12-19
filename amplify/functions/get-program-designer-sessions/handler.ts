import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryProgramDesignerSessions } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters for filtering and sorting
  const queryParams = event.queryStringParameters || {};

  const options = {
    // Filtering options
    isComplete: queryParams.isComplete
      ? queryParams.isComplete === "true"
      : undefined,
    fromDate: queryParams.fromDate ? new Date(queryParams.fromDate) : undefined,
    toDate: queryParams.toDate ? new Date(queryParams.toDate) : undefined,

    // Pagination options
    limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
    offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,

    // Sorting options
    sortBy: queryParams.sortBy as
      | "startedAt"
      | "lastActivity"
      | "sessionId"
      | undefined,
    sortOrder: queryParams.sortOrder as "asc" | "desc" | undefined,
  };

  // Validate date parameters
  if (options.fromDate && isNaN(options.fromDate.getTime())) {
    return createErrorResponse(
      400,
      "Invalid fromDate parameter. Use ISO 8601 format.",
    );
  }
  if (options.toDate && isNaN(options.toDate.getTime())) {
    return createErrorResponse(
      400,
      "Invalid toDate parameter. Use ISO 8601 format.",
    );
  }

  // Validate pagination parameters
  if (options.limit && (options.limit < 1 || options.limit > 100)) {
    return createErrorResponse(400, "Limit must be between 1 and 100.");
  }
  if (options.offset && options.offset < 0) {
    return createErrorResponse(400, "Offset must be non-negative.");
  }

  // Get program designer sessions for the user
  const sessions = await queryProgramDesignerSessions(userId, options);

  return createOkResponse({
    userId,
    sessions: sessions,
    count: sessions.length,
  });
};

export const handler = withAuth(baseHandler);
