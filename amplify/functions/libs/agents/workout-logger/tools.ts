/**
 * Workout Logger Agent Tools
 *
 * Tools that wrap existing workout extraction, validation, and storage functions.
 * Each tool is a discrete capability that Claude can use to log workouts.
 */

import type { Tool } from "../core/types";
import type { WorkoutLoggerContext } from "./types";
import {
  checkWorkoutComplexity,
  buildWorkoutExtractionPrompt,
  extractCompletedAtTime,
  calculateConfidence,
  calculateCompleteness,
  classifyDiscipline,
  generateWorkoutSummary,
  applyPerformanceMetricDefaults,
  type UniversalWorkoutSchema,
  type DisciplineClassification,
} from "../../workout";
import {
  normalizeWorkout,
  shouldNormalizeWorkout,
  generateNormalizationSummary,
  type NormalizationResult,
} from "../../workout/normalization";
import {
  validateAndCorrectWorkoutDate,
  validateExerciseStructure,
  determineBlockingFlags,
  buildBlockingReason,
} from "../../workout/validation-helpers";
import {
  callBedrockApi,
  callBedrockApiMultimodal,
  MODEL_IDS,
} from "../../api-helpers";
import { parseJsonWithFallbacks } from "../../response-utils";
import { WORKOUT_SCHEMA } from "../../schemas/workout-schema";
import { composeWorkoutSchema } from "../../schemas/schema-composer";
import { parseCompletedAt } from "../../analytics/date-utils";
import { saveWorkout } from "../../../../dynamodb/operations";
import { storeWorkoutSummaryInPinecone } from "../../workout/pinecone";
import { linkWorkoutToTemplate } from "../../program/template-linking";
import {
  buildWorkoutExtractionMessage,
  storeExtractionDebugData,
} from "./helpers";
import { detectDiscipline } from "../../workout/discipline-detector";

/**
 * Tool-specific result types
 * (Internal to tools.ts, not exported from types.ts)
 */

/**
 * Result from extract_workout_data tool
 */
interface WorkoutExtractionResult {
  workoutData: UniversalWorkoutSchema;
  completedAt: Date;
  generationMethod: "tool" | "fallback";
}

/**
 * Result from validate_workout_completeness tool
 */
interface WorkoutValidationResult {
  isValid: boolean;
  shouldNormalize: boolean;
  shouldSave: boolean;
  confidence: number;
  completeness: number;
  validationFlags: string[];
  blockingFlags: string[];
  disciplineClassification: DisciplineClassification;
  reason?: string;
}

/**
 * Result from normalize_workout_data tool
 */
interface WorkoutNormalizationResult {
  normalizedData: UniversalWorkoutSchema;
  isValid: boolean;
  issuesFound: number;
  issuesCorrected: number;
  normalizationSummary: string;
  normalizationConfidence: number;
}

/**
 * Result from generate_workout_summary tool
 */
interface WorkoutSummaryResult {
  summary: string;
}

/**
 * Result from save_workout_to_database tool
 */
interface WorkoutSaveResult {
  workoutId: string;
  success: boolean;
  pineconeStored: boolean;
  pineconeRecordId: string | null;
  templateLinked: boolean;
}

/**
 * Recursively sanitize date fields in an object
 * Converts invalid date strings to null and normalizes date formats to prevent DynamoDB serialization errors
 */
function sanitizeDateFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeDateFields(item));
  }

  // Handle objects
  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Special handling for top-level "date" field - must be YYYY-MM-DD only
      if (key === "date" && typeof value === "string") {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.warn(
            `⚠️ Invalid date field: ${key} = "${value}" - setting to null`,
          );
          sanitized[key] = null;
        } else {
          // Extract YYYY-MM-DD only
          sanitized[key] = date.toISOString().split("T")[0];
        }
        continue;
      }

      // Check if this looks like a date field (by key name or value format)
      const isDateField =
        key.includes("date") ||
        key.includes("Date") ||
        key.includes("_at") ||
        key.includes("At") ||
        key.includes("timestamp") ||
        key.includes("Timestamp");

      if (isDateField && typeof value === "string") {
        // Try to parse the date
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          // Invalid date - set to null and log warning
          console.warn(
            `⚠️ Invalid date field detected: ${key} = "${value}" - setting to null`,
          );
          sanitized[key] = null;
        } else {
          // Valid date - normalize to ISO string
          sanitized[key] = date.toISOString();
        }
      } else if (typeof value === "object") {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeDateFields(value);
      } else {
        // Keep other values as-is
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Return primitives as-is
  return obj;
}

