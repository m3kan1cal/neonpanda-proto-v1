import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryMemoriesPaginated } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { parsePaginationParams } from "../libs/pagination";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters for filtering
  const queryParams = event.queryStringParameters || {};
  const { coachId, memoryType, importance } = queryParams;

  // Build filtering options
  const options: any = {};

  if (memoryType) {
    const validMemoryTypes = [
      "preference",
      "goal",
      "constraint",
      "instruction",
      "context",
    ];
    if (!validMemoryTypes.includes(memoryType)) {
      return createErrorResponse(
        400,
        `memoryType must be one of: ${validMemoryTypes.join(", ")}`,
      );
    }
    options.memoryType = memoryType;
  }

  if (importance) {
    const validImportance = ["high", "medium", "low"];
    if (!validImportance.includes(importance)) {
      return createErrorResponse(
        400,
        `importance must be one of: ${validImportance.join(", ")}`,
      );
    }
    options.importance = importance;
  }

  // Parse and validate limit/offset using the shared helper so all paginated
  // list endpoints reject invalid input with the same 400 shape.
  const paginationResult = parsePaginationParams(queryParams);
  if (!paginationResult.ok) {
    return paginationResult.response;
  }
  Object.assign(options, paginationResult.params);

  logger.info("Querying memories for user:", {
    userId,
    coachId,
    filters: options,
  });

  const { items: memories, totalCount } = await queryMemoriesPaginated(
    userId,
    coachId,
    options,
  );

  // Transform the response to include summary information
  const memorySummaries = memories.map((memory) => ({
    memoryId: memory.memoryId,
    userId: memory.userId,
    coachId: memory.coachId,
    content: memory.content,
    memoryType: memory.memoryType,
    metadata: {
      createdAt: memory.metadata.createdAt,
      lastUsed: memory.metadata.lastUsed,
      usageCount: memory.metadata.usageCount,
      source: memory.metadata.source,
      importance: memory.metadata.importance,
      tags: memory.metadata.tags,
    },
  }));

  return createOkResponse({
    memories: memorySummaries,
    // Dual-emit during the Load more transition: `count` keeps legacy
    // semantics (page length) and `totalCount` is the authoritative
    // post-filter, pre-slice row count used by Manage Memories.
    count: memorySummaries.length,
    totalCount,
  });
};

export const handler = withAuth(baseHandler);
