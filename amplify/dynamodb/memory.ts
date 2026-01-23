import {
  docClient,
  loadFromDynamoDB,
  saveToDynamoDB,
  queryFromDynamoDB,
  deleteFromDynamoDB,
  createDynamoDBItem,
  withThroughputScaling,
  getTableName,
  UpdateCommand,
} from "./core";
import { UserMemory } from "../functions/libs/memory/types";

// ===========================
// MEMORY OPERATIONS
// ===========================

/**
 * Save a memory to DynamoDB
 */
export async function saveMemory(memory: UserMemory): Promise<void> {
  const timestamp = new Date().toISOString();

  // Convert undefined coachId to null for DynamoDB compatibility
  const cleanedMemory = { ...memory };
  if (cleanedMemory.coachId === undefined) {
    cleanedMemory.coachId = null;
  }

  const item = createDynamoDBItem<UserMemory>(
    "userMemory",
    `user#${memory.userId}`,
    `userMemory#${memory.memoryId}`,
    cleanedMemory,
    timestamp,
  );

  await saveToDynamoDB(item);
  console.info("Memory saved successfully:", {
    memoryId: memory.memoryId,
    userId: memory.userId,
    coachId: memory.coachId,
    type: memory.memoryType,
  });
}

/**
 * Query memories for a specific user and optionally coach
 */
export async function queryMemories(
  userId: string,
  coachId?: string,
  options?: {
    memoryType?: UserMemory["memoryType"];
    importance?: UserMemory["metadata"]["importance"];
    limit?: number;
  },
): Promise<UserMemory[]> {
  const items = await queryFromDynamoDB<UserMemory>(
    `user#${userId}`,
    "userMemory#",
    "userMemory",
  );

  let filteredItems = items.map((item) => item.attributes);

  // Filter by coach if specified
  if (coachId) {
    filteredItems = filteredItems.filter(
      (memory) =>
        memory.coachId === coachId ||
        !memory.coachId ||
        memory.coachId === null, // Include global memories
    );
  }

  // Filter by memory type if specified
  if (options?.memoryType) {
    filteredItems = filteredItems.filter(
      (memory) => memory.memoryType === options.memoryType,
    );
  }

  // Filter by importance if specified
  if (options?.importance) {
    filteredItems = filteredItems.filter(
      (memory) => memory.metadata.importance === options.importance,
    );
  }

  // Sort by importance, recency, and usage with balanced scoring
  filteredItems.sort((a, b) => {
    // Calculate composite scores for balanced ranking
    const getCompositeScore = (memory: UserMemory) => {
      // Importance score (high=3, medium=2, low=1)
      const importanceOrder: Record<
        UserMemory["metadata"]["importance"],
        number
      > = {
        high: 3,
        medium: 2,
        low: 1,
      };
      const importanceScore = importanceOrder[memory.metadata.importance] * 100; // Weight: 100

      // Recency score (newer memories get higher scores)
      const now = new Date().getTime();
      const createdAt = new Date(memory.metadata.createdAt).getTime();
      const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 30 - daysSinceCreated); // Weight: 30 (memories older than 30 days get 0)

      // Usage score (capped to prevent overwhelming recency)
      const usageScore = Math.min(memory.metadata.usageCount * 2, 20); // Weight: 2 per use, max 20

      return importanceScore + recencyScore + usageScore;
    };

    const scoreA = getCompositeScore(a);
    const scoreB = getCompositeScore(b);

    // Sort by composite score (highest first)
    if (scoreB !== scoreA) return scoreB - scoreA;

    // Tie-breaker: newest first
    return (
      new Date(b.metadata.createdAt).getTime() -
      new Date(a.metadata.createdAt).getTime()
    );
  });

  // Apply limit if specified
  if (options?.limit) {
    filteredItems = filteredItems.slice(0, options.limit);
  }

  console.info("Memories queried successfully:", {
    userId,
    coachId: coachId || "all",
    totalFound: filteredItems.length,
    filtered: {
      memoryType: options?.memoryType,
      importance: options?.importance,
      limit: options?.limit,
    },
  });

  return filteredItems;
}

/**
 * Atomically increment memory usage count
 * Uses DynamoDB atomic ADD operation to prevent race conditions
 *
 * @param memoryId - The memory ID
 * @param userId - The user ID
 * @returns The updated usage count
 */
