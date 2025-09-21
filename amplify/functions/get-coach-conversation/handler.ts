import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachConversation } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;
  const conversationId = event.pathParameters?.conversationId;

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    if (!conversationId) {
      return createErrorResponse(400, 'conversationId is required');
    }

    // Load specific conversation
    const conversation = await getCoachConversation(userId, coachId, conversationId);

    if (!conversation) {
      return createErrorResponse(404, 'Conversation not found');
    }

    return createOkResponse({
      conversation: conversation.attributes
    });

};

export const handler = withAuth(baseHandler);
