import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { CoachCreatorSession, DynamoDBItem, ContactFormAttributes, CoachConfigSummary, CoachConfig } from "../functions/libs/coach-creator/types";
import { CoachConversation, CoachConversationListItem, CoachMessage, CoachConversationSummary, UserMemory } from "../functions/libs/coach-conversation/types";
import { Workout } from "../functions/libs/workout/types";

// DynamoDB client setup
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Generic function to save any item to DynamoDB
export async function saveToDynamoDB<T>(item: DynamoDBItem<T>): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }

  try {
    // Serialize the entire item to handle any Date objects anywhere in the structure
    const serializedItem = serializeForDynamoDB(item);

    // Debug: Log conversation items before saving
    if (item.entityType === 'coachConversation') {
      const conversationItem = item.attributes as any;
      const serializedConversation = serializedItem.attributes as any;
      console.info('About to serialize and save coach conversation:', {
        pk: item.pk,
        sk: item.sk,
        originalMessagesCount: conversationItem?.messages?.length || 0,
        serializedMessagesCount: serializedConversation?.messages?.length || 0,
        firstMessage: serializedConversation?.messages?.[0] ? {
          id: serializedConversation.messages[0].id,
          role: serializedConversation.messages[0].role,
          hasContent: !!serializedConversation.messages[0].content,
          timestamp: serializedConversation.messages[0].timestamp
        } : 'No messages'
      });
    }

    const command = new PutCommand({
      TableName: tableName,
      Item: serializedItem
    });

    await docClient.send(command);
    console.info(`${item.entityType} data saved to DynamoDB successfully`);
  } catch (error) {
    console.error(`Error saving ${item.entityType} data to DynamoDB:`, error);
    throw error;
  }
}

// Generic function to load any item from DynamoDB
export async function loadFromDynamoDB<T>(
  pk: string,
  sk: string,
  entityType?: string
): Promise<DynamoDBItem<T> | null> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }

  try {
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        pk,
        sk
      }
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
  } catch (error) {
    const errorEntityType = entityType || 'item';
    console.error(`Error loading ${errorEntityType} data from DynamoDB:`, error);
    throw error;
  }
}

// Generic function to query multiple items from DynamoDB
export async function queryFromDynamoDB<T>(
  pk: string,
  skPrefix: string,
  entityType?: string
): Promise<DynamoDBItem<T>[]> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }

  try {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
      FilterExpression: entityType ? '#entityType = :entityType' : undefined,
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
        ...(entityType && { '#entityType': 'entityType' })
      },
      ExpressionAttributeValues: {
        ':pk': pk,
        ':sk_prefix': skPrefix,
        ...(entityType && { ':entityType': entityType })
      }
    });

    const result = await docClient.send(command);

    if (entityType) {
      console.info(`${entityType} data queried from DynamoDB successfully`);
    }

    const items = (result.Items as DynamoDBItem<T>[]) || [];

    // Deserialize all items to convert ISO strings back to Date objects
    return items.map(item => deserializeFromDynamoDB(item));
  } catch (error) {
    const errorEntityType = entityType || 'items';
    console.error(`Error querying ${errorEntityType} data from DynamoDB:`, error);
    throw error;
  }
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
    updatedAt: timestamp
  };
}

// Specific function for contact form data (uses the generic function)
export async function saveContactForm(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
    contactType: string;
    timestamp: string;
  }
): Promise<void> {
  const attributes: ContactFormAttributes = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    subject: formData.subject,
    message: formData.message,
    contactType: formData.contactType
  };

  const item = createDynamoDBItem<ContactFormAttributes>(
    'contactForm',
    `contactForm#${formData.email}`,
    `timestamp#${formData.timestamp}`,
    attributes,
    formData.timestamp
  );

  await saveToDynamoDB(item);
}

// Simplified function to save coach config directly
export async function saveCoachConfig(userId: string, coachConfig: CoachConfig): Promise<void> {
  const item = createDynamoDBItem<CoachConfig>(
    'coachConfig',
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
    'coachConfig'
  );
}

