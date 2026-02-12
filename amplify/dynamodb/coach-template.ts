import {
  docClient,
  loadFromDynamoDB,
  queryFromDynamoDB,
  withThroughputScaling,
  getTableName,
  UpdateCommand,
} from "./core";
import { saveCoachConfig } from "./coach-config";
import { logger } from "../functions/libs/logger";
import {
  CoachConfig,
  CoachTemplate,
} from "../functions/libs/coach-creator/types";

// ===========================
// COACH TEMPLATE OPERATIONS
// ===========================

/**
 * Get all available coach templates
 */
export async function queryCoachTemplates(): Promise<CoachTemplate[]> {
  try {
    // Query all coach templates using the global template partition
    const itemsWithDb = await queryFromDynamoDB<CoachTemplate>(
      "template#global",
      "coachTemplate#",
      "coachTemplate",
    );

    // Extract attributes
    const items = itemsWithDb.map((item) => item.attributes);

    // Filter to only active templates and sort by popularity/name
    const activeTemplates = items.filter((item) => item.metadata.is_active);

    // Sort by popularity score (desc) then by template name (asc)
    activeTemplates.sort((a, b) => {
      const popularityDiff =
        (b.metadata.popularity_score || 0) - (a.metadata.popularity_score || 0);
      if (popularityDiff !== 0) return popularityDiff;

      return a.template_name.localeCompare(b.template_name);
    });

    logger.info("Coach templates queried successfully:", {
      totalFound: items.length,
      activeTemplates: activeTemplates.length,
    });

    return activeTemplates;
  } catch (error) {
    logger.error("Error querying coach templates from DynamoDB:", error);
    throw error;
  }
}

/**
 * Get a specific coach template by template ID
 */
export async function getCoachTemplate(
  templateId: string,
): Promise<CoachTemplate | null> {
  const item = await loadFromDynamoDB<CoachTemplate>(
    "template#global",
    `coachTemplate#${templateId}`,
    "coachTemplate",
  );
  return item?.attributes ?? null;
}

/**
 * Atomically increment coach template popularity score
 * Uses DynamoDB atomic ADD operation to prevent race conditions
 *
 * @param templateId - The template ID
 * @returns The updated popularity score
 */
async function incrementTemplatePopularity(
  templateId: string,
): Promise<number> {
  const tableName = getTableName();
  const operationName = `Increment template popularity for ${templateId}`;

  return withThroughputScaling(async () => {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        pk: "template#global",
        sk: `coachTemplate#${templateId}`,
      },
      UpdateExpression:
        "SET #attrs.#metadata.#popularity = if_not_exists(#attrs.#metadata.#popularity, :zero) + :inc, updatedAt = :now",
      ExpressionAttributeNames: {
        "#attrs": "attributes",
        "#metadata": "metadata",
        "#popularity": "popularity_score",
      },
      ExpressionAttributeValues: {
        ":inc": 1,
        ":zero": 0,
        ":now": new Date().toISOString(),
      },
      // Ensure item exists before incrementing to prevent corrupted partial items
      ConditionExpression: "attribute_exists(pk)",
      ReturnValues: "UPDATED_NEW",
    });

    const result = await docClient.send(command);
    const newPopularity =
      (result.Attributes?.attributes?.metadata?.popularity_score as number) ||
      0;

    return newPopularity;
  }, operationName);
}

/**
 * Create a coach config from a template
 */
export async function createCoachConfigFromTemplate(
  userId: string,
  templateId: string,
): Promise<CoachConfig> {
  try {
    // Get the template
    const template = await getCoachTemplate(templateId);

    if (!template) {
      throw new Error(`Coach template not found: ${templateId}`);
    }

    if (!template.metadata.is_active) {
      throw new Error(`Coach template is not active: ${templateId}`);
    }

    // Generate new coach ID and timestamp
    const timestamp = Date.now();
    const newCoachId = `user_${userId}_coach_${timestamp}`;
    const currentDate = new Date().toISOString();

    // Copy the base_config and update necessary fields
    const newCoachConfig: CoachConfig = {
      ...template.base_config,
      coach_id: newCoachId,
      metadata: {
        ...template.base_config.metadata,
        created_date: currentDate,
        total_conversations: 0,
        user_satisfaction: null,
      },
    };

    // Save the new coach config
    await saveCoachConfig(userId, newCoachConfig);

    // Update template popularity score (atomic, prevents race conditions)
    try {
      await incrementTemplatePopularity(templateId);
    } catch (popularityError) {
      // Don't fail the whole operation if popularity update fails
      logger.warn("Failed to update template popularity:", popularityError);
    }

    logger.info("Coach config created from template successfully:", {
      templateId,
      templateName: template.template_name,
      userId,
      newCoachId,
      coachName: newCoachConfig.coach_name,
    });

    return newCoachConfig;
  } catch (error) {
    logger.error("Error creating coach config from template:", error);
    throw error;
  }
}
