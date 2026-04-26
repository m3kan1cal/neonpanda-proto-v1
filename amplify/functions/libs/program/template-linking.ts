/**
 * Template Linking Utilities
 *
 * Helper functions for linking completed workouts to training program templates.
 */

import { getProgram, updateProgram } from "../../../dynamodb/operations";
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
 * `completed` before invoking build-workout AND bumps DynamoDB program stats
 * (`completedWorkouts`, `adherenceRate`, `dayCompletionStatus`, possibly
 * advancing `currentDay` and flipping `status` to `completed`). If
 * build-workout subsequently fails to produce a linked workout (validation
 * error, exception, etc.) both the S3 template and the DynamoDB counters
 * need to be walked back, otherwise the template stays stuck at
 * `status: completed` / `linkedWorkoutId: null` (which the UI surfaces as
 * "processing") and program-level adherence drifts.
 *
 * This helper restores the template to a retryable state and reverses the
 * optimistic stat increments.
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
    const dayNumber: number = template.dayNumber;

    // Mirror log-workout-template's STEP 6 ordering so we revert the same
    // bucket (primary vs. optional) that was incremented.
    const dayTemplates = programDetails.workoutTemplates.filter(
      (t: any) => t.dayNumber === dayNumber,
    );
    const sortedTemplates = [...dayTemplates].sort((a: any, b: any) =>
      a.templateId.localeCompare(b.templateId),
    );
    const isPrimary =
      sortedTemplates[0]?.templateId === templateContext.templateId;

    template.status = "pending";
    template.completedAt = null;
    template.linkedWorkoutId = null;

    await saveProgramDetailsToS3(programData.s3DetailKey, programDetails);

    logger.info("✅ Template status reverted to pending:", {
      templateId: templateContext.templateId,
      dayNumber,
      isPrimary,
    });

    // Walk back the DynamoDB program stats written optimistically by
    // log-workout-template/handler.ts STEP 6.
    const existingDayStatus = programData.dayCompletionStatus?.[dayNumber];
    const updatedDayStatus = existingDayStatus
      ? {
          ...existingDayStatus,
          ...(isPrimary
            ? { primaryComplete: false }
            : {
                optionalCompleted: Math.max(
                  0,
                  existingDayStatus.optionalCompleted - 1,
                ),
              }),
        }
      : undefined;

    const decrementedCompleted = Math.max(
      0,
      (programData.completedWorkouts ?? 0) - 1,
    );

    // After undoing this template's contribution, are the day's templates
    // still all complete? If not, currentDay should not have advanced past
    // this day.
    const dayStillFullyComplete =
      updatedDayStatus !== undefined &&
      updatedDayStatus.primaryComplete &&
      updatedDayStatus.optionalCompleted >= updatedDayStatus.totalOptional;

    const shouldRollbackCurrentDay =
      programData.currentDay > dayNumber && !dayStillFullyComplete;

    const rolledBackCurrentDay = shouldRollbackCurrentDay
      ? dayNumber
      : programData.currentDay;

    // Match the percentage scale used by log-workout-template's STEP 6
    // (completedWorkouts / totalWorkouts * 100) so we don't flip units.
    const programUpdates: Record<string, any> = {
      completedWorkouts: decrementedCompleted,
      adherenceRate:
        programData.totalWorkouts > 0
          ? (decrementedCompleted / programData.totalWorkouts) * 100
          : 0,
    };

    if (updatedDayStatus) {
      programUpdates.dayCompletionStatus = {
        [dayNumber]: updatedDayStatus,
      };
    }

    if (shouldRollbackCurrentDay) {
      programUpdates.currentDay = rolledBackCurrentDay;
    }

    // If the optimistic write flipped the program to "completed" and the
    // rollback puts currentDay back inside the program, restore it to active.
    if (
      programData.status === "completed" &&
      rolledBackCurrentDay <= programData.totalDays
    ) {
      programUpdates.status = "active";
    }

    await updateProgram(
      userId,
      coachId,
      templateContext.programId,
      programUpdates,
    );

    logger.info("✅ Program stats reverted:", {
      programId: templateContext.programId,
      completedWorkouts: programUpdates.completedWorkouts,
      currentDay: programUpdates.currentDay ?? programData.currentDay,
      status: programUpdates.status ?? programData.status,
    });

    return true;
  } catch (error) {
    logger.error("⚠️ Failed to revert template status (non-critical):", error);
    return false;
  }
};
