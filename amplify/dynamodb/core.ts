import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { withThroughputScaling } from "./throughput-scaling";
import { getTableName } from "../functions/libs/branch-naming";
import { deepMerge } from "../functions/libs/object-utils";
import { logger } from "../functions/libs/logger";
import {
  DynamoDBItem,
  ContactFormAttributes,
} from "../functions/libs/coach-creator/types";

// ===========================
// DynamoDB Client Setup
// ===========================

const dynamoDbClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Re-export utilities for convenience (used by domain modules)
export { withThroughputScaling, getTableName, deepMerge };
export { QueryCommand, UpdateCommand, BatchWriteCommand };
export type { DynamoDBItem };

// ===========================
// DYNAMODB OPERATION INTERFACES
// ===========================

/**
 * Interface for DynamoDB save result
 */
export interface DynamoDBSaveResult {
  success: boolean;
  httpStatusCode?: number;
  requestId?: string;
  attempts?: number;
  totalRetryDelay?: number;
  itemSizeKB: string;
  errorDetails?: {
    message: string;
    name: string;
    code: string;
  };
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Generic helper function to recursively convert all Date objects to ISO strings
 * and remove undefined values for DynamoDB storage
 */
export function serializeForDynamoDB(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeForDynamoDB(item));
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    const undefinedKeys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        serialized[key] = serializeForDynamoDB(value);
      } else {
        undefinedKeys.push(key);
      }
    }

    // Log undefined values only if there are many (filters out common cases like optional fields)
    // Single undefined values (like optional 'notes' fields) are expected and don't need logging
    if (undefinedKeys.length > 3) {
      logger.warn("⚠️ Found many undefined values in DynamoDB serialization:", {
        undefinedCount: undefinedKeys.length,
        undefinedKeys: undefinedKeys.slice(0, 5), // Only log first 5 to avoid noise
        objectType: obj.constructor?.name || "Object",
        totalKeys: Object.keys(obj).length,
      });
    }

    return serialized;
  }

  return obj;
}

/**
 * Generic helper function to recursively convert ISO strings back to Date objects
 * when loading from DynamoDB. Attempts to parse strings that look like ISO dates.
 */
export function deserializeFromDynamoDB(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Check if the string looks like an ISO date (basic regex)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (isoDateRegex.test(obj)) {
      const date = new Date(obj);
      // Verify it's a valid date and not NaN
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deserializeFromDynamoDB(item));
  }

  if (typeof obj === "object") {
    const deserialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      deserialized[key] = deserializeFromDynamoDB(value);
    }
    return deserialized;
  }

  return obj;
}

// ===========================
// GENERIC CRUD OPERATIONS
// ===========================

/**
 * Generic function to save any item to DynamoDB
 */
export async function saveToDynamoDB<T>(
  item: DynamoDBItem<T>,
  requireExists: boolean = false,
): Promise<DynamoDBSaveResult> {
  const tableName = getTableName();
  const operationName = `Save ${item.entityType} to DynamoDB`;

  return withThroughputScaling(async () => {
    let serializedItem: any;
    let itemSizeBytes: number = 0;
    let itemSizeKB: string = "unknown";

    try {
      // Serialize the entire item to handle any Date objects anywhere in the structure
      serializedItem = serializeForDynamoDB(item);

      // Check item size before saving (DynamoDB has 400KB limit)
      itemSizeBytes = JSON.stringify(serializedItem).length;
      itemSizeKB = (itemSizeBytes / 1024).toFixed(2);

      // Warn if approaching DynamoDB size limit
      if (itemSizeBytes > 350000) {
        logger.warn(
          `⚠️ Large item approaching DynamoDB limit: ${itemSizeKB}KB (400KB max)`,
          {
            entityType: item.entityType,
            itemSizeKB,
          },
        );
      }

      const command = new PutCommand({
        TableName: tableName,
        Item: serializedItem,
        // For updates: ensure item exists before updating (prevents race conditions and accidental recreation)
        // For creates: no condition needed (default behavior)
        ...(requireExists && { ConditionExpression: "attribute_exists(pk)" }),
      });

      const putResult = await docClient.send(command);

      const result: DynamoDBSaveResult = {
        success: true,
        httpStatusCode: putResult.$metadata?.httpStatusCode,
        requestId: putResult.$metadata?.requestId,
        attempts: putResult.$metadata?.attempts,
        totalRetryDelay: putResult.$metadata?.totalRetryDelay,
        itemSizeKB,
      };

      return result;
    } catch (error) {
      const errorResult: DynamoDBSaveResult = {
        success: false,
        itemSizeKB: itemSizeKB || "unknown",
        errorDetails: {
          message: error instanceof Error ? error.message : "Unknown error",
          name: error instanceof Error ? error.name : "Unknown",
          code: (error as any)?.code || "No code",
        },
      };

      logger.error(`❌ Error saving ${item.entityType} data to DynamoDB:`, {
        ...errorResult,
        errorStack: error instanceof Error ? error.stack : "No stack",
        pk: item.pk,
        sk: item.sk,
      });

      // Still throw the error for backward compatibility, but also return result info
      throw error;
    }
  }, operationName);
}

