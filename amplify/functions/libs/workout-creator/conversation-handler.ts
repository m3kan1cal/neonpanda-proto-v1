/**
 * Workout Creator Conversation Handler
 *
 * Handles the conversational flow for workout logging using the to-do list approach.
 * This module orchestrates the multi-turn workout collection and triggers build-workout when complete.
 *
 * Pattern: Same structure as coach-creator/conversation-handler.ts
 */

import { generateNextQuestionStream } from "./question-generator";
import { formatChunkEvent } from "../streaming";
import { extractAndUpdateTodoList } from "./todo-extraction";
import {
  getTodoProgress,
  isSessionComplete,
  hasSubstantialProgress,
  shouldPromptHighPriorityRecommendedFields,
  shouldPromptLowPriorityRecommendedFields,
  getCollectedDataSummary,
} from "./todo-list-utils";
import { ConversationMessage } from "../todo-types";
import { WorkoutCreatorSession, REQUIRED_WORKOUT_FIELDS } from "./types";

export interface WorkoutConversationResult {
  cleanedResponse: string;
  isComplete: boolean;
  sessionCancelled?: boolean; // AI detected topic change - session should be cancelled
  progressDetails: {
    completed: number;
    total: number;
    percentage: number;
  };
  error?: string;
}

/**
 * Helper function to complete the workout logging session
 * Handles common logic for all completion paths
 */
async function* completeWorkoutSession(
  session: WorkoutCreatorSession,
  completionMsg: string,
  logLevel: "info" | "warn" = "info",
  logPrefix?: string,
): AsyncGenerator<string, WorkoutConversationResult, unknown> {
  session.isComplete = true;

  yield formatChunkEvent(completionMsg);

  session.conversationHistory.push({
    role: "ai",
    content: completionMsg,
    timestamp: new Date().toISOString(),
  });

  const todoProgress = getTodoProgress(session.todoList);
  const collectedData = getCollectedDataSummary(session.todoList);

  // Log completion details
  const logMessage = `📋 TODO LIST BEFORE RETURN${logPrefix ? ` (${logPrefix})` : ""}:`;
  const logData = {
    turn: session.turnCount,
    isComplete: true,
    progress: {
      required: `${todoProgress.requiredCompleted}/${todoProgress.requiredTotal} (${todoProgress.requiredPercentage}%)`,
      highPriority: `${todoProgress.highPriorityCompleted}/${todoProgress.highPriorityTotal} (${todoProgress.highPriorityPercentage}%)`,
      lowPriority: `${todoProgress.lowPriorityCompleted}/${todoProgress.lowPriorityTotal} (${todoProgress.lowPriorityPercentage}%)`,
    },
    collectedData: collectedData,
  };

  if (logLevel === "warn") {
    console.warn(logMessage, logData);
  } else {
    console.info(logMessage, logData);
  }

  return {
    cleanedResponse: completionMsg,
    isComplete: true,
    progressDetails: {
      completed: todoProgress.requiredCompleted,
      total: REQUIRED_WORKOUT_FIELDS.length,
      percentage: todoProgress.requiredPercentage,
    },
  };
}

/**
 * Handle to-do list based conversational flow for workout logging
 * Generates next question dynamically based on what's been collected
 * Supports multimodal input (text + images)
 *
 * Pattern: Same structure as program-designer/conversation-handler.ts
 */
