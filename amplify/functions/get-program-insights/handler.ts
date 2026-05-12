import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  getProgram,
  getProgramInsights,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    const userId = event.user.userId;
    const coachId = event.pathParameters?.coachId;
    const programId = event.pathParameters?.programId;

    if (!coachId) {
      return createErrorResponse(400, "coachId is required");
    }
    if (!programId) {
      return createErrorResponse(400, "programId is required");
    }

    // Enforce coach ownership — getProgram() returns null when the program
    // doesn't exist OR when it exists but isn't owned by this coach. This
    // mirrors the sibling get-program endpoint's check so the coachId path
    // segment isn't dead validation.
    const program = await getProgram(userId, coachId, programId);
    if (!program) {
      return createErrorResponse(404, "Training program not found");
    }

    const insights = await getProgramInsights(userId, programId);

    // Return 200 with null payload when no synthesis exists yet — frontend
    // renders the empty state. Avoids treating a brand-new program as 404.
    return createOkResponse({ programInsights: insights });
  } catch (error) {
    logger.error("Error getting program insights:", error);
    return createErrorResponse(500, "Failed to get program insights", error);
  }
};

export const handler = withAuth(baseHandler);
