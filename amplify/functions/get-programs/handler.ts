import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryProgramsPaginated } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { parsePaginationParams } from "../libs/pagination";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const coachId = event.pathParameters?.coachId;

    // Query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const { status, includeArchived, includeStatus } = queryParams;

    // Parse and validate limit/offset via the shared helper so every
    // paginated list endpoint rejects invalid input with the same 400 shape.
    const paginationResult = parsePaginationParams(queryParams);
    if (!paginationResult.ok) {
      return paginationResult.response;
    }
    const { limit, offset } = paginationResult.params;

    logger.info("📋 Querying programs:", {
      userId,
      coachId: coachId || "all",
      status: status || "all",
      includeStatus: includeStatus || "all",
      includeArchived: includeArchived || "false",
      limit: limit ?? "unlimited",
      offset: offset ?? 0,
      method: "queryProgramsPaginated (GSI-based)",
    });

    // Parse includeStatus comma-separated string into array
    const includeStatuses = includeStatus
      ? includeStatus.split(",").map((s) => s.trim())
      : undefined;

    const { items: programs, totalCount } = await queryProgramsPaginated(
      userId,
      {
        status: status as any,
        limit,
        offset,
        sortOrder: "desc", // Most recent first
        includeArchived: includeArchived === "true",
        includeStatus: includeStatuses,
        // Push the coachId filter into the helper so totalCount reflects
        // the coach-scoped set (when provided). This matters for Manage
        // Programs per-status pagination where hasMore is driven by
        // totalCount.
        coachId,
      },
    );

    logger.info("✅ Programs queried successfully:", {
      totalCount,
      returned: programs.length,
      programIds: programs.map((p) => p.programId),
    });

    return createOkResponse({
      programs,
      // Dual-emit during the Load more transition.
      count: programs.length,
      totalCount,
    });
  } catch (error) {
    logger.error("❌ Error getting training programs:", error);
    return createErrorResponse(500, "Failed to get training programs", error);
  }
};

export const handler = withAuth(baseHandler);
