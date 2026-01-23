import {
  loadFromDynamoDB,
  saveToDynamoDB,
  saveToDynamoDBWithResult,
  queryFromDynamoDB,
  deleteFromDynamoDB,
  createDynamoDBItem,
  deepMerge,
  DynamoDBSaveResult,
} from "./core";
import {
  CoachConversation,
  CoachConversationListItem,
  CoachMessage,
  CoachConversationSummary,
} from "../functions/libs/coach-conversation/types";

// ===========================
// COACH CONVERSATION INTERFACES
// ===========================

/**
 * Interface for conversation message save result
 */
export interface ConversationSaveResult {
  success: boolean;
  conversationId: string;
  previousMessageCount: number;
  newMessageCount: number;
  messagesAdded: number;
  lastMessageId?: string;
  dynamodbResult: DynamoDBSaveResult;
  errorDetails?: {
    stage: "loading" | "validation" | "saving";
    message: string;
  };
}

// ===========================
// COACH CONVERSATION OPERATIONS
// ===========================

/**
 * Save a coach conversation
 */
export async function saveCoachConversation(
  conversation: CoachConversation,
): Promise<void> {
  const item = createDynamoDBItem<CoachConversation>(
    "coachConversation",
    `user#${conversation.userId}`,
    `coachConversation#${conversation.coachId}#${conversation.conversationId}`,
    conversation,
    new Date().toISOString(),
  );

  await saveToDynamoDB(item);
}

/**
 * Load a specific coach conversation
 */
