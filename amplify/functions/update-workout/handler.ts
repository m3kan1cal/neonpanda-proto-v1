import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { updateWorkout, getWorkout } from '../../dynamodb/operations';
import { Workout } from '../libs/workout/types';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    const workoutId = event.pathParameters?.workoutId;
    if (!workoutId) {
      return createErrorResponse(400, 'workoutId is required');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    let updateData: Partial<Workout>;
    try {
      updateData = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    // Validate that the update doesn't change critical fields
    const restrictedFields = ['workoutId', 'userId'];
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
    logger.info('Updating workout session:', {
      userId,
      workoutId,
      updateFields: Object.keys(updateData)
    });

    // Check if workout exists first
    const existingWorkout = await getWorkout(userId, workoutId);
    if (!existingWorkout) {
      return createErrorResponse(404, 'Workout not found');
    }

    // Update the workout session
    const updatedWorkout = await updateWorkout(userId, workoutId, updateData);

    // Return the updated workout data
    return createOkResponse({
      message: 'Workout updated successfully',
      workout: {
        workoutId: updatedWorkout.workoutId,
        userId: updatedWorkout.userId,
        coachIds: updatedWorkout.coachIds,
        coachNames: updatedWorkout.coachNames,
        conversationId: updatedWorkout.conversationId,
        completedAt: updatedWorkout.completedAt,
        workoutData: updatedWorkout.workoutData,
        extractionMetadata: updatedWorkout.extractionMetadata
      },
      updateFields: Object.keys(updateData)
    });

  } catch (error) {
    logger.error('Error updating workout session:', error);

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