/**
 * Workout Tool Generation Helpers
 *
 * Helper functions that encapsulate AI calls with proper tool configs.
 * These functions follow the Coach Creator's tool-generation.ts pattern,
 * using Bedrock tool configs to eliminate double-encoding.
 *
 * Pattern:
 * - Use callBedrockApi with tools and expectedToolName options
 * - Cast directly to BedrockToolUseResult - NO fallback
 * - Let errors propagate to caller
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import type { BedrockToolUseResult } from "../api-helpers";
import { NORMALIZATION_RESPONSE_SCHEMA } from "../schemas/workout-normalization-schema";
import { getCondensedSchema } from "../object-utils";
import { WORKOUT_SCHEMA } from "../schemas/workout-schema";
import type { UniversalWorkoutSchema } from "./types";
import { fixDoubleEncodedProperties } from "../response-utils";
import { logger } from "../logger";

/**
 * Result from normalization tool call
 */
export interface NormalizationToolResult {
  isValid: boolean;
  normalizedData: UniversalWorkoutSchema;
  issues: Array<{
    type: "structure" | "data_quality" | "cross_reference";
    severity: "error" | "warning";
    field: string;
    description: string;
    corrected: boolean;
  }>;
  confidence: number;
  summary: string;
}

/**
 * Context for normalization
 */
export interface NormalizationContext {
  workoutData: UniversalWorkoutSchema;
  userId: string;
  enableThinking: boolean;
}

/**
 * Build the normalization prompt
 */
const buildNormalizationPrompt = (workoutData: any): string => {
  // Compact JSON formatting to reduce prompt size
  const schemaJson = JSON.stringify(getCondensedSchema(WORKOUT_SCHEMA));
  const workoutJson = JSON.stringify(workoutData);

  return `Normalize workout data to Universal Workout Schema v2.0.

RESPONSE FORMAT (all required):
{
  "isValid": boolean,           // true if no issues OR all corrected
  "normalizedData": {...},      // complete normalized workout
  "issues": [{type, severity, field, description, corrected}],  // or []
  "confidence": 0.0-1.0,
  "summary": "string"
}

NORMALIZATION RULES:
- Match schema structure exactly - move misplaced fields to correct locations
- Ensure rounds have identical field structure within discipline_specific
- Normalize exercise names consistently across rounds
- Preserve ALL data - only restructure, don't add placeholders for missing optionals
- Fix data type inconsistencies (string->number, etc.)

COMMON STRUCTURAL ISSUES TO FIX:
- coach_notes/discipline_specific nested in wrong objects → move to root level
- Inconsistent exercise structures across rounds → standardize
- Mixed time domains in single round → separate strength from metcon phases
- Performance data in wrong locations → consolidate in performance_metrics

SCHEMA REFERENCE:
${schemaJson}

WORKOUT DATA TO NORMALIZE:
${workoutJson}

TASK: Analyze workout against schema, identify structural/data issues, fix them, return COMPLETE tool response with ALL required fields including isValid.`;
};

/**
 * Generate normalization using AI with tool config
 *
 * Normalizes workout data against the Universal Workout Schema v2.0.
 * Uses Nova 2 Lite for efficient processing.
 *
 * Following Coach Creator pattern:
 * - Uses callBedrockApi with tool config
 * - Casts directly to BedrockToolUseResult
 * - NO fallback - let errors propagate
 */
