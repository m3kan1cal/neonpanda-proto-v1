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

    // Return the full workout data
    return createSuccessResponse({
      workout: {
        workoutId: workout.attributes.workoutId,
        userId: workout.attributes.userId,
        coachIds: workout.attributes.coachIds,
        coachNames: workout.attributes.coachNames,
        conversationId: workout.attributes.conversationId,
        completedAt: workout.attributes.completedAt,
        workoutData: workout.attributes.workoutData,
        extractionMetadata: workout.attributes.extractionMetadata,
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