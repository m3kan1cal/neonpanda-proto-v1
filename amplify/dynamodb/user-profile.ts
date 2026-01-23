import {
  docClient,
  loadFromDynamoDB,
  saveToDynamoDB,
  createDynamoDBItem,
  withThroughputScaling,
  getTableName,
  deepMerge,
  QueryCommand,
  DynamoDBItem,
} from "./core";
import { UserProfile } from "../functions/libs/user/types";

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
