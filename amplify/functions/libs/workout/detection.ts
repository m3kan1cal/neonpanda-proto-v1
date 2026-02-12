/**
 * Workout Session Detection Library
 *
 * This module provides functionality to detect when users are describing
 * completed workouts in their coach conversations.
 */

import { QuickWorkoutExtraction } from "./types";
import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { logger } from "../logger";

/**
 * Supported workout slash commands
 */
export const WORKOUT_SLASH_COMMANDS = ["log-workout"] as const;

/**
 * Slash command parsing result
 */
export interface SlashCommandResult {
  isSlashCommand: boolean;
  command?: string;
  content?: string;
}

/**
 * Parses a message to detect and extract slash command structure
 *
 * @param message - The user's message to analyze
 * @returns object containing slash command information
 *
 * @example
 * ```typescript
 * parseSlashCommand("/log-workout I did Fran in 8:57");
 * // Returns: { isSlashCommand: true, command: "log-workout", content: "I did Fran in 8:57" }
 *
 * parseSlashCommand("I just finished my workout");
 * // Returns: { isSlashCommand: false }
 * ```
 */
export const parseSlashCommand = (message: string): SlashCommandResult => {
  if (!message || typeof message !== "string") {
    logger.info("🔍 parseSlashCommand: Invalid message input:", {
      message,
      type: typeof message,
    });
    return { isSlashCommand: false };
  }

  const slashCommandRegex = /^\/([a-zA-Z0-9-]+)\s*([\s\S]*)$/;
  const match = message.match(slashCommandRegex);

  logger.info("🔍 parseSlashCommand: Regex match result:", {
    messageStart: message.substring(0, 50),
    hasMatch: !!match,
    matchGroups: match ? match.length : 0,
  });

  if (!match) {
    return { isSlashCommand: false };
  }

  const [, command, content] = match;
  const result = {
    isSlashCommand: true,
    command: command.toLowerCase(),
    content: content.trim(),
  };

  logger.info("🔍 parseSlashCommand: Parsed result:", result);
  return result;
};

/**
 * Checks if a slash command is a workout logging command
 *
 * @param slashCommandResult - Result from parseSlashCommand
 * @returns boolean indicating if this is a workout logging command
 *
 * @example
 * ```typescript
 * const result = parseSlashCommand("/log-workout I did Fran");
 * isWorkoutSlashCommand(result); // Returns: true
 *
 * const result2 = parseSlashCommand("/help");
 * isWorkoutSlashCommand(result2); // Returns: false
 * ```
 */
export const isWorkoutSlashCommand = (
  slashCommandResult: SlashCommandResult,
): boolean => {
  const result =
    slashCommandResult.isSlashCommand &&
    slashCommandResult.command !== undefined &&
    WORKOUT_SLASH_COMMANDS.includes(slashCommandResult.command as any);

  logger.info("🔍 isWorkoutSlashCommand: Check result:", {
    isSlashCommand: slashCommandResult.isSlashCommand,
    command: slashCommandResult.command,
    supportedCommands: WORKOUT_SLASH_COMMANDS,
    isSupported: slashCommandResult.command
      ? WORKOUT_SLASH_COMMANDS.includes(slashCommandResult.command as any)
      : false,
    finalResult: result,
  });

  return result;
};

/**
 * Workout content validation result
 */
export interface WorkoutContentValidation {
  hasPerformanceData: boolean;
  hasLoggingIntent: boolean;
  confidence: number;
  reasoning: string;
}

