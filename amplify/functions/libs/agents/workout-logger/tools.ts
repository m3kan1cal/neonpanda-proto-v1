/**
 * Workout Logger Agent Tools
 *
 * Tools that wrap existing workout extraction, validation, and storage functions.
 * Each tool is a discrete capability that Claude can use to log workouts.
 *
 * Architecture follows Coach Creator pattern:
 * - First 1-2 tools receive inputs from Claude (user data)
 * - Subsequent tools retrieve previous results via context.getToolResult()
 * - No large objects passed as Claude inputs (prevents double-encoding)
 */

import type { Tool } from "../core/types";
import type {
  WorkoutLoggerContext,
  DisciplineDetectionResult,
  WorkoutExtractionResult,
  WorkoutValidationResult,
  WorkoutNormalizationResult,
  WorkoutSummaryResult,
  WorkoutSaveResult,
} from "./types";
import {
  DETECT_DISCIPLINE_SCHEMA,
  EXTRACT_WORKOUT_DATA_SCHEMA,
  VALIDATE_WORKOUT_COMPLETENESS_SCHEMA,
  NORMALIZE_WORKOUT_DATA_SCHEMA,
  GENERATE_WORKOUT_SUMMARY_SCHEMA,
  SAVE_WORKOUT_TO_DATABASE_SCHEMA,
} from "../../schemas/workout-logger-tool-schemas";
import {
  checkWorkoutComplexity,
  buildWorkoutExtractionPrompt,
  extractCompletedAtTime,
  calculateConfidence,
  calculateCompleteness,
  classifyWorkoutCharacteristics,
  generateWorkoutSummary,
  applyPerformanceMetricDefaults,
  type UniversalWorkoutSchema,
  type WorkoutCharacteristics,
} from "../../workout";
import { fixDoubleEncodedProperties } from "../../response-utils";
import {
  normalizeWorkout,
  shouldNormalizeWorkout,
  generateNormalizationSummary,
  type NormalizationResult,
} from "../../workout/normalization";
import {
  validateAndCorrectWorkoutDate,
  validateExerciseStructure,
  validateSchemaStructure,
  determineBlockingFlags,
  buildBlockingReason,
} from "../../workout/validation-helpers";
import { generateWorkoutId } from "../../id-utils";
import {
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
  invokeAsyncLambda,
} from "../../api-helpers";
import { parseJsonWithFallbacks } from "../../response-utils";
import { composeWorkoutSchema } from "../../schemas/schema-composer";
import { parseCompletedAt } from "../../analytics/date-utils";
import { saveWorkout } from "../../../../dynamodb/operations";
import { storeWorkoutSummaryInPinecone } from "../../workout/pinecone";
import { linkWorkoutToTemplate } from "../../program/template-linking";
import { storeExtractionDebugData } from "./helpers";
import { detectDiscipline } from "../../workout/discipline-detector";
import { logger } from "../../logger";

/**
 * Augmented context type that includes getToolResult accessor
 * Used by tools that retrieve previous results instead of receiving from Claude
 */
type AugmentedWorkoutLoggerContext = WorkoutLoggerContext & {
  getToolResult?: (key: string, index?: number) => any;
};

/**
 * Tool 1: Detect Workout Discipline
 *
 * Detects the primary training discipline of the workout using AI analysis.
 * This should be called FIRST before extraction to enable targeted extraction.
 *
 * INPUT FROM CLAUDE: userMessage (first tool - needs user data)
 */
