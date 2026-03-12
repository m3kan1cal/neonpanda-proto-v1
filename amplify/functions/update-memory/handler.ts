import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { updateMemoryFields } from '../../dynamodb/operations';
import { loadFromDynamoDB } from '../../dynamodb/operations';
import { UserMemory } from '../libs/memory/types';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;

    const memoryId = event.pathParameters?.memoryId;
    if (!memoryId) {
      return createErrorResponse(400, 'memoryId is required');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    let updateData: Partial<UserMemory>;
    try {
      updateData = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    // Validate that the update doesn't change critical fields
    const restrictedFields = ['memoryId', 'userId'];
    for (const field of restrictedFields) {
      if (field in updateData) {
        return createErrorResponse(400, `Field '${field}' cannot be updated`);
      }
    }

    // Ensure we don't allow empty updates
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse(400, 'At least one field must be provided for update');
    }

  try {
    logger.info('Updating memory:', {
      userId,
      memoryId,
      updateFields: Object.keys(updateData)
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

    // Update the memory
    const updatedMemory = await updateMemoryFields(userId, memoryId, updateData);

    // Return the updated memory data
    return createOkResponse({
      message: 'Memory updated successfully',
      memory: updatedMemory,
      updateFields: Object.keys(updateData)
    });

  } catch (error) {
    logger.error('Error updating memory:', error);

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
