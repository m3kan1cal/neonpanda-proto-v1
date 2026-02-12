/**
 * Workout Normalization Library
 *
 * This module provides intelligent normalization of workout data
 * to ensure consistent Universal Workout Schema compliance.
 */

import { UniversalWorkoutSchema } from "./types";
import { callBedrockApi, TEMPERATURE_PRESETS } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { WORKOUT_SCHEMA } from "../schemas/workout-schema";
import { logger } from "../logger";

export interface NormalizationResult {
  isValid: boolean;
  normalizedData: UniversalWorkoutSchema;
  issues: NormalizationIssue[];
  confidence: number;
  summary: string;
  normalizationMethod: "ai" | "skipped";
}

export interface NormalizationIssue {
  type: "structure" | "data_quality" | "cross_reference";
  severity: "error" | "warning";
  field: string;
  description: string;
  corrected: boolean;
}

/**
 * Builds AI normalization prompt that instructs the model to normalize
 * workout data against the Universal Workout Schema v2.0
 */
export const buildNormalizationPrompt = (workoutData: any): string => {
  return `
You are a workout data normalizer. Your job is to:

1. ANALYZE the workout data against the Universal Workout Schema v2.0
2. NORMALIZE the structure to match the schema exactly
3. FIX any structural or data issues found
4. RETURN properly formatted workout data that conforms to the schema

CRITICAL INSTRUCTIONS:
- Transform the input data to match the Universal Workout Schema v2.0 structure exactly
- Move misplaced fields to their correct locations as defined in the schema
- Preserve all existing data - only restructure, don't lose information
- Fix data type inconsistencies (ensure numbers are numbers, arrays are arrays, etc.)
- Don't add placeholder values for truly missing optional fields
- Ensure the output is a complete, valid workout object matching the schema

RESPONSE REQUIREMENTS:
- Return ONLY valid JSON - no markdown, no code blocks, no explanations
- Do not wrap the JSON in \`\`\`json blocks
- Start directly with { and end with }
- Ensure all JSON is properly escaped and parseable

VALIDATION CONTEXT:
Analyze this workout data for schema compliance and fix any structural issues you find.

VALIDATION APPROACH:
- Only fix actual problems, don't add missing fields unless they contain misplaced data
- Preserve all existing data, just move it to the correct location if needed
- Don't create default/placeholder values for missing optional fields
- Focus on structural correctness and data integrity

COMMON ISSUES TO FIX:
1. coach_notes misplaced inside discipline_specific (should be at root level)
2. discipline_specific misplaced inside performance_metrics (should be at root level)
3. Inconsistent round counts in CrossFit workouts
4. Invalid data ranges or types that break the schema

UNIVERSAL WORKOUT SCHEMA v2.0 (Complete Structure):
${JSON.stringify(WORKOUT_SCHEMA, null, 2)}

EXPECTED OUTPUT FORMAT:
You must return a JSON object with this exact structure:

{
  "isValid": boolean,
  "normalizedData": UniversalWorkoutSchema,
  "issues": [
    {
      "type": "structure|data_quality|cross_reference",
      "severity": "error|warning",
      "field": "field.path",
      "description": "Clear description of issue",
      "corrected": boolean
    }
  ],
  "confidence": number (0-1),
  "summary": "Brief summary of normalization results and any corrections made"
}

The "normalizedData" field MUST contain the workout data normalized to match the Universal Workout Schema v2.0 structure exactly.

WORKOUT DATA TO NORMALIZE:
${JSON.stringify(workoutData, null, 2)}

Transform this workout data to conform to the Universal Workout Schema v2.0 and return the normalization response in the exact JSON format specified above. Do not include any markdown formatting.`;
};

/**
 * Normalizes workout data to ensure Universal Workout Schema compliance
 * Only normalizes if structural issues are detected or confidence is low
 */