export const detectDisciplineTool: Tool<WorkoutLoggerContext> = {
  id: "detect_discipline",
  description: `Detect the primary training discipline of the workout using AI analysis.

ALWAYS CALL THIS FIRST before extract_workout_data to identify the workout type.

This tool analyzes the workout description and classifies it into one of these disciplines:
- crossfit: Functional fitness with AMRAPs, EMOMs, "For Time" workouts, benchmark WODs
- powerlifting: Squat/bench/deadlift focus, low rep ranges (1-5), RPE tracking, competition lifts
- bodybuilding: Hypertrophy focus (8-12 reps), split training, tempo work, isolation exercises
- olympic_weightlifting: Snatch, clean & jerk, technique work, complexes
- functional_bodybuilding: EMOM with quality/tempo focus, Marcus Filly/Persist style
- calisthenics: Bodyweight skill development, gymnastics strength, progressions
- hyrox: 8 stations + 9 runs, race simulation
- running: Distance runs, pace work, intervals, race training
- circuit_training: Station-based timed intervals, F45, Orange Theory, boot camps
- hybrid: Mixed-modality workouts that don't fit a single discipline, personal training, open gym, general fitness

NOTE: Truly mixed-modality workouts with multiple distinct sections (strength + cardio + mobility) should be classified as "hybrid".
Low-confidence detections (below 0.65) will automatically fall back to "hybrid".

The detected discipline enables targeted extraction with discipline-specific schema and guidance,
reducing token usage by ~70% and improving extraction accuracy.

Returns: discipline, confidence (0-1), method ("ai_detection"), reasoning`,

  inputSchema: DETECT_DISCIPLINE_SCHEMA,

  async execute(
    input: any,
    _context: WorkoutLoggerContext,
  ): Promise<DisciplineDetectionResult> {
    logger.info("🎯 Executing detect_discipline tool");

    const { userMessage } = input;

    logger.info("🔍 Running AI discipline detection...", {
      messageLength: userMessage.length,
    });

    try {
      const detection = await detectDiscipline(userMessage);

      logger.info("✅ Discipline detected:", {
        discipline: detection.discipline,
        confidence: detection.confidence,
        reasoning: detection.reasoning,
      });

      return detection;
    } catch (error) {
      logger.error(
        "❌ Discipline detection failed, defaulting to hybrid:",
        error,
      );

      // Fallback to hybrid (most flexible for mixed-modality workouts)
      return {
        discipline: "hybrid",
        confidence: 0.5,
        method: "ai_detection",
        reasoning:
          "Detection failed, defaulting to hybrid discipline for flexible extraction",
      };
    }
  },
};

