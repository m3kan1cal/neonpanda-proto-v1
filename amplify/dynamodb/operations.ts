import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  withThroughputScaling
} from "./throughput-scaling";
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
import {
  CoachConversation,
  CoachConversationListItem,
  CoachMessage,
  CoachConversationSummary,
} from "../functions/libs/coach-conversation/types";
import { UserProfile } from "../functions/libs/user/types";
import { UserMemory } from "../functions/libs/memory/types";
import { Workout } from "../functions/libs/workout/types";
import { WeeklyAnalytics, MonthlyAnalytics } from "../functions/libs/analytics/types";
import { TrainingProgram, TrainingProgramSummary } from "../functions/libs/training-program/types";

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
  users: DynamoDBItem<UserProfile>[];
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
  requireExists: boolean = false
): Promise<DynamoDBSaveResult> {
  const tableName = getTableName();
  const operationName = `Save ${item.entityType} to DynamoDB`;

  return withThroughputScaling(async () => {
    let serializedItem: any;
    let itemSizeBytes: number = 0;
    let itemSizeKB: string = 'unknown';

    try {
      // Serialize the entire item to handle any Date objects anywhere in the structure
      serializedItem = serializeForDynamoDB(item);

      // Check item size before saving (DynamoDB has 400KB limit)
      itemSizeBytes = JSON.stringify(serializedItem).length;
      itemSizeKB = (itemSizeBytes / 1024).toFixed(2);

      // Warn if approaching DynamoDB size limit
      if (itemSizeBytes > 350000) {
        console.warn(`⚠️ Large item approaching DynamoDB limit: ${itemSizeKB}KB (400KB max)`, {
          entityType: item.entityType,
          itemSizeKB
        });
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
        itemSizeKB
      };

      return result;

    } catch (error) {
      const errorResult: DynamoDBSaveResult = {
        success: false,
        itemSizeKB: itemSizeKB || 'unknown',
        errorDetails: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          code: (error as any)?.code || 'No code'
        }
      };

      console.error(`❌ Error saving ${item.entityType} data to DynamoDB:`, {
        ...errorResult,
        errorStack: error instanceof Error ? error.stack : 'No stack',
        pk: item.pk,
        sk: item.sk
      });

      // Still throw the error for backward compatibility, but also return result info
      throw error;
    }
  }, operationName);
}

// Enhanced save function that explicitly checks the result and provides detailed error info
export async function saveToDynamoDBWithResult<T>(
  item: DynamoDBItem<T>,
  requireExists: boolean = false
): Promise<DynamoDBSaveResult> {
  try {
    const result = await saveToDynamoDB(item, requireExists);

    // Explicit success verification
    if (!result.success) {
      console.error('🚨 DynamoDB save reported success=false:', result);
      throw new Error(`Save operation failed: ${result.errorDetails?.message || 'Unknown error'}`);
    }

    // Additional checks for suspicious results
    if (!result.httpStatusCode || result.httpStatusCode !== 200) {
      console.warn('⚠️ DynamoDB save completed but with unexpected status code:', result);
    }

    return result;
  } catch (error) {
    console.error('🚨 Exception during DynamoDB save operation:', error);
    throw error;
  }
}

// Generic function to load any item from DynamoDB
export async function loadFromDynamoDB<T>(
  pk: string,
  sk: string,
  entityType?: string
): Promise<DynamoDBItem<T> | null> {
  const tableName = getTableName();

  const operationName = `Load ${entityType || 'item'} from DynamoDB`;

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

// Generic function to query multiple items from DynamoDB
export async function queryFromDynamoDB<T>(
  pk: string,
  skPrefix: string,
  entityType?: string
): Promise<DynamoDBItem<T>[]> {
  const tableName = getTableName();

  const operationName = `Query ${entityType || 'items'} from DynamoDB`;

  return withThroughputScaling(async () => {
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
    });

    const result = await docClient.send(command);

    if (entityType) {
      console.info(`${entityType} data queried from DynamoDB successfully`);
    }

    const items = (result.Items as DynamoDBItem<T>[]) || [];

    // Deserialize all items to convert ISO strings back to Date objects
    return items.map((item) => deserializeFromDynamoDB(item));
  }, operationName);
}

// Generic function to delete an item from DynamoDB
export async function deleteFromDynamoDB(
  pk: string,
  sk: string,
  entityType?: string
): Promise<void> {
  const tableName = getTableName();
  const operationName = `Delete ${entityType || 'item'} from DynamoDB`;

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
        throw new Error(`${entityType || 'Item'} not found: ${pk}/${sk}`);
      }
      console.error(`Error deleting ${entityType || 'item'} from DynamoDB:`, error);
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
  timestamp: string
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
    formData.timestamp
  );

  await saveToDynamoDB(item);
}

// Simplified function to save coach config directly
export async function saveCoachConfig(
  userId: string,
  coachConfig: CoachConfig
): Promise<void> {
  const item = createDynamoDBItem<CoachConfig>(
    "coachConfig",
    `user#${userId}`,
    `coach#${coachConfig.coach_id}`,
    coachConfig,
    new Date().toISOString()
  );

  await saveToDynamoDB(item);
}

// Simplified function to load coach config directly
export async function getCoachConfig(
  userId: string,
  coachId: string
): Promise<DynamoDBItem<CoachConfig> | null> {
  return await loadFromDynamoDB<CoachConfig>(
    `user#${userId}`,
    `coach#${coachId}`,
    "coachConfig"
  );
}

