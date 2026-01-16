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

    console.info("Successfully stored shared program details in S3:", {
      key,
      sharedProgramId,
      creatorUserId,
      templateCount: originalProgramDetails.workoutTemplates.length,
    });

    return key;
  } catch (error) {
    console.error("Failed to store shared program details in S3:", error);
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

    console.info("Successfully retrieved shared program details from S3:", {
      key: s3Key,
      sharedProgramId: details.sharedProgramId,
      templateCount: details.workoutTemplates.length,
    });

    return details;
  } catch (error) {
    console.error("Failed to retrieve shared program details from S3:", {
      error,
      key: s3Key,
    });
    return null;
  }
}