// Simplified function to save coach creator session directly
export async function saveCoachCreatorSession(session: CoachCreatorSession, ttlDays?: number): Promise<void> {
  const calculatedTtlDays = ttlDays || (session.isComplete ? 30 : 7);
  const ttlTimestamp = Math.floor(Date.now() / 1000) + (calculatedTtlDays * 24 * 60 * 60);

  const item = createDynamoDBItem<CoachCreatorSession>(
    'coachCreatorSession',
    `user#${session.userId}`,
    `coachCreatorSession#${session.sessionId}`,
    session,
    session.lastActivity.toISOString()
  );

  // Add TTL to the item and use the generic saveToDynamoDB function (which handles Date serialization)
  const itemWithTTL = {
    ...item,
    ttl: ttlTimestamp
  };

  await saveToDynamoDB(itemWithTTL);
}

// Generic helper function to recursively convert all Date objects to ISO strings for DynamoDB storage
function serializeForDynamoDB(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeForDynamoDB(item));
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeForDynamoDB(value);
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

  if (typeof obj === 'string') {
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
    return obj.map(item => deserializeFromDynamoDB(item));
  }

  if (typeof obj === 'object') {
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
    'coachCreatorSession'
  );
}

// Function to load coach configs for a specific user (with limited properties)
export async function queryCoachConfigs(userId: string): Promise<DynamoDBItem<CoachConfigSummary>[]> {
  try {
    // Use the generic query function to get all coach configs for the user
    const items = await queryFromDynamoDB<any>(
      `user#${userId}`,
      'coach#',
      'coachConfig'
    );

    // Filter to include only the properties we need, leveraging the original structure
    return items.map(item => {
      const {
        coach_id,
        coach_name,
        selected_personality: { primary_template, selection_reasoning } = {},
        technical_config: { programming_focus, specializations, methodology, experience_level } = {},
        metadata: { created_date, total_conversations } = {}
      } = item.attributes;

      return {
        ...item,
        attributes: {
          coach_id,
          coach_name,
          selected_personality: { primary_template, selection_reasoning },
          technical_config: { programming_focus, specializations, methodology, experience_level },
          metadata: { created_date, total_conversations }
        }
      };
    });
  } catch (error) {
    console.error(`Error loading coach configs for user ${userId}:`, error);
    throw error;
  }
}

// Function to save a coach conversation
export async function saveCoachConversation(conversation: CoachConversation): Promise<void> {
  const item = createDynamoDBItem<CoachConversation>(
    'coachConversation',
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
    'coachConversation'
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
      'coachConversation'
    );

    // Filter to exclude messages array, keeping only summary properties
    return items.map(item => {
      const { messages, ...summaryAttributes } = item.attributes;

      return {
        ...item,
        attributes: summaryAttributes
      };
    });
  } catch (error) {
    console.error(`Error loading coach conversations for user ${userId}, coach ${coachId}:`, error);
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
    'coachConversation'
  );
}

// Function to send a message to a coach conversation
export async function sendCoachConversationMessage(
  userId: string,
  coachId: string,
  conversationId: string,
  messages: CoachMessage[]
): Promise<void> {
  // First load the existing conversation
  const existingConversation = await getCoachConversation(userId, coachId, conversationId);

  if (!existingConversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  // Debug: Log the existing conversation and new messages
  console.info('Updating conversation messages:', {
    conversationId,
    existingMessageCount: existingConversation.attributes.messages?.length || 0,
    newMessageCount: messages.length,
    messagesPreview: messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      contentLength: msg.content?.length || 0,
      timestamp: msg.timestamp
    }))
  });

  // Update the conversation with new messages and metadata
  const updatedConversation: CoachConversation = {
    ...existingConversation.attributes,
    messages,
    metadata: {
      ...existingConversation.attributes.metadata,
      lastActivity: new Date(),
      totalMessages: messages.length
    }
  };

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingConversation,
    attributes: updatedConversation,
    updatedAt: new Date().toISOString()
  };

  // Debug: Log what we're about to save
  console.info('About to save to DynamoDB:', {
    pk: updatedItem.pk,
    sk: updatedItem.sk,
    messagesCount: updatedItem.attributes.messages?.length || 0,
    totalMessages: updatedItem.attributes.metadata?.totalMessages
  });

  await saveToDynamoDB(updatedItem);

  // Debug: Confirm save completed
  console.info('Successfully saved conversation messages to DynamoDB');
}

