import {
  docClient,
  loadFromDynamoDB,
  saveToDynamoDB,
  createDynamoDBItem,
  deserializeFromDynamoDB,
  withThroughputScaling,
  getTableName,
  QueryCommand,
  UpdateCommand,
  DynamoDBItem,
} from "./core";
import { SharedProgram } from "../functions/libs/shared-program/types";

// ===========================
// SHARED PROGRAM OPERATIONS
// ===========================

/**
 * Save a shared program to DynamoDB
 * Pattern: Follows saveProgram pattern
 */
export async function saveSharedProgram(
  sharedProgram: SharedProgram,
): Promise<void> {
  const item = createDynamoDBItem<SharedProgram>(
    "sharedProgram",
    `sharedProgram#${sharedProgram.sharedProgramId}`,
    "metadata",
    sharedProgram,
    new Date().toISOString(),
  );

  // Add GSI keys for efficient querying
  const itemWithGsi = {
    ...item,
    // GSI1: Query all shared programs by creator
    gsi1pk: `user#${sharedProgram.creatorUserId}`,
    gsi1sk: `sharedProgram#${sharedProgram.sharedProgramId}`,
    // GSI2: Direct lookup by originalProgramId for idempotency checks
    gsi2pk: `user#${sharedProgram.creatorUserId}`,
    gsi2sk: `originalProgram#${sharedProgram.originalProgramId}`,
  };

  await saveToDynamoDB(itemWithGsi);

  console.info("Shared program saved successfully:", {
    sharedProgramId: sharedProgram.sharedProgramId,
    creatorUserId: sharedProgram.creatorUserId,
    originalProgramId: sharedProgram.originalProgramId,
    programName: sharedProgram.programSnapshot.name,
  });
}

/**
 * Get a shared program by ID
 *
 * @param sharedProgramId - The shared program ID
 * @param includeInactive - If true, returns inactive programs. If false, filters them out. Default: false
 * @returns SharedProgram or null if not found (or inactive when includeInactive=false)
 */
