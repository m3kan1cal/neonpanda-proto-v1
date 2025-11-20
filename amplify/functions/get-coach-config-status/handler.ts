import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachCreatorSession, getCoachConfig } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
      return createErrorResponse(400, 'Missing sessionId in path parameters.');
    }

    // Load the session to check config generation status
    const session = await getCoachCreatorSession(userId, sessionId);
    if (!session) {
      return createErrorResponse(404, 'Session not found or expired');
    }

    const sessionData = session;

    // Check if session is complete
    if (!sessionData.isComplete) {
      return createOkResponse({
        status: 'SESSION_INCOMPLETE',
        message: 'Coach creator session is not yet complete'
      });
    }

    // Check config generation status using new nested structure
    const configGeneration = sessionData.configGeneration;

    if (!configGeneration) {
      return createOkResponse({
        status: 'NOT_STARTED',
        message: 'Coach config generation has not been started'
      });
    }

    if (configGeneration.status === 'IN_PROGRESS') {
      return createOkResponse({
        status: 'IN_PROGRESS',
        message: 'Coach config is being generated..',
        startedAt: configGeneration.startedAt
      });
    }

    if (configGeneration.status === 'FAILED') {
      return createOkResponse({
        status: 'FAILED',
        message: 'Coach config generation failed',
        error: configGeneration.error,
        failedAt: configGeneration.failedAt
      });
    }

    if (configGeneration.status === 'COMPLETE') {
      const coachConfigId = configGeneration.coachConfigId;

      // Try to load the actual coach config to verify it exists
      if (coachConfigId) {
        try {
          const coachConfig = await getCoachConfig(userId, coachConfigId);
          return createOkResponse({
            status: 'COMPLETE',
            message: 'Coach config generated successfully',
            coachConfigId,
            coachName: coachConfig?.coach_name,
            completedAt: configGeneration.completedAt,
            coachConfig: coachConfig
          });
        } catch (error) {
          console.error('Error loading coach config:', error);
          return createOkResponse({
            status: 'COMPLETE_BUT_ERROR',
            message: 'Coach config generation completed but config could not be loaded',
            coachConfigId,
            completedAt: configGeneration.completedAt
          });
        }
      }
    }

    return createOkResponse({
      status: 'UNKNOWN',
      message: 'Unknown config generation status',
      configGenerationStatus: configGeneration.status
    });

};

export const handler = withAuth(baseHandler);