// Function to update conversation metadata (title, tags, isActive)
export async function updateCoachConversation(
  userId: string,
  coachId: string,
  conversationId: string,
  updateData: { title?: string; tags?: string[]; isActive?: boolean }
): Promise<CoachConversation> {
  // First load the existing conversation
  const existingConversation = await getCoachConversation(userId, coachId, conversationId);

  if (!existingConversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  // Debug: Log the update operation
  console.info('Updating conversation metadata:', {
    conversationId,
    updateFields: Object.keys(updateData),
    updateData
  });

  // Update the conversation metadata
  const updatedConversation: CoachConversation = {
    ...existingConversation.attributes,
    ...(updateData.title !== undefined && { title: updateData.title }),
    metadata: {
      ...existingConversation.attributes.metadata,
      ...(updateData.tags !== undefined && { tags: updateData.tags }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      lastActivity: new Date()
    }
  };

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingConversation,
    attributes: updatedConversation,
    updatedAt: new Date().toISOString()
  };

  // Debug: Log what we're about to save
  console.info('About to save metadata update to DynamoDB:', {
    pk: updatedItem.pk,
    sk: updatedItem.sk,
    title: updatedItem.attributes.title,
    tags: updatedItem.attributes.metadata?.tags,
    isActive: updatedItem.attributes.metadata?.isActive
  });

  await saveToDynamoDB(updatedItem);

  // Debug: Confirm save completed
  console.info('Successfully saved conversation metadata to DynamoDB');

  return updatedConversation;
}

// Function to save a workout session
export async function saveWorkout(workout: Workout): Promise<void> {
  const item = createDynamoDBItem<Workout>(
    'workout',
    `user#${workout.userId}`,
    `workout#${workout.workoutId}`,
    workout,
    new Date().toISOString()
  );

  await saveToDynamoDB(item);

  console.info('Workout saved successfully:', {
    workoutId: workout.workoutId,
    userId: workout.userId,
    discipline: workout.workoutData.discipline,
    completedAt: workout.completedAt
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
    'workout'
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
      'workout#',
      'workout'
    );

    // Apply filters to get the count
    let filteredSessions = allSessions;

    // Date filtering
    if (options?.fromDate || options?.toDate) {
      filteredSessions = filteredSessions.filter(session => {
        const completedAt = session.attributes.completedAt;
        const sessionDate = new Date(completedAt);

        if (options.fromDate && sessionDate < options.fromDate) return false;
        if (options.toDate && sessionDate > options.toDate) return false;

        return true;
      });
    }

    // Discipline filtering
    if (options?.discipline) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.workoutData.discipline === options.discipline
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.workoutData.workout_type === options.workoutType
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.workoutData.location === options.location
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.coachIds.includes(options.coachId!)
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.extractionMetadata.confidence >= options.minConfidence!
      );
    }

    const totalCount = filteredSessions.length;

    console.info('Workouts counted successfully:', {
      userId,
      totalFound: allSessions.length,
      afterFiltering: totalCount,
      filters: options
    });

    return totalCount;
  } catch (error) {
    console.error(`Error counting workout sessions for user ${userId}:`, error);
    throw error;
  }
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
    sortBy?: 'completedAt' | 'confidence' | 'workoutName';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<DynamoDBItem<Workout>[]> {
  try {
    // Get all workout sessions for the user
    const allSessions = await queryFromDynamoDB<Workout>(
      `user#${userId}`,
      'workout#',
      'workout'
    );

    // Apply filters
    let filteredSessions = allSessions;

    // Date filtering
    if (options?.fromDate || options?.toDate) {
      filteredSessions = filteredSessions.filter(session => {
        const completedAt = session.attributes.completedAt;
        const sessionDate = new Date(completedAt);

        if (options.fromDate && sessionDate < options.fromDate) return false;
        if (options.toDate && sessionDate > options.toDate) return false;

        return true;
      });
    }

    // Discipline filtering
    if (options?.discipline) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.workoutData.discipline === options.discipline
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.workoutData.workout_type === options.workoutType
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.workoutData.location === options.location
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.coachIds.includes(options.coachId!)
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(session =>
        session.attributes.extractionMetadata.confidence >= options.minConfidence!
      );
    }

    // Sorting
    if (options?.sortBy) {
      filteredSessions.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (options.sortBy) {
          case 'completedAt':
            aValue = new Date(a.attributes.completedAt);
            bValue = new Date(b.attributes.completedAt);
            break;
          case 'confidence':
            aValue = a.attributes.extractionMetadata.confidence;
            bValue = b.attributes.extractionMetadata.confidence;
            break;
          case 'workoutName':
            aValue = a.attributes.workoutData.workout_name || '';
            bValue = b.attributes.workoutData.workout_name || '';
            break;
          default:
            aValue = new Date(a.attributes.completedAt);
            bValue = new Date(b.attributes.completedAt);
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    } else {
      // Default sort by completedAt descending (most recent first)
      filteredSessions.sort((a, b) =>
        new Date(b.attributes.completedAt).getTime() - new Date(a.attributes.completedAt).getTime()
      );
    }

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredSessions = filteredSessions.slice(offset, offset + limit);
    }

    console.info('Workouts queried successfully:', {
      userId,
      totalFound: allSessions.length,
      afterFiltering: filteredSessions.length,
      filters: options
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

  // Deep merge function for nested objects
  const deepMerge = (target: any, source: any): any => {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  };

  // Update the session with new data using deep merge
  const updatedSession: Workout = {
    ...existingSession.attributes,
    ...updates,
    // Deep merge workoutData if it exists in updates
    workoutData: updates.workoutData
      ? deepMerge(existingSession.attributes.workoutData, updates.workoutData)
      : existingSession.attributes.workoutData,
    // Sync root-level workoutName with workoutData.workout_name if it's being updated
    workoutName: updates.workoutData?.workout_name || existingSession.attributes.workoutName,
    // Always update the extraction metadata to track changes
    extractionMetadata: {
      ...existingSession.attributes.extractionMetadata,
      ...updates.extractionMetadata,
      // Track when the update was made
      reviewedAt: new Date()
    }
  };

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingSession,
    attributes: updatedSession,
    updatedAt: new Date().toISOString()
  };

  console.info('About to save workout update to DynamoDB:', {
    workoutId,
    userId,
    updateFields: Object.keys(updates),
    originalConfidence: existingSession.attributes.extractionMetadata.confidence,
    newConfidence: updatedSession.extractionMetadata.confidence
  });

  await saveToDynamoDB(updatedItem);

  console.info('Successfully updated workout in DynamoDB');

  return updatedSession;
}

// Function to delete a workout session
export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  console.info('Deleting workout from DynamoDB:', { userId, workoutId });

  // First check if the workout exists
  const existingWorkout = await getWorkout(userId, workoutId);
  if (!existingWorkout) {
    throw new Error(`Workout not found: ${workoutId}`);
  }

  // Delete the workout from DynamoDB
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }

  try {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: {
        pk: `user#${userId}`,
        sk: `workout#${workoutId}`
      }
    });

    await docClient.send(command);
    console.info('Successfully deleted workout from DynamoDB:', { userId, workoutId });
  } catch (error) {
    console.error('Error deleting workout from DynamoDB:', error);
    throw new Error(`Failed to delete workout: ${workoutId}`);
  }
}

