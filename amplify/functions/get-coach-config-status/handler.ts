import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachCreatorSession, getCoachConfig } from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const sessionId = event.pathParameters?.sessionId;

    if (!userId || !sessionId) {
      return createErrorResponse(400, 'Missing required fields: userId, sessionId');
    }

    // Load the session to check config generation status
    const session = await getCoachCreatorSession(userId, sessionId);
    if (!session) {
      return createErrorResponse(404, 'Session not found or expired');
    }

    const sessionData = session.attributes;

    // Check if session is complete
    if (!sessionData.isComplete) {
      return createSuccessResponse({
        status: 'SESSION_INCOMPLETE',
        message: 'Coach creator session is not yet complete'
      });
    }

    // Check config generation status
    const configGenerationStatus = (sessionData as any).configGenerationStatus;

    if (!configGenerationStatus) {
      return createSuccessResponse({
        status: 'NOT_STARTED',
        message: 'Coach config generation has not been started'
      });
    }

    if (configGenerationStatus === 'IN_PROGRESS') {
      return createSuccessResponse({
        status: 'IN_PROGRESS',
        message: 'Coach config is being generated...',
        startedAt: (sessionData as any).configGenerationStartedAt
      });
    }

    if (configGenerationStatus === 'FAILED') {
      return createSuccessResponse({
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
          return createSuccessResponse({
            status: 'COMPLETE',
            message: 'Coach config generated successfully',
            coachConfigId,
            coachName: coachConfig?.attributes?.coach_name,
            completedAt: (sessionData as any).configGenerationCompletedAt,
            coachConfig: coachConfig?.attributes
          });
        } catch (error) {
          console.error('Error loading coach config:', error);
          return createSuccessResponse({
            status: 'COMPLETE_BUT_ERROR',
            message: 'Coach config generation completed but config could not be loaded',
            coachConfigId,
            completedAt: (sessionData as any).configGenerationCompletedAt
          });
        }
      }
    }

    return createSuccessResponse({
      status: 'UNKNOWN',
      message: 'Unknown config generation status',
      configGenerationStatus
    });

  } catch (error) {
    console.error('Error checking coach config status:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};