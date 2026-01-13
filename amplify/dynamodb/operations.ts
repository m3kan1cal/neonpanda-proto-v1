import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { withThroughputScaling } from "./throughput-scaling";
import { getTableName } from "../functions/libs/branch-naming";
import { deepMerge } from "../functions/libs/object-utils";
import {
  CoachCreatorSession,
  DynamoDBItem,
  ContactFormAttributes,
  CoachConfigSummary,
  CoachConfig,
  CoachTemplate,
} from "../functions/libs/coach-creator/types";
import { ProgramDesignerSession } from "../functions/libs/program-designer/types";
import {
  CoachConversation,
  CoachConversationListItem,
  CoachMessage,
  CoachConversationSummary,
} from "../functions/libs/coach-conversation/types";
import { UserProfile } from "../functions/libs/user/types";
import { UserMemory } from "../functions/libs/memory/types";
import { Workout, WorkoutSummary } from "../functions/libs/workout/types";
import {
  WeeklyAnalytics,
  MonthlyAnalytics,
} from "../functions/libs/analytics/types";
import { Program, ProgramSummary } from "../functions/libs/program/types";
import { Subscription } from "../functions/libs/subscription/types";
import type {
  Exercise,
  ExerciseHistoryQueryResult,
  ExerciseNamesQueryResult,
  ExerciseNameEntry,
  ExerciseDiscipline,
} from "../functions/libs/exercise/types";

// DynamoDB client setup
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Note: DynamoDB operations now use withThroughputScaling wrapper for automatic scaling

// ===========================
// DYNAMODB OPERATION INTERFACES
// ===========================

/**
 * Query result for all users operation
 */
export interface QueryAllUsersResult {
  users: UserProfile[];
  lastEvaluatedKey?: any;
  count: number;
}

/**
 * Generic query result for GSI-3 entity type queries
 */
export interface QueryAllEntitiesResult<T> {
  items: DynamoDBItem<T>[];
  lastEvaluatedKey?: any;
  count: number;
}

// Interface for DynamoDB save result
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

// Generic function to save any item to DynamoDB
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
        console.warn(
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

      console.error(`❌ Error saving ${item.entityType} data to DynamoDB:`, {
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

// Enhanced save function that explicitly checks the result and provides detailed error info
export async function saveToDynamoDBWithResult<T>(
  item: DynamoDBItem<T>,
  requireExists: boolean = false,
): Promise<DynamoDBSaveResult> {
  try {
    const result = await saveToDynamoDB(item, requireExists);

    // Explicit success verification
    if (!result.success) {
      console.error("🚨 DynamoDB save reported success=false:", result);
      throw new Error(
        `Save operation failed: ${result.errorDetails?.message || "Unknown error"}`,
      );
    }

    // Additional checks for suspicious results
    if (!result.httpStatusCode || result.httpStatusCode !== 200) {
      console.warn(
        "⚠️ DynamoDB save completed but with unexpected status code:",
        result,
      );
    }

    return result;
  } catch (error) {
    console.error("🚨 Exception during DynamoDB save operation:", error);
    throw error;
  }
}

// Generic function to load any item from DynamoDB
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
      console.info(`${entityType} data loaded from DynamoDB successfully`);
    }

    // Deserialize the item to convert ISO strings back to Date objects
    const deserializedItem = deserializeFromDynamoDB(result.Item);

    return deserializedItem as DynamoDBItem<T>;
  }, operationName);
}

// Generic function to query multiple items from DynamoDB with pagination support
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
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :sk_prefix)",
        FilterExpression: entityType ? "#entityType = :entityType" : undefined,
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
          ...(entityType && { "#entityType": "entityType" }),
        },
        ExpressionAttributeValues: {
          ":pk": pk,
          ":sk_prefix": skPrefix,
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
      console.info(`${entityType} data queried from DynamoDB successfully`, {
        totalItems: allItems.length,
        pagesRead: pageCount,
      });
    }

    return allItems;
  }, operationName);
}

// Generic function to delete an item from DynamoDB
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
        console.info(`${entityType} deleted from DynamoDB successfully`);
      }
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new Error(`${entityType || "Item"} not found: ${pk}/${sk}`);
      }
      console.error(
        `Error deleting ${entityType || "item"} from DynamoDB:`,
        error,
      );
      throw error;
    }
  }, operationName);
}

// Helper function to create a DynamoDB item with consistent structure
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

// Specific function for contact form data (uses the generic function)
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

// Simplified function to save coach config directly
export async function saveCoachConfig(
  userId: string,
  coachConfig: CoachConfig,
  creationTimestamp?: string,
): Promise<void> {
  const timestamp = creationTimestamp || new Date().toISOString();
  const item = createDynamoDBItem<CoachConfig>(
    "coachConfig",
    `user#${userId}`,
    `coach#${coachConfig.coach_id}`,
    coachConfig,
    timestamp,
  );

  await saveToDynamoDB(item);
}

// Simplified function to load coach config directly
export async function getCoachConfig(
  userId: string,
  coachId: string,
): Promise<CoachConfig | null> {
  const item = await loadFromDynamoDB<CoachConfig>(
    `user#${userId}`,
    `coach#${coachId}`,
    "coachConfig",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

// Function to update coach config metadata (coach name, description, etc.)
export async function updateCoachConfig(
  userId: string,
  coachId: string,
  updates: Partial<CoachConfig>,
): Promise<CoachConfig> {
  // Load the full DynamoDB item (needed for pk/sk/timestamps)
  const existingItem = await loadFromDynamoDB<CoachConfig>(
    `user#${userId}`,
    `coach#${coachId}`,
    "coachConfig",
  );

  if (!existingItem) {
    throw new Error(`Coach config not found: ${coachId}`);
  }

  // Deep merge updates into existing config to preserve nested properties
  const updatedCoachConfig: CoachConfig = deepMerge(
    existingItem.attributes,
    updates,
  );

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingItem,
    attributes: updatedCoachConfig,
    updatedAt: new Date().toISOString(),
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Coach config updated successfully:", {
    coachId,
    userId,
    updatedFields: Object.keys(updates),
  });

  return updatedCoachConfig;
}

// Simplified function to save coach creator session directly
export async function saveCoachCreatorSession(
  session: CoachCreatorSession,
  ttlDays?: number, // Kept for backward compatibility but no longer used
): Promise<void> {
  // Note: TTL removed - coach creator sessions are permanent records
  // Only soft-deleted (isDeleted flag) when coach build succeeds
  // Hard-deleted only when user manually deletes incomplete session

  const item = createDynamoDBItem<CoachCreatorSession>(
    "coachCreatorSession",
    `user#${session.userId}`,
    `coachCreatorSession#${session.sessionId}`,
    session,
    session.lastActivity.toISOString(),
  );

  // No TTL timestamp - sessions persist indefinitely
  await saveToDynamoDB(item);
}

// ===========================
// HELPER FUNCTIONS
// ===========================

// Note: deepMerge is now imported from shared object-utils.ts
// It's used throughout this file for safe nested object merging

// Generic helper function to recursively convert all Date objects to ISO strings and remove undefined values for DynamoDB storage
function serializeForDynamoDB(obj: any): any {
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
      console.warn(
        "⚠️ Found many undefined values in DynamoDB serialization:",
        {
          undefinedCount: undefinedKeys.length,
          undefinedKeys: undefinedKeys.slice(0, 5), // Only log first 5 to avoid noise
          objectType: obj.constructor?.name || "Object",
          totalKeys: Object.keys(obj).length,
        },
      );
    }

    return serialized;
  }

  return obj;
}

// Generic helper function to recursively convert ISO strings back to Date objects when loading from DynamoDB
// This attempts to parse strings that look like ISO dates back to Date objects
function deserializeFromDynamoDB(obj: any): any {
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

// Simplified function to load coach creator session directly
export async function getCoachCreatorSession(
  userId: string,
  sessionId: string,
): Promise<CoachCreatorSession | null> {
  const item = await loadFromDynamoDB<CoachCreatorSession>(
    `user#${userId}`,
    `coachCreatorSession#${sessionId}`,
    "coachCreatorSession",
  );
  return item?.attributes ?? null;
}

// Function to delete a coach creator session
export async function deleteCoachCreatorSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `coachCreatorSession#${sessionId}`,
      "coachCreatorSession",
    );
    console.info("Coach creator session deleted successfully:", {
      sessionId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error(
        `Coach creator session ${sessionId} not found for user ${userId}`,
      );
    }
    throw error;
  }
}

