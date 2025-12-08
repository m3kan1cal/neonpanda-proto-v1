/**
 * Workout Logger Agent Helpers
 *
 * Extracted helper functions for workout logger tools to improve testability,
 * reusability, and maintainability.
 */

import { buildMultimodalContent } from "../../streaming/multimodal-helpers";
import { MESSAGE_TYPES } from "../../coach-conversation/types";
import { storeDebugDataInS3 } from "../../api-helpers";

/**
 * Build multimodal message for workout extraction
 *
 * Constructs a properly formatted message for Bedrock multimodal API
 * with optional images.
 */
export const buildWorkoutExtractionMessage = async (
  userMessage: string,
  imageS3Keys?: string[],
  idSuffix: string = "user",
) => {
  const currentMessage = {
    id: `msg_${Date.now()}_${idSuffix}`,
    role: "user" as const,
    content: userMessage,
    timestamp: new Date(),
    messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
    imageS3Keys: imageS3Keys,
  };

  return await buildMultimodalContent([currentMessage]);
};

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

  // Validation passed, allow tool to proceed
  if (validationResult.shouldSave !== false) {
    return null;
  }

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
