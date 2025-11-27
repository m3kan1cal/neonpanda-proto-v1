/**
 * Program Creator Handler Helpers
 *
 * Helper functions for BUILD mode (training program creation) flow in stream-coach-conversation handler.
 * These functions manage the program session lifecycle and orchestrate the todo-list conversation flow.
 */

import { CoachMessage, MESSAGE_TYPES, CONVERSATION_MODES } from '../coach-conversation/types';
import { MODEL_IDS } from '../api-helpers';
import {
  sendCoachConversationMessage,
  getProgramCreatorSession,
  saveProgramCreatorSession,
} from '../../../dynamodb/operations';
import { formatCompleteEvent } from '../streaming';
import type { ValidationParams, ConversationData } from '../streaming';
import { handleTodoListConversation as handleProgramTodoListConversation } from './conversation-handler';
import { createEmptyProgramTodoList, isSessionComplete as isProgramTodoComplete } from './todo-list-utils';
import { saveSessionAndTriggerProgramGeneration } from './session-management';
import { BuildProgramEvent } from '../program/types';

/**
 * Handle BUILD mode conversation with todo-list flow for training program creation
 * Manages program creator session, extracts requirements, and triggers async generation when complete
 */
export async function* handleProgramCreatorFlow(
  params: ValidationParams,
  conversationData: ConversationData
): AsyncGenerator<string, void, unknown> {
  console.info('🏗️ BUILD MODE detected - using todo-list conversation flow');

  // Load or create ProgramCreatorSession
  let programSession = await getProgramCreatorSession(
    params.userId,
    params.conversationId
  );

  if (!programSession) {
    console.info('📋 Creating new program creator session');
    const timestamp = Date.now();
    programSession = {
      userId: params.userId,
      sessionId: `program_creator_${params.conversationId}_${timestamp}`,
      conversationId: params.conversationId,
      todoList: createEmptyProgramTodoList(),
      conversationHistory: [],
      isComplete: false,
      startedAt: new Date(),
      lastActivity: new Date(),
    };
    await saveProgramCreatorSession(programSession);
  }

  // Check if todo list is already complete
  const isComplete = isProgramTodoComplete(programSession.todoList);

  if (!isComplete) {
    console.info('✨ Todo list not complete - using conversational flow');

    // Extract PROGRAM_DESIGN mode conversation history from messages
    const buildModeMessages = conversationData.existingConversation.messages
      .filter((m: any) => m.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN)
      .map((m: any) => ({
        role: (m.role === 'assistant' ? 'ai' : 'user') as 'ai' | 'user',
        content: m.content,
        timestamp: typeof m.timestamp === 'string' ? m.timestamp : m.timestamp.toISOString(),
      }));

    // Update session conversation history
    programSession.conversationHistory = buildModeMessages;
    programSession.lastActivity = new Date();

    // Use the todo-list conversation handler (same pattern as coach-creator)
    const conversationGenerator = handleProgramTodoListConversation(
      params.userResponse,
      programSession,
      params.imageS3Keys,
      conversationData.coachConfig
    );

    // Iterate through the generator to yield chunks and capture the return value
    let processedResponse: any = null;
    let result = await conversationGenerator.next();

    while (!result.done) {
      yield result.value;
      result = await conversationGenerator.next();
    }

    // The return value is in result.value after done === true
    processedResponse = result.value;

    if (processedResponse) {
      // Todo list already updated by reference in conversation handler
      // Save session with updated state (if not complete - complete case handled below)
      if (!processedResponse.isComplete) {
        await saveProgramCreatorSession(programSession);
      }

      // Create user and AI messages for conversation history
      const newUserMessage: CoachMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: params.userResponse,
        timestamp: new Date(),
        metadata: {
          mode: CONVERSATION_MODES.PROGRAM_DESIGN, // Track mode for program design artifact creation
        },
        ...(params.imageS3Keys && params.imageS3Keys.length > 0
          ? {
              imageS3Keys: params.imageS3Keys,
              messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES
            }
          : {}),
      };

      const newAiMessage: CoachMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: processedResponse.cleanedResponse,
        timestamp: new Date(),
        metadata: {
          model: MODEL_IDS.CLAUDE_SONNET_4_DISPLAY,
          mode: CONVERSATION_MODES.PROGRAM_DESIGN, // Track mode for program design artifact creation
        },
      };

      // Save messages to conversation
      await sendCoachConversationMessage(
        params.userId,
        params.coachId,
        params.conversationId,
        [newUserMessage, newAiMessage]
      );

      // If complete, trigger async training program generation with idempotency protection
      if (processedResponse.isComplete) {
        console.info('🎉 Todo list complete - triggering async training program generation');

        // Extract the PROGRAM_DESIGN mode conversation context from conversation messages
        const buildModeMessages = conversationData.existingConversation.messages
          .filter((m: any) => m.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN);

        // Convert to conversation context string
        const conversationContext = buildModeMessages
          .map((m: any) => `${m.role}: ${m.content}`)
          .join('\n\n');

        // Prepare event for async generation
        const buildEvent: BuildProgramEvent = {
          userId: params.userId,
          coachId: params.coachId,
          conversationId: params.conversationId,
          programId: `program_${params.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          sessionId: programSession.sessionId,
          todoList: programSession.todoList,
          conversationContext,
        };

        // Save session and trigger generation with idempotency protection
        const result = await saveSessionAndTriggerProgramGeneration(
          params.userId,
          params.conversationId,
          programSession,
          true, // isComplete
          buildEvent // Full payload
        );

        if (result.alreadyGenerating) {
          console.info('⏭️ Program generation already in progress - skipped duplicate trigger');
        } else if (result.programId) {
          console.info('⏭️ Program already exists - skipped duplicate trigger:', { programId: result.programId });
        } else {
          console.info('✅ Program generation triggered with idempotency protection');
        }
      }

      // Yield complete event
      yield formatCompleteEvent({
        messageId: newAiMessage.id,
        type: 'complete',
        fullMessage: processedResponse.cleanedResponse,
        aiResponse: processedResponse.cleanedResponse,
        isComplete: processedResponse.isComplete,
        progressDetails: processedResponse.progressDetails,
        metadata: {
          mode: CONVERSATION_MODES.PROGRAM_DESIGN,
          programGenerationTriggered: processedResponse.isComplete,
        },
      });

      console.info('✅ PROGRAM_DESIGN mode todo-list conversation completed');
      return; // Exit early - we've handled the PROGRAM_DESIGN mode flow
    }
  } else {
    console.info('✅ Todo list already complete - program should be generating or complete');
    // Fall through to normal chat flow (user is chatting while program generates)
  }
}

