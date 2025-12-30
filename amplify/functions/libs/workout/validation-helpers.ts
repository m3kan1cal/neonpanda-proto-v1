/**
 * Workout Validation Helpers
 *
 * Extracted validation logic for workout data to improve testability
 * and reusability across different parts of the application.
 */

import type { UniversalWorkoutSchema } from "./types";
import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";

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

    console.warn("⚠️ Detected workout date in wrong year - correcting:", {
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

    console.info("✅ Corrected workout date to:", correctedDate);
    return { corrected: true, originalDate };
  }

  return { corrected: false };
};

/**
 * Validate exercise structure exists in workout (HYBRID: Property checks + AI)
 *
 * Uses a two-tier approach:
 * 1. Fast deterministic property checks for obvious cases (instant, free)
 * 2. AI semantic validation for ambiguous cases (~500ms, negligible cost)
 *
 * This hybrid approach provides universal discipline support without hardcoding
 * structure checks for every discipline type.
 */
export const validateExerciseStructure = async (
  workoutData: UniversalWorkoutSchema,
): Promise<{
  hasExercises: boolean;
  exerciseCount?: number;
  roundCount?: number;
  segmentCount?: number;
  stationsCount?: number;
  runsCount?: number;
  liftsCount?: number;
  method: "property_check" | "ai_validation";
  aiReasoning?: string;
}> => {
  const discipline = workoutData.discipline;
  const disciplineData = workoutData.discipline_specific?.[
    discipline as keyof typeof workoutData.discipline_specific
  ] as any;

  // ==================================================================
  // TIER 1: Fast Deterministic Property Checks (Instant, Free)
  // ==================================================================

  // Check for structured exercises (powerlifting, bodybuilding)
  const exerciseCount = disciplineData?.exercises?.length || 0;
  if (exerciseCount > 0) {
    console.info(
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
    console.info(
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
    console.info(
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
    console.info(
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
    console.info(
      "✅ Exercise structure validated via property check (lifts array)",
      { discipline, liftsCount },
    );
    return {
      hasExercises: true,
      liftsCount,
      method: "property_check",
    };
  }

  // Fast fail: Completely empty discipline data
  if (!disciplineData || Object.keys(disciplineData).length === 0) {
    console.warn(
      "❌ No exercise structure found - discipline_specific is empty",
      { discipline },
    );
    return {
      hasExercises: false,
      method: "property_check",
    };
  }

  // ==================================================================
  // TIER 2: AI Semantic Validation (500ms, $0.0001)
  // ==================================================================
  // For ambiguous cases: qualitative disciplines, partial data, edge cases

  console.info(
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

    console.info("🤖 AI validation result:", {
      hasExercises: aiResult.hasExercises,
      reasoning: aiResult.reasoning,
    });

    return {
      hasExercises: aiResult.hasExercises,
      method: "ai_validation",
      aiReasoning: aiResult.reasoning,
    };
  } catch (error) {
    console.error(
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
- Discipline: ${workoutData.discipline}
- Workout Type: ${workoutData.workout_type || "unknown"}
- Duration: ${workoutData.duration ? `${workoutData.duration}s` : "not provided"}
- Session Duration: ${workoutData.session_duration ? `${workoutData.session_duration}s` : "not provided"}
- Has Performance Metrics: ${!!workoutData.performance_metrics}
- Discipline-Specific Data: ${JSON.stringify(disciplineData || {}, null, 2)}

TASK: Determine if this workout has MEANINGFUL exercise/activity data.

EXAMPLES OF VALID DATA:
- Running: Has segments OR has duration + distance
- Yoga: Has duration (30+ min) OR has poses/flow described
- CrossFit: Has rounds with exercises
- Powerlifting: Has exercises with sets/reps/weight
- Swimming: Has segments OR has distance + time

EXAMPLES OF INVALID DATA:
- Empty discipline_specific object: {}
- Only placeholder/null values
- Just a comment like "I did a workout" without specifics
- Planning for future workout (not completed)

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
    console.warn(
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
