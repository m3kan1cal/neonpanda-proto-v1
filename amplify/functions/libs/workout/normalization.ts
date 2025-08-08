/**
 * Workout Normalization Library
 *
 * This module provides intelligent normalization of workout data
 * to ensure consistent Universal Workout Schema compliance.
 */

import { UniversalWorkoutSchema } from "./types";
import { callBedrockApi } from "../api-helpers";
import { cleanResponse, fixMalformedJson } from "../response-utils";
import { getSchemaWithContext } from "../schemas/universal-workout-schema";

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

COMPLEX WORKOUT NORMALIZATION FOCUS:

1. ROUND CONSISTENCY: Ensure all rounds follow identical structure patterns
   - All rounds must have same field structure (round_number, phase, exercises, etc.)
   - Exercise objects within rounds must be uniformly structured
   - Check for missing fields that should be present in all rounds

2. EXERCISE OBJECT UNIFORMITY: All exercises must have same field structure
   - Consistent field names across all exercise instances
   - Same optional field patterns (e.g., if one exercise has "weight", all should have weight field)
   - Uniform data types for equivalent fields

3. LOGICAL GROUPING: Verify exercises are grouped logically by time domain
   - Warmup exercises should be in "warmup" phase rounds
   - Working sets should be in "working" phase rounds
   - Cooldown/accessory work in "cooldown" phase rounds
   - Don't mix strength and metcon in same round unless explicitly indicated

4. MOVEMENT PROGRESSION: Check for consistent naming of same exercises across rounds
   - "pull-up", "pullup", "pull ups" should be normalized to consistent format
   - Same movement should have identical exercise_name across all rounds
   - Maintain movement standards and variations correctly

5. TIME DOMAIN VALIDATION: Ensure strength and metcon phases are properly separated
   - Heavy strength work should not be mixed with high-intensity metcon
   - Progressive warmup should precede working sets
   - Recovery/accessory work should follow main workout content

CRITICAL FIXES TO PRIORITIZE:
- Inconsistent exercise field structures across rounds
- Misplaced exercises in wrong time domains (strength in metcon rounds)
- Incomplete round objects missing required fields (round_number, exercises array)
- Inconsistent movement naming (normalize to standard format)
- Missing phase markers for complex multi-part workouts
- Incorrect nesting of discipline_specific or coach_notes