/**
 * Validates workout content for both performance data AND logging intent
 *
 * This unified function handles BOTH use cases:
 * 1. Natural language: "I did Fran in 8:57" → validates intent + content
 * 2. Slash commands: "Fran in 8:57" → validates content only (intent implicit)
 * 3. Image-based: "I logged the workout in the image" + imageS3Keys → automatically passes validation
 *
 * The function intelligently detects whether intent validation is needed based on
 * the presence of past-tense completion language in the input.
 *
 * @param workoutContent - The content to validate (can be full message or extracted content)
 * @param imageS3Keys - Optional array of S3 keys for attached images (may contain workout data)
 * @returns Promise<WorkoutContentValidation> with validation result and details
 *
 * @example
 * ```typescript
 * // Natural language with intent
 * const result1 = await validateWorkoutContent("I did Fran in 8:57");
 * // Returns: { hasPerformanceData: true, hasLoggingIntent: true, confidence: 0.95, ... }
 *
 * // Extracted content (slash command)
 * const result2 = await validateWorkoutContent("Fran in 8:57");
 * // Returns: { hasPerformanceData: true, hasLoggingIntent: false, confidence: 0.9, ... }
 *
 * // Incomplete content
 * const result3 = await validateWorkoutContent("today, i did the following workout");
 * // Returns: { hasPerformanceData: false, hasLoggingIntent: true, confidence: 0.9, ... }
 *
 * // Image-based workout
 * const result4 = await validateWorkoutContent("I logged the workout in the image", ["image-key"]);
 * // Returns: { hasPerformanceData: true, hasLoggingIntent: true, confidence: 0.95, ... }
 * ```
 */
export const validateWorkoutContent = async (
  workoutContent: string,
  imageS3Keys?: string[],
): Promise<WorkoutContentValidation> => {
  if (!workoutContent || typeof workoutContent !== "string") {
    return {
      hasPerformanceData: false,
      hasLoggingIntent: false,
      confidence: 1.0,
      reasoning: "Empty or invalid workout content",
    };
  }

  // ✅ NEW: If images are attached, skip text-based performance validation
  // Images may contain workout data (whiteboard photos, workout logs, etc.)
  if (imageS3Keys && imageS3Keys.length > 0) {
    logger.info("✅ Images detected - skipping text performance validation:", {
      imageCount: imageS3Keys.length,
      contentPreview: workoutContent.substring(0, 100),
    });
    return {
      hasPerformanceData: true, // Assume images contain workout data
      hasLoggingIntent: true, // User is logging with images
      confidence: 0.95,
      reasoning: `User provided ${imageS3Keys.length} image(s) which may contain workout performance data (whiteboard, workout log, etc.). Skipping text-based validation and allowing extraction to process images.`,
    };
  }

  try {
    const validationPrompt = `
Analyze this message to determine if it's a valid workout or training session being logged WITH SPECIFIC performance data.

MESSAGE: "${workoutContent}"

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

REQUIRED JSON STRUCTURE:
{
  "hasPerformanceData": boolean,
  "hasLoggingIntent": boolean,
  "confidence": number,
  "reasoning": "brief explanation"
}

VALIDATION CRITERIA:

=== PERFORMANCE DATA (Required) ===
MUST contain at least ONE of these SPECIFIC workout details:
- Specific times: "8:57", "30 minutes", "45 seconds"
- Weights/loads: "315 lbs", "50kg", "bodyweight", "135#"
- Reps/rounds: "5 rounds", "20 reps", "3 sets", "AMRAP"
- Named workouts: "Fran", "Murph", "Cindy", "Helen"
- Distances: "3 miles", "5k", "400m"
- Specific exercises: "deadlifts", "thrusters", "pull-ups", "squats"
- Workout structures: "21-15-9", "EMOM", "tabata"

AVOID (these are NOT specific enough):
- Vague phrases: "worked out", "exercised", "trained hard", "did a workout"
- Incomplete references: "today, i did the following workout" (no actual workout details)
- General statements: "I trained this morning" (no exercises or performance data)

=== LOGGING INTENT (Optional - may not be present in slash command content) ===
If present, check for:
- Past tense completion: "I did", "I finished", "Just completed", "Crushed", "Knocked out"
- Explicit logging language: "Log this workout:", "Track this:", "Record my workout:"
- NOT questions: "Should I do..", "What do you think about..", "Can I.."
- NOT future planning: "I'm going to..", "I will..", "Planning to.."

IMPORTANT: hasLoggingIntent can be FALSE if the message is just workout content without explicit intent language.
This is NORMAL for slash command extracted content (e.g., "Fran in 8:57" without "I did").

EXAMPLES:

[YES - Both] "I did Fran in 8:57"
→ { hasPerformanceData: true, hasLoggingIntent: true, confidence: 0.95 }

[YES - Content Only] "Fran in 8:57"
→ { hasPerformanceData: true, hasLoggingIntent: false, confidence: 0.9 }

[YES - Content Only] "5x3 deadlifts at 315lbs, then 20 minute AMRAP"
→ { hasPerformanceData: true, hasLoggingIntent: false, confidence: 0.95 }

[NO - Intent Only] "I did a workout this morning"
→ { hasPerformanceData: false, hasLoggingIntent: true, confidence: 0.8 }

[NO - Incomplete] "today, i did the following workout"
→ { hasPerformanceData: false, hasLoggingIntent: true, confidence: 0.85 }

[NO - Question] "Should I do Fran today?"
→ { hasPerformanceData: true, hasLoggingIntent: false, confidence: 0.9 }

CONFIDENCE SCORING:
- 0.9+: Clear determination with strong signals
- 0.7-0.9: Good signals but some ambiguity
- 0.5-0.7: Unclear or mixed signals
- <0.5: Insufficient information

CRITICAL: A valid workout log requires hasPerformanceData=true. The hasLoggingIntent field helps distinguish between:
- Natural language logs (both true)
- Slash command content (performance=true, intent=false or true)
- Incomplete attempts (performance=false, intent=true)`;

    logger.info("🔍 Starting workout content validation:", {
      contentLength: workoutContent.length,
      contentPreview: workoutContent.substring(0, 100),
    });

    const response = (await callBedrockApi(
      validationPrompt,
      workoutContent,
      MODEL_IDS.EXECUTOR_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        prefillResponse: "{",
      }, // Force JSON output format
    )) as string; // No tools used, always returns string

    logger.info("🔍 Received validation response:", {
      responseLength: response.length,
      responsePreview: response.substring(0, 200),
    });

    const result = parseJsonWithFallbacks(response);

    logger.info("🔍 Workout content validation result:", {
      workoutContent: workoutContent.substring(0, 100),
      hasPerformanceData: result.hasPerformanceData,
      hasLoggingIntent: result.hasLoggingIntent,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });

    return {
      hasPerformanceData: result.hasPerformanceData && result.confidence > 0.5,
      hasLoggingIntent: result.hasLoggingIntent || false,
      confidence: result.confidence,
      reasoning: result.reasoning,
    };
  } catch (error) {
    logger.error("❌ Error in validateWorkoutContent:", {
      error: error instanceof Error ? error.message : "Unknown error",
      contentLength: workoutContent.length,
      contentPreview: workoutContent.substring(0, 100),
    });
    // Return false on error to prevent blocking the conversation
    return {
      hasPerformanceData: false,
      hasLoggingIntent: false,
      confidence: 0.0,
      reasoning: "Validation error occurred",
    };
  }
};

