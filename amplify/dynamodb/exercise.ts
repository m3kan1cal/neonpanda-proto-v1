import {
  docClient,
  saveToDynamoDB,
  queryFromDynamoDB,
  createDynamoDBItem,
  withThroughputScaling,
  getTableName,
  serializeForDynamoDB,
  QueryCommand,
  BatchWriteCommand,
} from "./core";
import type {
  Exercise,
  ExerciseHistoryQueryResult,
  ExerciseNamesQueryResult,
  ExerciseNameEntry,
  ExerciseDiscipline,
} from "../functions/libs/exercise/types";

// ===========================
// EXERCISE OPERATIONS
// ===========================

/**
 * Save a single exercise to DynamoDB
 */
export async function saveExercise(exercise: Exercise): Promise<void> {
  const timestamp = new Date().toISOString();
  const completedAtDate =
    exercise.completedAt instanceof Date
      ? exercise.completedAt
      : new Date(exercise.completedAt);
  const dateStr = completedAtDate.toISOString().split("T")[0]; // YYYY-MM-DD

  // Build sort key with sequence for duplicate handling
  const sk = `exercise#${exercise.exerciseName}#${dateStr}#${exercise.workoutId}#${exercise.sequence}`;

  // Build GSI-1 keys for exercise name lookup
  const gsi1pk = `user#${exercise.userId}#exercise#${exercise.exerciseName}`;
  const gsi1sk = dateStr;

  const item = createDynamoDBItem<Exercise>(
    "exercise",
    `user#${exercise.userId}`,
    sk,
    exercise,
    timestamp,
  );

  // Add GSI-1 keys
  const itemWithGsi = {
    ...item,
    gsi1pk,
    gsi1sk,
  };

  await saveToDynamoDB(itemWithGsi);

  console.info("Exercise saved successfully:", {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    userId: exercise.userId,
    workoutId: exercise.workoutId,
    sequence: exercise.sequence,
  });
}

/**
 * Save multiple exercises to DynamoDB
 * Uses BatchWriteItem for efficient bulk inserts
 */
export async function saveExercises(
  exercises: Exercise[],
): Promise<{ successful: number; failed: number }> {
  if (exercises.length === 0) {
    return { successful: 0, failed: 0 };
  }

  const tableName = getTableName();
  const timestamp = new Date().toISOString();

  // DynamoDB BatchWriteItem supports max 25 items per request
  const batchSize = 25;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);

    const putRequests = batch.map((exercise) => {
      const completedAtDate =
        exercise.completedAt instanceof Date
          ? exercise.completedAt
          : new Date(exercise.completedAt);
      const dateStr = completedAtDate.toISOString().split("T")[0];

      const sk = `exercise#${exercise.exerciseName}#${dateStr}#${exercise.workoutId}#${exercise.sequence}`;
      const gsi1pk = `user#${exercise.userId}#exercise#${exercise.exerciseName}`;
      const gsi1sk = dateStr;

      const item = createDynamoDBItem<Exercise>(
        "exercise",
        `user#${exercise.userId}`,
        sk,
        exercise,
        timestamp,
      );

      return {
        PutRequest: {
          Item: serializeForDynamoDB({
            ...item,
            gsi1pk,
            gsi1sk,
          }),
        },
      };
    });

    try {
      const result = await withThroughputScaling(async () => {
        const command = new BatchWriteCommand({
          RequestItems: {
            [tableName]: putRequests,
          },
        });
        const response = await docClient.send(command);
        return response;
      }, `BatchWrite ${batch.length} exercises`);

      // Check for unprocessed items
      const unprocessedCount =
        result.UnprocessedItems?.[tableName]?.length ?? 0;

      if (unprocessedCount > 0) {
        console.warn(
          `⚠️ Batch write partially succeeded: ${unprocessedCount} items unprocessed`,
        );
        successful += batch.length - unprocessedCount;
        failed += unprocessedCount;
      } else {
        successful += batch.length;
      }
    } catch (error) {
      console.error("Batch write failed for exercises:", error);
      failed += batch.length;
    }
  }

  console.info("Exercise batch save completed:", {
    total: exercises.length,
    successful,
    failed,
  });

  return { successful, failed };
}

