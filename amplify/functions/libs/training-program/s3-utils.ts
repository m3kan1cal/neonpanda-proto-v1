/**
 * S3 Utilities for Training Program Details Storage
 *
 * Handles storage and retrieval of detailed training program data (workout templates) in S3
 */

import { getObjectAsJson, putObjectAsJson } from '../s3-utils';
import { TrainingProgramDetails, WorkoutTemplate } from './types';

/**
 * Store training program details (workout templates) in S3
 */
export async function storeTrainingProgramDetailsInS3(
  programId: string,
  userId: string,
  coachId: string,
  dailyWorkoutTemplates: WorkoutTemplate[],
  programContext: TrainingProgramDetails['programContext'],
  metadata: {
    generatedBy: string;
    aiModel: string;
    confidence: number;
    generationPrompt?: string;
  }
): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // S3 key structure: training-programs/userId/programId_timestamp.json
    const key = `training-programs/${userId}/${programId}_${timestamp}.json`;

    const programDetails: TrainingProgramDetails = {
      programId,
      programContext,
      dailyWorkoutTemplates,
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
        templateCount: String(dailyWorkoutTemplates.length),
        generatedAt: new Date().toISOString(),
      },
    });

    console.info('Successfully stored program details in S3:', {
      key,
      programId,
      userId,
      coachId,
      templateCount: dailyWorkoutTemplates.length,
    });

    return key;
  } catch (error) {
    console.error('Failed to store program details in S3:', error);
    throw error;
  }
}

/**
 * Retrieve training program details from S3
 */
export async function getTrainingProgramDetailsFromS3(
  s3Key: string
): Promise<TrainingProgramDetails | null> {
  try {
    const programDetails = await getObjectAsJson<TrainingProgramDetails>(s3Key);

    // Deserialize dates
    programDetails.generationMetadata.generatedAt = new Date(
      programDetails.generationMetadata.generatedAt
    );
    programDetails.dailyWorkoutTemplates = programDetails.dailyWorkoutTemplates.map((template) => ({
      ...template,
      completedAt: template.completedAt ? new Date(template.completedAt) : null,
      userFeedback: template.userFeedback
        ? {
            ...template.userFeedback,
            timestamp: new Date(template.userFeedback.timestamp),
          }
        : null,
      adaptationHistory: template.adaptationHistory.map((adaptation) => ({
        ...adaptation,
        timestamp: new Date(adaptation.timestamp),
      })),
    }));

    console.info('Successfully retrieved program details from S3:', {
      key: s3Key,
      programId: programDetails.programId,
      templateCount: programDetails.dailyWorkoutTemplates.length,
    });

    return programDetails;
  } catch (error) {
    console.error('Failed to retrieve program details from S3:', {
      error,
      key: s3Key,
    });
    return null;
  }
}

/**
 * Save updated training program details to S3 (replaces the existing key)
 */
export async function saveTrainingProgramDetailsToS3(
  s3Key: string,
  programDetails: TrainingProgramDetails
): Promise<string> {
  try {
    await putObjectAsJson(s3Key, programDetails, {
      pretty: true,
    });

    console.info('Successfully saved program details to S3:', {
      key: s3Key,
      programId: programDetails.programId,
      templateCount: programDetails.dailyWorkoutTemplates.length,
    });

    return s3Key;
  } catch (error) {
    console.error('Failed to save program details to S3:', error);
    throw error;
  }
}

/**
 * Update a specific workout template in S3 training program details (DEPRECATED - use saveProgramDetailsToS3)
 */
export async function updateWorkoutInS3(
  s3Key: string,
  dayNumber: number,
  updates: Partial<WorkoutTemplate>
): Promise<string> {
  try {
    // Get existing training program details
    const programDetails = await getTrainingProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      throw new Error(`Training program details not found in S3: ${s3Key}`);
    }

    // Find and update the specific workout template
    const templateIndex = programDetails.dailyWorkoutTemplates.findIndex(
      (w: WorkoutTemplate) => w.dayNumber === dayNumber
    );

    if (templateIndex === -1) {
      throw new Error(
        `Template for day ${dayNumber} not found in program ${programDetails.programId}`
      );
    }

    // Merge updates
    programDetails.dailyWorkoutTemplates[templateIndex] = {
      ...programDetails.dailyWorkoutTemplates[templateIndex],
      ...updates,
    };

    // Store updated version with new timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const keyParts = s3Key.split('/');
    const fileName = keyParts[keyParts.length - 1];
    const programIdFromKey = fileName.split('_')[0];

    // Create new key with updated timestamp
    keyParts[keyParts.length - 1] = `${programIdFromKey}_${timestamp}.json`;
    const newKey = keyParts.join('/');

    await putObjectAsJson(newKey, programDetails, {
      pretty: true,
    });

    console.info('Successfully updated workout in S3:', {
      oldKey: s3Key,
      newKey,
      programId: programDetails.programId,
      dayNumber,
      updatedFields: Object.keys(updates),
    });

    return newKey;
  } catch (error) {
    console.error('Failed to update workout in S3:', error);
    throw error;
  }
}

/**
 * Get a specific workout template from S3 training program details
 */
export async function getWorkoutFromS3(
  s3Key: string,
  dayNumber: number
): Promise<WorkoutTemplate | null> {
  try {
    const programDetails = await getTrainingProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      return null;
    }

    const template = programDetails.dailyWorkoutTemplates.find(
      (w: WorkoutTemplate) => w.dayNumber === dayNumber
    );

    return template || null;
  } catch (error) {
    console.error('Failed to get workout template from S3:', error);
    return null;
  }
}

/**
 * Get multiple workout templates by day numbers
 */
export async function getMultipleWorkoutsFromS3(
  s3Key: string,
  dayNumbers: number[]
): Promise<WorkoutTemplate[]> {
  try {
    const programDetails = await getTrainingProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      return [];
    }

    const templates = programDetails.dailyWorkoutTemplates.filter((w: WorkoutTemplate) =>
      dayNumbers.includes(w.dayNumber)
    );

    return templates;
  } catch (error) {
    console.error('Failed to get multiple workout templates from S3:', error);
    return [];
  }
}

/**
 * Get workout templates for a specific phase
 */
export async function getWorkoutsForPhase(
  s3Key: string,
  phaseId: string
): Promise<WorkoutTemplate[]> {
  try {
    const programDetails = await getTrainingProgramDetailsFromS3(s3Key);

    if (!programDetails) {
      return [];
    }

    const templates = programDetails.dailyWorkoutTemplates.filter(
      (w: WorkoutTemplate) => w.phaseId === phaseId
    );

    return templates;
  } catch (error) {
    console.error('Failed to get workout templates for phase from S3:', error);
    return [];
  }
}
