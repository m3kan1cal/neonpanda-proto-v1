/**
 * Workout Validation Helpers
 *
 * Extracted validation logic for workout data to improve testability
 * and reusability across different parts of the application.
 */

import type { UniversalWorkoutSchema } from "./types";
import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { getExpectedArrayFields } from "../schemas/schema-composer";
import { WORKOUT_CLASSIFICATION_SCHEMA } from "../schemas/workout-classification-schema";
import { logger } from "../logger";

/**
 * Check if a workout is qualitative (activity completion focused) using AI
 *
 * Qualitative workouts are valid even without structured exercise data.
 * Examples:
 * - "I did Hinge Health level 10"
 * - "30 minute outdoor walk"
 * - "Yoga class at the gym"
 * - "Recovery day stretching"
 * - App-based workouts (Peloton, Apple Fitness+, etc.)
 *
 * These workouts provide value through tracking activity completion,
 * duration, and subjective feedback rather than sets/reps/weights.
 */
export const isQualitativeWorkout = async (
  workoutData: UniversalWorkoutSchema,
  userMessage?: string,
): Promise<{
  isQualitative: boolean;
  reason: string;
}> => {
  const prompt = `You are classifying whether a workout is "qualitative" (activity/completion focused) or "quantitative" (structured exercise data focused).

WORKOUT DATA:
- Discipline: ${workoutData.discipline}
- Workout Name: ${workoutData.workout_name || "not provided"}
- Workout Type: ${workoutData.workout_type || "not provided"}
- Duration: ${workoutData.duration ? `${workoutData.duration}s` : "not provided"}
- User Message: ${userMessage || "not provided"}

DEFINITION OF QUALITATIVE WORKOUTS:
Qualitative workouts are activity-based and valid even WITHOUT structured exercise data (sets/reps/weights).

EXAMPLES OF QUALITATIVE WORKOUTS (should return true):
- Yoga, Pilates, meditation classes
- Walking, easy runs, recovery runs
- Physical therapy, rehab exercises, mobility work
- App-based workouts (Hinge Health, Peloton, Apple Fitness+, Nike Training Club)
- Group fitness classes (bootcamp, spin class, Zumba, dance)
- Recovery activities (stretching, foam rolling, cooldown)
- Guided programs with level/progression (e.g., "Hinge Health level 10")

EXAMPLES OF QUANTITATIVE WORKOUTS (should return false):
- CrossFit with rounds/reps/times
- Powerlifting with sets/reps/weights
- Bodybuilding with exercises and weights
- Structured strength training
- Olympic weightlifting sessions

KEY PRINCIPLE: If the workout is primarily about COMPLETING AN ACTIVITY rather than tracking specific sets/reps/weights, it's qualitative.

Classify this workout and provide reasoning.`;

  try {
    const result = await callBedrockApi(
      prompt,
      "Classify workout as qualitative or quantitative",
      MODEL_IDS.EXECUTOR_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "classify_workout_type",
          description:
            "Classify workout as qualitative (activity-based) or quantitative (exercise-structured)",
          inputSchema: WORKOUT_CLASSIFICATION_SCHEMA,
        },
        expectedToolName: "classify_workout_type",
      },
    );

    // Extract from tool use result
    if (typeof result !== "string") {
      return {
        isQualitative: result.input.isQualitative,
        reason: result.input.reason,
      };
    }

    // Fallback: parse string response
    const parsed = parseJsonWithFallbacks(result);
    return {
      isQualitative: !!parsed.isQualitative,
      reason: parsed.reason || "No reasoning provided",
    };
  } catch (error) {
    logger.error("❌ AI qualitative workout detection failed:", error);
    // Conservative fallback: treat as quantitative to maintain strict validation
    return {
      isQualitative: false,
      reason: "AI classification failed, defaulted to quantitative",
    };
  }
};

/**
 * Validate qualitative workout has minimum required data
 *
 * For qualitative workouts, we don't require structured exercise data,
 * but we do need:
 * - Some indication of activity (name, type, or description)
 * - Ideally duration OR some other completion indicator
 */
