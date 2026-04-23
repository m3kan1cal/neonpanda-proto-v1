import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryCoachConversationsPaginated } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { parsePaginationParams } from "../libs/pagination";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

  if (!coachId) {
    return createErrorResponse(400, "coachId is required");
  }

  const queryParams = event.queryStringParameters || {};
  const includeFirstMessages = queryParams.includeFirstMessages === "true";

  // Parse and validate limit / offset using the shared helper so every
  // paginated list endpoint rejects invalid input with the same 400 shape.
  const paginationResult = parsePaginationParams(queryParams);
  if (!paginationResult.ok) {
    return paginationResult.response;
  }
  const { limit, offset } = paginationResult.params;

  // Opt-in mode exclusion. Only Manage Coach Conversations passes this; the
  // default behavior (no `excludeModes` param) continues to return every
  // mode for legacy callers such as CoachConversationAgent and
  // ContextualChatDrawer.
  const excludeModesRaw = queryParams.excludeModes;
  const excludeModes = excludeModesRaw
    ? excludeModesRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : undefined;

  const { items, totalCount } = await queryCoachConversationsPaginated(
    userId,
    coachId,
    {
      includeFirstMessages,
      excludeModes,
      limit,
      offset,
    },
  );

  return createOkResponse({
    conversations: items,
    // Dual-emit during the Load more transition: `count` keeps legacy
    // semantics (page length), `totalCount` is the authoritative pre-slice
    // row count used by the paginated Manage UI.
    count: items.length,
    totalCount,
  });
};

export const handler = withAuth(baseHandler);
