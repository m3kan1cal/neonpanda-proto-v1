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
  console.info("🔍 DEBUG: Starting workout detection for message:", {
    userMessage:
      userMessage.substring(0, 100) +
      (userMessage.length > 100 ? "..." : ""),
    messageLength: userMessage.length,
  });
  console.info(
    "🔍 DEBUG: Available workout slash commands:",
    WORKOUT_SLASH_COMMANDS
  );

  let slashCommand,
    isSlashCommandWorkout,
    isNaturalLanguageWorkout,
    isWorkoutLogging;

  try {
    console.info("🔍 DEBUG: About to parse slash command for:", userMessage);

    // Direct test of the regex
    const testRegex = /^\/([a-zA-Z0-9-]+)\s*(.*)$/;
    const testMatch = userMessage.match(testRegex);
    console.info("🔍 DEBUG: Direct regex test:", {
      testMatch: testMatch,
      userMessage: userMessage.substring(0, 50),
    });

    slashCommand = parseSlashCommand(userMessage);
    console.info("🔍 DEBUG: Slash command parsing result:", slashCommand);
    console.info("🔍 DEBUG: Raw userMessage:", JSON.stringify(userMessage));
    console.info(
      "🔍 DEBUG: userMessage starts with /:",
      userMessage.startsWith("/")
    );
    console.info("🔍 DEBUG: userMessage length:", userMessage.length);

    isSlashCommandWorkout = isWorkoutSlashCommand(slashCommand);
    console.info(
      "🔍 DEBUG: Is slash command workout:",
      isSlashCommandWorkout
    );

    isNaturalLanguageWorkout =
      !slashCommand.isSlashCommand && (await isWorkoutLog(userMessage));
    console.info(
      "🔍 DEBUG: Is natural language workout:",
      isNaturalLanguageWorkout
    );

    isWorkoutLogging = isSlashCommandWorkout || isNaturalLanguageWorkout;
    console.info(
      "🔍 DEBUG: Final workout detection result:",
      isWorkoutLogging
    );
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