// Function to query all coach creator sessions for a user with optional filtering and sorting
export async function queryCoachCreatorSessions(
  userId: string,
  options?: {
    // Filtering options
    isComplete?: boolean;
    fromDate?: Date;
    toDate?: Date;

    // Pagination options
    limit?: number;
    offset?: number;

    // Sorting options
    sortBy?: "startedAt" | "lastActivity" | "sessionId";
    sortOrder?: "asc" | "desc";
  },
): Promise<CoachCreatorSession[]> {
  try {
    // Get all coach creator sessions for the user
    const allSessionItems = await queryFromDynamoDB<CoachCreatorSession>(
      `user#${userId}`,
      "coachCreatorSession#",
      "coachCreatorSession",
    );

    // Extract attributes from DynamoDB items
    let allSessions = allSessionItems.map((item) => item.attributes);

    // Apply filters
    let filteredSessions = allSessions;

    // Filter out soft-deleted sessions by default (unless explicitly requested)
    filteredSessions = filteredSessions.filter((session) => !session.isDeleted);

    // Filter by completion status
    if (options?.isComplete !== undefined) {
      filteredSessions = filteredSessions.filter(
        (session) => session.isComplete === options.isComplete,
      );
    }

    // Date filtering
    if (options?.fromDate || options?.toDate) {
      filteredSessions = filteredSessions.filter((session) => {
        const startedAt = new Date(session.startedAt);

        if (options.fromDate && startedAt < options.fromDate) return false;
        if (options.toDate && startedAt > options.toDate) return false;

        return true;
      });
    }

    // Sorting
    if (options?.sortBy) {
      filteredSessions.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (options.sortBy) {
          case "startedAt":
            aValue = new Date(a.startedAt);
            bValue = new Date(b.startedAt);
            break;
          case "lastActivity":
            aValue = new Date(a.lastActivity);
            bValue = new Date(b.lastActivity);
            break;
          case "sessionId":
            aValue = a.sessionId;
            bValue = b.sessionId;
            break;
          default:
            aValue = new Date(a.lastActivity);
            bValue = new Date(b.lastActivity);
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return options.sortOrder === "desc" ? -comparison : comparison;
      });
    } else {
      // Default sort by lastActivity descending (most recent first)
      filteredSessions.sort(
        (a, b) =>
          new Date(b.lastActivity).getTime() -
          new Date(a.lastActivity).getTime(),
      );
    }

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredSessions = filteredSessions.slice(offset, offset + limit);
    }

    console.info("Coach creator sessions queried successfully:", {
      userId,
      totalFound: allSessions.length,
      afterFiltering: filteredSessions.length,
      filters: options,
    });

    return filteredSessions;
  } catch (error) {
    console.error(
      `Error querying coach creator sessions for user ${userId}:`,
      error,
    );
    throw error;
  }
}

// Function to load coach configs for a specific user (with limited properties)
export async function queryCoachConfigs(
  userId: string,
): Promise<CoachConfigSummary[]> {
  try {
    // Use the generic query function to get all coach configs for the user
    const items = await queryFromDynamoDB<any>(
      `user#${userId}`,
      "coach#",
      "coachConfig",
    );

    console.info(
      `📊 queryCoachConfigs: Found ${items.length} coach configs for user ${userId}`,
    );
    console.info(
      `📊 Coach IDs:`,
      items.map((item) => item.attributes?.coach_id),
    );

    // Filter out archived coaches
    const activeCoaches = items.filter(
      (item) => item.attributes?.status !== "archived",
    );

    console.info(
      `📊 queryCoachConfigs: ${activeCoaches.length} active coaches after filtering archived`,
    );

    // Extract and return only the summary properties we need
    return activeCoaches.map((item) => {
      const {
        coach_id,
        coach_name,
        coach_description,
        selected_personality: { primary_template, selection_reasoning } = {},
        technical_config: {
          programming_focus,
          specializations,
          methodology,
          experience_level,
          training_frequency,
        } = {},
        metadata: {
          created_date,
          total_conversations,
          methodology_profile,
        } = {},
      } = item.attributes;

      return {
        coach_id,
        coach_name,
        coach_description,
        selected_personality: { primary_template, selection_reasoning },
        technical_config: {
          programming_focus,
          specializations,
          methodology,
          experience_level,
          training_frequency,
        },
        metadata: {
          created_date,
          total_conversations,
          methodology_profile,
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      };
    });
  } catch (error) {
    console.error(`Error loading coach configs for user ${userId}:`, error);
    throw error;
  }
}

// Function to count coach configs for a user
export async function queryCoachConfigsCount(
  userId: string,
): Promise<{ totalCount: number }> {
  try {
    // Get all coach configs for the user
    const allCoaches = await queryFromDynamoDB<CoachConfigSummary>(
      `user#${userId}`,
      "coach#",
      "coachConfig",
    );

    // Filter out archived coaches
    const activeCoaches = allCoaches.filter(
      (coach) => coach.attributes?.status !== "archived",
    );

    const totalCount = activeCoaches.length;

    console.info("Coach configs counted successfully:", {
      userId,
      totalFound: totalCount,
    });

    return { totalCount };
  } catch (error) {
    console.error(`Error counting coach configs for user ${userId}:`, error);
    throw error;
  }
}

// Function to save a coach conversation
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

// Function to load a specific coach conversation
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

// Function to load conversation summaries for a user and specific coach (optimized - excludes messages)
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

// Function to load all conversations with full messages (for individual conversation access)
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

// Interface for conversation message save result
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

// Function to send a message to a coach conversation
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

// Function to update conversation metadata (title, tags, isActive)
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
  const updates = {
    ...updateData,
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

// Function to delete a coach conversation
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

// Function to save a workout session
export async function saveWorkout(workout: Workout): Promise<void> {
  const item = createDynamoDBItem<Workout>(
    "workout",
    `user#${workout.userId}`,
    `workout#${workout.workoutId}`,
    workout,
    new Date().toISOString(),
  );

  // Add GSI-1 keys if workout has a groupId (for querying workouts by training session/group)
  if (workout.groupId) {
    item.gsi1pk = `group#${workout.groupId}`;
    item.gsi1sk = `workout#${workout.workoutId}`;
  }

  // Add GSI-2 keys if workout has a templateId (for querying all logged instances of a template)
  if (workout.templateId) {
    item.gsi2pk = `template#${workout.templateId}`;
    item.gsi2sk = `workout#${workout.workoutId}`;
  }

  await saveToDynamoDB(item);

  console.info("Workout saved successfully:", {
    workoutId: workout.workoutId,
    userId: workout.userId,
    discipline: workout.workoutData.discipline,
    completedAt: workout.completedAt,
    groupId: workout.groupId || "none",
    templateId: workout.templateId || "none",
  });
}

// Function to get a specific workout session
export async function getWorkout(
  userId: string,
  workoutId: string,
): Promise<Workout | null> {
  const item = await loadFromDynamoDB<Workout>(
    `user#${userId}`,
    `workout#${workoutId}`,
    "workout",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

// Function to get the total count of workout sessions for a user
export async function queryWorkoutsCount(
  userId: string,
  options?: {
    // Date filtering
    fromDate?: Date;
    toDate?: Date;

    // Discipline filtering
    discipline?: string;
    workoutType?: string;
    location?: string;

    // Coach filtering
    coachId?: string;

    // Quality filtering
    minConfidence?: number;
  },
): Promise<number> {
  try {
    // Get all workout sessions for the user
    const allSessions = await queryFromDynamoDB<Workout>(
      `user#${userId}`,
      "workout#",
      "workout",
    );

    // Apply filters to get the count
    let filteredSessions = allSessions;

    // Date filtering
    if (options?.fromDate || options?.toDate) {
      filteredSessions = filteredSessions.filter((session) => {
        const completedAt = session.attributes.completedAt;
        const sessionDate = new Date(completedAt);

        if (options.fromDate && sessionDate < options.fromDate) return false;
        if (options.toDate && sessionDate > options.toDate) return false;

        return true;
      });
    }

    // Discipline filtering
    if (options?.discipline) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.discipline === options.discipline,
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.workout_type === options.workoutType,
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.location === options.location,
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter((session) =>
        session.attributes.coachIds.includes(options.coachId!),
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.extractionMetadata.confidence >=
          options.minConfidence!,
      );
    }

    const totalCount = filteredSessions.length;

    console.info("Workouts counted successfully:", {
      userId,
      totalFound: allSessions.length,
      afterFiltering: totalCount,
      filters: options,
    });

    return totalCount;
  } catch (error) {
    console.error(`Error counting workout sessions for user ${userId}:`, error);
    throw error;
  }
}

export async function queryWorkoutSummaries(
  userId: string,
  fromDate: Date,
  toDate: Date,
): Promise<WorkoutSummary[]> {
  const tableName = getTableName();
  const operationName = `Query workout summaries`;

  return withThroughputScaling(async () => {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :sk_prefix)",
      FilterExpression:
        "#entityType = :entityType AND #completedAt BETWEEN :fromDate AND :toDate",
      // Only fetch the fields needed for analytics (significantly reduces data transfer)
      ProjectionExpression:
        "pk, sk, entityType, #attributes.workoutId, #attributes.completedAt, #attributes.summary, #attributes.workoutData.workout_name, #attributes.workoutData.discipline, #attributes.coachIds",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#sk": "sk",
        "#entityType": "entityType",
        "#attributes": "attributes",
        "#completedAt": "attributes.completedAt",
      },
      ExpressionAttributeValues: {
        ":pk": `user#${userId}`,
        ":sk_prefix": "workout#",
        ":entityType": "workout",
        ":fromDate": fromDate.toISOString(),
        ":toDate": toDate.toISOString(),
      },
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as any[];

    console.info(`Workout summaries queried successfully:`, {
      userId,
      itemCount: items.length,
      dateRange: `${fromDate.toISOString().split("T")[0]} to ${toDate.toISOString().split("T")[0]}`,
    });

    // Deserialize and format the items - return unwrapped summaries
    return items.map(
      (item): WorkoutSummary => ({
        workoutId: item.attributes?.workoutId,
        completedAt: new Date(item.attributes?.completedAt),
        summary: item.attributes?.summary,
        workoutName: item.attributes?.workoutData?.workout_name,
        discipline: item.attributes?.workoutData?.discipline,
        coachIds: item.attributes?.coachIds || [],
      }),
    );
  }, operationName);
}

// Function to query all workout sessions for a user with optional filtering
export async function queryWorkouts(
  userId: string,
  options?: {
    // Date filtering
    fromDate?: Date;
    toDate?: Date;

    // Discipline filtering
    discipline?: string;
    workoutType?: string;
    location?: string;

    // Coach filtering
    coachId?: string;

    // Quality filtering
    minConfidence?: number;

    // Pagination
    limit?: number;
    offset?: number;

    // Sorting
    sortBy?: "completedAt" | "confidence" | "workoutName";
    sortOrder?: "asc" | "desc";
  },
): Promise<Workout[]> {
  try {
    // Get all workout sessions for the user
    const allSessionItems = await queryFromDynamoDB<Workout>(
      `user#${userId}`,
      "workout#",
      "workout",
    );

    // Extract attributes and include timestamps
    let allSessions = allSessionItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Apply filters
    let filteredSessions = allSessions;

    // Date filtering
    if (options?.fromDate || options?.toDate) {
      filteredSessions = filteredSessions.filter((session) => {
        const completedAt = session.completedAt;
        const sessionDate = new Date(completedAt);

        if (options.fromDate && sessionDate < options.fromDate) return false;
        if (options.toDate && sessionDate > options.toDate) return false;

        return true;
      });
    }

    // Discipline filtering
    if (options?.discipline) {
      filteredSessions = filteredSessions.filter(
        (session) => session.workoutData.discipline === options.discipline,
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(
        (session) => session.workoutData.workout_type === options.workoutType,
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(
        (session) => session.workoutData.location === options.location,
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter((session) =>
        session.coachIds.includes(options.coachId!),
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.extractionMetadata.confidence >= options.minConfidence!,
      );
    }

    // Sorting
    if (options?.sortBy) {
      filteredSessions.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (options.sortBy) {
          case "completedAt":
            aValue = new Date(a.completedAt);
            bValue = new Date(b.completedAt);
            break;
          case "confidence":
            aValue = a.extractionMetadata.confidence;
            bValue = b.extractionMetadata.confidence;
            break;
          case "workoutName":
            aValue = a.workoutData.workout_name || "";
            bValue = b.workoutData.workout_name || "";
            break;
          default:
            aValue = new Date(a.completedAt);
            bValue = new Date(b.completedAt);
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return options.sortOrder === "desc" ? -comparison : comparison;
      });
    } else {
      // Default sort by completedAt descending (most recent first)
      filteredSessions.sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
    }

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredSessions = filteredSessions.slice(offset, offset + limit);
    }

    console.info("Workouts queried successfully:", {
      userId,
      totalFound: allSessions.length,
      afterFiltering: filteredSessions.length,
      filters: options,
    });

    return filteredSessions;
  } catch (error) {
    console.error(`Error querying workout sessions for user ${userId}:`, error);
    throw error;
  }
}

// Function to update a workout session
export async function updateWorkout(
  userId: string,
  workoutId: string,
  updates: Partial<Workout>,
): Promise<Workout> {
  // Load the full DynamoDB item (needed for pk/sk/timestamps)
  const existingItem = await loadFromDynamoDB<Workout>(
    `user#${userId}`,
    `workout#${workoutId}`,
    "workout",
  );

  if (!existingItem) {
    throw new Error(`Workout not found: ${workoutId}`);
  }

  // Deep merge updates into existing session to preserve nested properties
  const updatedSession: Workout = deepMerge(existingItem.attributes, updates);

  // Sync root-level workoutName with workoutData.workout_name if it was updated
  if (updates.workoutData?.workout_name) {
    updatedSession.workoutName = updates.workoutData.workout_name;
  }

  // Track when the update was made in extraction metadata
  if (updatedSession.extractionMetadata) {
    updatedSession.extractionMetadata.reviewedAt = new Date();
  }

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingItem,
    attributes: updatedSession,
    updatedAt: new Date().toISOString(),
  };

  console.info("About to save workout update to DynamoDB:", {
    workoutId,
    userId,
    updateFields: Object.keys(updates),
    originalConfidence: existingItem.attributes.extractionMetadata.confidence,
    newConfidence: updatedSession.extractionMetadata.confidence,
  });

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Successfully updated workout in DynamoDB");

  return updatedSession;
}

// Function to delete a workout session
export async function deleteWorkout(
  userId: string,
  workoutId: string,
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `workout#${workoutId}`,
      "workout",
    );
    console.info("Workout deleted successfully:", {
      workoutId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error(`Workout ${workoutId} not found for user ${userId}`);
    }
    throw error;
  }
}