/**
 * Result from detect_discipline tool
 */
interface DisciplineDetectionResult {
  discipline: string;
  confidence: number;
  method: "ai_detection";
  reasoning: string;
}

/**
 * Tool 1: Detect Workout Discipline
 *
 * Detects the primary training discipline of the workout using AI analysis.
 * This should be called FIRST before extraction to enable targeted extraction.
 */
export const detectDisciplineTool: Tool<WorkoutLoggerContext> = {
  id: "detect_discipline",
  description: `Detect the primary training discipline of the workout using AI analysis.

ALWAYS CALL THIS FIRST before extract_workout_data to identify the workout type.

This tool analyzes the workout description and classifies it into one of these disciplines:
- crossfit: Functional fitness with AMRAPs, EMOMs, "For Time" workouts, benchmark WODs, mixed-modality training
- powerlifting: Squat/bench/deadlift focus, low rep ranges (1-5), RPE tracking, competition lifts
- bodybuilding: Hypertrophy focus (8-12 reps), split training, tempo work, isolation exercises
- olympic_weightlifting: Snatch, clean & jerk, technique work, complexes
- functional_bodybuilding: EMOM with quality/tempo focus, Marcus Filly/Persist style
- calisthenics: Bodyweight skill development, gymnastics strength, progressions
- hyrox: 8 stations + 9 runs, race simulation
- running: Distance runs, pace work, intervals, race training

NOTE: Mixed-modality or unclear workouts should be classified as "crossfit" (the functional fitness discipline).

The detected discipline enables targeted extraction with discipline-specific schema and guidance,
reducing token usage by ~70% and improving extraction accuracy.

Returns: discipline, confidence (0-1), method ("ai_detection"), reasoning`,

  inputSchema: {
    type: "object",
    properties: {
      userMessage: {
        type: "string",
        description: "The user message describing their workout",
      },
      imageS3Keys: {
        type: "array",
        items: { type: "string" },
        description: "Optional S3 keys for workout images",
      },
    },
    required: ["userMessage"],
  },

  async execute(
    input: any,
    context: WorkoutLoggerContext,
  ): Promise<DisciplineDetectionResult> {
    console.info("🎯 Executing detect_discipline tool");

    const { userMessage, imageS3Keys } = input;

    // Run AI discipline detection
    // Agent-first approach: Agent decides when to detect discipline using this tool
    console.info("🔍 Running AI discipline detection...", {
      messageLength: userMessage.length,
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
    });

    try {
      const detection = await detectDiscipline(userMessage, imageS3Keys);

      console.info("✅ Discipline detected:", {
        discipline: detection.discipline,
        confidence: detection.confidence,
        reasoning: detection.reasoning,
      });

      return detection;
    } catch (error) {
      console.error(
        "❌ Discipline detection failed, defaulting to crossfit:",
        error,
      );

      // Fallback to crossfit (most flexible)
      return {
        discipline: "crossfit",
        confidence: 0.5,
        method: "ai_detection",
        reasoning: "Detection failed, defaulting to crossfit discipline",
      };
    }
  },
};

/**
 * Tool 2: Extract Workout Data
 *
 * Extracts structured workout information from user's message and images.
 * Handles both text and multimodal input, determines completion time.
 */