export async function getCoachConversation(
  userId: string,
  coachId: string,
  conversationId: string,
): Promise<CoachConversation | null> {
  const item = await loadFromDynamoDB<CoachConversation>(
    `user#${userId}`,
    `coachConversation#${coachId}#${conversationId}`,
    "coachConversation",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Load conversation summaries for a user and specific coach (optimized - excludes messages)
 */
export async function queryCoachConversations(
  userId: string,
  coachId: string,
  options?: { includeFirstMessages?: boolean },
): Promise<CoachConversationListItem[]> {
  try {
    // Use the generic query function to get all coach conversations for the user + coach
    const items = await queryFromDynamoDB<any>(
      `user#${userId}`,
      `coachConversation#${coachId}#`,
      "coachConversation",
    );

    // Extract attributes and optionally include first messages
    return items.map((item) => {
      const { messages, ...summaryAttributes } = item.attributes;

      // If includeFirstMessages is true, extract first user and AI messages
      if (
        options?.includeFirstMessages &&
        messages &&
        Array.isArray(messages)
      ) {
        const firstUserMessage = messages.find((m: any) => m.role === "user");
        const firstAiMessage = messages.find(
          (m: any) => m.role === "assistant",
        );

        // Truncate messages to first 250 characters
        const truncateMessage = (content: string | undefined) => {
          if (!content) return undefined;
          return content.length > 250
            ? content.substring(0, 250) + "..."
            : content;
        };

        return {
          ...summaryAttributes,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          firstUserMessage: truncateMessage(firstUserMessage?.content),
          firstAiMessage: truncateMessage(firstAiMessage?.content),
        };
      }

      // Default behavior: exclude all messages
      return {
        ...summaryAttributes,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      };
    });
  } catch (error) {
    console.error(
      `Error loading coach conversations for user ${userId}, coach ${coachId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Load all conversations with full messages (for individual conversation access)
 */
export async function queryCoachConversationsWithMessages(
  userId: string,
  coachId: string,
): Promise<CoachConversation[]> {
  const items = await queryFromDynamoDB<CoachConversation>(
    `user#${userId}`,
    `coachConversation#${coachId}#`,
    "coachConversation",
  );
  return items.map((item) => ({
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }));
}

/**
 * Send a message to a coach conversation
 */
export async function sendCoachConversationMessage(
  userId: string,
  coachId: string,
  conversationId: string,
  messages: CoachMessage[],
): Promise<ConversationSaveResult> {
  let existingItem;

  try {
    // Load the full DynamoDB item (needed for pk/sk/timestamps)
    existingItem = await loadFromDynamoDB<CoachConversation>(
      `user#${userId}`,
      `coachConversation#${coachId}#${conversationId}`,
      "coachConversation",
    );

    if (!existingItem) {
      const errorResult: ConversationSaveResult = {
        success: false,
        conversationId,
        previousMessageCount: 0,
        newMessageCount: messages.length,
        messagesAdded: 0,
        dynamodbResult: {
          success: false,
          itemSizeKB: "unknown",
          errorDetails: {
            message: `Conversation not found: ${conversationId}`,
            name: "ConversationNotFound",
            code: "CONVERSATION_NOT_FOUND",
          },
        },
        errorDetails: {
          stage: "loading",
          message: `Conversation not found: ${conversationId}`,
        },
      };

      console.error("❌ Conversation not found:", errorResult);
      throw new Error(`Conversation not found: ${conversationId}`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Conversation not found")
    ) {
      throw error; // Re-throw conversation not found errors
    }

    const errorResult: ConversationSaveResult = {
      success: false,
      conversationId,
      previousMessageCount: 0,
      newMessageCount: messages.length,
      messagesAdded: 0,
      dynamodbResult: {
        success: false,
        itemSizeKB: "unknown",
        errorDetails: {
          message: error instanceof Error ? error.message : "Unknown error",
          name: error instanceof Error ? error.name : "Unknown",
          code: "LOADING_ERROR",
        },
      },
      errorDetails: {
        stage: "loading",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error loading conversation",
      },
    };

    console.error("❌ Error loading conversation:", errorResult);
    throw error;
  }

  // Update the conversation with new messages and metadata
  const existingMessages = existingItem.attributes.messages || [];
  const updatedConversation: CoachConversation = {
    ...existingItem.attributes,
    messages: [...existingMessages, ...messages],
    metadata: {
      ...existingItem.attributes.metadata,
      lastActivity: new Date(),
      totalMessages: existingMessages.length + messages.length,
    },
  };

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingItem,
    attributes: updatedConversation,
    updatedAt: new Date().toISOString(),
  };

  const previousMessageCount = existingItem.attributes.messages?.length || 0;
  const messagesAdded = messages.length;

  let saveResult: DynamoDBSaveResult;

  try {
    saveResult = await saveToDynamoDBWithResult(updatedItem);

    // Verify the save was actually successful
    if (!saveResult.success) {
      const errorResult: ConversationSaveResult = {
        success: false,
        conversationId,
        previousMessageCount,
        newMessageCount: messages.length,
        messagesAdded,
        dynamodbResult: saveResult,
        errorDetails: {
          stage: "saving",
          message: `DynamoDB save failed: ${saveResult.errorDetails?.message || "Unknown error"}`,
        },
      };

      console.error("❌ DynamoDB save failed:", errorResult);
      throw new Error(
        `DynamoDB save failed: ${saveResult.errorDetails?.message || "Unknown error"}`,
      );
    }
  } catch (error) {
    const errorResult: ConversationSaveResult = {
      success: false,
      conversationId,
      previousMessageCount,
      newMessageCount: messages.length,
      messagesAdded,
      dynamodbResult: {
        success: false,
        itemSizeKB: "unknown",
        errorDetails: {
          message: error instanceof Error ? error.message : "Unknown error",
          name: error instanceof Error ? error.name : "Unknown",
          code: "SAVE_ERROR",
        },
      },
      errorDetails: {
        stage: "saving",
        message:
          error instanceof Error ? error.message : "Unknown error during save",
      },
    };

    console.error("❌ Error during conversation save:", errorResult);
    throw error;
  }

  // Create successful result
  const result: ConversationSaveResult = {
    success: true,
    conversationId,
    previousMessageCount,
    newMessageCount: messages.length,
    messagesAdded,
    lastMessageId: updatedItem.attributes.messages?.slice(-1)?.[0]?.id,
    dynamodbResult: saveResult,
  };

  return result;
}

/**
 * Update conversation metadata (title, tags, isActive)
 */
export async function updateCoachConversation(
  userId: string,
  coachId: string,
  conversationId: string,
  updateData: { title?: string; tags?: string[]; isActive?: boolean },
): Promise<CoachConversation> {
  // Load the full DynamoDB item (needed for pk/sk/timestamps)
  const existingItem = await loadFromDynamoDB<CoachConversation>(
    `user#${userId}`,
    `coachConversation#${coachId}#${conversationId}`,
    "coachConversation",
  );

  if (!existingItem) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  // Prepare update with lastActivity timestamp
  // Only title goes at top level; tags and isActive belong in metadata
  const updates = {
    ...(updateData.title !== undefined && { title: updateData.title }),
    metadata: {
      ...(updateData.tags !== undefined && { tags: updateData.tags }),
      ...(updateData.isActive !== undefined && {
        isActive: updateData.isActive,
      }),
      lastActivity: new Date(),
    },
  };

  // Deep merge to preserve nested properties
  const updatedConversation: CoachConversation = deepMerge(
    existingItem.attributes,
    updates,
  );

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingItem,
    attributes: updatedConversation,
    updatedAt: new Date().toISOString(),
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  return updatedConversation;
}

/**
 * Delete a coach conversation
 */
export async function deleteCoachConversation(
  userId: string,
  conversationId: string,
): Promise<void> {
  // Since we don't know the coachId, we need to query for conversations and find the matching one
  const allConversations = await queryFromDynamoDB<any>(
    `user#${userId}`,
    "coachConversation#",
    "coachConversation",
  );

  const targetConversation = allConversations.find((conv) =>
    conv.sk.endsWith(`#${conversationId}`),
  );

  if (!targetConversation) {
    throw new Error(
      `Conversation ${conversationId} not found for user ${userId}`,
    );
  }

  try {
    await deleteFromDynamoDB(
      targetConversation.pk,
      targetConversation.sk,
      "coachConversation",
    );
    console.info("Coach conversation deleted successfully:", {
      conversationId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error(
        `Conversation ${conversationId} not found for user ${userId}`,
      );
    }
    throw error;
  }
}

// ===========================
// CONVERSATION SUMMARY OPERATIONS
// ===========================

/**
 * Save a coach conversation summary
 */
export async function saveCoachConversationSummary(
  summary: CoachConversationSummary,
): Promise<void> {
  const item = createDynamoDBItem<CoachConversationSummary>(
    "conversationSummary",
    `user#${summary.userId}`,
    `conversation#${summary.conversationId}#summary`,
    summary,
    new Date().toISOString(),
  );

  await saveToDynamoDB(item);

  console.info("Conversation summary saved successfully:", {
    summaryId: summary.summaryId,
    userId: summary.userId,
    conversationId: summary.conversationId,
    confidence: summary.metadata.confidence,
    messageCount: summary.metadata.messageRange.totalMessages,
    triggerReason: summary.metadata.triggerReason,
  });
}

/**
 * Get a coach conversation summary
 */
export async function getCoachConversationSummary(
  userId: string,
  conversationId: string,
): Promise<CoachConversationSummary | null> {
  const item = await loadFromDynamoDB<CoachConversationSummary>(
    `user#${userId}`,
    `conversation#${conversationId}#summary`,
    "conversationSummary",
  );
  return item?.attributes ?? null;
}

/**
 * Count conversations and total messages for a user and coach
 */
export async function queryConversationsCount(
  userId: string,
  coachId: string,
): Promise<{ totalCount: number; totalMessages: number }> {
  try {
    // Get all conversations for the user and coach
    const allConversations = await queryFromDynamoDB<CoachConversationListItem>(
      `user#${userId}`,
      `coachConversation#${coachId}#`,
      "coachConversation",
    );

    const totalCount = allConversations.length;
    const totalMessages = allConversations.reduce((sum, conversation) => {
      return sum + (conversation.attributes.metadata?.totalMessages || 0);
    }, 0);

    console.info("Conversations counted successfully:", {
      userId,
      coachId,
      totalFound: totalCount,
      totalMessages,
    });

    return { totalCount, totalMessages };
  } catch (error) {
    console.error(
      `Error counting conversations for user ${userId} and coach ${coachId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Query coach conversation summaries for a user
 */
export async function queryCoachConversationSummaries(
  userId: string,
  coachId?: string,
): Promise<CoachConversationSummary[]> {
  try {
    // Query all conversation summaries for the user
    const itemsWithDb = await queryFromDynamoDB<CoachConversationSummary>(
      `user#${userId}`,
      "conversation#",
      "conversationSummary",
    );

    // Extract attributes
    const items = itemsWithDb.map((item) => item.attributes);

    // Filter by coach if specified
    const filteredItems = coachId
      ? items.filter((item) => item.coachId === coachId)
      : items;

    console.info("Conversation summaries queried successfully:", {
      userId,
      coachId: coachId || "all",
      totalFound: filteredItems.length,
    });

    return filteredItems;
  } catch (error) {
    console.error(
      `Error querying conversation summaries for user ${userId}:`,
      error,
    );
    throw error;
  }
}