/**
 * Query all workouts in a group/session using GSI-1
 * Groups workouts from the same training day/session together
 */
export async function queryWorkoutsByGroup(
  groupId: string,
): Promise<Workout[]> {
  const tableName = getTableName();

  try {
    const result = await withThroughputScaling(async () => {
      return await docClient.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "gsi1",
          KeyConditionExpression: "gsi1pk = :gsi1pk",
          ExpressionAttributeValues: {
            ":gsi1pk": `group#${groupId}`,
          },
        }),
      );
    }, `Query workouts by groupId: ${groupId}`);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const items = result.Items as DynamoDBItem<Workout>[];
    return items.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch (error: any) {
    console.error(`Error querying workouts by groupId ${groupId}:`, error);
    throw error;
  }
}

/**
 * Query all logged instances of a workout template using GSI-2
 * Finds all workouts that were logged from a specific template
 */
export async function queryWorkoutsByTemplate(
  templateId: string,
): Promise<Workout[]> {
  const tableName = getTableName();

  try {
    const result = await withThroughputScaling(async () => {
      return await docClient.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "gsi2",
          KeyConditionExpression: "gsi2pk = :gsi2pk",
          ExpressionAttributeValues: {
            ":gsi2pk": `template#${templateId}`,
          },
        }),
      );
    }, `Query workouts by templateId: ${templateId}`);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const items = result.Items as DynamoDBItem<Workout>[];
    return items.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch (error: any) {
    console.error(
      `Error querying workouts by templateId ${templateId}:`,
      error,
    );
    throw error;
  }
}

// Function to save a coach conversation summary
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

// Function to get a coach conversation summary
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

// Function to query coach conversation summaries for a user
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

// ===========================
// USER PROFILE OPERATIONS
// ===========================

/**
 * Save a user profile to DynamoDB
 */
export async function saveUserProfile(userProfile: UserProfile): Promise<void> {
  const timestamp = new Date().toISOString();

  const item = createDynamoDBItem<UserProfile>(
    "user",
    `user#${userProfile.userId}`,
    "profile",
    userProfile,
    timestamp,
  );

  // Add GSI keys for email and username lookups
  const itemWithGsi = {
    ...item,
    gsi1pk: `email#${userProfile.email}`,
    gsi1sk: "profile",
    gsi2pk: `username#${userProfile.username}`,
    gsi2sk: "profile",
  };

  await saveToDynamoDB(itemWithGsi);
  console.info("User profile saved successfully:", {
    userId: userProfile.userId,
    email: userProfile.email,
    username: userProfile.username,
    displayName: userProfile.displayName,
  });
}

/**
 * Get a user profile by userId
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const item = await loadFromDynamoDB<UserProfile>(
    `user#${userId}`,
    "profile",
    "user",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Get a user profile by email using GSI-1
 */
