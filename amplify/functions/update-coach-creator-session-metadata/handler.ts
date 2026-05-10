/**
 * Update Coach Creator Session Metadata
 *
 * Handles user-driven rename of a coach creator session title.
 * Separate from update-coach-creator-session (the deprecated message-processing
 * fallback) so the route concerns stay clean: this endpoint is purely metadata.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  getCoachCreatorSession,
  updateCoachCreatorSession,
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

  const existing = await getCoachCreatorSession(userId, sessionId);
  if (!existing) {
    return createErrorResponse(404, "Coach creator session not found");
  }

  const updated = await updateCoachCreatorSession(userId, sessionId, {
    title: trimmed,
  });

  logger.info("Coach creator session metadata updated:", {
    userId,
    sessionId,
    titleLength: trimmed.length,
  });

  return createOkResponse(
    { session: updated },
    "Coach creator session metadata updated successfully",
  );
};

export const handler = withAuth(baseHandler);
