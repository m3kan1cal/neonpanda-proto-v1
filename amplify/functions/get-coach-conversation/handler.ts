import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachConversation } from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;
    const conversationId = event.pathParameters?.conversationId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

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

  } catch (error) {
    console.error('Error getting coach conversation:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
