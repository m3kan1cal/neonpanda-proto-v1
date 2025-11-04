import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
  MODEL_IDS,
  invokeAsyncLambda,
} from '../libs/api-helpers';
import {
  getTrainingProgram,
  updateTrainingProgram,
  getUserProfile,
  getCoachConfig,
} from '../../dynamodb/operations';
import { getTrainingProgramDetailsFromS3, saveTrainingProgramDetailsToS3 } from '../libs/training-program/s3-utils';
import { WorkoutTemplate, WorkoutFeedback } from '../libs/training-program/types';
import { getUserTimezoneOrDefault } from '../libs/analytics/date-utils';
import { parseJsonWithFallbacks } from '../libs/response-utils';
import { BuildWorkoutEvent, TemplateContext } from '../libs/workout/types';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import {
  buildScalingAnalysisPrompt,
  getDefaultScalingAnalysis,
  normalizeScalingAnalysis
} from '../libs/training-program/scaling-analysis';

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
    const { userPerformance, feedback, completedAt } = body;

    if (!userPerformance || typeof userPerformance !== 'string') {
      return createErrorResponse(400, 'userPerformance is required (string describing what you did)');
    }

    // Fetch user profile, program, and coach config in parallel
    const [programData, userProfile, coachConfigData] = await Promise.all([
      getTrainingProgram(userId, coachId, programId),
      getUserProfile(userId),
      getCoachConfig(userId, coachId),
    ]);

    // Get user timezone with LA fallback
    const userTimezone = getUserTimezoneOrDefault(userProfile?.attributes?.preferences?.timezone);

    if (!programData) {
      return createErrorResponse(404, 'Training program not found');
    }

    if (!coachConfigData) {
      return createErrorResponse(500, 'Coach configuration not found');
    }

    const program = programData.attributes;
    const coachConfig = coachConfigData.attributes;

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

    // Check if already completed
    if (template.status === 'completed') {
      return createErrorResponse(400, 'Workout template already completed');
    }

    // Get the phase for this template (by day range)
    const phase = program.phases.find(
      (p) => template.dayNumber >= p.startDay && template.dayNumber <= p.endDay
    );

    console.info('🏋️ Logging workout from template:', {
      userId,
      programId,
      templateId,
      dayNumber: template.dayNumber,
      templateName: template.name,
      userPerformanceLength: userPerformance.length,
    });

    // ==================================================================
    // STEP 1: Quick AI call (Haiku 4.5) to analyze scaling/modifications
    // ==================================================================
    console.info('🤖 Analyzing workout scaling with Haiku 4.5...');
    const scalingPrompt = buildScalingAnalysisPrompt(
      template.description,
      userPerformance,
      {
        name: template.name,
        equipment: template.equipment,
        scoringType: template.scoringType,
      }
    );

    let scalingAnalysis = getDefaultScalingAnalysis();

    try {
      const scalingResponse = await callBedrockApi(
        scalingPrompt, // System prompt contains all instructions and context
        'Analyze the scaling and modifications for this workout.', // Simple user request
        MODEL_IDS.CLAUDE_HAIKU_4FULL, // Claude Haiku 4.5 - fast, cheap model for scaling analysis
        {
          prefillResponse: '{',
          enableThinking: false,
        }
      );

      const parsed = parseJsonWithFallbacks(scalingResponse);
      scalingAnalysis = normalizeScalingAnalysis(parsed);

      console.info('✅ Scaling analysis completed:', {
        wasScaled: scalingAnalysis.wasScaled,
        modificationsCount: scalingAnalysis.modifications.length,
        adherenceScore: scalingAnalysis.adherenceScore,
        reasoning: parsed?.reasoning || 'N/A',
      });
    } catch (error: any) {
      console.error('⚠️ Scaling analysis failed, continuing with defaults:', error);
      console.error('⚠️ Error details:', {
        name: error.name,
        message: error.message,
        $metadata: error.$metadata,
        $fault: error.$fault,
      });
      // Continue with default values (no scaling detected)
    }

    // ==================================================================
    // STEP 2: Update template status immediately (for instant UX feedback)
    // ==================================================================
    template.status = 'completed';
    template.completedAt = completedAt ? new Date(completedAt) : new Date();
    template.linkedWorkoutId = null; // Will be updated by build-workout later

    // Store feedback with scaling analysis
    const workoutFeedback: WorkoutFeedback = {
      rating: feedback?.rating || 0,
      difficulty: feedback?.difficulty || null,
      comments: feedback?.comments || null,
      timestamp: new Date(),
      scalingAnalysis,
    };
    template.userFeedback = workoutFeedback;

    programDetails.workoutTemplates[templateIndex] = template;
    await saveTrainingProgramDetailsToS3(program.s3DetailKey, programDetails);

    console.info('✅ Template status updated in S3:', {
      templateId,
      status: 'completed',
      wasScaled: scalingAnalysis.wasScaled,
    });

    // ==================================================================
    // STEP 3: Build enriched message for build-workout
    // ==================================================================
    const enrichedMessage = `PRESCRIBED WORKOUT (Template: ${template.name}):
${template.description}

${template.notes ? `COACH NOTES:\n${template.notes}\n\n` : ''}ACTUAL PERFORMANCE:
${userPerformance}`;

    // ==================================================================
    // STEP 4: Build templateContext for build-workout
    // ==================================================================
    const templateContext: TemplateContext = {
      programId: program.programId,
      templateId: template.templateId,
      groupId: template.groupId,
      dayNumber: template.dayNumber,
      phaseId: phase?.phaseId,
      phaseName: phase?.name || 'Unknown Phase',
      scoringType: template.scoringType,
      prescribedExercises: template.prescribedExercises,
      estimatedDuration: template.estimatedDuration,
      prescribedDescription: template.description,
      scalingAnalysis,
    };

    // ==================================================================
    // STEP 5: Invoke build-workout async (like create-workout does)
    // ==================================================================
    const buildWorkoutPayload: BuildWorkoutEvent = {
      userId,
      coachId,
      conversationId: program.creationConversationId,
      userMessage: enrichedMessage,
      coachConfig,
      completedAt: template.completedAt.toISOString(),
      messageTimestamp: new Date().toISOString(),
      userTimezone,
      isSlashCommand: false,
      templateContext, // NEW: Pass template context
    };

    const buildWorkoutFunctionName = process.env.BUILD_WORKOUT_FUNCTION_NAME;
    if (!buildWorkoutFunctionName) {
      console.error('❌ BUILD_WORKOUT_FUNCTION_NAME environment variable not set');
      return createErrorResponse(500, 'Configuration error');
    }

    try {
      await invokeAsyncLambda(
        buildWorkoutFunctionName,
        buildWorkoutPayload,
        `log workout from template ${templateId}`
      );
      console.info('✅ build-workout lambda invoked successfully');
    } catch (error) {
      console.error('❌ Failed to invoke build-workout lambda:', error);
      // Don't return error - we've already updated template status
      // Just log the error and continue
    }

    // ==================================================================
    // STEP 6: Update program stats in DynamoDB
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

      // First template of the day is considered primary (for day advancement logic)
      const sortedTemplates = [...dayTemplates].sort((a, b) =>
        a.templateId.localeCompare(b.templateId)
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

    // Update completion status
    if (isPrimary) {
      program.dayCompletionStatus[dayNumber].primaryComplete = true;
    } else {
      program.dayCompletionStatus[dayNumber].optionalCompleted += 1;
    }

    const updates: any = {
      lastActivityAt: new Date(),
      completedWorkouts: program.completedWorkouts + 1,
      dayCompletionStatus: program.dayCompletionStatus,
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

    // Recalculate adherence rate (as percentage 0-100)
    updates.adherenceRate =
      program.totalWorkouts > 0
        ? (updates.completedWorkouts / program.totalWorkouts) * 100
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

    console.info('✅ Workout logging initiated successfully:', {
      userId,
      programId,
      templateId,
      isPrimary,
      dayAdvanced: isPrimary,
      newCurrentDay: updates.currentDay,
      adherenceRate: updates.adherenceRate,
      wasScaled: scalingAnalysis.wasScaled,
    });

    return createOkResponse({
      success: true,
      message: 'Workout logging in progress. Your workout is being processed in the background.',
      status: 'processing',
      template: {
        templateId: template.templateId,
        name: template.name,
        status: template.status,
        completedAt: template.completedAt,
        scalingAnalysis,
      },
      program: {
        programId: updatedProgram.programId,
        currentDay: updates.currentDay,
        completedWorkouts: updates.completedWorkouts,
        adherenceRate: updates.adherenceRate,
      },
    });
  } catch (error) {
    console.error('❌ Error logging workout template:', error);
    return createErrorResponse(500, 'Failed to log workout template', error);
  }
};

export const handler = withAuth(baseHandler);
