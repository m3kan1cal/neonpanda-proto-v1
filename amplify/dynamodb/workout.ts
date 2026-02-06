import {
  docClient,
  loadFromDynamoDB,
  saveToDynamoDB,
  queryFromDynamoDB,
  deleteFromDynamoDB,
  createDynamoDBItem,
  withThroughputScaling,
  getTableName,
  deepMerge,
  QueryCommand,
  DynamoDBItem,
} from "./core";
import { Workout, WorkoutSummary } from "../functions/libs/workout/types";

// ===========================
// WORKOUT OPERATIONS
// ===========================

/**
 * Save a workout session
 */
export async function saveWorkout(workout: Workout): Promise<void> {
  const item = createDynamoDBItem<Workout>(
    "workout",
    `user#${workout.userId}`,
    `workout#${workout.workoutId}`,
    workout,
    new Date().toISOString(),
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
    groupId: workout.groupId || "none",
    templateId: workout.templateId || "none",
  });
}

/**
 * Get a specific workout session
 */
export async function getWorkout(
  userId: string,
  workoutId: string,
): Promise<Workout | null> {
  const item = await loadFromDynamoDB<Workout>(
    `user#${userId}`,
    `workout#${workoutId}`,
    "workout",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Get the total count of workout sessions for a user
 */
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
  },
): Promise<number> {
  try {
    // Get all workout sessions for the user
    const allSessions = await queryFromDynamoDB<Workout>(
      `user#${userId}`,
      "workout#",
      "workout",
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
          session.attributes.workoutData.discipline === options.discipline,
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.workout_type === options.workoutType,
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.workoutData.location === options.location,
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter((session) =>
        session.attributes.coachIds.includes(options.coachId!),
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.attributes.extractionMetadata.confidence >=
          options.minConfidence!,
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

/**
 * Query workout summaries for analytics (lightweight)
 */
export async function queryWorkoutSummaries(
  userId: string,
  fromDate: Date,
  toDate: Date,
): Promise<WorkoutSummary[]> {
  const tableName = getTableName();
  const operationName = `Query workout summaries`;

  return withThroughputScaling(async () => {
    const fromDateIso = fromDate.toISOString();
    const toDateIso = toDate.toISOString();

    console.info("🔍 Workout summary query parameters:", {
      userId,
      fromDate: fromDateIso,
      toDate: toDateIso,
    });

    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :skPrefix)",
      FilterExpression:
        "#entityType = :entityType AND #completedAt BETWEEN :fromDate AND :toDate",
      // Only fetch the fields needed for analytics (significantly reduces data transfer)
      ProjectionExpression:
        "pk, sk, entityType, #attributes.workoutId, #attributes.completedAt, #attributes.summary, #attributes.workoutData.workout_name, #attributes.workoutData.discipline, #attributes.coachIds",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#sk": "sk",
        "#entityType": "entityType",
        "#attributes": "attributes",
        "#completedAt": "attributes.completedAt",
      },
      ExpressionAttributeValues: {
        ":pk": `user#${userId}`,
        ":skPrefix": "workout#",
        ":entityType": "workout",
        ":fromDate": fromDateIso,
        ":toDate": toDateIso,
      },
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as any[];

    console.info(`Workout summaries queried successfully:`, {
      userId,
      itemCount: items.length,
      dateRange: `${fromDateIso.split("T")[0]} to ${toDateIso.split("T")[0]}`,
    });

    // DIAGNOSTIC: If no items found, query without date filter to see if workouts exist at all
    if (items.length === 0) {
      try {
        const diagnosticCommand = new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :skPrefix)",
          FilterExpression: "#entityType = :entityType",
          ProjectionExpression:
            "sk, #attributes.workoutId, #attributes.completedAt",
          ExpressionAttributeNames: {
            "#pk": "pk",
            "#sk": "sk",
            "#entityType": "entityType",
            "#attributes": "attributes",
          },
          ExpressionAttributeValues: {
            ":pk": `user#${userId}`,
            ":skPrefix": "workout#",
            ":entityType": "workout",
          },
          Limit: 5,
        });

        const diagnosticResult = await docClient.send(diagnosticCommand);
        const diagnosticItems = (diagnosticResult.Items || []) as any[];

        console.warn(
          "⚠️ No workouts found in date range. Diagnostic query (no date filter):",
          {
            totalWorkoutsForUser:
              diagnosticItems.length > 0 ? `${diagnosticItems.length}+` : 0,
            sampleCompletedAts: diagnosticItems
              .map((item) => item.attributes?.completedAt)
              .filter(Boolean),
          },
        );
      } catch (diagnosticError) {
        console.warn(
          "⚠️ Diagnostic query failed (non-critical):",
          diagnosticError,
        );
      }
    }

    // Log first few completedAt values for debugging if items found
    if (items.length > 0 && items.length <= 5) {
      console.info("✅ Sample completedAt values from query results:", {
        samples: items.map((item) => ({
          workoutId: item.attributes?.workoutId,
          completedAt: item.attributes?.completedAt,
          completedAtType: typeof item.attributes?.completedAt,
        })),
      });
    }

    // Deserialize and format the items - return unwrapped summaries
    return items.map(
      (item): WorkoutSummary => ({
        workoutId: item.attributes?.workoutId,
        completedAt: new Date(item.attributes?.completedAt),
        summary: item.attributes?.summary,
        workoutName: item.attributes?.workoutData?.workout_name,
        discipline: item.attributes?.workoutData?.discipline,
        coachIds: item.attributes?.coachIds || [],
      }),
    );
  }, operationName);
}

