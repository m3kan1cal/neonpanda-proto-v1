import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteWorkout, getWorkout } from '../../dynamodb/operations';
import { deleteWorkoutSummaryFromPinecone } from '../libs/workout/pinecone';
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

    console.info('Deleting workout session:', {
      userId,
      workoutId
    });

    // Check if workout exists first
    const existingWorkout = await getWorkout(userId, workoutId);
    if (!existingWorkout) {
      return createErrorResponse(404, 'Workout not found');
    }

    // Delete the workout session from DynamoDB
    await deleteWorkout(userId, workoutId);

    // Clean up associated workout summary from Pinecone
    console.info('🗑️ Cleaning up workout summary from Pinecone...');
    const pineconeResult = await deleteWorkoutSummaryFromPinecone(userId, workoutId);

    // Return success response
    return createSuccessResponse({
      message: 'Workout deleted successfully',
      workoutId,
      userId,
      pineconeCleanup: pineconeResult.success
    });

  } catch (error) {
    console.error('Error deleting workout session:', error);

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