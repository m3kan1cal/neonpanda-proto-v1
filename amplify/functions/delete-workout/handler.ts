import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteWorkout, getWorkout } from '../../dynamodb/operations';
import { deleteWorkoutSummaryFromPinecone } from '../libs/workout/pinecone';

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