/**
 * Enhanced save function that explicitly checks the result and provides detailed error info
 */
export async function saveToDynamoDBWithResult<T>(
  item: DynamoDBItem<T>,
  requireExists: boolean = false,
): Promise<DynamoDBSaveResult> {
  try {
    const result = await saveToDynamoDB(item, requireExists);

    // Explicit success verification
    if (!result.success) {
      logger.error("🚨 DynamoDB save reported success=false:", result);
      throw new Error(
        `Save operation failed: ${result.errorDetails?.message || "Unknown error"}`,
      );
    }

    // Additional checks for suspicious results
    if (!result.httpStatusCode || result.httpStatusCode !== 200) {
      logger.warn(
        "⚠️ DynamoDB save completed but with unexpected status code:",
        result,
      );
    }

    return result;
  } catch (error) {
    logger.error("🚨 Exception during DynamoDB save operation:", error);
    throw error;
  }
}

/**
 * Generic function to load any item from DynamoDB
 */
export async function loadFromDynamoDB<T>(
  pk: string,
  sk: string,
  entityType?: string,
): Promise<DynamoDBItem<T> | null> {
  const tableName = getTableName();

  const operationName = `Load ${entityType || "item"} from DynamoDB`;

  return withThroughputScaling(async () => {
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        pk,
        sk,
      },
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return null;
    }

    if (entityType) {
      logger.info(`${entityType} data loaded from DynamoDB successfully`);
    }

    // Deserialize the item to convert ISO strings back to Date objects
    const deserializedItem = deserializeFromDynamoDB(result.Item);

    return deserializedItem as DynamoDBItem<T>;
  }, operationName);
}

/**
 * Generic function to query multiple items from DynamoDB with pagination support
 */
export async function queryFromDynamoDB<T>(
  pk: string,
  skPrefix: string,
  entityType?: string,
): Promise<DynamoDBItem<T>[]> {
  const tableName = getTableName();

  const operationName = `Query ${entityType || "items"} from DynamoDB`;

  return withThroughputScaling(async () => {
    let allItems: DynamoDBItem<T>[] = [];
    let lastEvaluatedKey: any = undefined;
    let pageCount = 0;

    // Paginate through all results
    do {
      pageCount++;
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :skPrefix)",
        FilterExpression: entityType ? "#entityType = :entityType" : undefined,
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
          ...(entityType && { "#entityType": "entityType" }),
        },
        ExpressionAttributeValues: {
          ":pk": pk,
          ":skPrefix": skPrefix,
          ...(entityType && { ":entityType": entityType }),
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(command);
      const pageItems = (result.Items as DynamoDBItem<T>[]) || [];

      // Deserialize and add to collection
      allItems = allItems.concat(
        pageItems.map((item) => deserializeFromDynamoDB(item)),
      );

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    if (entityType) {
      logger.info(`${entityType} data queried from DynamoDB successfully`, {
        totalItems: allItems.length,
        pagesRead: pageCount,
      });
    }

    return allItems;
  }, operationName);
}

/**
 * Generic function to delete an item from DynamoDB
 */
export async function deleteFromDynamoDB(
  pk: string,
  sk: string,
  entityType?: string,
): Promise<void> {
  const tableName = getTableName();
  const operationName = `Delete ${entityType || "item"} from DynamoDB`;

  return withThroughputScaling(async () => {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: {
          pk,
          sk,
        },
        // Add condition to ensure the item exists before deleting
        ConditionExpression: "attribute_exists(pk)",
      });

      await docClient.send(command);

      if (entityType) {
        logger.info(`${entityType} deleted from DynamoDB successfully`);
      }
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new Error(`${entityType || "Item"} not found: ${pk}/${sk}`);
      }
      logger.error(
        `Error deleting ${entityType || "item"} from DynamoDB:`,
        error,
      );
      throw error;
    }
  }, operationName);
}

/**
 * Helper function to create a DynamoDB item with consistent structure
 */
export function createDynamoDBItem<T>(
  entityType: string,
  pk: string,
  sk: string,
  attributes: T,
  timestamp: string,
): DynamoDBItem<T> {
  return {
    pk,
    sk,
    attributes,
    entityType,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// ===========================
// CONTACT FORM OPERATIONS
// ===========================

/**
 * Save contact form submission to DynamoDB
 */
export async function saveContactForm(formData: {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  contactType: string;
  timestamp: string;
}): Promise<void> {
  const attributes: ContactFormAttributes = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    subject: formData.subject,
    message: formData.message,
    contactType: formData.contactType,
  };

  const item = createDynamoDBItem<ContactFormAttributes>(
    "contactForm",
    `contactForm#${formData.email}`,
    `timestamp#${formData.timestamp}`,
    attributes,
    formData.timestamp,
  );

  await saveToDynamoDB(item);
}
