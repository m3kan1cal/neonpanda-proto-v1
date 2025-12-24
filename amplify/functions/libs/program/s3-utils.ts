/**
 * S3 Utilities for Training Program Details Storage
 *
 * Handles storage and retrieval of detailed training program data (workout templates) in S3
 */

import { getObjectAsJson, putObjectAsJson } from "../s3-utils";
import { ProgramDetails, WorkoutTemplate } from "./types";
import { parseCompletedAt } from "../analytics/date-utils";

/**
 * Store training program details (workout templates) in S3
 */
export async function storeProgramDetailsInS3(
  programId: string,
  userId: string,
  coachId: string,
  workoutTemplates: WorkoutTemplate[],
  programContext: ProgramDetails["programContext"],
  metadata: {
    generatedBy: string;
    aiModel: string;
    confidence: number;
    generationPrompt?: string;
  },
): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // S3 key structure: programs/userId/programId_timestamp.json
    const key = `programs/${userId}/${programId}_${timestamp}.json`;

    const programDetails: ProgramDetails = {
      programId,
      programContext,
      workoutTemplates,
      generationMetadata: {
        generatedAt: new Date(),
        generatedBy: metadata.generatedBy,
        aiModel: metadata.aiModel,
        confidence: metadata.confidence,
        generationPrompt: metadata.generationPrompt,
      },
    };

    await putObjectAsJson(key, programDetails, {
      pretty: true,
      metadata: {
        programId,
        userId,
        coachId,
        templateCount: String(workoutTemplates.length),
        generatedAt: new Date().toISOString(),
      },
    });

    console.info("Successfully stored program details in S3:", {
      key,
      programId,
      userId,
      coachId,
      templateCount: workoutTemplates.length,
    });

    return key;
  } catch (error) {
    console.error("Failed to store program details in S3:", error);
    throw error;
  }
}

/**
 * Retrieve training program details from S3
 */
export async function getProgramDetailsFromS3(
  s3Key: string,
): Promise<ProgramDetails | null> {
  try {
    const programDetails = await getObjectAsJson<ProgramDetails>(s3Key);

    // Deserialize dates
    programDetails.generationMetadata.generatedAt = new Date(
      programDetails.generationMetadata.generatedAt,
    );
    programDetails.workoutTemplates = programDetails.workoutTemplates.map(
      (template) => ({
        ...template,
        completedAt: template.completedAt
          ? parseCompletedAt(template.completedAt, "getProgramDetailsFromS3")
          : null,
        userFeedback: template.userFeedback
          ? {
              ...template.userFeedback,
              timestamp: new Date(template.userFeedback.timestamp),
            }
          : null,
      }),
    );

    console.info("Successfully retrieved program details from S3:", {
      key: s3Key,
      programId: programDetails.programId,
      templateCount: programDetails.workoutTemplates.length,
    });

    return programDetails;
  } catch (error) {
    console.error("Failed to retrieve program details from S3:", {
      error,
      key: s3Key,
    });
    return null;
  }
}

/**
 * Save updated training program details to S3 (replaces the existing key)
 */
export async function saveProgramDetailsToS3(
  s3Key: string,
  programDetails: ProgramDetails,
): Promise<string> {
  try {
    await putObjectAsJson(s3Key, programDetails, {
      pretty: true,
    });

    console.info("Successfully saved program details to S3:", {
      key: s3Key,
      programId: programDetails.programId,
      templateCount: programDetails.workoutTemplates.length,
    });

    return s3Key;
  } catch (error) {
    console.error("Failed to save program details to S3:", error);
    throw error;
  }
}

/**
 * Update a specific workout template in S3 training program details (DEPRECATED - use saveProgramDetailsToS3)
 */
export async function updateWorkoutInS3(
  s3Key: string,
  dayNumber: number,
  updates: Partial<WorkoutTemplate>,
): Promise<string> {
  try {
    // Get existing training program details
    const programDetails = await getProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      throw new Error(`Training program details not found in S3: ${s3Key}`);
    }

    // Find and update the specific workout template
    const templateIndex = programDetails.workoutTemplates.findIndex(
      (w: WorkoutTemplate) => w.dayNumber === dayNumber,
    );

    if (templateIndex === -1) {
      throw new Error(
        `Template for day ${dayNumber} not found in program ${programDetails.programId}`,
      );
    }

    // Merge updates
    programDetails.workoutTemplates[templateIndex] = {
      ...programDetails.workoutTemplates[templateIndex],
      ...updates,
    };

    // Store updated version with new timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const keyParts = s3Key.split("/");
    const fileName = keyParts[keyParts.length - 1];
    const programIdFromKey = fileName.split("_")[0];

    // Create new key with updated timestamp
    keyParts[keyParts.length - 1] = `${programIdFromKey}_${timestamp}.json`;
    const newKey = keyParts.join("/");

    await putObjectAsJson(newKey, programDetails, {
      pretty: true,
    });

    console.info("Successfully updated workout in S3:", {
      oldKey: s3Key,
      newKey,
      programId: programDetails.programId,
      dayNumber,
      updatedFields: Object.keys(updates),
    });

    return newKey;
  } catch (error) {
    console.error("Failed to update workout in S3:", error);
    throw error;
  }
}

/**
 * Get a specific workout template from S3 training program details
 */
export async function getWorkoutFromS3(
  s3Key: string,
  dayNumber: number,
): Promise<WorkoutTemplate | null> {
  try {
    const programDetails = await getProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      return null;
    }

    const template = programDetails.workoutTemplates.find(
      (w: WorkoutTemplate) => w.dayNumber === dayNumber,
    );

    return template || null;
  } catch (error) {
    console.error("Failed to get workout template from S3:", error);
    return null;
  }
}

/**
 * Get multiple workout templates by day numbers
 */
export async function getMultipleWorkoutsFromS3(
  s3Key: string,
  dayNumbers: number[],
): Promise<WorkoutTemplate[]> {
  try {
    const programDetails = await getProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      return [];
    }

    const templates = programDetails.workoutTemplates.filter(
      (w: WorkoutTemplate) => dayNumbers.includes(w.dayNumber),
    );

    return templates;
  } catch (error) {
    console.error("Failed to get multiple workout templates from S3:", error);
    return [];
  }
}

/**
 * Get workout templates for a specific phase (by day range)
 */
export async function getWorkoutsForPhase(
  s3Key: string,
  phaseStartDay: number,
  phaseEndDay: number,
): Promise<WorkoutTemplate[]> {
  try {
    const programDetails = await getProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      return [];
    }

    const templates = programDetails.workoutTemplates.filter(
      (w: WorkoutTemplate) =>
        w.dayNumber >= phaseStartDay && w.dayNumber <= phaseEndDay,
    );

    return templates;
  } catch (error) {
    console.error("Failed to get workout templates for phase from S3:", error);
    return [];
  }
}
