/**
 * Workout Creator Handler Helpers
 *
 * Helper functions for multi-turn workout collection flow in stream-coach-conversation handler.
 * These functions manage the workout session lifecycle and orchestrate the conversation flow.
 */

import { CoachMessage, MESSAGE_TYPES, CoachConversation, CONVERSATION_MODES } from '../coach-conversation/types';
import { MODEL_IDS, invokeAsyncLambda } from '../api-helpers';
import { sendCoachConversationMessage, saveCoachConversation } from '../../../dynamodb/operations';
import { formatChunkEvent, formatCompleteEvent, formatMetadataEvent } from '../streaming';
import type { BusinessLogicParams, ConversationData } from '../streaming';
import { handleTodoListConversation as handleWorkoutTodoListConversation } from './conversation-handler';
import { createEmptyWorkoutTodoList, getCollectedDataSummary, getTodoProgress } from './todo-list-utils';
import { WorkoutCreatorSession, REQUIRED_WORKOUT_FIELDS } from './types';

/**
 * Start a new workout collection session when insufficient data is detected
 * Initializes the session, extracts initial data, and generates first question
 */
export async function* startWorkoutCollection(
  params: BusinessLogicParams,
  conversationData: ConversationData
): AsyncGenerator<string, void, unknown> {
  console.info('🏋️ Starting new workout collection session');

  try {
    // Create new workout creator session (this will be modified by reference in the handler)
    const fullWorkoutSession: WorkoutCreatorSession = {
      sessionId: `workout_creator_${params.conversationId}_${Date.now()}`,
      userId: params.userId,
      coachId: params.coachId,
      conversationId: params.conversationId,
      todoList: createEmptyWorkoutTodoList(),
      conversationHistory: [],
      isComplete: false,
      startedAt: new Date(),
      lastActivity: new Date(),
      turnCount: 0, // Initialize turn counter
      imageS3Keys: params.imageS3Keys || [],
    };

    console.info('🆕 NEW WORKOUT SESSION CREATED:', {
      sessionId: fullWorkoutSession.sessionId,
      userId: fullWorkoutSession.userId,
      conversationId: fullWorkoutSession.conversationId,
      hasImages: (params.imageS3Keys?.length || 0) > 0,
    });

    // Yield metadata event to inform UI we're in workout_log mode
    yield formatMetadataEvent({ mode: CONVERSATION_MODES.WORKOUT_LOG });
    console.info('📋 Metadata event sent: mode=workout_log (session start)');

    // Prepare user context from conversation data
    const userContext = {
      recentWorkouts: conversationData.context?.recentWorkouts,
      pineconeMemories: conversationData.context?.pineconeContext?.memories,
      userProfile: conversationData.userProfile,
      activeProgram: conversationData.context?.activeProgram,
    };

    // Use workout-creator conversation handler to start collection
    // The handler will update fullWorkoutSession.todoList and conversationHistory by reference
    const conversationGenerator = handleWorkoutTodoListConversation(
      params.userResponse,
      fullWorkoutSession, // Pass the SAME session object
      params.imageS3Keys,
      conversationData.coachConfig,
      userContext // Pass user context for smarter extraction and questions
    );

    // Iterate through the generator to yield chunks and capture the return value
    let processedResponse: any = null;
    let result = await conversationGenerator.next();

    while (!result.done) {
      yield result.value;
      result = await conversationGenerator.next();
    }

    processedResponse = result.value;

    if (processedResponse) {
      // 🐛 DEBUG: Log session state after handler completes
      const progress = getTodoProgress(fullWorkoutSession.todoList);
      console.info('📊 SESSION STATE AFTER HANDLER (startWorkoutCollection):', {
        sessionId: fullWorkoutSession.sessionId,
        turnCount: fullWorkoutSession.turnCount,
        isComplete: processedResponse.isComplete,
        progress: {
          required: `${progress.requiredCompleted}/${progress.requiredTotal} (${progress.requiredPercentage}%)`,
          highPriority: `${progress.highPriorityCompleted}/${progress.highPriorityTotal} (${progress.highPriorityPercentage}%)`,
          lowPriority: `${progress.lowPriorityCompleted}/${progress.lowPriorityTotal} (${progress.lowPriorityPercentage}%)`,
        },
        collectedData: getCollectedDataSummary(fullWorkoutSession.todoList),
      });

      // Store session in conversation metadata (extract simplified format)
      conversationData.existingConversation.workoutCreatorSession = {
        todoList: fullWorkoutSession.todoList, // This has been updated by the handler!
        conversationHistory: fullWorkoutSession.conversationHistory, // This too!
        startedAt: fullWorkoutSession.startedAt,
        lastActivity: new Date(), // Update lastActivity
        imageS3Keys: fullWorkoutSession.imageS3Keys,
        turnCount: fullWorkoutSession.turnCount, // Persist turn count
      };

      // Set mode to WORKOUT_LOG (artifact-focused: creating a workout log artifact)
      conversationData.existingConversation.mode = CONVERSATION_MODES.WORKOUT_LOG;

      // Create messages
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
          model: MODEL_IDS.CLAUDE_HAIKU_4_DISPLAY,
          mode: CONVERSATION_MODES.WORKOUT_LOG, // Track that this message was created during workout log artifact creation
        },
      };

      // Add messages to conversation
      conversationData.existingConversation.messages.push(newUserMessage, newAiMessage);
      conversationData.existingConversation.metadata.lastActivity = new Date();
      conversationData.existingConversation.metadata.totalMessages = conversationData.existingConversation.messages.length;

      // Save full conversation (including messages AND session)
      await saveCoachConversation(conversationData.existingConversation);

      // Yield complete event
      yield formatCompleteEvent({
        messageId: newAiMessage.id,
        aiMessage: newAiMessage, // Include the full AI message with its metadata
        type: 'complete',
        fullMessage: processedResponse.cleanedResponse,
        aiResponse: processedResponse.cleanedResponse,
        isComplete: processedResponse.isComplete,
        progressDetails: processedResponse.progressDetails,
        mode: conversationData.existingConversation.mode, // Send mode to frontend for UI
        workoutCreatorSession: conversationData.existingConversation.workoutCreatorSession, // Track session for frontend badge
        metadata: {
          workoutCollectionStarted: true,
        },
      });

      console.info('✅ Workout collection session started');
    }
  } catch (error) {
    console.error('❌ Error starting workout collection:', error);
    yield formatChunkEvent("I'd love to help you log that workout! Can you tell me a bit more about what you did?");
  }
}

