import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryCoachConversations } from '../../dynamodb/operations';

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

    // Load conversation summaries for user + coach (excludes messages for efficiency)
    const conversationSummaries = await queryCoachConversations(userId, coachId);

    return createOkResponse({
      conversations: conversationSummaries.map(item => item.attributes),
      count: conversationSummaries.length
    });

  } catch (error) {
    console.error('Error getting coach conversations:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
