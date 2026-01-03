/**
 * Workout Normalization Library
 *
 * This module provides intelligent normalization of workout data
 * to ensure consistent Universal Workout Schema compliance.
 *
 * Architecture follows Coach Creator pattern:
 * - Uses generateNormalization helper from tool-generation.ts
 * - NO fallback patterns - let errors propagate
 * - Nova 2 Lite for tool-based normalization
 */

import { UniversalWorkoutSchema } from "./types";
import { generateNormalization } from "./tool-generation";

export interface NormalizationResult {
  isValid: boolean;
  normalizedData: UniversalWorkoutSchema;
  issues: NormalizationIssue[];
  confidence: number;
  summary: string;
  normalizationMethod: "tool" | "skipped";
}

export interface NormalizationIssue {
  type: "structure" | "data_quality" | "cross_reference";
  severity: "error" | "warning";
  field: string;
  description: string;
  corrected: boolean;
}

/**
 * Normalizes workout data to ensure Universal Workout Schema compliance
 *
 * Following Coach Creator pattern:
 * - Uses generateNormalization helper with tool config
 * - NO fallback - let errors propagate to agent level
 * - Agent handles errors via its handleToolUse override
 */
export const normalizeWorkout = async (
  workoutData: any,
  userId: string,
  enableThinking: boolean = false,
): Promise<NormalizationResult> => {
  console.info("🔧 Starting workout normalization:", {
    userId,
    workoutId: workoutData.workout_id,
    discipline: workoutData.discipline,
  });

  // Use generateNormalization helper - NO fallback
  // Following Coach Creator pattern exactly
  const toolResult = await generateNormalization({
    workoutData,
    userId,
    enableThinking,
  });

  // Add normalized flag to metadata
  if (!toolResult.normalizedData.metadata) {
    toolResult.normalizedData.metadata = {} as any;
  }
  if (!toolResult.normalizedData.metadata.validation_flags) {
    toolResult.normalizedData.metadata.validation_flags = [];
  }
  if (
    !toolResult.normalizedData.metadata.validation_flags.includes("normalized")
  ) {
    toolResult.normalizedData.metadata.validation_flags.push("normalized");
  }

  console.info("✅ Normalization complete:", {
    isValid: toolResult.isValid,
    issuesFound: toolResult.issues.length,
    correctionsMade: toolResult.issues.filter((i) => i.corrected).length,
    confidence: toolResult.confidence,
  });

  return {
    isValid: toolResult.isValid,
    normalizedData: toolResult.normalizedData,
    issues: toolResult.issues,
    confidence: toolResult.confidence,
    summary: toolResult.summary,
    normalizationMethod: "tool",
  };
};

/**
 * Performs a quick structural validation to check if workout has correct root-level properties
 * Returns true if structure is valid, false if normalization is needed
 */
const hasCorrectRootStructure = (workoutData: any): boolean => {
  // Check for critical structural issues (fields in wrong places)
  const structuralIssues = [
    // coach_notes should be at root level, not in discipline_specific
    workoutData.discipline_specific?.coach_notes,
    // discipline_specific should be at root level, not in performance_metrics
    workoutData.performance_metrics?.discipline_specific,
    // performance_metrics should be at root level, not in discipline_specific
    workoutData.discipline_specific?.performance_metrics,
  ];

  // If any structural issues exist, normalization is needed
  if (structuralIssues.some((issue) => issue !== undefined)) {
    return false;
  }

  // Check if core required root properties exist at root level
  const coreProperties = [
    "workout_id",
    "user_id",
    "date",
    "discipline",
    "metadata",
  ];
  const hasCoreProperties = coreProperties.every(
    (prop) =>
      workoutData.hasOwnProperty(prop) && workoutData[prop] !== undefined,
  );

  if (!hasCoreProperties) {
    return false;
  }

  // Check if coach_notes exists and is at root level (not nested)
  if (workoutData.coach_notes && typeof workoutData.coach_notes === "object") {
    return true;
  }

  // Check if discipline_specific exists and is at root level (not nested)
  if (
    workoutData.discipline_specific &&
    typeof workoutData.discipline_specific === "object"
  ) {
    return true;
  }

  // If we get here, basic structure looks correct
  return true;
};

/**
 * Determines if workout needs normalization based on confidence and structural issues
 */
