import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getProgramDesignerSession } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

/**
 * Get a specific program designer session
 * Route: GET /users/{userId}/program-designer-sessions/{sessionId}
 */
const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, "Missing sessionId path parameter");
  }

  // Load session from DynamoDB
  const session = await getProgramDesignerSession(userId, sessionId);

  if (!session) {
    return createErrorResponse(404, "Program designer session not found");
  }

  return createOkResponse({ session });
};

export const handler = withAuth(baseHandler);
