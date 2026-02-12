/**
 * Generate Greeting Lambda Handler
 *
 * Provides AI-generated contextual greetings for the Training Grounds dashboard,
 * personalized from the coach's perspective:
 * - Queries the coach config to get personality, style, and catchphrases
 * - Generates a 1-2 sentence greeting in the coach's voice
 * - Uses Nova 2 Lite for fast, cost-effective generation
 *
 * Route: POST /users/{userId}/coaches/{coachId}/greeting
 */

import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../libs/api-helpers";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { getCoachConfig } from "../../dynamodb/coach-config";
import type {
  GenerateGreetingRequest,
  GenerateGreetingResponse,
} from "../libs/greeting/types";
import { VALID_TIMES_OF_DAY } from "../libs/greeting/types";
import { logger } from "../libs/logger";
import {
  buildGreetingSystemPrompt,
  buildGreetingUserPrompt,
  extractCoachPersonality,
} from "../libs/coach-config/greeting-prompts";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

  if (!coachId) {
    return createErrorResponse(400, "coachId is required");
  }

  // Parse request body
  let requestBody: GenerateGreetingRequest;
  try {
    requestBody = JSON.parse(event.body || "{}") as GenerateGreetingRequest;
  } catch {
    return createErrorResponse(400, "Invalid JSON in request body");
  }

  const { timeOfDay, activeProgramCount, todaysWorkoutCount } = requestBody;

  // Validate required fields
  if (!timeOfDay) {
    return createErrorResponse(400, "timeOfDay is required");
  }

  if (!VALID_TIMES_OF_DAY.includes(timeOfDay)) {
    return createErrorResponse(
      400,
      `Invalid timeOfDay. Must be one of: ${VALID_TIMES_OF_DAY.join(", ")}`,
    );
  }

  if (typeof activeProgramCount !== "number" || activeProgramCount < 0) {
    return createErrorResponse(
      400,
      "activeProgramCount is required and must be a non-negative number",
    );
  }

  if (typeof todaysWorkoutCount !== "number" || todaysWorkoutCount < 0) {
    return createErrorResponse(
      400,
      "todaysWorkoutCount is required and must be a non-negative number",
    );
  }

  logger.info("Generating coach greeting:", {
    userId,
    coachId,
    timeOfDay,
    activeProgramCount,
    todaysWorkoutCount,
    hasLastWorkoutDate: !!requestBody.lastWorkoutDate,
  });

  try {
    // Load the coach config to personalize the greeting
    const coachConfig = await getCoachConfig(userId, coachId);
    if (!coachConfig) {
      return createErrorResponse(404, "Coach not found");
    }

    const coachPersonality = extractCoachPersonality(coachConfig);
    const systemPrompt = buildGreetingSystemPrompt(coachPersonality);
    const userPrompt = buildGreetingUserPrompt(requestBody);

    const greeting = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CONTEXTUAL_MODEL_FULL,
      { temperature: TEMPERATURE_PRESETS.CREATIVE },
    );

    // Ensure we have a string greeting
    const greetingText =
      typeof greeting === "string" ? greeting : JSON.stringify(greeting);

    const response: GenerateGreetingResponse = {
      greeting: greetingText,
      generatedAt: new Date().toISOString(),
    };

    return createOkResponse(response);
  } catch (error) {
    logger.error("Error generating greeting:", error);
    return createErrorResponse(500, "Failed to generate greeting");
  }
};

export const handler = withAuth(baseHandler);
