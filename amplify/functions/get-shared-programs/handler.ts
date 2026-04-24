import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { querySharedProgramsPaginated } from "../../dynamodb/operations";
import { QuerySharedProgramsResponse } from "../libs/shared-program/types";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { parsePaginationParams } from "../libs/pagination";
import { logger } from "../libs/logger";

/**
 * Get all shared programs created by the authenticated user.
 *
 * Supports `limit` (1..100) and `offset` (>= 0) query params for the
 * Manage Shared Programs Load more UI. When `limit` is omitted we return
 * the full list (backward compat for callers that do not paginate).
 *
 * Response dual-emits `count` (legacy page length) and `totalCount`
 * (pre-slice, post-filter) during the rollout.
 */
const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    const userId = event.user.userId;

    const queryParams = event.queryStringParameters || {};
    const paginationResult = parsePaginationParams(queryParams);
    if (!paginationResult.ok) {
      return paginationResult.response;
    }
    const { limit, offset } = paginationResult.params;

    logger.info("Querying shared programs for user:", {
      userId,
      limit: limit ?? "unlimited",
      offset: offset ?? 0,
    });

    const { items: sharedPrograms, totalCount } =
      await querySharedProgramsPaginated(userId, { limit, offset });

    const response: QuerySharedProgramsResponse = {
      sharedPrograms: sharedPrograms.map((sp) => ({
        ...sp,
        createdAt: sp.createdAt ? new Date(sp.createdAt) : new Date(),
        updatedAt: sp.updatedAt ? new Date(sp.updatedAt) : new Date(),
      })),
      count: sharedPrograms.length,
      totalCount,
    };

    logger.info("Shared programs queried successfully:", {
      userId,
      count: sharedPrograms.length,
      totalCount,
    });

    return createOkResponse(response);
  } catch (error) {
    logger.error("Error querying shared programs:", error);
    return createErrorResponse(500, "Failed to query shared programs", error);
  }
};

export const handler = withAuth(baseHandler);