export const extractWorkoutDataTool: Tool<WorkoutLoggerContext> = {
  id: "extract_workout_data",
  description: `Extract structured workout information from user's message and images.

MUST call detect_discipline FIRST to get the workout discipline, then pass it to this tool.

This tool:
- Parses natural language workout descriptions into Universal Workout Schema
- Handles both text-only and multimodal (text + images) input
- Uses AI-powered extraction with schema enforcement
- Automatically determines when the workout was completed (date/time)
- Classifies discipline (CrossFit, powerlifting, running, etc.)
- Supports complex multi-phase workouts (strength + metcon)
- Handles named workouts (Fran, Murph) and generates Latin/Roman-inspired names for unnamed workouts (e.g., "Fortis Vigor", "Gladiator Complex")
- Extracts performance metrics (time, rounds, weights, reps)
- Defaults intensity and RPE to 5/10 (moderate) when not specified

CRITICAL EXTRACTION CAPABILITIES:
- Partner workouts: Distinguishes alternating (half volume per person) vs synchronized (full volume) formats
- Bilateral dumbbells: "50# each hand" = 100# total load for bilateral movements
- Descending rep schemes: "21-15-9" creates 3 separate rounds, not one
- EMOM structure: Creates separate round objects for each completed round
- Duration handling: Distinguishes workout duration (work time) from session duration (total gym time)
- Blocking flags: Identifies planning/advice questions that shouldn't be logged as workouts

Returns: workoutData (structured), completedAt (ISO timestamp), generationMethod ('tool' or 'fallback')`,

  inputSchema: {
    type: "object",
    properties: {
      discipline: {
        type: "string",
        description:
          "The detected workout discipline from detect_discipline tool (e.g., 'crossfit', 'powerlifting')",
      },
      userMessage: {
        type: "string",
        description: "The user message describing their workout",
      },
      imageS3Keys: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional S3 keys for workout images (screenshots, photos)",
      },
      userTimezone: {
        type: "string",
        description:
          "User timezone for date extraction (e.g., America/Los_Angeles)",
      },
      messageTimestamp: {
        type: "string",
        description: "ISO timestamp when user sent the message",
      },
      isSlashCommand: {
        type: "boolean",
        description: "Whether this was triggered by a slash command",
      },
      slashCommand: {
        type: "string",
        description: "The slash command used (e.g., log-workout)",
      },
    },
    required: [
      "discipline",
      "userMessage",
      "userTimezone",
      "messageTimestamp",
      "isSlashCommand",
    ],
  },

  async execute(
    input: any,
    context: WorkoutLoggerContext,
  ): Promise<WorkoutExtractionResult> {
    console.info("🏋️ Executing extract_workout_data tool");

    const {
      discipline,
      userMessage,
      imageS3Keys,
      userTimezone,
      messageTimestamp,
      isSlashCommand,
      slashCommand,
    } = input;

    // Validate discipline parameter
    if (!discipline) {
      throw new Error(
        "discipline parameter is required - must call detect_discipline tool first",
      );
    }

    console.info("🎯 Using discipline for targeted extraction:", {
      discipline,
      source: "detect_discipline_tool",
    });

    // 2. Compose targeted schema (BASE + ONE discipline plugin)
    const targetedSchema = composeWorkoutSchema(discipline);

    console.info("📋 Composed targeted schema:", {
      discipline,
      schemaSize: JSON.stringify(targetedSchema).length,
    });

    // 3. Check workout complexity (determines if thinking should be enabled)
    const isComplexWorkout = checkWorkoutComplexity(userMessage);
    const enableThinking = isComplexWorkout;

    console.info("Extraction configuration:", {
      isComplexWorkout,
      enableThinking,
      workoutLength: userMessage.length,
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
    });

    // 4. Build targeted extraction prompt (BASE + ONE discipline guidance)
    const extractionPrompt = buildWorkoutExtractionPrompt(
      userMessage,
      context.coachConfig,
      context.criticalTrainingDirective,
      userTimezone,
      discipline, // NEW: Pass discipline for targeted guidance
    );

    console.info("📝 Built targeted extraction prompt:", {
      promptSize: extractionPrompt.length,
      discipline,
    });

    // 5. Extract workout data with AI using targeted schema
    let workoutData: UniversalWorkoutSchema;
    let generationMethod: "tool" | "fallback" = "tool";
    const hasImages = imageS3Keys && imageS3Keys.length > 0;

    try {
      // PRIMARY: Tool-based generation with targeted schema enforcement
      console.info(
        "🎯 Attempting tool-based workout extraction with targeted schema",
      );

      let result;

      if (hasImages) {
        console.info("🖼️ Processing workout extraction with images:", {
          imageCount: imageS3Keys!.length,
          imageKeys: imageS3Keys,
        });

        // Build multimodal message
        const converseMessages = await buildWorkoutExtractionMessage(
          userMessage,
          imageS3Keys,
          "user",
        );

        // Call multimodal API with targeted schema (BASE + ONE discipline)
        result = await callBedrockApiMultimodal(
          extractionPrompt,
          converseMessages,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            tools: {
              name: "generate_workout",
              description: `Generate structured workout data for ${discipline} using the Universal Workout Schema v2.0`,
              inputSchema: targetedSchema, // ONLY BASE + ONE DISCIPLINE
            },
            expectedToolName: "generate_workout",
          },
        );
      } else {
        // Text-only extraction with targeted schema (BASE + ONE discipline)
        result = await callBedrockApi(
          extractionPrompt,
          userMessage,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            tools: {
              name: "generate_workout",
              description: `Generate structured workout data for ${discipline} using the Universal Workout Schema v2.0`,
              inputSchema: targetedSchema, // ONLY BASE + ONE DISCIPLINE
            },
            expectedToolName: "generate_workout",
          },
        );
      }

      // Extract workout data from tool use result
      if (typeof result !== "string") {
        workoutData = result.input as UniversalWorkoutSchema;
        console.info("✅ Tool-based extraction succeeded with targeted schema");

        // Set system-generated fields
        const shortId = Math.random().toString(36).substring(2, 11);
        workoutData.workout_id = `workout_${context.userId}_${Date.now()}_${shortId}`;
        workoutData.user_id = context.userId;

        // Apply performance metric defaults (intensity and RPE)
        applyPerformanceMetricDefaults(workoutData);

        // Store successful tool generation for debugging
        await storeExtractionDebugData(
          "tool-success",
          {
            userId: context.userId,
            conversationId: context.conversationId,
            coachId: context.coachId,
            workoutId: workoutData.workout_id,
          },
          {
            workoutData,
            method: "tool",
            hasImages,
            enableThinking,
            discipline: workoutData.discipline,
            isComplexWorkout,
          },
        );
      } else {
        throw new Error("Tool use expected but received text response");
      }
    } catch (toolError) {
      // FALLBACK: Prompt-based generation with JSON parsing
      console.warn(
        "⚠️ Tool-based extraction failed, using fallback:",
        toolError,
      );
      generationMethod = "fallback";

      console.info("🔄 Falling back to prompt-based extraction");

      let fallbackResult: string;

      if (hasImages) {
        console.info("🖼️ Fallback extraction with images");

        const converseMessages = await buildWorkoutExtractionMessage(
          userMessage,
          imageS3Keys,
          "user_fallback",
        );

        fallbackResult = (await callBedrockApiMultimodal(
          extractionPrompt,
          converseMessages,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            staticPrompt: extractionPrompt,
            dynamicPrompt: "",
          },
        )) as string;
      } else {
        // Text-only fallback
        fallbackResult = (await callBedrockApi(
          extractionPrompt,
          userMessage,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            staticPrompt: extractionPrompt,
            dynamicPrompt: "",
          },
        )) as string;
      }

      console.info("✅ Fallback extraction completed");

      // Parse JSON with fallbacks
      workoutData = parseJsonWithFallbacks(fallbackResult);

      // Set system-generated fields for fallback
      const shortId = Math.random().toString(36).substring(2, 11);
      workoutData.workout_id = `workout_${context.userId}_${Date.now()}_${shortId}`;
      workoutData.user_id = context.userId;

      // Apply performance metric defaults (intensity and RPE)
      applyPerformanceMetricDefaults(workoutData);

      // Store fallback response for debugging
      await storeExtractionDebugData(
        "fallback",
        {
          userId: context.userId,
          conversationId: context.conversationId,
          coachId: context.coachId,
          workoutId: workoutData.workout_id,
        },
        {
          workoutData,
          method: "fallback",
          hasImages,
          enableThinking,
          isComplexWorkout,
          toolError:
            toolError instanceof Error ? toolError.message : String(toolError),
        },
      );
    }

    // 4. Add generation metadata
    if (!workoutData.metadata) {
      workoutData.metadata = {} as any;
    }
    workoutData.metadata.generation_method = generationMethod;
    workoutData.metadata.generation_timestamp = new Date().toISOString();

    // For slash commands, add metadata about explicit logging
    if (isSlashCommand) {
      workoutData.metadata.logged_via = "slash_command";
      workoutData.metadata.extraction_notes =
        (workoutData.metadata.extraction_notes
          ? workoutData.metadata.extraction_notes + " "
          : "") +
        `User explicitly logged workout using /${slashCommand} command.`;
    }

    console.info("Extraction completed:", {
      method: generationMethod,
      workoutId: workoutData.workout_id,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name,
    });

    // 5. Extract completion time using AI
    const extractedTime = await extractCompletedAtTime(
      userMessage,
      messageTimestamp,
      userTimezone,
    );
    const completedAt = context.completedAt
      ? parseCompletedAt(context.completedAt, "extract_workout_data")
      : extractedTime || new Date();

    console.info("Workout timing analysis:", {
      userMessage: userMessage.substring(0, 100),
      userTimezone,
      extractedTime: extractedTime ? extractedTime.toISOString() : null,
      finalCompletedAt: completedAt.toISOString(),
      workoutDate: workoutData.date,
    });

    return {
      workoutData,
      completedAt,
      generationMethod,
    };
  },
};