export async function getUserProfileByEmail(
  email: string,
): Promise<UserProfile | null> {
  const tableName = getTableName();
  const operationName = `Query user profile by email: ${email}`;

  return withThroughputScaling(async () => {
    console.info(`Querying user profile by email: ${email}`);

    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :gsi1pk AND gsi1sk = :gsi1sk",
      ExpressionAttributeValues: {
        ":gsi1pk": `email#${email}`,
        ":gsi1sk": "profile",
      },
      Limit: 1, // Should only be one user per email
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as DynamoDBItem<UserProfile>[];

    if (items.length === 0) {
      console.info(`No user profile found for email: ${email}`);
      return null;
    }

    if (items.length > 1) {
      console.warn(`⚠️ Multiple user profiles found for email: ${email}`, {
        count: items.length,
        userIds: items.map((item) => item.attributes.userId),
      });
    }

    const item = items[0];
    const profile = {
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
    console.info(`User profile found for email: ${email}`, {
      userId: profile.userId,
      username: profile.username,
    });

    return profile;
  }, operationName);
}

/**
 * Get a user profile by username using GSI-2
 */
export async function getUserProfileByUsername(
  username: string,
): Promise<UserProfile | null> {
  const tableName = getTableName();
  const operationName = `Query user profile by username: ${username}`;

  return withThroughputScaling(async () => {
    console.info(`Querying user profile by username: ${username}`);

    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :gsi2pk AND gsi2sk = :gsi2sk",
      ExpressionAttributeValues: {
        ":gsi2pk": `username#${username}`,
        ":gsi2sk": "profile",
      },
      Limit: 1, // Should only be one user per username
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as DynamoDBItem<UserProfile>[];

    if (items.length === 0) {
      console.info(`No user profile found for username: ${username}`);
      return null;
    }

    if (items.length > 1) {
      console.warn(
        `⚠️ Multiple user profiles found for username: ${username}`,
        {
          count: items.length,
          userIds: items.map((item) => item.attributes.userId),
        },
      );
    }

    const item = items[0];
    const profile = {
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
    console.info(`User profile found for username: ${username}`, {
      userId: profile.userId,
      email: profile.email,
    });

    return profile;
  }, operationName);
}

/**
 * Update a user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  // Load the full DynamoDB item (needed for pk/sk/timestamps)
  const existingItem = await loadFromDynamoDB<UserProfile>(
    `user#${userId}`,
    "profile",
    "user",
  );

  if (!existingItem) {
    throw new Error(`User profile not found: ${userId}`);
  }

  // Deep merge updates into existing profile to preserve nested properties
  const updatedProfile: UserProfile = deepMerge(
    existingItem.attributes,
    updates,
  );

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingItem,
    attributes: updatedProfile,
    updatedAt: new Date().toISOString(),
    // Update GSI keys if email or username changed
    gsi1pk: `email#${updatedProfile.email}`,
    gsi2pk: `username#${updatedProfile.username}`,
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("User profile updated successfully:", {
    userId,
    updateFields: Object.keys(updates),
  });

  return updatedProfile;
}

/**
 * Update a user profile by email address (used for unsubscribe)
 */
export async function updateUserProfileByEmail(
  email: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  // First, find the user by email
  const userProfile = await getUserProfileByEmail(email);

  if (!userProfile) {
    throw new Error(`User profile not found for email: ${email}`);
  }

  // Then update using the userId
  return updateUserProfile(userProfile.userId, updates);
}

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
  const memory = await loadFromDynamoDB<UserMemory>(
    `user#${userId}`,
    `userMemory#${memoryId}`,
    "userMemory",
  );

  if (!memory) {
    console.warn(`Memory ${memoryId} not found for user ${userId}`);
    return;
  }

  // Update usage statistics
  memory.attributes.metadata.usageCount += 1;
  memory.attributes.metadata.lastUsed = new Date();

  // Enhanced tagging based on usage context
  const currentTags = memory.attributes.metadata.tags || [];
  const newTags = [...currentTags];

  // Add usage-based tags
  if (memory.attributes.metadata.usageCount >= 5) {
    if (!newTags.includes("frequently_used")) {
      newTags.push("frequently_used");
    }
  }

  if (memory.attributes.metadata.usageCount >= 10) {
    if (!newTags.includes("highly_accessed")) {
      newTags.push("highly_accessed");
    }
  }

  if (memory.attributes.metadata.usageCount >= 20) {
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

  // Add recency tags
  const now = new Date();
  const lastUsed = new Date(memory.attributes.metadata.lastUsed);
  const daysSinceLastUsed =
    (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastUsed <= 1) {
    if (!newTags.includes("recently_accessed")) {
      newTags.push("recently_accessed");
    }
  }

  // Limit tags to prevent bloat (max 10 tags)
  memory.attributes.metadata.tags = newTags.slice(0, 10);
  memory.updatedAt = new Date().toISOString();

  // Update DynamoDB
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
    newUsageCount: memory.attributes.metadata.usageCount,
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

/**
 * Generic function to query all entities of a specific type using GSI-3 (EntityType index)
 * Used for analytics and admin operations across all entity types
 */
export async function queryAllEntitiesByType<T>(
  entityType: string,
  limit?: number,
  exclusiveStartKey?: any,
  filterExpression?: string,
  expressionAttributeValues?: Record<string, any>,
): Promise<{
  items: T[];
  lastEvaluatedKey?: any;
  count: number;
}> {
  const tableName = getTableName();

  return withThroughputScaling(async () => {
    console.info(
      `Querying all ${entityType} entities from DynamoDB using GSI-3:`,
      {
        entityType,
        limit,
        hasExclusiveStartKey: !!exclusiveStartKey,
        hasFilterExpression: !!filterExpression,
      },
    );

    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi3",
      KeyConditionExpression: "entityType = :entityType",
      ExpressionAttributeValues: {
        ":entityType": entityType,
        ...expressionAttributeValues,
      },
      FilterExpression: filterExpression,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as DynamoDBItem<T>[];

    console.info(`Successfully queried ${entityType} entities:`, {
      entityType,
      itemCount: items.length,
      hasMoreResults: !!result.LastEvaluatedKey,
    });

    // Unwrap DynamoDB items to return pure domain types
    const unwrappedItems = items.map((item) => item.attributes);

    return {
      items: unwrappedItems,
      lastEvaluatedKey: result.LastEvaluatedKey,
      count: unwrappedItems.length,
    };
  }, `Query all ${entityType} entities using GSI-3`);
}

/**
 * Query all active users from DynamoDB using GSI-3 (EntityType index)
 * Used for analytics and admin operations
 */
export async function queryAllUsers(
  limit?: number,
  exclusiveStartKey?: any,
): Promise<QueryAllUsersResult> {
  const result = await queryAllEntitiesByType<UserProfile>(
    "user",
    limit,
    exclusiveStartKey,
    "attributes.metadata.isActive = :isActive",
    { ":isActive": true },
  );

  return {
    users: result.items,
    lastEvaluatedKey: result.lastEvaluatedKey,
    count: result.count,
  };
}

// Function to save weekly analytics data
export async function saveWeeklyAnalytics(
  weeklyAnalytics: WeeklyAnalytics,
): Promise<void> {
  const item = createDynamoDBItem<WeeklyAnalytics>(
    "analytics",
    `user#${weeklyAnalytics.userId}`,
    `weeklyAnalytics#${weeklyAnalytics.weekId}`,
    weeklyAnalytics,
    new Date().toISOString(),
  );

  await saveToDynamoDB(item);
  console.info("Weekly analytics saved successfully:", {
    userId: weeklyAnalytics.userId,
    weekId: weeklyAnalytics.weekId,
    weekRange: `${weeklyAnalytics.weekStart} to ${weeklyAnalytics.weekEnd}`,
    workoutCount: weeklyAnalytics.metadata.workoutCount,
    s3Location: weeklyAnalytics.s3Location,
    analysisConfidence: weeklyAnalytics.metadata.analysisConfidence,
  });
}

// Function to query all weekly analytics for a user
export async function queryWeeklyAnalytics(
  userId: string,
  options?: {
    // Date filtering
    fromDate?: Date;
    toDate?: Date;

    // Pagination
    limit?: number;
    offset?: number;

    // Sorting
    sortBy?: "weekStart" | "weekEnd" | "workoutCount";
    sortOrder?: "asc" | "desc";
  },
): Promise<WeeklyAnalytics[]> {
  try {
    // Get all weekly analytics for the user
    const allAnalyticsItems = await queryFromDynamoDB<WeeklyAnalytics>(
      `user#${userId}`,
      "weeklyAnalytics#",
      "analytics",
    );

    // Extract attributes and include timestamps
    let allAnalytics = allAnalyticsItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Apply filters
    let filteredAnalytics = allAnalytics;

    // Date filtering
    if (options?.fromDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const weekStart = new Date(analytics.weekStart);
        return weekStart >= options.fromDate!;
      });
    }

    if (options?.toDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const weekEnd = new Date(analytics.weekEnd);
        return weekEnd <= options.toDate!;
      });
    }

    // Sorting
    const sortBy = options?.sortBy || "weekStart";
    const sortOrder = options?.sortOrder || "desc";

    filteredAnalytics.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "weekStart":
          aValue = new Date(a.weekStart);
          bValue = new Date(b.weekStart);
          break;
        case "weekEnd":
          aValue = new Date(a.weekEnd);
          bValue = new Date(b.weekEnd);
          break;
        case "workoutCount":
          aValue = a.metadata.workoutCount;
          bValue = b.metadata.workoutCount;
          break;
        default:
          aValue = new Date(a.weekStart);
          bValue = new Date(b.weekStart);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredAnalytics = filteredAnalytics.slice(offset, offset + limit);
    }

    console.info(
      `Found ${filteredAnalytics.length} weekly analytics records for user ${userId}`,
    );
    return filteredAnalytics;
  } catch (error) {
    console.error("Error querying weekly analytics:", error);
    throw error;
  }
}

