/**
 * Program Designer Session Management
 *
 * Functions for loading, saving, and managing ProgramDesignerSession lifecycle.
 * Pattern: Matches coach-creator/session-management.ts exactly
 */

import { ProgramDesignerSession } from "./types";
import {
  getProgramDesignerSession,
  saveProgramDesignerSession,
  getUserProfile,
} from "../../../dynamodb/operations";
import {
  invokeAsyncLambda,
  callBedrockApi,
  TEMPERATURE_PRESETS,
  MODEL_IDS,
} from "../api-helpers";
import type { Program } from "../program/types";

/**
 * Generate an AI-powered summary of a program design session for semantic search and coaching context.
 *
 * Captures what the user asked for, the requirements gathered, key design decisions,
 * and constraints discussed during the session.
 *
 * @param session - The program designer session with conversation history
 * @param program - The generated training program with phases, goals, etc.
 * @param enableThinking - Whether to enable extended thinking in the Bedrock call
 * @returns Promise<string> - Concise AI-generated summary for Pinecone embedding
 */
export const generateProgramDesignerSessionSummary = async (
  session: ProgramDesignerSession,
  program: Program,
  enableThinking: boolean = false,
): Promise<string> => {
  // Extract conversation context (last 10 messages for sufficient context)
  const conversationContext = (session.conversationHistory || [])
    .slice(-10)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  // STATIC PROMPT (cacheable - instructions and examples don't change)
  const staticPrompt = `
You are summarizing a program design session where a user worked with an AI coach to create a training program.

Create a 3-4 sentence summary that captures:
1. What the user asked for and their primary training goals
2. The program structure created (name, duration, phases, frequency)
3. Key design decisions and constraints discussed (equipment, schedule, focus areas)
4. Any important user context that influenced the program design (experience level, injuries, preferences)

Keep it concise and semantically rich -- this summary will be used for semantic search to retrieve relevant context in future conversations. Focus on the substance of what was designed, not the process.

EXAMPLE GOOD SUMMARIES:
- "User requested a 12-week strength program targeting powerlifting competition prep. Created 'Peak Performance' with 3 phases: hypertrophy base (4 weeks), strength intensification (5 weeks), and peaking (3 weeks) at 4x/week. Equipment limited to home gym with rack, barbell, and dumbbells. User has 3 years of training experience and wants to compete in the 83kg class."
- "User designed a 6-week bodyweight fitness program for travel. Created 'Road Warrior' with 2 phases: foundation and progression at 5x/week. No equipment required, sessions capped at 30 minutes. User prioritized maintaining muscle mass during extended business travel."
- "User built an 8-week hybrid program combining CrossFit and Olympic weightlifting. Created 'Oly-Fit Hybrid' with 2 phases at 5x/week in a fully equipped CrossFit box. Focus on improving clean & jerk technique while maintaining metcon capacity for upcoming competition."`;

  // DYNAMIC PROMPT (not cacheable - session and program data vary)
  const dynamicPrompt = `PROGRAM DATA:
${JSON.stringify(
  {
    name: program.name,
    description: program.description,
    totalDays: program.totalDays,
    trainingFrequency: program.trainingFrequency,
    startDate: program.startDate,
    endDate: program.endDate,
    phases: program.phases?.map((p) => ({
      name: p.name,
      description: p.description,
      durationDays: p.durationDays,
      focusAreas: p.focusAreas,
    })),
    trainingGoals: program.trainingGoals,
    equipmentConstraints: program.equipmentConstraints,
    totalWorkouts: program.totalWorkouts,
  },
  null,
  2,
)}

CONVERSATION HISTORY:
${conversationContext}

Write the summary now:`;

  const response = (await callBedrockApi(
    staticPrompt,
    dynamicPrompt,
    MODEL_IDS.EXECUTOR_MODEL_FULL,
    {
      temperature: TEMPERATURE_PRESETS.BALANCED,
      staticPrompt,
      dynamicPrompt,
      enableThinking,
    },
  )) as string;

  return response.trim();
};

/**
 * Mark session as complete
 */
export const markSessionComplete = (session: ProgramDesignerSession): void => {
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
  session: ProgramDesignerSession;
  userProfile: any;
}

/**
 * Load session data from DynamoDB by user ID
 * Creates new session if none exists for this user
 */
export async function loadSessionData(userId: string): Promise<SessionData> {
  console.info("📂 Loading program designer session data:", {
    userId,
  });

  const [session, userProfile] = await Promise.all([
    getProgramDesignerSession(userId),
    getUserProfile(userId),
  ]);

  // If no session exists, this is a new program creation - will be created by caller
  if (!session) {
    console.info("ℹ️ No existing session found - new program creation");
  } else {
    console.info("✅ Session data loaded successfully");
  }

  return {
    session: session as ProgramDesignerSession,
    userProfile,
  };
}

