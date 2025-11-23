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
  imageS3Keys?: string[]
): Promise<WorkoutDetectionResult> {

  // Check for workout logging detection (natural language OR slash commands)

  let slashCommand,
    isSlashCommandWorkout,
    isNaturalLanguageWorkout,
    isWorkoutLogging;

  try {
    slashCommand = parseSlashCommand(userMessage);
    console.info('🔍 Slash command parsing result:', {
      userMessage: userMessage.substring(0, 100),
      isSlashCommand: slashCommand.isSlashCommand,
      command: slashCommand.command,
      content: slashCommand.content?.substring(0, 100)
    });

    isSlashCommandWorkout = isWorkoutSlashCommand(slashCommand);
    console.info('🔍 Slash command workout check:', {
      isSlashCommandWorkout,
      supportedCommands: ['log-workout'],
      detectedCommand: slashCommand.command
    });

    // Natural language detection: Use Smart Router result if available to avoid duplicate AI call
    if (!slashCommand.isSlashCommand) {
      if (routerAnalysis?.workoutDetection) {
        // ✅ Use Smart Router result (no duplicate AI call)
        isNaturalLanguageWorkout = routerAnalysis.workoutDetection.isWorkoutLog;

        console.info('🔍 Natural language workout check (using Smart Router result):', {
          isNaturalLanguageWorkout,
          confidence: routerAnalysis.workoutDetection.confidence,
          reasoning: routerAnalysis.workoutDetection.reasoning,
          source: 'smart_router'
        });
      } else {
        // Fallback: Call validateWorkoutContent if no router result (shouldn't happen in streaming flow)
        console.warn('⚠️ No Smart Router result provided - falling back to validateWorkoutContent');
        const naturalLanguageValidation = await validateWorkoutContent(userMessage, imageS3Keys);
        isNaturalLanguageWorkout = naturalLanguageValidation.hasPerformanceData && naturalLanguageValidation.hasLoggingIntent;

        console.info('🔍 Natural language workout check (fallback validation):', {
          isNaturalLanguageWorkout,
          hasPerformanceData: naturalLanguageValidation.hasPerformanceData,
          hasLoggingIntent: naturalLanguageValidation.hasLoggingIntent,
          confidence: naturalLanguageValidation.confidence,
          reasoning: naturalLanguageValidation.reasoning,
          source: 'fallback_validation'
        });
      }
    } else {
      isNaturalLanguageWorkout = false;
      console.info('🔍 Natural language workout check skipped (slash command detected)');
    }

    isWorkoutLogging = isSlashCommandWorkout || isNaturalLanguageWorkout;
    console.info('🔍 Final workout detection result:', {
      isWorkoutLogging,
      isSlashCommandWorkout,
      isNaturalLanguageWorkout
    });
  } catch (error) {
    console.error("❌ Error during workout detection:", error);
    slashCommand = { isSlashCommand: false };
    isSlashCommandWorkout = false;
    isNaturalLanguageWorkout = false;
    isWorkoutLogging = false;
  }

  let workoutDetectionContext: string[] = [];
  let workoutContent = userMessage; // Default to full user response

  if (isWorkoutLogging) {
    console.info("🏋️ WORKOUT DETECTED:", {
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

    // ✅ VALIDATION: Check if workout content has actual performance data (applies to BOTH slash commands and NLP)
    // This prevents triggering async Lambda for incomplete workout descriptions like "today, i did the following workout"
    console.info("🔍 Validating workout content for performance data..", {
      contentLength: workoutContent.length,
      contentPreview: workoutContent.substring(0, 100),
      detectionType: isSlashCommandWorkout ? "slash_command" : "natural_language",
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
      imageCount: imageS3Keys?.length || 0
    });

    const validationResult = await validateWorkoutContent(workoutContent, imageS3Keys);

    if (!validationResult.hasPerformanceData) {
      console.warn("⚠️ WORKOUT VALIDATION FAILED: No performance data detected in workout content", {
        userId,
        conversationId,
        detectionType: isSlashCommandWorkout ? "slash_command" : "natural_language",
        contentPreview: workoutContent.substring(0, 200),
        confidence: validationResult.confidence,
        reasoning: validationResult.reasoning
      });

      // Set detection context to indicate incomplete workout
      workoutDetectionContext = [
        "User attempted to log a workout but didn't provide complete workout details.",
        "Please ask them to provide specific information like exercises, weights, reps, times, or distances.",
        "Example: 'What exercises did you do? How many sets and reps? What weights did you use?'"
      ];

      // Return early - don't trigger async Lambda for incomplete workout
      return {
        isWorkoutLogging: false, // Set to false since validation failed
        workoutContent,
        workoutDetectionContext,
        slashCommand,
        isSlashCommandWorkout: false, // Reset these since validation failed
        isNaturalLanguageWorkout: false,
      };
    }

    console.info("✅ Workout content validation passed - performance data detected", {
      confidence: validationResult.confidence,
      reasoning: validationResult.reasoning
    });

    // Generate appropriate workout detection context for AI coach
    workoutDetectionContext = generateWorkoutDetectionContext(
      isSlashCommandWorkout
    );

    // Trigger async workout extraction (fire-and-forget)
    // This runs in parallel while the conversation continues
    try {
      const buildFunction = process.env.BUILD_WORKOUT_FUNCTION_NAME;
      if (!buildFunction) {
        throw new Error(
          "BUILD_WORKOUT_FUNCTION_NAME environment variable not set"
        );
      }

      // Ensure we have valid workout content to extract
      const extractionContent = workoutContent || userMessage;

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
        "workout extraction"
      );
    } catch (error) {
      console.error(
        "❌ Failed to trigger workout extraction, but continuing conversation:",
        error
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
    workoutContent: '',
    workoutDetectionContext: [],
    slashCommand: { isSlashCommand: false },
    isSlashCommandWorkout: false,
    isNaturalLanguageWorkout: false,
  };
}
