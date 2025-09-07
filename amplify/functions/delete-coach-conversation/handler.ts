import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteCoachConversation, getCoachConversation, getCoachConfig, saveCoachConfig } from '../../dynamodb/operations';
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

    // Update coach config conversation count
    try {
      const coachConfig = await getCoachConfig(userId, coachId);
      if (coachConfig) {
        const currentCount = coachConfig.attributes.metadata.total_conversations || 0;
        const updated = {
          ...coachConfig.attributes,
          metadata: {
            ...coachConfig.attributes.metadata,
            total_conversations: Math.max(0, currentCount - 1), // Ensure count doesn't go below 0
          },
        };
        await saveCoachConfig(userId, updated);
        console.info('Updated coach config conversation count:', {
          previousCount: currentCount,
          newCount: updated.metadata.total_conversations
        });
      }
    } catch (error) {
      console.error('Failed to update conversation count:', error);
      // Don't fail the request - conversation was deleted successfully
    }

    // Return success response
    return createOkResponse({
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
