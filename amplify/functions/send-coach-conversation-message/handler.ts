import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  createOkResponse,
  createErrorResponse,
  MODEL_IDS,
} from "../libs/api-helpers";
import {
  getCoachConversation,
  sendCoachConversationMessage,
  getCoachConfig,
} from "../../dynamodb/operations";
import { CoachMessage } from "../libs/coach-conversation/types";
import { detectAndProcessConversationSummary } from "../libs/coach-conversation/detection";
import { gatherConversationContext } from "../libs/coach-conversation/context";
import { detectAndProcessWorkout } from "../libs/coach-conversation/workout-detection";
import { queryMemories, detectAndProcessMemory } from "../libs/coach-conversation/memory-processing";
import { generateAIResponse } from "../libs/coach-conversation/response-generation";

// Feature flags
const FEATURE_FLAGS = {
  ENABLE_WORKOUT_DETECTION: true,
  ENABLE_MEMORY_PROCESSING: true,
  ENABLE_CONVERSATION_SUMMARY: true
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.info('🚀 Starting send-coach-conversation-message handler');

    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;
    const conversationId = event.pathParameters?.conversationId;

    if (!userId) {
      console.error('❌ Validation failed: userId is required');
      return createErrorResponse(400, "userId is required");
    }

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

    const body = JSON.parse(event.body);
    const { userResponse, messageTimestamp } = body;

    console.info('📥 Request body parsed:', {
      hasUserResponse: !!userResponse,
      userResponseType: typeof userResponse,
      hasMessageTimestamp: !!messageTimestamp,
      bodyKeys: Object.keys(body)
    });

    if (!userResponse || typeof userResponse !== "string") {
      console.error('❌ Validation failed: User response is required and must be string:', { userResponse, type: typeof userResponse });
      return createErrorResponse(400, "User response is required");
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

    // Load coach config for system prompt
    const coachConfig = await getCoachConfig(userId, coachId);
    if (!coachConfig) {
      return createErrorResponse(404, "Coach configuration not found");
    }

    // Gather all conversation context (workouts + Pinecone)
    const context = await gatherConversationContext(userId, userResponse);

    // Create user message
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userResponse,
      timestamp: new Date(),
    };

    // Calculate conversation context from existing messages
    const existingMessages = existingConversation.attributes.messages;
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
          messageTimestamp
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
        coachConfig.attributes.coach_name
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

    // Generate AI response with all context
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
        conversationId
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
        // Note: Additional context like session number, prompt metadata, and Pinecone context
        // are logged above for debugging but not stored in message metadata
        // due to interface constraints
      },
    };

    // Update conversation with both messages
    const updatedMessages = [
      ...existingConversation.attributes.messages,
      newUserMessage,
      newAiMessage,
    ];

    const conversationSaveResult = await sendCoachConversationMessage(
      userId,
      coachId,
      conversationId,
      updatedMessages
    );

    // Check if we should trigger conversation summary (after conversation is fully updated)
    if (FEATURE_FLAGS.ENABLE_CONVERSATION_SUMMARY) {
      try {
        // Get the updated conversation to check the current message count
        const updatedConversation = await getCoachConversation(userId, coachId, conversationId);
        if (updatedConversation) {
          const currentMessageCount = updatedConversation.attributes.metadata.totalMessages;

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
  } catch (error) {
    console.error("Error updating coach conversation:", error);
    return createErrorResponse(500, "Internal server error");
  }
};
