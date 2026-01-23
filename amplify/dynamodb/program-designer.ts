import {
  loadFromDynamoDB,
  saveToDynamoDB,
  queryFromDynamoDB,
  deleteFromDynamoDB,
  createDynamoDBItem,
} from "./core";
import { ProgramDesignerSession } from "../functions/libs/program-designer/types";

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

  // Use startedAt for createdAt (stable timestamp) and lastActivity for updatedAt
  const item = {
    ...createDynamoDBItem<ProgramDesignerSession>(
      "programDesignerSession",
      `user#${session.userId}`,
      `programDesignerSession#${session.sessionId}`,
      session,
      session.lastActivity.toISOString(),
    ),
    createdAt: session.startedAt.toISOString(), // Override with stable startedAt
  };

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
