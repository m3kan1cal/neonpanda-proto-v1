import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getSharedProgram } from "../../dynamodb/operations";
import { GetSharedProgramResponse } from "../libs/shared-program/types";
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

    // Return public-facing data only (no S3 keys or internal IDs)
    const response: GetSharedProgramResponse = {
      sharedProgramId: sharedProgram.sharedProgramId,
      creatorUsername: sharedProgram.creatorUsername,
      programSnapshot: sharedProgram.programSnapshot,
      createdAt: sharedProgram.createdAt
        ? new Date(sharedProgram.createdAt).toISOString()
        : new Date().toISOString(),
    };

    console.info("Shared program retrieved successfully:", {
      sharedProgramId,
      programName: sharedProgram.programSnapshot.name,
      creatorUsername: sharedProgram.creatorUsername,
    });

    // TODO: Track analytics event: share_link_viewed

    return createOkResponse(response);
  } catch (error) {
    console.error("Error getting shared program:", error);
    return createErrorResponse(500, "Failed to get shared program", error);
  }
};
