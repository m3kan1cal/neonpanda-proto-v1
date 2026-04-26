import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  deleteExercisesByWorkoutId,
  deleteWorkout,
  getWorkout,
} from "../../dynamodb/operations";
import { deleteWorkoutSummaryFromPinecone } from "../libs/workout/pinecone";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  const workoutId = event.pathParameters?.workoutId;
  if (!workoutId) {
    return createErrorResponse(400, "workoutId is required");
  }

  try {
    logger.info("Deleting workout session:", {
      userId,
      workoutId,
    });

    // Check if workout exists first
    const existingWorkout = await getWorkout(userId, workoutId);
    if (!existingWorkout) {
      return createErrorResponse(404, "Workout not found");
    }

    // Delete the workout session from DynamoDB
    await deleteWorkout(userId, workoutId);

    // Cascade-delete exercise rows tied to this workout (non-blocking)
    let exercisesDeleted = 0;
    try {
      const result = await deleteExercisesByWorkoutId(userId, workoutId);
      exercisesDeleted = result.deleted;
    } catch (err) {
      logger.error(
        "Failed to delete exercises for workout (non-blocking):",
        err,
      );
    }

    // Clean up associated workout summary from Pinecone
    logger.info("🗑️ Cleaning up workout summary from Pinecone..");
    const pineconeResult = await deleteWorkoutSummaryFromPinecone(
      userId,
      workoutId,
    );

    // Return success response
    return createOkResponse({
      message: "Workout deleted successfully",
      workoutId,
      userId,
      exercisesDeleted,
      pineconeCleanup: pineconeResult.success,
    });
  } catch (error) {
    logger.error("Error deleting workout session:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return createErrorResponse(404, error.message);
      }
      if (
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        return createErrorResponse(400, error.message);
      }
    }

    return createErrorResponse(500, "Internal server error");
  }
};

export const handler = withAuth(baseHandler, { allowInternalCalls: true });
