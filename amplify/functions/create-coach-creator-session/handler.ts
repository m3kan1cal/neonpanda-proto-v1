import {
  createCreatedResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import { saveCoachCreatorSession } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { createEmptyTodoList } from "../libs/coach-creator/todo-list-utils";
import { generateNextQuestion } from "../libs/coach-creator/question-generator";
import { CoachCreatorSession } from "../libs/coach-creator/types";
import { nanoid } from "nanoid";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Create session ID following pattern: coach_creator_${userId}_${timestamp}
  const sessionId = `coach_creator_${userId}_${Date.now()}`;

  // Generate the initial AI message dynamically
  // This ensures consistency with the AI-driven approach and allows
  // the AI to determine the best first question
  console.info(
    "🎬 Generating initial AI message for new coach creator session",
  );

  let initialMessage;
  try {
    initialMessage = await generateNextQuestion(
      [], // Empty conversation history
      createEmptyTodoList(),
      "UNKNOWN", // Sophistication level unknown at start
    );
    console.info("✅ AI generated initial message successfully");
  } catch (error) {
    console.error("❌ Error generating initial message:", error);
    initialMessage = null;
  }

  // Fallback if AI generation fails - aligned with NeonPanda brand voice
  const finalInitialMessage =
    initialMessage ||
    `Hey! Ready to create your AI coach? We're building a coach that actually gets YOU - your personality, your goals, your vibe. In about 15-20 minutes, we'll craft an AI coach as unique as your fingerprint, but way better at programming workouts, tracking progress, and guiding you to your goals.

I'll adapt based on your experience level, so just be real with me. What are your main fitness goals right now?`;

  if (!initialMessage) {
    console.warn(
      "⚠️ Using fallback initial message - AI generation may have failed",
    );
  }

  const session: CoachCreatorSession = {
    userId,
    sessionId,
    todoList: createEmptyTodoList(),
    conversationHistory: [
      {
        id: `msg_${Date.now()}_${userId}_assistant`,
        role: "assistant",
        content: finalInitialMessage,
        timestamp: new Date(),
        metadata: {
          mode: "coach_creator",
          isQuestion: true,
        },
      },
    ],
    sophisticationLevel: "UNKNOWN",
    isComplete: false,
    startedAt: new Date(),
    lastActivity: new Date(),
  };

  // Save session to DynamoDB
  await saveCoachCreatorSession(session);

  return createCreatedResponse({
    sessionId: session.sessionId,
    progress: 0,
    estimatedDuration: "15-20 minutes",
    totalQuestions: 22, // Number of to-do list items (required fields)
    initialMessage: finalInitialMessage,
  });
};

export const handler = withAuth(baseHandler);
