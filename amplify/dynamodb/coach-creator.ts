import {
  loadFromDynamoDB,
  saveToDynamoDB,
  queryFromDynamoDB,
  deleteFromDynamoDB,
  createDynamoDBItem,
  deserializeFromDynamoDB,
  docClient,
  UpdateCommand,
  withThroughputScaling,
  getTableName,
} from "./core";
import { CoachCreatorSession } from "../functions/libs/coach-creator/types";
import { logger } from "../functions/libs/logger";

// ===========================
// COACH CREATOR SESSION OPERATIONS
// ===========================

/**
 * Save a coach creator session directly
 * Note: TTL removed - coach creator sessions are permanent records
 * Only soft-deleted (isDeleted flag) when coach build succeeds
 * Hard-deleted only when user manually deletes incomplete session
 */
export async function saveCoachCreatorSession(
  session: CoachCreatorSession,
  ttlDays?: number, // Kept for backward compatibility but no longer used
): Promise<void> {
  // Use startedAt for createdAt (stable timestamp) and lastActivity for updatedAt
  const item = {
    ...createDynamoDBItem<CoachCreatorSession>(
      "coachCreatorSession",
      `user#${session.userId}`,
      `coachCreatorSession#${session.sessionId}`,
      session,
      session.lastActivity.toISOString(),
    ),
    createdAt: session.startedAt.toISOString(), // Override with stable startedAt
  };

  // No TTL timestamp - sessions persist indefinitely
  await saveToDynamoDB(item);
}

/**
 * Load coach creator session directly
 */
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

/**
 * Update mutable metadata fields (currently: title) on a coach creator session.
 *
 * Uses a targeted UpdateExpression rather than load-merge-PutItem so a
 * concurrent stream-handler save appending to `conversationHistory` cannot
 * be silently overwritten — only `attributes.title` and
 * `attributes.lastActivity` are touched here.
 */
export async function updateCoachCreatorSession(
  userId: string,
  sessionId: string,
  updateData: { title?: string },
): Promise<CoachCreatorSession> {
  const nowIso = new Date().toISOString();

  const setClauses: string[] = [
    "#attrs.#lastActivity = :now",
    "updatedAt = :now",
  ];
  const names: Record<string, string> = {
    "#attrs": "attributes",
    "#lastActivity": "lastActivity",
  };
  const values: Record<string, any> = {
    ":now": nowIso,
  };

  if (updateData.title !== undefined) {
    setClauses.push("#attrs.#title = :title");
    names["#title"] = "title";
    values[":title"] = updateData.title;
  }

  return withThroughputScaling(async () => {
    try {
      const command = new UpdateCommand({
        TableName: getTableName(),
        Key: {
          pk: `user#${userId}`,
          sk: `coachCreatorSession#${sessionId}`,
        },
        UpdateExpression: `SET ${setClauses.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(pk)",
        ReturnValues: "ALL_NEW",
      });

      const result = await docClient.send(command);
      if (!result.Attributes?.attributes) {
        throw new Error(`Coach creator session not found: ${sessionId}`);
      }
      // Run through the same deserializer as loadFromDynamoDB so callers
      // get Date objects on `lastActivity` / `startedAt`, matching the
      // declared `Promise<CoachCreatorSession>` return type.
      return deserializeFromDynamoDB(
        result.Attributes.attributes,
      ) as CoachCreatorSession;
    } catch (error: any) {
      if (error?.name === "ConditionalCheckFailedException") {
        throw new Error(`Coach creator session not found: ${sessionId}`);
      }
      throw error;
    }
  }, `Update coach creator session ${sessionId}`);
}

/**
 * Delete a coach creator session
 */
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
    logger.info("Coach creator session deleted successfully:", {
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

/**
 * Query all coach creator sessions for a user with optional filtering and sorting
 */
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

    // Sorting (always apply, using defaults if not specified)
    const sortBy = options?.sortBy || "lastActivity";
    const sortOrder = options?.sortOrder || "desc";

    filteredSessions.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
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
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      filteredSessions = filteredSessions.slice(offset, offset + limit);
    }

    logger.info("Coach creator sessions queried successfully:", {
      userId,
      totalFound: allSessions.length,
      afterFiltering: filteredSessions.length,
      filters: options,
    });

    return filteredSessions;
  } catch (error) {
    logger.error(
      `Error querying coach creator sessions for user ${userId}:`,
      error,
    );
    throw error;
  }
}
