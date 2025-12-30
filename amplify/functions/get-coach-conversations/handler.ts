import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryCoachConversations } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

  if (!coachId) {
    return createErrorResponse(400, "coachId is required");
  }

  // Check if includeFirstMessages query parameter is set
  const includeFirstMessages =
    event.queryStringParameters?.includeFirstMessages === "true";

  // Load conversation summaries for user + coach
  const conversationSummaries = await queryCoachConversations(userId, coachId, {
    includeFirstMessages,
  });

  return createOkResponse({
    conversations: conversationSummaries.map((item) => item),
    count: conversationSummaries.length,
  });
};

export const handler = withAuth(baseHandler);