/**
 * AI-powered quick extraction of workout information for immediate coach response
 * This is used for immediate coach response while full extraction runs async
 *
 * @param message - The user's message to analyze
 * @returns Promise<QuickWorkoutExtraction> with extracted information
 */
export const quickWorkoutExtraction = async (
  message: string,
): Promise<QuickWorkoutExtraction> => {
  const extractionPrompt = `
Extract key workout information from this message for immediate coach feedback.

MESSAGE: "${message}"

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

REQUIRED JSON STRUCTURE:
{
  "workoutName": "string|null",
  "discipline": "crossfit|powerlifting|running|bodybuilding|hiit|general|null",
  "timeDetected": "string|null",
  "weightDetected": "string|null",
  "repCountDetected": "string|null",
  "roundsDetected": "string|null",
  "intensityDetected": "string|null",
  "equipmentUsed": "string|null",
  "locationContext": "string|null",
  "keyExercises": ["array of main exercises"],
  "confidence": number,
  "quickSummary": "brief one-line summary for coach"
}

EXTRACTION GUIDELINES:
1. workoutName: Named workouts (Fran, Murph, etc.) or user-given names
2. discipline: Best guess based on movements/language
3. timeDetected: Any time mentions (8:57, 30 minutes, etc.)
4. weightDetected: Primary weights used (135 lbs, 50kg dumbbells, etc.)
5. repCountDetected: Key rep numbers mentioned
6. roundsDetected: Rounds/sets completed
7. intensityDetected: RPE, effort level, or descriptive intensity
8. equipmentUsed: Key equipment (dumbbells, barbell, bodyweight, etc.)
9. locationContext: Gym, home, hotel, outdoors, etc.
10. keyExercises: 2-4 main movements mentioned
11. confidence: 0.8+ for clear info, 0.5-0.7 moderate, <0.5 unclear
12. quickSummary: One sentence for immediate coach context

Examples:
- "Just finished Fran in 8:57 with 95lb thrusters" → workoutName: "Fran", timeDetected: "8:57", weightDetected: "95 lbs"
- "Crushed 5 rounds of that brutal hotel workout" → roundsDetected: "5", intensityDetected: "brutal", locationContext: "hotel"
- "Deadlifted 315 for 3 reps, new PR!" → discipline: "powerlifting", weightDetected: "315", repCountDetected: "3", intensityDetected: "PR"`;

  const response = (await callBedrockApi(
    extractionPrompt,
    message,
    MODEL_IDS.EXECUTOR_MODEL_FULL,
    {
      temperature: TEMPERATURE_PRESETS.STRUCTURED,
      prefillResponse: "{",
    }, // Force JSON output format
  )) as string; // No tools used, always returns string
  const result = parseJsonWithFallbacks(response);

  logger.info("AI quick workout extraction:", {
    message: message.substring(0, 100),
    confidence: result.confidence,
    summary: result.quickSummary,
  });

  return result;
};

