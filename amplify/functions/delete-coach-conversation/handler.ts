import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteCoachConversation, getCoachConversation, getCoachConfig, saveCoachConfig } from '../../dynamodb/operations';
import { deleteConversationSummaryFromPinecone } from '../libs/coach-conversation/pinecone';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { logger } from "../libs/logger";

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

  try {
    logger.info('Deleting coach conversation:', {
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
    logger.info('🗑️ Cleaning up conversation summary from Pinecone..');
    const pineconeResult = await deleteConversationSummaryFromPinecone(userId, conversationId);

    // Update coach config conversation count
    try {
      const coachConfig = await getCoachConfig(userId, coachId);
      if (coachConfig) {
        const currentCount = coachConfig.metadata.total_conversations || 0;
        const updated = {
          ...coachConfig,
          metadata: {
            ...coachConfig.metadata,
            total_conversations: Math.max(0, currentCount - 1), // Ensure count doesn't go below 0
          },
        };
        await saveCoachConfig(userId, updated);
        logger.info('Updated coach config conversation count:', {
          previousCount: currentCount,
          newCount: updated.metadata.total_conversations
        });
      }
    } catch (error) {
      logger.error('Failed to update conversation count:', error);
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
    logger.error('Error deleting coach conversation:', error);

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

export const handler = withAuth(baseHandler);
