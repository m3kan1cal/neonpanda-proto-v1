/**
 * Template Linking Utilities
 *
 * Helper functions for linking completed workouts to training program templates.
 */

import { getProgram } from "../../../dynamodb/operations";
import { getProgramDetailsFromS3, saveProgramDetailsToS3 } from "./s3-utils";

/**
 * Link a completed workout to its template in a training program
 *
 * Updates the linkedWorkoutId field in the program template stored in S3.
 * This allows tracking which template workouts have been completed and
 * provides comparison data for scaling analysis.
 *
 * @returns true if successfully linked, false otherwise
 */
export const linkWorkoutToTemplate = async (
  userId: string,
  coachId: string,
  templateContext: {
    programId: string;
    templateId: string;
  },
  workoutId: string,
): Promise<boolean> => {
  console.info("🔗 Updating template linkedWorkoutId in S3..");

  try {
    // 1. Get program metadata from DynamoDB
    const programData = await getProgram(
      userId,
      coachId,
      templateContext.programId,
    );

    if (!programData?.s3DetailKey) {
      console.warn("⚠️ Program data or S3 detail key not found");
      return false;
    }

    // 2. Get full program details from S3
    const programDetails = await getProgramDetailsFromS3(
      programData.s3DetailKey,
    );

    if (!programDetails) {
      console.warn("⚠️ Program details not found in S3");
      return false;
    }

    // 3. Find the template in the program
    const templateIndex = programDetails.workoutTemplates.findIndex(
      (t: any) => t.templateId === templateContext.templateId,
    );

    if (templateIndex === -1) {
      console.warn("⚠️ Template not found in program:", {
        templateId: templateContext.templateId,
        programId: templateContext.programId,
      });
      return false;
    }

    // 4. Update the linkedWorkoutId
    programDetails.workoutTemplates[templateIndex].linkedWorkoutId = workoutId;

    // 5. Save updated program details back to S3
    await saveProgramDetailsToS3(programData.s3DetailKey, programDetails);

    console.info("✅ Template linkedWorkoutId updated:", {
      templateId: templateContext.templateId,
      workoutId,
    });

    return true;
  } catch (error) {
    console.error(
      "⚠️ Failed to update template linkedWorkoutId (non-critical):",
      error,
    );
    return false;
  }
};
