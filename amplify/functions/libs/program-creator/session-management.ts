/**
 * Program Creator Session Management
 *
 * Functions for loading, saving, and managing ProgramCreatorSession lifecycle.
 * Pattern: Matches coach-creator/session-management.ts exactly
 */

import { ProgramCreatorSession } from './types';
import {
  getProgramCreatorSession,
  saveProgramCreatorSession,
  getUserProfile,
} from '../../../dynamodb/operations';
import { invokeAsyncLambda } from '../api-helpers';

/**
 * Generate program creator session summary for analytics
 */
export const generateProgramCreatorSessionSummary = (
  session: ProgramCreatorSession
): string => {
  // Build summary from conversation history (user responses only)
  const userResponses = session.conversationHistory
    ?.filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' | ') || 'No responses';

  // Truncate if too long
  const truncatedResponses =
    userResponses.length > 1000
      ? userResponses.substring(0, 1000) + '...'
      : userResponses;

  return (
    `User ${session.userId} completed program creator. ` +
    `Responses: ${truncatedResponses}`
  );
};

/**
 * Mark session as complete
 */
export const markSessionComplete = (session: ProgramCreatorSession): void => {
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
  session: ProgramCreatorSession;
  userProfile: any;
}

/**
 * Load session data from DynamoDB by conversation ID
 * Creates new session if none exists for this conversation
 */
export async function loadSessionData(
  userId: string,
  conversationId: string
): Promise<SessionData> {
  console.info('📂 Loading program creator session data:', { userId, conversationId });

  const [session, userProfile] = await Promise.all([
    getProgramCreatorSession(userId, conversationId),
    getUserProfile(userId),
  ]);

  // If no session exists, this is a new program creation - will be created by caller
  if (!session) {
    console.info('ℹ️ No existing session found - new program creation');
  } else {
    console.info('✅ Session data loaded successfully');
  }

  return {
    session: session as ProgramCreatorSession,
    userProfile,
  };
}

/**
 * Save session and trigger program generation if complete
 * Returns the program ID if it already exists (idempotency)
 */
