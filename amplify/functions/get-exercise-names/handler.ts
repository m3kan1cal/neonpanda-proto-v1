/**
 * Get Exercise Names Lambda Handler
 *
 * Queries distinct exercise names for a user.
 * Returns list of exercises with counts and last performed dates.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryExerciseNames } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import type { ExerciseDiscipline } from "../libs/exercise/types";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters
  const queryParams = event.queryStringParameters || {};
  const { discipline, limit } = queryParams;

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

  console.info("Querying exercise names:", {
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
    console.error("Error querying exercise names:", error);
    return createErrorResponse(500, "Failed to query exercise names");
  }
};

export const handler = withAuth(baseHandler, { allowInternalCalls: true });