${getSchemaWithContext('validation')}

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
  enableThinking: boolean = false
): Promise<NormalizationResult> => {
  try {
    console.info("🔧 Starting workout normalization:", {
      userId,
      workoutId: workoutData.workout_id,
      discipline: workoutData.discipline,
    });

    // Use intelligent normalization for all cases that need normalization
    return await performNormalization(workoutData, userId, enableThinking);
  } catch (error) {
    console.error("Normalization failed:", error);
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
  enableThinking: boolean = false
): Promise<NormalizationResult> => {
  try {
    const normalizationPrompt = buildNormalizationPrompt(workoutData);

    console.info("Normalization call configuration:", {
      enableThinking,
      promptLength: normalizationPrompt.length
    });

    const normalizationResponse = await callBedrockApi(
      normalizationPrompt,
      "workout_normalization",
      undefined, // Use default model
      enableThinking
    );

    // Parse JSON with fallback cleaning and fixing
    let normalizationResult;
    try {
      normalizationResult = JSON.parse(normalizationResponse);
    } catch (parseError) {
      console.warn(
        "JSON parsing failed, attempting to clean and fix response..."
      );
      try {
        const cleanedResponse = cleanResponse(normalizationResponse);
        const fixedResponse = fixMalformedJson(cleanedResponse);
        normalizationResult = JSON.parse(fixedResponse);
        console.info("Successfully parsed response after cleaning and fixing");
      } catch (fallbackError) {
        console.error(
          "Failed to parse normalization response after all attempts:",
          {
            originalResponse: normalizationResponse.substring(0, 500),
            parseError:
              parseError instanceof Error
                ? parseError.message
                : "Unknown error",
            fallbackError:
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unknown error",
          }
        );
        throw new Error(
          `Invalid JSON response: ${parseError instanceof Error ? parseError.message : "Parse failed"}`
        );
      }
    }

    // Validate the response structure
    if (!normalizationResult || typeof normalizationResult !== "object") {
      throw new Error("Response is not a valid object");
    }

    if (
      !normalizationResult.hasOwnProperty("isValid") ||
      !normalizationResult.hasOwnProperty("normalizedData")
    ) {
      throw new Error(
        "Response missing required fields (isValid, normalizedData)"
      );
    }

    // Add normalized flag
    if (normalizationResult.normalizedData?.metadata?.validation_flags) {
      if (
        !normalizationResult.normalizedData.metadata.validation_flags.includes(
          "normalized"
        )
      ) {
        normalizationResult.normalizedData.metadata.validation_flags.push(
          "normalized"
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
    console.error("Normalization failed:", error);
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
 * Performs a quick structural validation to check if workout has correct root-level properties
 * Returns true if structure is valid, false if normalization is needed
 */
const hasCorrectRootStructure = (workoutData: any): boolean => {
  // Expected root-level properties based on Universal Workout Schema v2.0
  const expectedRootProperties = [
    'workout_id', 'user_id', 'date', 'discipline', 'methodology',
    'workout_name', 'workout_type', 'duration', 'location',
    'coach_id', 'conversation_id', 'performance_metrics',
    'discipline_specific', 'pr_achievements', 'subjective_feedback',
    'environmental_factors', 'recovery_metrics', 'coach_notes', 'metadata'
  ];

  // Check for critical structural issues (fields in wrong places)
  const structuralIssues = [
    // coach_notes should be at root level, not in discipline_specific
    workoutData.discipline_specific?.coach_notes,
    // discipline_specific should be at root level, not in performance_metrics
    workoutData.performance_metrics?.discipline_specific,
    // performance_metrics should be at root level, not in discipline_specific
    workoutData.discipline_specific?.performance_metrics
  ];

  // If any structural issues exist, normalization is needed
  if (structuralIssues.some(issue => issue !== undefined)) {
    return false;
  }

  // Check if core required root properties exist at root level
  const coreProperties = ['workout_id', 'user_id', 'date', 'discipline', 'metadata'];
  const hasCoreProperties = coreProperties.every(prop =>
    workoutData.hasOwnProperty(prop) && workoutData[prop] !== undefined
  );

  if (!hasCoreProperties) {
    return false;
  }

  // Check if coach_notes exists and is at root level (not nested)
  if (workoutData.coach_notes && typeof workoutData.coach_notes === 'object') {
    // coach_notes exists and appears to be structured correctly at root
    return true;
  }

  // Check if discipline_specific exists and is at root level (not nested)
  if (workoutData.discipline_specific && typeof workoutData.discipline_specific === 'object') {
    // discipline_specific exists and appears to be structured correctly at root
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
  extractionConfidence: number
): boolean => {
  // First, do a quick structural check
  const hasCorrectStructure = hasCorrectRootStructure(workoutData);

  // Check for complexity indicators that might need normalization
  const isComplex = checkForComplexWorkoutIndicators(workoutData);

  console.info("🔍 Normalization decision analysis:", {
    hasCorrectStructure,
    extractionConfidence,
    isComplex,
    workoutId: workoutData.workout_id,
    discipline: workoutData.discipline
  });

  // If structure is correct and confidence is high, skip normalization (unless complex)
  if (hasCorrectStructure && extractionConfidence > 0.8 && !isComplex) {
    console.info("✅ Skipping normalization: correct structure + high confidence + simple workout");
    return false;
  }

  // Normalize complex workouts even with good structure/confidence for quality assurance
  if (isComplex && hasCorrectStructure && extractionConfidence > 0.7) {
    console.info("🔧 Normalization required: complex workout needs validation");
    return true;
  }

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

  // For medium confidence (0.7-0.8), we already know structure is correct from above
  // so we can skip normalization
  console.info("✅ Skipping normalization: correct structure + medium confidence");
  return false;
};

/**
 * Generates a human-readable summary of normalization results for logging
 */
export const generateNormalizationSummary = (result: NormalizationResult): string => {
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

/**
 * Simple check for complexity indicators that suggest normalization might be beneficial
 */
const checkForComplexWorkoutIndicators = (workoutData: any): boolean => {
  // Check for multiple rounds (potential complexity)
  const roundCount = workoutData.discipline_specific?.crossfit?.rounds?.length || 0;
  if (roundCount > 5) return true;

  // Check for multiple phases
  const rounds = workoutData.discipline_specific?.crossfit?.rounds || [];
  const phases = new Set(rounds.map((r: any) => r.phase).filter(Boolean));
  if (phases.size > 2) return true;

  // Check for exercise count complexity
  const totalExercises = rounds.reduce((count: number, round: any) =>
    count + (round.exercises?.length || 0), 0);
  if (totalExercises > 8) return true;

  // Check for many different movements
  const allExercises = rounds.flatMap((r: any) => r.exercises || []);
  const exerciseNames = allExercises.map((e: any) => e.exercise_name?.toLowerCase()).filter(Boolean);
  const uniqueExercises = new Set(exerciseNames);
  if (uniqueExercises.size > 5) return true;

  return false;
};