// Function to update coach config metadata (coach name, description, etc.)
export async function updateCoachConfig(
  userId: string,
  coachId: string,
  updates: Partial<CoachConfig>
): Promise<CoachConfig> {
  // First load the existing coach config
  const existingConfig = await getCoachConfig(userId, coachId);

  if (!existingConfig) {
    throw new Error(`Coach config not found: ${coachId}`);
  }

  // Deep merge updates into existing config to preserve nested properties
  const updatedCoachConfig: CoachConfig = deepMerge(
    existingConfig.attributes,
    updates
  );

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingConfig,
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
  ttlDays?: number // Kept for backward compatibility but no longer used
): Promise<void> {
  // Note: TTL removed - coach creator sessions are permanent records
  // Only soft-deleted (isDeleted flag) when coach build succeeds
  // Hard-deleted only when user manually deletes incomplete session

  const item = createDynamoDBItem<CoachCreatorSession>(
    "coachCreatorSession",
    `user#${session.userId}`,
    `coachCreatorSession#${session.sessionId}`,
    session,
    session.lastActivity.toISOString()
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

    // Log undefined values for debugging while still preventing crashes
    if (undefinedKeys.length > 0) {
      console.warn("⚠️ Found undefined values in DynamoDB serialization:", {
        undefinedKeys,
        objectType: obj.constructor?.name || 'Object',
        objectKeys: Object.keys(obj)
      });
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
  sessionId: string
): Promise<DynamoDBItem<CoachCreatorSession> | null> {
  return await loadFromDynamoDB<CoachCreatorSession>(
    `user#${userId}`,
    `coachCreatorSession#${sessionId}`,
    "coachCreatorSession"
  );
}

// Function to delete a coach creator session
export async function deleteCoachCreatorSession(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `coachCreatorSession#${sessionId}`,
      "coachCreatorSession"
    );
    console.info("Coach creator session deleted successfully:", {
      sessionId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error(`Coach creator session ${sessionId} not found for user ${userId}`);
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
  }
): Promise<DynamoDBItem<CoachCreatorSession>[]> {
  try {
    // Get all coach creator sessions for the user
    const allSessions = await queryFromDynamoDB<CoachCreatorSession>(
      `user#${userId}`,
      "coachCreatorSession#",
      "coachCreatorSession"
    );

      // Apply filters
      let filteredSessions = allSessions;

      // Filter out soft-deleted sessions by default (unless explicitly requested)
      filteredSessions = filteredSessions.filter(
        (session) => !session.attributes.isDeleted
      );

      // Filter by completion status
      if (options?.isComplete !== undefined) {
        filteredSessions = filteredSessions.filter(
          (session) => session.attributes.isComplete === options.isComplete
        );
      }

      // Date filtering
      if (options?.fromDate || options?.toDate) {
        filteredSessions = filteredSessions.filter((session) => {
          const startedAt = new Date(session.attributes.startedAt);

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
              aValue = new Date(a.attributes.startedAt);
              bValue = new Date(b.attributes.startedAt);
              break;
            case "lastActivity":
              aValue = new Date(a.attributes.lastActivity);
              bValue = new Date(b.attributes.lastActivity);
              break;
            case "sessionId":
              aValue = a.attributes.sessionId;
              bValue = b.attributes.sessionId;
              break;
            default:
              aValue = new Date(a.attributes.lastActivity);
              bValue = new Date(b.attributes.lastActivity);
          }

          const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return options.sortOrder === "desc" ? -comparison : comparison;
        });
      } else {
        // Default sort by lastActivity descending (most recent first)
        filteredSessions.sort(
          (a, b) =>
            new Date(b.attributes.lastActivity).getTime() -
            new Date(a.attributes.lastActivity).getTime()
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
    console.error(`Error querying coach creator sessions for user ${userId}:`, error);
    throw error;
  }
}

// Function to load coach configs for a specific user (with limited properties)
export async function queryCoachConfigs(
  userId: string
): Promise<DynamoDBItem<CoachConfigSummary>[]> {
  try {
    // Use the generic query function to get all coach configs for the user
    const items = await queryFromDynamoDB<any>(
      `user#${userId}`,
      "coach#",
      "coachConfig"
    );

      console.info(`📊 queryCoachConfigs: Found ${items.length} coach configs for user ${userId}`);
      console.info(`📊 Coach IDs:`, items.map(item => item.attributes?.coach_id));

      // Filter out archived coaches
      const activeCoaches = items.filter((item) => item.attributes?.status !== "archived");

      console.info(`📊 queryCoachConfigs: ${activeCoaches.length} active coaches after filtering archived`);

      // Filter to include only the properties we need, leveraging the original structure
      return activeCoaches.map((item) => {
        const {
          coach_id,
          coach_name,
          selected_personality: { primary_template, selection_reasoning } = {},
          technical_config: {
            programming_focus,
            specializations,
            methodology,
            experience_level,
          } = {},
          metadata: { created_date, total_conversations } = {},
        } = item.attributes;

        return {
          ...item,
          attributes: {
            coach_id,
            coach_name,
            selected_personality: { primary_template, selection_reasoning },
            technical_config: {
              programming_focus,
              specializations,
              methodology,
              experience_level,
            },
            metadata: { created_date, total_conversations },
          },
        };
      });
  } catch (error) {
    console.error(`Error loading coach configs for user ${userId}:`, error);
    throw error;
  }
}

// Function to count coach configs for a user
export async function queryCoachConfigsCount(
  userId: string
): Promise<{ totalCount: number }> {
  try {
    // Get all coach configs for the user
    const allCoaches = await queryFromDynamoDB<CoachConfigSummary>(
      `user#${userId}`,
      "coach#",
      "coachConfig"
    );

    // Filter out archived coaches
    const activeCoaches = allCoaches.filter((coach) => coach.attributes?.status !== "archived");

    const totalCount = activeCoaches.length;

    console.info("Coach configs counted successfully:", {
      userId,
      totalFound: totalCount,
    });

    return { totalCount };
  } catch (error) {
    console.error(
      `Error counting coach configs for user ${userId}:`,
      error
    );
    throw error;
  }
}

// Function to save a coach conversation
export async function saveCoachConversation(
  conversation: CoachConversation
): Promise<void> {
  const item = createDynamoDBItem<CoachConversation>(
    "coachConversation",
    `user#${conversation.userId}`,
    `coachConversation#${conversation.coachId}#${conversation.conversationId}`,
    conversation,
    new Date().toISOString()
  );

  await saveToDynamoDB(item);
}

// Function to load a specific coach conversation
export async function getCoachConversation(
  userId: string,
  coachId: string,
  conversationId: string
): Promise<DynamoDBItem<CoachConversation> | null> {
  return await loadFromDynamoDB<CoachConversation>(
    `user#${userId}`,
    `coachConversation#${coachId}#${conversationId}`,
    "coachConversation"
  );
}

// Function to load conversation summaries for a user and specific coach (optimized - excludes messages)
export async function queryCoachConversations(
  userId: string,
  coachId: string
): Promise<DynamoDBItem<CoachConversationListItem>[]> {
  try {
    // Use the generic query function to get all coach conversations for the user + coach
    const items = await queryFromDynamoDB<any>(
      `user#${userId}`,
      `coachConversation#${coachId}#`,
      "coachConversation"
    );

      // Filter to exclude messages array, keeping only summary properties
      return items.map((item) => {
        const { messages, ...summaryAttributes } = item.attributes;

        return {
          ...item,
          attributes: summaryAttributes,
        };
      });
  } catch (error) {
    console.error(
      `Error loading coach conversations for user ${userId}, coach ${coachId}:`,
      error
    );
    throw error;
  }
}

// Function to load all conversations with full messages (for individual conversation access)
export async function queryCoachConversationsWithMessages(
  userId: string,
  coachId: string
): Promise<DynamoDBItem<CoachConversation>[]> {
  return await queryFromDynamoDB<CoachConversation>(
    `user#${userId}`,
    `coachConversation#${coachId}#`,
    "coachConversation"
  );
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
    stage: 'loading' | 'validation' | 'saving';
    message: string;
  };
}

// Function to send a message to a coach conversation
export async function sendCoachConversationMessage(
  userId: string,
  coachId: string,
  conversationId: string,
  messages: CoachMessage[]
): Promise<ConversationSaveResult> {
  let existingConversation;

  try {
    // First load the existing conversation
    existingConversation = await getCoachConversation(
      userId,
      coachId,
      conversationId
    );

    if (!existingConversation) {
      const errorResult: ConversationSaveResult = {
        success: false,
        conversationId,
        previousMessageCount: 0,
        newMessageCount: messages.length,
        messagesAdded: 0,
        dynamodbResult: {
          success: false,
          itemSizeKB: 'unknown',
          errorDetails: {
            message: `Conversation not found: ${conversationId}`,
            name: 'ConversationNotFound',
            code: 'CONVERSATION_NOT_FOUND'
          }
        },
        errorDetails: {
          stage: 'loading',
          message: `Conversation not found: ${conversationId}`
        }
      };

      console.error('❌ Conversation not found:', errorResult);
      throw new Error(`Conversation not found: ${conversationId}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Conversation not found')) {
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
        itemSizeKB: 'unknown',
        errorDetails: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          code: 'LOADING_ERROR'
        }
      },
      errorDetails: {
        stage: 'loading',
        message: error instanceof Error ? error.message : 'Unknown error loading conversation'
      }
    };

    console.error('❌ Error loading conversation:', errorResult);
    throw error;
  }

  // Update the conversation with new messages and metadata
  const existingMessages = existingConversation.attributes.messages || [];
  const updatedConversation: CoachConversation = {
    ...existingConversation.attributes,
    messages: [...existingMessages, ...messages],
    metadata: {
      ...existingConversation.attributes.metadata,
      lastActivity: new Date(),
      totalMessages: existingMessages.length + messages.length,
    },
  };

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingConversation,
    attributes: updatedConversation,
    updatedAt: new Date().toISOString(),
  };

  const previousMessageCount = existingConversation.attributes.messages?.length || 0;
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
          stage: 'saving',
          message: `DynamoDB save failed: ${saveResult.errorDetails?.message || 'Unknown error'}`
        }
      };

      console.error('❌ DynamoDB save failed:', errorResult);
      throw new Error(`DynamoDB save failed: ${saveResult.errorDetails?.message || 'Unknown error'}`);
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
        itemSizeKB: 'unknown',
        errorDetails: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          code: 'SAVE_ERROR'
        }
      },
      errorDetails: {
        stage: 'saving',
        message: error instanceof Error ? error.message : 'Unknown error during save'
      }
    };

    console.error('❌ Error during conversation save:', errorResult);
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
    dynamodbResult: saveResult
  };

  return result;
}

// Function to update conversation metadata (title, tags, isActive)
export async function updateCoachConversation(
  userId: string,
  coachId: string,
  conversationId: string,
  updateData: { title?: string; tags?: string[]; isActive?: boolean }
): Promise<CoachConversation> {
  // First load the existing conversation
  const existingConversation = await getCoachConversation(
    userId,
    coachId,
    conversationId
  );

  if (!existingConversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  // Prepare update with lastActivity timestamp
  const updates = {
    ...updateData,
    metadata: {
      ...(updateData.tags !== undefined && { tags: updateData.tags }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      lastActivity: new Date(),
    },
  };

  // Deep merge to preserve nested properties
  const updatedConversation: CoachConversation = deepMerge(
    existingConversation.attributes,
    updates
  );

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingConversation,
    attributes: updatedConversation,
    updatedAt: new Date().toISOString(),
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  return updatedConversation;
}

// Function to delete a coach conversation
export async function deleteCoachConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  // Since we don't know the coachId, we need to query for conversations and find the matching one
  const allConversations = await queryFromDynamoDB<any>(
    `user#${userId}`,
    "coachConversation#",
    "coachConversation"
  );

  const targetConversation = allConversations.find((conv) =>
    conv.sk.endsWith(`#${conversationId}`)
  );

  if (!targetConversation) {
    throw new Error(`Conversation ${conversationId} not found for user ${userId}`);
  }

  try {
    await deleteFromDynamoDB(
      targetConversation.pk,
      targetConversation.sk,
      "coachConversation"
    );
    console.info("Coach conversation deleted successfully:", {
      conversationId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error(`Conversation ${conversationId} not found for user ${userId}`);
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
    new Date().toISOString()
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
    groupId: workout.groupId || 'none',
    templateId: workout.templateId || 'none',
  });
}

// Function to get a specific workout session
export async function getWorkout(
  userId: string,
  workoutId: string
): Promise<DynamoDBItem<Workout> | null> {
  return await loadFromDynamoDB<Workout>(
    `user#${userId}`,
    `workout#${workoutId}`,
    "workout"
  );
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
  }
): Promise<number> {
  try {
    // Get all workout sessions for the user
    const allSessions = await queryFromDynamoDB<Workout>(
      `user#${userId}`,
      "workout#",
      "workout"
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
          session.attributes.workoutData.discipline === options.discipline
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.workout_type === options.workoutType
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.location === options.location
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter((session) =>
        session.attributes.coachIds.includes(options.coachId!)
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.extractionMetadata.confidence >=
          options.minConfidence!
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

// Lightweight function to query only workout summary fields
// Uses ProjectionExpression to avoid fetching full workout data (30KB+ per workout)
export async function queryWorkoutSummaries(
  userId: string,
  fromDate: Date,
  toDate: Date
): Promise<Array<{
  pk: string;
  sk: string;
  entityType: string;
  attributes: {
    workoutId: string;
    completedAt: Date;
    summary?: string;
    workoutName?: string;
    discipline?: string;
    coachIds: string[];
  };
}>> {
  const tableName = getTableName();
  const operationName = `Query workout summaries`;

  return withThroughputScaling(async () => {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :sk_prefix)",
      FilterExpression: "#entityType = :entityType AND #completedAt BETWEEN :fromDate AND :toDate",
      // Only fetch the fields needed for analytics (significantly reduces data transfer)
      ProjectionExpression: "pk, sk, entityType, #attributes.workoutId, #attributes.completedAt, #attributes.summary, #attributes.workoutData.workout_name, #attributes.workoutData.discipline, #attributes.coachIds",
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
      dateRange: `${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`,
    });

    // Deserialize and format the items
    return items.map((item) => ({
      pk: item.pk,
      sk: item.sk,
      entityType: item.entityType,
      attributes: {
        workoutId: item.attributes?.workoutId,
        completedAt: new Date(item.attributes?.completedAt),
        summary: item.attributes?.summary,
        workoutName: item.attributes?.workoutData?.workout_name,
        discipline: item.attributes?.workoutData?.discipline,
        coachIds: item.attributes?.coachIds || [],
      },
    }));
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
  }
): Promise<DynamoDBItem<Workout>[]> {
  try {
    // Get all workout sessions for the user
    const allSessions = await queryFromDynamoDB<Workout>(
      `user#${userId}`,
      "workout#",
      "workout"
    );

    // Apply filters
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
          session.attributes.workoutData.discipline === options.discipline
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.workout_type === options.workoutType
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.location === options.location
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter((session) =>
        session.attributes.coachIds.includes(options.coachId!)
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.extractionMetadata.confidence >=
          options.minConfidence!
      );
    }

    // Sorting
    if (options?.sortBy) {
      filteredSessions.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (options.sortBy) {
          case "completedAt":
            aValue = new Date(a.attributes.completedAt);
            bValue = new Date(b.attributes.completedAt);
            break;
          case "confidence":
            aValue = a.attributes.extractionMetadata.confidence;
            bValue = b.attributes.extractionMetadata.confidence;
            break;
          case "workoutName":
            aValue = a.attributes.workoutData.workout_name || "";
            bValue = b.attributes.workoutData.workout_name || "";
            break;
          default:
            aValue = new Date(a.attributes.completedAt);
            bValue = new Date(b.attributes.completedAt);
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return options.sortOrder === "desc" ? -comparison : comparison;
      });
    } else {
      // Default sort by completedAt descending (most recent first)
      filteredSessions.sort(
        (a, b) =>
          new Date(b.attributes.completedAt).getTime() -
          new Date(a.attributes.completedAt).getTime()
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
  updates: Partial<Workout>
): Promise<Workout> {
  // First get the existing workout session
  const existingSession = await getWorkout(userId, workoutId);

  if (!existingSession) {
    throw new Error(`Workout not found: ${workoutId}`);
  }

  // Deep merge updates into existing session to preserve nested properties
  const updatedSession: Workout = deepMerge(
    existingSession.attributes,
    updates
  );

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
    ...existingSession,
    attributes: updatedSession,
    updatedAt: new Date().toISOString(),
  };

  console.info("About to save workout update to DynamoDB:", {
    workoutId,
    userId,
    updateFields: Object.keys(updates),
    originalConfidence:
      existingSession.attributes.extractionMetadata.confidence,
    newConfidence: updatedSession.extractionMetadata.confidence,
  });

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Successfully updated workout in DynamoDB");

  return updatedSession;
}

// Function to delete a workout session
export async function deleteWorkout(
  userId: string,
  workoutId: string
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `workout#${workoutId}`,
      "workout"
    );
    console.info("Workout deleted successfully:", {
      workoutId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('not found')) {
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
  groupId: string
): Promise<DynamoDBItem<Workout>[]> {
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
        })
      );
    }, `Query workouts by groupId: ${groupId}`);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items as DynamoDBItem<Workout>[];
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
  templateId: string
): Promise<DynamoDBItem<Workout>[]> {
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
        })
      );
    }, `Query workouts by templateId: ${templateId}`);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items as DynamoDBItem<Workout>[];
  } catch (error: any) {
    console.error(`Error querying workouts by templateId ${templateId}:`, error);
    throw error;
  }
}

