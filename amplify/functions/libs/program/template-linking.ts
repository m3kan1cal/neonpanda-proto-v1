/**
 * Template Linking Utilities
 *
 * Helper functions for linking completed workouts to training program templates.
 */

import { getProgram } from "../../../dynamodb/operations";
import { getProgramDetailsFromS3, saveProgramDetailsToS3 } from "./s3-utils";
import { logger } from "../logger";

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
  logger.info("🔗 Updating template linkedWorkoutId in S3..");

  try {
    // 1. Get program metadata from DynamoDB
    const programData = await getProgram(
      userId,
      coachId,
      templateContext.programId,
    );

    if (!programData?.s3DetailKey) {
      logger.warn("⚠️ Program data or S3 detail key not found");
      return false;
    }

    // 2. Get full program details from S3
    const programDetails = await getProgramDetailsFromS3(
      programData.s3DetailKey,
    );

    if (!programDetails) {
      logger.warn("⚠️ Program details not found in S3");
      return false;
    }

    // 3. Find the template in the program
    const templateIndex = programDetails.workoutTemplates.findIndex(
      (t: any) => t.templateId === templateContext.templateId,
    );

    if (templateIndex === -1) {
      logger.warn("⚠️ Template not found in program:", {
        templateId: templateContext.templateId,
        programId: templateContext.programId,
      });
      return false;
    }

    // 4. Update the linkedWorkoutId
    programDetails.workoutTemplates[templateIndex].linkedWorkoutId = workoutId;

    // 5. Save updated program details back to S3
    await saveProgramDetailsToS3(programData.s3DetailKey, programDetails);

    logger.info("✅ Template linkedWorkoutId updated:", {
      templateId: templateContext.templateId,
      workoutId,
    });

    return true;
  } catch (error) {
    logger.error(
      "⚠️ Failed to update template linkedWorkoutId (non-critical):",
      error,
    );
    return false;
  }
};

/**
 * Revert a program template back to "pending" after a failed workout build.
 *
 * `log-workout-template/handler.ts` optimistically marks the template as
 * `completed` before invoking build-workout. If build-workout subsequently
 * fails to produce a linked workout (validation error, exception, etc.) the
 * template would otherwise be stuck at `status: completed` with
 * `linkedWorkoutId: null`, which the UI surfaces as "processing".
 *
 * This helper restores the template to a state where the user can retry.
 *
 * @returns true if successfully reverted, false otherwise
 */
export const revertTemplateStatus = async (
  userId: string,
  coachId: string,
  templateContext: {
    programId: string;
    templateId: string;
  },
): Promise<boolean> => {
  logger.info("↩️ Reverting template status after failed workout build..");

  try {
    const programData = await getProgram(
      userId,
      coachId,
      templateContext.programId,
    );

    if (!programData?.s3DetailKey) {
      logger.warn("⚠️ Program data or S3 detail key not found for revert");
      return false;
    }

    const programDetails = await getProgramDetailsFromS3(
      programData.s3DetailKey,
    );

    if (!programDetails) {
      logger.warn("⚠️ Program details not found in S3 for revert");
      return false;
    }

    const templateIndex = programDetails.workoutTemplates.findIndex(
      (t: any) => t.templateId === templateContext.templateId,
    );

    if (templateIndex === -1) {
      logger.warn("⚠️ Template not found in program for revert:", {
        templateId: templateContext.templateId,
        programId: templateContext.programId,
      });
      return false;
    }

    const template = programDetails.workoutTemplates[templateIndex];
    template.status = "pending";
    template.completedAt = null;
    template.linkedWorkoutId = null;

    await saveProgramDetailsToS3(programData.s3DetailKey, programDetails);

    logger.info("✅ Template status reverted to pending:", {
      templateId: templateContext.templateId,
    });

    return true;
  } catch (error) {
    logger.error("⚠️ Failed to revert template status (non-critical):", error);
    return false;
  }
};
