/**
 * Workout Normalization Library
 *
 * This module provides intelligent normalization of workout data
 * to ensure consistent Universal Workout Schema compliance.
 */

import { UniversalWorkoutSchema } from "./types";
import { callBedrockApi, storeDebugDataInS3, MODEL_IDS } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { getCondensedSchema } from "../object-utils";
import { NORMALIZATION_RESPONSE_SCHEMA } from "../schemas/workout-normalization-schema";
import { WORKOUT_SCHEMA } from "../schemas/workout-schema";

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
Normalize workout data to match the Universal Workout Schema v2.0.

RESPONSE FORMAT (all fields required):
{
  "isValid": boolean,  // true if no issues OR all corrected, false if uncorrectable issues
  "normalizedData": object,  // complete normalized workout
  "issues": array,  // [{type, severity, field, description, corrected}] or []
  "confidence": number,  // 0-1
  "summary": string
}

KEY NORMALIZATION RULES:
- Match schema structure exactly, move misplaced fields to correct locations
- Ensure all rounds have identical field structure
- Normalize exercise names consistently across rounds
- Preserve all data, only restructure (don't add placeholders for missing optionals)
- Fix data type inconsistencies

COMMON FIXES:
- coach_notes/discipline_specific misplaced inside other objects (move to root)
- Inconsistent exercise structures across rounds
- Mixed time domains (separate strength from metcon)

═══════════════════════════════════════════════════════════════════════
UNIVERSAL WORKOUT SCHEMA V2.0 - STRUCTURE REFERENCE
═══════════════════════════════════════════════════════════════════════

This is the condensed schema structure (descriptions removed to reduce size).
Focus on field names, types, and required fields for normalization.

${JSON.stringify(getCondensedSchema(WORKOUT_SCHEMA), null, 2)}

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
 * Perform normalization of workout data with two-tier model selection
 *
 * Tier 1 (Haiku 4): Fast structural validation for high-confidence extractions (>= 0.80)
 * Tier 2 (Sonnet 4): Thorough validation for low-confidence or complex cases (< 0.80)
 */
const performNormalization = async (
  workoutData: any,
  userId: string,
  enableThinking: boolean = false
): Promise<NormalizationResult> => {
  try {
    const normalizationPrompt = buildNormalizationPrompt(workoutData);
    const promptSizeKB = (normalizationPrompt.length / 1024).toFixed(1);

    // Determine which model to use based on extraction confidence
    const extractionConfidence = workoutData.metadata?.data_confidence || 0;
    const useHaiku = extractionConfidence >= 0.80;
    const selectedModel = useHaiku
      ? MODEL_IDS.CLAUDE_HAIKU_4_FULL
      : MODEL_IDS.CLAUDE_SONNET_4_FULL;

    console.info("🔀 Two-tier normalization model selection:", {
      extractionConfidence,
      threshold: 0.80,
      selectedTier: useHaiku ? 'Tier 1 (Haiku 4 - Fast)' : 'Tier 2 (Sonnet 4 - Thorough)',
      selectedModel,
      reasoning: useHaiku
        ? 'High confidence extraction - use fast structural validation'
        : 'Low confidence extraction - use thorough validation with deep reasoning'
    });

    console.info("Normalization call configuration:", {
      enableThinking,
      promptLength: normalizationPrompt.length,
      promptSizeKB: `${promptSizeKB}KB`,
      model: useHaiku ? 'Haiku 4' : 'Sonnet 4'
    });

    let normalizationResult: any;
    let normalizationMethod: "tool" | "fallback" = "tool";

    // PRIMARY: Tool-based normalization with schema enforcement
    console.info("🎯 Attempting tool-based workout normalization");

    try {
      const result = await callBedrockApi(
        normalizationPrompt,
        "workout_normalization",
        selectedModel, // Use tier-selected model
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
      // FALLBACK: Text-based normalization with parsing (using same tier-selected model)
      console.warn("⚠️ Tool-based normalization failed, using fallback:", toolError);
      normalizationMethod = "fallback";

      const fallbackResponse = await callBedrockApi(
        normalizationPrompt,
        "workout_normalization",
        selectedModel, // Use same tier-selected model for fallback
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

    const resultConfidence = normalizationResult.confidence || 0.8;

    // AUTO-ESCALATION: If Haiku produced low confidence result, re-run with Sonnet
    if (useHaiku && resultConfidence < 0.6) {
      console.warn("⚠️ Haiku normalization confidence too low, escalating to Sonnet:", {
        haikuConfidence: resultConfidence,
        escalationThreshold: 0.6
      });

      // Re-run with Sonnet
      const sonnetResult = await callBedrockApi(
        normalizationPrompt,
        "workout_normalization",
        MODEL_IDS.CLAUDE_SONNET_4_FULL,
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

      if (typeof sonnetResult === 'object' && sonnetResult !== null) {
        console.info("✅ Escalated to Sonnet - normalization succeeded");
        normalizationResult = sonnetResult;
        normalizationMethod = "tool";
      }
    }

    const finalResult = {
      isValid: isValidResult,
      normalizedData: normalizationResult.normalizedData || workoutData,
      issues: issues,
      confidence: normalizationResult.confidence || 0.8,
      summary: normalizationResult.summary || "Normalization completed",
      normalizationMethod,
    };

    // Log final normalization result with tier info
    console.info("✅ Normalization complete:", {
      tier: useHaiku ? 'Haiku 4' : 'Sonnet 4',
      escalated: useHaiku && resultConfidence < 0.6,
      confidence: finalResult.confidence,
      isValid: finalResult.isValid,
      issuesFound: finalResult.issues.length,
      method: normalizationMethod
    });

    return finalResult;
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
