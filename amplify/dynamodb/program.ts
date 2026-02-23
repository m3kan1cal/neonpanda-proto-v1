import {
  docClient,
  loadFromDynamoDB,
  saveToDynamoDB,
  queryFromDynamoDB,
  deleteFromDynamoDB,
  createDynamoDBItem,
  deserializeFromDynamoDB,
  withThroughputScaling,
  getTableName,
  deepMerge,
  QueryCommand,
  DynamoDBItem,
} from "./core";
import { Program, ProgramSummary } from "../functions/libs/program/types";
import { logger } from "../functions/libs/logger";

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

  logger.info("Training program saved successfully:", {
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
  logger.info("📋 Getting single program:", {
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
    logger.warn("⚠️ Program not found:", {
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
    logger.warn("⚠️ Program found but does not belong to requested coach:", {
      userId,
      programId,
      requestedCoachId: coachId,
      programCoachIds: program.coachIds,
    });
    return null; // Return null if coach doesn't match
  }

  logger.info("✅ Program loaded successfully:", {
    userId,
    programId,
    programName: program.name,
    coachIds: program.coachIds,
  });

  return program;
}

/**
 * Query all training programs for a user and specific coach
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
  logger.warn(
    "⚠️ DEPRECATED: queryProgramsByCoach() is deprecated. Use queryPrograms() instead.",
  );
  logger.warn(
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

    logger.info("Training programs queried successfully:", {
      userId,
      coachId,
      totalFound: allPrograms.length,
      afterFiltering: filteredPrograms.length,
      filters: options,
    });

    return filteredPrograms;
  } catch (error) {
    logger.error(
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
    includeArchived?: boolean;
    includeStatus?: string[]; // Array of statuses to include (e.g., ["active", "paused"]) - more explicit and safer
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
      // Build filter expression based on options
      // Note: DynamoDB requires separate placeholders for nested attribute paths
      const includeArchived = options?.includeArchived ?? false;
      let filterExpression = "#entityType = :entityType";

      // Build ExpressionAttributeValues dynamically
      const expressionAttributeValues: Record<string, any> = {
        ":gsi1pk": `user#${userId}`,
        ":gsi1skPrefix": "program#",
        ":entityType": "program",
      };

      // Handle includeStatus array (positive filter - explicit about what to show)
      // This is the most explicit filter and takes precedence over other status filters
      if (options?.includeStatus && options.includeStatus.length > 0) {
        // Use IN operator for multiple statuses
        const statusPlaceholders = options.includeStatus
          .map((_, index) => `:includeStatus${index}`)
          .join(", ");
        filterExpression += ` AND #attributes.#status IN (${statusPlaceholders})`;
        options.includeStatus.forEach((status, index) => {
          expressionAttributeValues[`:includeStatus${index}`] = status;
        });
      }
      // Handle specific status filter (single status - backward compatibility)
      // Only apply if includeStatus is not provided
      else if (options?.status) {
        filterExpression += " AND #attributes.#status = :status";
        expressionAttributeValues[":status"] = options.status;
      }
      // Handle includeArchived (backward compatibility)
      // Only apply if neither includeStatus nor status is provided
      else if (!includeArchived) {
        filterExpression += " AND #attributes.#status <> :archivedStatus";
        expressionAttributeValues[":archivedStatus"] = "archived";
      }

      // Build ExpressionAttributeNames dynamically to avoid DynamoDB
      // ValidationException for unused keys when no status filter is applied
      const expressionAttributeNames: Record<string, string> = {
        "#entityType": "entityType",
      };
      const statusFilterActive =
        (options?.includeStatus && options.includeStatus.length > 0) ||
        !!options?.status ||
        !includeArchived;
      if (statusFilterActive) {
        expressionAttributeNames["#attributes"] = "attributes";
        expressionAttributeNames["#status"] = "status";
      }

      const command = new QueryCommand({
        TableName: tableName,
        IndexName: "gsi1",
        KeyConditionExpression:
          "gsi1pk = :gsi1pk AND begins_with(gsi1sk, :gsi1skPrefix)",
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
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

    logger.info("All training programs queried successfully:", {
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
  logger.info("📝 Updating program:", {
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
    logger.warn("⚠️ Program not found for update:", {
      userId,
      programId,
      attemptedPk: `user#${userId}`,
    });
    throw new Error(`Training program not found: ${programId}`);
  }

  // Verify program belongs to this coach before allowing update
  if (coachId && !existingItem.attributes.coachIds?.includes(coachId)) {
    logger.warn("⚠️ Program found but does not belong to coach:", {
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

  logger.info("Training program updated successfully:", {
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
    logger.info("🗑️ Deleting program:", {
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

    logger.info("✅ Training program deleted successfully:", {
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
    logger.error("❌ Error deleting program:", error);
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

    logger.info("Training program summaries created:", {
      userId,
      coachId: coachId || "all",
      summaryCount: summaries.length,
    });

    return summaries;
  } catch (error) {
    logger.error(
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

    logger.info("Training programs counted successfully:", {
      userId,
      coachId: options?.coachId || "all",
      status: options?.status || "all",
      totalFound: totalCount,
    });

    return { totalCount };
  } catch (error) {
    logger.error(`Error counting training programs for user ${userId}:`, error);
    throw error;
  }
}
