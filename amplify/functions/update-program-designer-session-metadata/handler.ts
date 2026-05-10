/**
 * Update Program Designer Session Metadata
 *
 * Handles user-driven rename of a program designer session title.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  getProgramDesignerSession,
  updateProgramDesignerSession,
} from "../../dynamodb/operations";
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

  const existing = await getProgramDesignerSession(userId, sessionId);
  if (!existing) {
    return createErrorResponse(404, "Program designer session not found");
  }

  const updated = await updateProgramDesignerSession(userId, sessionId, {
    title: trimmed,
  });

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
