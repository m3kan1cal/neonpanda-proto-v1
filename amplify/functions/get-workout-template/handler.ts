import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getProgram, getUserProfile } from "../../dynamodb/operations";
import { getProgramDetailsFromS3 } from "../libs/program/s3-utils";
import { getPhaseForDay } from "../libs/program/calendar-utils";
import { getUserTimezoneOrDefault } from "../libs/analytics/date-utils";
import { TodaysWorkoutTemplates } from "../libs/program/types";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const coachId = event.pathParameters?.coachId;
    const programId = event.pathParameters?.programId;
    const templateId = event.pathParameters?.templateId; // Optional

    // Query parameters
    const queryParams = event.queryStringParameters || {};
    const { day, today } = queryParams;

    if (!coachId) {
      return createErrorResponse(400, "coachId is required");
    }

    if (!programId) {
      return createErrorResponse(400, "programId is required");
    }

    // Fetch user profile for timezone (parallel with program fetch)
    const [programData, userProfile] = await Promise.all([
      getProgram(userId, coachId, programId),
      getUserProfile(userId),
    ]);

    // Get user timezone with LA fallback
    const userTimezone = getUserTimezoneOrDefault(
      userProfile?.preferences?.timezone,
    );

    if (!programData) {
      return createErrorResponse(404, "Training program not found");
    }

    const program = programData;

    // Check if program is accessible (allow active, paused, and completed programs)
    // Only block archived programs
    if (program.status === "archived") {
      return createErrorResponse(
        400,
        `Program is ${program.status}. Cannot retrieve templates.`,
      );
    }

    // Get program details from S3
    if (!program.s3DetailKey) {
      return createErrorResponse(404, "Program workouts not yet generated");
    }

    const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);

    if (!programDetails) {
      return createErrorResponse(404, "Program details not found in S3");
    }

    // Case 1: Specific template by ID
    if (templateId) {
      const template = programDetails.workoutTemplates.find(
        (t) => t.templateId === templateId,
      );

      if (!template) {
        return createErrorResponse(404, "Workout template not found");
      }

      // Get phase from day number
      const phase = getPhaseForDay(program, template.dayNumber);

      return createOkResponse({
        template,
        phaseName: phase?.name || "Unknown Phase",
        programName: program.name,
      });
    }

    // Case 2: Templates for a specific day
    if (day !== undefined) {
      const dayNumber = parseInt(day, 10);

      if (isNaN(dayNumber)) {
        return createErrorResponse(
          400,
          "Invalid day parameter. Must be a number.",
        );
      }

      if (dayNumber < 1 || dayNumber > program.totalDays) {
        return createErrorResponse(
          400,
          `Invalid day number. Must be between 1 and ${program.totalDays}`,
        );
      }

      const templates = programDetails.workoutTemplates.filter(
        (t) => t.dayNumber === dayNumber,
      );

      if (templates.length === 0) {
        return createErrorResponse(404, "No templates found for this day");
      }

      const phase = getPhaseForDay(program, dayNumber);
      const phaseIndex = phase
        ? program.phases.findIndex((p) => p.phaseId === phase.phaseId)
        : -1;
      const phaseNumber = phaseIndex >= 0 ? phaseIndex + 1 : null;

      return createOkResponse({
        templates,
        dayNumber: dayNumber,
        phaseName: phase?.name || "Unknown Phase",
        phaseNumber: phaseNumber,
        programName: program.name,
        totalDays: program.totalDays,
      });
    }

    // Case 3: Today's templates
    if (today === "true") {
      const currentDay = program.currentDay;

      if (currentDay > program.totalDays) {
        return createErrorResponse(
          400,
          "Program is complete. No more workouts scheduled.",
        );
      }

      const templates = programDetails.workoutTemplates.filter(
        (t) => t.dayNumber === currentDay,
      );

      if (templates.length === 0) {
        return createErrorResponse(404, "No templates found for today");
      }

      // Get phase info
      const currentPhase = getPhaseForDay(program, currentDay);
      const phaseIndex = currentPhase
        ? program.phases.findIndex((p) => p.phaseId === currentPhase.phaseId)
        : -1;
      const phaseNumber = phaseIndex >= 0 ? phaseIndex + 1 : null;

      // Get next workout preview (first template of next day)
      const nextDayTemplates = programDetails.workoutTemplates.filter(
        (t) => t.dayNumber === currentDay + 1,
      );
      const nextDayFirstTemplate = nextDayTemplates[0];

      const todaysWorkoutTemplates: TodaysWorkoutTemplates = {
        programId: program.programId,
        programName: program.name,
        dayNumber: currentDay,
        totalDays: program.totalDays,
        phaseName: currentPhase?.name || "Unknown Phase",
        phaseNumber: phaseNumber,
        groupId: templates[0]?.groupId || "",
        templates,
        nextWorkout: nextDayFirstTemplate
          ? {
              dayNumber: currentDay + 1,
              templateName: nextDayFirstTemplate.name,
              scheduledDate: "", // No longer stored, calculated on demand
            }
          : undefined,
      };

      return createOkResponse({
        todaysWorkoutTemplates,
        progressPercentage: Math.round((currentDay / program.totalDays) * 100),
        daysRemaining: program.totalDays - currentDay + 1,
        completionStatus: program.dayCompletionStatus?.[currentDay] || {
          primaryComplete: false,
          optionalCompleted: 0,
          totalOptional: templates.length - 1, // All but first template
        },
      });
    }

    // Case 4: All templates (return full program details)
    return createOkResponse({
      programId: program.programId,
      programName: program.name,
      templates: programDetails.workoutTemplates.sort(
        (a, b) => a.dayNumber - b.dayNumber,
      ),
      programContext: programDetails.programContext,
      phases: program.phases,
      currentDay: program.currentDay,
      totalDays: program.totalDays,
    });
  } catch (error) {
    logger.error("Error getting workout template:", error);
    return createErrorResponse(500, "Failed to get workout template", error);
  }
};

export const handler = withAuth(baseHandler);
