import {
  createOkResponse,
  createErrorResponse,
  MODEL_IDS,
} from "../libs/api-helpers";
import {
  getCoachConversation,
  sendCoachConversationMessage,
  getCoachConfig,
  getUserProfile,
} from "../../dynamodb/operations";
import { CoachMessage, MESSAGE_TYPES } from "../libs/coach-conversation/types";
import { detectAndProcessConversationSummary } from "../libs/coach-conversation/detection";
import { gatherConversationContext } from "../libs/coach-conversation/context";
import { detectAndProcessWorkout } from "../libs/coach-conversation/workout-detection";
import { queryMemories, detectAndProcessMemory } from "../libs/coach-conversation/memory-processing";
import { generateAIResponse, generateAIResponseStream } from "../libs/coach-conversation/response-orchestrator";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

// Feature flags
const FEATURE_FLAGS = {
  ENABLE_WORKOUT_DETECTION: true,
  ENABLE_MEMORY_PROCESSING: true,
  ENABLE_CONVERSATION_SUMMARY: true
};

const baseHandler: AuthenticatedHandler = async (event) => {
  console.info('🚀 Starting send-coach-conversation-message handler');

  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;
  const conversationId = event.pathParameters?.conversationId;

    if (!coachId) {
      console.error('❌ Validation failed: coachId is required');
      return createErrorResponse(400, "coachId is required");
    }

    if (!conversationId) {
      console.error('❌ Validation failed: conversationId is required');
      return createErrorResponse(400, "conversationId is required");
    }

    if (!event.body) {
      console.error('❌ Validation failed: Request body is required');
      return createErrorResponse(400, "Request body is required");
    }

    console.info('✅ Path parameters validated:', { userId, coachId, conversationId });

    // Check if streaming is requested
    const isStreamingRequested = event.queryStringParameters?.stream === 'true';
    console.info('🔄 Streaming mode:', isStreamingRequested ? 'ENABLED' : 'DISABLED');

    const body = JSON.parse(event.body);
    const { userResponse, messageTimestamp, imageS3Keys } = body;

    console.info('📥 Request body parsed:', {
      hasUserResponse: !!userResponse,
      userResponseType: typeof userResponse,
      hasMessageTimestamp: !!messageTimestamp,
      hasImages: !!imageS3Keys,
      imageCount: imageS3Keys?.length || 0,
      bodyKeys: Object.keys(body)
    });

    // Validation: Either text or images required
    if (!userResponse && (!imageS3Keys || imageS3Keys.length === 0)) {
      console.error('❌ Validation failed: Either text or images required');
      return createErrorResponse(400, "Either text or images required");
    }

    if (imageS3Keys && imageS3Keys.length > 5) {
      console.error('❌ Validation failed: Maximum 5 images per message');
      return createErrorResponse(400, "Maximum 5 images per message");
    }

    // Verify S3 keys belong to this user
    if (imageS3Keys) {
      for (const key of imageS3Keys) {
        if (!key.startsWith(`user-uploads/${userId}/`)) {
          console.error('❌ Validation failed: Invalid image key:', { key, userId });
          return createErrorResponse(403, "Invalid image key");
        }
      }
    }

    if (!messageTimestamp) {
      console.error('❌ Validation failed: Message timestamp is required for accurate workout logging');
      return createErrorResponse(400, "Message timestamp is required for accurate workout logging");
    }

    console.info('✅ All validations passed, starting message processing');

    // Load existing conversation
    const existingConversation = await getCoachConversation(
      userId,
      coachId,
      conversationId
    );
    if (!existingConversation) {
      return createErrorResponse(404, "Conversation not found");
    }

    // Extract conversation mode (default to chat for backwards compatibility)
    const conversationMode = existingConversation.mode || 'chat';

    // Load coach config for system prompt
    const coachConfig = await getCoachConfig(userId, coachId);
    if (!coachConfig) {
      return createErrorResponse(404, "Coach configuration not found");
    }

    // Load user profile for critical training directive
    const userProfile = await getUserProfile(userId);
    console.info('📋 User profile loaded:', {
      hasProfile: !!userProfile,
      hasCriticalDirective: !!userProfile?.criticalTrainingDirective,
      directiveEnabled: userProfile?.criticalTrainingDirective?.enabled
    });

    // Gather all conversation context (workouts + Pinecone)
    const context = await gatherConversationContext(userId, userResponse);

    // Create user message
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userResponse || '',
      timestamp: new Date(),
      messageType: imageS3Keys && imageS3Keys.length > 0 ? MESSAGE_TYPES.TEXT_WITH_IMAGES : MESSAGE_TYPES.TEXT,
      ...(imageS3Keys && imageS3Keys.length > 0 ? { imageS3Keys: imageS3Keys } : {}),
    };

    // Calculate conversation context from existing messages
    const existingMessages = existingConversation.messages;
    const conversationContext = {
      sessionNumber:
        existingMessages.filter((msg) => msg.role === "user").length + 1,
    };

    // Detect and process workouts (natural language or slash commands)
    let workoutResult;
    if (FEATURE_FLAGS.ENABLE_WORKOUT_DETECTION) {
      console.info('🔍 Starting workout detection for message:', {
        messageLength: userResponse.length,
        messagePreview: userResponse.substring(0, 100),
        conversationId,
        sessionNumber: conversationContext.sessionNumber
      });

      try {
        workoutResult = await detectAndProcessWorkout(
          userResponse,
          userId,
          coachId,
          conversationId,
          coachConfig,
          conversationContext,
          messageTimestamp,
          userProfile ?? undefined
        );
      } catch (error) {
        console.error('❌ Error in workout detection, using fallback:', error);
        // Provide fallback workout result to prevent conversation from failing
        workoutResult = {
          isWorkoutLogging: false,
          workoutContent: userResponse,
          workoutDetectionContext: [],
          slashCommand: { isSlashCommand: false },
          isSlashCommandWorkout: false,
          isNaturalLanguageWorkout: false
        };
      }
    } else {
      console.info('🔍 Workout detection disabled by feature flag');
      workoutResult = {
        isWorkoutLogging: false,
        workoutContent: userResponse,
        workoutDetectionContext: [],
        slashCommand: { isSlashCommand: false },
        isSlashCommandWorkout: false,
        isNaturalLanguageWorkout: false
      };
    }

    // Process memory (natural language detection AND slash commands)
    let memoryResult;
    let memoryRetrieval;

    if (FEATURE_FLAGS.ENABLE_MEMORY_PROCESSING) {
      memoryResult = await detectAndProcessMemory(
        userResponse,
        userId,
        coachId,
        conversationId,
        existingMessages,
        coachConfig.coach_name
      );

      // Retrieve existing memories for context (BEFORE AI response)
      // Calculate conversation context from existing messages for AI-guided memory retrieval
      const messageContext = existingMessages.slice(-3)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      memoryRetrieval = await queryMemories(
        userId,
        coachId,
        userResponse,
        messageContext
      );
    } else {
      console.info('🧠 Memory processing disabled by feature flag');
      memoryResult = {
        memoryFeedback: null
      };
      memoryRetrieval = {
        memories: []
      };
    }

    // Generate AI response with all context - handle streaming vs non-streaming
    if (isStreamingRequested) {
      console.info('🔄 Processing streaming request');
      return await handleStreamingResponse(
        userId, coachId, conversationId,
        userResponse, messageTimestamp,
        existingConversation, coachConfig,
        context, workoutResult, memoryRetrieval,
        existingMessages, conversationContext,
        userProfile,
        imageS3Keys // NEW: Pass imageS3Keys
      );
    }

    // Non-streaming path (existing logic)
    // Use Haiku for faster responses in legacy non-streaming path
    let responseResult;
    try {
      responseResult = await generateAIResponse(
        coachConfig,
        context,
        workoutResult,
        memoryRetrieval,
        userResponse,
        existingMessages,
        conversationContext,
        userId,
        coachId,
        conversationId,
        userProfile,
        imageS3Keys, // Pass imageS3Keys
        false // Use Haiku for speed (no router analysis in legacy path)
      );
    } catch (error) {
      console.error('❌ Error in AI response generation, using fallback:', error);
      // Provide fallback response to prevent conversation from failing
      responseResult = {
        aiResponseContent: "I apologize, but I'm having trouble generating a response right now. Your message has been saved and I'll be back to help you soon!",
        promptMetadata: null
      };
    }

    let aiResponseContent = responseResult.aiResponseContent;
    const promptMetadata = responseResult.promptMetadata;

    // Add memory feedback if any memory was processed
    if (FEATURE_FLAGS.ENABLE_MEMORY_PROCESSING && memoryResult.memoryFeedback) {
      aiResponseContent = `${memoryResult.memoryFeedback}\n\n${aiResponseContent}`;
    }

    // Create AI response message
    const newAiMessage: CoachMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: aiResponseContent,
      timestamp: new Date(),
      metadata: {
        model: MODEL_IDS.CLAUDE_SONNET_4_DISPLAY,
        mode: conversationMode, // Track which mode this message was created in
        // Note: Additional context like session number, prompt metadata, and Pinecone context
        // are logged above for debugging but not stored in message metadata
        // due to interface constraints
      },
    };

    // Save only the new messages (the function will append them to existing messages)
    const conversationSaveResult = await sendCoachConversationMessage(
      userId,
      coachId,
      conversationId,
      [newUserMessage, newAiMessage]
    );

    // Extract size information from the save result
    const itemSizeKB = parseFloat(conversationSaveResult?.dynamodbResult?.itemSizeKB || '0');
    const sizePercentage = Math.min(Math.round((itemSizeKB / 400) * 100), 100);
    const isApproachingLimit = itemSizeKB > 350; // 87.5% threshold

    console.info('📊 Conversation size:', {
      sizeKB: itemSizeKB,
      percentage: sizePercentage,
      isApproachingLimit,
      maxSizeKB: 400
    });

    // Check if we should trigger conversation summary (after conversation is fully updated)
    if (FEATURE_FLAGS.ENABLE_CONVERSATION_SUMMARY) {
      try {
        // Get the updated conversation to check the current message count
        const updatedConversation = await getCoachConversation(userId, coachId, conversationId);
        if (updatedConversation) {
          const currentMessageCount = updatedConversation.metadata.totalMessages;

          const summaryResult = await detectAndProcessConversationSummary(
            userId,
            coachId,
            conversationId,
            userResponse,
            currentMessageCount
          );


        }
      } catch (summaryError) {
        console.error(
          "❌ Failed to trigger conversation summary generation, but continuing:",
          summaryError
        );
        // Don't throw - we want the response to succeed even if summary generation fails
      }
    }

    try {
      // Safely access context properties with fallbacks
      const pineconeMatches = context?.pineconeMatches || [];
      const pineconeContext = context?.pineconeContext || '';

      const successResponse = createOkResponse(
        {
          userResponse: newUserMessage,
          aiResponse: newAiMessage,
          conversationId,
          pineconeContext: {
            used: pineconeMatches.length > 0,
            matches: pineconeMatches.length,
            contextLength: pineconeContext.length,
          },
          conversationSize: {
            sizeKB: itemSizeKB,
            percentage: sizePercentage,
            maxSizeKB: 400,
            isApproachingLimit
          }
        },
        "Conversation updated successfully"
      );

      console.info('✅ Successfully created success response');
      return successResponse;
    } catch (responseError) {
      console.error('❌ Error creating success response:', responseError);
      // Even if response creation fails, the messages were saved successfully
      return createOkResponse(
        { conversationId, status: 'saved' },
        "Conversation updated successfully (response creation had issues)"
      );
    }
};

