import {
  createOkResponse,
  createErrorResponse,
} from '../libs/api-helpers';
import {
  getTrainingProgram,
  updateTrainingProgram,
} from '../../dynamodb/operations';
import { getTrainingProgramDetailsFromS3, saveTrainingProgramDetailsToS3 } from '../libs/training-program/s3-utils';
import { WorkoutTemplate } from '../libs/training-program/types';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

// Action types for skip/unskip operations
const enum SkipAction {
  SKIP = 'skip',
  UNSKIP = 'unskip',
}

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const { coachId, programId, templateId } = event.pathParameters || {};

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    if (!programId) {
      return createErrorResponse(400, 'programId is required');
    }

    if (!templateId) {
      return createErrorResponse(400, 'templateId is required');
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
        console.warn('Failed to parse request body, continuing without skip reason:', error);
      }
    }

    // Fetch program
    const programData = await getTrainingProgram(userId, coachId, programId);

    if (!programData) {
      return createErrorResponse(404, 'Training program not found');
    }

    const program = programData;

    // Get program details from S3
    if (!program.s3DetailKey) {
      return createErrorResponse(404, 'Program details not found');
    }

    const programDetails = await getTrainingProgramDetailsFromS3(program.s3DetailKey);

    if (!programDetails) {
      return createErrorResponse(404, 'Program details not found in S3');
    }

    // Find the workout template
    const templateIndex = programDetails.workoutTemplates.findIndex(
      (t: WorkoutTemplate) => t.templateId === templateId
    );

    if (templateIndex === -1) {
      return createErrorResponse(404, 'Workout template not found');
    }

    const template = programDetails.workoutTemplates[templateIndex];

    // ==================================================================
    // HANDLE UNSKIP ACTION
    // ==================================================================
    if (action === SkipAction.UNSKIP) {
      if (template.status !== 'skipped') {
        return createErrorResponse(400, 'Workout template is not skipped. Cannot unskip.');
      }

      console.info('↩️ Unskipping workout template:', {
        userId,
        programId,
        templateId,
        dayNumber: template.dayNumber,
        templateName: template.name,
      });

      // Revert template back to pending status
      template.status = 'pending';
      template.completedAt = null;
      template.linkedWorkoutId = null;
      template.userFeedback = null;

      programDetails.workoutTemplates[templateIndex] = template;
      await saveTrainingProgramDetailsToS3(program.s3DetailKey, programDetails);

      console.info('✅ Template status reverted to pending in S3:', {
        templateId,
        status: 'pending',
      });

      // Update lastActivityAt and decrement skippedWorkouts in DynamoDB
      await updateTrainingProgram(
        userId,
        coachId,
        programId,
        {
          lastActivityAt: new Date(),
          skippedWorkouts: Math.max(0, (program.skippedWorkouts || 0) - 1), // Decrement skipped count (prevent negative)
        }
      );

      return createOkResponse({
        success: true,
        message: 'Workout unskipped successfully',
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
    if (template.status === 'completed') {
      return createErrorResponse(400, 'Workout template already completed. Cannot skip.');
    }

    if (template.status === 'skipped') {
      return createErrorResponse(400, 'Workout template already skipped');
    }

    // Get the phase for this template (by day range)
    const phase = program.phases.find(
      (p) => template.dayNumber >= p.startDay && template.dayNumber <= p.endDay
    );

    console.info('⏭️ Skipping workout template:', {
      userId,
      programId,
      templateId,
      dayNumber: template.dayNumber,
      templateName: template.name,
      skipReason: skipReason || 'Not provided',
    });

    // ==================================================================
    // STEP 1: Update template status to 'skipped'
    // ==================================================================
    template.status = 'skipped';
    template.completedAt = new Date(); // Track when it was skipped
    template.linkedWorkoutId = null;

    // Store skip reason in userFeedback if provided
    if (skipReason || skipNotes) {
      template.userFeedback = {
        rating: 0,
        difficulty: null,
        comments: skipReason || skipNotes || 'Skipped',
        timestamp: new Date(),
      };
    }

    programDetails.workoutTemplates[templateIndex] = template;
    await saveTrainingProgramDetailsToS3(program.s3DetailKey, programDetails);

    console.info('✅ Template status updated to skipped in S3:', {
      templateId,
      status: 'skipped',
      skipReason: skipReason || 'Not provided',
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
        (t: WorkoutTemplate) => t.dayNumber === dayNumber
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
      (t: WorkoutTemplate) => t.dayNumber === dayNumber
    );
    const sortedTemplates = [...dayTemplates].sort((a, b) =>
      a.templateId.localeCompare(b.templateId)
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
      (t: WorkoutTemplate) => t.status === 'completed' || t.status === 'skipped'
    );

    if (allDayTemplatesComplete && program.currentDay === dayNumber) {
      updates.currentDay = program.currentDay + 1;
      console.info('🎯 All workouts for day completed/skipped, advancing to next day:', {
        completedDay: dayNumber,
        newCurrentDay: updates.currentDay,
      });
    }

    // NOTE: We do NOT increment completedWorkouts for skipped workouts
    // This keeps adherenceRate accurate (completed / total)
    // Adherence rate remains the same since we didn't complete anything

    // Check if program is complete (in case they skipped the last day)
    if (updates.currentDay && updates.currentDay > program.totalDays) {
      updates.status = 'completed';
    }

    const updatedProgram = await updateTrainingProgram(
      userId,
      coachId,
      programId,
      updates
    );

    console.info('✅ Workout skipped successfully:', {
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
      message: 'Workout skipped successfully',
      template: {
        templateId: template.templateId,
        name: template.name,
        status: template.status,
        completedAt: template.completedAt,
        skipReason: skipReason || 'Not provided',
      },
      program: {
        programId: updatedProgram.programId,
        currentDay: updates.currentDay,
        completedWorkouts: program.completedWorkouts, // Unchanged
        adherenceRate: program.adherenceRate, // Unchanged
      },
    });
  } catch (error) {
    console.error('❌ Error skipping workout template:', error);
    return createErrorResponse(500, 'Failed to skip workout template', error);
  }
};

export const handler = withAuth(baseHandler);
