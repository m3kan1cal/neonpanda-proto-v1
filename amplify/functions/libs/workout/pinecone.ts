/**
 * Workout Pinecone Integration
 *
 * This module handles storing workout-related data in Pinecone for semantic search
 * and coach memory capabilities.
 */

import { storePineconeContext, deletePineconeContext } from '../api-helpers';
import { filterNullish } from '../object-utils';
import { UniversalWorkoutSchema, Workout } from './types';

/**
 * Store workout summary in Pinecone for semantic search and coach context
 *
 * @param userId - The user ID for namespace targeting
 * @param workoutSummary - The AI-generated workout summary text
 * @param workoutData - The structured workout data
 * @param workout - The complete workout object with metadata
 * @returns Promise with storage result
 */
export const storeWorkoutSummaryInPinecone = async (
  userId: string,
  workoutSummary: string,
  workoutData: UniversalWorkoutSchema,
  workout: Workout
) => {
  try {
    // Build base metadata (always present)
    const baseMetadata = {
      recordType: 'workout_summary',
      workoutId: workoutData.workout_id,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name || 'Custom Workout',
      workoutType: workoutData.workout_type,
      completedAt: workout.completedAt.toISOString(),
      extractionConfidence: workout.extractionMetadata.confidence,
      dataCompleteness: workoutData.metadata?.data_completeness,
      coachId: workout.coachIds[0],
      coachName: workout.coachNames[0],
      conversationId: workout.conversationId,
      topics: ['workout_performance', 'training_log', workoutData.discipline, workoutData.workout_type],
      loggedAt: new Date().toISOString()
    };

    // Optional fields (filtered for null/undefined)
    const optionalFields = filterNullish({
      methodology: workoutData.methodology,
      duration: workoutData.duration,
      intensity: workoutData.performance_metrics?.intensity,
      perceivedExertion: workoutData.performance_metrics?.perceived_exertion,
      location: workoutData.location,
    });

    // Discipline-specific metadata
    let disciplineMetadata = {};

    if (workoutData.discipline === 'crossfit' && workoutData.discipline_specific?.crossfit) {
      const crossfit = workoutData.discipline_specific.crossfit;
      disciplineMetadata = {
        workoutFormat: crossfit.workout_format,
        rxStatus: crossfit.rx_status,
        ...filterNullish({
          totalTime: crossfit.performance_data?.total_time,
          roundsCompleted: crossfit.performance_data?.rounds_completed,
          totalReps: crossfit.performance_data?.total_reps,
        })
      };
    }

    if (workoutData.discipline === 'running' && workoutData.discipline_specific?.running) {
      const running = workoutData.discipline_specific.running;
      disciplineMetadata = {
        runType: running.run_type,
        ...filterNullish({
          totalDistance: running.total_distance,
          totalTime: running.total_time,
          averagePace: running.average_pace,
          surface: running.surface,
          elevationGain: running.elevation_gain,
        })
      };
    }

    // PR achievements (if any)
    const prMetadata = workoutData.pr_achievements && workoutData.pr_achievements.length > 0
      ? {
          prAchievements: workoutData.pr_achievements.map(pr => pr.pr_type),
          hasPr: true
        }
      : {};

    // Combine all metadata
    const workoutMetadata = {
      ...baseMetadata,
      ...optionalFields,
      ...disciplineMetadata,
      ...prMetadata
    };

    // Use centralized storage function
    const result = await storePineconeContext(userId, workoutSummary, workoutMetadata);

    console.info('✅ Successfully stored workout summary in Pinecone:', {
      workoutId: workoutData.workout_id,
      recordId: result.recordId,
      namespace: result.namespace,
      discipline: workoutData.discipline,
      summaryLength: workoutSummary.length
    });

    return result;

  } catch (error) {
    console.error('❌ Failed to store workout summary in Pinecone:', error);

    // Don't throw error to avoid breaking the workout extraction process
    // Pinecone storage is for future retrieval/analysis, not critical for immediate functionality
    console.warn('Workout extraction will continue despite Pinecone storage failure');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Delete workout summary from Pinecone when workout is deleted
 *
 * @param userId - The user ID for namespace targeting
 * @param workoutId - The workout ID to delete from Pinecone
 * @returns Promise with deletion result
 */
export const deleteWorkoutSummaryFromPinecone = async (
  userId: string,
  workoutId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.info('🗑️ Deleting workout summary from Pinecone:', {
      userId,
      workoutId
    });

    // Use centralized deletion function with workout-specific filter
    const result = await deletePineconeContext(userId, {
      recordType: 'workout_summary',
      workoutId: workoutId
    });

    if (result.success) {
      console.info('✅ Successfully deleted workout summary from Pinecone:', {
        userId,
        workoutId,
        deletedRecords: result.deletedCount
      });
    } else {
      console.warn('⚠️ Failed to delete workout summary from Pinecone:', {
        userId,
        workoutId,
        error: result.error
      });
    }

    return {
      success: result.success,
      error: result.error
    };

  } catch (error) {
    console.error('❌ Failed to delete workout summary from Pinecone:', error);

    // Don't throw error to avoid breaking the workout deletion process
    // Pinecone cleanup failure shouldn't prevent DynamoDB deletion
    console.warn('Workout deletion will continue despite Pinecone cleanup failure');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
