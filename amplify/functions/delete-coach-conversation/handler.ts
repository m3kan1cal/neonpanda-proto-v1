import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteCoachConversation, getCoachConversation } from '../../dynamodb/operations';
import { deleteConversationSummaryFromPinecone } from '../libs/coach-conversation/pinecone';

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

    console.info('Deleting coach conversation:', {
      userId,
      coachId,
      conversationId
    });

    // Check if conversation exists first
    const existingConversation = await getCoachConversation(userId, coachId, conversationId);
    if (!existingConversation) {
      return createErrorResponse(404, 'Conversation not found');
    }

    // Delete the conversation from DynamoDB
    await deleteCoachConversation(userId, conversationId);

    // Clean up associated conversation summary from Pinecone
    console.info('🗑️ Cleaning up conversation summary from Pinecone...');
    const pineconeResult = await deleteConversationSummaryFromPinecone(userId, conversationId);

    // Return success response
    return createSuccessResponse({
      message: 'Conversation deleted successfully',
      conversationId,
      coachId,
      userId,
      pineconeCleanup: pineconeResult.success
    });

  } catch (error) {
    console.error('Error deleting coach conversation:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse(404, error.message);
      }
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return createErrorResponse(400, error.message);
      }
    }

    return createErrorResponse(500, 'Internal server error');
  }
};
