import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getCoachCreatorSession } from "../../dynamodb/operations";
import { CoachCreatorSession } from "../libs/coach-creator/types";
import { getProgress } from "../libs/coach-creator/session-management";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  const sessionId = event.pathParameters?.sessionId;
  if (!sessionId) {
    return createErrorResponse(400, "Missing sessionId in path parameters.");
  }

  // Load the coach creator session from DynamoDB
  const session = await getCoachCreatorSession(userId, sessionId);

  if (!session) {
    return createErrorResponse(
      404,
      "Coach creator session not found or expired"
    );
  }

  // Get detailed progress information
  const progressDetails = getProgress(session.attributes.userContext);

  // Return the session data with progress details
  const sessionData: CoachCreatorSession = {
    ...session.attributes,
    progressDetails: {
      questionsCompleted: progressDetails.questionsCompleted,
      totalQuestions: progressDetails.totalQuestions,
      percentage: progressDetails.percentage,
      sophisticationLevel: session.attributes.userContext.sophisticationLevel,
      currentQuestion: session.attributes.userContext.currentQuestion,
    },
  };

  return createOkResponse(sessionData);
};

export const handler = withAuth(baseHandler);
