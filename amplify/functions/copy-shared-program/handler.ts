/**
 * copy-shared-program Lambda Handler
 *
 * Instantly copies a shared program to a user's account.
 * Pattern: Similar to create-coach-config-from-template (thin handler).
 *
 * Handler responsibilities:
 * - Validate inputs
 * - Call business logic in copy-utils
 * - Return formatted response
 * - Handle errors
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { copySharedProgramToUser } from "../libs/shared-program/copy-utils";
import { incrementSharedProgramCopies } from "../../dynamodb/operations";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const sharedProgramId = event.pathParameters?.sharedProgramId;

  if (!sharedProgramId) {
    return createErrorResponse(400, "sharedProgramId is required");
  }

  if (!event.body) {
    return createErrorResponse(400, "Request body is required");
  }

  let coachId: string;
  try {
    const body = JSON.parse(event.body);
    coachId = body.coachId;
  } catch (error) {
    return createErrorResponse(400, "Invalid request body");
  }

  if (!coachId) {
    return createErrorResponse(400, "coachId is required");
  }

  try {
    console.info("Copying shared program:", {
      userId,
      sharedProgramId,
      coachId,
    });

    // Copy the shared program to user's account
    const result = await copySharedProgramToUser(
      userId,
      sharedProgramId,
      coachId,
    );

    // Increment copy count on the source shared program
    await incrementSharedProgramCopies(sharedProgramId);

    console.info("Successfully copied shared program:", {
      userId,
      sharedProgramId,
      newProgramId: result.programId,
      programName: result.programName,
    });

    return createOkResponse({
      programId: result.programId,
      programName: result.programName,
      coachId: result.coachId,
      coachName: result.coachName,
      message: "Program copied successfully. Ready to start!",
    });
  } catch (error) {
    console.error("Error copying shared program:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      // Check inactive BEFORE not found to avoid ambiguous error messages
      if (error.message.includes("inactive")) {
        return createErrorResponse(400, error.message);
      }

      if (error.message.includes("not found")) {
        return createErrorResponse(404, error.message);
      }
    }

    return createErrorResponse(500, "Failed to copy program", error);
  }
};

export const handler = withAuth(baseHandler);