/**
 * Tool 2: Validate Workout Completeness
 *
 * Checks if extracted workout data meets minimum requirements.
 * Validates dates, calculates confidence scores, determines blocking issues.
 */
export const validateWorkoutCompletenessTool: Tool<WorkoutLoggerContext> = {
  id: "validate_workout_completeness",
  description: `Validate extracted workout data quality and determine next steps.

ALWAYS CALL THIS SECOND after extract_workout_data.

This tool checks:
- Data completeness (0-1 score based on required fields)
- Confidence score (0-1 based on data quality and specificity)
- Date validation (corrects wrong years, validates against completedAt)
- Discipline classification (qualitative vs quantitative)
- Blocking validation flags that prevent saving:
  * planning_inquiry: User asking about future workouts or planning
  * advice_seeking: User asking for tips or general fitness advice
  * future_planning: User discussing future workout plans
  * no_performance_data: No actual performance metrics found

CRITICAL DECISIONS RETURNED:
- shouldSave (boolean): Whether workout should be saved to database
- shouldNormalize (boolean): Whether normalization is needed
- reason (string): Explanation if shouldSave is false
- blockingFlags (array): List of flags preventing save

For slash commands: More lenient validation (explicit logging intent)
For natural language: Stricter validation to avoid logging planning questions

Returns: validation result with shouldSave, shouldNormalize, confidence, completeness, blockingFlags, reason`,

  inputSchema: {
    type: "object",
    properties: {
      workoutData: {
        type: "object",
        description: "The extracted workout data to validate",
      },
      completedAt: {
        type: "string",
        description: "ISO timestamp when workout was completed",
      },
      isSlashCommand: {
        type: "boolean",
        description: "Whether this was triggered by a slash command",
      },
    },
    required: ["workoutData", "completedAt", "isSlashCommand"],
  },

  async execute(
    input: any,
    context: WorkoutLoggerContext,
  ): Promise<WorkoutValidationResult> {
    console.info("✅ Executing validate_workout_completeness tool");

    let { workoutData, completedAt, isSlashCommand } = input;

    // Defensive parsing: Handle case where workoutData is serialized as string
    if (typeof workoutData === "string") {
      console.warn(
        "⚠️ workoutData received as JSON string instead of object, parsing...",
      );
      try {
        // Use parseJsonWithFallbacks for robust JSON parsing
        workoutData = parseJsonWithFallbacks(workoutData);
        console.info("✅ Successfully parsed workoutData string to object");
      } catch (error) {
        console.error("❌ Failed to parse workoutData string:", error);
        throw new Error(
          "Invalid workoutData format: received string but failed to parse as JSON",
        );
      }
    }

    const completedAtDate = parseCompletedAt(
      completedAt,
      "validate_workout_completeness",
    );

    // 1. Calculate confidence and completeness scores
    const confidence = calculateConfidence(workoutData);
    const completeness = calculateCompleteness(workoutData);

    console.info("Confidence and completeness scores:", {
      confidence,
      completeness,
    });

    // Update metadata with scores
    if (!workoutData.metadata) {
      workoutData.metadata = {};
    }
    workoutData.metadata.data_confidence = confidence;
    workoutData.metadata.data_completeness = completeness;

    // 2. Date validation and correction
    validateAndCorrectWorkoutDate(workoutData, completedAtDate);

    // 3. Classify discipline (determines validation strictness)
    let disciplineClassification: DisciplineClassification;
    let isQualitativeDiscipline = false;

    try {
      disciplineClassification = await classifyDiscipline(
        workoutData.discipline,
        workoutData,
      );
      isQualitativeDiscipline = disciplineClassification.isQualitative;

      console.info("Discipline classification:", disciplineClassification);
    } catch (error) {
      console.warn(
        "Failed to classify discipline, defaulting to quantitative:",
        error,
      );
      isQualitativeDiscipline = false;
      disciplineClassification = {
        isQualitative: false,
        requiresPreciseMetrics: true,
        environment: "mixed",
        primaryFocus: "mixed",
        confidence: 0,
        reasoning: "Classification failed, defaulted to quantitative",
      };
    }

    // 4. Determine blocking validation flags
    const { blockingFlags, hasBlockingFlag, detectedBlockingFlags } =
      determineBlockingFlags(
        workoutData,
        isSlashCommand,
        isQualitativeDiscipline,
      );

    // 5. Additional validation: Check for extremely low completeness
    // This catches reflections/comments without actual workout data
    if (completeness < 0.2) {
      console.warn(
        "🚫 Blocking workout due to extremely low completeness (<20%):",
        {
          completeness,
          confidence,
          workoutId: workoutData.workout_id,
        },
      );

      return {
        isValid: false,
        shouldNormalize: false,
        shouldSave: false,
        confidence,
        completeness,
        validationFlags: workoutData.metadata.validation_flags || [],
        blockingFlags: ["insufficient_data"],
        disciplineClassification,
        reason:
          "Workout appears to be a reflection or comment without actual exercise data (completeness < 20%)",
      };
    }

    // 6. Additional validation: Check for missing exercise structure
    // Even if other fields are present, workouts MUST have exercises/rounds
    // Uses hybrid approach: property checks (fast) + AI validation (semantic)
    const exerciseValidation = await validateExerciseStructure(workoutData);

    if (!exerciseValidation.hasExercises) {
      console.warn("🚫 Blocking workout due to missing exercise structure:", {
        discipline: workoutData.discipline,
        hasExercises: false,
        completeness,
        confidence,
        workoutId: workoutData.workout_id,
        validationMethod: exerciseValidation.method,
        ...(exerciseValidation.aiReasoning && {
          aiReasoning: exerciseValidation.aiReasoning,
        }),
      });

      return {
        isValid: false,
        shouldNormalize: false,
        shouldSave: false,
        confidence,
        completeness,
        validationFlags: workoutData.metadata.validation_flags || [],
        blockingFlags: ["no_exercise_data"],
        disciplineClassification,
        reason:
          "No exercise structure found in workout data - unable to log workout without exercises or rounds",
      };
    }

    // 7. Determine if normalization should run
    const shouldNormalize = shouldNormalizeWorkout(
      workoutData,
      confidence,
      completeness,
    );

    // 8. Build validation result
    const reason = hasBlockingFlag
      ? buildBlockingReason(
          detectedBlockingFlags,
          isSlashCommand,
          isQualitativeDiscipline,
        )
      : undefined;

    const validationResult = {
      isValid: !hasBlockingFlag,
      shouldNormalize,
      shouldSave: !hasBlockingFlag,
      confidence,
      completeness,
      validationFlags: workoutData.metadata.validation_flags || [],
      blockingFlags: detectedBlockingFlags || [],
      disciplineClassification,
      reason,
    };

    console.info("Validation result:", validationResult);

    return validationResult;
  },
};