// Function to save a coach conversation summary
export async function saveCoachConversationSummary(
  summary: CoachConversationSummary
): Promise<void> {
  const item = createDynamoDBItem<CoachConversationSummary>(
    "conversationSummary",
    `user#${summary.userId}`,
    `conversation#${summary.conversationId}#summary`,
    summary,
    new Date().toISOString()
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
  conversationId: string
): Promise<DynamoDBItem<CoachConversationSummary> | null> {
  return await loadFromDynamoDB<CoachConversationSummary>(
    `user#${userId}`,
    `conversation#${conversationId}#summary`,
    "conversationSummary"
  );
}

// Function to query coach conversation summaries for a user
export async function queryConversationsCount(
  userId: string,
  coachId: string
): Promise<{ totalCount: number; totalMessages: number }> {
  try {
    // Get all conversations for the user and coach
    const allConversations = await queryFromDynamoDB<CoachConversationListItem>(
      `user#${userId}`,
      `coachConversation#${coachId}#`,
      "coachConversation"
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
      error
    );
    throw error;
  }
}

export async function queryCoachConversationSummaries(
  userId: string,
  coachId?: string
): Promise<DynamoDBItem<CoachConversationSummary>[]> {
  try {
    // Query all conversation summaries for the user
    const items = await queryFromDynamoDB<CoachConversationSummary>(
      `user#${userId}`,
      "conversation#",
      "conversationSummary"
    );

      // Filter by coach if specified
      const filteredItems = coachId
        ? items.filter((item) => item.attributes.coachId === coachId)
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
      error
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
    timestamp
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
  userId: string
): Promise<DynamoDBItem<UserProfile> | null> {
  return await loadFromDynamoDB<UserProfile>(
    `user#${userId}`,
    "profile",
    "user"
  );
}

/**
 * Get a user profile by email using GSI-1
 */
export async function getUserProfileByEmail(
  email: string
): Promise<DynamoDBItem<UserProfile> | null> {
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
        userIds: items.map(item => item.attributes.userId)
      });
    }

    console.info(`User profile found for email: ${email}`, {
      userId: items[0].attributes.userId,
      username: items[0].attributes.username
    });

    return items[0];
  }, operationName);
}

