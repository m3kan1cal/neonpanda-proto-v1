/**
 * Goodbye Auto-Complete for Workout Collection
 *
 * When the user sends a closing/goodbye message (e.g., "Thanks", "Bye") during an
 * active workout collection session and we have substantial data (5/6+ required
 * fields), auto-complete the session and trigger workout creation rather than
 * losing the data. This prevents the scenario where "Thanks" drops an 83%-complete
 * workout.
 */

import {
  CoachMessage,
  MESSAGE_TYPES,
  CONVERSATION_MODES,
} from "../coach-conversation/types";
import { MODEL_IDS, invokeAsyncLambda } from "../api-helpers";
import { saveCoachConversation } from "../../../dynamodb/operations";
import { formatChunkEvent, formatCompleteEvent } from "../streaming";
import type { BusinessLogicParams, ConversationData } from "../streaming";
import { getTodoProgress, hasSubstantialProgress } from "./todo-list-utils";
import type { WorkoutCreatorSession } from "./types";
import { logger } from "../logger";

/** Patterns that indicate a closing/goodbye message */
export const GOODBYE_PATTERNS =
  /^\s*(thanks|thank you|thx|bye|goodbye|see you|ttyl|talk later|peace|cheers|gotta go|good night|goodnight|take care|have a good|heading out|peace out)\s*[.!?]?\s*$/i;

/**
 * Check if the user's message is a closing/goodbye message
 */
export function isGoodbyeMessage(userResponse: string): boolean {
  return GOODBYE_PATTERNS.test(userResponse.trim());
}

export interface GoodbyeAutoCompleteParams {
  params: BusinessLogicParams;
  conversationData: ConversationData;
  fullWorkoutSession: WorkoutCreatorSession;
  workoutSession: {
    todoList: WorkoutCreatorSession["todoList"];
    conversationHistory: WorkoutCreatorSession["conversationHistory"];
    imageS3Keys?: string[];
  };
}

/**
 * If the user sent a goodbye message and we have substantial workout data,
 * auto-complete the session, trigger build-workout, and return handled=true.
 * Otherwise yield nothing and return handled=false so the caller continues
 * to the normal conversation handler.
 */
export async function* handleGoodbyeAutoComplete(
  opts: GoodbyeAutoCompleteParams,
): AsyncGenerator<string, { handled: boolean }, unknown> {
  const { params, conversationData, fullWorkoutSession, workoutSession } = opts;

  if (!isGoodbyeMessage(params.userResponse)) {
    return { handled: false };
  }

  const goodbyeProgress = getTodoProgress(fullWorkoutSession.todoList);
  const hasEnoughData = hasSubstantialProgress(fullWorkoutSession.todoList);

  if (!hasEnoughData) {
    logger.info(
      `📋 Goodbye detected but insufficient progress (${goodbyeProgress.requiredPercentage}%) - letting conversation handler process normally`,
    );
    return { handled: false };
  }

  logger.info(
    `📋 Goodbye detected with substantial progress (${goodbyeProgress.requiredPercentage}%) - auto-completing workout session`,
  );

  // Mark session complete
  fullWorkoutSession.isComplete = true;

  // Build a friendly completion message
  const completionMsg =
    "Got it! I'll log that workout for you with what we've collected. Great session!";
  yield formatChunkEvent(completionMsg);

  // Collect workout data and trigger build
  const fullUserMessage = fullWorkoutSession.conversationHistory
    .filter((m: any) => m.role === "user")
    .map((m: any) => m.content)
    .join(" ");

  const buildWorkoutFunction = process.env.BUILD_WORKOUT_FUNCTION_NAME;
  if (buildWorkoutFunction) {
    try {
      await invokeAsyncLambda(
        buildWorkoutFunction,
        {
          userId: params.userId,
          coachId: params.coachId,
          conversationId: params.conversationId,
          userMessage: fullUserMessage,
          coachConfig: conversationData.coachConfig,
          imageS3Keys: workoutSession.imageS3Keys || [],
          userTimezone: conversationData.userProfile?.timezone,
          criticalTrainingDirective:
            conversationData.userProfile?.critical_training_directive,
        },
        "goodbye auto-complete workout creation",
      );
      logger.info(
        "✅ Triggered async workout creation (goodbye auto-complete)",
      );
    } catch (error) {
      logger.error("❌ Failed to trigger workout creation on goodbye:", error);
    }
  }

  // Create messages
  const goodbyeUserMessage: CoachMessage = {
    id: `msg_${Date.now()}_user`,
    role: "user",
    content: params.userResponse,
    timestamp: new Date(),
    ...(params.imageS3Keys && params.imageS3Keys.length > 0
      ? {
          imageS3Keys: params.imageS3Keys,
          messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
        }
      : {}),
  };

  const goodbyeAiMessage: CoachMessage = {
    id: `msg_${Date.now()}_assistant`,
    role: "assistant",
    content: completionMsg,
    timestamp: new Date(),
    metadata: {
      model: MODEL_IDS.EXECUTOR_MODEL_DISPLAY,
      mode: CONVERSATION_MODES.WORKOUT_LOG,
    },
  };

  // Clear session and reset mode
  delete conversationData.existingConversation.workoutCreatorSession;
  conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;

  // Add messages and save
  conversationData.existingConversation.messages.push(
    goodbyeUserMessage,
    goodbyeAiMessage,
  );
  conversationData.existingConversation.metadata.lastActivity = new Date();
  conversationData.existingConversation.metadata.totalMessages =
    conversationData.existingConversation.messages.length;

  await saveCoachConversation(conversationData.existingConversation);

  // Yield complete event
  yield formatCompleteEvent({
    messageId: goodbyeAiMessage.id,
    aiMessage: goodbyeAiMessage,
    type: "complete",
    fullMessage: completionMsg,
    aiResponse: completionMsg,
    isComplete: true,
    mode: CONVERSATION_MODES.CHAT,
    workoutCreatorSession: undefined,
    metadata: {
      workoutCollectionInProgress: false,
      workoutGenerationTriggered: true,
      goodbyeAutoComplete: true,
    },
  });

  logger.info("✅ Workout auto-completed on goodbye");
  return { handled: true };
}