// Function to get a specific weekly analytics record
export async function getWeeklyAnalytics(
  userId: string,
  weekId: string,
): Promise<WeeklyAnalytics | null> {
  const item = await loadFromDynamoDB<WeeklyAnalytics>(
    `user#${userId}`,
    `weeklyAnalytics#${weekId}`,
    "analytics",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

// ===========================
// MONTHLY ANALYTICS OPERATIONS
// ===========================

// Function to save monthly analytics to DynamoDB
export async function saveMonthlyAnalytics(
  monthlyAnalytics: MonthlyAnalytics,
): Promise<void> {
  const item = createDynamoDBItem<MonthlyAnalytics>(
    "analytics",
    `user#${monthlyAnalytics.userId}`,
    `monthlyAnalytics#${monthlyAnalytics.monthId}`,
    monthlyAnalytics,
    new Date().toISOString(),
  );

  await saveToDynamoDB(item);
  console.info("Monthly analytics saved successfully:", {
    userId: monthlyAnalytics.userId,
    monthId: monthlyAnalytics.monthId,
    monthRange: `${monthlyAnalytics.monthStart} to ${monthlyAnalytics.monthEnd}`,
    workoutCount: monthlyAnalytics.metadata.workoutCount,
    s3Location: monthlyAnalytics.s3Location,
    analysisConfidence: monthlyAnalytics.metadata.analysisConfidence,
  });
}

// Function to query all monthly analytics for a user
export async function queryMonthlyAnalytics(
  userId: string,
  options?: {
    // Date filtering
    fromDate?: Date;
    toDate?: Date;

    // Pagination
    limit?: number;
    offset?: number;

    // Sorting
    sortBy?: "monthStart" | "monthEnd" | "workoutCount";
    sortOrder?: "asc" | "desc";
  },
): Promise<MonthlyAnalytics[]> {
  try {
    // Get all monthly analytics for the user
    const allAnalyticsItems = await queryFromDynamoDB<MonthlyAnalytics>(
      `user#${userId}`,
      "monthlyAnalytics#",
      "analytics",
    );

    // Extract attributes and include timestamps
    let allAnalytics = allAnalyticsItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Apply filters
    let filteredAnalytics = allAnalytics;

    // Date filtering
    if (options?.fromDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const monthStart = new Date(analytics.monthStart);
        return monthStart >= options.fromDate!;
      });
    }

    if (options?.toDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const monthEnd = new Date(analytics.monthEnd);
        return monthEnd <= options.toDate!;
      });
    }

    // Sorting
    const sortBy = options?.sortBy || "monthStart";
    const sortOrder = options?.sortOrder || "desc";

    filteredAnalytics.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "monthStart":
          aValue = new Date(a.monthStart);
          bValue = new Date(b.monthStart);
          break;
        case "monthEnd":
          aValue = new Date(a.monthEnd);
          bValue = new Date(b.monthEnd);
          break;
        case "workoutCount":
          aValue = a.metadata.workoutCount;
          bValue = b.metadata.workoutCount;
          break;
        default:
          aValue = new Date(a.monthStart);
          bValue = new Date(b.monthStart);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredAnalytics = filteredAnalytics.slice(offset, offset + limit);
    }

    console.info(
      `Found ${filteredAnalytics.length} monthly analytics records for user ${userId}`,
    );
    return filteredAnalytics;
  } catch (error) {
    console.error("Error querying monthly analytics:", error);
    throw error;
  }
}

// Function to get a specific monthly analytics record
export async function getMonthlyAnalytics(
  userId: string,
  monthId: string,
): Promise<MonthlyAnalytics | null> {
  const item = await loadFromDynamoDB<MonthlyAnalytics>(
    `user#${userId}`,
    `monthlyAnalytics#${monthId}`,
    "analytics",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

// ===========================
// COACH TEMPLATE OPERATIONS
// ===========================

/**
 * Get all available coach templates
 */
export async function queryCoachTemplates(): Promise<CoachTemplate[]> {
  try {
    // Query all coach templates using the global template partition
    const itemsWithDb = await queryFromDynamoDB<CoachTemplate>(
      "template#global",
      "coachTemplate#",
      "coachTemplate",
    );

    // Extract attributes
    const items = itemsWithDb.map((item) => item.attributes);

    // Filter to only active templates and sort by popularity/name
    const activeTemplates = items.filter((item) => item.metadata.is_active);

    // Sort by popularity score (desc) then by template name (asc)
    activeTemplates.sort((a, b) => {
      const popularityDiff =
        (b.metadata.popularity_score || 0) - (a.metadata.popularity_score || 0);
      if (popularityDiff !== 0) return popularityDiff;

      return a.template_name.localeCompare(b.template_name);
    });

    console.info("Coach templates queried successfully:", {
      totalFound: items.length,
      activeTemplates: activeTemplates.length,
    });

    return activeTemplates;
  } catch (error) {
    console.error("Error querying coach templates from DynamoDB:", error);
    throw error;
  }
}

/**
 * Get a specific coach template by template ID
 */
export async function getCoachTemplate(
  templateId: string,
): Promise<CoachTemplate | null> {
  const item = await loadFromDynamoDB<CoachTemplate>(
    "template#global",
    `coachTemplate#${templateId}`,
    "coachTemplate",
  );
  return item?.attributes ?? null;
}

/**
 * Create a coach config from a template
 */
export async function createCoachConfigFromTemplate(
  userId: string,
  templateId: string,
): Promise<CoachConfig> {
  try {
    // Get the template
    const template = await getCoachTemplate(templateId);

    if (!template) {
      throw new Error(`Coach template not found: ${templateId}`);
    }

    if (!template.metadata.is_active) {
      throw new Error(`Coach template is not active: ${templateId}`);
    }

    // Generate new coach ID and timestamp
    const timestamp = Date.now();
    const newCoachId = `user_${userId}_coach_${timestamp}`;
    const currentDate = new Date().toISOString();

    // Copy the base_config and update necessary fields
    const newCoachConfig: CoachConfig = {
      ...template.base_config,
      coach_id: newCoachId,
      metadata: {
        ...template.base_config.metadata,
        created_date: currentDate,
        total_conversations: 0,
        user_satisfaction: null,
      },
    };

    // Save the new coach config
    await saveCoachConfig(userId, newCoachConfig);

    // Update template popularity score (optional - tracks usage)
    try {
      // Load the full DynamoDB item for update
      const templateItem = await loadFromDynamoDB<CoachTemplate>(
        "template#global",
        `coachTemplate#${templateId}`,
        "coachTemplate",
      );

      if (templateItem) {
        const updatedTemplate = {
          ...templateItem,
          attributes: {
            ...templateItem.attributes,
            metadata: {
              ...templateItem.attributes.metadata,
              popularity_score:
                (templateItem.attributes.metadata.popularity_score || 0) + 1,
            },
          },
          updatedAt: currentDate,
        };
        await saveToDynamoDB(updatedTemplate);
      }
    } catch (popularityError) {
      // Don't fail the whole operation if popularity update fails
      console.warn("Failed to update template popularity:", popularityError);
    }

    console.info("Coach config created from template successfully:", {
      templateId,
      templateName: template.template_name,
      userId,
      newCoachId,
      coachName: newCoachConfig.coach_name,
    });

    return newCoachConfig;
  } catch (error) {
    console.error("Error creating coach config from template:", error);
    throw error;
  }
}

// =====================================
// PROGRAM DESIGNER SESSION OPERATIONS
// =====================================

/**
 * Save a program designer session to DynamoDB
 * Pattern: Matches saveCoachCreatorSession exactly
 *
 * SK format: programDesignerSession#{sessionId}
 * Supports multiple sessions per conversation (user can start multiple programs)
 */
export async function saveProgramDesignerSession(
  session: ProgramDesignerSession,
): Promise<void> {
  // Note: No TTL - program designer sessions are permanent records
  // Only soft-deleted (isDeleted flag) when program build succeeds
  // Hard-deleted only when user manually deletes incomplete session

  const item = createDynamoDBItem<ProgramDesignerSession>(
    "programDesignerSession",
    `user#${session.userId}`,
    `programDesignerSession#${session.sessionId}`,
    session,
    session.lastActivity.toISOString(),
  );

  await saveToDynamoDB(item);
  console.info("Program designer session saved successfully:", {
    sessionId: session.sessionId,
    userId: session.userId,
  });
}

/**
 * Get the most recent active program designer session for a user
 * Returns the most recent non-deleted session, or null if none exists
 *
 * Design: Only ONE active session per user at a time
 * Uses efficient DynamoDB query with begins_with: programDesignerSession#
 */
export async function getProgramDesignerSession(
  userId: string,
  sessionId?: string,
): Promise<ProgramDesignerSession | null> {
  try {
    // If sessionId provided, load specific session directly
    if (sessionId) {
      const item = await loadFromDynamoDB<ProgramDesignerSession>(
        `user#${userId}`,
        `programDesignerSession#${sessionId}`,
        "programDesignerSession",
      );
      return item?.attributes ?? null;
    }

    // Otherwise, query all program designer sessions for this user
    const sessions = await queryFromDynamoDB<ProgramDesignerSession>(
      `user#${userId}`,
      `programDesignerSession#`,
      "programDesignerSession",
    );

    // Filter out soft-deleted sessions and sort by lastActivity (most recent first)
    const activeSessions = sessions
      .map((item) => item.attributes)
      .filter((session) => !session.isDeleted)
      .sort(
        (a, b) =>
          new Date(b.lastActivity).getTime() -
          new Date(a.lastActivity).getTime(),
      );

    return activeSessions[0] ?? null;
  } catch (error: any) {
    console.error("Error getting program designer session:", error);
    return null;
  }
}

/**
 * Delete a program designer session
 *
 * @param userId - User ID
 * @param sessionId - Session ID (format: program_designer_{conversationId}_{timestamp})
 */
export async function deleteProgramDesignerSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `programDesignerSession#${sessionId}`,
      "programDesignerSession",
    );
    console.info("Program designer session deleted successfully:", {
      sessionId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error(
        `Program designer session ${sessionId} not found for user ${userId}`,
      );
    }
    throw error;
  }
}

