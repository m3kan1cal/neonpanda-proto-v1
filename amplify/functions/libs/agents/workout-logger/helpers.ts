/**
 * Workout Logger Agent Helpers
 *
 * Extracted helper functions for workout logger tools to improve testability,
 * reusability, and maintainability.
 */

import { storeDebugDataInS3 } from "../../api-helpers";

/**
 * Enforce blocking decisions from validation
 *
 * Code-level enforcement that prevents normalize_workout_data and
 * save_workout_to_database from executing when validation returned
 * shouldSave: false. This ensures blocking decisions are AUTHORITATIVE,
 * not advisory.
 *
 * Returns error result if tool should be blocked, null if should proceed.
 */
export const enforceValidationBlocking = (
  toolId: string,
  validationResult: any,
): {
  error: boolean;
  blocked: boolean;
  reason: string;
  blockingFlags?: string[];
} | null => {
  // No validation result yet, allow tool to proceed
  if (!validationResult) {
    return null;
  }

  // CASE 1: Validation threw an exception (has error field)
  if (validationResult.error) {
    if (
      toolId === "normalize_workout_data" ||
      toolId === "save_workout_to_database"
    ) {
      console.error(`⛔ BLOCKING ${toolId}: Validation threw exception`, {
        error: validationResult.error,
        toolAttempted: toolId,
      });

      return {
        error: true,
        blocked: true,
        reason: `Cannot ${toolId === "normalize_workout_data" ? "normalize" : "save"} workout - validation failed with error: ${validationResult.error}`,
      };
    }
  }

  // CASE 2: Validation returned shouldSave: false
  if (validationResult.shouldSave === false) {
    // Block normalize_workout_data if validation said don't save
    if (toolId === "normalize_workout_data") {
      console.error(
        "⛔ BLOCKING normalize_workout_data: Validation returned shouldSave=false",
        {
          blockingFlags: validationResult.blockingFlags,
          reason: validationResult.reason,
          toolAttempted: toolId,
        },
      );

      return {
        error: true,
        blocked: true,
        reason: `Cannot normalize workout - validation blocked save: ${validationResult.reason}`,
        blockingFlags: validationResult.blockingFlags,
      };
    }

    // Block save_workout_to_database if validation said don't save
    if (toolId === "save_workout_to_database") {
      console.error(
        "⛔ BLOCKING save_workout_to_database: Validation returned shouldSave=false",
        {
          blockingFlags: validationResult.blockingFlags,
          reason: validationResult.reason,
          toolAttempted: toolId,
        },
      );

      return {
        error: true,
        blocked: true,
        reason: `Cannot save workout - validation blocked save: ${validationResult.reason}`,
        blockingFlags: validationResult.blockingFlags,
      };
    }
  }

  // Tool is not subject to blocking enforcement
  return null;
};

/**
 * Store extraction debug data in S3
 *
 * Centralized helper for storing workout extraction debug information.
 * Handles both successful tool extractions and fallback scenarios.
 */
export const storeExtractionDebugData = async (
  type: "tool-success" | "fallback",
  context: {
    userId: string;
    conversationId: string;
    coachId: string;
    workoutId: string;
  },
  data: {
    workoutData: any;
    method: string;
    hasImages: boolean;
    enableThinking: boolean;
    discipline?: string;
    isComplexWorkout?: boolean;
    toolError?: string;
  },
) => {
  try {
    const debugData = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      conversationId: context.conversationId,
      coachId: context.coachId,
      workoutId: context.workoutId,
      aiGeneration: {
        method: data.method,
        hasImages: data.hasImages,
        enableThinking: data.enableThinking,
      },
      ...(data.toolError && { toolError: data.toolError }),
      workoutData: data.workoutData,
      discipline: data.discipline,
      isComplexWorkout: data.isComplexWorkout,
    };

    const metadata = {
      type:
        type === "tool-success"
          ? "workout-extraction-tool-success"
          : "workout-extraction-fallback",
      method: data.method,
      userId: context.userId,
      conversationId: context.conversationId,
      coachId: context.coachId,
      ...(data.discipline && { discipline: data.discipline }),
      ...(data.isComplexWorkout !== undefined && {
        isComplexWorkout: data.isComplexWorkout,
      }),
      ...(data.toolError && { errorMessage: data.toolError }),
      enableThinking: data.enableThinking,
    };

    await storeDebugDataInS3(
      JSON.stringify(debugData, null, 2),
      metadata,
      "workout-extraction",
    );

    console.info(`✅ Stored ${type} debug data in S3`);
  } catch (err) {
    console.warn(`⚠️ Failed to store ${type} data in S3 (non-critical):`, err);
  }
};
