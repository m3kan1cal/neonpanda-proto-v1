import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getTrainingProgram, getUserProfile } from '../../dynamodb/operations';
import { getTrainingProgramDetailsFromS3 } from '../libs/training-program/s3-utils';
import { getPhaseForDay } from '../libs/training-program/calendar-utils';
import { getUserTimezoneOrDefault } from '../libs/analytics/date-utils';
import { TodaysWorkoutTemplates } from '../libs/training-program/types';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

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
      return createErrorResponse(400, 'coachId is required');
    }

    if (!programId) {
      return createErrorResponse(400, 'programId is required');
    }

    // Fetch user profile for timezone (parallel with program fetch)
    const [programData, userProfile] = await Promise.all([
      getTrainingProgram(userId, coachId, programId),
      getUserProfile(userId)
    ]);

    // Get user timezone with LA fallback
    const userTimezone = getUserTimezoneOrDefault(userProfile?.attributes?.preferences?.timezone);

    if (!programData) {
      return createErrorResponse(404, 'Training program not found');
    }

    const program = programData.attributes;

    // Check if program is active
    if (program.status !== 'active' && program.status !== 'paused') {
      return createErrorResponse(400, `Program is ${program.status}. Cannot retrieve templates.`);
    }

    // Get program details from S3
    if (!program.s3DetailKey) {
      return createErrorResponse(404, 'Program workouts not yet generated');
    }

    const programDetails = await getTrainingProgramDetailsFromS3(program.s3DetailKey);

    if (!programDetails) {
      return createErrorResponse(404, 'Program details not found in S3');
    }

    // Case 1: Specific template by ID
    if (templateId) {
      const template = programDetails.dailyWorkoutTemplates.find(
        (t) => t.templateId === templateId
      );

      if (!template) {
        return createErrorResponse(404, 'Workout template not found');
      }

      const phase = program.phases.find(
        (p) => p.phaseId === template.phaseId
      );

      return createOkResponse({
        template,
        phaseName: phase?.name || 'Unknown Phase',
        programName: program.name,
      });
    }

    // Case 2: Templates for a specific day
    if (day !== undefined) {
      const dayNumber = parseInt(day, 10);

      if (isNaN(dayNumber)) {
        return createErrorResponse(400, 'Invalid day parameter. Must be a number.');
      }

      if (dayNumber < 1 || dayNumber > program.totalDays) {
        return createErrorResponse(400, `Invalid day number. Must be between 1 and ${program.totalDays}`);
      }

      const templates = programDetails.dailyWorkoutTemplates
        .filter((t) => t.dayNumber === dayNumber)
        .sort((a, b) => a.templatePriority - b.templatePriority);

      if (templates.length === 0) {
        return createErrorResponse(404, 'No templates found for this day');
      }

      const phase = getPhaseForDay(program, dayNumber);

      return createOkResponse({
        templates,
        dayNumber: dayNumber,
        phaseName: phase?.name || 'Unknown Phase',
        programName: program.name,
        totalDays: program.totalDays,
      });
    }

    // Case 3: Today's templates
    if (today === 'true') {
      const currentDay = program.currentDay;

      if (currentDay > program.totalDays) {
        return createErrorResponse(400, 'Program is complete. No more workouts scheduled.');
      }

      const templates = programDetails.dailyWorkoutTemplates
        .filter((t) => t.dayNumber === currentDay)
        .sort((a, b) => a.templatePriority - b.templatePriority);

      if (templates.length === 0) {
        return createErrorResponse(404, 'No templates found for today');
      }

      // Get phase info
      const currentPhase = getPhaseForDay(program, currentDay);

      // Get next workout preview (first template of next day)
      const nextDayTemplates = programDetails.dailyWorkoutTemplates.filter(
        (t) => t.dayNumber === currentDay + 1
      );
      const nextDayPrimaryTemplate = nextDayTemplates.find(
        (t) => t.templateType === 'primary'
      );

      const todaysWorkoutTemplates: TodaysWorkoutTemplates = {
        programId: program.programId,
        programName: program.name,
        dayNumber: currentDay,
        totalDays: program.totalDays,
        phaseName: currentPhase?.name || 'Unknown Phase',
        templates,
        nextWorkout: nextDayPrimaryTemplate
          ? {
              dayNumber: currentDay + 1,
              name: nextDayPrimaryTemplate.name,
              scheduledDate: nextDayPrimaryTemplate.scheduledDate,
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
          totalOptional: templates.filter((t) => t.templateType !== 'primary').length,
        },
      });
    }

    // Case 4: All templates (return full program details)
    return createOkResponse({
      programId: program.programId,
      programName: program.name,
      templates: programDetails.dailyWorkoutTemplates.sort(
        (a, b) => a.dayNumber - b.dayNumber || a.templatePriority - b.templatePriority
      ),
      programContext: programDetails.programContext,
      phases: program.phases,
      currentDay: program.currentDay,
      totalDays: program.totalDays,
    });
  } catch (error) {
    console.error('Error getting workout template:', error);
    return createErrorResponse(500, 'Failed to get workout template', error);
  }
};

export const handler = withAuth(baseHandler);
