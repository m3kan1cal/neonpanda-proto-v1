/**
 * Workout Normalization Library
 *
 * This module provides intelligent normalization of workout data
 * to ensure consistent Universal Workout Schema compliance.
 */

import { UniversalWorkoutSchema } from "./types";
import { callBedrockApi, storeDebugDataInS3 } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { NORMALIZATION_RESPONSE_SCHEMA } from "../schemas/workout-normalization-schema";
import { WORKOUT_SCHEMA } from "../schemas/universal-workout-schema";

export interface NormalizationResult {
  isValid: boolean;
  normalizedData: UniversalWorkoutSchema;
  issues: NormalizationIssue[];
  confidence: number;
  summary: string;
  normalizationMethod: "tool" | "fallback" | "skipped";
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

⚠️ CRITICAL: YOUR TOOL RESPONSE MUST INCLUDE ALL REQUIRED FIELDS:

You MUST return a complete tool response with these REQUIRED fields:
- isValid (boolean) - NEVER omit this field
- normalizedData (object) - the complete workout object
- issues (array) - empty array if no issues
- confidence (number 0-1)
- summary (string)

🔴 ISVALID LOGIC - FOLLOW THIS EXACTLY:
- isValid = true  →  IF no issues found (issues array is empty)
- isValid = true  →  IF all issues were corrected (all issues have corrected: true)
- isValid = false →  ONLY IF critical issues could NOT be corrected

TOOL RESPONSE EXAMPLES (showing structure you must return):

Example 1 - Perfect data with no issues:
{
  "isValid": true,
  "normalizedData": { ...complete workout object... },
  "issues": [],
  "confidence": 1.0,
  "summary": "Data is valid, no issues found"
}

Example 2 - Found and fixed 2 issues:
{
  "isValid": true,
  "normalizedData": { ...corrected workout object... },
  "issues": [
    {"type":"structure","severity":"error","field":"coach_notes","description":"Moved to root level","corrected":true},
    {"type":"data_quality","severity":"warning","field":"rounds_completed","description":"Fixed count","corrected":true}
  ],
  "confidence": 0.95,
  "summary": "Fixed 2 issues - data is now valid"
}

Example 3 - Found uncorrectable issue:
{
  "isValid": false,
  "normalizedData": { ...original workout object... },
  "issues": [
    {"type":"structure","severity":"error","field":"required_field","description":"Missing critical data","corrected":false}
  ],
  "confidence": 0.6,
  "summary": "Critical issue could not be corrected"
}

CRITICAL INSTRUCTIONS:
- Transform the input data to match the Universal Workout Schema v2.0 structure exactly
- Move misplaced fields to their correct locations as defined in the schema
- Preserve all existing data - only restructure, don't lose information
- Fix data type inconsistencies (ensure numbers are numbers, arrays are arrays, etc.)
- Don't add placeholder values for truly missing optional fields
- Ensure the output is a complete, valid workout object matching the schema

NORMALIZATION FOCUS:

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

═══════════════════════════════════════════════════════════════════════
UNIVERSAL WORKOUT SCHEMA V2.0 - YOUR REFERENCE DOCUMENT
═══════════════════════════════════════════════════════════════════════

This is the schema that the workout data MUST conform to. Use this as your
reference when identifying issues and normalizing the data structure.

${JSON.stringify(WORKOUT_SCHEMA, null, 2)}

═══════════════════════════════════════════════════════════════════════
WORKOUT DATA TO NORMALIZE
═══════════════════════════════════════════════════════════════════════
${JSON.stringify(workoutData, null, 2)}

📋 YOUR TASK:
1. Analyze this workout data against Universal Workout Schema v2.0
2. Identify any structural or data quality issues
3. Fix/normalize any issues found
4. Return the COMPLETE tool response with ALL required fields

🎯 REMINDER - Your tool response MUST include:
- isValid: true (if 0 issues OR all corrected) OR false (if uncorrected issues exist)
- normalizedData: { complete workout object }
- issues: [ array of issues found, empty if none ]
- confidence: 0.0-1.0
- summary: "brief description of what was done"

DO NOT omit any required fields, especially isValid!`;
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
      normalizationMethod: "skipped",
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

    let normalizationResult: any;
    let normalizationMethod: "tool" | "fallback" = "tool";

    // PRIMARY: Tool-based normalization with schema enforcement
    console.info("🎯 Attempting tool-based workout normalization");

    try {
      const result = await callBedrockApi(
        normalizationPrompt,
        "workout_normalization",
        undefined, // Use default model
        {
          enableThinking,
          tools: {
            name: 'normalize_workout',
            description: 'Normalize workout data to conform to the Universal Workout Schema v2.0',
            inputSchema: NORMALIZATION_RESPONSE_SCHEMA
          },
          expectedToolName: 'normalize_workout'
        }
      );

      if (typeof result === 'object' && result !== null) {
        console.info("✅ Tool-based normalization succeeded");
        normalizationResult = result;
        normalizationMethod = "tool";
      } else {
        throw new Error("Tool did not return structured data");
      }
    } catch (toolError) {
      // FALLBACK: Text-based normalization with parsing
      console.warn("⚠️ Tool-based normalization failed, using fallback:", toolError);
      normalizationMethod = "fallback";

      const fallbackResponse = await callBedrockApi(
        normalizationPrompt,
        "workout_normalization",
        undefined,
        { enableThinking }
      ) as string;

      // Store debug data for fallback cases
      await storeDebugDataInS3(
        fallbackResponse,
        {
          type: 'normalization_fallback',
          workoutId: workoutData.workout_id,
          userId: workoutData.user_id,
          discipline: workoutData.discipline,
          error: toolError instanceof Error ? toolError.message : String(toolError)
        },
        'normalization-fallback'
      );

      normalizationResult = parseJsonWithFallbacks(fallbackResponse);

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
    }

    console.info(
      `Normalization completed: { method: '${normalizationMethod}', isValid: ${normalizationResult.isValid}, issues: ${normalizationResult.issues?.length || 0} }`
    );

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

    // Smart defaulting for isValid when AI doesn't provide it
    // If isValid is undefined AND there are no issues (or all issues corrected), default to true
    const issues = normalizationResult.issues || [];
    const allIssuesCorrected = issues.length === 0 || issues.every((issue: any) => issue.corrected === true);
    const isValidResult = normalizationResult.isValid !== undefined
      ? normalizationResult.isValid
      : allIssuesCorrected; // Default to true if no issues or all corrected

    return {
      isValid: isValidResult,
      normalizedData: normalizationResult.normalizedData || workoutData,
      issues: issues,
      confidence: normalizationResult.confidence || 0.8,
      summary: normalizationResult.summary || "Normalization completed",
      normalizationMethod,
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
      normalizationMethod: "skipped",
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
