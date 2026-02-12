import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryConversationsCount } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    logger.info('Counting conversations for user:', {
      userId,
      coachId
    });

    // Get the conversation count and total messages
    const { totalCount, totalMessages } = await queryConversationsCount(userId, coachId);

    return createOkResponse({
      totalCount,
      totalMessages
    });

};

export const handler = withAuth(baseHandler);
