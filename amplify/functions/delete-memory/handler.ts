import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteMemory, loadFromDynamoDB } from '../../dynamodb/operations';
import { deleteMemoryFromPinecone } from '../libs/user/pinecone';
import { UserMemory } from '../libs/memory/types';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const memoryId = event.pathParameters?.memoryId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    if (!memoryId) {
      return createErrorResponse(400, 'memoryId is required');
    }

    console.info('Deleting memory:', {
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
    console.info('🗑️ Cleaning up memory from Pinecone...');
    const pineconeResult = await deleteMemoryFromPinecone(userId, memoryId);

    // Return success response
    return createSuccessResponse({
      message: 'Memory deleted successfully',
      memoryId,
      userId,
      pineconeCleanup: pineconeResult.success
    });

  } catch (error) {
    console.error('Error deleting memory:', error);

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
