/**
 * Get Exercise Names Lambda Handler
 *
 * Queries distinct exercise names for a user.
 * Returns list of exercises with counts and last performed dates.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryExerciseNames } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import {
  SUPPORTED_DISCIPLINES,
  type ExerciseDiscipline,
} from "../libs/exercise/types";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters
  const queryParams = event.queryStringParameters || {};
  const { discipline, limit } = queryParams;

  // Derive valid disciplines from the SUPPORTED_DISCIPLINES single source of
  // truth so a new backend enum value is automatically accepted here.
  if (
    discipline &&
    !(SUPPORTED_DISCIPLINES as readonly string[]).includes(discipline)
  ) {
    return createErrorResponse(
      400,
      `Invalid discipline. Must be one of: ${SUPPORTED_DISCIPLINES.join(", ")}`,
    );
  }

  // Validate limit
  let limitNum: number | undefined;
  if (limit) {
    limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return createErrorResponse(
        400,
        "limit must be a number between 1 and 500",
      );
    }
  }

  logger.info("Querying exercise names:", {
    userId,
    discipline,
    limit: limitNum,
  });

  try {
    const result = await queryExerciseNames(userId, {
      discipline: discipline as ExerciseDiscipline | undefined,
      limit: limitNum,
    });

    return createOkResponse({
      exercises: result.exercises,
      totalCount: result.totalCount,
    });
  } catch (error) {
    logger.error("Error querying exercise names:", error);
    return createErrorResponse(500, "Failed to query exercise names");
  }
};

export const handler = withAuth(baseHandler, { allowInternalCalls: true });
