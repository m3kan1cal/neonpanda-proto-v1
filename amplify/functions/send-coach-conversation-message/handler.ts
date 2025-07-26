import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  createSuccessResponse,
  createErrorResponse,
  MODEL_IDS,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import {
  getCoachConversation,
  sendCoachConversationMessage,
  getCoachConfig,
} from "../../dynamodb/operations";
import { CoachMessage } from "../libs/coach-conversation/types";
import { detectConversationComplexity } from "../libs/coach-conversation/detection";
import { gatherConversationContext } from "../libs/coach-conversation/context";
import { detectAndProcessWorkout } from "../libs/coach-conversation/workout-detection";
import { processUserMemories } from "../libs/coach-conversation/memory-processing";
import { generateAIResponse } from "../libs/coach-conversation/response-generation";

// Configuration constants - moved to individual modules

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;
    const conversationId = event.pathParameters?.conversationId;

    if (!userId) {
      return createErrorResponse(400, "userId is required");
    }

    if (!coachId) {
      return createErrorResponse(400, "coachId is required");
    }

    if (!conversationId) {
      return createErrorResponse(400, "conversationId is required");
    }

    if (!event.body) {
      return createErrorResponse(400, "Request body is required");
    }

    const body = JSON.parse(event.body);
    const { userResponse } = body;

    if (!userResponse || typeof userResponse !== "string") {
      return createErrorResponse(400, "User response is required");
    }

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

    // Check if we should trigger conversation summary
    const hasComplexityTriggers = detectConversationComplexity(userResponse);
    const shouldTriggerSummary =
      existingConversation.attributes.metadata.totalMessages % 5 === 0 ||
      hasComplexityTriggers;
    if (shouldTriggerSummary) {
      const triggerReason =
        existingConversation.attributes.metadata.totalMessages % 5 === 0
          ? "message_count"
          : "complexity";
      console.info("🔄 Conversation summary trigger detected:", {
        conversationId,
        totalMessages: existingConversation.attributes.metadata.totalMessages,
        triggeredBy: triggerReason,
        complexityDetected: hasComplexityTriggers,
      });

      // Trigger async conversation summary generation
      try {
        const summaryFunction =
          process.env.BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME;
        if (!summaryFunction) {
          console.warn(
            "⚠️ BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME environment variable not set"
          );
        } else {
          await invokeAsyncLambda(
            summaryFunction,
            {
              userId,
              coachId,
              conversationId,
              triggerReason,
              messageCount:
                existingConversation.attributes.metadata.totalMessages,
              complexityIndicators: hasComplexityTriggers
                ? ["complexity_detected"]
                : undefined,
            },
            "conversation summary generation"
          );
        }
      } catch (error) {
        console.error(
          "❌ Failed to trigger conversation summary generation, but continuing conversation:",
          error
        );
        // Don't throw - we want the conversation to continue even if summary generation fails
      }
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
    const workoutResult = await detectAndProcessWorkout(
      userResponse,
      userId,
      coachId,
      conversationId,
      coachConfig,
      conversationContext
    );

    // Process user memories (retrieve existing, detect and save new ones)
    const memoryResult = await processUserMemories(
      userId,
      coachId,
      userResponse,
      conversationId,
      existingMessages
    );

    // Generate AI response with all context
    const responseResult = await generateAIResponse(
      coachConfig,
      context,
      workoutResult,
      memoryResult,
      userResponse,
      existingMessages,
      conversationContext,
      userId,
      coachId,
      conversationId
    );

    let aiResponseContent = responseResult.aiResponseContent;
    const promptMetadata = responseResult.promptMetadata;

    // Add memory feedback if a memory was saved
    if (memoryResult.memoryFeedback) {
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

    await sendCoachConversationMessage(
      userId,
      coachId,
      conversationId,
      updatedMessages
    );

    return createSuccessResponse(
      {
        userResponse: newUserMessage,
        aiResponse: newAiMessage,
        conversationId,
        pineconeContext: {
          used: context.pineconeMatches.length > 0,
          matches: context.pineconeMatches.length,
          contextLength: context.pineconeContext.length,
        },
      },
      "Conversation updated successfully"
    );
  } catch (error) {
    console.error("Error updating coach conversation:", error);
    return createErrorResponse(500, "Internal server error");
  }
};
