import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { getWorkout } from '../../dynamodb/operations';
import { getUserId, extractJWTClaims, authorizeUser } from '../libs/auth/jwt-utils';

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract userId from path parameters and validate against JWT claims
    const requestedUserId = event.pathParameters?.userId;
    if (!requestedUserId) {
      return createErrorResponse(400, 'Missing userId in path parameters.');
    }

    // Authorize that the requested userId matches the authenticated user
    authorizeUser(event, requestedUserId);

    // Use the validated userId
    const userId = requestedUserId;
    const claims = extractJWTClaims(event);

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
