/**
 * Exercise Name Normalization
 *
 * AI-powered normalization of exercise names to canonical snake_case format.
 * Uses the Executor Model (Claude Haiku 4.5) for fast, reliable normalization.
 */

import {
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
  type BedrockToolUseResult,
} from "../api-helpers";
import { NORMALIZE_EXERCISES_TOOL } from "../schemas/exercise-normalization-schema";
import type { NormalizedExerciseName, BatchNormalizationResult } from "./types";
import { logger } from "../logger";

/**
 * System prompt for exercise name normalization
 */
const NORMALIZATION_SYSTEM_PROMPT = `You are an expert fitness exercise name normalizer. Your task is to convert exercise names from their original format to canonical snake_case format for consistent tracking and analysis.

NORMALIZATION RULES:
1. Convert to snake_case (lowercase with underscores): "Back Squat" → "back_squat"
2. Remove unnecessary modifiers when the exercise is unambiguous: "Barbell Bench Press" → "bench_press"
3. Keep important variations that change the movement pattern: "front_squat" vs "back_squat", "paused_squat" vs "squat"
4. Maintain discipline-specific context when it affects execution: "competition_bench_press", "tempo_run"

COMMON ABBREVIATIONS TO STANDARDIZE:
- CrossFit: HSPU→handstand_push_up, T2B/TTB→toes_to_bar, C2B→chest_to_bar_pull_up, MU→muscle_up, DU→double_under
- Weightlifting: OHP→overhead_press, RDL→romanian_deadlift, BB→barbell (often omit), DB→dumbbell, KB→kettlebell
- Equipment: "Assault Bike"→assault_bike, "Ski Erg"→ski_erg, "Wall Ball"→wall_ball

CONFIDENCE SCORING:
- 1.0: Exact match to standard exercise name (e.g., "Back Squat" → "back_squat")
- 0.9-0.95: Clear standard variation with minor differences (e.g., "BB Back Squat" → "back_squat")
- 0.8-0.85: Requires interpretation but confident (e.g., "Competition Bench" → "competition_bench_press")
- 0.7-0.75: Ambiguous or unusual naming requiring best guess (e.g., "That squat thing" → "squat")

Use the normalize_exercises tool to return your results.`;

/**
 * Normalize a single exercise name using AI
 */
export async function normalizeExerciseName(
  originalName: string,
): Promise<NormalizedExerciseName> {
  const result = await normalizeExerciseNamesBatch([originalName]);
  return result.normalizations[0];
}

/**
 * Batch normalize multiple exercise names in a single AI call
 * More efficient than individual calls when processing a workout
 */
export async function normalizeExerciseNamesBatch(
  originalNames: string[],
): Promise<BatchNormalizationResult> {
  const startTime = Date.now();

  if (originalNames.length === 0) {
    return {
      normalizations: [],
      processingTimeMs: 0,
    };
  }

  // Deduplicate names to avoid redundant processing
  const uniqueNames = Array.from(new Set(originalNames));

  const userPrompt = `Normalize these exercise names to canonical snake_case format:

${uniqueNames.map((name, i) => `${i + 1}. "${name}"`).join("\n")}

For each exercise name, determine the canonical normalized form and provide a confidence score based on how clear the mapping is.`;

  try {
    const response = await callBedrockApi(
      NORMALIZATION_SYSTEM_PROMPT,
      userPrompt,
      MODEL_IDS.EXECUTOR_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: NORMALIZE_EXERCISES_TOOL,
        strictSchema: true, // Enable strict mode for guaranteed JSON
      },
    );

    // callBedrockApi already extracts tool use when tools are provided
    // Response is a BedrockToolUseResult with input property
    const toolResult = response as BedrockToolUseResult;
    const parsed = toolResult.input;

    // Build result map from unique names
    const resultMap = new Map<string, NormalizedExerciseName>();
    if (parsed.exercises && Array.isArray(parsed.exercises)) {
      for (const item of parsed.exercises) {
        if (item.original && item.normalized) {
          resultMap.set(item.original, {
            originalName: item.original,
            normalizedName: item.normalized,
            confidence: item.confidence ?? 0.9,
          });
        }
      }
    }

    // Map back to original order, using fallback for any missing
    const normalizations: NormalizedExerciseName[] = originalNames.map(
      (name) => {
        const cached = resultMap.get(name);
        if (cached) {
          return cached;
        }
        // Fallback: simple snake_case conversion
        return {
          originalName: name,
          normalizedName: fallbackNormalize(name),
          confidence: 0.5,
        };
      },
    );

    const processingTimeMs = Date.now() - startTime;

    logger.info("✅ Exercise name normalization completed:", {
      inputCount: originalNames.length,
      uniqueCount: uniqueNames.length,
      processingTimeMs,
    });

    return {
      normalizations,
      processingTimeMs,
    };
  } catch (error) {
    logger.error("❌ Exercise name normalization failed:", error);

    // Fallback: use simple normalization for all names
    const normalizations: NormalizedExerciseName[] = originalNames.map(
      (name) => ({
        originalName: name,
        normalizedName: fallbackNormalize(name),
        confidence: 0.3,
      }),
    );

    return {
      normalizations,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Fallback normalization when AI is unavailable
 * Simple conversion to snake_case
 */
function fallbackNormalize(name: string): string {
  // Defensive: handle undefined/null/empty names
  if (!name || typeof name !== "string") {
    logger.warn("⚠️ fallbackNormalize received invalid name:", name);
    return "unknown_exercise";
  }

  return name
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_") // Convert hyphens and spaces to underscores
    .replace(/[^a-z0-9_]/g, "") // Remove special characters (keep underscores)
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Trim leading/trailing underscores
}

/**
 * Generate a human-readable display name from normalized name
 */
export function generateDisplayName(normalizedName: string): string {
  return normalizedName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