/**
 * Query exercises for a specific exercise name
 * Uses GSI-1 for efficient queries by exercise name sorted by date
 */
export async function queryExercises(
  userId: string,
  exerciseName: string,
  options?: {
    fromDate?: string; // YYYY-MM-DD
    toDate?: string; // YYYY-MM-DD
    limit?: number;
    sortOrder?: "asc" | "desc";
    lastEvaluatedKey?: string;
  },
): Promise<ExerciseHistoryQueryResult> {
  const tableName = getTableName();
  const gsi1pk = `user#${userId}#exercise#${exerciseName}`;

  // Build key condition for date range
  let keyConditionExpression = "gsi1pk = :gsi1pk";
  const expressionAttributeValues: Record<string, any> = {
    ":gsi1pk": gsi1pk,
  };

  if (options?.fromDate && options?.toDate) {
    keyConditionExpression += " AND gsi1sk BETWEEN :fromDate AND :toDate";
    expressionAttributeValues[":fromDate"] = options.fromDate;
    expressionAttributeValues[":toDate"] = options.toDate;
  } else if (options?.fromDate) {
    keyConditionExpression += " AND gsi1sk >= :fromDate";
    expressionAttributeValues[":fromDate"] = options.fromDate;
  } else if (options?.toDate) {
    keyConditionExpression += " AND gsi1sk <= :toDate";
    expressionAttributeValues[":toDate"] = options.toDate;
  }

  const result = await withThroughputScaling(async () => {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi1",
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: options?.sortOrder !== "desc", // true = ascending
      Limit: options?.limit,
      ExclusiveStartKey: options?.lastEvaluatedKey
        ? JSON.parse(options.lastEvaluatedKey)
        : undefined,
    });

    return docClient.send(command);
  }, `Query exercise history for ${exerciseName}`);

  const exercises: Exercise[] = (result.Items || []).map((item: any) => ({
    ...item.attributes,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    completedAt: new Date(item.attributes.completedAt),
    metadata: {
      ...item.attributes.metadata,
      extractedAt: new Date(item.attributes.metadata.extractedAt),
    },
  }));

  // Calculate aggregations
  const aggregations = calculateExerciseAggregations(exercises);

  return {
    exercises,
    aggregations,
    pagination: result.LastEvaluatedKey
      ? {
          lastEvaluatedKey: JSON.stringify(result.LastEvaluatedKey),
          hasMore: true,
        }
      : {
          hasMore: false,
        },
  };
}

/**
 * Calculate aggregated statistics for exercise history
 */
function calculateExerciseAggregations(exercises: Exercise[]) {
  if (exercises.length === 0) {
    return undefined;
  }

  let prWeight = 0;
  let prReps = 0;
  let prVolume = 0;
  let totalWeight = 0;
  let totalReps = 0;
  let weightCount = 0;
  let repsCount = 0;
  const disciplines = new Set<ExerciseDiscipline>();

  let firstPerformed = new Date();
  let lastPerformed = new Date(0);

  for (const exercise of exercises) {
    disciplines.add(exercise.discipline);

    const completedAt = new Date(exercise.completedAt);
    if (completedAt < firstPerformed) firstPerformed = completedAt;
    if (completedAt > lastPerformed) lastPerformed = completedAt;

    const metrics = exercise.metrics;
    if (metrics.maxWeight && metrics.maxWeight > prWeight) {
      prWeight = metrics.maxWeight;
    }

    // For PR reps, use max from repsPerSet array if available, else use totalReps or reps (backwards compat)
    const exerciseMaxReps =
      metrics.repsPerSet && metrics.repsPerSet.length > 0
        ? Math.max(...metrics.repsPerSet)
        : metrics.totalReps || metrics.reps || 0;
    if (exerciseMaxReps > prReps) {
      prReps = exerciseMaxReps;
    }

    if (metrics.totalVolume && metrics.totalVolume > prVolume) {
      prVolume = metrics.totalVolume;
    }
    if (metrics.weight) {
      totalWeight += metrics.weight;
      weightCount++;
    }

    // Use totalReps for averages (new data), fall back to reps for old data
    const repsValue = metrics.totalReps || metrics.reps;
    if (repsValue) {
      totalReps += repsValue;
      repsCount++;
    }
  }

  return {
    totalOccurrences: exercises.length,
    prWeight: prWeight || undefined,
    prReps: prReps || undefined,
    prVolume: prVolume || undefined,
    averageWeight: weightCount > 0 ? totalWeight / weightCount : undefined,
    averageReps: repsCount > 0 ? totalReps / repsCount : undefined,
    lastPerformed,
    firstPerformed,
    disciplines: Array.from(disciplines),
  };
}

