import { createSuccessResponse, createErrorResponse, callBedrockApi } from '../libs/api-helpers';
import { saveWorkout } from '../../dynamodb/operations';
import {
  buildWorkoutExtractionPrompt,
  parseAndValidateWorkoutData,
  calculateConfidence,
  extractCompletedAtTime,
  generateWorkoutSummary,
  storeWorkoutSummaryInPinecone,
  classifyDiscipline,
  BuildWorkoutEvent,
  UniversalWorkoutSchema,
  DisciplineClassification
} from '../libs/workout';


export const handler = async (event: BuildWorkoutEvent) => {
  try {
    console.info('🏋️ Starting workout extraction:', {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      messageLength: event.userMessage.length,
      coachName: event.coachConfig.coach_name,
      detectionType: event.isSlashCommand ? 'slash_command' : 'natural_language',
      slashCommand: event.slashCommand || null,
      timestamp: new Date().toISOString()
    });

    // For slash commands, the message is already cleaned (just the workout content)
    // For natural language, the message is the full user response
    const workoutContent = event.userMessage;

    if (event.isSlashCommand) {
      console.info('🎯 Processing slash command workout:', {
        command: event.slashCommand,
        content: workoutContent,
        isExplicitLogging: true
      });
    }

    // Build extraction prompt using Universal Workout Schema
    const extractionPrompt = buildWorkoutExtractionPrompt(workoutContent, event.coachConfig);

    console.info('Generated extraction prompt:', {
      promptLength: extractionPrompt.length,
      userMessage: workoutContent,
      promptPreview: extractionPrompt.substring(0, 1000) + (extractionPrompt.length > 1000 ? '...' : '')
    });

    console.info('Calling Claude for workout extraction...');
    const extractedData = await callBedrockApi(extractionPrompt, workoutContent);

    console.info('Claude extraction completed. Raw response:', {
      responseLength: extractedData.length,
      responsePreview: extractedData.substring(0, 500) + (extractedData.length > 500 ? '...' : '')
    });

    console.info('Parsing extracted data...');

    // Parse and validate the extracted data
    const workoutData: UniversalWorkoutSchema = await parseAndValidateWorkoutData(extractedData, event.userId);

    // For slash commands, add metadata about explicit logging
    if (event.isSlashCommand) {
      workoutData.metadata.logged_via = 'slash_command';
      workoutData.metadata.extraction_notes =
        (workoutData.metadata.extraction_notes ? workoutData.metadata.extraction_notes + ' ' : '') +
        `User explicitly logged workout using /${event.slashCommand} command.`;
    }

    console.info('Parsed workout data structure:', {
      basicInfo: {
        workoutId: workoutData.workout_id,
        discipline: workoutData.discipline,
        workoutName: workoutData.workout_name,
        workoutType: workoutData.workout_type,
        duration: workoutData.duration,
        location: workoutData.location
      },
      performanceMetrics: workoutData.performance_metrics ? 'Present' : 'Missing',
      disciplineSpecific: workoutData.discipline_specific ? Object.keys(workoutData.discipline_specific) : 'Missing',
      crossfitData: workoutData.discipline_specific?.crossfit ? {
        workoutFormat: workoutData.discipline_specific.crossfit.workout_format,
        rxStatus: workoutData.discipline_specific.crossfit.rx_status,
        roundsCount: workoutData.discipline_specific.crossfit.rounds?.length || 0,
        performanceData: workoutData.discipline_specific.crossfit.performance_data ? 'Present' : 'Missing'
      } : 'Missing',
      metadataCompleteness: workoutData.metadata?.data_completeness,
      validationFlags: workoutData.metadata?.validation_flags?.length || 0
    });

    // Calculate confidence score and update metadata
    // Note: metadata is guaranteed to exist after parseAndValidateWorkoutData
    const confidence = calculateConfidence(workoutData);
    workoutData.metadata.data_confidence = confidence;

    // Check for blocking validation flags that indicate this isn't a real workout log
    // More intelligent blocking logic based on context and discipline

    // Use AI to classify the discipline characteristics
    let isQualitativeDiscipline = false;
    let disciplineClassification: DisciplineClassification;

    try {
      disciplineClassification = await classifyDiscipline(workoutData.discipline, workoutData);
      isQualitativeDiscipline = disciplineClassification.isQualitative;
    } catch (error) {
      console.warn('Failed to classify discipline, defaulting to quantitative:', error);
      // Default to quantitative (more restrictive) if classification fails
      isQualitativeDiscipline = false;
      disciplineClassification = {
        isQualitative: false,
        requiresPreciseMetrics: true,
        environment: 'mixed',
        primaryFocus: 'mixed',
        confidence: 0,
        reasoning: 'Classification failed, defaulted to quantitative'
      };
    }

    // For slash commands, we're very lenient since user explicitly requested logging
    // For qualitative disciplines, we're more forgiving about missing precise metrics
    let blockingFlags: string[];

    if (event.isSlashCommand) {
      // For slash commands, only block if there's truly no workout information at all
      // Don't block on 'no_performance_data' since user explicitly wants to log something
      blockingFlags = [];
    } else if (isQualitativeDiscipline) {
      // For endurance/qualitative sports, be less strict about performance data
      // These often focus on time, effort, technique rather than precise metrics
      blockingFlags = ['planning_inquiry', 'advice_seeking', 'future_planning'];
    } else {
      // For strength/power sports, maintain stricter requirements
      blockingFlags = ['planning_inquiry', 'no_performance_data', 'advice_seeking', 'future_planning'];
    }

    const hasBlockingFlag = workoutData.metadata.validation_flags?.some(flag =>
      blockingFlags.includes(flag)
    );

    if (hasBlockingFlag) {
      const detectedFlags = workoutData.metadata.validation_flags?.filter(flag =>
        blockingFlags.includes(flag)
      );

      console.info('🚫 Skipping workout save - blocking validation flags detected:', {
        workoutId: workoutData.workout_id,
        blockingFlags: detectedFlags,
        confidence,
        dataCompleteness: workoutData.metadata.data_completeness,
        extractionNotes: workoutData.metadata.extraction_notes,
        isSlashCommand: event.isSlashCommand,
        slashCommand: event.slashCommand,
        discipline: workoutData.discipline,
        disciplineClassification,
        appliedBlockingFlags: blockingFlags
      });

      let reason: string;
      if (event.isSlashCommand) {
        reason = 'Unable to extract any workout information from slash command content';
      } else if (detectedFlags?.includes('no_performance_data') && !isQualitativeDiscipline) {
        reason = 'No performance data found for strength/power workout';
      } else {
        reason = 'Not a workout log - appears to be planning/advice seeking';
      }

      return createSuccessResponse({
        success: false,
        skipped: true,
        reason,
        blockingFlags: detectedFlags,
        confidence,
        workoutId: workoutData.workout_id
      });
    }

    // Determine completed time using AI extraction
    const extractedTime = await extractCompletedAtTime(workoutContent);
    const completedAt = event.completedAt
      ? new Date(event.completedAt)
      : extractedTime || new Date();

    console.info('Workout timing analysis:', {
      userMessage: workoutContent.substring(0, 100),
      extractedTime: extractedTime ? extractedTime.toISOString() : null,
      finalCompletedAt: completedAt.toISOString(),
      currentTime: new Date().toISOString(),
      isToday: completedAt.toDateString() === new Date().toDateString(),
      daysDifference: Math.floor((new Date().getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24))
    });

    // Generate AI summary for coach context and UI display
    console.info('Generating workout summary...');
    const summary = await generateWorkoutSummary(workoutData, event.userMessage);
    console.info('Generated summary:', { summary, length: summary.length });

    // Create workout session
    const workout = {
      workoutId: workoutData.workout_id,
      userId: event.userId,
      coachIds: [event.coachId],
      coachNames: [event.coachConfig.coach_name],
      conversationId: event.conversationId,
      completedAt,
      workoutData,
      summary, // NEW: AI-generated summary
      extractionMetadata: {
        confidence,
        extractedAt: new Date(),
        reviewedBy: "system",
        reviewedAt: new Date()
      }
    };

    console.info('Saving workout to DynamoDB...', {
      workoutId: workout.workoutId,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name,
      confidence,
      completeness: workoutData.metadata!.data_completeness || 0,
      detectionType: event.isSlashCommand ? 'slash_command' : 'natural_language',
      slashCommand: event.slashCommand || null
    });

    // Log the complete workout data structure being saved (with truncation for readability)
    console.info('Complete workout data being saved:', {
      workout: {
        workoutId: workout.workoutId,
        userId: workout.userId,
        conversationId: workout.conversationId,
        completedAt: workout.completedAt,
        extractionMetadata: workout.extractionMetadata
      },
      workoutData: {
        ...workoutData,
        // Show discipline-specific data in readable format
        discipline_specific_summary: workoutData.discipline_specific ? {
          disciplines: Object.keys(workoutData.discipline_specific),
          crossfit_details: workoutData.discipline_specific.crossfit ?
            JSON.stringify(workoutData.discipline_specific.crossfit).substring(0, 500) + '...' : null
        } : null
      }
    });

    // Save to DynamoDB
    await saveWorkout(workout);

    // Store workout summary in Pinecone for semantic search and coach context
    console.info('📝 Storing workout summary in Pinecone...');
    const pineconeResult = await storeWorkoutSummaryInPinecone(
      event.userId,
      summary,
      workoutData,
      workout
    );

    console.info('✅ Workout extraction completed successfully:', {
      workoutId: workout.workoutId,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name || 'Custom Workout',
      confidence,
      validationFlags: workoutData.metadata!.validation_flags || [],
      pineconeStored: pineconeResult.success,
      pineconeRecordId: pineconeResult.success && 'recordId' in pineconeResult ? pineconeResult.recordId : null
    });

    return createSuccessResponse({
      success: true,
      workoutId: workout.workoutId,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name,
      confidence,
      extractionMetadata: workout.extractionMetadata
    });

  } catch (error) {
    console.error('❌ Error extracting workout session:', error);
    console.error('Event data:', {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      messagePreview: event.userMessage.substring(0, 100)
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
    return createErrorResponse(500, 'Failed to extract workout session', {
      error: errorMessage,
      userId: event.userId,
      conversationId: event.conversationId
    });
  }
};
