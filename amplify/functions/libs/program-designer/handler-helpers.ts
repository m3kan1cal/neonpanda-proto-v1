/**
 * Program Designer Handler Helpers
 *
 * Helper functions for BUILD mode (training program creation) flow in stream-coach-conversation handler.
 * These functions manage the program session lifecycle and orchestrate the todo-list conversation flow.
 */

import {
  CoachMessage,
  MESSAGE_TYPES,
  CONVERSATION_MODES,
} from "../coach-conversation/types";
import { MODEL_IDS } from "../api-helpers";
import {
  getProgramDesignerSession,
  saveProgramDesignerSession,
  saveCoachConversation,
} from "../../../dynamodb/operations";
import {
  formatCompleteEvent,
  formatMetadataEvent,
  formatChunkEvent,
} from "../streaming";
import type { ValidationParams, ConversationData } from "../streaming";
import { handleTodoListConversation as handleProgramTodoListConversation } from "./conversation-handler";
import {
  createEmptyProgramTodoList,
  isSessionComplete as isProgramTodoComplete,
  getTodoProgress,
} from "./todo-list-utils";
import { generateProgramId } from "../id-utils";
import { saveSessionAndTriggerProgramGeneration } from "./session-management";
import { BuildProgramEvent } from "../program/types";
import { ProgramDesignerSession } from "./types";
import { logger } from "../logger";

/**
 * Start a new program design collection session
 * Pattern: Mirrors startWorkoutCollection from workout-creator
 */
