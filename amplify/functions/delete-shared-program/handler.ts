import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { deactivateSharedProgram } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

/**
 * Deactivate (soft delete) a shared program
 * This makes the share link inactive while preserving the data
 */
const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const sharedProgramId = event.pathParameters?.sharedProgramId;

    if (!sharedProgramId) {
      return createErrorResponse(400, "sharedProgramId is required");
    }

    console.info("Deactivating shared program:", {
      userId,
      sharedProgramId,
    });

    // Deactivate the shared program (verifies ownership internally)
    await deactivateSharedProgram(userId, sharedProgramId);

    console.info("Shared program deactivated successfully:", {
      userId,
      sharedProgramId,
    });

    return createOkResponse(
      {
        sharedProgramId,
        isActive: false,
        message: "Shared program deactivated successfully",
      },
      "Share link is now inactive",
    );
  } catch (error) {
    console.error("Error deactivating shared program:", error);

    // Check if it's an authorization error
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return createErrorResponse(403, error.message);
    }

    return createErrorResponse(
      500,
      "Failed to deactivate shared program",
      error,
    );
  }
};

export const handler = withAuth(baseHandler);
