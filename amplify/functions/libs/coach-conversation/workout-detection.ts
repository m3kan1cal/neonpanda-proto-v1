import { invokeAsyncLambda } from "../api-helpers";
import {
  isWorkoutLog,
  parseSlashCommand,
  isWorkoutSlashCommand,
  generateWorkoutDetectionContext,
  WORKOUT_SLASH_COMMANDS,
} from "../workout";

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
 */
export async function detectAndProcessWorkout(
  userMessage: string,
  userId: string,
  coachId: string,
  conversationId: string,
  coachConfig: any,
  conversationContext: any
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

    isNaturalLanguageWorkout =
      !slashCommand.isSlashCommand && (await isWorkoutLog(userMessage));
    console.info('🔍 Natural language workout check:', {
      isNaturalLanguageWorkout,
      skippedDueToSlashCommand: slashCommand.isSlashCommand
    });

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
      coachName: coachConfig.attributes.coach_name,
      timestamp: new Date().toISOString(),
    });

    // For slash commands, use just the content after the command
    if (isSlashCommandWorkout && slashCommand.content) {
      workoutContent = slashCommand.content;
    }

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

      await invokeAsyncLambda(
        buildFunction,
        {
          userId,
          coachId,
          conversationId,
          userMessage: extractionContent,
          coachConfig: coachConfig.attributes,
          isSlashCommand: isSlashCommandWorkout,
          slashCommand: isSlashCommandWorkout
            ? slashCommand.command || null
            : null,
        },
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