/**
 * Tool 3: Normalize Workout Data
 *
 * Normalizes and fixes structural issues in workout data.
 * Should only be called if validation recommends normalization.
 */
export const normalizeWorkoutDataTool: Tool<WorkoutLoggerContext> = {
  id: "normalize_workout_data",
  description: `Normalize and fix structural issues in workout data using AI.

ONLY CALL THIS IF validate_workout_completeness returns shouldNormalize: true.
Typically needed when confidence < 0.7 or structural issues detected.

This tool:
- Uses AI to fix schema violations and data inconsistencies
- Corrects field types, formats, and structure
- Adds missing required fields where possible
- Validates against Universal Workout Schema
- Improves confidence score (modest boost: +0.1)
- Adds validation flags for corrected fields

Common issues fixed:
- Missing or incorrect field types
- Inconsistent round structures
- Invalid time formats
- Missing performance_data fields
- Incomplete exercise objects

Returns: normalizedData, isValid, issuesFound, issuesCorrected, normalizationSummary, normalizationConfidence`,

  inputSchema: {
    type: "object",
    properties: {
      workoutData: {
        type: "object",
        description: "The workout data to normalize",
      },
      enableThinking: {
        type: "boolean",
        description: "Whether to enable extended thinking for normalization",
      },
    },
    required: ["workoutData", "enableThinking"],
  },

  async execute(
    input: any,
    context: WorkoutLoggerContext,
  ): Promise<WorkoutNormalizationResult> {
    console.info("🔧 Executing normalize_workout_data tool");

    const { workoutData, enableThinking } = input;
    const originalConfidence = workoutData.metadata?.data_confidence || 0;

    // Run normalization
    console.info("Running normalization on workout data..");
    const normalizationResult: NormalizationResult = await normalizeWorkout(
      workoutData,
      context.userId,
      enableThinking,
    );

    const normalizationSummary =
      generateNormalizationSummary(normalizationResult);

    console.info("Normalization completed:", {
      isValid: normalizationResult.isValid,
      issuesFound: normalizationResult.issues.length,
      correctionsMade: normalizationResult.issues.filter((i) => i.corrected)
        .length,
      normalizationConfidence: normalizationResult.confidence,
      summary: normalizationSummary,
    });

    // Use normalized data if normalization was successful
    let finalData = workoutData;
    if (
      normalizationResult.isValid ||
      normalizationResult.issues.some((i) => i.corrected)
    ) {
      finalData = normalizationResult.normalizedData;

      // Update confidence if normalization improved the data
      if (normalizationResult.confidence > originalConfidence) {
        finalData.metadata.data_confidence = Math.min(
          originalConfidence + 0.1, // Modest confidence boost
          normalizationResult.confidence,
        );
      }
    }

    // Add normalization flags to metadata
    normalizationResult.issues.forEach((issue) => {
      if (!finalData.metadata.validation_flags) {
        finalData.metadata.validation_flags = [];
      }
      if (!finalData.metadata.validation_flags.includes(issue.field)) {
        finalData.metadata.validation_flags.push(issue.field);
      }
    });

    return {
      normalizedData: finalData,
      isValid: normalizationResult.isValid,
      issuesFound: normalizationResult.issues.length,
      issuesCorrected: normalizationResult.issues.filter((i) => i.corrected)
        .length,
      normalizationSummary,
      normalizationConfidence: normalizationResult.confidence,
    };
  },
};