/**
 * Query all workout sessions for a user with optional filtering
 */
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
  },
): Promise<Workout[]> {
  try {
    // Get all workout sessions for the user
    const allSessionItems = await queryFromDynamoDB<Workout>(
      `user#${userId}`,
      "workout#",
      "workout",
    );

    // Extract attributes and include timestamps
    let allSessions = allSessionItems.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

    // Apply filters
    let filteredSessions = allSessions;

    // Date filtering
    if (options?.fromDate || options?.toDate) {
      filteredSessions = filteredSessions.filter((session) => {
        const completedAt = session.completedAt;
        const sessionDate = new Date(completedAt);

        if (options.fromDate && sessionDate < options.fromDate) return false;
        if (options.toDate && sessionDate > options.toDate) return false;

        return true;
      });
    }

    // Discipline filtering
    if (options?.discipline) {
      filteredSessions = filteredSessions.filter(
        (session) => session.workoutData.discipline === options.discipline,
      );
    }

    // Workout type filtering
    if (options?.workoutType) {
      filteredSessions = filteredSessions.filter(
        (session) => session.workoutData.workout_type === options.workoutType,
      );
    }

    // Location filtering
    if (options?.location) {
      filteredSessions = filteredSessions.filter(
        (session) => session.workoutData.location === options.location,
      );
    }

    // Coach filtering
    if (options?.coachId) {
      filteredSessions = filteredSessions.filter((session) =>
        session.coachIds.includes(options.coachId!),
      );
    }

    // Confidence filtering
    if (options?.minConfidence) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          session.extractionMetadata.confidence >= options.minConfidence!,
      );
    }

    // Sorting
    if (options?.sortBy) {
      filteredSessions.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (options.sortBy) {
          case "completedAt":
            aValue = new Date(a.completedAt);
            bValue = new Date(b.completedAt);
            break;
          case "confidence":
            aValue = a.extractionMetadata.confidence;
            bValue = b.extractionMetadata.confidence;
            break;
          case "workoutName":
            aValue = a.workoutData.workout_name || "";
            bValue = b.workoutData.workout_name || "";
            break;
          default:
            aValue = new Date(a.completedAt);
            bValue = new Date(b.completedAt);
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return options.sortOrder === "desc" ? -comparison : comparison;
      });
    } else {
      // Default sort by completedAt descending (most recent first)
      filteredSessions.sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
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

/**
 * Update a workout session
 */
export async function updateWorkout(
  userId: string,
  workoutId: string,
  updates: Partial<Workout>,
): Promise<Workout> {
  // Load the full DynamoDB item (needed for pk/sk/timestamps)
  const existingItem = await loadFromDynamoDB<Workout>(
    `user#${userId}`,
    `workout#${workoutId}`,
    "workout",
  );

  if (!existingItem) {
    throw new Error(`Workout not found: ${workoutId}`);
  }

  // Deep merge updates into existing session to preserve nested properties
  const updatedSession: Workout = deepMerge(existingItem.attributes, updates);

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
    ...existingItem,
    attributes: updatedSession,
    updatedAt: new Date().toISOString(),
  };

  console.info("About to save workout update to DynamoDB:", {
    workoutId,
    userId,
    updateFields: Object.keys(updates),
    originalConfidence: existingItem.attributes.extractionMetadata.confidence,
    newConfidence: updatedSession.extractionMetadata.confidence,
  });

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Successfully updated workout in DynamoDB");

  return updatedSession;
}

/**
 * Delete a workout session
 */
export async function deleteWorkout(
  userId: string,
  workoutId: string,
): Promise<void> {
  try {
    await deleteFromDynamoDB(
      `user#${userId}`,
      `workout#${workoutId}`,
      "workout",
    );
    console.info("Workout deleted successfully:", {
      workoutId,
      userId,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) {
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
  groupId: string,
): Promise<Workout[]> {
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
        }),
      );
    }, `Query workouts by groupId: ${groupId}`);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const items = result.Items as DynamoDBItem<Workout>[];
    return items.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
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
  templateId: string,
): Promise<Workout[]> {
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
        }),
      );
    }, `Query workouts by templateId: ${templateId}`);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const items = result.Items as DynamoDBItem<Workout>[];
    return items.map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch (error: any) {
    console.error(
      `Error querying workouts by templateId ${templateId}:`,
      error,
    );
    throw error;
  }
}