/**
 * Query all program designer sessions for a user with optional filtering and sorting
 */
export async function queryProgramDesignerSessions(
  userId: string,
  options?: {
    // Filtering options
    isComplete?: boolean;
    fromDate?: Date;
    toDate?: Date;

    // Pagination options
    limit?: number;
    offset?: number;

    // Sorting options
    sortBy?: "startedAt" | "lastActivity" | "sessionId";
    sortOrder?: "asc" | "desc";
  },
): Promise<ProgramDesignerSession[]> {
  try {
    // Get all program designer sessions for the user
    const allSessionItems = await queryFromDynamoDB<ProgramDesignerSession>(
      `user#${userId}`,
      "programDesignerSession#",
      "programDesignerSession",
    );

    // Extract attributes from DynamoDB items
    let allSessions = allSessionItems.map((item) => item.attributes);

    // Apply filters
    let filteredSessions = allSessions;

    // Filter out soft-deleted sessions by default
    filteredSessions = filteredSessions.filter((session) => !session.isDeleted);

    // Filter by completion status
    if (options?.isComplete !== undefined) {
      filteredSessions = filteredSessions.filter(
        (session) => session.isComplete === options.isComplete,
      );
    }

    // Date filtering
    if (options?.fromDate || options?.toDate) {
      filteredSessions = filteredSessions.filter((session) => {
        const startedAt = new Date(session.startedAt);

        if (options.fromDate && startedAt < options.fromDate) return false;
        if (options.toDate && startedAt > options.toDate) return false;

        return true;
      });
    }

    // Sorting
    if (options?.sortBy) {
      filteredSessions.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (options.sortBy) {
          case "startedAt":
            aValue = new Date(a.startedAt);
            bValue = new Date(b.startedAt);
            break;
          case "lastActivity":
            aValue = new Date(a.lastActivity);
            bValue = new Date(b.lastActivity);
            break;
          case "sessionId":
            aValue = a.sessionId;
            bValue = b.sessionId;
            break;
          default:
            aValue = new Date(a.lastActivity);
            bValue = new Date(b.lastActivity);
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return options.sortOrder === "desc" ? -comparison : comparison;
      });
    } else {
      // Default sort by lastActivity descending (most recent first)
      filteredSessions.sort(
        (a, b) =>
          new Date(b.lastActivity).getTime() -
          new Date(a.lastActivity).getTime(),
      );
    }

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredSessions = filteredSessions.slice(offset, offset + limit);
    }

    console.info("Program designer sessions queried successfully:", {
      userId,
      totalFound: allSessions.length,
      afterFiltering: filteredSessions.length,
    });

    return filteredSessions;
  } catch (error: any) {
    console.error("Error querying program designer sessions:", error);
    throw error;
  }
}

// ===========================
// TRAINING PROGRAM OPERATIONS
// ===========================

/**
 * Save a training program to DynamoDB
 */
export async function saveProgram(program: Program): Promise<void> {
  // Validate program has at least one coach
  const primaryCoachId = program.coachIds[0];

  if (!primaryCoachId) {
    throw new Error("Training program must have at least one coach");
  }

  // Use consistent PK pattern: user#{userId} (matches all other entities)
  const item = createDynamoDBItem<Program>(
    "program",
    `user#${program.userId}`,
    `program#${program.programId}`,
    program,
    new Date().toISOString(),
  );

  // Add GSI-1 for querying all programs for a user across coaches
  const itemWithGsi = {
    ...item,
    gsi1pk: `user#${program.userId}`,
    gsi1sk: `program#${program.programId}`,
  };

  await saveToDynamoDB(itemWithGsi);

  console.info("Training program saved successfully:", {
    programId: program.programId,
    userId: program.userId,
    coachIds: program.coachIds,
    coachNames: program.coachNames,
    name: program.name,
    status: program.status,
    totalDays: program.totalDays,
    currentDay: program.currentDay,
  });
}

/**
 * Get a specific training program
 */
export async function getProgram(
  userId: string,
  coachId: string,
  programId: string,
): Promise<Program | null> {
  console.info("📋 Getting single program:", {
    userId,
    coachId,
    programId,
    pk: `user#${userId}`,
    sk: `program#${programId}`,
  });

  // Use correct user-scoped PK (not composite with coach)
  const item = await loadFromDynamoDB<Program>(
    `user#${userId}`,
    `program#${programId}`,
    "program",
  );

  if (!item) {
    console.warn("⚠️ Program not found:", {
      userId,
      programId,
      attemptedPk: `user#${userId}`,
    });
    return null;
  }

  // Optional: Verify the program belongs to this coach
  const program = {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };

  if (coachId && !program.coachIds?.includes(coachId)) {
    console.warn("⚠️ Program found but does not belong to requested coach:", {
      userId,
      programId,
      requestedCoachId: coachId,
      programCoachIds: program.coachIds,
    });
    return null; // Return null if coach doesn't match
  }

  console.info("✅ Program loaded successfully:", {
    userId,
    programId,
    programName: program.name,
    coachIds: program.coachIds,
  });

  return program;
}

/**
 * Query all training programs for a user and specific coach
 */
/**
 * @deprecated This function is deprecated as of Dec 4, 2025.
 * Use `queryPrograms(userId)` instead, which uses the GSI index.
 *
 * This function queries using a composite PK (user#userId#coach#coachId) which
 * was used in older program records. New programs are saved with a simple user-scoped
 * PK (user#userId) and should be queried via GSI using `queryPrograms()`.
 *
 * Kept for backward compatibility with programs created before the PK fix.
 */
export async function queryProgramsByCoach(
  userId: string,
  coachId: string,
  options?: {
    status?: Program["status"];
    limit?: number;
    sortOrder?: "asc" | "desc";
  },
): Promise<Program[]> {
  console.warn(
    "⚠️ DEPRECATED: queryProgramsByCoach() is deprecated. Use queryPrograms() instead.",
  );
  console.warn(
    "⚠️ This function queries with composite PK (user#userId#coach#coachId) which is no longer used for new programs.",
  );

  try {
    // Query all programs for this user + coach combination using OLD composite PK
    const allProgramsItems = await queryFromDynamoDB<Program>(
      `user#${userId}#coach#${coachId}`,
      "program#",
      "program",
    );

    // Extract attributes and include timestamps
    const allPrograms = allProgramsItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Filter out archived programs by default
    let filteredPrograms = allPrograms.filter(
      (program) => program.status !== "archived",
    );

    // Filter by status if specified
    if (options?.status) {
      filteredPrograms = filteredPrograms.filter(
        (program) => program.status === options.status,
      );
    }

    // Sort by startDate
    filteredPrograms.sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return options?.sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    // Apply limit if specified
    if (options?.limit) {
      filteredPrograms = filteredPrograms.slice(0, options.limit);
    }

    console.info("Training programs queried successfully:", {
      userId,
      coachId,
      totalFound: allPrograms.length,
      afterFiltering: filteredPrograms.length,
      filters: options,
    });

    return filteredPrograms;
  } catch (error) {
    console.error(
      `Error querying training programs for user ${userId} and coach ${coachId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Query training programs for a user across all coaches using GSI-1
 */
export async function queryPrograms(
  userId: string,
  options?: {
    status?: Program["status"];
    limit?: number;
    sortOrder?: "asc" | "desc";
  },
): Promise<Program[]> {
  const tableName = getTableName();
  const operationName = `Query all programs for user ${userId}`;

  return withThroughputScaling(async () => {
    let allProgramItems: DynamoDBItem<Program>[] = [];
    let lastEvaluatedKey: any = undefined;
    let pageCount = 0;

    // Paginate through all results
    do {
      pageCount++;
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: "gsi1",
        KeyConditionExpression:
          "gsi1pk = :gsi1pk AND begins_with(gsi1sk, :gsi1sk_prefix)",
        FilterExpression: options?.status
          ? "#entityType = :entityType AND #status = :status AND #status <> :archivedStatus"
          : "#entityType = :entityType AND #status <> :archivedStatus",
        ExpressionAttributeNames: {
          "#entityType": "entityType",
          "#status": "attributes.status",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `user#${userId}`,
          ":gsi1sk_prefix": "program#",
          ":entityType": "program",
          ":archivedStatus": "archived",
          ...(options?.status && { ":status": options.status }),
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(command);
      const pageItems = (result.Items || []) as DynamoDBItem<Program>[];

      // Deserialize and add to collection
      allProgramItems = allProgramItems.concat(
        pageItems.map((item) => deserializeFromDynamoDB(item)),
      );

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Extract attributes and include timestamps
    let programs = allProgramItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Sort by startDate
    programs.sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return options?.sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    // Apply limit if specified
    if (options?.limit) {
      programs = programs.slice(0, options.limit);
    }

    console.info("All training programs queried successfully:", {
      userId,
      totalFound: programs.length,
      pagesRead: pageCount,
      filters: options,
    });

    return programs;
  }, operationName);
}

