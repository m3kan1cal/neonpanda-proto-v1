import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { deleteCoachCreatorSession, getCoachCreatorSession } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

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

};

export const handler = withAuth(baseHandler);
