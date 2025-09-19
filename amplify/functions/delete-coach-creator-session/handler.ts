import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteCoachCreatorSession, getCoachCreatorSession } from '../../dynamodb/operations';
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

    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
      return createErrorResponse(400, 'sessionId is required');
    }

    console.info('Deleting coach creator session:', {
      userId,
      sessionId
    });

    // Check if session exists first
    const existingSession = await getCoachCreatorSession(userId, sessionId);
    if (!existingSession) {
      return createErrorResponse(404, 'Coach creator session not found');
    }

    // Delete the session from DynamoDB
    await deleteCoachCreatorSession(userId, sessionId);

    // Return success response
    return createOkResponse({
      message: 'Coach creator session deleted successfully',
      sessionId
    });

  } catch (error) {
    console.error('Error deleting coach creator session:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