/**
 * Generates AI coach context for workout detection responses
 * Provides different coaching guidance based on detection method
 *
 * @param isSlashCommand - Whether workout was detected via slash command
 * @returns array of context strings for AI coach system prompt
 *
 * @example
 * ```typescript
 * // For slash command detection
 * const context = generateWorkoutDetectionContext(true);
 * // Returns context for explicit workout logging
 *
 * // For natural language detection
 * const context = generateWorkoutDetectionContext(false);
 * // Returns context for detected workout sharing
 * ```
 */
export const generateWorkoutDetectionContext = (
  isSlashCommand: boolean,
): string[] => {
  const baseContext = isSlashCommand
    ? [
        "The user has explicitly requested to log a workout using a slash command. Acknowledge this clearly and provide encouraging feedback.",
        'Since they used a command, you can be more direct about the logging: "Perfect! I\'ve logged that workout for you.." or "Great! Got that workout recorded.."',
        "Focus on the specific workout content they provided and give coaching feedback about their performance, form, or progress.",
        "You can mention they can view their workout history in the Training Grounds if it fits naturally in the conversation.",
      ]
    : [
        "The user has just shared details about a completed workout. Respond naturally as their coach - be encouraging about their effort and performance.",
        'You can casually mention that you\'re tracking their workout, but keep it brief and natural (e.g., "Great work! I\'m logging this for you.." or "Nice! Got this recorded.."). Don\'t be overly technical.',
        "You can naturally let them know they can view their workout history by going back to the Training Grounds if it fits the conversation flow.",
        "Focus primarily on coaching feedback about their workout performance, form, progress, or next steps rather than the tracking mechanics.",
      ];

  // Add critical workout analysis guidelines to prevent calculation errors
  const workoutAnalysisGuidelines = [
    "CRITICAL WORKOUT ANALYSIS GUIDELINES:",
    "• When calculating total reps, volume, or any workout metrics, be extremely careful with your math",
    "• DOUBLE-CHECK ALL MATHEMATICAL CALCULATIONS before mentioning specific numbers",
    "• For circuit/round-based workouts: Total reps = rounds × reps per round (e.g., 5 rounds × 5 reps = 25 total reps)",
    "• For multi-exercise workouts: Calculate each exercise separately, do not combine different exercises",
    "• For time-based workouts: Reference the actual time mentioned, do not estimate or guess",
    "• For weight calculations: Use the exact weights mentioned, multiply by actual reps performed",
    "• If you're unsure about any calculation, acknowledge the workout without specific numbers",
    "• Focus on effort, consistency, and progress rather than just raw numbers when possible",
    "",
    "CRITICAL: EQUIPMENT TERMINOLOGY AND REP COUNTING:",
    '• "50# each hand" means 50 pounds PER DUMBBELL, NOT double the reps',
    '• "DB bench press 50# each hand" = normal reps with 50lb dumbbells in each hand',
    '• "Each hand" refers to WEIGHT PER HAND, not reps per hand',
    "• Examples:",
    '  - "20 DB bench press 50# each hand" = 20 total reps using 50lb dumbbells',
    '  - "4 rounds of 20 reps" = 4 × 20 = 80 total reps, NOT 160',
    '  - "10 reps each arm" = 10 per arm = 20 total reps (this is different from weight notation)',
    '• NEVER double rep counts for dumbbell exercises unless explicitly stated "reps per arm"',
    '• Weight notation ("each hand", "per hand") describes equipment load, not repetition count',
    '• Rep notation ("each arm", "per arm") describes repetition count per limb',
    "",
    "CRITICAL: BILATERAL DUMBBELL TRAINING LOAD ANALYSIS:",
    "• When analyzing training load for bilateral dumbbell movements, use TOTAL LOAD",
    '• "50# each hand" = 100# total load for volume calculations',
    "• Examples for coach analysis:",
    '  - "4 thrusters 50# each hand" = 4 reps × 100# = 400# volume',
    '  - "DB bench 30kg per hand" = 60kg total load per rep',
    '  - "Single-arm row 40#" = 40# load (unilateral, no doubling)',
    '• Always specify when referencing load: "100# total" or "50# per dumbbell"',
    "• Focus on TOTAL TRAINING LOAD for progression tracking and volume analysis",
    "",
    "ADDITIONAL EQUIPMENT TERMINOLOGY:",
    '• "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement',
    '• Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells',
    '• "Single DB" means using one dumbbell for the movement',
    '• "Alternating" means switching between arms/sides but count total reps, not per side',
    '• "Each side" means WEIGHT PER SIDE, not reps per side',
    "• When in doubt about equipment terminology, count the TOTAL movement repetitions performed",
    "",
    "INTERVAL WORKOUT ANALYSIS:",
    "• For interval workouts, analyze each segment separately - don't combine different movement patterns",
    "• When counting rounds for specific exercises, only count rounds WHERE THAT EXERCISE APPEARS",
    "• Example: 4 intervals with 2 AMRAP segments = count only the 2 AMRAP segments for that exercise",
    '• Do not say "3+3+2+2" if there are only 2 AMRAP segments - say "3 rounds + 2 rounds = 5 total rounds"',
    '• Always specify what you\'re counting: "power clean rounds", "total workout rounds", "AMRAP segments"',
    "• Compare like with like: AMRAP 1 vs AMRAP 2 performance, not interval 1 vs interval 3",
  ];

  return [...baseContext, ...workoutAnalysisGuidelines];
};

