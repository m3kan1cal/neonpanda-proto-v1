import {
  createCreatedResponse,
  createErrorResponse,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import {
  saveCoachConversation,
  getCoachConfig,
  saveCoachConfig,
} from "../../dynamodb/operations";
import { CoachConversation } from "../libs/coach-conversation/types";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

    if (!coachId) {
      return createErrorResponse(400, "coachId is required");
    }

    if (!event.body) {
      return createErrorResponse(400, "Request body is required");
    }

    const body = JSON.parse(event.body);
    const { title, initialMessage } = body;

    // Generate unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new conversation
    const newConversation: CoachConversation = {
      conversationId,
      coachId,
      userId,
      title: title || "New Conversation",
      messages: [],
      metadata: {
        startedAt: new Date(),
        lastActivity: new Date(),
        totalMessages: 0,
        isActive: true,
        tags: [],
      },
    };

    await saveCoachConversation(newConversation);

    // If there's an initial message, send it after creating the conversation
    if (initialMessage && initialMessage.trim()) {
      try {
        console.info("Sending initial message to conversation:", {
          conversationId,
          messageLength: initialMessage.trim().length,
        });

        // Invoke the send-coach-conversation-message lambda asynchronously
        const sendMessageFunctionName =
          process.env.SEND_COACH_CONVERSATION_MESSAGE_FUNCTION_NAME;
        if (sendMessageFunctionName) {
          const sendMessagePayload = {
            pathParameters: { userId, coachId, conversationId },
            body: JSON.stringify({
              userResponse: initialMessage.trim(),
              messageTimestamp: new Date().toISOString()
            }),
          };

          // Trigger async processing of initial message (fire-and-forget)
          // The conversation is created immediately and the message processes in the background
          await invokeAsyncLambda(
            sendMessageFunctionName,
            sendMessagePayload,
            "initial message processing"
          );
          console.info("Initial message triggered for async processing");
        } else {
          console.warn(
            "SEND_COACH_CONVERSATION_MESSAGE_FUNCTION_NAME not configured - skipping initial message"
          );
        }
      } catch (error) {
        console.error("Failed to send initial message:", error);
        // Don't fail the whole conversation creation if initial message fails
        // The conversation is created, user can manually send the message
      }
    }

    // Update coach config conversation count
    try {
      const coachConfig = await getCoachConfig(userId, coachId);
      if (coachConfig) {
        const updated = {
          ...coachConfig.attributes,
          metadata: {
            ...coachConfig.attributes.metadata,
            total_conversations:
              (coachConfig.attributes.metadata.total_conversations || 0) + 1,
          },
        };
        await saveCoachConfig(userId, updated);
      }
    } catch (error) {
      console.error("Failed to update conversation count:", error);
      // Don't fail the request - conversation was created successfully
    }

    return createCreatedResponse(
      {
        conversation: newConversation,
      },
      "Coach conversation created successfully"
    );
};

export const handler = withAuth(baseHandler);