export async function saveSessionAndTriggerProgramGeneration(
  userId: string,
  conversationId: string,
  session: ProgramCreatorSession,
  isComplete: boolean,
  generationPayload?: any // Full BuildProgramEvent payload
): Promise<{ programId?: string; alreadyGenerating?: boolean }> {
  console.info('💾 Preparing to save program creator session...');

  // ✅ IDEMPOTENCY CHECK: Perform BEFORE saving to prevent race conditions
  if (isComplete) {
    const idempotencyCheck = checkProgramGenerationIdempotency(session);

    // Handle already-complete scenario
    if (idempotencyCheck.reason === IDEMPOTENCY_REASONS.ALREADY_COMPLETE) {
      console.info(
        '⏭️ Training program already exists for this session (IDEMPOTENCY SKIP):',
        {
          sessionId: session.sessionId,
          programId: idempotencyCheck.programId,
          status: idempotencyCheck.status,
          completedAt: idempotencyCheck.metadata?.completedAt,
        }
      );

      // Don't save session again - already complete
      // Return without triggering new Lambda - program already created
      return {
        programId: idempotencyCheck.programId,
        alreadyGenerating: false,
      };
    }

    // Handle already-in-progress scenario
    if (idempotencyCheck.reason === IDEMPOTENCY_REASONS.ALREADY_IN_PROGRESS) {
      console.info(
        '⏭️ Training program generation already in progress for this session (IDEMPOTENCY SKIP):',
        {
          sessionId: session.sessionId,
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
    session = createProgramGenerationLock(session);
    console.info('🔒 Applied IN_PROGRESS lock to session before save');
  }

  // Save session once (with lock applied if needed)
  await saveProgramCreatorSession(session);
  console.info('✅ Program creator session saved successfully', {
    hasLock: !!session.programGeneration,
    lockStatus: session.programGeneration?.status,
  });

  // Trigger async program generation if complete
  if (isComplete) {
    // Passed idempotency checks and lock is now saved - proceed with Lambda trigger
    try {
      const buildProgramFunction = process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME;
      if (!buildProgramFunction) {
        console.warn(
          '⚠️ BUILD_TRAINING_PROGRAM_FUNCTION_NAME environment variable not set'
        );
      } else {
        // Trigger the async Lambda (lock is already saved to DynamoDB)
        const payload = generationPayload || {
          userId,
          conversationId,
          sessionId: session.sessionId,
        };

        await invokeAsyncLambda(
          buildProgramFunction,
          payload,
          'program generation'
        );

        console.info(
          '✅ Triggered async training program generation with idempotency protection'
        );
      }
    } catch (error) {
      console.error('❌ Failed to trigger training program generation:', error);

      // Reset status to allow retry using extracted utility
      const failedSession = createProgramGenerationFailure(session, error);

      try {
        await saveProgramCreatorSession(failedSession);
        console.info(
          '🔓 Reset session to FAILED status after Lambda trigger error'
        );
      } catch (resetError) {
        console.error('❌ Failed to reset session status:', resetError);
      }

      // Don't fail the request if program generation trigger fails
    }
  }

  return {};
}

// ============================================================================
// IDEMPOTENCY UTILITIES FOR ASYNC PROGRAM GENERATION
// ============================================================================

/**
 * Constants for idempotency check reasons
 */
export const IDEMPOTENCY_REASONS = {
  NOT_STARTED: 'NOT_STARTED' as const,
  ALREADY_COMPLETE: 'ALREADY_COMPLETE' as const,
  ALREADY_IN_PROGRESS: 'ALREADY_IN_PROGRESS' as const,
};

/**
 * Type for idempotency check reasons
 */
export type IdempotencyReason =
  (typeof IDEMPOTENCY_REASONS)[keyof typeof IDEMPOTENCY_REASONS];

/**
 * Result of idempotency check for program generation
 */
export interface IdempotencyCheckResult {
  shouldProceed: boolean;
  reason: IdempotencyReason;
  programId?: string;
  status?: 'COMPLETE' | 'IN_PROGRESS';
  metadata?: {
    completedAt?: string;
    startedAt?: string;
    elapsedSeconds?: number;
  };
}

/**
 * Check if program generation should proceed based on existing session state
 *
 * This prevents duplicate program creation by checking:
 * 1. If a program was already created (COMPLETE status)
 * 2. If a program generation is already in progress (IN_PROGRESS status)
 *
 * @param session - The program creator session to check
 * @returns IdempotencyCheckResult indicating whether to proceed and why
 */
export const checkProgramGenerationIdempotency = (
  session: ProgramCreatorSession
): IdempotencyCheckResult => {
  const existingGeneration = session.programGeneration;

  // Check if program already exists (COMPLETE status)
  if (
    existingGeneration?.status === 'COMPLETE' &&
    existingGeneration?.programId
  ) {
    return {
      shouldProceed: false,
      reason: IDEMPOTENCY_REASONS.ALREADY_COMPLETE,
      programId: existingGeneration.programId,
      status: 'COMPLETE',
      metadata: {
        completedAt: existingGeneration.completedAt?.toISOString(),
      },
    };
  }

  // Check if generation is already in progress (IN_PROGRESS status)
  if (existingGeneration?.status === 'IN_PROGRESS') {
    const elapsedSeconds = existingGeneration.startedAt
      ? Math.floor((Date.now() - existingGeneration.startedAt.getTime()) / 1000)
      : undefined;

    return {
      shouldProceed: false,
      reason: IDEMPOTENCY_REASONS.ALREADY_IN_PROGRESS,
      status: 'IN_PROGRESS',
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
 * Create a session update object that sets the distributed lock for program generation
 *
 * This MUST be saved to DynamoDB BEFORE triggering the async Lambda to prevent race conditions.
 * The IN_PROGRESS status acts as a distributed lock across multiple Lambda invocations.
 *
 * @param session - The program creator session to lock
 * @returns Updated session object with IN_PROGRESS status and lock metadata
 */
export const createProgramGenerationLock = (
  session: ProgramCreatorSession
): ProgramCreatorSession => {
  return {
    ...session,
    programGeneration: {
      status: 'IN_PROGRESS' as const,
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
 * @param session - The program creator session to reset
 * @param error - The error that caused the failure
 * @returns Updated session object with FAILED status
 */
export const createProgramGenerationFailure = (
  session: ProgramCreatorSession,
  error: Error | unknown
): ProgramCreatorSession => {
  return {
    ...session,
    programGeneration: {
      status: 'FAILED' as const,
      startedAt: session.programGeneration?.startedAt || new Date(),
      failedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    lastActivity: new Date(),
  };
};
