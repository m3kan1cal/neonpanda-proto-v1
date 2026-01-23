import {
  docClient,
  withThroughputScaling,
  getTableName,
  QueryCommand,
  DynamoDBItem,
} from "./core";
import { UserProfile } from "../functions/libs/user/types";

// ===========================
// ADMIN QUERY INTERFACES
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

// ===========================
// ADMIN OPERATIONS
// ===========================

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
