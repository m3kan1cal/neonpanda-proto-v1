import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getTrainingProgram, updateTrainingProgram, saveWorkout, getUserProfile } from '../../dynamodb/operations';
import { getTrainingProgramDetailsFromS3, saveTrainingProgramDetailsToS3 } from '../libs/training-program/s3-utils';
import { convertTemplateToUniversalSchema } from '../libs/training-program/template-utils';
import { getUserTimezoneOrDefault } from '../libs/analytics/date-utils';
import { Workout } from '../libs/workout/types';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

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

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const body = JSON.parse(event.body);
    const { workoutData, feedback, completedAt } = body;

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

    // Get program details from S3
    if (!program.s3DetailKey) {
      return createErrorResponse(404, 'Program details not found');
    }

    const programDetails = await getTrainingProgramDetailsFromS3(program.s3DetailKey);

    if (!programDetails) {
      return createErrorResponse(404, 'Program details not found in S3');
    }

    // Find the workout template
    const templateIndex = programDetails.dailyWorkoutTemplates.findIndex(
      (t) => t.templateId === templateId
    );

    if (templateIndex === -1) {
      return createErrorResponse(404, 'Workout template not found');
    }

    const template = programDetails.dailyWorkoutTemplates[templateIndex];

    // Check if already completed
    if (template.status === 'completed') {
      return createErrorResponse(400, 'Workout template already completed');
    }

    // Get the phase for this template
    const phase = program.phases.find(
      (p) => p.phaseId === template.phaseId
    );

    // Create a Workout entity (Universal Schema) from the template
    // Generate workout ID (consistent with workout/conversation pattern)
    const shortId = Math.random().toString(36).substring(2, 11);
    const workoutId = `workout_${userId}_${Date.now()}_${shortId}`;
    const workout: Workout = {
      workoutId,
      userId,
      coachIds: [coachId],
      coachNames: [], // TODO: Fetch coach name if needed
      conversationId: program.creationConversationId,
      completedAt: completedAt ? new Date(completedAt) : new Date(),
      workoutData: workoutData || convertTemplateToUniversalSchema(template, userId, workoutId),
      extractionMetadata: {
        confidence: 1.0, // High confidence since it's from a template
        extractedAt: new Date(),
      },
      summary: `${template.name} - Day ${template.dayNumber} of ${program.name}`,
      workoutName: template.name,
      trainingProgramContext: {
        programId: program.programId,
        coachId,
        templateId: template.templateId,
        dayNumber: template.dayNumber,
        phaseId: template.phaseId,
        phaseName: phase?.name || 'Unknown Phase',
      },
    };

    // Save the workout to DynamoDB
    await saveWorkout(workout);

    // Update the template in S3
    template.status = 'completed';
    template.completedAt = workout.completedAt;
    template.linkedWorkoutId = workoutId;
    template.userFeedback = feedback || null;

    programDetails.dailyWorkoutTemplates[templateIndex] = template;
    await saveTrainingProgramDetailsToS3(program.s3DetailKey, programDetails);

    // Update program stats in DynamoDB
    const dayNumber = template.dayNumber;
    const templateType = template.templateType;

    // Initialize dayCompletionStatus if it doesn't exist
    if (!program.dayCompletionStatus) {
      program.dayCompletionStatus = {};
    }

    if (!program.dayCompletionStatus[dayNumber]) {
      // Count total templates for this day
      const dayTemplates = programDetails.dailyWorkoutTemplates.filter(
        (t) => t.dayNumber === dayNumber
      );
      const totalOptional = dayTemplates.filter(
        (t) => t.templateType === 'optional' || t.templateType === 'accessory'
      ).length;

      program.dayCompletionStatus[dayNumber] = {
        primaryComplete: false,
        optionalCompleted: 0,
        totalOptional,
      };
    }

    // Update completion status
    if (templateType === 'primary') {
      program.dayCompletionStatus[dayNumber].primaryComplete = true;
    } else if (templateType === 'optional' || templateType === 'accessory') {
      program.dayCompletionStatus[dayNumber].optionalCompleted += 1;
    }

    const updates: any = {
      lastActivityDate: new Date(),
      completedWorkouts: program.completedWorkouts + 1,
      dayCompletionStatus: program.dayCompletionStatus,
    };

    // Only advance currentDay if primary template is completed
    if (templateType === 'primary') {
      updates.currentDay = program.currentDay + 1;
    }

    // Recalculate adherence rate
    updates.adherenceRate =
      program.totalWorkouts > 0
        ? updates.completedWorkouts / program.totalWorkouts
        : 0;

    // Check if program is complete
    if (updates.currentDay && updates.currentDay > program.totalDays) {
      updates.status = 'completed';
    }

    const updatedProgram = await updateTrainingProgram(
      userId,
      coachId,
      programId,
      updates
    );

    return createOkResponse({
      success: true,
      workout,
      template,
      program: updatedProgram,
      message: `Workout logged successfully`,
    });
  } catch (error) {
    console.error('Error logging workout template:', error);
    return createErrorResponse(500, 'Failed to log workout template', error);
  }
};

export const handler = withAuth(baseHandler);
