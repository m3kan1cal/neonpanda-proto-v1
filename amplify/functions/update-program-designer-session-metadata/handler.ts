/**
 * Update Program Designer Session Metadata
 *
 * Handles user-driven rename of a program designer session title.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { updateProgramDesignerSession } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, "sessionId is required");
  }

  if (!event.body) {
    return createErrorResponse(400, "Request body is required");
  }

  let body: any;
  try {
    body = JSON.parse(event.body);
  } catch {
    return createErrorResponse(400, "Request body must be valid JSON");
  }

  const { title } = body ?? {};

  if (title === undefined) {
    return createErrorResponse(400, "title must be provided");
  }

  if (typeof title !== "string") {
    return createErrorResponse(400, "title must be a string");
  }

  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return createErrorResponse(400, "title must not be empty");
  }
  if (trimmed.length > 100) {
    return createErrorResponse(400, "title must be 100 characters or fewer");
  }

  // The DynamoDB update loads the item and throws "not found" if missing,
  // so a separate existence check would just double the reads.
  let updated;
  try {
    updated = await updateProgramDesignerSession(userId, sessionId, {
      title: trimmed,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return createErrorResponse(404, "Program designer session not found");
    }
    throw error;
  }

  logger.info("Program designer session metadata updated:", {
    userId,
    sessionId,
    titleLength: trimmed.length,
  });

  return createOkResponse(
    { session: updated },
    "Program designer session metadata updated successfully",
  );
};

export const handler = withAuth(baseHandler);
