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
  deepMerge,
} from "./core";
import { UserMemory } from "../functions/libs/memory/types";
import { calculateDecayScore } from "../functions/libs/memory/lifecycle";
import { logger } from "../functions/libs/logger";

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
  logger.info("Memory saved successfully:", {
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

  // Filter out archived memories by default
  filteredItems = filteredItems.filter(
    (memory) => memory.metadata.lifecycle?.state !== "archived",
  );

  // Sort by importance, decay-based recency, and usage with balanced scoring
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

      // Decay-based recency score (replaces flat 30-day window)
      // Uses DSR model: memories reinforced often decay slower
      // Falls back to flat scoring for memories without lifecycle data
      const recencyScore = calculateDecayScore(memory); // 0-30 range

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

  logger.info("Memories queried successfully:", {
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
        "SET #attrs.#metadata.#usageCount = if_not_exists(#attrs.#metadata.#usageCount, :zero) + :inc, #attrs.#metadata.#lastUsed = :now, updatedAt = :now",
      ExpressionAttributeNames: {
        "#attrs": "attributes",
        "#metadata": "metadata",
        "#usageCount": "usageCount",
        "#lastUsed": "lastUsed",
      },
      ExpressionAttributeValues: {
        ":inc": 1,
        ":zero": 0,
        ":now": new Date().toISOString(),
      },
      // Ensure item exists before incrementing to prevent corrupted partial items
      ConditionExpression: "attribute_exists(pk)",
      ReturnValues: "UPDATED_NEW",
    });

    const result = await docClient.send(command);
    const newUsageCount =
      (result.Attributes?.attributes?.metadata?.usageCount as number) || 0;

    return newUsageCount;
  }, operationName);
}

/**
 * Update a memory's fields and/or usage statistics.
 *
 * Mirrors the updateWorkout pattern: loads the existing item, deep-merges
 * any field updates, and saves back with requireExists. When usageContext is
 * provided it additionally:
 *   - Atomically increments the usage count (thread-safe DynamoDB ADD)
 *   - Computes and merges enriched tags based on the new count and context
 *
 * Pinecone sync is the caller's responsibility (handler layer), consistent
 * with all other DynamoDB operations in this codebase.
 */
export async function updateMemory(
  userId: string,
  memoryId: string,
  updates: Partial<UserMemory>,
  usageContext?: {
    userMessage?: string;
    messageContext?: string;
    contextTypes?: string[];
    retrievalMethod?: "semantic" | "importance" | "hybrid";
    conversationId?: string;
  },
): Promise<UserMemory> {
  const existingItem = await loadFromDynamoDB<UserMemory>(
    `user#${userId}`,
    `userMemory#${memoryId}`,
    "userMemory",
  );

  if (!existingItem) {
    throw new Error(`Memory ${memoryId} not found for user ${userId}`);
  }

  let tagUpdates: Omit<Partial<UserMemory>, "metadata"> & {
    metadata?: Partial<UserMemory["metadata"]>;
  } = {};

  if (usageContext) {
    // Atomically increment usage count — separate DynamoDB ADD to prevent race conditions
    const newUsageCount = await incrementMemoryUsage(memoryId, userId);

    const currentTags = existingItem.attributes.metadata?.tags || [];
    const newTags = [...currentTags];

    if (newUsageCount >= 5 && !newTags.includes("frequently_used")) {
      newTags.push("frequently_used");
    }
    if (newUsageCount >= 10 && !newTags.includes("highly_accessed")) {
      newTags.push("highly_accessed");
    }
    if (newUsageCount >= 20 && !newTags.includes("critical_memory")) {
      newTags.push("critical_memory");
    }

    usageContext.contextTypes?.forEach((contextType) => {
      if (!newTags.includes(contextType)) newTags.push(contextType);
    });

    if (usageContext.retrievalMethod) {
      const methodTag = `${usageContext.retrievalMethod}_retrieved`;
      if (!newTags.includes(methodTag)) newTags.push(methodTag);
    }

    if (!newTags.includes("recently_accessed")) {
      newTags.push("recently_accessed");
    }

    // Partial metadata is merged with existingItem.attributes below; full shape comes from there
    tagUpdates = {
      metadata: {
        usageCount: newUsageCount,
        tags: newTags.slice(0, 10),
      },
    } as Partial<UserMemory>;
  }

  const updatedMemory: UserMemory = {
    ...deepMerge(existingItem.attributes, deepMerge(updates, tagUpdates)),
    // Preserve immutable fields
    memoryId: existingItem.attributes.memoryId,
    userId: existingItem.attributes.userId,
  };

  const updatedItem = {
    ...existingItem,
    attributes: updatedMemory,
    updatedAt: new Date().toISOString(),
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  logger.info("Memory updated successfully:", {
    memoryId,
    userId,
    updatedFields: Object.keys({ ...updates, ...tagUpdates }),
    hasUsageContext: !!usageContext,
  });

  return updatedMemory;
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
    logger.info("Memory deleted successfully:", {
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
