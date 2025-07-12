import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { getWorkout } from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const workoutId = event.pathParameters?.workoutId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

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
    return createSuccessResponse({
      workout: {
        ...workout.attributes, // All workout properties
        // Include DynamoDB metadata
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting workout session:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