/**
 * Continue an existing workout collection session
 * Extracts data, updates TODO list, generates next question, or triggers build-workout if complete
 */
export async function* handleWorkoutCreatorFlow(
  params: BusinessLogicParams,
  conversationData: ConversationData,
  workoutSession: NonNullable<CoachConversation['workoutCreatorSession']>
): AsyncGenerator<string, void, unknown> {
  console.info('🏋️ Continuing workout collection session');

  try {
    // Create full session object from the simplified workoutSession
    const fullWorkoutSession: WorkoutCreatorSession = {
      sessionId: `workout_creator_${params.conversationId}_${Date.now()}`,
      userId: params.userId,
      coachId: params.coachId,
      conversationId: params.conversationId,
      todoList: workoutSession.todoList,
      conversationHistory: workoutSession.conversationHistory,
      isComplete: false,
      startedAt: workoutSession.startedAt,
      lastActivity: workoutSession.lastActivity,
      turnCount: workoutSession.turnCount || 0, // Use persisted turn count
      imageS3Keys: workoutSession.imageS3Keys || [],
    };

    // 🐛 DEBUG: Log existing session state before handler
    const initialProgress = getTodoProgress(fullWorkoutSession.todoList);
    console.info('🔄 CONTINUING WORKOUT SESSION:', {
      sessionId: fullWorkoutSession.sessionId,
      userId: fullWorkoutSession.userId,
      conversationId: fullWorkoutSession.conversationId,
      turnCount: fullWorkoutSession.turnCount,
      hasImages: (params.imageS3Keys?.length || 0) > 0,
      progressBefore: {
        required: `${initialProgress.requiredCompleted}/${initialProgress.requiredTotal} (${initialProgress.requiredPercentage}%)`,
        highPriority: `${initialProgress.highPriorityCompleted}/${initialProgress.highPriorityTotal} (${initialProgress.highPriorityPercentage}%)`,
        lowPriority: `${initialProgress.lowPriorityCompleted}/${initialProgress.lowPriorityTotal} (${initialProgress.lowPriorityPercentage}%)`,
      },
      collectedDataBefore: getCollectedDataSummary(fullWorkoutSession.todoList),
    });

    // Yield metadata event to inform UI we're still in workout_log mode
    yield formatMetadataEvent({ mode: CONVERSATION_MODES.WORKOUT_LOG });
    console.info('📋 Metadata event sent: mode=workout_log (session continue)');

    // Prepare user context from conversation data
    const userContext = {
      recentWorkouts: conversationData.context?.recentWorkouts,
      pineconeMemories: conversationData.context?.pineconeContext?.memories,
      userProfile: conversationData.userProfile,
      activeProgram: conversationData.context?.activeProgram,
    };

    // Use workout-creator conversation handler
    // The handler will update fullWorkoutSession.todoList and conversationHistory by reference
    const conversationGenerator = handleWorkoutTodoListConversation(
      params.userResponse,
      fullWorkoutSession, // Pass the SAME session object
      params.imageS3Keys,
      conversationData.coachConfig,
      userContext // Pass user context for smarter extraction and questions
    );

    // Iterate through the generator
    let processedResponse: any = null;
    let result = await conversationGenerator.next();

    while (!result.done) {
      yield result.value;
      result = await conversationGenerator.next();
    }

    processedResponse = result.value;

    if (processedResponse) {
      // 🐛 DEBUG: Log session state after handler completes
      const finalProgress = getTodoProgress(fullWorkoutSession.todoList);
      console.info('📊 SESSION STATE AFTER HANDLER (handleWorkoutCreatorFlow):', {
        sessionId: fullWorkoutSession.sessionId,
        turnCount: fullWorkoutSession.turnCount,
        isComplete: processedResponse.isComplete,
        progressAfter: {
          required: `${finalProgress.requiredCompleted}/${finalProgress.requiredTotal} (${finalProgress.requiredPercentage}%)`,
          highPriority: `${finalProgress.highPriorityCompleted}/${finalProgress.highPriorityTotal} (${finalProgress.highPriorityPercentage}%)`,
          lowPriority: `${finalProgress.lowPriorityCompleted}/${finalProgress.lowPriorityTotal} (${finalProgress.lowPriorityPercentage}%)`,
        },
        collectedDataAfter: getCollectedDataSummary(fullWorkoutSession.todoList),
      });

      // Update the workoutSession with the modified data from fullWorkoutSession
      workoutSession.todoList = fullWorkoutSession.todoList; // Updated by handler!
      workoutSession.conversationHistory = fullWorkoutSession.conversationHistory; // Updated by handler!
      workoutSession.lastActivity = new Date();
      workoutSession.turnCount = fullWorkoutSession.turnCount; // Persist turn count

      // Create messages
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

      // Check if session was cancelled (topic change detected)
      if (processedResponse.sessionCancelled) {
        console.info('🔀 Topic change detected - clearing workout session and re-processing message');

        // Clear the workout session and reset mode back to CHAT
        delete conversationData.existingConversation.workoutCreatorSession;
        conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;

        // Save the conversation without the session
        await saveCoachConversation(conversationData.existingConversation);

        // Yield a special event indicating session was cancelled
        yield formatCompleteEvent({
          messageId: `msg_${Date.now()}_cancelled`,
          type: 'session_cancelled',
          fullMessage: '',
          aiResponse: '',
          isComplete: false,
          mode: CONVERSATION_MODES.CHAT, // Reset mode back to CHAT (no artifact)
          workoutCreatorSession: null, // Clear session on frontend
          metadata: {
            sessionCancelled: true,
            reason: 'topic_change',
          },
        });

        console.info('✅ Workout session cancelled - message will be re-processed as normal conversation');
        return;
      }

      const newAiMessage: CoachMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: processedResponse.cleanedResponse,
        timestamp: new Date(),
        metadata: {
          model: MODEL_IDS.CLAUDE_HAIKU_4_DISPLAY,
          mode: CONVERSATION_MODES.WORKOUT_LOG, // Track that this message was created during workout log artifact creation
        },
      };

      // If complete, trigger workout creation and clear session
      if (processedResponse.isComplete) {
        console.info('🎉 Workout collection complete - triggering build-workout');

        // Collect all workout data
        const workoutData = getCollectedDataSummary(workoutSession.todoList);
        const fullUserMessage = workoutSession.conversationHistory
          .filter((m: any) => m.role === 'user')
          .map((m: any) => m.content)
          .join(' ');

        // Trigger async workout building
        const buildWorkoutFunction = process.env.BUILD_WORKOUT_FUNCTION_NAME;
        if (buildWorkoutFunction) {
          try {
            await invokeAsyncLambda(
              buildWorkoutFunction,
              {
                userId: params.userId,
                coachId: params.coachId,
                conversationId: params.conversationId,
                userMessage: fullUserMessage, // Contains all user messages concatenated
                coachConfig: conversationData.coachConfig, // REQUIRED: build-workout needs coach name and config
                imageS3Keys: workoutSession.imageS3Keys || [],
                // Optional fields that may help extraction
                userTimezone: conversationData.userProfile?.timezone,
                criticalTrainingDirective: conversationData.userProfile?.critical_training_directive,
              },
              "multi-turn workout creation"
            );
            console.info('✅ Triggered async workout creation');
          } catch (error) {
            console.error('❌ Failed to trigger workout creation:', error);
          }
        } else {
          console.warn('⚠️ BUILD_WORKOUT_FUNCTION_NAME not set');
        }

        // Clear session from conversation and reset mode back to CHAT
        delete conversationData.existingConversation.workoutCreatorSession;
        conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;
      }

      // Add messages to conversation
      conversationData.existingConversation.messages.push(newUserMessage, newAiMessage);
      conversationData.existingConversation.metadata.lastActivity = new Date();
      conversationData.existingConversation.metadata.totalMessages = conversationData.existingConversation.messages.length;

      // Save full conversation (including messages AND session state)
      await saveCoachConversation(conversationData.existingConversation);

      // Yield complete event
      yield formatCompleteEvent({
        messageId: newAiMessage.id,
        aiMessage: newAiMessage, // Include the full AI message with its metadata
        type: 'complete',
        fullMessage: processedResponse.cleanedResponse,
        aiResponse: processedResponse.cleanedResponse,
        isComplete: processedResponse.isComplete,
        progressDetails: processedResponse.progressDetails,
        mode: conversationData.existingConversation.mode, // Send mode to frontend (WORKOUT_LOG if continuing, CHAT if complete)
        workoutCreatorSession: conversationData.existingConversation.workoutCreatorSession, // Track session for frontend badge (will be undefined if completed)
        metadata: {
          workoutCollectionInProgress: !processedResponse.isComplete,
          workoutGenerationTriggered: processedResponse.isComplete,
        },
      });

      console.info('✅ Workout collection flow completed');
    }
  } catch (error) {
    console.error('❌ Error in workout collection flow:', error);
    yield formatChunkEvent("I'm having trouble with that. Can you try rephrasing?");
  }
}

/**
 * Clear workout session from conversation (called when user changes topic or cancels)
 */
export async function clearWorkoutSession(
  userId: string,
  coachId: string,
  conversationId: string,
  conversation: CoachConversation
): Promise<void> {
  console.info('🧹 Clearing workout collection session');
  delete conversation.workoutCreatorSession;

  // Save conversation without session
  await saveCoachConversation(conversation);
  console.info('✅ Workout session cleared');
}
