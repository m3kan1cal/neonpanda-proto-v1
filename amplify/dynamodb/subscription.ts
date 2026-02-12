import {
  loadFromDynamoDB,
  saveToDynamoDB,
  deleteFromDynamoDB,
  DynamoDBSaveResult,
  DynamoDBItem,
} from "./core";
import { Subscription } from "../functions/libs/subscription/types";
import { logger } from "../functions/libs/logger";

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

  logger.info("Subscription created successfully:", {
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

  logger.info("Subscription updated successfully:", {
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
    logger.info("Subscription deleted successfully:", {
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
      logger.warn(
        `Subscription not found for user ${userId}, skipping delete`,
      );
      return; // Not an error - subscription might not exist
    }
    throw error;
  }
}
