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
import { CoachConversation, CONVERSATION_MODES } from "../libs/coach-conversation/types";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { logger } from "../libs/logger";

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
    const { title, initialMessage, mode } = body;

    // Validate mode if provided (artifact-focused: PROGRAM_DESIGN creates program, CHAT is default)
    const conversationMode = mode === CONVERSATION_MODES.PROGRAM_DESIGN ? CONVERSATION_MODES.PROGRAM_DESIGN : CONVERSATION_MODES.CHAT;

    // Generate unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new conversation
    const newConversation: CoachConversation = {
      conversationId,
      coachId,
      userId,
      title: title || (conversationMode === CONVERSATION_MODES.PROGRAM_DESIGN ? "New Training Program" : "New Conversation"),
      mode: conversationMode,
      messages: [],
      metadata: {
        startedAt: new Date(),
        lastActivity: new Date(),
        totalMessages: 0,
        isActive: true,
        tags: conversationMode === CONVERSATION_MODES.PROGRAM_DESIGN ? ['program_design'] : [],
      },
    };

    await saveCoachConversation(newConversation);

    // If there's an initial message, send it after creating the conversation
    if (initialMessage && initialMessage.trim()) {
      try {
        logger.info("Sending initial message to conversation:", {
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
          logger.info("Initial message triggered for async processing");
        } else {
          logger.warn(
            "SEND_COACH_CONVERSATION_MESSAGE_FUNCTION_NAME not configured - skipping initial message"
          );
        }
      } catch (error) {
        logger.error("Failed to send initial message:", error);
        // Don't fail the whole conversation creation if initial message fails
        // The conversation is created, user can manually send the message
      }
    }

    // Update coach config conversation count
    try {
      const coachConfig = await getCoachConfig(userId, coachId);
      if (coachConfig) {
        const updated = {
          ...coachConfig,
          metadata: {
            ...coachConfig.metadata,
            total_conversations:
              (coachConfig.metadata.total_conversations || 0) + 1,
          },
        };
        await saveCoachConfig(userId, updated);
      }
    } catch (error) {
      logger.error("Failed to update conversation count:", error);
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