/**
 * Tool 2: Extract Workout Data
 *
 * Extracts structured workout information from user's message and images.
 * Handles both text and multimodal input, determines completion time.
 *
 * INPUT FROM CLAUDE: discipline, userMessage, userTimezone, messageTimestamp, isSlashCommand
 * (needs user data - cannot retrieve from context)
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
- Handles named workouts (Fran, Murph) and generates Latin/Roman-inspired names for unnamed workouts
- Extracts performance metrics (time, rounds, weights, reps)
- Defaults intensity and RPE to 5/10 (moderate) when not specified

Returns: workoutData (structured), completedAt (ISO timestamp), generationMethod ('tool' or 'fallback')`,

  inputSchema: EXTRACT_WORKOUT_DATA_SCHEMA,

  async execute(
    input: any,
    context: WorkoutLoggerContext,
  ): Promise<WorkoutExtractionResult> {
    logger.info("🏋️ Executing extract_workout_data tool");

    const {
      discipline,
      userMessage,
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

    logger.info("🎯 Using discipline for targeted extraction:", {
      discipline,
      source: "detect_discipline_tool",
    });

    // Compose targeted schema (BASE + ONE discipline plugin)
    const targetedSchema = composeWorkoutSchema(discipline);

    logger.info("📋 Composed targeted schema:", {
      discipline,
      schemaSize: JSON.stringify(targetedSchema).length,
    });

    // Check workout complexity using AI (determines if thinking should be enabled)
    const complexityResult = await checkWorkoutComplexity(userMessage);
    const isComplexWorkout = complexityResult.isComplex;
    const enableThinking = isComplexWorkout;

    logger.info("Extraction configuration:", {
      isComplexWorkout,
      enableThinking,
      complexityConfidence: complexityResult.confidence,
      complexityReasoning: complexityResult.reasoning,
      complexityFactors: complexityResult.complexityFactors,
      workoutLength: userMessage.length,
    });

    // Build targeted extraction prompt (BASE + ONE discipline guidance)
    const extractionPrompt = buildWorkoutExtractionPrompt(
      userMessage,
      context.coachConfig,
      context.criticalTrainingDirective,
      userTimezone,
      discipline,
    );

    logger.info("📝 Built targeted extraction prompt:", {
      promptSize: extractionPrompt.length,
      discipline,
    });

    // Extract workout data with AI using targeted schema
    let workoutData: UniversalWorkoutSchema;
    let generationMethod: "tool" | "fallback" = "tool";

    try {
      // PRIMARY: Tool-based generation with targeted schema enforcement
      logger.info(
        "🎯 Attempting tool-based workout extraction with targeted schema",
      );

      const result = await callBedrockApi(
        extractionPrompt,
        userMessage,
        MODEL_IDS.PLANNER_MODEL_FULL,
        {
          temperature: TEMPERATURE_PRESETS.STRUCTURED,
          enableThinking,
          tools: {
            name: "generate_workout",
            description: `Generate structured workout data for ${discipline} using the Universal Workout Schema v2.0`,
            inputSchema: targetedSchema,
          },
          expectedToolName: "generate_workout",
          // strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
          skipValidation: true, // large schema; output cleaned downstream by evaluator-optimizer
        },
      );

      // Extract workout data from tool use result
      if (typeof result !== "string") {
        workoutData = result.input as UniversalWorkoutSchema;
        logger.info("✅ Tool-based extraction succeeded with targeted schema");

        // Reconcile discipline with actual data structure
        // AI may output discipline="functional_bodybuilding" but store data under "crossfit" key
        const actualDisciplineKey = Object.keys(
          workoutData.discipline_specific || {},
        )[0];
        if (
          actualDisciplineKey &&
          workoutData.discipline !== actualDisciplineKey
        ) {
          logger.warn("⚠️ Discipline mismatch detected:", {
            declaredDiscipline: workoutData.discipline,
            actualDataKey: actualDisciplineKey,
            action: "correcting discipline field",
          });
          workoutData.discipline = actualDisciplineKey;
        }

        // Post-extraction discipline check for debugging
        logger.info("🔍 Post-extraction discipline check:", {
          expectedDiscipline: discipline, // From detect_discipline
          extractedDiscipline: workoutData.discipline,
          disciplineSpecificKeys: Object.keys(
            workoutData.discipline_specific || {},
          ),
          match: discipline === workoutData.discipline,
        });

        // Debug: Check nested field types RIGHT AFTER extracting from Bedrock response
        const bedrockNestedTypes: Record<string, string> = {};
        const bedrockDoubleEncoded: string[] = [];
        const workoutDataAny = workoutData as any; // Cast for dynamic access

        for (const key of [
          "discipline_specific",
          "performance_metrics",
          "subjective_feedback",
          "metadata",
          "coach_notes",
        ]) {
          if (workoutDataAny[key] !== undefined) {
            const value = workoutDataAny[key];
            const valueType = typeof value;
            bedrockNestedTypes[key] = valueType;

            if (
              valueType === "string" &&
              (value.startsWith("{") || value.startsWith("["))
            ) {
              bedrockDoubleEncoded.push(key);
            }
          }
        }

        if (bedrockDoubleEncoded.length > 0) {
          logger.warn("⚠️ DOUBLE-ENCODING FROM BEDROCK RESPONSE:", {
            bedrockNestedTypes,
            bedrockDoubleEncoded,
            sampleValue: {
              field: bedrockDoubleEncoded[0],
              preview: String(
                workoutDataAny[bedrockDoubleEncoded[0]],
              ).substring(0, 150),
            },
            note: "result.input already has double-encoded fields from callBedrockApi",
          });
        } else {
          logger.info(
            "✅ Bedrock response check: Nested fields are proper objects",
            { bedrockNestedTypes },
          );
        }

        // Set system-generated fields
        workoutData.workout_id = generateWorkoutId(context.userId);
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
            hasImages: false,
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
      logger.warn(
        "⚠️ Tool-based extraction failed, using fallback:",
        toolError,
      );
      generationMethod = "fallback";

      logger.info("🔄 Falling back to prompt-based extraction");

      const fallbackResult = (await callBedrockApi(
        extractionPrompt,
        userMessage,
        MODEL_IDS.PLANNER_MODEL_FULL,
        {
          temperature: TEMPERATURE_PRESETS.STRUCTURED,
          enableThinking,
          staticPrompt: extractionPrompt,
          dynamicPrompt: "",
        },
      )) as string;

      logger.info("✅ Fallback extraction completed");

      // Parse JSON with fallbacks
      workoutData = parseJsonWithFallbacks(fallbackResult);

      // Unwrap workout_log wrapper if present — fallback extraction occasionally returns
      // the data nested under a workout_log key (e.g., { workout_log: { ...actual data... } }).
      // Without unwrapping, workout_id/user_id get set on the wrapper, downstream validation
      // sees only the single wrapper key, and reports ~10% completeness, blocking the save.
      if (
        workoutData &&
        typeof workoutData === "object" &&
        "workout_log" in workoutData &&
        !workoutData.workout_id
      ) {
        logger.info("Unwrapping workout_log wrapper from fallback extraction");
        workoutData = (workoutData as { workout_log: typeof workoutData })
          .workout_log;
      }

      // Set system-generated fields for fallback
      workoutData.workout_id = generateWorkoutId(context.userId);
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
          hasImages: false,
          enableThinking,
          isComplexWorkout,
          toolError:
            toolError instanceof Error ? toolError.message : String(toolError),
        },
      );
    }

    // Add generation metadata
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

    logger.info("Extraction completed:", {
      method: generationMethod,
      workoutId: workoutData.workout_id,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name,
    });

    // Extract completion time using AI
    const extractedTime = await extractCompletedAtTime(
      userMessage,
      messageTimestamp,
      userTimezone,
    );

    // extractedTime (from extractCompletedAtTime) is derived specifically from the user
    // message and is the most reliable source for workout completion time. context.completedAt
    // (from extract_workout_data) can contain model-hallucinated dates, especially wrong years.
    // Always prefer extractedTime when available; fall back to context, then now.
    const contextIsDateOnly =
      !!context.completedAt && /^\d{4}-\d{2}-\d{2}$/.test(context.completedAt);
    const completedAt =
      extractedTime ||
      (context.completedAt
        ? parseCompletedAt(context.completedAt, "extract_workout_data")
        : new Date());

    logger.info("Workout timing analysis:", {
      userMessage: userMessage.substring(0, 100),
      userTimezone,
      contextCompletedAt: context.completedAt || null,
      contextIsDateOnly,
      extractedTime: extractedTime ? extractedTime.toISOString() : null,
      finalCompletedAt: completedAt.toISOString(),
      workoutDate: workoutData.date,
    });

    // Debug: Check nested field types BEFORE returning from tool
    const returnNestedFieldTypes: Record<string, string> = {};
    const returnDoubleEncodedFields: string[] = [];
    const returnWorkoutDataAny = workoutData as any; // Cast for dynamic access

    for (const key of [
      "discipline_specific",
      "performance_metrics",
      "subjective_feedback",
      "metadata",
      "coach_notes",
    ]) {
      if (returnWorkoutDataAny[key] !== undefined) {
        const value = returnWorkoutDataAny[key];
        const valueType = typeof value;
        returnNestedFieldTypes[key] = valueType;

        // Check if it's a string that looks like JSON
        if (
          valueType === "string" &&
          (value.startsWith("{") || value.startsWith("["))
        ) {
          returnDoubleEncodedFields.push(key);
        }
      }
    }

    if (returnDoubleEncodedFields.length > 0) {
      logger.warn(
        "⚠️ DOUBLE-ENCODING DETECTED IN extract_workout_data BEFORE RETURN:",
        {
          nestedFieldTypes: returnNestedFieldTypes,
          doubleEncodedFields: returnDoubleEncodedFields,
          sampleValue:
            returnDoubleEncodedFields.length > 0
              ? {
                  field: returnDoubleEncodedFields[0],
                  preview: String(
                    returnWorkoutDataAny[returnDoubleEncodedFields[0]],
                  ).substring(0, 100),
                }
              : null,
          generationMethod,
          note: "Data is already double-encoded in extract_workout_data before returning",
        },
      );
    } else {
      logger.info(
        "✅ extract_workout_data return check: Nested fields are proper objects",
        {
          nestedFieldTypes: returnNestedFieldTypes,
          generationMethod,
        },
      );
    }

    return {
      workoutData,
      completedAt,
      generationMethod,
      // Include userMessage for qualitative workout validation
      userMessage,
    };
  },
};

/**
 * Tool 3: Validate Workout Completeness
 *
 * Checks if extracted workout data meets minimum requirements.
 * Validates dates, calculates confidence scores, determines blocking issues.
 *
 * RETRIEVES FROM CONTEXT: extraction result (workoutData, completedAt, userMessage)
 * INPUT FROM CLAUDE: isSlashCommand only
 */