export const validateQualitativeWorkout = (
  workoutData: UniversalWorkoutSchema,
): {
  isValid: boolean;
  reason: string;
} => {
  // Check for activity indication
  const hasActivityIndication = !!(
    workoutData.workout_name ||
    workoutData.workout_type ||
    workoutData.discipline
  );

  if (!hasActivityIndication) {
    return {
      isValid: false,
      reason: "No activity name, type, or discipline specified",
    };
  }

  // Check for completion indicators (less strict than structured workouts)
  const hasCompletionIndicator = !!(
    workoutData.duration ||
    workoutData.session_duration ||
    workoutData.performance_metrics?.calories_burned ||
    workoutData.subjective_feedback?.enjoyment ||
    workoutData.subjective_feedback?.notes ||
    workoutData.date
  );

  if (!hasCompletionIndicator) {
    return {
      isValid: false,
      reason: "No completion indicator (duration, date, feedback, etc.)",
    };
  }

  return {
    isValid: true,
    reason: "Qualitative workout has sufficient data for logging",
  };
};

/**
 * Validate and correct workout date if in wrong year
 *
 * Checks if workout date is in a reasonable year range and corrects it
 * if needed. This handles cases where AI extracts dates in wrong years
 * (e.g., "2024" when it should be "2025").
 */
export const validateAndCorrectWorkoutDate = (
  workoutData: UniversalWorkoutSchema,
  completedAtDate: Date,
): { corrected: boolean; originalDate?: string } => {
  if (!workoutData.date) {
    return { corrected: false };
  }

  const workoutDate = new Date(workoutData.date);
  const currentYear = new Date().getFullYear();
  const workoutYear = workoutDate.getFullYear();
  const completedAtYear = completedAtDate.getFullYear();

  // Check if workout date is in wrong year
  const isInvalidYear =
    workoutYear < currentYear - 1 ||
    workoutYear > currentYear + 1 ||
    Math.abs(workoutYear - completedAtYear) > 1;

  if (isInvalidYear) {
    const originalDate = workoutData.date;

    logger.warn("⚠️ Detected workout date in wrong year - correcting:", {
      originalDate,
      workoutYear,
      completedAtYear,
      currentYear,
    });

    // Correct the date to match completedAt's date
    const correctedDate = completedAtDate.toISOString().split("T")[0];
    workoutData.date = correctedDate;

    // Add to validation flags
    if (!workoutData.metadata.validation_flags) {
      workoutData.metadata.validation_flags = [];
    }
    if (!workoutData.metadata.validation_flags.includes("date")) {
      workoutData.metadata.validation_flags.push("date");
    }

    logger.info("✅ Corrected workout date to:", correctedDate);
    return { corrected: true, originalDate };
  }

  return { corrected: false };
};

/**
 * Validate exercise structure exists in workout (HYBRID: Property checks + AI)
 *
 * Uses a three-tier approach:
 * 1. Fast deterministic property checks for obvious cases (instant, free)
 * 2. AI qualitative check for activity-based workouts without structured data (~500ms)
 * 3. AI semantic validation for ambiguous cases (~500ms, negligible cost)
 *
 * Property checks run first to avoid unnecessary AI calls for structured workouts
 * (powerlifting, CrossFit, hybrid with phases, etc.), which represent the majority
 * of logged workouts.
 */
