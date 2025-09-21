import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryCoachConversations } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    // Load conversation summaries for user + coach (excludes messages for efficiency)
    const conversationSummaries = await queryCoachConversations(userId, coachId);

    return createOkResponse({
      conversations: conversationSummaries.map(item => item.attributes),
      count: conversationSummaries.length
    });

};

export const handler = withAuth(baseHandler);