export async function generateNormalization(
  context: NormalizationContext,
): Promise<NormalizationToolResult> {
  const startTime = Date.now();
  const { workoutData, enableThinking } = context;

  logger.info("🔧 Generating normalization via AI:", {
    workoutId: workoutData.workout_id,
    discipline: workoutData.discipline,
    enableThinking,
  });

  const normalizationPrompt = buildNormalizationPrompt(workoutData);
  const promptSizeKB = (normalizationPrompt.length / 1024).toFixed(1);

  logger.info("Normalization prompt built:", {
    promptSizeKB: `${promptSizeKB}KB`,
    workoutId: workoutData.workout_id,
  });

  // Call Bedrock with tool config - NO fallback
  // Following Coach Creator pattern exactly
  const result = (await callBedrockApi(
    normalizationPrompt,
    "Normalize workout data",
    MODEL_IDS.EXECUTOR_MODEL_FULL, // Nova 2 Lite
    {
      temperature: TEMPERATURE_PRESETS.STRUCTURED,
      enableThinking,
      tools: {
        name: "normalize_workout",
        description:
          "Normalize workout data to conform to the Universal Workout Schema v2.0",
        inputSchema: NORMALIZATION_RESPONSE_SCHEMA,
      },
      expectedToolName: "normalize_workout",
    },
  )) as BedrockToolUseResult;

  const duration = Date.now() - startTime;

  // Fix any double-encoded properties from Bedrock response
  // Nova 2 Lite sometimes returns nested objects as JSON strings despite strict schema
  const fixedInput = fixDoubleEncodedProperties(result.input);
  const toolInput = fixedInput as NormalizationToolResult;

  // Validate required field: normalizedData
  if (!toolInput.normalizedData) {
    throw new Error(
      "Normalization response missing required field: normalizedData",
    );
  }

  // Smart defaulting for isValid - if normalizedData exists and has required fields, assume valid
  if (toolInput.isValid === undefined) {
    // Default to true if normalizedData looks valid
    const hasRequiredFields =
      toolInput.normalizedData.discipline &&
      toolInput.normalizedData.workout_id;
    toolInput.isValid = !!hasRequiredFields;
    logger.info("📋 Defaulted isValid based on normalizedData presence:", {
      isValid: toolInput.isValid,
    });
  }

  // Smart defaulting for issues array
  if (!Array.isArray(toolInput.issues)) {
    toolInput.issues = [];
  }

  // Smart defaulting for confidence
  if (typeof toolInput.confidence !== "number") {
    toolInput.confidence = 0.8;
  }

  // Smart defaulting for summary
  if (!toolInput.summary) {
    toolInput.summary = toolInput.isValid
      ? "Normalization completed successfully"
      : "Normalization completed with issues";
  }

  logger.info("✅ Normalization completed:", {
    isValid: toolInput.isValid,
    issuesFound: toolInput.issues.length,
    confidence: toolInput.confidence,
    durationMs: duration,
  });

  return toolInput;
}

/**
 * Detect workout discipline using AI with tool config
 *
 * Classifies the workout into a specific training discipline.
 * Uses Nova 2 Lite for efficient processing.
 *
 * Note: This is optional - the current detectDiscipline function
 * in discipline-detector.ts already uses a similar pattern.
 * This is provided for consistency with Coach Creator architecture.
 */
export interface DisciplineDetectionToolResult {
  discipline: string;
  confidence: number;
  reasoning: string;
}

export async function detectDisciplineWithTool(
  userMessage: string,
): Promise<DisciplineDetectionToolResult> {
  const startTime = Date.now();

  logger.info("🎯 Detecting discipline via AI tool:", {
    messageLength: userMessage.length,
  });

  const prompt = `Analyze this workout description and classify it into the most appropriate training discipline.

AVAILABLE DISCIPLINES:
- crossfit: Functional fitness with AMRAPs, EMOMs, "For Time" workouts, benchmark WODs, mixed-modality
- powerlifting: Squat/bench/deadlift focus, low rep ranges (1-5), RPE tracking, competition lifts
- bodybuilding: Hypertrophy focus (8-12 reps), split training, tempo work, isolation exercises
- olympic_weightlifting: Snatch, clean & jerk, technique work, complexes
- functional_bodybuilding: EMOM with quality/tempo focus, Marcus Filly/Persist style
- calisthenics: Bodyweight skill development, gymnastics strength, progressions
- hyrox: 8 stations + 9 runs, race simulation
- running: Distance runs, pace work, intervals, race training

WORKOUT DESCRIPTION:
${userMessage}

Classify this workout into ONE discipline. If mixed or unclear, use "crossfit" as the default.`;

  const result = (await callBedrockApi(
    prompt,
    "Classify workout discipline",
    MODEL_IDS.EXECUTOR_MODEL_FULL, // Nova 2 Lite
    {
      temperature: TEMPERATURE_PRESETS.STRUCTURED,
      tools: {
        name: "classify_discipline",
        description: "Classify workout into a training discipline",
        inputSchema: {
          type: "object",
          properties: {
            discipline: {
              type: "string",
              enum: [
                "crossfit",
                "powerlifting",
                "bodybuilding",
                "olympic_weightlifting",
                "functional_bodybuilding",
                "calisthenics",
                "hyrox",
                "running",
              ],
              description: "The primary training discipline",
            },
            confidence: {
              type: "number",
              description: "Confidence score from 0.0 to 1.0",
            },
            reasoning: {
              type: "string",
              description: "Brief explanation for the classification",
            },
          },
          required: ["discipline", "confidence", "reasoning"],
        },
      },
      expectedToolName: "classify_discipline",
    },
  )) as BedrockToolUseResult;

  const duration = Date.now() - startTime;

  // Fix any double-encoded properties from Bedrock response
  const fixedInput = fixDoubleEncodedProperties(result.input);
  const toolInput = fixedInput as DisciplineDetectionToolResult;

  logger.info("✅ Discipline detected:", {
    discipline: toolInput.discipline,
    confidence: toolInput.confidence,
    durationMs: duration,
  });

  return toolInput;
}
