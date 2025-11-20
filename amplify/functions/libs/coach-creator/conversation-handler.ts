/**
 * Coach Creator Conversation Handler
 *
 * Handles the conversational flow for coach creator sessions using the to-do list approach.
 * This module orchestrates the AI-driven question generation and response streaming.
 */

import { generateCoachCreatorContextualUpdate } from '../coach-conversation/contextual-updates';
import { generateNextQuestion, generateNextQuestionStream } from './question-generator';
import { formatChunkEvent, formatContextualEvent } from '../streaming';
import { saveCoachCreatorSession } from '../../../dynamodb/operations';
import { extractAndUpdateTodoList } from './todo-extraction';
import { getTodoProgress, isSessionComplete } from './todo-list-utils';
import { extractSophisticationLevel } from './data-extraction';
import { markSessionComplete } from './session-management';
import { ConversationMessage } from './types';


/**
 * Handle to-do list based conversational flow
 * Generates next question dynamically based on what's been collected
 */
export async function* handleTodoListConversation(
  userResponse: string,
  session: any
): AsyncGenerator<string, any, unknown> {
  console.info("✨ Handling to-do list conversation");

  try {
    // Step 1: Extract information from user response and update todoList FIRST
    console.info("🔍 Extracting information and updating to-do list BEFORE generating next question");
    session.conversationHistory = session.conversationHistory || [];
    session.conversationHistory.push({
      role: 'user',
      content: userResponse,
      timestamp: new Date().toISOString()
    });

    session.todoList = await extractAndUpdateTodoList(
      userResponse,
      session.conversationHistory,
      session.todoList!
    );

    // Step 2: Generate next question or completion message using UPDATED todoList
    console.info("🎯 Generating next question based on UPDATED to-do list");
    const craftingUpdate = await generateCoachCreatorContextualUpdate(
      userResponse,
      "response_crafting",
      {}
    );
    yield formatContextualEvent(craftingUpdate, 'response_crafting');
    console.info("💬 Yielded crafting update (Vesper):", craftingUpdate);

    // REAL STREAMING: Get chunks directly from Bedrock as they're generated
    const questionStream = generateNextQuestionStream(
      session.conversationHistory,
      session.todoList!,
      session.sophisticationLevel || 'UNKNOWN'
    );

    let nextResponse = '';

    // Yield each chunk as it arrives from Bedrock
    for await (const chunk of questionStream) {
      nextResponse += chunk;
      yield formatChunkEvent(chunk);
    }

    // Fallback check (shouldn't happen with new streaming approach)
    if (!nextResponse) {
      console.warn("⚠️ No response generated, using fallback");
      const fallback = "Thanks for sharing! Let me think about what else I need to know...";
      yield formatChunkEvent(fallback);
      nextResponse = fallback;
    }

    console.info("✅ Response generated and streamed");

    // Step 3: Store AI response and finalize session state
    console.info("⚙️ Finalizing session state");
    session.conversationHistory.push({
      role: 'ai',
      content: nextResponse,
      timestamp: new Date().toISOString()
    });

    // Detect sophistication level (still useful for adapting tone)
    const detectedLevel = extractSophisticationLevel(nextResponse);
    if (detectedLevel) {
      session.sophisticationLevel = detectedLevel;
    }

    // Check if all required information is collected
    const complete = isSessionComplete(session.todoList!);

    // Get progress based on to-do list
    const todoProgress = getTodoProgress(session.todoList!);
    const progressDetails = {
      questionsCompleted: todoProgress.requiredCompleted,
      totalQuestions: todoProgress.requiredTotal,
      percentage: todoProgress.requiredPercentage,
      sophisticationLevel: session.sophisticationLevel || 'UNKNOWN',
      currentQuestion: todoProgress.requiredCompleted + 1,
    };

    // Update session metadata
    session.lastActivity = new Date();

    if (complete) {
      markSessionComplete(session);
    }

    console.info("✅ To-do list session update processed:", {
      isComplete: complete,
      sophisticationLevel: session.sophisticationLevel,
      progress: progressDetails.percentage,
      todoProgress: `${todoProgress.requiredCompleted}/${todoProgress.requiredTotal} required items`,
    });

    // Return processed response for caller to handle saving and completion
    return {
      cleanedResponse: nextResponse,
      detectedLevel: session.sophisticationLevel || null,
      isComplete: complete,
      progressDetails,
      nextQuestion: null,
      isOnFinalQuestion: complete,
    };

  } catch (error) {
    console.error("❌ Error in to-do list conversation:", error);
    yield formatChunkEvent("I apologize, but I'm having trouble processing that. Could you try again?");

    // Still try to save session
    try {
      await saveCoachCreatorSession(session);
    } catch (saveError) {
      console.error("❌ Error saving session after error:", saveError);
    }

    // Return error state
    return {
      cleanedResponse: "I apologize, but I'm having trouble processing that. Could you try again?",
      detectedLevel: null,
      isComplete: false,
      progressDetails: {
        questionsCompleted: 0,
        totalQuestions: 22,
        percentage: 0,
        sophisticationLevel: 'UNKNOWN',
        currentQuestion: 1,
      },
      nextQuestion: null,
      isOnFinalQuestion: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

