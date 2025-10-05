import { createOkResponse, createErrorResponse, invokeAsyncLambda } from '../libs/api-helpers';
import { getCoachCreatorSession, saveCoachCreatorSession } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, 'Session ID is required');
  }

  try {
    console.info('Creating coach config from session:', { userId, sessionId });

    // Load the session
    const session = await getCoachCreatorSession(userId, sessionId);
    if (!session) {
      return createErrorResponse(404, 'Session not found');
    }

    // Verify session is complete (has all answers)
    if (!session.attributes.isComplete) {
      return createErrorResponse(400, 'Session must be complete before building coach config');
    }

    // Reset session status to IN_PROGRESS (whether it's FAILED or needs retry)
    const updatedSession = {
      ...session.attributes,
      configGeneration: {
        status: 'IN_PROGRESS' as const,
        startedAt: new Date()
      },
      lastActivity: new Date()
    };
    await saveCoachCreatorSession(updatedSession);

    console.info('Session status reset to IN_PROGRESS, triggering build-coach-config Lambda');

    // Trigger build-coach-config Lambda asynchronously (like stream-coach-creator-session does)
    const buildCoachConfigFunction = process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
    if (!buildCoachConfigFunction) {
      throw new Error('BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set');
    }

    await invokeAsyncLambda(
      buildCoachConfigFunction,
      { userId, sessionId },
      'coach config generation'
    );

    console.info('✅ Successfully triggered coach config build');

    return createOkResponse({
      success: true,
      message: 'Coach config build triggered successfully',
      sessionId,
      userId
    });

  } catch (error) {
    console.error('Error creating coach config from session:', error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : 'Failed to create coach config'
    );
  }
};

export const handler = withAuth(baseHandler);