export const shouldNormalizeWorkout = (
  workoutData: any,
  extractionConfidence: number,
  completeness?: number,
): boolean => {
  // First, do a quick structural check
  const hasCorrectStructure = hasCorrectRootStructure(workoutData);

  // Check for complexity indicators that might need normalization
  const isComplex = checkForComplexWorkoutIndicators(workoutData);

  console.info("🔍 Normalization decision analysis:", {
    hasCorrectStructure,
    extractionConfidence,
    completeness,
    isComplex,
    workoutId: workoutData.workout_id,
    discipline: workoutData.discipline,
  });

  // If structure is incorrect, always normalize regardless of confidence
  if (!hasCorrectStructure) {
    console.info("🔧 Normalization required: structural issues detected");
    return true;
  }

  // Always normalize low confidence extractions
  if (extractionConfidence < 0.7) {
    console.info("🔧 Normalization required: low confidence extraction");
    return true;
  }

  // Skip normalization for very high confidence extractions (>= 0.95)
  // Even complex workouts don't need normalization if AI is highly confident
  if (extractionConfidence >= 0.95 && hasCorrectStructure) {
    console.info(
      "✅ Skipping normalization: very high confidence extraction (>= 0.95)",
      {
        extractionConfidence,
        isComplex,
        completeness: completeness || "not provided",
      },
    );
    return false;
  }

  // Normalize complex workouts with medium-high confidence for quality assurance
  // Only if confidence is between 0.7 and 0.95
  if (isComplex && hasCorrectStructure && extractionConfidence >= 0.7) {
    console.info(
      "🔧 Normalization required: complex workout needs validation (confidence < 0.95)",
      {
        extractionConfidence,
      },
    );
    return true;
  }

  // CRITICAL: Consider completeness for enrichment
  // Even with perfect structure (high confidence), bare-bones data needs enrichment
  if (completeness !== undefined && completeness < 0.65) {
    console.info(
      "🔧 Normalization required: low completeness (needs enrichment)",
      {
        completeness,
        threshold: 0.65,
      },
    );
    return true;
  }

  // If structure is correct, confidence is high, and completeness is good, skip normalization
  if (hasCorrectStructure && extractionConfidence > 0.8 && !isComplex) {
    console.info(
      "✅ Skipping normalization: correct structure + high confidence + good completeness + simple workout",
      {
        completeness: completeness || "not provided",
      },
    );
    return false;
  }

  // For medium confidence (0.7-0.8), we already know structure is correct from above
  // so we can skip normalization if completeness is acceptable
  console.info(
    "✅ Skipping normalization: correct structure + medium confidence",
  );
  return false;
};

/**
 * Generates a human-readable summary of normalization results for logging
 */
export const generateNormalizationSummary = (
  result: NormalizationResult,
): string => {
  const { isValid, issues, confidence, normalizationMethod } = result;

  let summary = `Normalization ${isValid ? "PASSED" : "FAILED"} (confidence: ${confidence.toFixed(2)}, method: ${normalizationMethod})`;

  if (issues.length > 0) {
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    const corrections = issues.filter((i) => i.corrected);

    if (errors.length > 0) {
      summary += `\nErrors (${errors.length}): ${errors.map((e) => e.field).join(", ")}`;
    }

    if (warnings.length > 0) {
      summary += `\nWarnings (${warnings.length}): ${warnings.map((w) => w.field).join(", ")}`;
    }

    if (corrections.length > 0) {
      summary += `\nNormalized (${corrections.length}): ${corrections.map((c) => c.field).join(", ")}`;
    }
  }

  return summary;
};

/**
 * Simple check for complexity indicators that suggest normalization might be beneficial
 */
const checkForComplexWorkoutIndicators = (workoutData: any): boolean => {
  // Check for multiple rounds (potential complexity)
  const roundCount =
    workoutData.discipline_specific?.crossfit?.rounds?.length || 0;
  if (roundCount > 5) return true;

  // Check for multiple phases
  const rounds = workoutData.discipline_specific?.crossfit?.rounds || [];
  const phases = new Set(rounds.map((r: any) => r.phase).filter(Boolean));
  if (phases.size > 2) return true;

  // Check for exercise count complexity
  const totalExercises = rounds.reduce(
    (count: number, round: any) => count + (round.exercises?.length || 0),
    0,
  );
  if (totalExercises > 8) return true;

  // Check for many different movements
  const allExercises = rounds.flatMap((r: any) => r.exercises || []);
  const exerciseNames = allExercises
    .map((e: any) => e.exercise_name?.toLowerCase())
    .filter(Boolean);
  const uniqueExercises = new Set(exerciseNames);
  if (uniqueExercises.size > 5) return true;

  return false;
};
