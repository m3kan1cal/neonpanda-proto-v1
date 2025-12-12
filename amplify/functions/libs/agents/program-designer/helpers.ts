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
    conversationId: string;
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
 * Validate program completeness
 * Checks if program has all required fields and phases are valid
 */
export function validateProgramCompleteness(
  program: Program,
  workoutTemplates: WorkoutTemplate[],
): {
  isComplete: boolean;
  missingFields: string[];
  issues: string[];
} {
  const missingFields: string[] = [];
  const issues: string[] = [];

  // Check required program fields
  if (!program.programId) missingFields.push("programId");
  if (!program.name) missingFields.push("name");
  if (!program.startDate) missingFields.push("startDate");
  if (!program.endDate) missingFields.push("endDate");
  if (!program.totalDays) missingFields.push("totalDays");
  if (!program.phases || program.phases.length === 0) {
    missingFields.push("phases");
  }

  // Check phase continuity
  if (program.phases && program.phases.length > 0) {
    const sortedPhases = [...program.phases].sort(
      (a, b) => a.startDay - b.startDay,
    );

    // First phase should start at day 1
    if (sortedPhases[0].startDay !== 1) {
      issues.push(
        `First phase starts at day ${sortedPhases[0].startDay}, should start at day 1`,
      );
    }

    // Check for gaps between phases
    for (let i = 0; i < sortedPhases.length - 1; i++) {
      const currentPhase = sortedPhases[i];
      const nextPhase = sortedPhases[i + 1];

      if (currentPhase.endDay + 1 !== nextPhase.startDay) {
        issues.push(
          `Gap between phase "${currentPhase.name}" (ends day ${currentPhase.endDay}) and "${nextPhase.name}" (starts day ${nextPhase.startDay})`,
        );
      }
    }

    // Last phase should end at totalDays
    const lastPhase = sortedPhases[sortedPhases.length - 1];
    if (lastPhase.endDay !== program.totalDays) {
      issues.push(
        `Last phase ends at day ${lastPhase.endDay}, but program totalDays is ${program.totalDays}`,
      );
    }
  }

  // Check workout templates
  if (!workoutTemplates || workoutTemplates.length === 0) {
    issues.push("No workout templates generated");
  } else {
    // Check that all workout templates have required fields
    workoutTemplates.forEach((template, index) => {
      if (!template.templateId) {
        issues.push(`Workout template ${index} missing templateId`);
      }
      if (!template.dayNumber) {
        issues.push(`Workout template ${index} missing dayNumber`);
      }
      if (!template.description) {
        issues.push(`Workout template ${index} missing description`);
      }
    });
  }

  return {
    isComplete: missingFields.length === 0 && issues.length === 0,
    missingFields,
    issues,
  };
}

/**
 * Calculate program confidence score
 * Based on completeness, phase structure, and workout templates
 */
export function calculateProgramConfidence(
  program: Program,
  workoutTemplates: WorkoutTemplate[],
): number {
  let score = 1.0;

  // Validate program completeness
  const validation = validateProgramCompleteness(program, workoutTemplates);

  // Deduct for missing fields
  score -= validation.missingFields.length * 0.1;

  // Deduct for structural issues
  score -= validation.issues.length * 0.05;

  // Deduct if no workout templates
  if (!workoutTemplates || workoutTemplates.length === 0) {
    score -= 0.3;
  }

  // Deduct if workout count doesn't match program days * frequency
  const expectedWorkouts = Math.floor(
    (program.totalDays / 7) * program.trainingFrequency,
  );
  const actualWorkouts = workoutTemplates?.length || 0;
  const workoutDifference = Math.abs(expectedWorkouts - actualWorkouts);

  if (workoutDifference > expectedWorkouts * 0.2) {
    // More than 20% off
    score -= 0.2;
  } else if (workoutDifference > expectedWorkouts * 0.1) {
    // More than 10% off
    score -= 0.1;
  }

  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Enforce blocking decisions from validation
 *
 * Code-level enforcement that prevents normalize_program_data and
 * save_program_to_database from executing when validation returned
 * isValid: false. This ensures blocking decisions are AUTHORITATIVE,
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
  validationIssues?: string[];
} | null => {
  // No validation result yet, allow tool to proceed
  if (!validationResult) {
    return null;
  }

  // Validation passed, allow tool to proceed
  if (validationResult.isValid !== false) {
    return null;
  }

  // Block normalize_program_data if validation failed
  if (toolId === "normalize_program_data") {
    console.error(
      "⛔ BLOCKING normalize_program_data: Validation returned isValid=false",
      {
        validationIssues: validationResult.validationIssues,
        toolAttempted: toolId,
      },
    );

    return {
      error: true,
      blocked: true,
      reason: `Cannot normalize program - validation failed: ${validationResult.validationIssues?.join(", ") || "Unknown issues"}`,
      validationIssues: validationResult.validationIssues,
    };
  }

  // Block save_program_to_database if validation failed
  if (toolId === "save_program_to_database") {
    console.error(
      "⛔ BLOCKING save_program_to_database: Validation returned isValid=false",
      {
        validationIssues: validationResult.validationIssues,
        toolAttempted: toolId,
      },
    );

    return {
      error: true,
      blocked: true,
      reason: `Cannot save program - validation failed: ${validationResult.validationIssues?.join(", ") || "Unknown issues"}`,
      validationIssues: validationResult.validationIssues,
    };
  }

  // Tool is not subject to blocking enforcement
  return null;
};

/**
 * Build context string from Pinecone results
 */
export function buildPineconeContextString(pineconeMatches: any[]): string {
  if (!pineconeMatches || pineconeMatches.length === 0) {
    return "";
  }

  return pineconeMatches
    .map((match) => match.content || "")
    .filter((content) => content.length > 0)
    .join("\n\n");
}