/**
 * Generates structured workout data context for AI coach analysis
 * Used when the AI has access to the extracted workout data structure
 * This helps prevent calculation errors by referencing actual data
 *
 * @param workoutData - The structured workout data from extraction
 * @returns array of context strings for AI coach system prompt
 *
 * @example
 * ```typescript
 * const context = generateStructuredWorkoutContext(workout.workoutData);
 * // Returns context with accurate workout metrics for AI analysis
 * ```
 */
export const generateStructuredWorkoutContext = (
  workoutData: any,
): string[] => {
  const context = [
    "STRUCTURED WORKOUT DATA AVAILABLE:",
    "You have access to the structured workout data that was extracted and validated.",
    "When analyzing this workout, reference the structured data for accurate calculations.",
    "Do not recalculate metrics that are already provided in the structured data.",
  ];

  // Add specific workout metrics if available
  if (workoutData.discipline_specific?.crossfit?.performance_data) {
    const perfData = workoutData.discipline_specific.crossfit.performance_data;
    context.push("");
    context.push("CROSSFIT PERFORMANCE DATA:");
    if (perfData.total_reps) {
      context.push(`• Total reps in workout: ${perfData.total_reps}`);
    }
    if (perfData.rounds_completed) {
      context.push(`• Rounds completed: ${perfData.rounds_completed}`);
    }
    if (perfData.total_time) {
      context.push(`• Total time: ${perfData.total_time} seconds`);
    }
  }

  // Add workout structure information
  if (workoutData.discipline_specific?.crossfit?.rounds) {
    const rounds = workoutData.discipline_specific.crossfit.rounds;
    context.push("");
    context.push("WORKOUT STRUCTURE:");
    context.push(
      `• Workout consisted of ${rounds.length} total rounds (including all movements)`,
    );

    // Extract exercise information and analyze workout segments
    const exerciseInfo = new Map();
    const segmentAnalysis = new Map();

    rounds.forEach((round: any, index: number) => {
      round.exercises?.forEach((exercise: any) => {
        const name = exercise.exercise_name;
        const reps = exercise.reps?.completed || exercise.reps?.prescribed;
        const weight = exercise.weight?.value;

        if (!exerciseInfo.has(name)) {
          exerciseInfo.set(name, {
            totalReps: 0,
            weight: weight,
            unit: exercise.weight?.unit,
            roundCount: 0,
          });
        }
        exerciseInfo.get(name).totalReps += reps || 0;
        exerciseInfo.get(name).roundCount += 1;
      });
    });

    // Analyze for interval patterns (look for repeated exercise sequences)
    const exerciseSequences = new Map();
    rounds.forEach((round: any, index: number) => {
      const exerciseNames =
        round.exercises?.map((ex: any) => ex.exercise_name).join("+") ||
        "unknown";
      if (!exerciseSequences.has(exerciseNames)) {
        exerciseSequences.set(exerciseNames, []);
      }
      exerciseSequences.get(exerciseNames).push(index + 1);
    });

    // Provide intelligent analysis for multi-segment workouts
    if (exerciseSequences.size > 1) {
      context.push("");
      context.push("SEGMENT ANALYSIS (for interval/multi-part workouts):");
      exerciseSequences.forEach((roundNumbers, exercisePattern) => {
        if (roundNumbers.length > 1 && exercisePattern !== "unknown") {
          const segmentCount = roundNumbers.length;
          context.push(
            `• ${exercisePattern} pattern: ${segmentCount} rounds (rounds ${roundNumbers.join(", ")})`,
          );
        }
      });
    }

    context.push("");
    context.push("EXERCISE TOTALS:");
    exerciseInfo.forEach((info, exerciseName) => {
      if (info.weight) {
        context.push(
          `• ${exerciseName}: ${info.totalReps} total reps across ${info.roundCount} rounds at ${info.weight} ${info.unit || "lbs"}`,
        );
      } else {
        context.push(
          `• ${exerciseName}: ${info.totalReps} total reps across ${info.roundCount} rounds`,
        );
      }
    });

    // Add specific guidance for interval analysis
    if (exerciseSequences.size > 1) {
      context.push("");
      context.push("ANALYSIS GUIDANCE:");
      context.push("• This appears to be an interval or multi-segment workout");
      context.push(
        "• When discussing exercise performance, count rounds only for that specific exercise",
      );
      context.push(
        "• Compare performance between segments of the same exercise pattern",
      );
      context.push(
        "• Do not combine different movement patterns when calculating rounds",
      );
    }
  }

  // Add extraction metadata
  if (workoutData.metadata?.data_confidence) {
    context.push("");
    context.push("EXTRACTION METADATA:");
    context.push(
      `• Data confidence: ${Math.round(workoutData.metadata.data_confidence * 100)}%`,
    );
    context.push(
      `• Extraction method: ${workoutData.metadata.extraction_method || "AI analysis"}`,
    );
  }

  context.push("");
  context.push(
    "IMPORTANT: Use these structured data points for accurate analysis rather than recalculating from the natural language description.",
  );

  return context;
};
