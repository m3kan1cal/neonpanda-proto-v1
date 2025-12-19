/**
 * DEPRECATED: This handler is kept as a fallback for non-streaming clients
 * The primary handler is stream-coach-creator-session (Lambda Function URL)
 *
 * This uses the same to-do list approach but without streaming
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  saveCoachCreatorSession,
  getCoachCreatorSession,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { extractAndUpdateTodoList } from "../libs/coach-creator/todo-extraction";
import { generateNextQuestion } from "../libs/coach-creator/question-generator";
import {
  getTodoProgress,
  isSessionComplete,
} from "../libs/coach-creator/todo-list-utils";
import {
  markSessionComplete,
  saveSessionAndTriggerCoachConfig,
} from "../libs/coach-creator/session-management";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  const sessionId = event.pathParameters?.sessionId;
  const { userResponse, messageTimestamp, imageS3Keys } = JSON.parse(
    event.body || "{}",
  );

  if (!sessionId || !userResponse) {
    return createErrorResponse(
      400,
      "Missing required fields: sessionId or userResponse",
    );
  }

  // Load session
  const session = await getCoachCreatorSession(userId, sessionId);

  if (!session) {
    return createErrorResponse(404, "Session not found or expired");
  }

  // Check if session is already complete
  if (session.isComplete) {
    return createErrorResponse(409, "Session is already complete");
  }

  try {
    // Step 1: Store user message in conversation history
    session.conversationHistory = session.conversationHistory || [];
    session.conversationHistory.push({
      id: `msg_${Date.now()}_${session.userId}_user`,
      role: "user",
      content: userResponse,
      timestamp: new Date(),
      messageType: "text",
    });

    // Step 2: Extract information and update to-do list
    session.todoList = await extractAndUpdateTodoList(
      userResponse,
      session.conversationHistory,
      session.todoList!,
    );

    // Step 3: Check if session is complete
    const complete = isSessionComplete(session.todoList!);

    // Step 4: Generate AI response
    const aiResponse = await generateNextQuestion(
      session.conversationHistory,
      session.todoList!,
      session.sophisticationLevel || "UNKNOWN",
    );

    // Step 5: Store AI response
    if (aiResponse) {
      session.conversationHistory.push({
        id: `msg_${Date.now()}_${session.userId}_assistant`,
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
        metadata: {
          mode: "coach_creator",
          isQuestion: !complete,
        },
      });
    }

    // Step 6: Update session metadata
    session.lastActivity = new Date();
    if (complete) {
      markSessionComplete(session);
    }

    // Step 7: Get progress
    const todoProgress = getTodoProgress(session.todoList!);
    const progressDetails = {
      questionsCompleted: todoProgress.requiredCompleted,
      totalQuestions: todoProgress.requiredTotal,
      percentage: todoProgress.requiredPercentage,
      sophisticationLevel: session.sophisticationLevel || "UNKNOWN",
      currentQuestion: todoProgress.requiredCompleted + 1,
    };

    // Step 8: Save session and trigger coach config if complete
    await saveSessionAndTriggerCoachConfig(
      userId,
      sessionId,
      session,
      complete,
    );

    // Step 9: Return response
    return createOkResponse({
      success: true,
      sessionId,
      aiResponse,
      isComplete: complete,
      progressDetails,
    });
  } catch (error) {
    console.error("Error updating coach creator session:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to update session",
    );
  }
};

export const handler = withAuth(baseHandler);
