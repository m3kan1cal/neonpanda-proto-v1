import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { querySharedPrograms } from "../../dynamodb/operations";
import { QuerySharedProgramsResponse } from "../libs/shared-program/types";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

/**
 * Get all shared programs created by the authenticated user
 */
const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;

    console.info("Querying shared programs for user:", { userId });

    // Query all shared programs for this user
    const sharedPrograms = await querySharedPrograms(userId);

    const response: QuerySharedProgramsResponse = {
      sharedPrograms: sharedPrograms.map((sp) => ({
        ...sp,
        createdAt: sp.createdAt ? new Date(sp.createdAt) : new Date(),
        updatedAt: sp.updatedAt ? new Date(sp.updatedAt) : new Date(),
      })),
    };

    console.info("Shared programs queried successfully:", {
      userId,
      count: sharedPrograms.length,
    });

    return createOkResponse(response);
  } catch (error) {
    console.error("Error querying shared programs:", error);
    return createErrorResponse(500, "Failed to query shared programs", error);
  }
};

export const handler = withAuth(baseHandler);