async function incrementMemoryUsage(
  memoryId: string,
  userId: string,
): Promise<number> {
  const tableName = getTableName();
  const operationName = `Increment memory usage for ${memoryId}`;

  return withThroughputScaling(async () => {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        pk: `user#${userId}`,
        sk: `userMemory#${memoryId}`,
      },
      UpdateExpression:
        "SET #metadata.#usageCount = if_not_exists(#metadata.#usageCount, :zero) + :inc, #metadata.#lastUsed = :now, updatedAt = :now",
      ExpressionAttributeNames: {
        "#metadata": "metadata",
        "#usageCount": "usageCount",
        "#lastUsed": "lastUsed",
      },
      ExpressionAttributeValues: {
        ":inc": 1,
        ":zero": 0,
        ":now": new Date().toISOString(),
      },
      ReturnValues: "UPDATED_NEW",
    });

    const result = await docClient.send(command);
    const newUsageCount =
      (result.Attributes?.metadata?.usageCount as number) || 0;

    return newUsageCount;
  }, operationName);
}

/**
 * Update usage statistics for a memory with enhanced tagging
 */
export async function updateMemory(
  memoryId: string,
  userId: string,
  usageContext?: {
    userMessage?: string;
    messageContext?: string;
    contextTypes?: string[];
    retrievalMethod?: "semantic" | "importance" | "hybrid";
    conversationId?: string;
  },
): Promise<void> {
  // Atomically increment usage count (thread-safe, efficient)
  const newUsageCount = await incrementMemoryUsage(memoryId, userId);

  // Load memory for tag updates (only if context provided)
  if (!usageContext) {
    // No tag updates needed - we're done
    console.info("Memory usage count updated:", {
      memoryId,
      userId,
      newUsageCount,
    });
    return;
  }

  const memory = await loadFromDynamoDB<UserMemory>(
    `user#${userId}`,
    `userMemory#${memoryId}`,
    "userMemory",
  );

  if (!memory) {
    console.warn(`Memory ${memoryId} not found for user ${userId}`);
    return;
  }

  // Enhanced tagging based on usage context
  const currentTags = memory.attributes.metadata.tags || [];
  const newTags = [...currentTags];

  // Add usage-based tags (using the updated count from atomic increment)
  if (newUsageCount >= 5) {
    if (!newTags.includes("frequently_used")) {
      newTags.push("frequently_used");
    }
  }

  if (newUsageCount >= 10) {
    if (!newTags.includes("highly_accessed")) {
      newTags.push("highly_accessed");
    }
  }

  if (newUsageCount >= 20) {
    if (!newTags.includes("critical_memory")) {
      newTags.push("critical_memory");
    }
  }

  // Add context-based tags from usage context
  if (usageContext?.contextTypes) {
    usageContext.contextTypes.forEach((contextType) => {
      if (!newTags.includes(contextType)) {
        newTags.push(contextType);
      }
    });
  }

  // Add retrieval method tags
  if (usageContext?.retrievalMethod) {
    const methodTag = `${usageContext.retrievalMethod}_retrieved`;
    if (!newTags.includes(methodTag)) {
      newTags.push(methodTag);
    }
  }

  // Add recency tag (memory was just accessed)
  if (!newTags.includes("recently_accessed")) {
    newTags.push("recently_accessed");
  }

  // Limit tags to prevent bloat (max 10 tags)
  memory.attributes.metadata.tags = newTags.slice(0, 10);
  memory.updatedAt = new Date().toISOString();

  // Update DynamoDB with new tags
  await saveToDynamoDB(memory, true /* requireExists */);

  // Update Pinecone with new tags if usage context provided
  if (usageContext) {
    try {
      // Import the Pinecone function dynamically to avoid circular dependencies
      const { storeMemoryInPinecone } =
        await import("../functions/libs/user/pinecone");
      await storeMemoryInPinecone(memory.attributes);
      console.info("Memory updated in Pinecone with enhanced tags:", {
        memoryId,
        userId,
        tagCount: memory.attributes.metadata.tags.length,
      });
    } catch (error) {
      console.warn("Failed to update memory in Pinecone:", error);
    }
  }

  console.info("Memory usage updated with enhanced tags:", {
    memoryId,
    userId,
    newUsageCount,
    tagCount: memory.attributes.metadata.tags.length,
    newTags: memory.attributes.metadata.tags,
    usageContext: usageContext
      ? {
          hasUserMessage: !!usageContext.userMessage,
          contextTypes: usageContext.contextTypes,
          retrievalMethod: usageContext.retrievalMethod,
        }
      : null,
  });
}

/**
 * Delete a memory from DynamoDB
 */
export async function deleteMemory(
  userId: string,
  memoryId: string,
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `userMemory#${memoryId}`,
      "userMemory",
    );
    console.info("Memory deleted successfully:", {
      memoryId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error(`Memory ${memoryId} not found for user ${userId}`);
    }
    throw error;
  }
}
