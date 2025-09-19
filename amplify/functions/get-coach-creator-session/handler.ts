import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachCreatorSession } from '../../dynamodb/operations';
import { CoachCreatorSession } from '../libs/coach-creator/types';
import { getUserId, extractJWTClaims, authorizeUser } from '../libs/auth/jwt-utils';
import { getProgress } from '../libs/coach-creator/session-management';

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

    // Get detailed progress information
    const progressDetails = getProgress(session.attributes.userContext);

    // Return the session data with progress details
    const sessionData: CoachCreatorSession = {
      ...session.attributes,
      progressDetails: {
        questionsCompleted: progressDetails.questionsCompleted,
        totalQuestions: progressDetails.totalQuestions,
        percentage: progressDetails.percentage,
        sophisticationLevel: session.attributes.userContext.sophisticationLevel,
        currentQuestion: session.attributes.userContext.currentQuestion
      }
    };

    return createOkResponse(sessionData);

  } catch (error) {
    console.error('Error loading coach creator session:', error);
    return createErrorResponse(500, 'Internal server error', 'Failed to load coach creator session');
  }
};