/**
 * Get a user profile by username using GSI-2
 */
export async function getUserProfileByUsername(
  username: string
): Promise<DynamoDBItem<UserProfile> | null> {
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
      console.warn(`⚠️ Multiple user profiles found for username: ${username}`, {
        count: items.length,
        userIds: items.map(item => item.attributes.userId)
      });
    }

    console.info(`User profile found for username: ${username}`, {
      userId: items[0].attributes.userId,
      email: items[0].attributes.email
    });

    return items[0];
  }, operationName);
}

/**
 * Update a user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  // First get the existing profile
  const existingProfile = await getUserProfile(userId);

  if (!existingProfile) {
    throw new Error(`User profile not found: ${userId}`);
  }

  // Deep merge updates into existing profile to preserve nested properties
  const updatedProfile: UserProfile = deepMerge(existingProfile.attributes, updates);

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingProfile,
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
    timestamp
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
  }
): Promise<UserMemory[]> {
  const items = await queryFromDynamoDB<UserMemory>(
    `user#${userId}`,
    "userMemory#",
    "userMemory"
  );

  let filteredItems = items.map((item) => item.attributes);

  // Filter by coach if specified
  if (coachId) {
    filteredItems = filteredItems.filter(
      (memory) => memory.coachId === coachId || !memory.coachId || memory.coachId === null // Include global memories
    );
  }

  // Filter by memory type if specified
  if (options?.memoryType) {
    filteredItems = filteredItems.filter(
      (memory) => memory.memoryType === options.memoryType
    );
  }

  // Filter by importance if specified
  if (options?.importance) {
    filteredItems = filteredItems.filter(
      (memory) => memory.metadata.importance === options.importance
    );
  }

  // Sort by importance, recency, and usage with balanced scoring
  filteredItems.sort((a, b) => {
    // Calculate composite scores for balanced ranking
    const getCompositeScore = (memory: UserMemory) => {
      // Importance score (high=3, medium=2, low=1)
      const importanceOrder: Record<UserMemory["metadata"]["importance"], number> = {
        high: 3, medium: 2, low: 1
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
    retrievalMethod?: 'semantic' | 'importance' | 'hybrid';
    conversationId?: string;
  }
): Promise<void> {
  const memory = await loadFromDynamoDB<UserMemory>(
    `user#${userId}`,
    `userMemory#${memoryId}`,
    "userMemory"
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
    if (!newTags.includes('frequently_used')) {
      newTags.push('frequently_used');
    }
  }

  if (memory.attributes.metadata.usageCount >= 10) {
    if (!newTags.includes('highly_accessed')) {
      newTags.push('highly_accessed');
    }
  }

  if (memory.attributes.metadata.usageCount >= 20) {
    if (!newTags.includes('critical_memory')) {
      newTags.push('critical_memory');
    }
  }

  // Add context-based tags from usage context
  if (usageContext?.contextTypes) {
    usageContext.contextTypes.forEach(contextType => {
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
  const daysSinceLastUsed = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastUsed <= 1) {
    if (!newTags.includes('recently_accessed')) {
      newTags.push('recently_accessed');
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
      const { storeMemoryInPinecone } = await import('../functions/libs/user/pinecone');
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
    usageContext: usageContext ? {
      hasUserMessage: !!usageContext.userMessage,
      contextTypes: usageContext.contextTypes,
      retrievalMethod: usageContext.retrievalMethod,
    } : null,
  });
}

/**
 * Delete a memory from DynamoDB
 */