export const validateExerciseStructure = async (
  workoutData: UniversalWorkoutSchema,
  userMessage?: string,
): Promise<{
  hasExercises: boolean;
  exerciseCount?: number;
  roundCount?: number;
  segmentCount?: number;
  stationsCount?: number;
  runsCount?: number;
  liftsCount?: number;
  phasesCount?: number;
  method: "property_check" | "ai_validation" | "qualitative_workout";
  aiReasoning?: string;
  isQualitative?: boolean;
}> => {
  const discipline = workoutData.discipline;
  let disciplineData = workoutData.discipline_specific?.[
    discipline as keyof typeof workoutData.discipline_specific
  ] as any;

  // FALLBACK: If discipline key not found, check other keys for valid data
  // This handles cases where AI stored data under a different key than declared
  if (!disciplineData || Object.keys(disciplineData).length === 0) {
    const allKeys = Object.keys(workoutData.discipline_specific || {});
    for (const key of allKeys) {
      const candidateData = (workoutData.discipline_specific as any)?.[key];
      if (candidateData && Object.keys(candidateData).length > 0) {
        logger.warn("⚠️ Data found under mismatched key:", {
          declaredDiscipline: discipline,
          actualDataKey: key,
          action: "using data from mismatched key",
        });
        disciplineData = candidateData;
        break;
      }
    }
  }

  // ==================================================================
  // TIER 1: Fast Deterministic Property Checks (Instant, Free)
  // Runs FIRST to avoid unnecessary AI calls for structured workouts.
  // ==================================================================

  // Check for phases (hybrid - phase-based structure)
  const phasesCount = disciplineData?.phases?.length || 0;
  if (phasesCount > 0) {
    logger.info(
      "✅ Exercise structure validated via property check (phases array)",
      { discipline, phasesCount },
    );
    return {
      hasExercises: true,
      phasesCount,
      method: "property_check",
    };
  }

  // Check for structured exercises (powerlifting, bodybuilding)
  const exerciseCount = disciplineData?.exercises?.length || 0;
  if (exerciseCount > 0) {
    logger.info(
      "✅ Exercise structure validated via property check (exercises array)",
      { discipline, exerciseCount },
    );
    return {
      hasExercises: true,
      exerciseCount,
      method: "property_check",
    };
  }

  // Check for rounds (crossfit, hiit)
  const roundCount = disciplineData?.rounds?.length || 0;
  if (roundCount > 0) {
    logger.info(
      "✅ Exercise structure validated via property check (rounds array)",
      { discipline, roundCount },
    );
    return {
      hasExercises: true,
      roundCount,
      method: "property_check",
    };
  }

  // Check for segments (running, swimming, cycling)
  const segmentCount = disciplineData?.segments?.length || 0;
  if (segmentCount > 0) {
    logger.info(
      "✅ Exercise structure validated via property check (segments array)",
      { discipline, segmentCount },
    );
    return {
      hasExercises: true,
      segmentCount,
      method: "property_check",
    };
  }

  // Check for hyrox stations/runs (hyrox)
  const stationsCount = disciplineData?.stations?.length || 0;
  const runsCount = disciplineData?.runs?.length || 0;
  if (stationsCount > 0 || runsCount > 0) {
    logger.info(
      "✅ Exercise structure validated via property check (hyrox stations/runs)",
      { discipline, stationsCount, runsCount },
    );
    return {
      hasExercises: true,
      stationsCount,
      runsCount,
      method: "property_check",
    };
  }

  // Check for lifts (olympic_weightlifting)
  const liftsCount = disciplineData?.lifts?.length || 0;
  if (liftsCount > 0) {
    logger.info(
      "✅ Exercise structure validated via property check (lifts array)",
      { discipline, liftsCount },
    );
    return {
      hasExercises: true,
      liftsCount,
      method: "property_check",
    };
  }

  // ==================================================================
  // TIER 2: AI Qualitative Check (Activity-Based, No Structure Required)
  // Only runs if Tier 1 property checks found no structured data.
  // This avoids the ~500ms AI call for structured workouts.
  // ==================================================================

  const qualitativeCheck = await isQualitativeWorkout(workoutData, userMessage);

  if (qualitativeCheck.isQualitative) {
    const qualitativeValidation = validateQualitativeWorkout(workoutData);

    if (qualitativeValidation.isValid) {
      logger.info(
        "✅ Qualitative workout validated - no exercise structure required",
        {
          reason: qualitativeCheck.reason,
          validationReason: qualitativeValidation.reason,
          discipline: workoutData.discipline,
          workoutName: workoutData.workout_name,
        },
      );
      return {
        hasExercises: true,
        method: "qualitative_workout",
        aiReasoning: `Qualitative workout: ${qualitativeCheck.reason}. ${qualitativeValidation.reason}`,
        isQualitative: true,
      };
    } else {
      logger.warn(
        "⚠️ Qualitative workout identified but missing required data",
        {
          reason: qualitativeCheck.reason,
          validationReason: qualitativeValidation.reason,
        },
      );
      // Fall through to other validation methods
    }
  }

  // Fast fail: Completely empty discipline data and not qualitative
  if (!disciplineData || Object.keys(disciplineData).length === 0) {
    logger.warn(
      "❌ No exercise structure found - discipline_specific is empty",
      { discipline },
    );
    return {
      hasExercises: false,
      method: "property_check",
    };
  }

  // ==================================================================
  // TIER 3: AI Semantic Validation (500ms, $0.0001)
  // ==================================================================
  // For ambiguous cases: partial data, edge cases where property checks
  // found no known array fields but discipline data exists.

  logger.info(
    "🤖 Using AI validation for exercise structure (ambiguous case)",
    {
      discipline,
      hasDisciplineData: !!disciplineData,
      disciplineDataKeys: disciplineData ? Object.keys(disciplineData) : [],
    },
  );

  try {
    const aiResult = await validateExerciseSemantics(
      workoutData,
      disciplineData,
    );

    logger.info("🤖 AI validation result:", {
      hasExercises: aiResult.hasExercises,
      reasoning: aiResult.reasoning,
    });

    return {
      hasExercises: aiResult.hasExercises,
      method: "ai_validation",
      aiReasoning: aiResult.reasoning,
    };
  } catch (error) {
    logger.error(
      "❌ AI validation failed, falling back to conservative decision",
      error,
    );

    // Fallback: If workout has duration or performance metrics, assume valid
    const hasFallbackIndicators =
      !!workoutData.duration ||
      !!workoutData.session_duration ||
      !!workoutData.performance_metrics;

    return {
      hasExercises: hasFallbackIndicators,
      method: "property_check",
      aiReasoning: "AI validation failed, used fallback logic",
    };
  }
};