export async function* startProgramDesignCollection(
  params: ValidationParams,
  conversationData: ConversationData,
): AsyncGenerator<string, void, unknown> {
  logger.info("🏗️ Starting new program design collection session");

  try {
    // Create new program designer session
    const timestamp = Date.now();
    const programSession: ProgramDesignerSession = {
      sessionId: `program_designer_${params.userId}_${timestamp}`,
      userId: params.userId,
      coachId: params.coachId,
      todoList: createEmptyProgramTodoList(),
      conversationHistory: [],
      isComplete: false,
      startedAt: new Date(),
      lastActivity: new Date(),
      turnCount: 0, // Initialize turn counter (matches workout creator pattern)
      imageS3Keys: params.imageS3Keys || [], // Store images for session (matches workout creator pattern)
    };

    logger.info("🆕 NEW PROGRAM SESSION CREATED:", {
      sessionId: programSession.sessionId,
      userId: programSession.userId,
      hasImages: (params.imageS3Keys?.length || 0) > 0,
    });

    // Save session to DynamoDB
    await saveProgramDesignerSession(programSession);

    // Note: programSession is stored separately in DynamoDB, not attached to conversation
    // We'll pass it separately to formatCompleteEvent for frontend badge

    // ✅ FIX: Yield metadata event FIRST to inform UI we're in program_design mode
    // This ensures purple bubble styling applies immediately, not just after refresh
    yield formatMetadataEvent({ mode: CONVERSATION_MODES.PROGRAM_DESIGN });
    logger.info("📋 Metadata event sent: mode=program_design (session start)");

    // CRITICAL: Metadata event MUST be sent before AI response starts streaming
    // This allows frontend to apply purple styling to the first AI message bubble

    // Prepare user context from conversation data (matches workout creator pattern)
    const userContext = {
      recentWorkouts: conversationData.context?.recentWorkouts,
      pineconeMemories: conversationData.context?.pineconeContext?.memories,
      pineconeFormattedContext:
        conversationData.context?.pineconeContext?.formatted,
      userProfile: conversationData.userProfile,
      activeProgram: conversationData.context?.activeProgram,
    };

    // Use program-designer conversation handler to start collection
    // The handler will update programSession.todoList and conversationHistory by reference
    const conversationGenerator = handleProgramTodoListConversation(
      params.userResponse,
      programSession, // Pass the SAME session object
      params.imageS3Keys,
      conversationData.coachConfig,
      userContext, // Pass user context for smarter extraction and questions (matches workout creator pattern)
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
      logger.info(
        "📊 SESSION STATE AFTER HANDLER (startProgramDesignCollection):",
        {
          sessionId: programSession.sessionId,
          turnCount: programSession.turnCount,
          isComplete: processedResponse.isComplete,
          progress: {
            completed: `${progress.completed}/${progress.total} (${progress.percentage}%)`,
          },
        },
      );

      // Send progress update in metadata event
      if (processedResponse.progressDetails) {
        yield formatMetadataEvent({
          mode: CONVERSATION_MODES.PROGRAM_DESIGN,
          progress: {
            questionsCompleted: processedResponse.progressDetails.completed,
            estimatedTotal: processedResponse.progressDetails.total,
            percentage: processedResponse.progressDetails.percentage,
          },
        });
        logger.info("📊 Progress metadata sent:", {
          completed: processedResponse.progressDetails.completed,
          total: processedResponse.progressDetails.total,
          percentage: processedResponse.progressDetails.percentage,
        });
      }
    }

    // Check if session was cancelled (topic change detected)
    if (processedResponse?.sessionCancelled) {
      logger.info("🔀 Topic change detected - soft-deleting program session");

      // Soft-delete the session (keep for audit trail and future auto-resume)
      programSession.isDeleted = true;
      programSession.completedAt = new Date(); // Mark when it was abandoned
      await saveProgramDesignerSession(programSession);
      logger.info("🗑️ Program session soft-deleted:", {
        sessionId: programSession.sessionId,
        turnCount: programSession.turnCount,
        reason: "topic_change",
      });

      // Note: Session already soft-deleted in DynamoDB above (not embedded in conversation)
      // Reset conversation mode back to CHAT
      conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;
      await saveCoachConversation(conversationData.existingConversation);

      // Yield event indicating session was cancelled
      yield formatCompleteEvent({
        messageId: `msg_${timestamp}_cancelled`,
        type: "session_cancelled" as any,
        fullMessage: "",
        aiResponse: "",
        isComplete: false,
        mode: CONVERSATION_MODES.CHAT, // Reset mode back to CHAT
        metadata: {
          sessionCancelled: true,
          reason: "topic_change",
        },
      });

      logger.info(
        "✅ Program session cancelled - message will be re-processed",
      );
      return;
    }

    // Update session state (session is stored separately in DynamoDB, not embedded in conversation)
    programSession.lastActivity = new Date();
    programSession.turnCount = programSession.turnCount + 1; // Increment turn counter
    await saveProgramDesignerSession(programSession);

    // Set mode to PROGRAM_DESIGN
    conversationData.existingConversation.mode =
      CONVERSATION_MODES.PROGRAM_DESIGN;

    // Create user and AI messages for conversation history (matches workout creator pattern)
    const newUserMessage: CoachMessage = {
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

    const newAiMessage: CoachMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: processedResponse.cleanedResponse,
      timestamp: new Date(),
      metadata: {
        model: MODEL_IDS.PLANNER_MODEL_DISPLAY,
        mode: CONVERSATION_MODES.PROGRAM_DESIGN, // Track that this message was created during program design artifact creation
      },
    };

    // Add messages to conversation (matches workout creator pattern: push to array)
    conversationData.existingConversation.messages.push(
      newUserMessage,
      newAiMessage,
    );
    conversationData.existingConversation.metadata.lastActivity = new Date();
    conversationData.existingConversation.metadata.totalMessages =
      conversationData.existingConversation.messages.length;

    // Save full conversation (including messages AND session) - matches workout creator pattern: single save
    await saveCoachConversation(conversationData.existingConversation);

    // Yield complete event (matches workout creator pattern)
    yield formatCompleteEvent({
      messageId: newAiMessage.id,
      aiMessage: newAiMessage, // ✅ Include the full AI message with its metadata (matches workout creator)
      type: "complete",
      fullMessage: processedResponse.cleanedResponse,
      aiResponse: processedResponse.cleanedResponse,
      isComplete: processedResponse.isComplete,
      progressDetails: processedResponse.progressDetails,
      mode: conversationData.existingConversation.mode, // ✅ Send mode to frontend for UI (matches workout creator)
      programDesignerSession: programSession, // ✅ Pass session directly (stored separately in DynamoDB)
      metadata: {
        programCollectionStarted: true, // ✅ Specific metadata (matches workout creator pattern)
      },
    });

    logger.info("✅ Program design collection session started");
  } catch (error) {
    logger.error("❌ Error starting program design session:", error);
    throw error;
  }
}

/**
 * Handle BUILD mode conversation with todo-list flow for training program creation
 * Manages program designer session, extracts requirements, and triggers async generation when complete
 * SESSION-BASED: Works directly with ProgramDesignerSession.conversationHistory[]
 */
