import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// DynamoDB client setup
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Generic DynamoDB item interface
export interface DynamoDBItem<T = any> {
  pk: string;
  sk: string;
  attributes: T;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}

// Contact form specific attributes interface
export interface ContactFormAttributes {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  contactType: string;
}

// Generic function to save any item to DynamoDB
export async function saveToDynamoDB<T>(item: DynamoDBItem<T>): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }

  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: item
    });

    await docClient.send(command);
    console.log(`${item.entityType} data saved to DynamoDB successfully`);
  } catch (error) {
    console.error(`Error saving ${item.entityType} data to DynamoDB:`, error);
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
export async function saveContactFormToDynamoDB(
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