// Function to save a coach conversation summary
export async function saveCoachConversationSummary(summary: CoachConversationSummary): Promise<void> {
  const item = createDynamoDBItem<CoachConversationSummary>(
    'conversationSummary',
    `user#${summary.userId}`,
    `conversation#${summary.conversationId}#summary`,
    summary,
    new Date().toISOString()
  );

  await saveToDynamoDB(item);

  console.info('Conversation summary saved successfully:', {
    summaryId: summary.summaryId,
    userId: summary.userId,
    conversationId: summary.conversationId,
    confidence: summary.metadata.confidence,
    messageCount: summary.metadata.messageRange.totalMessages,
    triggerReason: summary.metadata.triggerReason
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
    'conversationSummary'
  );
}

// Function to query coach conversation summaries for a user
export async function queryConversationsCount(
  userId: string,
  coachId: string
): Promise<number> {
  try {
    // Get all conversations for the user and coach
    const allConversations = await queryFromDynamoDB<CoachConversationListItem>(
      `user#${userId}`,
      `coachConversation#${coachId}#`,
      'coachConversation'
    );

    const totalCount = allConversations.length;

    console.info('Conversations counted successfully:', {
      userId,
      coachId,
      totalFound: totalCount
    });

    return totalCount;
  } catch (error) {
    console.error(`Error counting conversations for user ${userId} and coach ${coachId}:`, error);
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
      'conversation#',
      'conversationSummary'
    );

    // Filter by coach if specified
    const filteredItems = coachId
      ? items.filter(item => item.attributes.coachId === coachId)
      : items;

    console.info('Conversation summaries queried successfully:', {
      userId,
      coachId: coachId || 'all',
      totalFound: filteredItems.length
    });

    return filteredItems;
  } catch (error) {
    console.error(`Error querying conversation summaries for user ${userId}:`, error);
    throw error;
  }
}

