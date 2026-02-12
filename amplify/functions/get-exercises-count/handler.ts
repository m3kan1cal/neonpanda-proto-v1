/**
 * Get Exercises Count Lambda Handler
 *
 * Returns count of unique exercise names for a user.
 * Supports optional discipline filtering.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryExercisesCount } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import type { ExerciseDiscipline } from "../libs/exercise/types";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters
  const queryParams = event.queryStringParameters || {};
  const { discipline } = queryParams;

  // Validate discipline if provided
  const validDisciplines: ExerciseDiscipline[] = [
    "crossfit",
    "powerlifting",
    "bodybuilding",
    "running",
    "hyrox",
    "olympic_weightlifting",
    "functional_bodybuilding",
    "calisthenics",
  ];

  if (
    discipline &&
    !validDisciplines.includes(discipline as ExerciseDiscipline)
  ) {
    return createErrorResponse(
      400,
      `Invalid discipline. Must be one of: ${validDisciplines.join(", ")}`,
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
