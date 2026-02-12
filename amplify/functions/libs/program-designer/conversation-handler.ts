/**
 * Training Program Conversation Handler
 *
 * Handles the conversational flow for training program creation using the to-do list approach.
 * This module orchestrates the AI-driven question generation and response streaming.
 *
 * Pattern: Same structure as coach-creator/conversation-handler.ts + multimodal support
 */

import {
  generateNextQuestion,
  generateNextQuestionStream,
} from "./question-generator";
import { formatChunkEvent } from "../streaming";
import { extractAndUpdateTodoList } from "./todo-extraction";
import { getTodoProgress, isSessionComplete } from "./todo-list-utils";
import { CoachMessage } from "../coach-conversation/types";
import { logger } from "../logger";

import { ProgramDesignerSession } from "./types";

/**
 * Handle to-do list based conversational flow for training program creation
 * Generates next question dynamically based on what's been collected
 * Supports multimodal input (text + images)
 * Pattern: Matches workout-creator/conversation-handler.ts exactly
 */
export async function* handleTodoListConversation(
  userResponse: string,
  session: ProgramDesignerSession,
  imageS3Keys?: string[],
  coachConfig?: any,
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
): AsyncGenerator<string, any, unknown> {
  logger.info("✨ Handling program to-do list conversation");

  if (imageS3Keys && imageS3Keys.length > 0) {
    logger.info("🖼️ Conversation includes images:", {
      imageCount: imageS3Keys.length,
      imageKeys: imageS3Keys,
    });
  }

  try {
    // NOTE: User message already added to session.conversationHistory[] in main handler
    // We don't need to add it again here - just use the existing history

    logger.info("🔍 Extracting information from user response", {
      conversationHistoryLength: session.conversationHistory.length,
      turnCount: session.turnCount,
    });

    // Extract with multimodal support (pass userContext for smarter extraction)
    const extractionResult = await extractAndUpdateTodoList(
      userResponse,
      session.conversationHistory,
      session.todoList,
      imageS3Keys, // Pass images to extraction
      userContext, // Pass user context for smarter extraction (matches workout creator pattern)
    );

    // Update todoList from extraction result
    session.todoList = extractionResult.todoList;

    // Step 1.5: Check for topic change (user abandoned program design)
    if (extractionResult.userChangedTopic) {
      logger.info(
        "🔀 User changed topics - cancelling program design session",
      );
      session.isComplete = false; // Don't complete the program

      // Don't yield anything - the caller will handle re-processing the message
      return {
        cleanedResponse: "", // Empty response - message will be re-processed
        isComplete: false,
        sessionCancelled: true, // Signal to caller to clear session and re-process
        progressDetails: {
          completed: 0,
          total: 5,
          percentage: 0,
        },
      };
    }

    // Step 1.6: Check for early completion intent (user wants to skip optional fields)
    if (extractionResult.userWantsToFinish) {
      logger.info(
        "✅ User wants to finish early - checking if minimum requirements met",
      );
      const requiredComplete = isSessionComplete(session.todoList);

      if (requiredComplete) {
        logger.info(
          "✅ Required fields complete - triggering program generation",
        );
        // Generate completion message and trigger generation
        const { generateCompletionMessage } =
          await import("./question-generator");
        const coachPersonality =
          coachConfig?.generated_prompts?.personality_prompt;
        const completionMessageStream = generateCompletionMessage(
          session.todoList,
          coachPersonality,
          userContext, // Pass user context for personalized completion message (matches workout creator pattern)
        );

        let completionMessage = "";
        for await (const chunk of completionMessageStream) {
          completionMessage += chunk;
          yield formatChunkEvent(chunk);
        }

        session.conversationHistory.push({
          id: `msg_${Date.now()}_${session.userId}_assistant`,
          role: "assistant",
          content: completionMessage,
          timestamp: new Date(),
          metadata: {
            mode: "program_design",
            isQuestion: false,
          },
        });

        session.isComplete = true;
        return {
          cleanedResponse: completionMessage,
          isComplete: true,
          progressDetails: getTodoProgress(session.todoList),
        };
      } else {
        logger.info(
          "⚠️ User wants to finish but required fields incomplete - continuing collection",
        );
        // Continue normal flow
      }
    }

    // Step 2: Check if we need to ask the final considerations question
    const requiredComplete = isSessionComplete(session.todoList);

    // If required items are complete but additionalConsiderations hasn't been asked yet
    if (requiredComplete && session.additionalConsiderations === undefined) {
      logger.info(
        "🎯 Required items complete - will ask final considerations question",
      );
      // The question generator will handle asking this question
    }

    // If required items are complete and user just answered the final considerations question
    if (requiredComplete && session.additionalConsiderations === undefined) {
      // Check if the user's response looks like they're answering the final considerations question
      // (This happens after we ask it in the previous turn)
      const lastAiMessage = session.conversationHistory
        .filter((m) => m.role === "assistant")
        .slice(-1)[0];

      if (
        lastAiMessage &&
        lastAiMessage.content.includes("anything else you'd like me to know")
      ) {
        logger.info("💾 Storing user's final considerations response");
        // Store their response (even if it's "nothing else" or "no")
        session.additionalConsiderations = userResponse.trim();
      }
    }

    // Step 3: Generate next question or completion message using UPDATED todoList
    logger.info(
      "🎯 Generating next program question based on UPDATED to-do list",
    );

    // Get coach personality for consistent voice (if available)
    const coachPersonality = coachConfig?.generated_prompts?.personality_prompt;

    // Pass additionalConsiderations flag in userContext
    const enhancedUserContext = {
      ...userContext,
      additionalConsiderations: session.additionalConsiderations,
    };

    // REAL STREAMING: Get chunks directly from Bedrock as they're generated
    const questionStream = generateNextQuestionStream(
      session.conversationHistory,
      session.todoList,
      coachPersonality,
      enhancedUserContext, // Pass user context with additionalConsiderations flag
    );

    let nextResponse = "";

    // Yield each chunk as it arrives from Bedrock
    for await (const chunk of questionStream) {
      nextResponse += chunk;
      yield formatChunkEvent(chunk);
    }

    // Fallback check (shouldn't happen with new streaming approach)
    if (!nextResponse) {
      logger.warn("⚠️ No response generated, using fallback");
      const fallback =
        "Thanks for sharing! Let me think about what else I need to know...";
      yield formatChunkEvent(fallback);
      nextResponse = fallback;
    }

    logger.info("✅ Response generated and streamed");

    // Step 3: Store AI response and finalize session state
    logger.info("⚙️ Finalizing session state");

    // Get progress for metadata
    const todoProgress = getTodoProgress(session.todoList);
    const todoComplete = isSessionComplete(session.todoList);
    const complete =
      todoComplete && session.additionalConsiderations !== undefined;

    const progressDetails = {
      completed: todoProgress.requiredCompleted,
      total: todoProgress.requiredTotal,
      percentage: complete ? 100 : todoProgress.requiredPercentage,
    };

    session.conversationHistory.push({
      id: `msg_${Date.now()}_${session.userId}_assistant`,
      role: "assistant",
      content: nextResponse,
      timestamp: new Date(),
      metadata: {
        mode: "program_design",
        isQuestion: !complete,
        progress: progressDetails,
      },
    });

    // Update session metadata
    session.lastActivity = new Date();

    logger.info("✅ Program to-do list session update processed:", {
      isComplete: complete,
      progress: progressDetails.percentage,
      todoProgress: `${todoProgress.requiredCompleted}/${todoProgress.requiredTotal} required items`,
    });

    // Return processed response for caller to handle saving and completion
    return {
      cleanedResponse: nextResponse,
      isComplete: complete,
      progressDetails,
    };
  } catch (error) {
    logger.error("❌ Error in program to-do list conversation:", error);
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
        total: 5,
        percentage: 0,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
