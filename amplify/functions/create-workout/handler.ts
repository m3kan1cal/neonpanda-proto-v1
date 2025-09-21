import {
  createCreatedResponse,
  createErrorResponse,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import { BuildWorkoutEvent } from "../libs/workout/types";
import { CoachConfig } from "../libs/coach-creator/types";
import { getCoachConfig } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    console.info("🏋️ Create workout handler started:", {
      userId: userId,
      timestamp: new Date().toISOString(),
    });

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, "Request body is required");
    }

    let body: any;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      console.error("Invalid JSON in request body:", error);
      return createErrorResponse(400, "Invalid request body");
    }

    const { userMessage, coachId, conversationId, isSlashCommand, slashCommand } = body;

    // Validate required fields
    if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
      console.error("Missing or invalid userMessage");
      return createErrorResponse(400, "Workout content is required");
    }

    // CoachId is required - the command palette is only accessible from Training Grounds
    // where users always have a coach context
    if (!coachId) {
      console.error("❌ Missing coachId - command palette should only be used in coach context");
      return createErrorResponse(400, "Coach ID is required");
    }

    // Fetch the coach config from DynamoDB
    let coachConfig: CoachConfig;
    try {
      console.info("📋 Fetching coach config from DynamoDB:", { userId, coachId });
      const fetchedCoachConfig = await getCoachConfig(userId, coachId);
      if (!fetchedCoachConfig) {
        console.error("❌ Coach config not found:", { userId, coachId });
        return createErrorResponse(404, "Coach configuration not found");
      }

      coachConfig = fetchedCoachConfig.attributes;
      console.info("✅ Coach config fetched successfully:", {
        coachName: coachConfig.coach_name,
        methodology: coachConfig.technical_config.methodology
      });
    } catch (error) {
      console.error("❌ Failed to fetch coach config:", error);
      return createErrorResponse(500, "Failed to load coach configuration");
    }

    console.info("🚀 Triggering build-workout lambda:", {
      userId,
      messageLength: userMessage.length,
      coachId,
      conversationId: conversationId || "command-palette",
      isSlashCommand: isSlashCommand || false,
      slashCommand: slashCommand || null,
      coachName: coachConfig.coach_name,
    });

    // Prepare the payload for the build-workout lambda
    const buildWorkoutPayload: BuildWorkoutEvent = {
      userId,
      userMessage: userMessage.trim(),
      coachId,
      conversationId: conversationId || "command-palette", // Use descriptive ID for command palette
      coachConfig,
      isSlashCommand: isSlashCommand || false,
      slashCommand: slashCommand || null,
    };

    // Invoke the build-workout lambda asynchronously
    const buildWorkoutFunctionName = process.env.BUILD_WORKOUT_FUNCTION_NAME;
    if (!buildWorkoutFunctionName) {
      console.error("❌ BUILD_WORKOUT_FUNCTION_NAME environment variable not set");
      return createErrorResponse(500, "Configuration error. Please try again.");
    }

    try {
      await invokeAsyncLambda(
        buildWorkoutFunctionName,
        buildWorkoutPayload,
        `create workout for user ${userId}`
      );
      console.info("✅ Build-workout lambda invoked successfully");
    } catch (error) {
      console.error("❌ Failed to invoke build-workout lambda:", error);
      return createErrorResponse(500, "Failed to process workout. Please try again.");
    }

    // Return immediate response to user
    const response = {
      success: true,
      message: "Workout logging initiated successfully. We're processing your workout in the background.",
      status: "processing",
      details: {
        userId,
        workoutContent: userMessage.substring(0, 100) + (userMessage.length > 100 ? "..." : ""),
        timestamp: new Date().toISOString(),
      },
    };

    console.info("🎉 Create workout completed successfully:", {
      userId,
      status: "processing",
    });

    return createCreatedResponse(response);

};

export const handler = withAuth(baseHandler);
