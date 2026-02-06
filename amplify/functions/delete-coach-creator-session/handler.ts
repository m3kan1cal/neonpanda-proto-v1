import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  deleteCoachCreatorSession,
  getCoachCreatorSession,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { deleteCoachCreatorSummaryFromPinecone } from "../libs/coach-creator/pinecone";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  const sessionId = event.pathParameters?.sessionId;
  if (!sessionId) {
    return createErrorResponse(400, "sessionId is required");
  }

  console.info("Deleting coach creator session:", {
    userId,
    sessionId,
  });

  // Check if session exists first
  const existingSession = await getCoachCreatorSession(userId, sessionId);
  if (!existingSession) {
    return createErrorResponse(404, "Coach creator session not found");
  }

  // Delete the session from DynamoDB
  await deleteCoachCreatorSession(userId, sessionId);

  // Delete the session summary from Pinecone (non-blocking on failure)
  const pineconeResult = await deleteCoachCreatorSummaryFromPinecone(
    userId,
    sessionId,
  );
  if (pineconeResult.success) {
    console.info("✅ Coach creator session summary deleted from Pinecone");
  } else {
    console.warn(
      "⚠️ Failed to delete coach creator session summary from Pinecone:",
      pineconeResult.error,
    );
  }

  // Return success response
  return createOkResponse({
    message: "Coach creator session deleted successfully",
    sessionId,
  });
};

export const handler = withAuth(baseHandler);
