import {
  loadFromDynamoDB,
  saveToDynamoDB,
  createDynamoDBItem,
} from "./core";
import { ProgramInsights } from "../functions/libs/program/types";
import { logger } from "../functions/libs/logger";

// ===========================
// PROGRAM INSIGHTS OPERATIONS
// ===========================

/**
 * Upsert program insights to DynamoDB.
 *
 * One record per (userId, programId). The record is overwritten in place each
 * time build-program-insights regenerates the synthesis. No history is kept.
 */
export async function saveProgramInsights(
  insights: ProgramInsights,
): Promise<void> {
  const item = createDynamoDBItem<ProgramInsights>(
    "programInsights",
    `user#${insights.userId}`,
    `programInsights#${insights.programId}`,
    insights,
    new Date().toISOString(),
  );

  // GSI-1 mirrors the program GSI so we can list a user's program insights
  // alongside their programs if we ever need to.
  const itemWithGsi = {
    ...item,
    gsi1pk: `user#${insights.userId}`,
    gsi1sk: `programInsights#${insights.programId}`,
  };

  await saveToDynamoDB(itemWithGsi);

  logger.info("Program insights saved successfully:", {
    userId: insights.userId,
    programId: insights.programId,
    source: insights.source,
    inputs: insights.inputs,
    generatedAt: insights.generatedAt,
  });
}

/**
 * Load the latest program insights for a (userId, programId).
 * Returns null when no synthesis has been generated yet.
 */
export async function getProgramInsights(
  userId: string,
  programId: string,
): Promise<ProgramInsights | null> {
  const item = await loadFromDynamoDB<ProgramInsights>(
    `user#${userId}`,
    `programInsights#${programId}`,
    "programInsights",
  );

  if (!item) {
    return null;
  }

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}
