/**
 * Explain Term Lambda Handler
 *
 * Provides AI-generated explanations for fitness terms:
 * - Equipment: What it is, what it looks like, what it's used for
 * - Exercises: What it is, muscles targeted, proper form, common mistakes
 * - Focus Areas: What this training focus means, why it's important
 */

import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../libs/api-helpers";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import type {
  ExplainTermRequest,
  ExplainTermResponse,
} from "../libs/explain/types";
import { VALID_TERM_TYPES, TERM_TYPE_LABELS } from "../libs/explain/types";
import { logger } from "../libs/logger";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "../libs/explain/prompt-generation";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse request body
  let requestBody: ExplainTermRequest;
  try {
    requestBody = JSON.parse(event.body || "{}") as ExplainTermRequest;
  } catch {
    return createErrorResponse(400, "Invalid JSON in request body");
  }

  const { term, termType } = requestBody;

  // Validate required fields
  if (!term || typeof term !== "string" || term.trim().length === 0) {
    return createErrorResponse(
      400,
      "term is required and must be a non-empty string",
    );
  }

  if (!termType) {
    return createErrorResponse(400, "termType is required");
  }

  // Validate termType
  if (!VALID_TERM_TYPES.includes(termType)) {
    return createErrorResponse(
      400,
      `Invalid termType. Must be one of: ${VALID_TERM_TYPES.join(", ")}`,
    );
  }

  const cleanTerm = term.trim();

  logger.info("Explaining term:", {
    userId,
    term: cleanTerm,
    termType,
    termTypeLabel: TERM_TYPE_LABELS[termType],
  });

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(termType, cleanTerm);

    const explanation = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.EXECUTOR_MODEL_FULL,
      { temperature: TEMPERATURE_PRESETS.BALANCED },
    );

    // Ensure we have a string explanation
    const explanationText =
      typeof explanation === "string"
        ? explanation
        : JSON.stringify(explanation);

    const response: ExplainTermResponse = {
      term: cleanTerm,
      termType,
      explanation: explanationText,
      generatedAt: new Date().toISOString(),
    };

    return createOkResponse(response);
  } catch (error) {
    logger.error("Error generating explanation:", error);
    return createErrorResponse(500, "Failed to generate explanation");
  }
};

export const handler = withAuth(baseHandler);