/**
 * Save session and trigger program generation if complete
 * Returns the program ID if it already exists (idempotency)
 */
export async function saveSessionAndTriggerProgramGeneration(
  userId: string,
  session: ProgramDesignerSession,
  isComplete: boolean,
  generationPayload?: any, // Full BuildProgramEvent payload
): Promise<{ programId?: string; alreadyGenerating?: boolean }> {
  console.info("💾 Preparing to save program designer session...");

  // ✅ IDEMPOTENCY CHECK: Perform BEFORE saving to prevent race conditions
  if (isComplete) {
    const idempotencyCheck = checkProgramGenerationIdempotency(session);

    // Handle already-complete scenario
    if (idempotencyCheck.reason === IDEMPOTENCY_REASONS.ALREADY_COMPLETE) {
      console.info(
        "⏭️ Training program already exists for this session (IDEMPOTENCY SKIP):",
        {
          sessionId: session.sessionId,
          programId: idempotencyCheck.programId,
          status: idempotencyCheck.status,
          completedAt: idempotencyCheck.metadata?.completedAt,
        },
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
        "⏭️ Training program generation already in progress for this session (IDEMPOTENCY SKIP):",
        {
          sessionId: session.sessionId,
          status: idempotencyCheck.status,
          startedAt: idempotencyCheck.metadata?.startedAt,
          elapsedSeconds: idempotencyCheck.metadata?.elapsedSeconds,
        },
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
    console.info("🔒 Applied IN_PROGRESS lock to session before save");
  }

  // Save session once (with lock applied if needed)
  await saveProgramDesignerSession(session);
  console.info("✅ Program designer session saved successfully", {
    hasLock: !!session.programGeneration,
    lockStatus: session.programGeneration?.status,
  });

  // Trigger async program generation if complete
  if (isComplete) {
    // Passed idempotency checks and lock is now saved - proceed with Lambda trigger
    try {
      const buildProgramFunction =
        process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME;
      if (!buildProgramFunction) {
        console.warn(
          "⚠️ BUILD_TRAINING_PROGRAM_FUNCTION_NAME environment variable not set",
        );
      } else {
        // Trigger the async Lambda (lock is already saved to DynamoDB)
        // Note: generationPayload should always be provided by caller with full BuildProgramEvent
        if (!generationPayload) {
          throw new Error(
            "generationPayload is required for program generation",
          );
        }
        const payload = generationPayload;

        await invokeAsyncLambda(
          buildProgramFunction,
          payload,
          "program generation",
        );

        console.info(
          "✅ Triggered async training program generation with idempotency protection",
        );
      }
    } catch (error) {
      console.error("❌ Failed to trigger training program generation:", error);

      // Reset status to allow retry using extracted utility
      const failedSession = createProgramGenerationFailure(session, error);

      try {
        await saveProgramDesignerSession(failedSession);
        console.info(
          "🔓 Reset session to FAILED status after Lambda trigger error",
        );
      } catch (resetError) {
        console.error("❌ Failed to reset session status:", resetError);
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
 * Result of idempotency check for program generation
 */
export interface IdempotencyCheckResult {
  shouldProceed: boolean;
  reason: IdempotencyReason;
  programId?: string;
  status?: "COMPLETE" | "IN_PROGRESS";
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
 * @param session - The program designer session to check
 * @returns IdempotencyCheckResult indicating whether to proceed and why
 */
export const checkProgramGenerationIdempotency = (
  session: ProgramDesignerSession,
): IdempotencyCheckResult => {
  const existingGeneration = session.programGeneration;

  // Check if program already exists (COMPLETE status)
  if (
    existingGeneration?.status === "COMPLETE" &&
    existingGeneration?.programId
  ) {
    return {
      shouldProceed: false,
      reason: IDEMPOTENCY_REASONS.ALREADY_COMPLETE,
      programId: existingGeneration.programId,
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
 * Create a session update object that sets the distributed lock for program generation
 *
 * This MUST be saved to DynamoDB BEFORE triggering the async Lambda to prevent race conditions.
 * The IN_PROGRESS status acts as a distributed lock across multiple Lambda invocations.
 *
 * @param session - The program designer session to lock
 * @returns Updated session object with IN_PROGRESS status and lock metadata
 */
export const createProgramGenerationLock = (
  session: ProgramDesignerSession,
): ProgramDesignerSession => {
  return {
    ...session,
    programGeneration: {
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
 * @param session - The program designer session to reset
 * @param error - The error that caused the failure
 * @returns Updated session object with FAILED status
 */
export const createProgramGenerationFailure = (
  session: ProgramDesignerSession,
  error: Error | unknown,
): ProgramDesignerSession => {
  return {
    ...session,
    programGeneration: {
      status: "FAILED" as const,
      startedAt: session.programGeneration?.startedAt || new Date(),
      failedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    },
    lastActivity: new Date(),
  };
};