/**
 * Update a training program
 */
export async function updateProgram(
  userId: string,
  coachId: string,
  programId: string,
  updates: Partial<Program>,
): Promise<Program> {
  console.info("📝 Updating program:", {
    userId,
    coachId,
    programId,
    updateFields: Object.keys(updates),
  });

  // Load the full DynamoDB item using correct user-scoped PK
  const existingItem = await loadFromDynamoDB<Program>(
    `user#${userId}`,
    `program#${programId}`,
    "program",
  );

  if (!existingItem) {
    console.warn("⚠️ Program not found for update:", {
      userId,
      programId,
      attemptedPk: `user#${userId}`,
    });
    throw new Error(`Training program not found: ${programId}`);
  }

  // Verify program belongs to this coach before allowing update
  if (coachId && !existingItem.attributes.coachIds?.includes(coachId)) {
    console.warn("⚠️ Program found but does not belong to coach:", {
      userId,
      programId,
      requestedCoachId: coachId,
      programCoachIds: existingItem.attributes.coachIds,
    });
    throw new Error(`Training program not found: ${programId}`);
  }

  // Deep merge updates into existing program
  const updatedProgram: Program = deepMerge(existingItem.attributes, updates);

  // Recalculate adherence rate if workout counts changed
  if (
    updates.completedWorkouts !== undefined ||
    updates.totalWorkouts !== undefined
  ) {
    updatedProgram.adherenceRate =
      updatedProgram.totalWorkouts > 0
        ? updatedProgram.completedWorkouts / updatedProgram.totalWorkouts
        : 0;
  }

  // Create updated item
  const updatedItem = {
    ...existingItem,
    attributes: updatedProgram,
    updatedAt: new Date().toISOString(),
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Training program updated successfully:", {
    programId,
    userId,
    coachId,
    updatedFields: Object.keys(updates),
    currentDay: updatedProgram.currentDay,
    status: updatedProgram.status,
  });

  return updatedProgram;
}

/**
 * Delete a training program
 */
export async function deleteProgram(
  userId: string,
  coachId: string,
  programId: string,
): Promise<void> {
  try {
    console.info("🗑️ Deleting program:", {
      userId,
      coachId,
      programId,
    });

    // First verify the program exists and belongs to this coach
    const existingProgram = await getProgram(userId, coachId, programId);
    if (!existingProgram) {
      throw new Error(
        `Training program ${programId} not found for user ${userId} and coach ${coachId}`,
      );
    }

    // Delete using correct user-scoped PK
    await deleteFromDynamoDB(
      `user#${userId}`,
      `program#${programId}`,
      "program",
    );

    console.info("✅ Training program deleted successfully:", {
      programId,
      userId,
      coachId,
      programName: existingProgram.name,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error(
        `Training program ${programId} not found for user ${userId} and coach ${coachId}`,
      );
    }
    console.error("❌ Error deleting program:", error);
    throw error;
  }
}

/**
 * Get training program summaries for a user (lightweight, for list views)
 */
export async function queryProgramSummaries(
  userId: string,
  coachId?: string,
): Promise<ProgramSummary[]> {
  try {
    // Always use queryPrograms (GSI-based) and filter in memory if coachId provided
    let programs = await queryPrograms(userId);

    if (coachId) {
      // Filter by coachId in memory (programs saved with user#{userId} PK, not composite key)
      programs = programs.filter((p) => p.coachIds.includes(coachId));
    }

    // Map to lightweight summaries
    const summaries: ProgramSummary[] = programs.map((program) => ({
      programId: program.programId,
      name: program.name,
      status: program.status,
      currentDay: program.currentDay,
      totalDays: program.totalDays,
      adherenceRate: program.adherenceRate,
      startDate: program.startDate,
      lastActivityAt: program.lastActivityAt,
      coachIds: program.coachIds,
      coachNames: program.coachNames,
    }));

    console.info("Training program summaries created:", {
      userId,
      coachId: coachId || "all",
      summaryCount: summaries.length,
    });

    return summaries;
  } catch (error) {
    console.error(
      `Error creating training program summaries for user ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Count training programs for a user
 */
export async function queryProgramsCount(
  userId: string,
  options?: {
    coachId?: string;
    status?: Program["status"];
  },
): Promise<{ totalCount: number }> {
  try {
    // Always use queryPrograms (GSI-based) and filter in memory
    let allPrograms = await queryPrograms(userId);

    // Filter by coachId if provided (programs saved with user#{userId} PK, not composite key)
    if (options?.coachId) {
      const coachId = options.coachId;
      allPrograms = allPrograms.filter((p) => p.coachIds.includes(coachId));
    }

    // Filter by status if specified
    let filteredPrograms = allPrograms;
    if (options?.status) {
      filteredPrograms = allPrograms.filter(
        (program) => program.status === options.status,
      );
    }

    const totalCount = filteredPrograms.length;

    console.info("Training programs counted successfully:", {
      userId,
      coachId: options?.coachId || "all",
      status: options?.status || "all",
      totalFound: totalCount,
    });

    return { totalCount };
  } catch (error) {
    console.error(
      `Error counting training programs for user ${userId}:`,
      error,
    );
    throw error;
  }
}

// ===========================
// SUBSCRIPTION OPERATIONS
// ===========================

/**
 * Save a new subscription to DynamoDB
 * Used for initial subscription creation (customer.subscription.created)
 * Uses lowercase pk/sk and entityType for consistency
 * Note: createdAt/updatedAt stored at root level only, not in attributes
 */
export async function saveSubscription(
  subscriptionData: Omit<
    Subscription,
    "entityType" | "createdAt" | "updatedAt"
  >,
): Promise<DynamoDBSaveResult> {
  const timestamp = new Date().toISOString();

  const item: DynamoDBItem<Subscription> = {
    pk: `user#${subscriptionData.userId}`,
    sk: "subscription",
    attributes: {
      ...subscriptionData,
      entityType: "subscription",
    },
    entityType: "subscription",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const result = await saveToDynamoDB(item);

  console.info("Subscription created successfully:", {
    userId: subscriptionData.userId,
    tier: subscriptionData.tier,
    status: subscriptionData.status,
    stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
  });

  return result;
}

/**
 * Update an existing subscription in DynamoDB
 * Used for subscription updates (customer.subscription.updated, cancellations, etc.)
 * Preserves original createdAt timestamp while updating other fields
 * Note: createdAt/updatedAt stored at root level only, not in attributes
 */
export async function updateSubscription(
  subscriptionData: Omit<
    Subscription,
    "entityType" | "createdAt" | "updatedAt"
  >,
): Promise<DynamoDBSaveResult> {
  // Load existing subscription to preserve createdAt
  const existingItem = await loadFromDynamoDB<Subscription>(
    `user#${subscriptionData.userId}`,
    "subscription",
    "subscription",
  );

  if (!existingItem) {
    throw new Error(
      `Subscription not found for update: ${subscriptionData.userId}`,
    );
  }

  const timestamp = new Date().toISOString();

  // Preserve original createdAt at root level, update everything else
  const updatedItem: DynamoDBItem<Subscription> = {
    ...existingItem,
    attributes: {
      ...subscriptionData,
      entityType: "subscription",
    },
    updatedAt: timestamp, // Update timestamp at root level
    // createdAt preserved from existingItem (not modified)
  };

  const result = await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Subscription updated successfully:", {
    userId: subscriptionData.userId,
    tier: subscriptionData.tier,
    status: subscriptionData.status,
    stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
    originalCreatedAt: existingItem.createdAt,
  });

  return result;
}

/**
 * Get subscription by userId
 * Returns null if no subscription exists (user is on free tier)
 * Adds createdAt/updatedAt from root level to attributes
 */
export async function getSubscription(
  userId: string,
): Promise<Subscription | null> {
  const item = await loadFromDynamoDB<Subscription>(
    `user#${userId}`,
    "subscription",
    "subscription",
  );

  if (!item) {
    return null;
  }

  // Add timestamps from root level (stored as ISO strings, returned as Date objects)
  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Delete a subscription from DynamoDB
 * Called when subscription is fully deleted (not just canceled)
 */
export async function deleteSubscription(userId: string): Promise<void> {
  try {
    await deleteFromDynamoDB(`user#${userId}`, "subscription", "subscription");
    console.info("Subscription deleted successfully:", {
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      console.warn(
        `Subscription not found for user ${userId}, skipping delete`,
      );
      return; // Not an error - subscription might not exist
    }
    throw error;
  }
}

// ===========================
// EXERCISE OPERATIONS
// ===========================

/**
 * Save a single exercise to DynamoDB
 */
export async function saveExercise(exercise: Exercise): Promise<void> {
  const timestamp = new Date().toISOString();
  const completedAtDate =
    exercise.completedAt instanceof Date
      ? exercise.completedAt
      : new Date(exercise.completedAt);
  const dateStr = completedAtDate.toISOString().split("T")[0]; // YYYY-MM-DD

  // Build sort key with sequence for duplicate handling
  const sk = `exercise#${exercise.exerciseName}#${dateStr}#${exercise.workoutId}#${exercise.sequence}`;

  // Build GSI-1 keys for exercise name lookup
  const gsi1pk = `user#${exercise.userId}#exercise#${exercise.exerciseName}`;
  const gsi1sk = dateStr;

  const item = createDynamoDBItem<Exercise>(
    "exercise",
    `user#${exercise.userId}`,
    sk,
    exercise,
    timestamp,
  );

  // Add GSI-1 keys
  const itemWithGsi = {
    ...item,
    gsi1pk,
    gsi1sk,
  };

  await saveToDynamoDB(itemWithGsi);

  console.info("Exercise saved successfully:", {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    userId: exercise.userId,
    workoutId: exercise.workoutId,
    sequence: exercise.sequence,
  });
}

/**
 * Save multiple exercises to DynamoDB
 * Uses BatchWriteItem for efficient bulk inserts
 */
export async function saveExercises(
  exercises: Exercise[],
): Promise<{ successful: number; failed: number }> {
  if (exercises.length === 0) {
    return { successful: 0, failed: 0 };
  }

  const tableName = getTableName();
  const timestamp = new Date().toISOString();

  // DynamoDB BatchWriteItem supports max 25 items per request
  const batchSize = 25;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);

    const putRequests = batch.map((exercise) => {
      const completedAtDate =
        exercise.completedAt instanceof Date
          ? exercise.completedAt
          : new Date(exercise.completedAt);
      const dateStr = completedAtDate.toISOString().split("T")[0];

      const sk = `exercise#${exercise.exerciseName}#${dateStr}#${exercise.workoutId}#${exercise.sequence}`;
      const gsi1pk = `user#${exercise.userId}#exercise#${exercise.exerciseName}`;
      const gsi1sk = dateStr;

      const item = createDynamoDBItem<Exercise>(
        "exercise",
        `user#${exercise.userId}`,
        sk,
        exercise,
        timestamp,
      );

      return {
        PutRequest: {
          Item: serializeForDynamoDB({
            ...item,
            gsi1pk,
            gsi1sk,
          }),
        },
      };
    });

    try {
      await withThroughputScaling(async () => {
        const command = new BatchWriteCommand({
          RequestItems: {
            [tableName]: putRequests,
          },
        });
        await docClient.send(command);
        return { success: true };
      }, `BatchWrite ${batch.length} exercises`);

      successful += batch.length;
    } catch (error) {
      console.error("Batch write failed for exercises:", error);
      failed += batch.length;
    }
  }

  console.info("Exercise batch save completed:", {
    total: exercises.length,
    successful,
    failed,
  });

  return { successful, failed };
}

/**
 * Query exercises for a specific exercise name
 * Uses GSI-1 for efficient queries by exercise name sorted by date
 */
export async function queryExercises(
  userId: string,
  exerciseName: string,
  options?: {
    fromDate?: string; // YYYY-MM-DD
    toDate?: string; // YYYY-MM-DD
    limit?: number;
    sortOrder?: "asc" | "desc";
    lastEvaluatedKey?: string;
  },
): Promise<ExerciseHistoryQueryResult> {
  const tableName = getTableName();
  const gsi1pk = `user#${userId}#exercise#${exerciseName}`;

  // Build key condition for date range
  let keyConditionExpression = "gsi1pk = :gsi1pk";
  const expressionAttributeValues: Record<string, any> = {
    ":gsi1pk": gsi1pk,
  };

  if (options?.fromDate && options?.toDate) {
    keyConditionExpression += " AND gsi1sk BETWEEN :fromDate AND :toDate";
    expressionAttributeValues[":fromDate"] = options.fromDate;
    expressionAttributeValues[":toDate"] = options.toDate;
  } else if (options?.fromDate) {
    keyConditionExpression += " AND gsi1sk >= :fromDate";
    expressionAttributeValues[":fromDate"] = options.fromDate;
  } else if (options?.toDate) {
    keyConditionExpression += " AND gsi1sk <= :toDate";
    expressionAttributeValues[":toDate"] = options.toDate;
  }

  const result = await withThroughputScaling(async () => {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi1",
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: options?.sortOrder !== "desc", // true = ascending
      Limit: options?.limit,
      ExclusiveStartKey: options?.lastEvaluatedKey
        ? JSON.parse(options.lastEvaluatedKey)
        : undefined,
    });

    return docClient.send(command);
  }, `Query exercise history for ${exerciseName}`);

  const exercises: Exercise[] = (result.Items || []).map((item: any) => ({
    ...item.attributes,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    completedAt: new Date(item.attributes.completedAt),
    metadata: {
      ...item.attributes.metadata,
      extractedAt: new Date(item.attributes.metadata.extractedAt),
    },
  }));

  // Calculate aggregations
  const aggregations = calculateExerciseAggregations(exercises);

  return {
    exercises,
    aggregations,
    pagination: result.LastEvaluatedKey
      ? {
          lastEvaluatedKey: JSON.stringify(result.LastEvaluatedKey),
          hasMore: true,
        }
      : {
          hasMore: false,
        },
  };
}