/**
 * Tool 4: Generate Workout Summary
 *
 * Generates AI summary of workout for coach context and UI display.
 */
export const generateWorkoutSummaryTool: Tool<WorkoutLoggerContext> = {
  id: "generate_workout_summary",
  description: `Generate natural language summary of workout using AI.

CALL THIS after data is finalized (post-normalization if needed).
Required before save_workout_to_database.

This tool creates a 2-3 sentence summary including:
- Workout type and discipline
- Key performance metrics (time, rounds, weights)
- Notable achievements or variations
- Overall intensity and volume

The summary is used for:
- Semantic search in Pinecone vector database
- Coach conversation context
- UI display in workout history
- Quick performance comparison

Example: "Completed Fran in 8:57 with 95lb thrusters and chest-to-bar pull-ups.
Strong performance with good pacing through the 21-15-9 rep scheme.
Maintained strict form despite high heart rate."

Returns: summary (string)`,

  inputSchema: {
    type: "object",
    properties: {
      workoutData: {
        type: "object",
        description: "The finalized workout data",
      },
      originalMessage: {
        type: "string",
        description: "The original user message",
      },
    },
    required: ["workoutData", "originalMessage"],
  },

  async execute(
    input: any,
    context: WorkoutLoggerContext,
  ): Promise<WorkoutSummaryResult> {
    console.info("📝 Executing generate_workout_summary tool");

    const { workoutData, originalMessage } = input;

    // Generate AI summary with extended thinking enabled
    console.info("Generating workout summary..");
    const summary = await generateWorkoutSummary(
      workoutData,
      originalMessage,
      true,
    );

    console.info("Generated summary:", { summary, length: summary.length });

    return {
      summary,
    };
  },
};

