import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CoachCreatorSession, DynamoDBItem, ContactFormAttributes, CoachConfigSummary, CoachConfig } from "../functions/libs/coach-creator/types";


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
export async function loadCoachConfig(
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
export async function loadCoachCreatorSession(
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
export async function loadCoachConfigs(userId: string): Promise<DynamoDBItem<CoachConfigSummary>[]> {
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
