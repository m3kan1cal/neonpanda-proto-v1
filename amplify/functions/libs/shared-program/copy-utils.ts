/**
 * Shared Program Copy Utilities
 *
 * Handles the business logic for copying shared programs to a user's account.
 * Pattern: Similar to program-designer utilities - orchestration layer between handler and data operations.
 */

import {
  getSharedProgram,
  getCoachConfig,
  saveProgram,
} from "../../../dynamodb/operations";
import { getSharedProgramDetailsFromS3 } from "./s3-utils";
import { storeProgramDetailsInS3 } from "../program/s3-utils";
import { Program } from "../program/types";
import { generateProgramId } from "../id-utils";
import { calculateEndDate } from "../program/calendar-utils";

/**
 * Result of copying a shared program
 */
export interface CopySharedProgramResult {
  programId: string;
  programName: string;
  coachId: string;
  coachName: string;
  totalWorkouts: number;
}

/**
 * Copy a shared program to a user's account
 *
 * This is the main orchestration function that:
 * 1. Validates the shared program exists and is active
 * 2. Retrieves all necessary data (shared program, coach, templates)
 * 3. Creates a new Program entity with copy metadata
 * 4. Stores workout templates in user's S3 location
 * 5. Saves the program to DynamoDB
 *
 * @param userId - User ID who is copying the program
 * @param sharedProgramId - ID of the shared program to copy
 * @param coachId - Coach ID to associate with the copied program
 * @returns Copy result with new program details
 * @throws Error if shared program not found, inactive, or coach not found
 */
export async function copySharedProgramToUser(
  userId: string,
  sharedProgramId: string,
  coachId: string,
): Promise<CopySharedProgramResult> {
  // 1. Get shared program metadata
  const sharedProgram = await getSharedProgram(sharedProgramId);
  if (!sharedProgram || !sharedProgram.isActive) {
    throw new Error("Shared program not found or inactive");
  }

  // 2. Get shared program details from S3 (includes workout templates)
  const sharedDetails = await getSharedProgramDetailsFromS3(
    sharedProgram.s3DetailKey,
  );
  if (!sharedDetails) {
    throw new Error("Shared program details not found");
  }

  // 3. Get coach for attribution
  const coachConfig = await getCoachConfig(userId, coachId);
  if (!coachConfig) {
    throw new Error("Coach not found");
  }

  // 4. Generate new program ID
  const newProgramId = generateProgramId(userId);

  // 5. Calculate start/end dates
  // Note: Using UTC date for consistency. Frontend can adjust display based on user timezone.
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const endDate = calculateEndDate(
    startDate,
    sharedProgram.programSnapshot.totalDays,
  );

  // 6. Create new program with copy metadata
  const newProgram: Program = {
    programId: newProgramId,
    userId,
    coachIds: [coachId],
    coachNames: [coachConfig.coach_name],

    // Copy program definition from snapshot
    name: sharedProgram.programSnapshot.name,
    description: sharedProgram.programSnapshot.description,
    status: "active",

    // Timeline - starts today at day 1
    startDate,
    endDate,
    totalDays: sharedProgram.programSnapshot.totalDays,
    currentDay: 1,

    // Pause tracking - fresh start
    pausedAt: null,
    pausedDuration: 0,

    // Copy program structure
    phases: sharedProgram.programSnapshot.phases,
    equipmentConstraints: sharedProgram.programSnapshot.equipmentConstraints,
    trainingGoals: sharedProgram.programSnapshot.trainingGoals,
    trainingFrequency: sharedProgram.programSnapshot.trainingFrequency,

    // Analytics - fresh start
    totalWorkouts: sharedDetails.workoutTemplates.length,
    completedWorkouts: 0,
    skippedWorkouts: 0,
    completedRestDays: 0,
    adherenceRate: 0,
    lastActivityAt: null,

    // S3 reference (will be set after storing)
    s3DetailKey: "",

    // Empty adaptation log (fresh program)
    adaptationLog: [],
    dayCompletionStatus: {},

    // CRITICAL: Copy metadata for slide-out chat trigger
    metadata: {
      copiedFromSharedProgram: true,
      sharedProgramId: sharedProgram.sharedProgramId,
      sourceCreator: sharedProgram.creatorUsername,
      sourceCoachNames: sharedProgram.programSnapshot.coachNames,
      adaptationReviewed: false, // Triggers slide-out on first ProgramDashboard view
      copiedAt: new Date().toISOString(),
    },
  };

  // 7. Copy workout templates to user's S3 location
  const s3DetailKey = await storeProgramDetailsInS3(
    newProgramId,
    userId,
    coachId,
    sharedDetails.workoutTemplates,
    {
      goals: sharedProgram.programSnapshot.trainingGoals,
      purpose: sharedProgram.programSnapshot.description,
      successMetrics: [], // Not tracked in shared program snapshot
      equipmentConstraints: sharedProgram.programSnapshot.equipmentConstraints,
    },
    {
      generatedBy: coachId,
      aiModel: sharedDetails.generationMetadata?.originalAiModel || "copied", // Preserve original AI model
      confidence: sharedDetails.generationMetadata?.originalConfidence || 1.0,
      generationPrompt:
        `Copied from shared program ${sharedProgramId} by ${sharedProgram.creatorUsername}. ` +
        `Original prompt: ${sharedDetails.generationMetadata?.originalGenerationPrompt || "N/A"}`,
    },
  );
  newProgram.s3DetailKey = s3DetailKey;

  // 8. Save program to DynamoDB
  await saveProgram(newProgram);

  console.info("Shared program copied successfully:", {
    sharedProgramId,
    newProgramId,
    userId,
    coachId,
    sourceCreator: sharedProgram.creatorUsername,
    programName: newProgram.name,
    totalWorkouts: sharedDetails.workoutTemplates.length,
  });

  // Return result
  return {
    programId: newProgramId,
    programName: newProgram.name,
    coachId,
    coachName: coachConfig.coach_name,
    totalWorkouts: sharedDetails.workoutTemplates.length,
  };
}
