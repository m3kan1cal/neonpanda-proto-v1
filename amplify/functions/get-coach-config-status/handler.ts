import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachCreatorSession, getCoachConfig } from '../../dynamodb/operations';
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

    // Load the session to check config generation status
    const session = await getCoachCreatorSession(userId, sessionId);
    if (!session) {
      return createErrorResponse(404, 'Session not found or expired');
    }

    const sessionData = session.attributes;

    // Check if session is complete
    if (!sessionData.isComplete) {
      return createOkResponse({
        status: 'SESSION_INCOMPLETE',
        message: 'Coach creator session is not yet complete'
      });
    }

    // Check config generation status
    const configGenerationStatus = (sessionData as any).configGenerationStatus;

    if (!configGenerationStatus) {
      return createOkResponse({
        status: 'NOT_STARTED',
        message: 'Coach config generation has not been started'
      });
    }

    if (configGenerationStatus === 'IN_PROGRESS') {
      return createOkResponse({
        status: 'IN_PROGRESS',
        message: 'Coach config is being generated...',
        startedAt: (sessionData as any).configGenerationStartedAt
      });
    }

    if (configGenerationStatus === 'FAILED') {
      return createOkResponse({
        status: 'FAILED',
        message: 'Coach config generation failed',
        error: (sessionData as any).configGenerationError,
        failedAt: (sessionData as any).configGenerationFailedAt
      });
    }

    if (configGenerationStatus === 'COMPLETE') {
      const coachConfigId = (sessionData as any).coachConfigId;

      // Try to load the actual coach config to verify it exists
      if (coachConfigId) {
        try {
          const coachConfig = await getCoachConfig(userId, coachConfigId);
          return createOkResponse({
            status: 'COMPLETE',
            message: 'Coach config generated successfully',
            coachConfigId,
            coachName: coachConfig?.attributes?.coach_name,
            completedAt: (sessionData as any).configGenerationCompletedAt,
            coachConfig: coachConfig?.attributes
          });
        } catch (error) {
          console.error('Error loading coach config:', error);
          return createOkResponse({
            status: 'COMPLETE_BUT_ERROR',
            message: 'Coach config generation completed but config could not be loaded',
            coachConfigId,
            completedAt: (sessionData as any).configGenerationCompletedAt
          });
        }
      }
    }

    return createOkResponse({
      status: 'UNKNOWN',
      message: 'Unknown config generation status',
      configGenerationStatus
    });

  } catch (error) {
    console.error('Error checking coach config status:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};