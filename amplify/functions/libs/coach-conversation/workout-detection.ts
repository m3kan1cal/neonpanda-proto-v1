import { invokeAsyncLambda } from "../api-helpers";
import {
  parseSlashCommand,
  isWorkoutSlashCommand,
  validateWorkoutContent,
  generateWorkoutDetectionContext,
  BuildWorkoutEvent,
} from "../workout";
import type { CoachConfig } from "../coach-creator/types";
import type { UserProfile } from "../user/types";
import type { SmartRequestRouter } from "../streaming/business-types";
import { logger } from "../logger";

export interface WorkoutDetectionResult {
  isWorkoutLogging: boolean;
  workoutContent: string;
  workoutDetectionContext: string[];
  slashCommand: any;
  isSlashCommandWorkout: boolean;
  isNaturalLanguageWorkout: boolean;
}

/**
 * Detects workout logging (natural language or slash commands) and triggers extraction
 *
 * @param routerAnalysis - Optional Smart Router result to avoid duplicate AI calls for natural language detection
 * @param imageS3Keys - Optional array of S3 keys for attached images (may contain workout data)
 */
export async function detectAndProcessWorkout(
  userMessage: string,
  userId: string,
  coachId: string,
  conversationId: string,
  coachConfig: CoachConfig,
  conversationContext: { sessionNumber: number },
  messageTimestamp?: string,
  userProfile?: UserProfile,
  routerAnalysis?: SmartRequestRouter,
  imageS3Keys?: string[],
): Promise<WorkoutDetectionResult> {
  // Check for workout logging detection (natural language OR slash commands)

  let slashCommand,
    isSlashCommandWorkout,
    isNaturalLanguageWorkout,
    isWorkoutLogging;

  try {
    slashCommand = parseSlashCommand(userMessage);
    logger.info("🔍 Slash command parsing result:", {
      userMessage: userMessage.substring(0, 100),
      isSlashCommand: slashCommand.isSlashCommand,
      command: slashCommand.command,
      content: slashCommand.content?.substring(0, 100),
    });

    isSlashCommandWorkout = isWorkoutSlashCommand(slashCommand);
    logger.info("🔍 Slash command workout check:", {
      isSlashCommandWorkout,
      supportedCommands: ["log-workout"],
      detectedCommand: slashCommand.command,
    });

    // Natural language detection: Use Smart Router result if available to avoid duplicate AI call
    if (!slashCommand.isSlashCommand) {
      if (routerAnalysis?.workoutDetection) {
        // ✅ Use Smart Router result (no duplicate AI call)
        isNaturalLanguageWorkout = routerAnalysis.workoutDetection.isWorkoutLog;

        logger.info(
          "🔍 Natural language workout check (using Smart Router result):",
          {
            isNaturalLanguageWorkout,
            confidence: routerAnalysis.workoutDetection.confidence,
            reasoning: routerAnalysis.workoutDetection.reasoning,
            source: "smart_router",
          },
        );
      } else {
        // Fallback: Call validateWorkoutContent if no router result (shouldn't happen in streaming flow)
        logger.warn(
          "⚠️ No Smart Router result provided - falling back to validateWorkoutContent",
        );
        const naturalLanguageValidation = await validateWorkoutContent(
          userMessage,
          imageS3Keys,
        );
        isNaturalLanguageWorkout =
          naturalLanguageValidation.hasPerformanceData &&
          naturalLanguageValidation.hasLoggingIntent;

        logger.info(
          "🔍 Natural language workout check (fallback validation):",
          {
            isNaturalLanguageWorkout,
            hasPerformanceData: naturalLanguageValidation.hasPerformanceData,
            hasLoggingIntent: naturalLanguageValidation.hasLoggingIntent,
            confidence: naturalLanguageValidation.confidence,
            reasoning: naturalLanguageValidation.reasoning,
            source: "fallback_validation",
          },
        );
      }
    } else {
      isNaturalLanguageWorkout = false;
      logger.info(
        "🔍 Natural language workout check skipped (slash command detected)",
      );
    }

    isWorkoutLogging = isSlashCommandWorkout || isNaturalLanguageWorkout;
    logger.info("🔍 Final workout detection result:", {
      isWorkoutLogging,
      isSlashCommandWorkout,
      isNaturalLanguageWorkout,
    });
  } catch (error) {
    logger.error("❌ Error during workout detection:", error);
    slashCommand = { isSlashCommand: false };
    isSlashCommandWorkout = false;
    isNaturalLanguageWorkout = false;
    isWorkoutLogging = false;
  }

  let workoutDetectionContext: string[] = [];
  let workoutContent = userMessage; // Default to full user response

  if (isWorkoutLogging) {
    logger.info("🏋️ WORKOUT DETECTED:", {
      userId,
      coachId,
      conversationId,
      userMessage: userMessage,
      detectionType: isSlashCommandWorkout
        ? "slash_command"
        : "natural_language",
      slashCommand: isSlashCommandWorkout ? slashCommand.command : null,
      sessionNumber: conversationContext.sessionNumber,
      coachName: coachConfig.coach_name,
      timestamp: new Date().toISOString(),
    });

    // For slash commands, use just the content after the command
    if (isSlashCommandWorkout && slashCommand.content) {
      workoutContent = slashCommand.content;
    }

    // ============================================================================
    // DECISION POINT: Slash Command vs Natural Language
    // ============================================================================
    // Slash commands: Validate and extract directly (user explicitly structured the data)
    // Natural language: Always create multi-turn session (inherently conversational)

    if (isSlashCommandWorkout) {
      // ✅ SLASH COMMAND VALIDATION: Check if workout content has actual performance data
      logger.info(
        "🔍 Validating slash command workout content for performance data..",
        {
          contentLength: workoutContent.length,
          contentPreview: workoutContent.substring(0, 100),
          hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
          imageCount: imageS3Keys?.length || 0,
        },
      );

      const validationResult = await validateWorkoutContent(
        workoutContent,
        imageS3Keys,
      );

      if (!validationResult.hasPerformanceData) {
        logger.warn(
          "⚠️ SLASH COMMAND VALIDATION FAILED: No performance data detected",
          {
            userId,
            conversationId,
            contentPreview: workoutContent.substring(0, 200),
            confidence: validationResult.confidence,
            reasoning: validationResult.reasoning,
          },
        );

        // Return early - don't trigger async Lambda for incomplete workout
        // Note: AI will naturally handle the error conversationally, no context needed
        return {
          isWorkoutLogging: false, // Set to false since validation failed
          workoutContent,
          workoutDetectionContext: [], // Empty - AI handles errors naturally
          slashCommand,
          isSlashCommandWorkout: false, // Reset since validation failed
          isNaturalLanguageWorkout: false,
        };
      }

      logger.info(
        "✅ Slash command validation passed - performance data detected",
        {
          confidence: validationResult.confidence,
          reasoning: validationResult.reasoning,
        },
      );

      // Continue to extraction below...
    } else {
      // ✅ NATURAL LANGUAGE: Always trigger multi-turn session (skip validation)
      logger.info(
        "🔄 Natural language workout detected - triggering multi-turn session",
        {
          userId,
          conversationId,
          contentPreview: workoutContent.substring(0, 100),
        },
      );

      // Return false to trigger session creation in handler
      // Note: workoutCreatorSession has its own specialized prompts, no context needed here
      return {
        isWorkoutLogging: false, // False triggers multi-turn session creation
        workoutContent,
        workoutDetectionContext: [], // Empty - session handles prompts internally
        slashCommand,
        isSlashCommandWorkout: false,
        isNaturalLanguageWorkout: true, // Keep this true to indicate workout intent
      };
    }

    // Generate appropriate workout detection context for AI coach
    workoutDetectionContext = generateWorkoutDetectionContext(
      isSlashCommandWorkout,
    );

    // Trigger async workout extraction (fire-and-forget)
    // This runs in parallel while the conversation continues
    try {
      const buildFunction = process.env.BUILD_WORKOUT_FUNCTION_NAME;
      if (!buildFunction) {
        throw new Error(
          "BUILD_WORKOUT_FUNCTION_NAME environment variable not set",
        );
      }

      // Ensure we have valid workout content to extract
      const extractionContent = workoutContent || userMessage;

      // Build workout extraction payload
      // Note: Discipline detection is handled by the WorkoutLoggerAgent's detect_discipline tool
      // This follows the agent-first philosophy: agents orchestrate their own workflow
      const buildWorkoutPayload: BuildWorkoutEvent = {
        userId,
        coachId,
        conversationId,
        userMessage: extractionContent,
        coachConfig: coachConfig,
        isSlashCommand: isSlashCommandWorkout,
        slashCommand: isSlashCommandWorkout
          ? slashCommand.command || undefined
          : undefined,
        messageTimestamp, // Pass messageTimestamp to workout extraction
        userTimezone: userProfile?.preferences?.timezone, // Pass user timezone for temporal context
        criticalTrainingDirective: userProfile?.criticalTrainingDirective, // Pass critical training directive
        imageS3Keys, // Pass attached images (may contain workout data)
      };

      await invokeAsyncLambda(
        buildFunction,
        buildWorkoutPayload,
        "workout extraction",
      );
    } catch (error) {
      logger.error(
        "❌ Failed to trigger workout extraction, but continuing conversation:",
        error,
      );
      // Don't throw - we want the conversation to continue even if extraction fails
    }
  }

  return {
    isWorkoutLogging,
    workoutContent,
    workoutDetectionContext,
    slashCommand,
    isSlashCommandWorkout,
    isNaturalLanguageWorkout,
  };
}

/**
 * Create fallback workout detection result
 * Used when workout detection is disabled or fails
 *
 * @returns Empty workout detection result indicating no workout was detected
 */
export function getFallbackWorkout(): WorkoutDetectionResult {
  return {
    isWorkoutLogging: false,
    workoutContent: "",
    workoutDetectionContext: [],
    slashCommand: { isSlashCommand: false },
    isSlashCommandWorkout: false,
    isNaturalLanguageWorkout: false,
  };
}
