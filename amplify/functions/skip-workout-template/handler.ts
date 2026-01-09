/**
 * Skip Workout Template / Complete Rest Day Handler
 *
 * This Lambda handles two related operations:
 * 1. Skipping/unskipping workout templates (with templateId)
 * 2. Completing rest days (without templateId)
 *
 * Both operations share the core logic of advancing program.currentDay
 * and updating dayCompletionStatus, making them natural candidates for consolidation.
 *
 * Routes:
 * - POST /programs/{programId}/templates/{templateId}/skip - Skip/unskip workout
 * - POST /programs/{programId}/rest-day/complete - Complete rest day
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getProgram, updateProgram } from "../../dynamodb/operations";
import {
  getProgramDetailsFromS3,
  saveProgramDetailsToS3,
} from "../libs/program/s3-utils";
import { WorkoutTemplate } from "../libs/program/types";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

// Action types for skip/unskip operations
const enum SkipAction {
  SKIP = "skip",
  UNSKIP = "unskip",
}

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const { coachId, programId, templateId } = event.pathParameters || {};

    if (!coachId) {
      return createErrorResponse(400, "coachId is required");
    }

    if (!programId) {
      return createErrorResponse(400, "programId is required");
    }

    // ==================================================================
    // HANDLE REST DAY COMPLETION (no templateId)
    // ==================================================================
    // When called from /rest-day/complete endpoint, templateId will be undefined
    const isRestDay = !templateId || templateId === "rest-day";

    if (isRestDay) {
      // Parse optional request body for rest day
      let dayNumber: number | null = null;
      let notes: string | null = null;

      if (event.body) {
        try {
          const body = JSON.parse(event.body);

          // Parse and validate dayNumber if provided
          if (body.dayNumber !== undefined && body.dayNumber !== null) {
            const parsedDay = Number(body.dayNumber);
            if (Number.isNaN(parsedDay) || !Number.isInteger(parsedDay)) {
              return createErrorResponse(
                400,
                "dayNumber must be a valid integer",
              );
            }
            dayNumber = parsedDay;
          }

          notes = body.notes || null;
        } catch (error) {
          console.warn(
            "Failed to parse request body, continuing without notes:",
            error,
          );
        }
      }

      // Fetch program
      const programData = await getProgram(userId, coachId, programId);

      if (!programData) {
        return createErrorResponse(404, "Training program not found");
      }

      const program = programData;

      // Determine which day to complete (default to currentDay)
      // Use nullish coalescing (??) instead of logical OR (||) to preserve explicit 0 values
      // so they can be properly rejected by validation
      const targetDay = dayNumber ?? program.currentDay ?? 1;

      // Validate day number is within bounds
      if (targetDay < 1 || targetDay > program.totalDays) {
        return createErrorResponse(
          400,
          `Invalid day number: ${targetDay}. Must be between 1 and ${program.totalDays}`,
        );
      }

      // Validate that this is actually a rest day (no workout templates scheduled)
      if (!program.s3DetailKey) {
        return createErrorResponse(404, "Program details not found");
      }

      const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);
      if (!programDetails) {
        return createErrorResponse(404, "Program details not found in S3");
      }

      // Check if there are any workout templates for this day
      const dayTemplates = programDetails.workoutTemplates.filter(
        (t: WorkoutTemplate) => t.dayNumber === targetDay,
      );

      if (dayTemplates.length > 0) {
        return createErrorResponse(
          400,
          `Cannot complete rest day for day ${targetDay}. This day has ${dayTemplates.length} scheduled workout(s). Please log or skip the workout(s) instead.`,
        );
      }

      console.info("✅ Completing rest day:", {
        userId,
        programId,
        dayNumber: targetDay,
        notes: notes || "Not provided",
      });

      // Initialize dayCompletionStatus if it doesn't exist
      if (!program.dayCompletionStatus) {
        program.dayCompletionStatus = {};
      }

      // Check if this rest day was already completed
      const wasAlreadyComplete =
        program.dayCompletionStatus[targetDay]?.primaryComplete === true;

      // Mark day as complete (for rest days, we consider it "complete" when user acknowledges it)
      if (!program.dayCompletionStatus[targetDay]) {
        program.dayCompletionStatus[targetDay] = {
          primaryComplete: true, // Rest day is "complete" when acknowledged
          optionalCompleted: 0,
          totalOptional: 0,
        };
      } else {
        // If day completion status exists, mark primary as complete
        program.dayCompletionStatus[targetDay].primaryComplete = true;
      }

      // Update program stats in DynamoDB
      const updates: any = {
        lastActivityAt: new Date(),
        dayCompletionStatus: program.dayCompletionStatus,
      };

      // Only increment completedRestDays if this is a new completion
      if (!wasAlreadyComplete) {
        updates.completedRestDays = (program.completedRestDays || 0) + 1;
      }

      // Advance currentDay if we're completing the current day
      if (program.currentDay === targetDay) {
        updates.currentDay = program.currentDay + 1;
        console.info("🎯 Rest day complete, advancing to next day:", {
          completedDay: targetDay,
          newCurrentDay: updates.currentDay,
        });
      }

      // Check if program is complete
      if (updates.currentDay && updates.currentDay > program.totalDays) {
        updates.status = "completed";
        console.info("🏁 Program completed after rest day!", {
          programId,
          totalDays: program.totalDays,
        });
      }

      const updatedProgram = await updateProgram(
        userId,
        coachId,
        programId,
        updates,
      );

      console.info("✅ Rest day completed successfully:", {
        userId,
        programId,
        completedDay: targetDay,
        newCurrentDay: updates.currentDay ?? program.currentDay,
        totalRestDaysCompleted:
          updates.completedRestDays ?? program.completedRestDays ?? 0,
        wasAlreadyComplete,
      });

      return createOkResponse({
        success: true,
        message: wasAlreadyComplete
          ? "Rest day already completed"
          : "Rest day completed successfully",
        restDay: {
          dayNumber: targetDay,
          notes: notes || "Rest day completed",
          wasAlreadyComplete,
        },
        program: {
          programId: updatedProgram.programId,
          currentDay: updates.currentDay ?? program.currentDay,
          completedRestDays:
            updates.completedRestDays ?? program.completedRestDays ?? 0,
          status: updates.status || program.status,
        },
      });
    }

    // ==================================================================
    // HANDLE WORKOUT TEMPLATE SKIP/UNSKIP (templateId provided)
    // ==================================================================
    if (!templateId) {
      return createErrorResponse(400, "templateId is required");
    }

    // Parse optional request body (for skip reason or unskip action)
    let skipReason: string | null = null;
    let skipNotes: string | null = null;
    let action: string = SkipAction.SKIP; // Default action

    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        skipReason = body.skipReason || null;
        skipNotes = body.skipNotes || null;
        action = body.action || SkipAction.SKIP; // Support 'skip' or 'unskip'
      } catch (error) {
        // Body is optional for skip, continue without it
        console.warn(
          "Failed to parse request body, continuing without skip reason:",
          error,
        );
      }
    }

    // Fetch program
    const programData = await getProgram(userId, coachId, programId);

    if (!programData) {
      return createErrorResponse(404, "Training program not found");
    }

    const program = programData;

    // Get program details from S3
    if (!program.s3DetailKey) {
      return createErrorResponse(404, "Program details not found");
    }

    const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);

    if (!programDetails) {
      return createErrorResponse(404, "Program details not found in S3");
    }

    // Find the workout template
    const templateIndex = programDetails.workoutTemplates.findIndex(
      (t: WorkoutTemplate) => t.templateId === templateId,
    );

    if (templateIndex === -1) {
      return createErrorResponse(404, "Workout template not found");
    }

    const template = programDetails.workoutTemplates[templateIndex];

    // ==================================================================
    // HANDLE UNSKIP ACTION
    // ==================================================================
    if (action === SkipAction.UNSKIP) {
      if (template.status !== "skipped") {
        return createErrorResponse(
          400,
          "Workout template is not skipped. Cannot unskip.",
        );
      }

      console.info("↩️ Unskipping workout template:", {
        userId,
        programId,
        templateId,
        dayNumber: template.dayNumber,
        templateName: template.name,
      });

      // Revert template back to pending status
      template.status = "pending";
      template.completedAt = null;
      template.linkedWorkoutId = null;
      template.userFeedback = null;

      programDetails.workoutTemplates[templateIndex] = template;
      await saveProgramDetailsToS3(program.s3DetailKey, programDetails);

      console.info("✅ Template status reverted to pending in S3:", {
        templateId,
        status: "pending",
      });

      // Update lastActivityAt and decrement skippedWorkouts in DynamoDB
      await updateProgram(userId, coachId, programId, {
        lastActivityAt: new Date(),
        skippedWorkouts: Math.max(0, (program.skippedWorkouts || 0) - 1), // Decrement skipped count (prevent negative)
      });

      return createOkResponse({
        success: true,
        message: "Workout unskipped successfully",
        template: {
          templateId: template.templateId,
          name: template.name,
          status: template.status,
          completedAt: null,
        },
      });
    }

    // ==================================================================
    // HANDLE SKIP ACTION (Default)
    // ==================================================================

    // Check if already completed or skipped
    if (template.status === "completed") {
      return createErrorResponse(
        400,
        "Workout template already completed. Cannot skip.",
      );
    }

    if (template.status === "skipped") {
      return createErrorResponse(400, "Workout template already skipped");
    }

    // Get the phase for this template (by day range)
    const phase = program.phases.find(
      (p) => template.dayNumber >= p.startDay && template.dayNumber <= p.endDay,
    );

    console.info("⏭️ Skipping workout template:", {
      userId,
      programId,
      templateId,
      dayNumber: template.dayNumber,
      templateName: template.name,
      skipReason: skipReason || "Not provided",
    });

    // ==================================================================
    // STEP 1: Update template status to 'skipped'
    // ==================================================================
    template.status = "skipped";
    template.completedAt = new Date(); // Track when it was skipped
    template.linkedWorkoutId = null;

    // Store skip reason in userFeedback if provided
    if (skipReason || skipNotes) {
      template.userFeedback = {
        rating: 0,
        difficulty: null,
        comments: skipReason || skipNotes || "Skipped",
        timestamp: new Date(),
      };
    }

    programDetails.workoutTemplates[templateIndex] = template;
    await saveProgramDetailsToS3(program.s3DetailKey, programDetails);

    console.info("✅ Template status updated to skipped in S3:", {
      templateId,
      status: "skipped",
      skipReason: skipReason || "Not provided",
    });

    // ==================================================================
    // STEP 2: Update program stats in DynamoDB
    // ==================================================================
    const dayNumber = template.dayNumber;

    // Initialize dayCompletionStatus if it doesn't exist
    if (!program.dayCompletionStatus) {
      program.dayCompletionStatus = {};
    }

    if (!program.dayCompletionStatus[dayNumber]) {
      // Count total templates for this day
      const dayTemplates = programDetails.workoutTemplates.filter(
        (t: WorkoutTemplate) => t.dayNumber === dayNumber,
      );

      const totalOptional = dayTemplates.length - 1; // All templates except first

      program.dayCompletionStatus[dayNumber] = {
        primaryComplete: false,
        optionalCompleted: 0,
        totalOptional,
      };
    }

    // Get all templates for this day to determine if this is the primary template
    const dayTemplates = programDetails.workoutTemplates.filter(
      (t: WorkoutTemplate) => t.dayNumber === dayNumber,
    );
    const sortedTemplates = [...dayTemplates].sort((a, b) =>
      a.templateId.localeCompare(b.templateId),
    );
    const isPrimary = sortedTemplates[0]?.templateId === template.templateId;

    // Update completion status (mark as "complete" for day advancement purposes)
    if (isPrimary) {
      program.dayCompletionStatus[dayNumber].primaryComplete = true;
    } else {
      program.dayCompletionStatus[dayNumber].optionalCompleted += 1;
    }

    const updates: any = {
      lastActivityAt: new Date(),
      dayCompletionStatus: program.dayCompletionStatus,
      skippedWorkouts: (program.skippedWorkouts || 0) + 1, // Increment skipped count
    };

    // Only advance currentDay if ALL workouts for the day are completed/skipped
    const allDayTemplatesComplete = dayTemplates.every(
      (t: WorkoutTemplate) =>
        t.status === "completed" || t.status === "skipped",
    );

    if (allDayTemplatesComplete && program.currentDay === dayNumber) {
      updates.currentDay = program.currentDay + 1;
      console.info(
        "🎯 All workouts for day completed/skipped, advancing to next day:",
        {
          completedDay: dayNumber,
          newCurrentDay: updates.currentDay,
        },
      );
    }

    // NOTE: We do NOT increment completedWorkouts for skipped workouts
    // This keeps adherenceRate accurate (completed / total)
    // Adherence rate remains the same since we didn't complete anything

    // Check if program is complete (in case they skipped the last day)
    if (updates.currentDay && updates.currentDay > program.totalDays) {
      updates.status = "completed";
    }

    const updatedProgram = await updateProgram(
      userId,
      coachId,
      programId,
      updates,
    );

    console.info("✅ Workout skipped successfully:", {
      userId,
      programId,
      templateId,
      isPrimary,
      dayAdvanced: isPrimary,
      newCurrentDay: updates.currentDay,
      adherenceRate: program.adherenceRate, // Unchanged
    });

    return createOkResponse({
      success: true,
      message: "Workout skipped successfully",
      template: {
        templateId: template.templateId,
        name: template.name,
        status: template.status,
        completedAt: template.completedAt,
        skipReason: skipReason || "Not provided",
      },
      program: {
        programId: updatedProgram.programId,
        currentDay: updates.currentDay,
        completedWorkouts: program.completedWorkouts, // Unchanged
        adherenceRate: program.adherenceRate, // Unchanged
      },
    });
  } catch (error) {
    console.error("❌ Error skipping workout template:", error);
    return createErrorResponse(500, "Failed to skip workout template", error);
  }
};

export const handler = withAuth(baseHandler);