export async function* handleProgramDesignerFlow(
  params: ValidationParams,
  conversationData: ConversationData,
  programSession: ProgramDesignerSession, // Session passed from main handler
): AsyncGenerator<string, void, unknown> {
  logger.info("🏗️ BUILD MODE detected - using todo-list conversation flow");

  // 🐛 DEBUG: Log existing session state before handler (matches workout creator pattern)
  const initialProgress = getTodoProgress(programSession.todoList);
  logger.info("🔄 CONTINUING PROGRAM SESSION:", {
    sessionId: programSession.sessionId,
    userId: programSession.userId,
    turnCount: programSession.turnCount || 0,
    hasImages: (params.imageS3Keys?.length || 0) > 0,
    conversationHistoryLength: programSession.conversationHistory?.length || 0,
    progressBefore: {
      completed: `${initialProgress.completed}/${initialProgress.total} (${initialProgress.percentage}%)`,
    },
  });

  // Check if session is already marked as complete
  // We rely on the session.isComplete flag as the source of truth
  // This prevents race conditions where additionalConsiderations might be set
  // but isComplete hasn't been persisted yet
  if (!programSession.isComplete) {
    logger.info("✨ Todo list not complete - using conversational flow");

    // Prepare user context from conversation data (matches workout creator pattern)
    const userContext = {
      recentWorkouts: conversationData.context?.recentWorkouts,
      pineconeMemories: conversationData.context?.pineconeContext?.memories,
      pineconeFormattedContext:
        conversationData.context?.pineconeContext?.formatted,
      userProfile: conversationData.userProfile,
      activeProgram: conversationData.context?.activeProgram,
    };

    // Update session last activity
    programSession.lastActivity = new Date();

    // NOTE: User message already added to session.conversationHistory[] in main handler
    // We don't need to add it again here

    // 🎨 CRITICAL: Send metadata event with mode BEFORE streaming chunks
    // This allows frontend to style the ENTIRE AI response in purple from the first chunk
    const currentProgress = getTodoProgress(programSession.todoList);
    yield formatMetadataEvent({
      mode: CONVERSATION_MODES.PROGRAM_DESIGN,
      progress: {
        questionsCompleted: currentProgress.requiredCompleted,
        estimatedTotal: currentProgress.requiredTotal,
        percentage: currentProgress.requiredPercentage,
      },
    });
    logger.info("📊 Progress metadata sent (BEFORE chunks):", {
      completed: currentProgress.requiredCompleted,
      total: currentProgress.requiredTotal,
      percentage: currentProgress.requiredPercentage,
    });

    // Use the todo-list conversation handler (same pattern as coach-creator)
    // The handler will update programSession.todoList and conversationHistory by reference
    const conversationGenerator = handleProgramTodoListConversation(
      params.userResponse,
      programSession, // Pass the SAME session object (user message already in conversationHistory)
      params.imageS3Keys,
      conversationData.coachConfig,
      userContext, // Pass user context for smarter extraction and questions (matches workout creator pattern)
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
      logger.info(
        "📊 SESSION STATE AFTER HANDLER (handleProgramDesignerFlow):",
        {
          sessionId: programSession.sessionId,
          turnCount: programSession.turnCount,
          isComplete: processedResponse.isComplete,
          progressAfter: {
            completed: `${finalProgress.completed}/${finalProgress.total} (${finalProgress.percentage}%)`,
          },
        },
      );

      // Update the session with the modified data from conversation handler
      programSession.todoList = programSession.todoList; // Already updated by handler by reference!
      programSession.conversationHistory = programSession.conversationHistory; // Already updated by handler!
      programSession.lastActivity = new Date();
      programSession.turnCount = (programSession.turnCount || 0) + 1; // Increment turn count

      // Update progress details in session for next load
      if (processedResponse.progressDetails) {
        programSession.progressDetails = {
          itemsCompleted: processedResponse.progressDetails.completed,
          totalItems: processedResponse.progressDetails.total,
          percentage: processedResponse.progressDetails.percentage,
        };
      }
    }

    // Check if session was cancelled (topic change detected)
    if (processedResponse?.sessionCancelled) {
      logger.info("🔀 Topic change detected - soft-deleting program session");

      // Soft-delete the session (keep for audit trail and future auto-resume)
      programSession.isDeleted = true;
      programSession.completedAt = new Date(); // Mark when it was abandoned
      await saveProgramDesignerSession(programSession);
      logger.info("🗑️ Program session soft-deleted:", {
        sessionId: programSession.sessionId,
        turnCount: programSession.turnCount,
        reason: "topic_change",
      });

      // Yield event indicating session was cancelled
      yield formatCompleteEvent({
        messageId: `msg_${Date.now()}_cancelled`,
        type: "session_cancelled" as any,
        fullMessage: "",
        aiResponse: "",
        isComplete: false,
        mode: CONVERSATION_MODES.CHAT, // Reset mode back to CHAT
        metadata: {
          sessionCancelled: true,
          reason: "topic_change",
        },
      });

      logger.info("✅ Program session cancelled - session soft-deleted");
      return;
    }

    if (processedResponse) {
      // Progress metadata already sent before chunks
      // Only send updated progress if it changed significantly
      if (processedResponse.progressDetails) {
        const updatedProgress = processedResponse.progressDetails;
        if (
          updatedProgress.completed !== currentProgress.requiredCompleted ||
          updatedProgress.total !== currentProgress.requiredTotal
        ) {
          yield formatMetadataEvent({
            mode: CONVERSATION_MODES.PROGRAM_DESIGN,
            progress: {
              questionsCompleted: updatedProgress.completed,
              estimatedTotal: updatedProgress.total,
              percentage: updatedProgress.percentage,
            },
          });
          logger.info("📊 Progress metadata updated (AFTER processing):", {
            completed: updatedProgress.completed,
            total: updatedProgress.total,
            percentage: updatedProgress.percentage,
          });
        }
      }
      // NOTE: User and AI messages already in session.conversationHistory[]
      // User message added in main handler, AI message added in conversation-handler
      // No need to create separate CoachMessage objects

      // If complete, trigger program creation and clear session (matches workout creator pattern)
      if (processedResponse.isComplete) {
        logger.info(
          "🎉 Program collection complete - triggering build-program",
        );

        // Mark session complete and save
        programSession.isComplete = true;
        programSession.completedAt = new Date();

        // Extract conversation context from session history
        const conversationContext = programSession.conversationHistory
          .map((m: any) => `${m.role}: ${m.content}`)
          .join("\n\n");

        // Prepare event for async generation
        const buildEvent: BuildProgramEvent = {
          userId: params.userId,
          coachId: programSession.coachId,
          conversationId: "", // Not used in session-based flow
          programId: generateProgramId(params.userId),
          sessionId: programSession.sessionId,
          todoList: programSession.todoList,
          conversationContext,
          additionalConsiderations: programSession.additionalConsiderations, // User's final thoughts/requirements
        };

        // Save session and trigger generation with idempotency protection
        const result = await saveSessionAndTriggerProgramGeneration(
          params.userId,
          programSession,
          true, // isComplete
          buildEvent, // Full payload
        );

        if (result.alreadyGenerating) {
          logger.info(
            "⏭️ Program generation already in progress - skipped duplicate trigger",
          );
        } else if (result.programId) {
          logger.info(
            "⏭️ Program already exists - skipped duplicate trigger:",
            { programId: result.programId },
          );
        } else {
          logger.info(
            "✅ Program generation triggered with idempotency protection",
          );
        }
      } else {
        // Update session with latest state (matches workout creator pattern)
        programSession.lastActivity = new Date();
        await saveProgramDesignerSession(programSession);

        logger.info("✅ Session saved with updated conversation history:", {
          sessionId: programSession.sessionId,
          conversationHistoryLength: programSession.conversationHistory.length,
          turnCount: programSession.turnCount,
        });
      }

      // Yield complete event (matches workout creator pattern)
      yield formatCompleteEvent({
        messageId: `msg_${Date.now()}_complete`,
        type: "complete",
        fullMessage: processedResponse.cleanedResponse,
        aiResponse: processedResponse.cleanedResponse,
        isComplete: processedResponse.isComplete,
        progressDetails: processedResponse.progressDetails,
        mode: CONVERSATION_MODES.PROGRAM_DESIGN, // Always PROGRAM_DESIGN during flow
        programDesignerSession: processedResponse.isComplete
          ? undefined
          : programSession, // ✅ Pass session if in progress (will be undefined if completed)
        metadata: {
          programCollectionInProgress: !processedResponse.isComplete,
          programGenerationTriggered: processedResponse.isComplete,
        },
      });

      logger.info("✅ Program collection flow completed");
    }
  } else {
    logger.info(
      "✅ Program session marked as complete - likely already generating",
    );

    // Session is complete - soft-delete it if not already done
    if (!programSession.isDeleted) {
      programSession.isDeleted = true;
      programSession.completedAt = programSession.completedAt || new Date();
      await saveProgramDesignerSession(programSession);
      logger.info("🗑️ Program session soft-deleted (marked complete):", {
        sessionId: programSession.sessionId,
        turnCount: programSession.turnCount,
        generationStatus: programSession.programGeneration?.status,
      });
    }

    logger.info(
      "✅ Program session already marked complete - no further processing needed",
    );
    // Don't yield anything - session already processed
  }
}
