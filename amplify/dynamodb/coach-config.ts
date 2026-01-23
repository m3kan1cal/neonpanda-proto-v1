import {
  loadFromDynamoDB,
  saveToDynamoDB,
  queryFromDynamoDB,
  createDynamoDBItem,
  deepMerge,
} from "./core";
import {
  CoachConfig,
  CoachConfigSummary,
} from "../functions/libs/coach-creator/types";

// ===========================
// COACH CONFIG OPERATIONS
// ===========================

/**
 * Save coach config directly
 */
export async function saveCoachConfig(
  userId: string,
  coachConfig: CoachConfig,
  creationTimestamp?: string,
): Promise<void> {
  const timestamp = creationTimestamp || new Date().toISOString();
  const item = createDynamoDBItem<CoachConfig>(
    "coachConfig",
    `user#${userId}`,
    `coach#${coachConfig.coach_id}`,
    coachConfig,
    timestamp,
  );

  await saveToDynamoDB(item);
}

/**
 * Load coach config directly
 */
export async function getCoachConfig(
  userId: string,
  coachId: string,
): Promise<CoachConfig | null> {
  const item = await loadFromDynamoDB<CoachConfig>(
    `user#${userId}`,
    `coach#${coachId}`,
    "coachConfig",
  );
  if (!item) return null;

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Update coach config metadata (coach name, description, etc.)
 */
export async function updateCoachConfig(
  userId: string,
  coachId: string,
  updates: Partial<CoachConfig>,
): Promise<CoachConfig> {
  // Load the full DynamoDB item (needed for pk/sk/timestamps)
  const existingItem = await loadFromDynamoDB<CoachConfig>(
    `user#${userId}`,
    `coach#${coachId}`,
    "coachConfig",
  );

  if (!existingItem) {
    throw new Error(`Coach config not found: ${coachId}`);
  }

  // Deep merge updates into existing config to preserve nested properties
  const updatedCoachConfig: CoachConfig = deepMerge(
    existingItem.attributes,
    updates,
  );

  // Create updated item maintaining original timestamps but updating the updatedAt field
  const updatedItem = {
    ...existingItem,
    attributes: updatedCoachConfig,
    updatedAt: new Date().toISOString(),
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Coach config updated successfully:", {
    coachId,
    userId,
    updatedFields: Object.keys(updates),
  });

  return updatedCoachConfig;
}

/**
 * Load coach configs for a specific user (with limited properties)
 */
export async function queryCoachConfigs(
  userId: string,
): Promise<CoachConfigSummary[]> {
  try {
    // Use the generic query function to get all coach configs for the user
    const items = await queryFromDynamoDB<any>(
      `user#${userId}`,
      "coach#",
      "coachConfig",
    );

    console.info(
      `📊 queryCoachConfigs: Found ${items.length} coach configs for user ${userId}`,
    );
    console.info(
      `📊 Coach IDs:`,
      items.map((item) => item.attributes?.coach_id),
    );

    // Filter out archived coaches
    const activeCoaches = items.filter(
      (item) => item.attributes?.status !== "archived",
    );

    console.info(
      `📊 queryCoachConfigs: ${activeCoaches.length} active coaches after filtering archived`,
    );

    // Extract and return only the summary properties we need
    return activeCoaches.map((item) => {
      const {
        coach_id,
        coach_name,
        coach_description,
        selected_personality: { primary_template, selection_reasoning } = {},
        technical_config: {
          programming_focus,
          specializations,
          methodology,
          experience_level,
          training_frequency,
        } = {},
        metadata: {
          created_date,
          total_conversations,
          methodology_profile,
        } = {},
      } = item.attributes;

      return {
        coach_id,
        coach_name,
        coach_description,
        selected_personality: { primary_template, selection_reasoning },
        technical_config: {
          programming_focus,
          specializations,
          methodology,
          experience_level,
          training_frequency,
        },
        metadata: {
          created_date,
          total_conversations,
          methodology_profile,
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      };
    });
  } catch (error) {
    console.error(`Error loading coach configs for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Count coach configs for a user
 */
export async function queryCoachConfigsCount(
  userId: string,
): Promise<{ totalCount: number }> {
  try {
    // Get all coach configs for the user
    const allCoaches = await queryFromDynamoDB<CoachConfigSummary>(
      `user#${userId}`,
      "coach#",
      "coachConfig",
    );

    // Filter out archived coaches
    const activeCoaches = allCoaches.filter(
      (coach) => coach.attributes?.status !== "archived",
    );

    const totalCount = activeCoaches.length;

    console.info("Coach configs counted successfully:", {
      userId,
      totalFound: totalCount,
    });

    return { totalCount };
  } catch (error) {
    console.error(`Error counting coach configs for user ${userId}:`, error);
    throw error;
  }
}
