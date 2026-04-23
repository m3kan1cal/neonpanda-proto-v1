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
  QueryCommand,
  deepMerge,
} from "./core";
import { UserMemory } from "../functions/libs/memory/types";
import {
  EmotionalSnapshot,
  EmotionalTrend,
} from "../functions/libs/memory/emotional-types";
import { calculateDecayScore } from "../functions/libs/memory/lifecycle";
import { logger } from "../functions/libs/logger";
import { applyPaginationSlice } from "../functions/libs/pagination";

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

export interface QueryMemoriesOptions {
  memoryType?: UserMemory["memoryType"];
  importance?: UserMemory["metadata"]["importance"];
  limit?: number;
  offset?: number;
}

export interface QueryMemoriesPaginatedResult {
  items: UserMemory[];
  totalCount: number;
}

/**
 * Filter and sort memories without applying pagination slicing. Exposed so
 * `queryMemories` (legacy, returns full list) and `queryMemoriesPaginated`
 * (new, returns paginated + totalCount) can share a single source of truth
 * for filtering + ordering. Keeps the composite-score sort used for ranking
 * but adds a deterministic secondary sort on `memoryId` so offset-based
 * pagination slices are stable across requests even when recency/usage
 * scores drift between calls.
 */
async function filterAndSortMemories(
  userId: string,
  coachId?: string,
  options: Pick<QueryMemoriesOptions, "memoryType" | "importance"> = {},
): Promise<UserMemory[]> {
  const items = await queryFromDynamoDB<UserMemory>(
    `user#${userId}`,
    "userMemory#",
    "userMemory",
  );

  let filteredItems = items.map((item) => item.attributes);

  if (coachId) {
    filteredItems = filteredItems.filter(
      (memory) =>
        memory.coachId === coachId ||
        !memory.coachId ||
        memory.coachId === null,
    );
  }

  if (options.memoryType) {
    filteredItems = filteredItems.filter(
      (memory) => memory.memoryType === options.memoryType,
    );
  }

  if (options.importance) {
    filteredItems = filteredItems.filter(
      (memory) => memory.metadata.importance === options.importance,
    );
  }

  filteredItems = filteredItems.filter(
    (memory) => memory.metadata.lifecycle?.state !== "archived",
  );

  filteredItems.sort((a, b) => {
    const getCompositeScore = (memory: UserMemory) => {
      const importanceOrder: Record<
        UserMemory["metadata"]["importance"],
        number
      > = {
        high: 3,
        medium: 2,
        low: 1,
      };
      const importanceScore = importanceOrder[memory.metadata.importance] * 100;
      const recencyScore = calculateDecayScore(memory);
      const usageScore = Math.min(memory.metadata.usageCount * 2, 20);
      return importanceScore + recencyScore + usageScore;
    };

    const scoreA = getCompositeScore(a);
    const scoreB = getCompositeScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;

    const createdDiff =
      new Date(b.metadata.createdAt).getTime() -
      new Date(a.metadata.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;

    // Secondary sort on memoryId so offset-based pagination slices are
    // deterministic even when composite score + createdAt tie.
    return a.memoryId.localeCompare(b.memoryId);
  });

  return filteredItems;
}

/**
 * Query memories with pagination metadata. Returns the slice of `items` for
 * the requested page plus the full pre-slice `totalCount` so UIs can drive a
 * Load more control without issuing a separate count call.
 */
export async function queryMemoriesPaginated(
  userId: string,
  coachId?: string,
  options: QueryMemoriesOptions = {},
): Promise<QueryMemoriesPaginatedResult> {
  const filtered = await filterAndSortMemories(userId, coachId, {
    memoryType: options.memoryType,
    importance: options.importance,
  });

  const totalCount = filtered.length;
  const items = applyPaginationSlice(filtered, options);

  logger.info("Memories queried successfully:", {
    userId,
    coachId: coachId || "all",
    totalCount,
    returned: items.length,
    filtered: {
      memoryType: options.memoryType,
      importance: options.importance,
      limit: options.limit,
      offset: options.offset,
    },
  });

  return { items, totalCount };
}

/**
 * Query memories for a specific user and optionally coach. Maintains the
 * legacy list-only signature for callers that have not migrated to the
 * paginated response shape.
 */
export async function queryMemories(
  userId: string,
  coachId?: string,
  options?: {
    memoryType?: UserMemory["memoryType"];
    importance?: UserMemory["metadata"]["importance"];
    limit?: number;
    offset?: number;
  },
): Promise<UserMemory[]> {
  const { items } = await queryMemoriesPaginated(userId, coachId, options);
  return items;
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

// ===========================
// EMOTIONAL SNAPSHOT OPERATIONS
// ===========================

/**
 * Save an emotional snapshot to DynamoDB
 */
export async function saveEmotionalSnapshot(
  snapshot: EmotionalSnapshot,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const item = createDynamoDBItem<EmotionalSnapshot>(
    "emotionalSnapshot",
    `user#${snapshot.userId}`,
    `emotionalSnapshot#${snapshot.snapshotId}`,
    snapshot,
    timestamp,
  );
  await saveToDynamoDB(item);
  logger.info("Emotional snapshot saved:", {
    snapshotId: snapshot.snapshotId,
    userId: snapshot.userId,
    coachId: snapshot.coachId,
  });
}

/**
 * Query emotional snapshots for a user.
 * Passing coachId filters to that coach's snapshots plus any global ones.
 * Pass undefined to load all snapshots across all coaches.
 */
export async function queryEmotionalSnapshots(
  userId: string,
  coachId?: string,
  options?: { limit?: number },
): Promise<EmotionalSnapshot[]> {
  const items = await queryFromDynamoDB<EmotionalSnapshot>(
    `user#${userId}`,
    "emotionalSnapshot#",
    "emotionalSnapshot",
  );

  let results = items.map((item) => item.attributes);

  if (coachId) {
    results = results.filter((s) => s.coachId === coachId || !s.coachId);
  }

  results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

// ===========================
// EMOTIONAL TREND OPERATIONS
// ===========================

/**
 * Save an emotional trend to DynamoDB
 */
export async function saveEmotionalTrend(
  trend: EmotionalTrend,
  userId: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const item = createDynamoDBItem<EmotionalTrend>(
    "emotionalTrend",
    `user#${userId}`,
    `emotionalTrend#${trend.period}#${trend.periodStart}`,
    trend,
    timestamp,
  );
  await saveToDynamoDB(item);
  logger.info("Emotional trend saved:", {
    userId,
    period: trend.period,
    periodStart: trend.periodStart,
  });
}

/**
 * Get the most recent emotional trend for a user by period
 */
export async function getLatestEmotionalTrend(
  userId: string,
  period: "weekly" | "monthly",
): Promise<EmotionalTrend | null> {
  const items = await queryFromDynamoDB<EmotionalTrend>(
    `user#${userId}`,
    `emotionalTrend#${period}#`,
    "emotionalTrend",
  );

  if (items.length === 0) return null;

  const sorted = items
    .map((item) => item.attributes)
    .sort(
      (a, b) =>
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
    );

  return sorted[0];
}

// ===========================
// BATCH / ADMIN OPERATIONS
// ===========================

/**
 * Query all distinct user partition keys that have at least one userMemory entity.
 * Used by the dispatch-memory-lifecycle coordinator to build the fan-out list.
 * Paginates through all results using LastEvaluatedKey.
 */
export async function queryAllUserMemoryPartitions(): Promise<string[]> {
  const tableName = getTableName();
  const pkSet = new Set<string>();
  let lastEvaluatedKey: any = undefined;

  do {
    const result = await withThroughputScaling(async () => {
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: "gsi3",
        KeyConditionExpression: "entityType = :entityType",
        ExpressionAttributeValues: { ":entityType": "userMemory" },
        ProjectionExpression: "pk",
        ExclusiveStartKey: lastEvaluatedKey,
      });
      return docClient.send(command);
    }, "Query user memory partitions via GSI3");

    for (const item of result.Items || []) {
      if (item.pk) pkSet.add(item.pk as string);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  logger.info("User memory partitions queried:", { totalUsers: pkSet.size });
  return Array.from(pkSet);
}