export const validateWorkoutCompletenessTool: Tool<WorkoutLoggerContext> = {
  id: "validate_workout_completeness",
  description: `Validate extracted workout data quality and determine next steps.

ALWAYS CALL THIS after extract_workout_data.

This tool automatically retrieves the extraction result from previous tool execution.
You only need to pass isSlashCommand.

This tool checks:
- Data completeness (0-1 score based on required fields)
- Confidence score (0-1 based on data quality and specificity)
- Date validation (corrects wrong years, validates against completedAt)
- Discipline classification (qualitative vs quantitative)
- Blocking validation flags that prevent saving

CRITICAL DECISIONS RETURNED:
- shouldSave (boolean): Whether workout should be saved to database
- shouldNormalize (boolean): Whether normalization is needed
- reason (string): Explanation if shouldSave is false
- blockingFlags (array): List of flags preventing save

Returns: validation result with shouldSave, shouldNormalize, confidence, completeness, blockingFlags, reason`,

  inputSchema: VALIDATE_WORKOUT_COMPLETENESS_SCHEMA,

  async execute(
    input: any,
    context: AugmentedWorkoutLoggerContext,
  ): Promise<WorkoutValidationResult> {
    logger.info("✅ Executing validate_workout_completeness tool");

    const { isSlashCommand, workoutIndex } = input;

    // Retrieve extraction result from stored tool results (Coach Creator pattern)
    // Uses workoutIndex for multi-workout targeting
    const extraction = context.getToolResult?.("extraction", workoutIndex);
    if (!extraction) {
      throw new Error(
        "Extraction not completed - call extract_workout_data first",
      );
    }

    let { workoutData, completedAt, userMessage } = extraction;

    if (!workoutData) {
      throw new Error(
        "workoutData not found in extraction result - extraction may have failed",
      );
    }

    // Debug: Deep inspection of nested field types BEFORE fixDoubleEncodedProperties
    const nestedFieldTypes: Record<string, string> = {};
    const doubleEncodedFields: string[] = [];
    const deeperInspection: Record<string, Record<string, string>> = {};
    const workoutDataAny = workoutData as any; // Cast for dynamic access

    for (const key of [
      "discipline_specific",
      "performance_metrics",
      "subjective_feedback",
      "metadata",
      "coach_notes",
    ]) {
      if (workoutDataAny[key] !== undefined) {
        const value = workoutDataAny[key];
        const valueType = typeof value;
        nestedFieldTypes[key] = valueType;

        // Check if it's a string that looks like JSON (top level)
        if (
          valueType === "string" &&
          (value.startsWith("{") || value.startsWith("["))
        ) {
          doubleEncodedFields.push(key);
        }

        // Deeper inspection: check types of properties INSIDE these objects
        if (valueType === "object" && value !== null) {
          deeperInspection[key] = {};
          for (const [subKey, subValue] of Object.entries(value)) {
            const subType = typeof subValue;
            deeperInspection[key][subKey] = subType;

            // Check for double-encoding at the nested level
            if (
              subType === "string" &&
              typeof subValue === "string" &&
              (subValue.startsWith("{") || subValue.startsWith("["))
            ) {
              doubleEncodedFields.push(`${key}.${subKey}`);
              logger.warn(`🔴 NESTED DOUBLE-ENCODING: ${key}.${subKey}`, {
                type: subType,
                preview: subValue.substring(0, 150),
              });
            }
          }
        }
      }
    }

    if (doubleEncodedFields.length > 0) {
      logger.warn("⚠️ DOUBLE-ENCODING DETECTED AT RETRIEVAL TIME:", {
        nestedFieldTypes,
        doubleEncodedFields,
        deeperInspection,
        sampleValue:
          doubleEncodedFields.length > 0
            ? {
                field: doubleEncodedFields[0],
                preview: String(
                  workoutDataAny[doubleEncodedFields[0].split(".")[0]],
                ).substring(0, 150),
              }
            : null,
        note: "Data is double-encoded when retrieved from context.getToolResult",
      });
    } else {
      logger.info("✅ Retrieval check: Nested fields are proper objects", {
        nestedFieldTypes,
        deeperInspection,
      });
    }

    // Fix any double-encoded properties
    workoutData = fixDoubleEncodedProperties(workoutData);

    const completedAtDate = parseCompletedAt(
      completedAt,
      "validate_workout_completeness",
    );

    // Calculate confidence and completeness scores
    const confidence = calculateConfidence(workoutData);
    const completeness = calculateCompleteness(workoutData);

    logger.info("Confidence and completeness scores:", {
      confidence,
      completeness,
    });

    // Update metadata with scores
    if (
      !workoutData.metadata ||
      typeof workoutData.metadata !== "object" ||
      Array.isArray(workoutData.metadata)
    ) {
      workoutData.metadata = {};
    }
    if (!Array.isArray(workoutData.metadata.validation_flags)) {
      workoutData.metadata.validation_flags = [];
    }
    workoutData.metadata.data_confidence = confidence;
    workoutData.metadata.data_completeness = completeness;

    // Date validation and correction
    validateAndCorrectWorkoutDate(workoutData, completedAtDate);

    // Classify discipline (determines validation strictness)
    let workoutCharacteristics: WorkoutCharacteristics;
    let isQualitativeDiscipline = false;

    try {
      workoutCharacteristics = await classifyWorkoutCharacteristics(
        workoutData.discipline,
        workoutData,
      );
      isQualitativeDiscipline = workoutCharacteristics.isQualitative;

      logger.info("Workout characteristics:", workoutCharacteristics);
    } catch (error) {
      logger.warn(
        "Failed to classify discipline, defaulting to quantitative:",
        error,
      );
      isQualitativeDiscipline = false;
      workoutCharacteristics = {
        isQualitative: false,
        requiresPreciseMetrics: true,
        environment: "mixed",
        primaryFocus: "mixed",
        confidence: 0,
        reasoning: "Classification failed, defaulted to quantitative",
      };
    }

    // Determine blocking validation flags
    const { hasBlockingFlag, detectedBlockingFlags } = determineBlockingFlags(
      workoutData,
      isSlashCommand,
      isQualitativeDiscipline,
    );

    // Check for extremely low completeness
    if (completeness < 0.2) {
      logger.warn(
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
        workoutCharacteristics,
        reason:
          "Workout appears to be a reflection or comment without actual exercise data (completeness < 20%)",
      };
    }

    // Check for missing exercise structure (pass userMessage for qualitative workout detection)
    const exerciseValidation = await validateExerciseStructure(
      workoutData,
      userMessage,
    );

    if (!exerciseValidation.hasExercises) {
      logger.warn("🚫 Blocking workout due to missing exercise structure:", {
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
        workoutCharacteristics,
        reason:
          "No exercise structure found in workout data - unable to log workout without exercises or rounds",
      };
    }

    // If validation succeeded via qualitative path, log it
    if (exerciseValidation.isQualitative) {
      logger.info("✅ Workout validated as qualitative/activity-based:", {
        discipline: workoutData.discipline,
        workoutName: workoutData.workout_name,
        method: exerciseValidation.method,
        reason: exerciseValidation.aiReasoning,
      });
    }

    // Validate schema structure (data matches expected schema fields)
    const schemaValidation = validateSchemaStructure(workoutData);
    let forceNormalization = false;

    if (
      !schemaValidation.isValid &&
      schemaValidation.suggestedAction === "normalize"
    ) {
      logger.warn("⚠️ Schema structure mismatch - forcing normalization:", {
        discipline: workoutData.discipline,
        reason: schemaValidation.mismatchReason,
      });
      forceNormalization = true;
      // Add schema_mismatch to validation flags
      if (!workoutData.metadata.validation_flags) {
        workoutData.metadata.validation_flags = [];
      }
      if (!workoutData.metadata.validation_flags.includes("schema_mismatch")) {
        workoutData.metadata.validation_flags.push("schema_mismatch");
      }
    }

    // Determine if normalization should run (base decision + force if schema mismatch)
    const shouldNormalize =
      forceNormalization ||
      shouldNormalizeWorkout(workoutData, confidence, completeness);

    // Build validation result
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
      workoutCharacteristics,
      reason,
      // Include workoutData for downstream tools
      workoutData,
      completedAt,
    };

    logger.info("Validation result:", {
      isValid: validationResult.isValid,
      shouldNormalize: validationResult.shouldNormalize,
      shouldSave: validationResult.shouldSave,
      confidence: validationResult.confidence,
      completeness: validationResult.completeness,
    });

    return validationResult;
  },
};