export async function* handleTodoListConversation(
  userResponse: string,
  session: WorkoutCreatorSession,
  imageS3Keys?: string[],
  coachConfig?: any,
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
): AsyncGenerator<string, any, unknown> {
  console.info("✨ Handling workout to-do list conversation");

  if (imageS3Keys && imageS3Keys.length > 0) {
    console.info("🖼️ Conversation includes images:", {
      imageCount: imageS3Keys.length,
      imageKeys: imageS3Keys,
    });
  }

  try {
    // Step 1: Extract information from user response and update todoList FIRST
    console.info(
      "🔍 Extracting information and updating workout to-do list BEFORE generating next question",
    );

    // Add user message to history
    session.conversationHistory = session.conversationHistory || [];
    const userMessage: ConversationMessage = {
      role: "user",
      content: userResponse,
      timestamp: new Date().toISOString(),
    };

    // Add images to message if present
    if (imageS3Keys && imageS3Keys.length > 0) {
      userMessage.imageS3Keys = imageS3Keys;
      userMessage.messageType = "text_with_images";
    }

    session.conversationHistory.push(userMessage);

    // Increment turn counter
    session.turnCount = (session.turnCount || 0) + 1;
    console.info(`📊 Turn ${session.turnCount} of workout collection`);

    // Extract with multimodal support (returns todoList + AI-detected skip intent)
    const extractionResult = await extractAndUpdateTodoList(
      userResponse,
      session.conversationHistory,
      session.todoList,
      imageS3Keys, // Pass images to extraction
      userContext, // Pass user context for smarter extraction
    );

    // Update session with extracted data
    session.todoList = extractionResult.todoList;

    // GUARD: Override userWantsToFinish for very short or ambiguous messages
    // A message under 5 characters that doesn't contain explicit finish language
    // should NEVER trigger session completion (e.g., "Um", "Hm", "Ok", "?")
    const EXPLICIT_FINISH_PATTERNS =
      /\b(done|skip|finish|log it|that'?s (all|it)|i'?m done|just log|save it|yes|yep|yeah|yea)\b/i;
    if (
      extractionResult.userWantsToFinish &&
      userResponse.trim().length < 5 &&
      !EXPLICIT_FINISH_PATTERNS.test(userResponse.trim())
    ) {
      console.warn(
        `⚠️ Overriding userWantsToFinish=true for short ambiguous message: "${userResponse}" (${userResponse.trim().length} chars)`,
      );
      extractionResult.userWantsToFinish = false;
    }

    // 🐛 DEBUG: Log todoList status after extraction
    const progressAfterExtraction = getTodoProgress(session.todoList);
    const collectedDataAfterExtraction = getCollectedDataSummary(
      session.todoList,
    );
    console.info("📋 TODO LIST AFTER EXTRACTION:", {
      turn: session.turnCount,
      progress: {
        required: `${progressAfterExtraction.requiredCompleted}/${progressAfterExtraction.requiredTotal} (${progressAfterExtraction.requiredPercentage}%)`,
        highPriority: `${progressAfterExtraction.highPriorityCompleted}/${progressAfterExtraction.highPriorityTotal} (${progressAfterExtraction.highPriorityPercentage}%)`,
        lowPriority: `${progressAfterExtraction.lowPriorityCompleted}/${progressAfterExtraction.lowPriorityTotal} (${progressAfterExtraction.lowPriorityPercentage}%)`,
      },
      collectedData: collectedDataAfterExtraction,
    });

    // Step 1.5: Check for topic change (user abandoned workout logging)
    if (extractionResult.userChangedTopic) {
      console.info(
        "🔀 User changed topics - cancelling workout logging session",
      );
      session.isComplete = false; // Don't complete the workout

      // Don't yield anything - the caller will handle re-processing the message
      return {
        cleanedResponse: "", // Empty response - message will be re-processed
        isComplete: false,
        sessionCancelled: true, // Signal to caller to clear session and re-process
        progressDetails: {
          completed: 0,
          total: REQUIRED_WORKOUT_FIELDS.length,
          percentage: 0,
        },
      };
    }

    // Step 2: Check turn limits and completion conditions
    const MAX_TURNS = 7;
    let requiredComplete = isSessionComplete(session.todoList);
    let highPriorityRecommendedPending =
      shouldPromptHighPriorityRecommendedFields(session.todoList);
    let lowPriorityRecommendedPending =
      shouldPromptLowPriorityRecommendedFields(session.todoList);
    let atRecommendedPhase =
      highPriorityRecommendedPending || lowPriorityRecommendedPending;

    // Check for completion conditions (using early returns)

    // Condition 1: Max turns reached with all required fields
    if (session.turnCount >= MAX_TURNS && requiredComplete) {
      console.info(
        `⏰ Max turns (${MAX_TURNS}) reached with required fields complete - auto-completing workout logging`,
      );
      return yield* completeWorkoutSession(
        session,
        "Perfect! I have what I need. Let me get that logged for you right now.",
        "info",
        "Auto-complete",
      );
    }

    // Condition 2: Max turns reached but required fields incomplete (safety)
    if (session.turnCount >= MAX_TURNS) {
      console.warn(
        `⚠️ Max turns (${MAX_TURNS}) reached but required fields incomplete - forcing completion with partial data`,
      );
      return yield* completeWorkoutSession(
        session,
        "I'll log what we have so far. Some details might be missing, but you can edit the workout later if needed.",
        "warn",
        "Partial completion",
      );
    }

    // Condition 3: User explicitly wants to finish
    // Respect user's desire to finish, with different messages based on data quality
    if (extractionResult.userWantsToFinish) {
      // Check if we have substantial progress (5/6 required OR 4/6 + all high-priority)
      const hasGoodProgress = hasSubstantialProgress(session.todoList);

      if (requiredComplete) {
        console.info("⏭️ User wants to finish - all required fields complete");
        return yield* completeWorkoutSession(
          session,
          "Perfect! I have everything I need. Let me get that logged for you right now.",
          "info",
          "User wants to finish (complete)",
        );
      } else if (hasGoodProgress) {
        console.info(
          "⏭️ User wants to finish - substantial progress (5/6 or 4/6+high-priority)",
        );
        return yield* completeWorkoutSession(
          session,
          "Got it! I have enough to log this workout. Let me get that done for you now.",
          "info",
          "User wants to finish (substantial)",
        );
      } else {
        console.info(
          "⏭️ User wants to finish - limited data, but respecting user intent",
        );
        return yield* completeWorkoutSession(
          session,
          "I'll log what we have so far. You can always edit the workout later to add more details.",
          "info",
          "User wants to finish (partial)",
        );
      }
    }

    // Step 3: Generate next question or completion message using UPDATED todoList
    console.info(
      "🎯 Generating next workout question based on UPDATED to-do list",
    );

    // Get coach personality for consistent voice (if available)
    const coachPersonality = coachConfig?.generated_prompts?.personality_prompt;

    // REAL STREAMING: Get chunks directly from Bedrock as they're generated
    const questionStream = generateNextQuestionStream(
      session.conversationHistory,
      session.todoList,
      coachPersonality,
      userContext, // Pass user context for smarter questions
      session.turnCount, // Pass turn count for auto-completion logic
    );

    let nextResponse = "";

    // Yield each chunk as it arrives from Bedrock
    for await (const chunk of questionStream) {
      nextResponse += chunk;
      yield formatChunkEvent(chunk);
    }

    // Fallback check (shouldn't happen with new streaming approach)
    if (!nextResponse) {
      console.warn("⚠️ No response generated, using fallback");
      const fallback =
        "Thanks for sharing! Let me think about what else I need to know...";
      yield formatChunkEvent(fallback);
      nextResponse = fallback;
    }

    console.info("✅ Response generated and streamed");

    // Step 3: Store AI response and finalize session state
    console.info("⚙️ Finalizing session state");
    session.conversationHistory.push({
      role: "ai",
      content: nextResponse,
      timestamp: new Date().toISOString(),
    });

    // Check completion status
    // Session is complete when required fields are done AND no recommended fields are pending
    requiredComplete = isSessionComplete(session.todoList);
    highPriorityRecommendedPending = shouldPromptHighPriorityRecommendedFields(
      session.todoList,
    );
    lowPriorityRecommendedPending = shouldPromptLowPriorityRecommendedFields(
      session.todoList,
    );
    atRecommendedPhase =
      highPriorityRecommendedPending || lowPriorityRecommendedPending;

    // Complete if: required done AND no high/low priority recommended pending
    const complete =
      requiredComplete &&
      !highPriorityRecommendedPending &&
      !lowPriorityRecommendedPending;

    // Get progress based on to-do list
    const todoProgress = getTodoProgress(session.todoList);
    const progressDetails = {
      completed: todoProgress.requiredCompleted,
      total: todoProgress.requiredTotal,
      percentage: todoProgress.requiredPercentage,
    };

    // Update session metadata
    session.lastActivity = new Date();

    console.info("✅ Workout to-do list session update processed:", {
      isComplete: complete,
      atRecommendedPhase,
      progress: progressDetails.percentage,
      todoProgress: `${todoProgress.requiredCompleted}/${todoProgress.requiredTotal} required items`,
      recommendedStatus: atRecommendedPhase
        ? "asking for optional fields"
        : "not applicable",
    });

    // 🐛 DEBUG: Log final todoList status before returning
    const finalCollectedData = getCollectedDataSummary(session.todoList);
    console.info("📋 TODO LIST BEFORE RETURN:", {
      turn: session.turnCount,
      isComplete: complete,
      progress: {
        required: `${todoProgress.requiredCompleted}/${todoProgress.requiredTotal} (${todoProgress.requiredPercentage}%)`,
        highPriority: `${todoProgress.highPriorityCompleted}/${todoProgress.highPriorityTotal} (${todoProgress.highPriorityPercentage}%)`,
        lowPriority: `${todoProgress.lowPriorityCompleted}/${todoProgress.lowPriorityTotal} (${todoProgress.lowPriorityPercentage}%)`,
      },
      collectedData: finalCollectedData,
    });

    // Return processed response for caller to handle saving and completion
    return {
      cleanedResponse: nextResponse,
      isComplete: complete,
      progressDetails,
    };
  } catch (error) {
    console.error("❌ Error in workout to-do list conversation:", error);
    yield formatChunkEvent(
      "I apologize, but I'm having trouble processing that. Could you try again?",
    );

    // Return error state
    return {
      cleanedResponse:
        "I apologize, but I'm having trouble processing that. Could you try again?",
      isComplete: false,
      progressDetails: {
        completed: 0,
        total: REQUIRED_WORKOUT_FIELDS.length,
        percentage: 0,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