// Streaming response handler
async function handleStreamingResponse(
  userId: string, coachId: string, conversationId: string,
  userResponse: string, messageTimestamp: string,
  existingConversation: any, coachConfig: any,
  context: any, workoutResult: any, memoryRetrieval: any,
  existingMessages: any[], conversationContext: any,
  userProfile: any,
  imageS3Keys?: string[] // NEW: Add imageS3Keys parameter
) {
  try {
    console.info('🔄 Starting streaming response generation');

    // Create user message first
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userResponse || '',
      timestamp: new Date(messageTimestamp),
      messageType: imageS3Keys && imageS3Keys.length > 0 ? MESSAGE_TYPES.TEXT_WITH_IMAGES : MESSAGE_TYPES.TEXT,
      ...(imageS3Keys && imageS3Keys.length > 0 ? { imageS3Keys: imageS3Keys } : {}),
    };

    // Start streaming AI response
    const streamResult = await generateAIResponseStream(
      coachConfig,
      context,
      workoutResult,
      memoryRetrieval,
      userResponse,
      existingMessages,
      conversationContext,
      userId,
      coachId,
      conversationId,
      userProfile,
      imageS3Keys // NEW: Pass imageS3Keys
    );

    // Return streaming response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: await generateSSEStream(
        streamResult.responseStream,
        newUserMessage,
        userId, coachId, conversationId,
        existingConversation, coachConfig,
        context, workoutResult, memoryRetrieval,
        streamResult.promptMetadata, existingMessages, userResponse
      ),
      isBase64Encoded: false,
    };

  } catch (error) {
    console.error('❌ Error in streaming response:', error);

    // Fallback to non-streaming on error
    console.info('🔄 Falling back to non-streaming response');
    try {
      const responseResult = await generateAIResponse(
        coachConfig,
        context,
        workoutResult,
        memoryRetrieval,
        userResponse,
        existingMessages,
        conversationContext,
        userId,
        coachId,
        conversationId,
        userProfile,
        undefined, // No imageS3Keys in fallback
        false // Use Haiku for speed in fallback
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
          type: 'fallback',
          userResponse: {
            id: `msg_${Date.now()}_user`,
            role: 'user',
            content: userResponse,
            timestamp: messageTimestamp,
          },
          aiResponse: {
            id: `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: responseResult.aiResponseContent,
            timestamp: new Date().toISOString(),
          },
          conversationId,
        }),
      };
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      return createErrorResponse(500, 'Failed to generate response');
    }
  }
}

// Generate Server-Sent Events stream
async function generateSSEStream(
  responseStream: AsyncGenerator<string, void, unknown>,
  newUserMessage: CoachMessage,
  userId: string, coachId: string, conversationId: string,
  existingConversation: any, coachConfig: any,
  context: any, workoutResult: any, memoryRetrieval: any,
  promptMetadata: any, existingMessages: any[], userResponse: string
): Promise<string> {
  let fullAiResponse = '';
  let sseOutput = '';

  try {
    // Stream the AI response chunks
    for await (const chunk of responseStream) {
      fullAiResponse += chunk;
      const chunkData = {
        type: 'chunk',
        content: chunk
      };
      sseOutput += `data: ${JSON.stringify(chunkData)}\n\n`;
    }

    // Create final AI message
    const conversationMode = existingConversation.mode || 'chat'; // Default to chat for backwards compatibility
    const newAiMessage: CoachMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: fullAiResponse,
      timestamp: new Date(),
      metadata: {
        mode: conversationMode, // Track which mode this message was created in
      },
    };

    // Save messages to conversation after streaming completes - capture result for size tracking
    console.info('💾 Saving messages to DynamoDB after streaming');
    const saveResult = await sendCoachConversationMessage(
      userId,
      coachId,
      conversationId,
      [newUserMessage, newAiMessage]
    );

    // Extract size information from the save result
    const itemSizeKB = parseFloat(saveResult?.dynamodbResult?.itemSizeKB || '0');
    const sizePercentage = Math.min(Math.round((itemSizeKB / 400) * 100), 100);
    const isApproachingLimit = itemSizeKB > 350; // 87.5% threshold

    console.info('📊 Conversation size:', {
      sizeKB: itemSizeKB,
      percentage: sizePercentage,
      isApproachingLimit,
      maxSizeKB: 400
    });

    // Trigger async conversation summary if enabled
    if (FEATURE_FLAGS.ENABLE_CONVERSATION_SUMMARY) {
      try {
        const allMessages = [...existingConversation.messages, newUserMessage, newAiMessage];
        const messageContext = existingMessages.slice(-3)
          .map((msg: any) => `${msg.role}: ${msg.content}`)
          .join('\n');

        await detectAndProcessConversationSummary(
          userId,
          coachId,
          conversationId,
          userResponse,
          allMessages.length,
          messageContext
        );
      } catch (summaryError) {
        console.warn('⚠️ Conversation summary processing failed (non-critical):', summaryError);
      }
    }

    // Send completion message with conversation size tracking
    const completeData = {
      type: 'complete',
      fullMessage: fullAiResponse,
      userMessage: newUserMessage,
      aiMessage: newAiMessage,
      conversationId,
      pineconeContext: {
        used: context?.pineconeMatches?.length > 0,
        matches: context?.pineconeMatches?.length || 0,
        contextLength: context?.pineconeContext?.length || 0,
      },
      conversationSize: {
        sizeKB: itemSizeKB,
        percentage: sizePercentage,
        maxSizeKB: 400,
        isApproachingLimit
      }
    };
    sseOutput += `data: ${JSON.stringify(completeData)}\n\n`;

    console.info('✅ Streaming response completed successfully');
    return sseOutput;

  } catch (streamError) {
    console.error('❌ Error during streaming:', streamError);

    // Send error message in stream format
    const errorData = {
      type: 'error',
      message: 'An error occurred during streaming'
    };
    sseOutput += `data: ${JSON.stringify(errorData)}\n\n`;
    return sseOutput;
  }
}

// Export with allowInternalCalls for Lambda-to-Lambda invocation from create-coach-conversation
export const handler = withAuth(baseHandler, { allowInternalCalls: true });