export const normalizeWorkout = async (
  workoutData: any,
  userId: string,
): Promise<NormalizationResult> => {
  try {
    logger.info("🔧 Starting workout normalization:", {
      userId,
      workoutId: workoutData.workout_id,
      discipline: workoutData.discipline,
    });

    // Use intelligent normalization for all cases that need normalization
    return await performNormalization(workoutData, userId);
  } catch (error) {
    logger.error("Normalization failed:", error);
    return {
      isValid: false,
      normalizedData: workoutData as UniversalWorkoutSchema,
      issues: [
        {
          type: "structure",
          severity: "error",
          field: "normalization_system",
          description: `Normalization error: ${error instanceof Error ? error.message : "Unknown error"}`,
          corrected: false,
        },
      ],
      confidence: 0.3,
      summary: "Normalization failed due to system error",
      normalizationMethod: "ai",
    };
  }
};

/**
 * Perform normalization of workout data
 */
const performNormalization = async (
  workoutData: any,
  userId: string,
): Promise<NormalizationResult> => {
  try {
    const normalizationPrompt = buildNormalizationPrompt(workoutData);
    const normalizationResponse = (await callBedrockApi(
      normalizationPrompt,
      "workout_normalization",
      undefined,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
      },
    )) as string; // No tools used, always returns string

    // Parse JSON with cleaning and fixing (handles markdown-wrapped JSON and common issues)
    const normalizationResult = parseJsonWithFallbacks(normalizationResponse);

    // Validate the response structure
    if (!normalizationResult || typeof normalizationResult !== "object") {
      throw new Error("Response is not a valid object");
    }

    if (
      !normalizationResult.hasOwnProperty("isValid") ||
      !normalizationResult.hasOwnProperty("normalizedData")
    ) {
      throw new Error(
        "Response missing required fields (isValid, normalizedData)",
      );
    }

    // Add normalized flag
    if (normalizationResult.normalizedData?.metadata?.validation_flags) {
      if (
        !normalizationResult.normalizedData.metadata.validation_flags.includes(
          "normalized",
        )
      ) {
        normalizationResult.normalizedData.metadata.validation_flags.push(
          "normalized",
        );
      }
    }

    return {
      isValid: normalizationResult.isValid || false,
      normalizedData: normalizationResult.normalizedData || workoutData,
      issues: normalizationResult.issues || [],
      confidence: normalizationResult.confidence || 0.8,
      summary: normalizationResult.summary || "Normalization completed",
      normalizationMethod: "ai",
    };
  } catch (error) {
    logger.error("Normalization failed:", error);
    return {
      isValid: false,
      normalizedData: workoutData as UniversalWorkoutSchema,
      issues: [
        {
          type: "structure",
          severity: "error",
          field: "normalization",
          description: `Normalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          corrected: false,
        },
      ],
      confidence: 0.3,
      summary: "Normalization failed, using original data",
      normalizationMethod: "ai",
    };
  }
};

/**
 * Determines if workout needs normalization based on confidence and structural issues
 */
export const shouldNormalizeWorkout = (
  workoutData: any,
  extractionConfidence: number,
): boolean => {
  // Always normalize low confidence extractions
  if (extractionConfidence < 0.7) {
    return true;
  }

  // Skip normalization for high confidence extractions with no obvious issues
  if (extractionConfidence > 0.9) {
    // Still check for critical structural issues even with high confidence
    const hasCriticalIssues =
      workoutData.discipline_specific?.coach_notes || // coach_notes in wrong place
      workoutData.performance_metrics?.discipline_specific; // discipline_specific nested incorrectly
    return hasCriticalIssues;
  }

  // For medium confidence (0.7-0.9), normalize if any structural issues detected
  const hasStructuralIssues =
    workoutData.discipline_specific?.coach_notes || // coach_notes misplaced
    workoutData.performance_metrics?.discipline_specific || // discipline_specific nested incorrectly
    !workoutData.metadata || // missing critical metadata
    (workoutData.discipline === "crossfit" &&
      !workoutData.discipline_specific?.crossfit); // missing expected discipline data

  return hasStructuralIssues;
};

/**
 * Generates a human-readable summary of normalization results for logging
 */
export const generateNormalizationSummary = (
  result: NormalizationResult,
): string => {
  const { isValid, issues, confidence, normalizationMethod } = result;

  let summary = `Normalization ${isValid ? "PASSED" : "FAILED"} (confidence: ${confidence.toFixed(2)})`;

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
