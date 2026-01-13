/**
 * Get Exercise Logs Lambda Handler
 *
 * Queries exercise history for a specific exercise name.
 * Returns exercise logs with aggregated statistics (PR, averages, trends).
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryExercises } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters
  const queryParams = event.queryStringParameters || {};
  const { exerciseName, fromDate, toDate, limit, sortOrder, cursor } =
    queryParams;

  // Validate required parameters
  if (!exerciseName) {
    return createErrorResponse(400, "exerciseName is required");
  }

  // Validate date formats if provided
  if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    return createErrorResponse(
      400,
      "Invalid fromDate format. Use YYYY-MM-DD format.",
    );
  }

  if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return createErrorResponse(
      400,
      "Invalid toDate format. Use YYYY-MM-DD format.",
    );
  }

  // Validate limit
  let limitNum: number | undefined;
  if (limit) {
    limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return createErrorResponse(
        400,
        "limit must be a number between 1 and 100",
      );
    }
  }

  // Validate sortOrder
  if (sortOrder && !["asc", "desc"].includes(sortOrder)) {
    return createErrorResponse(400, 'sortOrder must be either "asc" or "desc"');
  }

  console.info("Querying exercise history:", {
    userId,
    exerciseName,
    fromDate,
    toDate,
    limit: limitNum,
    sortOrder,
    hasCursor: !!cursor,
  });

  try {
    const result = await queryExercises(userId, exerciseName, {
      fromDate,
      toDate,
      limit: limitNum,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      lastEvaluatedKey: cursor,
    });

    // Transform exercises for response
    const exercises = result.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      originalName: exercise.originalName,
      discipline: exercise.discipline,
      completedAt: exercise.completedAt,
      workoutId: exercise.workoutId,
      sequence: exercise.sequence,
      metrics: exercise.metrics,
      metadata: {
        normalizationConfidence: exercise.metadata.normalizationConfidence,
        notes: exercise.metadata.notes,
      },
    }));

    return createOkResponse({
      exerciseName,
      exercises,
      aggregations: result.aggregations,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error querying exercise history:", error);
    return createErrorResponse(500, "Failed to query exercise history");
  }
};

export const handler = withAuth(baseHandler, { allowInternalCalls: true });