/**
 * Query distinct exercise names for a user
 * Groups by exercise name and returns counts
 */
export async function queryExerciseNames(
  userId: string,
  options?: {
    discipline?: ExerciseDiscipline;
    limit?: number;
  },
): Promise<ExerciseNamesQueryResult> {
  // Query all exercises for the user
  const items = await queryFromDynamoDB<Exercise>(
    `user#${userId}`,
    "exercise#",
    "exercise",
  );

  // Group by exercise name
  const exerciseMap = new Map<
    string,
    {
      count: number;
      lastPerformed: Date;
      disciplines: Set<ExerciseDiscipline>;
      originalNames: Set<string>;
    }
  >();

  for (const item of items) {
    const exercise = item.attributes;

    // Filter by discipline if specified
    if (options?.discipline && exercise.discipline !== options.discipline) {
      continue;
    }

    const existing = exerciseMap.get(exercise.exerciseName);
    const completedAt = new Date(exercise.completedAt);

    if (existing) {
      existing.count++;
      if (completedAt > existing.lastPerformed) {
        existing.lastPerformed = completedAt;
      }
      existing.disciplines.add(exercise.discipline);
      existing.originalNames.add(exercise.originalName);
    } else {
      exerciseMap.set(exercise.exerciseName, {
        count: 1,
        lastPerformed: completedAt,
        disciplines: new Set([exercise.discipline]),
        originalNames: new Set([exercise.originalName]),
      });
    }
  }

  // Convert to array and sort by count (most frequent first)
  let exercises: ExerciseNameEntry[] = Array.from(exerciseMap.entries())
    .map(([exerciseName, data]) => ({
      exerciseName,
      displayName: generateDisplayName(exerciseName),
      count: data.count,
      lastPerformed: data.lastPerformed,
      disciplines: Array.from(data.disciplines),
    }))
    .sort((a, b) => b.count - a.count);

  // Apply limit if specified
  if (options?.limit) {
    exercises = exercises.slice(0, options.limit);
  }

  return {
    exercises,
    totalCount: exerciseMap.size,
  };
}

/**
 * Query exercises count for a user
 * Returns count of unique exercise names, optionally filtered by discipline
 */
export async function queryExercisesCount(
  userId: string,
  options?: {
    discipline?: ExerciseDiscipline;
  },
): Promise<number> {
  try {
    // Query all exercises for the user
    const items = await queryFromDynamoDB<Exercise>(
      `user#${userId}`,
      "exercise#",
      "exercise",
    );

    // Count unique exercise names
    const exerciseNames = new Set<string>();

    for (const item of items) {
      const exercise = item.attributes;

      // Filter by discipline if specified
      if (options?.discipline && exercise.discipline !== options.discipline) {
        continue;
      }

      exerciseNames.add(exercise.exerciseName);
    }

    const uniqueCount = exerciseNames.size;

    console.info("Exercises counted successfully:", {
      userId,
      totalExercises: items.length,
      uniqueExercises: uniqueCount,
      filters: options,
    });

    return uniqueCount;
  } catch (error) {
    console.error(`Error counting exercises for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Generate a human-readable display name from normalized snake_case name
 */
function generateDisplayName(normalizedName: string): string {
  return normalizedName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
