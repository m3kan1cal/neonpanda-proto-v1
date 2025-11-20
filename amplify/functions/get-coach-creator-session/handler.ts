import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getCoachCreatorSession } from "../../dynamodb/operations";
import { CoachCreatorSession } from "../libs/coach-creator/types";
import { getTodoProgress } from "../libs/coach-creator/todo-list-utils";
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

  // Get detailed progress information from to-do list
  // Note: All sessions should have todoList, but provide safe fallback just in case
  const todoProgress = session.todoList
    ? getTodoProgress(session.todoList)
    : { requiredCompleted: 0, requiredTotal: 0, requiredPercentage: 0 };

  // Return the session data with progress details
  const sessionData: CoachCreatorSession = {
    ...session,
    progressDetails: {
      questionsCompleted: todoProgress.requiredCompleted,
      totalQuestions: todoProgress.requiredTotal,
      percentage: todoProgress.requiredPercentage,
      sophisticationLevel: session.sophisticationLevel,
      currentQuestion: todoProgress.requiredCompleted + 1,
    },
  };

  return createOkResponse(sessionData);
};

export const handler = withAuth(baseHandler);
