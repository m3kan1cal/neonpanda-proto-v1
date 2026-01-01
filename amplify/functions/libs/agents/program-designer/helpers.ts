/**
 * Program Designer Agent Helpers
 *
 * Helper functions for the program designer agent.
 */

import type { Program, WorkoutTemplate } from "../../program/types";
import { storeDebugDataInS3 } from "../../api-helpers";

/**
 * Store program generation debug data in S3
 *
 * Centralized helper for storing program generation debug information.
 * Handles phase structure, phase workouts, success, and error scenarios.
 */
export const storeGenerationDebugData = async (
  type: "phase-structure" | "phase-workouts" | "success" | "error",
  context: {
    userId: string;
    conversationId?: string; // Optional: Not used for program designer sessions
    coachId: string;
    programId: string;
    sessionId: string;
  },
  data: {
    todoList?: any;
    conversationContext?: string;
    programStructure?: any;
    phaseStructure?: any;
    phaseWorkouts?: any;
    method?: string;
    enableThinking?: boolean;
    generationError?: string;
    [key: string]: any; // Allow additional fields
  },
) => {
  try {
    const debugData = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      conversationId: context.conversationId,
      coachId: context.coachId,
      programId: context.programId,
      sessionId: context.sessionId,
      ...(data.todoList && {
        todoListSummary: {
          trainingGoals: data.todoList.trainingGoals?.value,
          programDuration: data.todoList.programDuration?.value,
          trainingFrequency: data.todoList.trainingFrequency?.value,
          equipmentAccess: data.todoList.equipmentAccess?.value,
          experienceLevel: data.todoList.experienceLevel?.value,
        },
      }),
      ...(data.conversationContext && {
        conversationContextPreview: data.conversationContext.substring(0, 200),
      }),
      aiGeneration: {
        method: data.method,
        enableThinking: data.enableThinking,
      },
      ...(data.generationError && { generationError: data.generationError }),
      ...(data.programStructure && { programStructure: data.programStructure }),
      ...(data.phaseStructure && { phaseStructure: data.phaseStructure }),
      ...(data.phaseWorkouts && { phaseWorkouts: data.phaseWorkouts }),
      // Include any additional data fields
      ...Object.keys(data).reduce((acc, key) => {
        if (
          ![
            "todoList",
            "conversationContext",
            "method",
            "enableThinking",
            "generationError",
            "programStructure",
            "phaseStructure",
            "phaseWorkouts",
          ].includes(key)
        ) {
          acc[key] = data[key];
        }
        return acc;
      }, {} as any),
    };

    const metadata = {
      type:
        type === "success"
          ? "program-generation-success"
          : type === "error"
            ? "program-generation-error"
            : `program-generation-${type}`,
      userId: context.userId,
      conversationId: context.conversationId,
      coachId: context.coachId,
      programId: context.programId,
      sessionId: context.sessionId,
      ...(data.method && { method: data.method }),
      ...(data.enableThinking !== undefined && {
        enableThinking: data.enableThinking,
      }),
      ...(data.generationError && { errorMessage: data.generationError }),
    };

    await storeDebugDataInS3(
      JSON.stringify(debugData, null, 2),
      metadata,
      "program",
    );

    console.info(`✅ Stored ${type} debug data in S3`);
  } catch (err) {
    console.warn(`⚠️ Failed to store ${type} data in S3 (non-critical):`, err);
  }
};

/**
 * Calculate program metrics from workout templates
 * Shared by validation tool and result building
 */
export function calculateProgramMetrics(workoutTemplates: any[]): {
  totalWorkoutTemplates: number;
  uniqueTrainingDays: number;
  averageSessionsPerDay: string;
} {
  const totalWorkoutTemplates = workoutTemplates.length;
  const uniqueTrainingDays = new Set(
    workoutTemplates.map((w: any) => w.dayNumber),
  ).size;
  const averageSessionsPerDay =
    uniqueTrainingDays > 0
      ? (totalWorkoutTemplates / uniqueTrainingDays).toFixed(1)
      : "0.0";

  return {
    totalWorkoutTemplates,
    uniqueTrainingDays,
    averageSessionsPerDay,
  };
}

/**
 * Enforce all blocking decisions from validation and normalization
 * Prevents save_program_to_database when validation or normalization failed
 *
 * Code-level enforcement that ensures blocking decisions are AUTHORITATIVE,
 * not advisory.
 *
 * Returns error result if tool should be blocked, null if should proceed.
 */
export const enforceAllBlocking = (
  toolId: string,
  validationResult: any,
  normalizationResult: any,
): {
  error: boolean;
  blocked: boolean;
  reason: string;
  validationIssues?: string[];
  normalizationIssues?: {
    issuesFound: number;
    correctionsMade: number;
    remainingIssues: number;
  };
} | null => {
  // No results yet, allow tool to proceed
  if (!validationResult && !normalizationResult) {
    return null;
  }

  // Block save_program_to_database if validation failed
  if (toolId === "save_program_to_database") {
    // CASE 1: Validation threw an exception (has error field instead of isValid)
    if (validationResult && validationResult.error) {
      console.error("⛔ Blocking save: Validation threw exception", {
        error: validationResult.error,
      });

      return {
        error: true,
        blocked: true,
        reason: `Cannot save program - validation failed with error: ${validationResult.error}`,
      };
    }

    // CASE 2: Validation returned isValid: false
    if (validationResult && validationResult.isValid === false) {
      console.error("⛔ Blocking save: Validation failed", {
        validationIssues: validationResult.validationIssues,
      });

      return {
        error: true,
        blocked: true,
        reason: `Cannot save program - validation failed: ${validationResult.validationIssues?.join(", ") || "Unknown issues"}`,
        validationIssues: validationResult.validationIssues,
      };
    }

    // CASE 3: Normalization threw an exception (has error field)
    if (normalizationResult && normalizationResult.error) {
      console.error("⛔ Blocking save: Normalization threw exception", {
        error: normalizationResult.error,
      });

      return {
        error: true,
        blocked: true,
        reason: `Cannot save program - normalization failed with error: ${normalizationResult.error}`,
      };
    }

    // CASE 4: Normalization returned isValid: false
    if (normalizationResult && normalizationResult.isValid === false) {
      console.warn("⛔ Blocking save: Normalization failed", {
        issuesFound: normalizationResult.issuesFound,
        correctionsMade: normalizationResult.correctionsMade,
      });

      return {
        error: true,
        blocked: true,
        reason:
          "Program normalization failed validation. Cannot save invalid program.",
        normalizationIssues: {
          issuesFound: normalizationResult.issuesFound,
          correctionsMade: normalizationResult.correctionsMade,
          remainingIssues:
            normalizationResult.issuesFound -
            normalizationResult.correctionsMade,
        },
      };
    }
  }

  // Tool is not subject to blocking enforcement
  return null;
};