/**
 * AI-based exercise structure validation
 *
 * Uses Claude Haiku 4.5 for semantic understanding of workout data.
 * Can distinguish between "has some data" vs "has meaningful exercise data".
 */
async function validateExerciseSemantics(
  workoutData: UniversalWorkoutSchema,
  disciplineData: any,
): Promise<{ hasExercises: boolean; reasoning: string }> {
  const prompt = `You are validating whether workout data contains actual exercise/activity information.

WORKOUT DATA:
- Workout Name: ${workoutData.workout_name || "not provided"}
- Discipline: ${workoutData.discipline}
- Workout Type: ${workoutData.workout_type || "unknown"}
- Duration: ${workoutData.duration ? `${workoutData.duration}s` : "not provided"}
- Session Duration: ${workoutData.session_duration ? `${workoutData.session_duration}s` : "not provided"}
- Has Performance Metrics: ${!!workoutData.performance_metrics}
- Has Subjective Feedback: ${!!(workoutData.subjective_feedback?.enjoyment || workoutData.subjective_feedback?.notes)}
- Discipline-Specific Data: ${JSON.stringify(disciplineData || {}, null, 2)}

TASK: Determine if this workout has MEANINGFUL exercise/activity data.

⚠️ IMPORTANT: Be INCLUSIVE of qualitative/activity-based workouts. Not all valid workouts have structured exercise data!

EXAMPLES OF VALID DATA (accept these):
- Structured workouts: CrossFit rounds, powerlifting sets/reps, running segments
- QUALITATIVE workouts (ALSO VALID):
  - "Hinge Health level 10" with duration - VALID (guided rehab app workout)
  - "30 minute outdoor walk" with duration - VALID (activity completion)
  - "Yoga class at the gym" with duration - VALID (class attendance)
  - "Recovery stretching" with notes about how it felt - VALID
  - "Physical therapy exercises" with duration - VALID
  - "Morning jog" with duration and distance - VALID
  - App-based workouts (Peloton, Apple Fitness+, etc.) with completion time - VALID
  - Group classes with duration - VALID

EXAMPLES OF INVALID DATA (reject these):
- Empty discipline_specific with NO other meaningful data (no duration, no name, nothing)
- Only placeholder/null values throughout
- Just a comment like "I did a workout" with no other details at all
- Planning for future workout (not completed)
- Questions about workouts, not actual logged workouts

KEY PRINCIPLE: If the user clearly completed some physical activity AND we have at least one meaningful data point (duration, name, type, feedback, etc.), it's VALID.

RESPOND WITH JSON:
{
  "hasExercises": boolean,
  "reasoning": "Brief explanation (1 sentence)"
}`;

  const response = (await callBedrockApi(
    prompt,
    "Validate exercise structure",
    MODEL_IDS.EXECUTOR_MODEL_FULL,
    {
      temperature: TEMPERATURE_PRESETS.STRUCTURED,
    },
  )) as string;

  let result;
  try {
    result = parseJsonWithFallbacks(response.trim());
  } catch (parseError) {
    logger.warn(
      "⚠️ AI validation returned non-JSON response, defaulting to false",
      { responsePreview: response.substring(0, 200) },
    );
    return {
      hasExercises: false,
      reasoning: "Could not parse AI validation response",
    };
  }

  return {
    hasExercises: !!result.hasExercises,
    reasoning: result.reasoning || "No reasoning provided",
  };
}

