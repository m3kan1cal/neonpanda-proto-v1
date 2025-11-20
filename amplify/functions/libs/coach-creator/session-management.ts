import { CoachCreatorSession, SophisticationLevel } from "./types";
import {
  getCoachCreatorSession,
  getUserProfile,
  saveCoachCreatorSession,
} from "../../../dynamodb/operations";
import { invokeAsyncLambda } from "../api-helpers";

// Generate coach creator session summary for analytics
export const generateCoachCreatorSessionSummary = (
  session: CoachCreatorSession
): string => {
  const sophistication = session.sophisticationLevel || "UNKNOWN";

  // Build summary from conversation history (user responses only)
  const userResponses =
    session.conversationHistory
      ?.filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" | ") || "No responses";

  // Truncate if too long
  const truncatedResponses =
    userResponses.length > 1000
      ? userResponses.substring(0, 1000) + "..."
      : userResponses;

  return (
    `User ${session.userId} completed coach creator as ${sophistication.toLowerCase()} level athlete. ` +
    `Responses: ${truncatedResponses}`
  );
};

// Mark session as complete
export const markSessionComplete = (session: CoachCreatorSession): void => {
  session.isComplete = true;
  session.completedAt = new Date();
};

// ============================================================================
// SESSION DATA LOADING AND SAVING
// ============================================================================

/**
 * Session data interface
 */
export interface SessionData {
  session: CoachCreatorSession;
  userProfile: any;
}

/**
 * Load session data from DynamoDB
 */
export async function loadSessionData(
  userId: string,
  sessionId: string
): Promise<SessionData> {
  console.info("📂 Loading session data:", { userId, sessionId });

  const [session, userProfile] = await Promise.all([
    getCoachCreatorSession(userId, sessionId),
    getUserProfile(userId),
  ]);

  if (!session) {
    throw new Error("Session not found or expired");
  }

  console.info("✅ Session data loaded successfully");

  return {
    session,
    userProfile,
  };
}

/**
 * Save session and trigger coach config generation if complete
 * Returns the coach config ID if it already exists (idempotency)
 */
export async function saveSessionAndTriggerCoachConfig(
  userId: string,
  sessionId: string,
  session: CoachCreatorSession,
  isComplete: boolean
): Promise<{ coachConfigId?: string; alreadyGenerating?: boolean }> {
  console.info("💾 Preparing to save session..");

  // ✅ IDEMPOTENCY CHECK: Perform BEFORE saving to prevent race conditions
  if (isComplete) {
    const idempotencyCheck = checkCoachConfigIdempotency(session);

    // Handle already-complete scenario
    if (idempotencyCheck.reason === IDEMPOTENCY_REASONS.ALREADY_COMPLETE) {
      console.info(
        "⏭️ Coach config already exists for this session (IDEMPOTENCY SKIP):",
        {
          sessionId,
          coachConfigId: idempotencyCheck.coachConfigId,
          status: idempotencyCheck.status,
          completedAt: idempotencyCheck.metadata?.completedAt,
        }
      );

      // Don't save session again - already complete
      // Return without triggering new Lambda - coach already created
      return {
        coachConfigId: idempotencyCheck.coachConfigId,
        alreadyGenerating: false,
      };
    }

    // Handle already-in-progress scenario
    if (idempotencyCheck.reason === IDEMPOTENCY_REASONS.ALREADY_IN_PROGRESS) {
      console.info(
        "⏭️ Coach config generation already in progress for this session (IDEMPOTENCY SKIP):",
        {
          sessionId,
          status: idempotencyCheck.status,
          startedAt: idempotencyCheck.metadata?.startedAt,
          elapsedSeconds: idempotencyCheck.metadata?.elapsedSeconds,
        }
      );

      // Don't save session again - already in progress
      // Return without triggering new Lambda - generation already running
      return {
        alreadyGenerating: true,
      };
    }

    // ✅ CRITICAL: Apply lock to session BEFORE saving (prevents race condition)
    // This ensures the lock is atomically written with the completion state
    session = createCoachConfigGenerationLock(session);
    console.info("🔒 Applied IN_PROGRESS lock to session before save");
  }

  // Save session once (with lock applied if needed)
  await saveCoachCreatorSession(session);
  console.info("✅ Session saved successfully", {
    hasLock: !!session.configGeneration,
    lockStatus: session.configGeneration?.status,
  });

  // Trigger async coach config generation if complete
  if (isComplete) {
    // Passed idempotency checks and lock is now saved - proceed with Lambda trigger
    try {
      const buildCoachConfigFunction =
        process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
      if (!buildCoachConfigFunction) {
        console.warn(
          "⚠️ BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set"
        );
      } else {
        // Trigger the async Lambda (lock is already saved to DynamoDB)
        await invokeAsyncLambda(
          buildCoachConfigFunction,
          {
            userId,
            sessionId,
          },
          "coach config generation"
        );

        console.info(
          "✅ Triggered async coach config generation with idempotency protection"
        );
      }
    } catch (error) {
      console.error("❌ Failed to trigger coach config generation:", error);

      // Reset status to allow retry using extracted utility
      const failedSession = createCoachConfigGenerationFailure(session, error);

      try {
        await saveCoachCreatorSession(failedSession);
        console.info(
          "🔓 Reset session to FAILED status after Lambda trigger error"
        );
      } catch (resetError) {
        console.error("❌ Failed to reset session status:", resetError);
      }

      // Don't fail the request if coach config trigger fails
    }
  }

  return {};
}

