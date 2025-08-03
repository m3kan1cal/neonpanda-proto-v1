import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { queryConversationsCount } from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    console.info('Counting conversations for user:', {
      userId,
      coachId
    });

    // Get the conversation count
    const totalCount = await queryConversationsCount(userId, coachId);

    return createSuccessResponse({
      totalCount: totalCount
    });

  } catch (error) {
    console.error('Error getting conversation count:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};