/**
 * Tool 4: Normalize Workout Data
 *
 * Normalizes and fixes structural issues in workout data.
 * Should only be called if validation recommends normalization.
 *
 * RETRIEVES FROM CONTEXT: extraction or validation result
 * NO INPUT FROM CLAUDE - retrieves all data from context
 */
export const normalizeWorkoutDataTool: Tool<WorkoutLoggerContext> = {
  id: "normalize_workout_data",
  description: `Normalize and fix structural issues in workout data using AI.

ONLY CALL THIS IF validate_workout_completeness returns shouldNormalize: true.

This tool automatically retrieves workout data from previous tool execution.
No inputs needed - it retrieves all data from context.

This tool:
- Uses AI to fix schema violations and data inconsistencies
- Corrects field types, formats, and structure
- Adds missing required fields where possible
- Validates against Universal Workout Schema
- Improves confidence score (modest boost: +0.1)

Returns: normalizedData, isValid, issuesFound, issuesCorrected, normalizationSummary, normalizationConfidence`,

  inputSchema: NORMALIZE_WORKOUT_DATA_SCHEMA,

  async execute(
    input: any,
    context: AugmentedWorkoutLoggerContext,
  ): Promise<WorkoutNormalizationResult> {
    logger.info("🔧 Executing normalize_workout_data tool");

    const { workoutIndex } = input;

    // Retrieve workout data from validation or extraction result
    // Uses workoutIndex for multi-workout targeting
    const validation = context.getToolResult?.("validation", workoutIndex);
    const extraction = context.getToolResult?.("extraction", workoutIndex);

    // Prefer validation result (has updated workoutData), fallback to extraction
    const sourceResult = validation || extraction;
    if (!sourceResult) {
      throw new Error(
        "No workout data available - call extract_workout_data first",
      );
    }

    let workoutData = sourceResult.workoutData;
    if (!workoutData) {
      throw new Error("workoutData not found in previous tool results");
    }

    // Fix double-encoded JSON if AI returned stringified properties
    workoutData = fixDoubleEncodedProperties(workoutData);

    const originalConfidence = workoutData.metadata?.data_confidence || 0;

    // Determine if extended thinking should be enabled
    const enableThinking = originalConfidence < 0.5;

    // Run normalization
    logger.info("Running normalization on workout data..");
    const normalizationResult: NormalizationResult = await normalizeWorkout(
      workoutData,
      context.userId,
      enableThinking,
    );

    const normalizationSummary =
      generateNormalizationSummary(normalizationResult);

    logger.info("Normalization completed:", {
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

      // Ensure metadata exists with proper structure
      if (
        !finalData.metadata ||
        typeof finalData.metadata !== "object" ||
        Array.isArray(finalData.metadata)
      ) {
        finalData.metadata = {};
      }
      if (!Array.isArray(finalData.metadata.validation_flags)) {
        finalData.metadata.validation_flags = [];
      }

      // Update confidence if normalization improved the data
      if (normalizationResult.confidence > originalConfidence) {
        finalData.metadata.data_confidence = Math.min(
          originalConfidence + 0.1,
          normalizationResult.confidence,
        );
      }
    }

    // Add normalization flags to metadata
    if (
      !finalData.metadata ||
      typeof finalData.metadata !== "object" ||
      Array.isArray(finalData.metadata)
    ) {
      finalData.metadata = {};
    }
    if (!Array.isArray(finalData.metadata.validation_flags)) {
      finalData.metadata.validation_flags = [];
    }
    normalizationResult.issues.forEach((issue) => {
      if (!finalData.metadata.validation_flags!.includes(issue.field)) {
        finalData.metadata.validation_flags!.push(issue.field);
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
 * Tool 5: Generate Workout Summary
 *
 * Generates AI summary of workout for coach context and UI display.
 *
 * RETRIEVES FROM CONTEXT: normalization or extraction result
 * INPUT FROM CLAUDE: originalMessage only
 */
export const generateWorkoutSummaryTool: Tool<WorkoutLoggerContext> = {
  id: "generate_workout_summary",
  description: `Generate natural language summary of workout using AI.

CALL THIS after data is finalized (post-normalization if needed).
Required before save_workout_to_database.

This tool automatically retrieves workout data from previous tool execution.
You only need to pass the original user message.

The summary is used for:
- Semantic search in Pinecone vector database
- Coach conversation context
- UI display in workout history

Returns: summary (string)`,

  inputSchema: GENERATE_WORKOUT_SUMMARY_SCHEMA,

  async execute(
    input: any,
    context: AugmentedWorkoutLoggerContext,
  ): Promise<WorkoutSummaryResult> {
    logger.info("📝 Executing generate_workout_summary tool");

    const { originalMessage, workoutIndex } = input;

    // Retrieve workout data from normalization, validation, or extraction
    // Uses workoutIndex for multi-workout targeting
    const normalization = context.getToolResult?.(
      "normalization",
      workoutIndex,
    );
    const validation = context.getToolResult?.("validation", workoutIndex);
    const extraction = context.getToolResult?.("extraction", workoutIndex);

    // Prefer normalized data, then validation, then extraction
    let workoutData;
    if (normalization?.normalizedData) {
      workoutData = normalization.normalizedData;
    } else if (validation?.workoutData) {
      workoutData = validation.workoutData;
    } else if (extraction?.workoutData) {
      workoutData = extraction.workoutData;
    }

    if (!workoutData) {
      throw new Error(
        "No workout data available - call extract_workout_data first",
      );
    }

    // Generate AI summary with extended thinking enabled
    logger.info("Generating workout summary..");
    const summary = await generateWorkoutSummary(
      workoutData,
      originalMessage,
      true,
    );

    logger.info("Generated summary:", { summary, length: summary.length });

    return {
      summary,
    };
  },
};

/**
 * Tool 6: Save Workout to Database
 *
 * Saves finalized workout to DynamoDB and Pinecone.
 * Handles template linking for program-based workouts.
 *
 * RETRIEVES FROM CONTEXT: All previous tool results
 * NO INPUT FROM CLAUDE - retrieves all data from context
 */
export const saveWorkoutToDatabaseTool: Tool<WorkoutLoggerContext> = {
  id: "save_workout_to_database",
  description: `Save finalized workout to DynamoDB and Pinecone vector database.

⚠️ ONLY CALL THIS IF validate_workout_completeness returns shouldSave: true ⚠️

This is the FINAL STEP. The tool automatically retrieves all data from previous tool executions.
No inputs needed - it retrieves all data from context.

This tool:
- Saves workout to DynamoDB with full metadata
- Stores workout summary in Pinecone for semantic search
- Links workout to program template if from training program
- Tracks coach attribution and extraction confidence

DO NOT call this if validation returned shouldSave: false.

Returns: workoutId, success, pineconeStored, pineconeRecordId, templateLinked`,

  inputSchema: SAVE_WORKOUT_TO_DATABASE_SCHEMA,

  async execute(
    input: any,
    context: AugmentedWorkoutLoggerContext,
  ): Promise<WorkoutSaveResult> {
    logger.info("💾 Executing save_workout_to_database tool");

    const { workoutIndex } = input;

    // Retrieve all required data from context
    // Uses workoutIndex for multi-workout targeting
    const extraction = context.getToolResult?.("extraction", workoutIndex);
    const validation = context.getToolResult?.("validation", workoutIndex);
    const normalization = context.getToolResult?.(
      "normalization",
      workoutIndex,
    );
    const summaryResult = context.getToolResult?.("summary", workoutIndex);

    if (!extraction) {
      throw new Error(
        "Extraction not completed - call extract_workout_data first",
      );
    }
    if (!validation) {
      throw new Error(
        "Validation not completed - call validate_workout_completeness first",
      );
    }
    if (!summaryResult) {
      throw new Error(
        "Summary not generated - call generate_workout_summary first",
      );
    }

    // Check if normalization was run and returned isValid: false
    // This indicates the workout data is too sparse or incomplete to save meaningfully
    if (normalization && normalization.isValid === false) {
      throw new Error(
        `Cannot save workout: Normalization determined the workout data is invalid or insufficient. ` +
          `Confidence: ${normalization.normalizationConfidence || 0}, Issues: ${normalization.issuesFound || 0}. ` +
          `Summary: ${normalization.normalizationSummary || "No summary provided"}. ` +
          `This typically indicates the user provided minimal information without sufficient workout details.`,
      );
    }

    // Get the best available workout data (normalized > validated > extracted)
    let workoutData;
    if (normalization?.normalizedData) {
      workoutData = normalization.normalizedData;
    } else if (validation?.workoutData) {
      workoutData = validation.workoutData;
    } else {
      workoutData = extraction.workoutData;
    }

    const { completedAt } = extraction;
    const { summary } = summaryResult;
    const confidence = validation.confidence;
    const normalizationSummary =
      normalization?.normalizationSummary || "No normalization performed";

    // Validate required fields before attempting to save
    if (!workoutData?.workout_id) {
      throw new Error(
        "Cannot save workout: workout_id is required. Ensure extract_workout_data was called first and returned valid data.",
      );
    }
    if (!workoutData?.discipline) {
      throw new Error(
        "Cannot save workout: discipline is required. Ensure extract_workout_data was called first and returned valid data.",
      );
    }
    if (!workoutData?.user_id) {
      workoutData.user_id = context.userId;
    }

    // Validate and convert completedAt to Date object
    const completedAtDate = parseCompletedAt(
      completedAt,
      "save_workout_to_database",
    );

    // Build workout object
    const workout = {
      workoutId: workoutData.workout_id,
      userId: context.userId,
      coachIds: [context.coachId],
      coachNames: [context.coachConfig.coach_name],
      conversationId: context.conversationId,
      completedAt: completedAtDate,
      workoutData: workoutData,
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

    logger.info("Saving workout to DynamoDB..", {
      workoutId: workout.workoutId,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name,
      confidence,
    });

    // Save to DynamoDB
    await saveWorkout(workout);
    logger.info("✅ Workout saved to DynamoDB");

    // Store workout summary in Pinecone (fire-and-forget, non-blocking)
    logger.info("📝 Storing workout summary in Pinecone (async)..");
    storeWorkoutSummaryInPinecone(
      context.userId,
      summary,
      workoutData,
      workout,
    ).catch((error) => {
      logger.error(
        "⚠️ Failed to store workout in Pinecone (non-blocking):",
        error,
      );
    });

    // Fire-and-forget exercise log extraction (non-blocking)
    const buildExerciseFunction = process.env.BUILD_EXERCISE_FUNCTION_NAME;
    if (buildExerciseFunction) {
      logger.info("🏋️ Invoking exercise log extraction (async)..");
      invokeAsyncLambda(
        buildExerciseFunction,
        {
          userId: context.userId,
          coachId: context.coachId,
          workoutId: workout.workoutId,
          workoutData: workoutData,
          completedAt: completedAtDate.toISOString(),
        },
        "exercise log extraction",
      ).catch((error) => {
        logger.error(
          "⚠️ Failed to invoke build-exercise (non-blocking):",
          error,
        );
      });
    }

    // Update template linkedWorkoutId if from program
    const templateLinked = context.templateContext
      ? await linkWorkoutToTemplate(
          context.userId,
          context.coachId,
          context.templateContext,
          workout.workoutId,
        )
      : false;

    logger.info("✅ Workout saved successfully");

    return {
      workoutId: workout.workoutId,
      success: true,
      pineconeStored: false, // Fire-and-forget (async), status unknown at return time
      pineconeRecordId: null,
      templateLinked,
    };
  },
};
