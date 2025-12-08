/**
 * Program Creator Handler Helpers
 *
 * Helper functions for BUILD mode (training program creation) flow in stream-coach-conversation handler.
 * These functions manage the program session lifecycle and orchestrate the todo-list conversation flow.
 */

import { CoachMessage, MESSAGE_TYPES, CONVERSATION_MODES } from '../coach-conversation/types';
import { MODEL_IDS } from '../api-helpers';
import {
  getProgramCreatorSession,
  saveProgramCreatorSession,
  saveCoachConversation,
} from '../../../dynamodb/operations';
import { formatCompleteEvent, formatMetadataEvent, formatChunkEvent } from '../streaming';
import type { ValidationParams, ConversationData } from '../streaming';
import { handleTodoListConversation as handleProgramTodoListConversation } from './conversation-handler';
import { createEmptyProgramTodoList, isSessionComplete as isProgramTodoComplete, getTodoProgress } from './todo-list-utils';
import { saveSessionAndTriggerProgramGeneration } from './session-management';
import { BuildProgramEvent } from '../program/types';
import { ProgramCreatorSession } from './types';

/**
 * Start a new program design collection session
 * Pattern: Mirrors startWorkoutCollection from workout-creator
 */
export async function* startProgramDesignCollection(
  params: ValidationParams,
  conversationData: ConversationData
): AsyncGenerator<string, void, unknown> {
  console.info('🏗️ Starting new program design collection session');

  try {
    // Create new program creator session
    const timestamp = Date.now();
    const programSession: ProgramCreatorSession = {
      sessionId: `program_creator_${params.conversationId}_${timestamp}`,
      userId: params.userId,
      conversationId: params.conversationId,
      todoList: createEmptyProgramTodoList(),
      conversationHistory: [],
      isComplete: false,
      startedAt: new Date(),
      lastActivity: new Date(),
      turnCount: 0, // Initialize turn counter (matches workout creator pattern)
      imageS3Keys: params.imageS3Keys || [], // Store images for session (matches workout creator pattern)
    };

    console.info('🆕 NEW PROGRAM SESSION CREATED:', {
      sessionId: programSession.sessionId,
      userId: programSession.userId,
      conversationId: programSession.conversationId,
      hasImages: (params.imageS3Keys?.length || 0) > 0,
    });

    // Save session to DynamoDB
    await saveProgramCreatorSession(programSession);

    // Note: programSession is stored separately in DynamoDB, not attached to conversation
    // We'll pass it separately to formatCompleteEvent for frontend badge

    // ✅ FIX: Yield metadata event FIRST to inform UI we're in program_design mode
    // This ensures purple bubble styling applies immediately, not just after refresh
    yield formatMetadataEvent({ mode: CONVERSATION_MODES.PROGRAM_DESIGN });
    console.info('📋 Metadata event sent: mode=program_design (session start)');

    // CRITICAL: Metadata event MUST be sent before AI response starts streaming
    // This allows frontend to apply purple styling to the first AI message bubble

    // Prepare user context from conversation data (matches workout creator pattern)
    const userContext = {
      recentWorkouts: conversationData.context?.recentWorkouts,
      pineconeMemories: conversationData.context?.pineconeContext?.memories,
      userProfile: conversationData.userProfile,
      activeProgram: conversationData.context?.activeProgram,
    };

    // Use program-creator conversation handler to start collection
    // The handler will update programSession.todoList and conversationHistory by reference
    const conversationGenerator = handleProgramTodoListConversation(
      params.userResponse,
      programSession, // Pass the SAME session object
      params.imageS3Keys,
      conversationData.coachConfig,
      userContext, // Pass user context for smarter extraction and questions (matches workout creator pattern)
      conversationData.existingConversation.messages // Pass CoachConversation messages for history sync
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
      // 🐛 DEBUG: Log session state after handler completes (matches workout creator pattern)
      const progress = getTodoProgress(programSession.todoList);
      console.info('📊 SESSION STATE AFTER HANDLER (startProgramDesignCollection):', {
        sessionId: programSession.sessionId,
        turnCount: programSession.turnCount,
        isComplete: processedResponse.isComplete,
        progress: {
          completed: `${progress.completed}/${progress.total} (${progress.percentage}%)`,
        },
      });
    }

    // Check if session was cancelled (topic change detected)
    if (processedResponse?.sessionCancelled) {
      console.info('🔀 Topic change detected - soft-deleting program session');

      // Soft-delete the session (keep for audit trail and future auto-resume)
      programSession.isDeleted = true;
      programSession.completedAt = new Date(); // Mark when it was abandoned
      await saveProgramCreatorSession(programSession);
      console.info('🗑️ Program session soft-deleted:', {
        sessionId: programSession.sessionId,
        turnCount: programSession.turnCount,
        reason: 'topic_change'
      });

      // Note: Session already soft-deleted in DynamoDB above (not embedded in conversation)
      // Reset conversation mode back to CHAT
      conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;
      await saveCoachConversation(conversationData.existingConversation);

      // Yield event indicating session was cancelled
      yield formatCompleteEvent({
        messageId: `msg_${timestamp}_cancelled`,
        type: 'session_cancelled' as any,
        fullMessage: '',
        aiResponse: '',
        isComplete: false,
        mode: CONVERSATION_MODES.CHAT, // Reset mode back to CHAT
        metadata: {
          sessionCancelled: true,
          reason: 'topic_change',
        },
      });

      console.info('✅ Program session cancelled - message will be re-processed');
      return;
    }

    // Update session state (session is stored separately in DynamoDB, not embedded in conversation)
    programSession.lastActivity = new Date();
    programSession.turnCount = programSession.turnCount + 1; // Increment turn counter
    await saveProgramCreatorSession(programSession);

    // Set mode to PROGRAM_DESIGN
    conversationData.existingConversation.mode = CONVERSATION_MODES.PROGRAM_DESIGN;

    // Create user and AI messages for conversation history (matches workout creator pattern)
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: params.userResponse,
      timestamp: new Date(),
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
        mode: CONVERSATION_MODES.PROGRAM_DESIGN, // Track that this message was created during program design artifact creation
      },
    };

    // Add messages to conversation (matches workout creator pattern: push to array)
    conversationData.existingConversation.messages.push(newUserMessage, newAiMessage);
    conversationData.existingConversation.metadata.lastActivity = new Date();
    conversationData.existingConversation.metadata.totalMessages = conversationData.existingConversation.messages.length;

    // Save full conversation (including messages AND session) - matches workout creator pattern: single save
    await saveCoachConversation(conversationData.existingConversation);

    // Yield complete event (matches workout creator pattern)
    yield formatCompleteEvent({
      messageId: newAiMessage.id,
      aiMessage: newAiMessage, // ✅ Include the full AI message with its metadata (matches workout creator)
      type: 'complete',
      fullMessage: processedResponse.cleanedResponse,
      aiResponse: processedResponse.cleanedResponse,
      isComplete: processedResponse.isComplete,
      progressDetails: processedResponse.progressDetails,
      mode: conversationData.existingConversation.mode, // ✅ Send mode to frontend for UI (matches workout creator)
      programCreatorSession: programSession, // ✅ Pass session directly (stored separately in DynamoDB)
      metadata: {
        programCollectionStarted: true, // ✅ Specific metadata (matches workout creator pattern)
      },
    });

    console.info('✅ Program design collection session started');

  } catch (error) {
    console.error('❌ Error starting program design session:', error);
    throw error;
  }
}

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
      turnCount: 0, // Initialize turn counter (matches workout creator pattern)
      imageS3Keys: params.imageS3Keys || [], // Store images for session (matches workout creator pattern)
    };
    await saveProgramCreatorSession(programSession);
  }

  // 🐛 DEBUG: Log existing session state before handler (matches workout creator pattern)
  const initialProgress = getTodoProgress(programSession.todoList);
  console.info('🔄 CONTINUING PROGRAM SESSION:', {
    sessionId: programSession.sessionId,
    userId: programSession.userId,
    conversationId: programSession.conversationId,
    turnCount: programSession.turnCount || 0,
    hasImages: (params.imageS3Keys?.length || 0) > 0,
    progressBefore: {
      completed: `${initialProgress.completed}/${initialProgress.total} (${initialProgress.percentage}%)`,
    },
  });

  // Check if todo list is already complete
  const isComplete = isProgramTodoComplete(programSession.todoList);

  if (!isComplete) {
    console.info('✨ Todo list not complete - using conversational flow');

    // Yield metadata event to maintain program_design mode
    yield formatMetadataEvent({ mode: CONVERSATION_MODES.PROGRAM_DESIGN });

    // Prepare user context from conversation data (matches workout creator pattern)
    const userContext = {
      recentWorkouts: conversationData.context?.recentWorkouts,
      pineconeMemories: conversationData.context?.pineconeContext?.memories,
      userProfile: conversationData.userProfile,
      activeProgram: conversationData.context?.activeProgram,
    };

    // Update session last activity
    programSession.lastActivity = new Date();

    // 🚨 CRITICAL FIX: Add user message to CoachConversation.messages BEFORE calling handler
    // This ensures the conversation history sync in handleTodoListConversation includes this message
    const newUserMessage = {
      role: 'user',
      content: params.userResponse,
      timestamp: new Date(),
      metadata: {
        mode: CONVERSATION_MODES.PROGRAM_DESIGN,
        ...(params.imageS3Keys && params.imageS3Keys.length > 0 ? {
          messageType: 'text_with_images',
          imageS3Keys: params.imageS3Keys
        } : {})
      }
    };

    conversationData.existingConversation.messages.push(newUserMessage);
    console.info('📝 Added user message to conversation BEFORE handler:', {
      totalMessages: conversationData.existingConversation.messages.length,
      hasImages: !!params.imageS3Keys?.length
    });

    // Use the todo-list conversation handler (same pattern as coach-creator)
    // The handler will update programSession.todoList and conversationHistory by reference
    // Conversation history will be synchronized from CoachConversation.messages inside the handler
    const conversationGenerator = handleProgramTodoListConversation(
      params.userResponse,
      programSession, // Pass the SAME session object
      params.imageS3Keys,
      conversationData.coachConfig,
      userContext, // Pass user context for smarter extraction and questions (matches workout creator pattern)
      conversationData.existingConversation.messages // Pass CoachConversation messages for history sync (NOW includes current user message)
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
      // 🐛 DEBUG: Log session state after handler completes (matches workout creator pattern)
      const finalProgress = getTodoProgress(programSession.todoList);
      console.info('📊 SESSION STATE AFTER HANDLER (handleProgramCreatorFlow):', {
        sessionId: programSession.sessionId,
        turnCount: programSession.turnCount,
        isComplete: processedResponse.isComplete,
        progressAfter: {
          completed: `${finalProgress.completed}/${finalProgress.total} (${finalProgress.percentage}%)`,
        },
      });

      // Update the session with the modified data from conversation handler
      programSession.todoList = programSession.todoList; // Already updated by handler by reference!
      programSession.conversationHistory = programSession.conversationHistory; // Already updated by handler!
      programSession.lastActivity = new Date();
      programSession.turnCount = (programSession.turnCount || 0) + 1; // Increment turn count
    }

    // Check if session was cancelled (topic change detected)
    if (processedResponse?.sessionCancelled) {
      console.info('🔀 Topic change detected - soft-deleting program session');

      // Soft-delete the session (keep for audit trail and future auto-resume)
      programSession.isDeleted = true;
      programSession.completedAt = new Date(); // Mark when it was abandoned
      await saveProgramCreatorSession(programSession);
      console.info('🗑️ Program session soft-deleted:', {
        sessionId: programSession.sessionId,
        turnCount: programSession.turnCount,
        reason: 'topic_change'
      });

      // Note: Session already soft-deleted in DynamoDB above (not embedded in conversation)
      // Reset conversation mode back to CHAT
      conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;
      await saveCoachConversation(conversationData.existingConversation);

      // Yield event indicating session was cancelled
      yield formatCompleteEvent({
        messageId: `msg_${Date.now()}_cancelled`,
        type: 'session_cancelled' as any,
        fullMessage: '',
        aiResponse: '',
        isComplete: false,
        mode: CONVERSATION_MODES.CHAT, // Reset mode back to CHAT
        metadata: {
          sessionCancelled: true,
          reason: 'topic_change',
        },
      });

      console.info('✅ Program session cancelled - message will be re-processed');
      return;
    }

    if (processedResponse) {
      // Create user and AI messages for conversation history (matches workout creator pattern)
      const newUserMessage: CoachMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: params.userResponse,
        timestamp: new Date(),
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
          mode: CONVERSATION_MODES.PROGRAM_DESIGN, // Track that this message was created during program design artifact creation
        },
      };

      // If complete, trigger program creation and clear session (matches workout creator pattern)
      if (processedResponse.isComplete) {
        console.info('🎉 Program collection complete - triggering build-program');

        // Mark session complete and save
        programSession.isComplete = true;
        programSession.completedAt = new Date();

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

        // Note: Session is stored separately in DynamoDB (not embedded in conversation)
        // Reset conversation mode back to CHAT
        conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;
      } else {
        // Update session with latest state (matches workout creator pattern)
        programSession.lastActivity = new Date();
        await saveProgramCreatorSession(programSession);
      }

      // Add AI message to conversation (user message was already added before handler call)
      conversationData.existingConversation.messages.push(newAiMessage);
      conversationData.existingConversation.metadata.lastActivity = new Date();
      conversationData.existingConversation.metadata.totalMessages = conversationData.existingConversation.messages.length;

      console.info('📝 Added AI message to conversation after handler:', {
        totalMessages: conversationData.existingConversation.messages.length
      });

      // Save full conversation (including messages AND session state) - matches workout creator pattern: single save
      await saveCoachConversation(conversationData.existingConversation);

      // Yield complete event (matches workout creator pattern)
      yield formatCompleteEvent({
        messageId: newAiMessage.id,
        aiMessage: newAiMessage, // ✅ Include the full AI message with its metadata (matches workout creator)
        type: 'complete',
        fullMessage: processedResponse.cleanedResponse,
        aiResponse: processedResponse.cleanedResponse,
        isComplete: processedResponse.isComplete,
        progressDetails: processedResponse.progressDetails,
        mode: conversationData.existingConversation.mode, // ✅ Send mode to frontend (PROGRAM_DESIGN if continuing, CHAT if complete)
        programCreatorSession: processedResponse.isComplete ? undefined : programSession, // ✅ Pass session if in progress (will be undefined if completed)
        metadata: {
          programCollectionInProgress: !processedResponse.isComplete,
          programGenerationTriggered: processedResponse.isComplete,
        },
      });

      console.info('✅ Program collection flow completed');
    }
  } else {
    console.info('✅ Todo list already complete - program session is done, continuing as normal chat');

    // Session is complete - soft-delete it if not already done
    if (!programSession.isDeleted) {
      programSession.isDeleted = true;
      programSession.completedAt = programSession.completedAt || new Date();
      await saveProgramCreatorSession(programSession);
      console.info('🗑️ Program session soft-deleted (already complete):', {
        sessionId: programSession.sessionId,
        generationStatus: programSession.programGeneration?.status,
      });
    }

    // Reset conversation mode back to CHAT
    conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;
    await saveCoachConversation(conversationData.existingConversation);

    // Don't yield anything - let the main handler continue to normal chat processing
    // This allows the AI to respond naturally to whatever the user just said
  }
}
