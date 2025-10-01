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

    // Calculate conversation size (similar to save operation)
    const conversationSizeBytes = JSON.stringify(conversation).length;
    const itemSizeKB = conversationSizeBytes / 1024;
    const sizePercentage = Math.min(Math.round((itemSizeKB / 400) * 100), 100);
    const isApproachingLimit = itemSizeKB > 350; // 87.5% threshold

    console.info('📊 Conversation size on load:', {
      sizeKB: itemSizeKB.toFixed(2),
      percentage: sizePercentage,
      isApproachingLimit,
      maxSizeKB: 400
    });

    return createOkResponse({
      conversation: conversation.attributes,
      conversationSize: {
        sizeKB: parseFloat(itemSizeKB.toFixed(2)),
        percentage: sizePercentage,
        maxSizeKB: 400,
        isApproachingLimit
      }
    });

};

export const handler = withAuth(baseHandler);
