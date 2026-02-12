import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteMemory, loadFromDynamoDB } from '../../dynamodb/operations';
import { deleteMemoryFromPinecone } from '../libs/user/pinecone';
import { UserMemory } from '../libs/memory/types';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    const memoryId = event.pathParameters?.memoryId;
    if (!memoryId) {
      return createErrorResponse(400, 'memoryId is required');
    }

  try {
    logger.info('Deleting memory:', {
      userId,
      memoryId
    });

    // Check if memory exists first
    const existingMemory = await loadFromDynamoDB<UserMemory>(
      `user#${userId}`,
      `userMemory#${memoryId}`,
      'userMemory'
    );

    if (!existingMemory) {
      return createErrorResponse(404, 'Memory not found');
    }

    // Delete the memory from DynamoDB
    await deleteMemory(userId, memoryId);

    // Clean up from Pinecone
    logger.info('🗑️ Cleaning up memory from Pinecone..');
    const pineconeResult = await deleteMemoryFromPinecone(userId, memoryId);

    // Return success response
    return createOkResponse({
      message: 'Memory deleted successfully',
      memoryId,
      userId,
      pineconeCleanup: pineconeResult.success
    });

  } catch (error) {
    logger.error('Error deleting memory:', error);

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
