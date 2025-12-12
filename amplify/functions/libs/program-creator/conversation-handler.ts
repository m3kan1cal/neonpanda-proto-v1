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
import { ConversationMessage } from "../todo-types";

import { ProgramCreatorSession } from "./types";

/**
 * Handle to-do list based conversational flow for training program creation
 * Generates next question dynamically based on what's been collected
 * Supports multimodal input (text + images)
 * Pattern: Matches workout-creator/conversation-handler.ts exactly
 */
export async function* handleTodoListConversation(
  userResponse: string,
  session: ProgramCreatorSession,
  imageS3Keys?: string[],
  coachConfig?: any,
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
  conversationMessages?: any[], // CoachConversation.messages for history sync
): AsyncGenerator<string, any, unknown> {
  console.info("✨ Handling program to-do list conversation");

  if (imageS3Keys && imageS3Keys.length > 0) {
    console.info("🖼️ Conversation includes images:", {
      imageCount: imageS3Keys.length,
      imageKeys: imageS3Keys,
    });
  }

  try {
    // Step 1: Synchronize conversation history from CoachConversation FIRST
    // This ensures ALL messages (user + AI) are captured in correct order
    console.info(
      "🔄 Synchronizing conversation history from CoachConversation",
    );

    if (conversationMessages && conversationMessages.length > 0) {
      // Include recent pre-session messages for context (up to last 10 non-program_design messages)
      const recentChatMessages = conversationMessages
        .filter((m: any) => m.metadata?.mode !== "program_design")
        .slice(-10) // Last 10 chat messages for context
        .map((m: any) => ({
          role: (m.role === "assistant" ? "ai" : "user") as "ai" | "user",
          content: m.content,
          timestamp:
            typeof m.timestamp === "string"
              ? m.timestamp
              : m.timestamp.toISOString(),
          isPreSessionContext: true, // Flag to indicate this is background context
        }));

      // Get program_design mode messages (current session)
      const buildModeMessages = conversationMessages
        .filter((m: any) => m.metadata?.mode === "program_design")
        .map((m: any) => ({
          role: (m.role === "assistant" ? "ai" : "user") as "ai" | "user",
          content: m.content,
          timestamp:
            typeof m.timestamp === "string"
              ? m.timestamp
              : m.timestamp.toISOString(),
          ...(m.imageS3Keys && m.imageS3Keys.length > 0
            ? {
                imageS3Keys: m.imageS3Keys,
                messageType: m.messageType || "text_with_images",
              }
            : {}),
        }));

      // Combine: pre-session context + current session messages
      session.conversationHistory = [
        ...recentChatMessages,
        ...buildModeMessages,
      ];
      console.info(
        `📚 Synchronized ${recentChatMessages.length} pre-session + ${buildModeMessages.length} session messages from CoachConversation`,
      );
    } else {
      // Initialize empty history if no messages provided
      session.conversationHistory = session.conversationHistory || [];
    }

    // Step 2: Add current user message to history
    console.info("🔍 Adding current user message and extracting information");

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

    // Increment turn counter (matches workout creator pattern)
    session.turnCount = (session.turnCount || 0) + 1;
    console.info(`📊 Turn ${session.turnCount} of program collection`);

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
      console.info(
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
      console.info(
        "✅ User wants to finish early - checking if minimum requirements met",
      );
      const requiredComplete = isSessionComplete(session.todoList);

      if (requiredComplete) {
        console.info(
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
          role: "ai",
          content: completionMessage,
          timestamp: new Date().toISOString(),
        });

        session.isComplete = true;
        return {
          cleanedResponse: completionMessage,
          isComplete: true,
          progressDetails: getTodoProgress(session.todoList),
        };
      } else {
        console.info(
          "⚠️ User wants to finish but required fields incomplete - continuing collection",
        );
        // Continue normal flow
      }
    }

    // Step 2: Generate next question or completion message using UPDATED todoList
    console.info(
      "🎯 Generating next program question based on UPDATED to-do list",
    );

    // Get coach personality for consistent voice (if available)
    const coachPersonality = coachConfig?.generated_prompts?.personality_prompt;

    // REAL STREAMING: Get chunks directly from Bedrock as they're generated
    const questionStream = generateNextQuestionStream(
      session.conversationHistory,
      session.todoList,
      coachPersonality,
      userContext, // Pass user context for smarter question generation (matches workout creator pattern)
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

    // Check if all required information is collected
    const complete = isSessionComplete(session.todoList);

    // Get progress based on to-do list
    const todoProgress = getTodoProgress(session.todoList);
    const progressDetails = {
      completed: todoProgress.requiredCompleted,
      total: todoProgress.requiredTotal,
      percentage: todoProgress.requiredPercentage,
    };

    // Update session metadata
    session.lastActivity = new Date();

    console.info("✅ Program to-do list session update processed:", {
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
    console.error("❌ Error in program to-do list conversation:", error);
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
