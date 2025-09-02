import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachCreatorSession } from '../../dynamodb/operations';
import { CoachCreatorSession } from '../libs/coach-creator/types';
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
      return createErrorResponse(400, 'Missing sessionId in path parameters.');
    }

        // Load the coach creator session from DynamoDB
    const session = await getCoachCreatorSession(userId, sessionId);

    if (!session) {
      return createErrorResponse(404, 'Coach creator session not found or expired');
    }

    // Return the session data as-is using the defined CoachCreatorSession interface
    const sessionData: CoachCreatorSession = session.attributes;
    return createSuccessResponse(sessionData);

  } catch (error) {
    console.error('Error loading coach creator session:', error);
    return createErrorResponse(500, 'Internal server error', 'Failed to load coach creator session');
  }
};