// ===========================
// USER MEMORY OPERATIONS
// ===========================

/**
 * Save a user memory to DynamoDB
 */
export async function saveUserMemory(memory: UserMemory): Promise<void> {
  const timestamp = new Date().toISOString();

  const item = createDynamoDBItem<UserMemory>(
    'userMemory',
    `user#${memory.userId}`,
    `userMemory#${memory.memoryId}`,
    memory,
    timestamp
  );

  await saveToDynamoDB(item);
  console.info('User memory saved successfully:', {
    memoryId: memory.memoryId,
    userId: memory.userId,
    coachId: memory.coachId,
    type: memory.memoryType
  });
}

/**
 * Query user memories for a specific user and optionally coach
 */
export async function queryUserMemories(
  userId: string,
  coachId?: string,
  options?: {
    memoryType?: UserMemory['memoryType'];
    importance?: UserMemory['metadata']['importance'];
    limit?: number;
  }
): Promise<UserMemory[]> {
  const items = await queryFromDynamoDB<UserMemory>(
    `user#${userId}`,
    'userMemory#',
    'userMemory'
  );

  let filteredItems = items.map(item => item.attributes);

  // Filter by coach if specified
  if (coachId) {
    filteredItems = filteredItems.filter(memory =>
      memory.coachId === coachId || !memory.coachId // Include global memories
    );
  }

  // Filter by memory type if specified
  if (options?.memoryType) {
    filteredItems = filteredItems.filter(memory =>
      memory.memoryType === options.memoryType
    );
  }

  // Filter by importance if specified
  if (options?.importance) {
    filteredItems = filteredItems.filter(memory =>
      memory.metadata.importance === options.importance
    );
  }

  // Sort by usage and importance
  filteredItems.sort((a, b) => {
    // First sort by importance (high > medium > low)
    const importanceOrder = { high: 3, medium: 2, low: 1 };
    const importanceDiff = importanceOrder[b.metadata.importance] - importanceOrder[a.metadata.importance];
    if (importanceDiff !== 0) return importanceDiff;

    // Then by usage count
    const usageDiff = b.metadata.usageCount - a.metadata.usageCount;
    if (usageDiff !== 0) return usageDiff;

    // Finally by creation date (newest first)
    return new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime();
  });

  // Apply limit if specified
  if (options?.limit) {
    filteredItems = filteredItems.slice(0, options.limit);
  }

  console.info('User memories queried successfully:', {
    userId,
    coachId: coachId || 'all',
    totalFound: filteredItems.length,
    filtered: {
      memoryType: options?.memoryType,
      importance: options?.importance,
      limit: options?.limit
    }
  });

  return filteredItems;
}

/**
 * Update usage statistics for a user memory
 */
export async function updateUserMemory(memoryId: string, userId: string): Promise<void> {
  const memory = await loadFromDynamoDB<UserMemory>(
    `user#${userId}`,
    `userMemory#${memoryId}`,
    'userMemory'
  );

  if (!memory) {
    console.warn(`Memory ${memoryId} not found for user ${userId}`);
    return;
  }

  // Update usage statistics
  memory.attributes.metadata.usageCount += 1;
  memory.attributes.metadata.lastUsed = new Date();
  memory.updatedAt = new Date().toISOString();

  await saveToDynamoDB(memory);
  console.info('Memory usage updated:', {
    memoryId,
    userId,
    newUsageCount: memory.attributes.metadata.usageCount
  });
}
