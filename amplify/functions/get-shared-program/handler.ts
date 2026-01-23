import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  getSharedProgram,
  incrementSharedProgramViews,
} from "../../dynamodb/operations";
import { GetSharedProgramResponse } from "../libs/shared-program/types";
import {
  getSharedProgramDetailsFromS3,
  selectSampleWorkouts,
} from "../libs/shared-program/s3-utils";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

/**
 * Public endpoint - no authentication required
 * Allows anyone with the link to view a shared program preview
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sharedProgramId = event.pathParameters?.sharedProgramId;

    if (!sharedProgramId) {
      return createErrorResponse(400, "sharedProgramId is required");
    }

    // Get the shared program (public access)
    const sharedProgram = await getSharedProgram(sharedProgramId);

    if (!sharedProgram) {
      return createErrorResponse(404, "Shared program not found");
    }

    // Get sample workouts from S3 (for preview only, limit to 3-4 workouts)
    let sampleWorkouts: any[] = [];
    try {
      const sharedDetails = await getSharedProgramDetailsFromS3(
        sharedProgram.s3DetailKey,
      );
      if (sharedDetails && sharedDetails.workoutTemplates) {
        sampleWorkouts = selectSampleWorkouts(
          sharedDetails.workoutTemplates,
          4,
        );
      }
    } catch (s3Error) {
      console.warn("Failed to load sample workouts from S3:", s3Error);
      // Don't fail the whole request if we can't load workouts
    }

    // Increment view count (fire-and-forget, don't block response)
    incrementSharedProgramViews(sharedProgramId).catch((error) => {
      console.warn(
        "Failed to increment view count (non-critical):",
        sharedProgramId,
        error,
      );
    });

    // Return public-facing data only (no S3 keys or internal IDs)
    const response: GetSharedProgramResponse = {
      sharedProgramId: sharedProgram.sharedProgramId,
      creatorUserId: sharedProgram.creatorUserId, // For frontend ownership check
      creatorUsername: sharedProgram.creatorUsername,
      programSnapshot: sharedProgram.programSnapshot,
      sampleWorkouts, // Include sample workouts for preview
      createdAt: sharedProgram.createdAt
        ? new Date(sharedProgram.createdAt).toISOString()
        : new Date().toISOString(),
      // Engagement metrics (use stored values, since increment is async)
      viewCount: sharedProgram.viewCount || 0,
      copyCount: sharedProgram.copyCount || 0,
    };

    console.info("Shared program retrieved successfully:", {
      sharedProgramId,
      programName: sharedProgram.programSnapshot.name,
      creatorUsername: sharedProgram.creatorUsername,
      sampleWorkoutsCount: sampleWorkouts.length,
      viewCount: sharedProgram.viewCount || 0,
    });

    return createOkResponse(response);
  } catch (error) {
    console.error("Error getting shared program:", error);
    return createErrorResponse(500, "Failed to get shared program", error);
  }
};
