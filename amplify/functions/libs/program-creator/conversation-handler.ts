/**
 * Training Program Conversation Handler
 *
 * Handles the conversational flow for training program creation using the to-do list approach.
 * This module orchestrates the AI-driven question generation and response streaming.
 *
 * Pattern: Same structure as coach-creator/conversation-handler.ts + multimodal support
 */

import { generateNextQuestion, generateNextQuestionStream } from './question-generator';
import { formatChunkEvent } from '../streaming';
import { extractAndUpdateTodoList } from './todo-extraction';
import { getTodoProgress, isSessionComplete } from './todo-list-utils';
import { ConversationMessage } from '../todo-types';

import { ProgramCreatorSession } from './types';

/**
 * Handle to-do list based conversational flow for training program creation
 * Generates next question dynamically based on what's been collected
 * Supports multimodal input (text + images)
 */
export async function* handleTodoListConversation(
  userResponse: string,
  session: ProgramCreatorSession,
  imageS3Keys?: string[],
  coachConfig?: any
): AsyncGenerator<string, any, unknown> {
  console.info("✨ Handling program to-do list conversation");

  if (imageS3Keys && imageS3Keys.length > 0) {
    console.info("🖼️ Conversation includes images:", {
      imageCount: imageS3Keys.length,
      imageKeys: imageS3Keys
    });
  }

  try {
    // Step 1: Extract information from user response and update todoList FIRST
    console.info("🔍 Extracting information and updating program to-do list BEFORE generating next question");

    // Add user message to history
    session.conversationHistory = session.conversationHistory || [];
    const userMessage: ConversationMessage = {
      role: 'user',
      content: userResponse,
      timestamp: new Date().toISOString()
    };

    // Add images to message if present
    if (imageS3Keys && imageS3Keys.length > 0) {
      userMessage.imageS3Keys = imageS3Keys;
      userMessage.messageType = 'text_with_images';
    }

    session.conversationHistory.push(userMessage);

    // Extract with multimodal support
    session.todoList = await extractAndUpdateTodoList(
      userResponse,
      session.conversationHistory,
      session.todoList,
      imageS3Keys // Pass images to extraction
    );

    // Step 2: Generate next question or completion message using UPDATED todoList
    console.info("🎯 Generating next program question based on UPDATED to-do list");

    // Get coach personality for consistent voice (if available)
    const coachPersonality = coachConfig?.generated_prompts?.personality_prompt;

    // REAL STREAMING: Get chunks directly from Bedrock as they're generated
    const questionStream = generateNextQuestionStream(
      session.conversationHistory,
      session.todoList,
      coachPersonality
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
    yield formatChunkEvent("I apologize, but I'm having trouble processing that. Could you try again?");

    // Return error state
    return {
      cleanedResponse: "I apologize, but I'm having trouble processing that. Could you try again?",
      isComplete: false,
      progressDetails: {
        completed: 0,
        total: 5,
        percentage: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