export async function deleteMemory(
  userId: string,
  memoryId: string
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `userMemory#${memoryId}`,
      "userMemory"
    );
    console.info("Memory deleted successfully:", {
      memoryId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('not found')) {
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
  expressionAttributeValues?: Record<string, any>
): Promise<{
  items: DynamoDBItem<T>[];
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
      }
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

    return {
      items: items,
      lastEvaluatedKey: result.LastEvaluatedKey,
      count: items.length,
    };
  }, `Query all ${entityType} entities using GSI-3`);
}

/**
 * Query all active users from DynamoDB using GSI-3 (EntityType index)
 * Used for analytics and admin operations
 */
export async function queryAllUsers(
  limit?: number,
  exclusiveStartKey?: any
): Promise<QueryAllUsersResult> {
  const result = await queryAllEntitiesByType<UserProfile>(
    "user",
    limit,
    exclusiveStartKey,
    "attributes.metadata.isActive = :isActive",
    { ":isActive": true }
  );

  return {
    users: result.items,
    lastEvaluatedKey: result.lastEvaluatedKey,
    count: result.count,
  };
}

// Function to save weekly analytics data
export async function saveWeeklyAnalytics(
  weeklyAnalytics: WeeklyAnalytics
): Promise<void> {
  const item = createDynamoDBItem<WeeklyAnalytics>(
    "analytics",
    `user#${weeklyAnalytics.userId}`,
    `weeklyAnalytics#${weeklyAnalytics.weekId}`,
    weeklyAnalytics,
    new Date().toISOString()
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
  }
): Promise<DynamoDBItem<WeeklyAnalytics>[]> {
  try {
    // Get all weekly analytics for the user
    const allAnalytics = await queryFromDynamoDB<WeeklyAnalytics>(
      `user#${userId}`,
      "weeklyAnalytics#",
      "analytics"
    );

    // Apply filters
    let filteredAnalytics = allAnalytics;

    // Date filtering
    if (options?.fromDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const weekStart = new Date(analytics.attributes.weekStart);
        return weekStart >= options.fromDate!;
      });
    }

    if (options?.toDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const weekEnd = new Date(analytics.attributes.weekEnd);
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
          aValue = new Date(a.attributes.weekStart);
          bValue = new Date(b.attributes.weekStart);
          break;
        case "weekEnd":
          aValue = new Date(a.attributes.weekEnd);
          bValue = new Date(b.attributes.weekEnd);
          break;
        case "workoutCount":
          aValue = a.attributes.metadata.workoutCount;
          bValue = b.attributes.metadata.workoutCount;
          break;
        default:
          aValue = new Date(a.attributes.weekStart);
          bValue = new Date(b.attributes.weekStart);
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
      `Found ${filteredAnalytics.length} weekly analytics records for user ${userId}`
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
  weekId: string
): Promise<DynamoDBItem<WeeklyAnalytics> | null> {
  return await loadFromDynamoDB<WeeklyAnalytics>(
    `user#${userId}`,
    `weeklyAnalytics#${weekId}`,
    "analytics"
  );
}

