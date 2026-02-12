/**
 * S3 Utilities for Shared Program Storage
 *
 * Handles storage and retrieval of shared program details in S3.
 * Pattern: Follows program/s3-utils.ts structure
 * Uses centralized S3 operations from libs/s3-utils.ts
 */

import { getObjectAsJson, putObjectAsJson } from "../s3-utils";
import { SharedProgramDetails, SharedProgramSnapshot } from "./types";
import { ProgramDetails } from "../program/types";
import { logger } from "../logger";

/**
 * Store shared program details in S3
 * Pattern: Follows storeProgramDetailsInS3 from libs/program/s3-utils.ts
 *
 * @param sharedProgramId - The shared program ID
 * @param creatorUserId - User ID of the program creator
 * @param originalProgramDetails - Full program details from the original program
 * @param programSnapshot - Frozen snapshot of program metadata
 * @returns S3 key where the details were stored
 */
export async function storeSharedProgramDetailsInS3(
  sharedProgramId: string,
  creatorUserId: string,
  originalProgramDetails: ProgramDetails,
  programSnapshot: SharedProgramSnapshot,
): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // S3 key structure: sharedPrograms/{creatorUserId}/{sharedProgramId}_{timestamp}.json
    const key = `sharedPrograms/${creatorUserId}/${sharedProgramId}_${timestamp}.json`;

    const sharedProgramDetails: SharedProgramDetails = {
      sharedProgramId,
      programSnapshot,
      workoutTemplates: originalProgramDetails.workoutTemplates,
      generationMetadata: {
        sharedAt: new Date().toISOString(),
        originalProgramId: originalProgramDetails.programId,
        // Preserve original generation metadata for provenance tracking
        originalGeneratedBy:
          originalProgramDetails.generationMetadata?.generatedBy,
        originalAiModel: originalProgramDetails.generationMetadata?.aiModel,
        originalConfidence:
          originalProgramDetails.generationMetadata?.confidence,
        originalGenerationPrompt:
          originalProgramDetails.generationMetadata?.generationPrompt,
      },
    };

    await putObjectAsJson(key, sharedProgramDetails, {
      pretty: true,
      metadata: {
        sharedProgramId,
        creatorUserId,
        sharedAt: new Date().toISOString(),
        templateCount: String(originalProgramDetails.workoutTemplates.length),
      },
    });

    logger.info("Successfully stored shared program details in S3:", {
      key,
      sharedProgramId,
      creatorUserId,
      templateCount: originalProgramDetails.workoutTemplates.length,
    });

    return key;
  } catch (error) {
    logger.error("Failed to store shared program details in S3:", error);
    throw error;
  }
}

/**
 * Retrieve shared program details from S3
 *
 * @param s3Key - The S3 key for the shared program details
 * @returns Shared program details or null if not found
 */
export async function getSharedProgramDetailsFromS3(
  s3Key: string,
): Promise<SharedProgramDetails | null> {
  try {
    const details = await getObjectAsJson<SharedProgramDetails>(s3Key);

    logger.info("Successfully retrieved shared program details from S3:", {
      key: s3Key,
      sharedProgramId: details.sharedProgramId,
      templateCount: details.workoutTemplates.length,
    });

    return details;
  } catch (error) {
    logger.error("Failed to retrieve shared program details from S3:", {
      error,
      key: s3Key,
    });
    return null;
  }
}

/**
 * Select a sample of workout templates for preview purposes
 *
 * Returns up to maxSamples workout templates distributed evenly across the program.
 * If the program has maxSamples or fewer workouts, returns all of them.
 * For larger programs, samples are evenly distributed from beginning to end.
 *
 * @param workoutTemplates - Array of workout templates to sample from
 * @param maxSamples - Maximum number of samples to return (default: 4)
 * @returns Array of sampled workout templates
 */
export function selectSampleWorkouts(
  workoutTemplates: any[],
  maxSamples: number = 4,
): any[] {
  // Validate input
  if (!Array.isArray(workoutTemplates) || workoutTemplates.length === 0) {
    return [];
  }

  // Validate maxSamples
  if (maxSamples < 1) {
    return [];
  }

  // If we have fewer templates than max samples, return all of them
  if (workoutTemplates.length <= maxSamples) {
    return workoutTemplates;
  }

  // Sample from different parts of the program for variety
  // Distribute maxSamples evenly across the array
  const step = workoutTemplates.length / maxSamples;
  const indices: number[] = [];

  for (let i = 0; i < maxSamples; i++) {
    const index = Math.floor(i * step);
    // Ensure we don't exceed bounds and don't add duplicates
    const safeIndex = Math.min(index, workoutTemplates.length - 1);
    if (!indices.includes(safeIndex)) {
      indices.push(safeIndex);
    }
  }

  // Map indices to actual templates
  const samples = indices
    .map((index) => workoutTemplates[index])
    .filter((template) => template !== undefined); // Ensure no undefined values

  return samples;
}