/**
 * Tool 5: Save Workout to Database
 *
 * Saves finalized workout to DynamoDB and Pinecone.
 * Handles template linking for program-based workouts.
 */
export const saveWorkoutToDatabaseTool: Tool<WorkoutLoggerContext> = {
  id: "save_workout_to_database",
  description: `Save finalized workout to DynamoDB and Pinecone vector database.

⚠️ ONLY CALL THIS IF validate_workout_completeness returns shouldSave: true ⚠️

This is the FINAL STEP after:
1. extract_workout_data (complete)
2. validate_workout_completeness (shouldSave: true)
3. normalize_workout_data (if shouldNormalize was true)
4. generate_workout_summary (complete)

This tool:
- Saves workout to DynamoDB with full metadata
- Stores workout summary in Pinecone for semantic search
- Links workout to program template if from training program
- Tracks coach attribution and extraction confidence
- Generates unique workout ID

DO NOT call this if:
- Validation found blocking flags (planning_inquiry, advice_seeking, etc.)
- shouldSave is false
- User was asking questions rather than logging a workout

If you skip saving, provide a clear explanation to the user about WHY
(e.g., "This appears to be a planning question rather than a completed workout log").

Returns: workoutId, success, pineconeStored, pineconeRecordId, templateLinked`,

  inputSchema: {
    type: "object",
    properties: {
      workoutData: {
        type: "object",
        description: "The finalized workout data",
      },
      summary: {
        type: "string",
        description: "The AI-generated workout summary",
      },
      completedAt: {
        type: "string",
        description: "ISO timestamp when workout was completed",
      },
      confidence: {
        type: "number",
        description: "Final confidence score (0-1)",
      },
      normalizationSummary: {
        type: "string",
        description: "Summary of normalization process",
      },
    },
    required: [
      "workoutData",
      "summary",
      "completedAt",
      "confidence",
      "normalizationSummary",
    ],
  },

  async execute(
    input: any,
    context: WorkoutLoggerContext,
  ): Promise<WorkoutSaveResult> {
    console.info("💾 Executing save_workout_to_database tool");

    const {
      workoutData,
      summary,
      completedAt,
      confidence,
      normalizationSummary,
    } = input;

    // Validate and convert completedAt to Date object using centralized utility
    const completedAtDate = parseCompletedAt(
      completedAt,
      "save_workout_to_database",
    );

    // Sanitize all date fields in workoutData to prevent DynamoDB serialization errors
    const sanitizedWorkoutData = sanitizeDateFields(workoutData);

    // 1. Build workout object
    const workout = {
      workoutId: sanitizedWorkoutData.workout_id,
      userId: context.userId,
      coachIds: [context.coachId],
      coachNames: [context.coachConfig.coach_name],
      conversationId: context.conversationId,
      completedAt: completedAtDate,
      workoutData: sanitizedWorkoutData,
      summary,
      ...(context.templateContext && {
        templateId: context.templateContext.templateId,
        groupId: context.templateContext.groupId,
      }),
      extractionMetadata: {
        confidence,
        extractedAt: new Date(),
        reviewedBy: "system",
        reviewedAt: new Date(),
        normalizationSummary,
        ...(context.templateContext?.scalingAnalysis && {
          templateComparison: context.templateContext.scalingAnalysis,
        }),
      },
    };

    console.info("Saving workout to DynamoDB..", {
      workoutId: workout.workoutId,
      discipline: sanitizedWorkoutData.discipline,
      workoutName: sanitizedWorkoutData.workout_name,
      confidence,
    });

    // 2. Save to DynamoDB
    await saveWorkout(workout);
    console.info("✅ Workout saved to DynamoDB");

    // 3. Store workout summary in Pinecone (fire-and-forget, non-blocking)
    console.info("📝 Storing workout summary in Pinecone (async)..");
    storeWorkoutSummaryInPinecone(
      context.userId,
      summary,
      sanitizedWorkoutData,
      workout,
    ).catch((error) => {
      console.error(
        "⚠️ Failed to store workout in Pinecone (non-blocking):",
        error,
      );
      // Don't throw - this is fire-and-forget
    });

    // 4. Update template linkedWorkoutId if from program
    const templateLinked = context.templateContext
      ? await linkWorkoutToTemplate(
          context.userId,
          context.coachId,
          context.templateContext,
          workout.workoutId,
        )
      : false;

    console.info("✅ Workout saved successfully");

    return {
      workoutId: workout.workoutId,
      success: true,
      pineconeStored: false, // Fire-and-forget (async), status unknown at return time
      pineconeRecordId: null, // Not available in fire-and-forget mode
      templateLinked,
    };
  },
};