export async function getSharedProgram(
  sharedProgramId: string,
  includeInactive: boolean = false,
): Promise<SharedProgram | null> {
  const item = await loadFromDynamoDB<SharedProgram>(
    `sharedProgram#${sharedProgramId}`,
    "metadata",
    "sharedProgram",
  );

  if (!item) {
    return null;
  }

  // Check if active before returning (unless includeInactive is true)
  if (!includeInactive && !item.attributes.isActive) {
    console.info("Shared program found but inactive:", { sharedProgramId });
    return null;
  }

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Get an active shared program by original program ID (for idempotency checks)
 *
 * Uses GSI2 for efficient lookup: gsi2pk = user#{userId}, gsi2sk = originalProgram#{originalProgramId}
 * Pattern: Direct lookup instead of query + filter for better performance
 *
 * @param userId - The creator's user ID
 * @param originalProgramId - The original program ID
 * @returns SharedProgram or null if not found or inactive
 */
export async function getSharedProgramByProgramId(
  userId: string,
  originalProgramId: string,
): Promise<SharedProgram | null> {
  const tableName = getTableName();
  const operationName = `Get shared program by originalProgramId for user ${userId}`;

  return withThroughputScaling(async () => {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :gsi2pk AND gsi2sk = :gsi2sk",
      FilterExpression: "#entityType = :entityType AND #isActive = :isActive",
      ExpressionAttributeNames: {
        "#entityType": "entityType",
        "#isActive": "isActive",
      },
      ExpressionAttributeValues: {
        ":gsi2pk": `user#${userId}`,
        ":gsi2sk": `originalProgram#${originalProgramId}`,
        ":entityType": "sharedProgram",
        ":isActive": true,
      },
      Limit: 1, // We only need one result
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as DynamoDBItem<SharedProgram>[];

    if (items.length === 0) {
      return null;
    }

    const item = deserializeFromDynamoDB(items[0]);
    return {
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
  }, operationName);
}

/**
 * Query all shared programs for a user
 * Pattern: Follows queryPrograms using gsi1 with pagination
 */
export async function querySharedPrograms(
  userId: string,
): Promise<SharedProgram[]> {
  const tableName = getTableName();
  const operationName = `Query shared programs for user ${userId}`;

  return withThroughputScaling(async () => {
    let allSharedProgramItems: DynamoDBItem<SharedProgram>[] = [];
    let lastEvaluatedKey: any = undefined;
    let pageCount = 0;

    // Paginate through all results
    do {
      pageCount++;
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: "gsi1",
        KeyConditionExpression:
          "gsi1pk = :gsi1pk AND begins_with(gsi1sk, :gsi1skPrefix)",
        FilterExpression: "#entityType = :entityType",
        ExpressionAttributeNames: {
          "#entityType": "entityType",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `user#${userId}`,
          ":gsi1skPrefix": "sharedProgram#",
          ":entityType": "sharedProgram",
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(command);
      const pageItems = (result.Items || []) as DynamoDBItem<SharedProgram>[];

      // Deserialize and add to collection
      allSharedProgramItems = allSharedProgramItems.concat(
        pageItems.map((item) => deserializeFromDynamoDB(item)),
      );

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Filter to only active shared programs and include timestamps
    const activePrograms = allSharedProgramItems
      .filter((item) => item.attributes.isActive)
      .map((item) => ({
        ...item.attributes,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));

    console.info("User shared programs queried successfully:", {
      userId,
      totalFound: allSharedProgramItems.length,
      activeCount: activePrograms.length,
      pagesRead: pageCount,
    });

    return activePrograms;
  }, operationName);
}

/**
 * Deactivate a shared program (soft delete)
 * Pattern: Follows update pattern with requireExists
 *
 * Note: This operation is idempotent - deactivating an already-inactive
 * program succeeds silently (no error).
 */
export async function deactivateSharedProgram(
  userId: string,
  sharedProgramId: string,
): Promise<void> {
  // 1. Load the shared program (including inactive programs)
  const sharedProgram = await getSharedProgram(sharedProgramId, true);

  // 2. Check if program exists at all
  if (!sharedProgram) {
    throw new Error(`Shared program not found: ${sharedProgramId}`);
  }

  // 3. Verify ownership
  if (sharedProgram.creatorUserId !== userId) {
    throw new Error("Unauthorized: You can only unshare your own programs");
  }

  // 4. If already inactive, return success (idempotent operation)
  if (!sharedProgram.isActive) {
    console.info("Shared program already inactive, no action needed:", {
      sharedProgramId,
      userId,
    });
    return;
  }

  // 5. Load full item for update (need to preserve DynamoDB metadata)
  const existingItem = await loadFromDynamoDB<SharedProgram>(
    `sharedProgram#${sharedProgramId}`,
    "metadata",
    "sharedProgram",
  );

  if (!existingItem) {
    throw new Error(`Shared program not found: ${sharedProgramId}`);
  }

  // 6. Update isActive to false
  const updatedItem = {
    ...existingItem,
    attributes: {
      ...existingItem.attributes,
      isActive: false,
    },
    updatedAt: new Date().toISOString(),
    // Preserve GSI keys
    gsi1pk: `user#${userId}`,
    gsi1sk: `sharedProgram#${sharedProgramId}`,
    gsi2pk: `user#${userId}`,
    gsi2sk: `originalProgram#${sharedProgram.originalProgramId}`,
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Shared program deactivated successfully:", {
    sharedProgramId,
    userId,
  });
}

// ===========================
// ENGAGEMENT METRICS
// ===========================

/**
 * Generic function to atomically increment a counter field on a shared program
 * Uses DynamoDB atomic ADD operation for safe concurrent updates
 *
 * Counter fields are stored inside `attributes` to match our DynamoDB structure:
 * - attributes.viewCount
 * - attributes.copyCount
 *
 * @param sharedProgramId - The shared program ID
 * @param fieldName - The counter field to increment (e.g., "viewCount", "copyCount")
 * @returns The updated counter value
 */
async function incrementSharedProgramCounter(
  sharedProgramId: string,
  fieldName: string,
): Promise<number> {
  const tableName = getTableName();
  const operationName = `Increment ${fieldName} for shared program ${sharedProgramId}`;

  return withThroughputScaling(async () => {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        pk: `sharedProgram#${sharedProgramId}`,
        sk: "metadata",
      },
      // Update counter inside attributes to match DynamoDB structure
      UpdateExpression:
        "SET #attrs.#field = if_not_exists(#attrs.#field, :zero) + :inc, updatedAt = :now",
      ExpressionAttributeNames: {
        "#attrs": "attributes",
        "#field": fieldName,
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
    // Extract from attributes object in the response
    const attributes = result.Attributes?.attributes as
      | Record<string, any>
      | undefined;
    const newValue = (attributes?.[fieldName] as number) || 0;

    console.info(`Shared program ${fieldName} incremented:`, {
      sharedProgramId,
      [fieldName]: newValue,
    });

    return newValue;
  }, operationName);
}

/**
 * Increment the view count for a shared program
 *
 * @param sharedProgramId - The shared program ID
 * @returns The updated view count
 */
export async function incrementSharedProgramViews(
  sharedProgramId: string,
): Promise<number> {
  return incrementSharedProgramCounter(sharedProgramId, "viewCount");
}

/**
 * Increment the copy count for a shared program
 *
 * @param sharedProgramId - The shared program ID
 * @returns The updated copy count
 */
export async function incrementSharedProgramCopies(
  sharedProgramId: string,
): Promise<number> {
  return incrementSharedProgramCounter(sharedProgramId, "copyCount");
}