/**
 * Determine blocking flags for workout validation
 *
 * Determines which validation flags should block workout saving based on:
 * - Whether it's a slash command (more lenient)
 * - Discipline type (qualitative vs quantitative)
 * - Actual validation flags present in workout metadata
 */
export const determineBlockingFlags = (
  workoutData: UniversalWorkoutSchema,
  isSlashCommand: boolean,
  isQualitativeDiscipline: boolean,
): {
  blockingFlags: string[];
  hasBlockingFlag: boolean;
  detectedBlockingFlags: string[];
} => {
  let blockingFlags: string[];

  if (isSlashCommand) {
    // For slash commands, only block if no workout info at all
    blockingFlags = [];
  } else if (isQualitativeDiscipline) {
    // For qualitative disciplines, be less strict
    blockingFlags = ["planning_inquiry", "advice_seeking", "future_planning"];
  } else {
    // For quantitative disciplines, maintain stricter requirements
    blockingFlags = [
      "planning_inquiry",
      "no_performance_data",
      "advice_seeking",
      "future_planning",
    ];
  }

  const validationFlags = workoutData.metadata?.validation_flags || [];
  const hasBlockingFlag = validationFlags.some((flag: string) =>
    blockingFlags.includes(flag),
  );
  const detectedBlockingFlags = validationFlags.filter((flag: string) =>
    blockingFlags.includes(flag),
  );

  return {
    blockingFlags,
    hasBlockingFlag,
    detectedBlockingFlags,
  };
};

/**
 * Build blocking reason message based on flags
 *
 * Generates a user-friendly reason message explaining why a workout
 * was blocked from being saved.
 */
export const buildBlockingReason = (
  detectedBlockingFlags: string[],
  isSlashCommand: boolean,
  isQualitativeDiscipline: boolean,
): string => {
  if (isSlashCommand) {
    return "Unable to extract any workout information from slash command content";
  }

  if (
    detectedBlockingFlags.includes("no_performance_data") &&
    !isQualitativeDiscipline
  ) {
    return "No performance data found for strength/power workout";
  }

  return "Not a workout log - appears to be planning/advice seeking";
};

/**
 * Validate that workout data structure matches the expected schema for the discipline.
 * Uses schema introspection to determine expected array fields (schema as source of truth).
 *
 * This catches cases where AI generates valid-looking data but in the wrong structure,
 * e.g., "phases" array instead of "exercises" array for functional_bodybuilding.
 *
 * @param workoutData - The workout data to validate
 * @returns Validation result with suggested action if invalid
 */
export function validateSchemaStructure(workoutData: UniversalWorkoutSchema): {
  isValid: boolean;
  mismatchReason?: string;
  suggestedAction?: string;
} {
  const discipline = workoutData.discipline;
  const disciplineData = workoutData.discipline_specific?.[
    discipline as keyof typeof workoutData.discipline_specific
  ] as any;

  if (!disciplineData) {
    return {
      isValid: false,
      mismatchReason: "discipline_specific key missing",
    };
  }

  // Get expected array fields from the schema (source of truth)
  const expectedArrayFields = getExpectedArrayFields(discipline);
  if (expectedArrayFields.length === 0) {
    // Unknown discipline or no array fields defined - skip check
    return { isValid: true };
  }

  // Check if at least one expected array field has data
  const hasExpected = expectedArrayFields.some(
    (key) =>
      Array.isArray(disciplineData[key]) && disciplineData[key].length > 0,
  );

  if (!hasExpected) {
    // Check if data exists but in wrong structure (e.g., "phases" instead of "exercises")
    const hasAnyArray = Object.values(disciplineData).some(
      (v) => Array.isArray(v) && (v as any[]).length > 0,
    );
    if (hasAnyArray) {
      // Get the actual array fields for better error message
      const actualArrayFields = Object.entries(disciplineData)
        .filter(([, v]) => Array.isArray(v) && (v as any[]).length > 0)
        .map(([k]) => k);

      logger.warn("⚠️ Schema structure mismatch detected:", {
        discipline,
        expectedFields: expectedArrayFields,
        actualFields: actualArrayFields,
      });

      return {
        isValid: false,
        mismatchReason: `Expected ${expectedArrayFields.join(" or ")} but found ${actualArrayFields.join(", ")}`,
        suggestedAction: "normalize",
      };
    }
  }

  return { isValid: true };
}