/**
 * Calculate aggregated statistics for exercise history
 */
function calculateExerciseAggregations(exercises: Exercise[]) {
  if (exercises.length === 0) {
    return undefined;
  }

  let prWeight = 0;
  let prReps = 0;
  let prVolume = 0;
  let totalWeight = 0;
  let totalReps = 0;
  let weightCount = 0;
  let repsCount = 0;
  const disciplines = new Set<ExerciseDiscipline>();

  let firstPerformed = new Date();
  let lastPerformed = new Date(0);

  for (const exercise of exercises) {
    disciplines.add(exercise.discipline);

    const completedAt = new Date(exercise.completedAt);
    if (completedAt < firstPerformed) firstPerformed = completedAt;
    if (completedAt > lastPerformed) lastPerformed = completedAt;

    const metrics = exercise.metrics;
    if (metrics.maxWeight && metrics.maxWeight > prWeight) {
      prWeight = metrics.maxWeight;
    }
    if (metrics.reps && metrics.reps > prReps) {
      prReps = metrics.reps;
    }
    if (metrics.totalVolume && metrics.totalVolume > prVolume) {
      prVolume = metrics.totalVolume;
    }
    if (metrics.weight) {
      totalWeight += metrics.weight;
      weightCount++;
    }
    if (metrics.reps) {
      totalReps += metrics.reps;
      repsCount++;
    }
  }

  return {
    totalOccurrences: exercises.length,
    prWeight: prWeight || undefined,
    prReps: prReps || undefined,
    prVolume: prVolume || undefined,
    averageWeight: weightCount > 0 ? totalWeight / weightCount : undefined,
    averageReps: repsCount > 0 ? totalReps / repsCount : undefined,
    lastPerformed,
    firstPerformed,
    disciplines: Array.from(disciplines),
  };
}

/**
 * Query distinct exercise names for a user
 * Groups by exercise name and returns counts
 */
export async function queryExerciseNames(
  userId: string,
  options?: {
    discipline?: ExerciseDiscipline;
    limit?: number;
  },
): Promise<ExerciseNamesQueryResult> {
  // Query all exercises for the user
  const items = await queryFromDynamoDB<Exercise>(
    `user#${userId}`,
    "exercise#",
    "exercise",
  );

  // Group by exercise name
  const exerciseMap = new Map<
    string,
    {
      count: number;
      lastPerformed: Date;
      disciplines: Set<ExerciseDiscipline>;
      originalNames: Set<string>;
    }
  >();

  for (const item of items) {
    const exercise = item.attributes;

    // Filter by discipline if specified
    if (options?.discipline && exercise.discipline !== options.discipline) {
      continue;
    }

    const existing = exerciseMap.get(exercise.exerciseName);
    const completedAt = new Date(exercise.completedAt);

    if (existing) {
      existing.count++;
      if (completedAt > existing.lastPerformed) {
        existing.lastPerformed = completedAt;
      }
      existing.disciplines.add(exercise.discipline);
      existing.originalNames.add(exercise.originalName);
    } else {
      exerciseMap.set(exercise.exerciseName, {
        count: 1,
        lastPerformed: completedAt,
        disciplines: new Set([exercise.discipline]),
        originalNames: new Set([exercise.originalName]),
      });
    }
  }

  // Convert to array and sort by count (most frequent first)
  let exercises: ExerciseNameEntry[] = Array.from(exerciseMap.entries())
    .map(([exerciseName, data]) => ({
      exerciseName,
      displayName: generateDisplayName(exerciseName),
      count: data.count,
      lastPerformed: data.lastPerformed,
      disciplines: Array.from(data.disciplines),
    }))
    .sort((a, b) => b.count - a.count);

  // Apply limit if specified
  if (options?.limit) {
    exercises = exercises.slice(0, options.limit);
  }

  return {
    exercises,
    totalCount: exerciseMap.size,
  };
}

/**
 * Generate a human-readable display name from normalized snake_case name
 */
function generateDisplayName(normalizedName: string): string {
  return normalizedName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
