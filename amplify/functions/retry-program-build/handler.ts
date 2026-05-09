import {
  createOkResponse,
  createErrorResponse,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import {
  getProgramDesignerSession,
  saveProgramDesignerSession,
  getUserProfile,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import {
  createProgramGenerationLock,
  createProgramGenerationFailure,
} from "../libs/program-designer/session-management";
import { generateProgramId } from "../libs/id-utils";
import { getUserTimezone } from "../libs/user/timezone";
import { logger } from "../libs/logger";
import type { BuildProgramEvent } from "../libs/program/types";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, "Session ID is required");
  }

  try {
    logger.info("Retrying program build from session:", { userId, sessionId });

    // Load session and user profile in parallel. The user profile feeds
    // userTimezone into the BuildProgramEvent so dateable program fields
    // (startDate/endDate) honor the user's IANA timezone.
    const [session, userProfile] = await Promise.all([
      getProgramDesignerSession(userId, sessionId),
      getUserProfile(userId),
    ]);

    if (!session) {
      return createErrorResponse(404, "Session not found");
    }

    if (!session.isComplete) {
      return createErrorResponse(
        400,
        "Session must be complete before building program",
      );
    }

    // Validate environment BEFORE locking the session so a misconfigured
    // env var fails fast without leaving the session stuck in IN_PROGRESS.
    const buildProgramFunction = process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME;
    if (!buildProgramFunction) {
      throw new Error(
        "BUILD_TRAINING_PROGRAM_FUNCTION_NAME environment variable not set",
      );
    }

    // Generate a fresh programId for this attempt — matches what
    // stream-program-designer-session does on the original build, so the
    // retry produces a brand-new program record rather than reusing any
    // stale id from a prior failed attempt.
    const programId = generateProgramId(userId);

    // Reset programGeneration to IN_PROGRESS via the canonical helper.
    // This builds a fresh programGeneration object, which means any prior
    // FAILED status, error message, or failedAt timestamp is dropped.
    const lockedSession = createProgramGenerationLock(session);
    await saveProgramDesignerSession(lockedSession);

    logger.info(
      "Session status reset to IN_PROGRESS, triggering build-program Lambda",
      { sessionId, programId },
    );

    // Anything after the lock save must roll back to FAILED on error so the
    // session doesn't get stuck IN_PROGRESS with no build actually running.
    // Mirrors the rollback path in saveSessionAndTriggerProgramGeneration.
    try {
      const conversationContext = (lockedSession.conversationHistory || [])
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n\n");

      const buildEvent: BuildProgramEvent = {
        userId,
        coachId: lockedSession.coachId,
        programId,
        sessionId,
        todoList: lockedSession.todoList,
        conversationContext,
        additionalConsiderations:
          lockedSession.additionalConsiderations || "none",
        userTimezone: getUserTimezone(userProfile),
      };

      await invokeAsyncLambda(
        buildProgramFunction,
        buildEvent,
        "program build retry",
      );
    } catch (triggerError) {
      logger.error(
        "Failed to trigger program build after locking session, rolling back to FAILED:",
        triggerError,
      );

      try {
        await saveProgramDesignerSession(
          createProgramGenerationFailure(lockedSession, triggerError),
        );
      } catch (rollbackError) {
        logger.error(
          "Failed to roll back session to FAILED status:",
          rollbackError,
        );
      }

      throw triggerError;
    }

    logger.info("Successfully triggered program build retry");

    return createOkResponse({
      success: true,
      message: "Program build retried successfully",
      sessionId,
      userId,
      programId,
    });
  } catch (error) {
    logger.error("Error retrying program build:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to retry program build",
    );
  }
};

export const handler = withAuth(baseHandler);
