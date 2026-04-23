/**
 * Get Exercises Count Lambda Handler
 *
 * Returns count of unique exercise names for a user.
 * Supports optional discipline filtering.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryExercisesCount } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import {
  SUPPORTED_DISCIPLINES,
  isSupportedDiscipline,
  type ExerciseDiscipline,
} from "../libs/exercise/types";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters
  const queryParams = event.queryStringParameters || {};
  const { discipline } = queryParams;

  // Derive valid disciplines from the SUPPORTED_DISCIPLINES single source of
  // truth so a new backend enum value is automatically accepted here.
  if (
    discipline &&
    !isSupportedDiscipline(discipline)
  ) {
    return createErrorResponse(
      400,
      `Invalid discipline. Must be one of: ${SUPPORTED_DISCIPLINES.join(", ")}`,
    );
  }

  logger.info("Counting exercises for user:", {
    userId,
    discipline,
  });

  try {
    const count = await queryExercisesCount(userId, {
      discipline: discipline as ExerciseDiscipline | undefined,
    });

    return createOkResponse({
      count,
    });
  } catch (error) {
    logger.error("Error counting exercises:", error);
    return createErrorResponse(500, "Failed to count exercises");
  }
};

export const handler = withAuth(baseHandler);
