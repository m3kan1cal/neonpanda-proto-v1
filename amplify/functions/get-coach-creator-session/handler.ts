import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachCreatorSession } from '../../dynamodb/operations';
import { CoachCreatorSession } from '../libs/coach-creator/types';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const sessionId = event.pathParameters?.sessionId;

    if (!userId || !sessionId) {
      return createErrorResponse(400, 'Missing required fields: userId, sessionId');
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