// ============================================================================
// IDEMPOTENCY UTILITIES FOR ASYNC COACH CONFIG GENERATION
// ============================================================================

/**
 * Constants for idempotency check reasons
 */
export const IDEMPOTENCY_REASONS = {
  NOT_STARTED: "NOT_STARTED" as const,
  ALREADY_COMPLETE: "ALREADY_COMPLETE" as const,
  ALREADY_IN_PROGRESS: "ALREADY_IN_PROGRESS" as const,
};

/**
 * Type for idempotency check reasons
 */
export type IdempotencyReason =
  (typeof IDEMPOTENCY_REASONS)[keyof typeof IDEMPOTENCY_REASONS];

/**
 * Result of idempotency check for coach config generation
 */
export interface IdempotencyCheckResult {
  shouldProceed: boolean;
  reason: IdempotencyReason;
  coachConfigId?: string;
  status?: "COMPLETE" | "IN_PROGRESS";
  metadata?: {
    completedAt?: string;
    startedAt?: string;
    elapsedSeconds?: number;
  };
}

/**
 * Check if coach config generation should proceed based on existing session state
 *
 * This prevents duplicate coach creation by checking:
 * 1. If a coach config was already created (COMPLETE status)
 * 2. If a coach config generation is already in progress (IN_PROGRESS status)
 *
 * @param session - The coach creator session to check
 * @returns IdempotencyCheckResult indicating whether to proceed and why
 *
 * @example
 * ```typescript
 * const result = checkCoachConfigIdempotency(session);
 *
 * if (result.reason === IDEMPOTENCY_REASONS.ALREADY_COMPLETE) {
 *   console.info("Coach already created:", result.coachConfigId);
 *   return; // Early return with existing coach
 * }
 *
 * if (result.reason === IDEMPOTENCY_REASONS.ALREADY_IN_PROGRESS) {
 *   console.info("Coach creation in progress:", result.metadata);
 *   return; // Early return - already building
 * }
 *
 * // result.reason === IDEMPOTENCY_REASONS.NOT_STARTED
 * // Safe to proceed with coach creation
 * ```
 */
export const checkCoachConfigIdempotency = (
  session: CoachCreatorSession
): IdempotencyCheckResult => {
  const existingGeneration = session.configGeneration;

  // Check if coach config already exists (COMPLETE status)
  if (
    existingGeneration?.status === "COMPLETE" &&
    existingGeneration?.coachConfigId
  ) {
    return {
      shouldProceed: false,
      reason: IDEMPOTENCY_REASONS.ALREADY_COMPLETE,
      coachConfigId: existingGeneration.coachConfigId,
      status: "COMPLETE",
      metadata: {
        completedAt: existingGeneration.completedAt?.toISOString(),
      },
    };
  }

  // Check if generation is already in progress (IN_PROGRESS status)
  if (existingGeneration?.status === "IN_PROGRESS") {
    const elapsedSeconds = existingGeneration.startedAt
      ? Math.floor((Date.now() - existingGeneration.startedAt.getTime()) / 1000)
      : undefined;

    return {
      shouldProceed: false,
      reason: IDEMPOTENCY_REASONS.ALREADY_IN_PROGRESS,
      status: "IN_PROGRESS",
      metadata: {
        startedAt: existingGeneration.startedAt.toISOString(),
        elapsedSeconds,
      },
    };
  }

  // No existing generation found - safe to proceed
  return {
    shouldProceed: true,
    reason: IDEMPOTENCY_REASONS.NOT_STARTED,
  };
};

/**
 * Create a session update object that sets the distributed lock for coach config generation
 *
 * This MUST be saved to DynamoDB BEFORE triggering the async Lambda to prevent race conditions.
 * The IN_PROGRESS status acts as a distributed lock across multiple Lambda invocations.
 *
 * @param session - The coach creator session to lock
 * @returns Updated session object with IN_PROGRESS status and lock metadata
 *
 * @example
 * ```typescript
 * const lockedSession = createCoachConfigGenerationLock(session);
 * await saveCoachCreatorSession(lockedSession); // Save BEFORE Lambda trigger
 * await invokeAsyncLambda(...); // Now safe to trigger
 * ```
 */
export const createCoachConfigGenerationLock = (
  session: CoachCreatorSession
): CoachCreatorSession => {
  return {
    ...session,
    configGeneration: {
      status: "IN_PROGRESS" as const,
      startedAt: new Date(),
    },
    lastActivity: new Date(),
  };
};

/**
 * Create a session update object that resets the generation status to FAILED
 *
 * Use this when the Lambda trigger fails to allow the user to retry.
 *
 * @param session - The coach creator session to reset
 * @param error - The error that caused the failure
 * @returns Updated session object with FAILED status
 *
 * @example
 * ```typescript
 * try {
 *   await invokeAsyncLambda(...);
 * } catch (error) {
 *   const failedSession = createCoachConfigGenerationFailure(session, error);
 *   await saveCoachCreatorSession(failedSession);
 * }
 * ```
 */
export const createCoachConfigGenerationFailure = (
  session: CoachCreatorSession,
  error: Error | unknown
): CoachCreatorSession => {
  return {
    ...session,
    configGeneration: {
      status: "FAILED" as const,
      startedAt: session.configGeneration?.startedAt || new Date(),
      failedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    },
    lastActivity: new Date(),
  };
};
