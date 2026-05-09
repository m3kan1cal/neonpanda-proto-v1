import { createOkResponse, createErrorResponse, invokeAsyncLambda } from '../libs/api-helpers';
import { getCoachCreatorSession, saveCoachCreatorSession } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import {
  createCoachConfigGenerationLock,
  createCoachConfigGenerationFailure,
} from '../libs/coach-creator/session-management';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, 'Session ID is required');
  }

  try {
    logger.info('Creating coach config from session:', { userId, sessionId });

    // Load the session
    const session = await getCoachCreatorSession(userId, sessionId);
    if (!session) {
      return createErrorResponse(404, 'Session not found');
    }

    // Verify session is complete (has all answers)
    if (!session.isComplete) {
      return createErrorResponse(400, 'Session must be complete before building coach config');
    }

    // Validate environment BEFORE locking the session so a misconfigured
    // env var fails fast without leaving the session stuck in IN_PROGRESS.
    const buildCoachConfigFunction = process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
    if (!buildCoachConfigFunction) {
      throw new Error('BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set');
    }

    // Reset session status to IN_PROGRESS via the canonical helper (whether
    // it's FAILED or needs retry). Builds a fresh configGeneration object so
    // any prior `error` and `failedAt` are dropped automatically.
    const lockedSession = createCoachConfigGenerationLock(session);
    await saveCoachCreatorSession(lockedSession);

    logger.info('Session status reset to IN_PROGRESS, triggering build-coach-config Lambda');

    // Anything after the lock save must roll back to FAILED on error so the
    // session doesn't get stuck IN_PROGRESS with no build actually running.
    // Mirrors the rollback path in saveSessionAndTriggerCoachConfigGeneration.
    try {
      await invokeAsyncLambda(
        buildCoachConfigFunction,
        { userId, sessionId },
        'coach config generation'
      );
    } catch (triggerError) {
      logger.error(
        'Failed to trigger coach config build after locking session, rolling back to FAILED:',
        triggerError,
      );

      try {
        await saveCoachCreatorSession(
          createCoachConfigGenerationFailure(lockedSession, triggerError),
        );
      } catch (rollbackError) {
        logger.error('Failed to roll back session to FAILED status:', rollbackError);
      }

      throw triggerError;
    }

    logger.info('✅ Successfully triggered coach config build');

    return createOkResponse({
      success: true,
      message: 'Coach config build triggered successfully',
      sessionId,
      userId
    });

  } catch (error) {
    logger.error('Error creating coach config from session:', error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : 'Failed to create coach config'
    );
  }
};

export const handler = withAuth(baseHandler);

