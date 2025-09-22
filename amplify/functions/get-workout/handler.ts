import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getWorkout } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    const workoutId = event.pathParameters?.workoutId;
    if (!workoutId) {
      return createErrorResponse(400, 'workoutId is required');
    }

    console.info('Getting workout session:', {
      userId,
      workoutId
    });

    // Get specific workout session
    const workout = await getWorkout(userId, workoutId);

    if (!workout) {
      return createErrorResponse(404, 'Workout not found');
    }

    // Return the complete workout object (no need for manual mapping)
    return createOkResponse({
      workout: {
        ...workout.attributes, // All workout properties
        // Include DynamoDB metadata
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt
      }
    });

};

export const handler = withAuth(baseHandler);