// ===========================
// MONTHLY ANALYTICS OPERATIONS
// ===========================

// Function to save monthly analytics to DynamoDB
export async function saveMonthlyAnalytics(
  monthlyAnalytics: MonthlyAnalytics
): Promise<void> {
  const item = createDynamoDBItem<MonthlyAnalytics>(
    "analytics",
    `user#${monthlyAnalytics.userId}`,
    `monthlyAnalytics#${monthlyAnalytics.monthId}`,
    monthlyAnalytics,
    new Date().toISOString()
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
  }
): Promise<DynamoDBItem<MonthlyAnalytics>[]> {
  try {
    // Get all monthly analytics for the user
    const allAnalytics = await queryFromDynamoDB<MonthlyAnalytics>(
      `user#${userId}`,
      "monthlyAnalytics#",
      "analytics"
    );

    // Apply filters
    let filteredAnalytics = allAnalytics;

    // Date filtering
    if (options?.fromDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const monthStart = new Date(analytics.attributes.monthStart);
        return monthStart >= options.fromDate!;
      });
    }

    if (options?.toDate) {
      filteredAnalytics = filteredAnalytics.filter((analytics) => {
        const monthEnd = new Date(analytics.attributes.monthEnd);
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
          aValue = new Date(a.attributes.monthStart);
          bValue = new Date(b.attributes.monthStart);
          break;
        case "monthEnd":
          aValue = new Date(a.attributes.monthEnd);
          bValue = new Date(b.attributes.monthEnd);
          break;
        case "workoutCount":
          aValue = a.attributes.metadata.workoutCount;
          bValue = b.attributes.metadata.workoutCount;
          break;
        default:
          aValue = new Date(a.attributes.monthStart);
          bValue = new Date(b.attributes.monthStart);
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
      `Found ${filteredAnalytics.length} monthly analytics records for user ${userId}`
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
  monthId: string
): Promise<DynamoDBItem<MonthlyAnalytics> | null> {
  return await loadFromDynamoDB<MonthlyAnalytics>(
    `user#${userId}`,
    `monthlyAnalytics#${monthId}`,
    "analytics"
  );
}

// ===========================
// COACH TEMPLATE OPERATIONS
// ===========================

/**
 * Get all available coach templates
 */
export async function queryCoachTemplates(): Promise<
  DynamoDBItem<CoachTemplate>[]
> {
  try {
    // Query all coach templates using the global template partition
    const items = await queryFromDynamoDB<CoachTemplate>(
      "template#global",
      "coachTemplate#",
      "coachTemplate"
    );

      // Filter to only active templates and sort by popularity/name
      const activeTemplates = items.filter(
        (item) => item.attributes.metadata.is_active
      );

      // Sort by popularity score (desc) then by template name (asc)
      activeTemplates.sort((a, b) => {
        const popularityDiff =
          (b.attributes.metadata.popularity_score || 0) -
          (a.attributes.metadata.popularity_score || 0);
        if (popularityDiff !== 0) return popularityDiff;

        return a.attributes.template_name.localeCompare(
          b.attributes.template_name
        );
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
  templateId: string
): Promise<DynamoDBItem<CoachTemplate> | null> {
  return await loadFromDynamoDB<CoachTemplate>(
    "template#global",
    `coachTemplate#${templateId}`,
    "coachTemplate"
  );
}

/**
 * Create a coach config from a template
 */
export async function createCoachConfigFromTemplate(
  userId: string,
  templateId: string
): Promise<CoachConfig> {
  try {
    // Get the template
    const template = await getCoachTemplate(templateId);

    if (!template) {
      throw new Error(`Coach template not found: ${templateId}`);
    }

    if (!template.attributes.metadata.is_active) {
      throw new Error(`Coach template is not active: ${templateId}`);
    }

    // Generate new coach ID and timestamp
    const timestamp = Date.now();
    const newCoachId = `user_${userId}_coach_${timestamp}`;
    const currentDate = new Date().toISOString();

    // Copy the base_config and update necessary fields
    const newCoachConfig: CoachConfig = {
      ...template.attributes.base_config,
      coach_id: newCoachId,
      metadata: {
        ...template.attributes.base_config.metadata,
        created_date: currentDate,
        total_conversations: 0,
        user_satisfaction: null,
      },
    };

    // Save the new coach config
    await saveCoachConfig(userId, newCoachConfig);

    // Update template popularity score (optional - tracks usage)
    try {
      const updatedTemplate = {
        ...template,
        attributes: {
          ...template.attributes,
          metadata: {
            ...template.attributes.metadata,
            popularity_score:
              (template.attributes.metadata.popularity_score || 0) + 1,
          },
        },
        updatedAt: currentDate,
      };
      await saveToDynamoDB(updatedTemplate);
    } catch (popularityError) {
      // Don't fail the whole operation if popularity update fails
      console.warn("Failed to update template popularity:", popularityError);
    }

    console.info("Coach config created from template successfully:", {
      templateId,
      templateName: template.attributes.template_name,
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

// ===========================
// TRAINING PROGRAM OPERATIONS
// ===========================

/**
 * Save a training program to DynamoDB
 */
export async function saveTrainingProgram(
  program: TrainingProgram
): Promise<void> {
  // Use primary coach (first coach in coachIds array) for partition key
  const primaryCoachId = program.coachIds[0];

  if (!primaryCoachId) {
    throw new Error('Training program must have at least one coach');
  }

  const item = createDynamoDBItem<TrainingProgram>(
    "trainingProgram",
    `user#${program.userId}#coach#${primaryCoachId}`,
    `program#${program.programId}`,
    program,
    new Date().toISOString()
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
export async function getTrainingProgram(
  userId: string,
  coachId: string,
  programId: string
): Promise<DynamoDBItem<TrainingProgram> | null> {
  return await loadFromDynamoDB<TrainingProgram>(
    `user#${userId}#coach#${coachId}`,
    `program#${programId}`,
    "trainingProgram"
  );
}

/**
 * Query all training programs for a user and specific coach
 */
export async function queryTrainingProgramsByCoach(
  userId: string,
  coachId: string,
  options?: {
    status?: TrainingProgram["status"];
    limit?: number;
    sortOrder?: "asc" | "desc";
  }
): Promise<DynamoDBItem<TrainingProgram>[]> {
  try {
    // Query all programs for this user + coach combination
    const allPrograms = await queryFromDynamoDB<TrainingProgram>(
      `user#${userId}#coach#${coachId}`,
      "program#",
      "trainingProgram"
    );

    // Filter out archived programs by default
    let filteredPrograms = allPrograms.filter(
      (program) => program.attributes.status !== "archived"
    );

    // Filter by status if specified
    if (options?.status) {
      filteredPrograms = filteredPrograms.filter(
        (program) => program.attributes.status === options.status
      );
    }

    // Sort by startDate
    filteredPrograms.sort((a, b) => {
      const dateA = new Date(a.attributes.startDate).getTime();
      const dateB = new Date(b.attributes.startDate).getTime();
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
      error
    );
    throw error;
  }
}

/**
 * Query training programs for a user across all coaches using GSI-1
 */
export async function queryTrainingPrograms(
  userId: string,
  options?: {
    status?: TrainingProgram["status"];
    limit?: number;
    sortOrder?: "asc" | "desc";
  }
): Promise<DynamoDBItem<TrainingProgram>[]> {
  const tableName = getTableName();
  const operationName = `Query all programs for user ${userId}`;

  return withThroughputScaling(async () => {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :gsi1pk AND begins_with(gsi1sk, :gsi1sk_prefix)",
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
        ":entityType": "trainingProgram",
        ":archivedStatus": "archived",
        ...(options?.status && { ":status": options.status }),
      },
    });

    const result = await docClient.send(command);
    let programs = (result.Items || []) as DynamoDBItem<TrainingProgram>[];

    // Deserialize dates
    programs = programs.map((item) => deserializeFromDynamoDB(item));

    // Sort by startDate
    programs.sort((a, b) => {
      const dateA = new Date(a.attributes.startDate).getTime();
      const dateB = new Date(b.attributes.startDate).getTime();
      return options?.sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    // Apply limit if specified
    if (options?.limit) {
      programs = programs.slice(0, options.limit);
    }

    console.info("All training programs queried successfully:", {
      userId,
      totalFound: programs.length,
      filters: options,
    });

    return programs;
  }, operationName);
}

/**
 * Update a training program
 */
export async function updateTrainingProgram(
  userId: string,
  coachId: string,
  programId: string,
  updates: Partial<TrainingProgram>
): Promise<TrainingProgram> {
  // First load the existing program
  const existingProgram = await getTrainingProgram(userId, coachId, programId);

  if (!existingProgram) {
    throw new Error(`Training program not found: ${programId}`);
  }

  // Deep merge updates into existing program
  const updatedProgram: TrainingProgram = deepMerge(
    existingProgram.attributes,
    updates
  );

  // Recalculate adherence rate if workout counts changed
  if (updates.completedWorkouts !== undefined || updates.totalWorkouts !== undefined) {
    updatedProgram.adherenceRate =
      updatedProgram.totalWorkouts > 0
        ? updatedProgram.completedWorkouts / updatedProgram.totalWorkouts
        : 0;
  }

  // Create updated item
  const updatedItem = {
    ...existingProgram,
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
export async function deleteTrainingProgram(
  userId: string,
  coachId: string,
  programId: string
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}#coach#${coachId}`,
      `program#${programId}`,
      "trainingProgram"
    );
    console.info("Training program deleted successfully:", {
      programId,
      userId,
      coachId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error(`Training program ${programId} not found for user ${userId} and coach ${coachId}`);
    }
    throw error;
  }
}

/**
 * Get training program summaries for a user (lightweight, for list views)
 */
export async function queryTrainingProgramSummaries(
  userId: string,
  coachId?: string
): Promise<TrainingProgramSummary[]> {
  try {
    let programs: DynamoDBItem<TrainingProgram>[];

    if (coachId) {
      // Query programs for specific coach
      programs = await queryTrainingProgramsByCoach(userId, coachId);
    } else {
      // Query all programs across all coaches
      programs = await queryTrainingPrograms(userId);
    }

    // Map to lightweight summaries
    const summaries: TrainingProgramSummary[] = programs.map((program) => ({
      programId: program.attributes.programId,
      name: program.attributes.name,
      status: program.attributes.status,
      currentDay: program.attributes.currentDay,
      totalDays: program.attributes.totalDays,
      adherenceRate: program.attributes.adherenceRate,
      startDate: program.attributes.startDate,
      lastActivityAt: program.attributes.lastActivityAt,
      coachIds: program.attributes.coachIds,
      coachNames: program.attributes.coachNames,
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
      error
    );
    throw error;
  }
}

/**
 * Count training programs for a user
 */
export async function queryTrainingProgramsCount(
  userId: string,
  options?: {
    coachId?: string;
    status?: TrainingProgram["status"];
  }
): Promise<{ totalCount: number }> {
  try {
    let allPrograms: DynamoDBItem<TrainingProgram>[];

    if (options?.coachId) {
      allPrograms = await queryTrainingProgramsByCoach(userId, options.coachId);
    } else {
      allPrograms = await queryTrainingPrograms(userId);
    }

    // Filter by status if specified
    let filteredPrograms = allPrograms;
    if (options?.status) {
      filteredPrograms = allPrograms.filter(
        (program) => program.attributes.status === options.status
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
      error
    );
    throw error;
  }
}
