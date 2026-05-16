/**
 * Template Linking Utilities
 *
 * Helper functions for linking completed workouts to training program templates.
 */

import { getProgram, updateProgram } from "../../../dynamodb/operations";
import { getProgramDetailsFromS3, saveProgramDetailsToS3 } from "./s3-utils";
import { logger } from "../logger";
import type { WorkoutTemplate } from "./types";

// Minimum shape required by the role helpers. Lets callers pass either full
// WorkoutTemplate values (post-typing) or loosely-typed S3 records (legacy).
type RoleAwareTemplate = Pick<WorkoutTemplate, "templateId"> & {
  sessionRole?: WorkoutTemplate["sessionRole"];
};

/**
 * Returns true when at least one template in the day group declares an
 * explicit sessionRole. Used to choose between the explicit-role path and
 * the legacy alphabetic-sort fallback.
 */
const hasExplicitSessionRoles = (
  dayTemplates: readonly RoleAwareTemplate[],
): boolean =>
  dayTemplates.some(
    (t) => t.sessionRole === "primary" || t.sessionRole === "optional",
  );

/**
 * Single source of truth for "which template is the day's primary?".
 * All three exported helpers (isPrimaryTemplate, countOptionalTemplates,
 * and the per-day pruner summary) derive from this so they cannot drift.
 *
 * Resolution order:
 *  1. Empty day → undefined.
 *  2. Single-template day → that template's id.
 *  3. Explicit roles present AND a sessionRole === "primary" exists →
 *     that template's id.
 *  4. Otherwise (legacy programs with no sessionRole anywhere, OR
 *     malformed explicit-role days that lack a primary) → alphabetic sort
 *     by templateId, first wins. The alphabetic fallback for malformed
 *     explicit-role days exists so a single missing/wrong label can't
 *     break the UI ("today's workout disappears") or the day-advancement
 *     logic. The integration validator on test-build-program asserts the
 *     "exactly one primary" invariant so malformed days are caught at
 *     generation time — this fallback is a runtime safety net, not a
 *     blessing of the malformed shape.
 */
const getPrimaryTemplateId = (
  dayTemplates: readonly RoleAwareTemplate[],
): string | undefined => {
  if (dayTemplates.length === 0) return undefined;
  if (dayTemplates.length === 1) return dayTemplates[0].templateId;

  if (hasExplicitSessionRoles(dayTemplates)) {
    const explicit = dayTemplates.find((t) => t.sessionRole === "primary");
    if (explicit) return explicit.templateId;
    // Fall through: explicit roles present but no primary among them.
  }

  const sorted = [...dayTemplates].sort((a, b) =>
    a.templateId.localeCompare(b.templateId),
  );
  return sorted[0]?.templateId;
};

/**
 * Determine whether a given template is the primary workout for its day.
 * Single-template days: always primary. See `getPrimaryTemplateId` for the
 * explicit-role-vs-fallback resolution rules.
 */
export const isPrimaryTemplate = (
  template: RoleAwareTemplate,
  dayTemplates: readonly RoleAwareTemplate[],
): boolean => {
  const primaryId = getPrimaryTemplateId(dayTemplates);
  return primaryId !== undefined && primaryId === template.templateId;
};

/**
 * Count optional-role templates on a day. Equivalent to
 * `dayTemplates.length - 1` whenever there's a recognized primary, since
 * "everything that isn't the primary is optional". Returns 0 for empty
 * and single-template days. Always >= 0.
 */
export const countOptionalTemplates = (
  dayTemplates: readonly RoleAwareTemplate[],
): number => {
  if (dayTemplates.length <= 1) return 0;
  const primaryId = getPrimaryTemplateId(dayTemplates);
  if (primaryId === undefined) return Math.max(0, dayTemplates.length - 1);
  return dayTemplates.filter((t) => t.templateId !== primaryId).length;
};

/**
 * Link a completed workout to its template in a training program
 *
 * Updates the linkedWorkoutId field in the program template stored in S3.
 * This allows tracking which template workouts have been completed and
 * provides comparison data for scaling analysis.
 *
 * Retries the S3 read+mutate+write block up to 3 times with exponential
 * backoff on thrown errors (transient S3/DynamoDB failures). Terminal
 * misses — program not found, template not found — return false without
 * retrying. The UI blocks on this field, so silent failure here leaves
 * the template stuck at "Processing…" until the 6-minute polling timeout.
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

  const maxAttempts = 3;
  const backoffMs = [250, 500, 1000];
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        // getProgramDetailsFromS3 catches all errors and returns null,
        // so null here covers BOTH "transient S3 read failure" and
        // "key genuinely missing". The latter shouldn't happen — the
        // s3DetailKey we got from DynamoDB above means S3 had this
        // object at write time. Throw to trigger the retry loop's
        // catch; if it's truly missing the retries will just confirm
        // it after the backoff window.
        throw new Error(
          `getProgramDetailsFromS3 returned null for s3DetailKey ${programData.s3DetailKey}`,
        );
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
      programDetails.workoutTemplates[templateIndex].linkedWorkoutId =
        workoutId;

      // 5. Save updated program details back to S3
      await saveProgramDetailsToS3(programData.s3DetailKey, programDetails);

      logger.info("✅ Template linkedWorkoutId updated:", {
        templateId: templateContext.templateId,
        workoutId,
        attempt,
      });

      return true;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, backoffMs[attempt - 1]));
      }
    }
  }

  logger.error("❌ linkWorkoutToTemplate failed after retries", {
    userId,
    coachId,
    programId: templateContext.programId,
    templateId: templateContext.templateId,
    workoutId,
    attempts: maxAttempts,
    error: lastError,
  });
  return false;
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
    // bucket (primary vs. optional) that was incremented. Uses the shared
    // role helpers so explicit sessionRole and legacy alphabetic-sort
    // programs are handled the same way across handlers.
    const dayTemplates = programDetails.workoutTemplates.filter(
      (t: any) => t.dayNumber === dayNumber,
    );
    const isPrimary = isPrimaryTemplate(template, dayTemplates);

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
