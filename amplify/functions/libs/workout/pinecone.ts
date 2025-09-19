/**
 * Workout Pinecone Integration
 *
 * This module handles storing workout-related data in Pinecone for semantic search
 * and coach memory capabilities.
 */

import { storePineconeContext, deletePineconeContext } from '../api-helpers';
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
    // Prepare workout-specific metadata for Pinecone
    const workoutMetadata = {
      record_type: 'workout_summary',

      // Core workout identification
      workout_id: workoutData.workout_id,
      discipline: workoutData.discipline,
      workout_name: workoutData.workout_name || 'Custom Workout',
      workout_type: workoutData.workout_type,
      methodology: workoutData.methodology,

      // Performance metrics (filter out null values)
      ...(workoutData.duration !== null && { duration: workoutData.duration }),
      ...(workoutData.performance_metrics?.intensity !== null && workoutData.performance_metrics?.intensity !== undefined && { intensity: workoutData.performance_metrics.intensity }),
      ...(workoutData.performance_metrics?.perceived_exertion !== null && workoutData.performance_metrics?.perceived_exertion !== undefined && { perceived_exertion: workoutData.performance_metrics.perceived_exertion }),

      // Discipline-specific data (filter out null values)
      ...(workoutData.discipline === 'crossfit' && workoutData.discipline_specific?.crossfit && {
        workout_format: workoutData.discipline_specific.crossfit.workout_format,
        rx_status: workoutData.discipline_specific.crossfit.rx_status,
        ...(workoutData.discipline_specific.crossfit.performance_data?.total_time !== null && workoutData.discipline_specific.crossfit.performance_data?.total_time !== undefined && { total_time: workoutData.discipline_specific.crossfit.performance_data.total_time }),
        ...(workoutData.discipline_specific.crossfit.performance_data?.rounds_completed !== null && workoutData.discipline_specific.crossfit.performance_data?.rounds_completed !== undefined && { rounds_completed: workoutData.discipline_specific.crossfit.performance_data.rounds_completed }),
        ...(workoutData.discipline_specific.crossfit.performance_data?.total_reps !== null && workoutData.discipline_specific.crossfit.performance_data?.total_reps !== undefined && { total_reps: workoutData.discipline_specific.crossfit.performance_data.total_reps }),
      }),

      // Completion and extraction metadata
      completed_at: workout.completedAt.toISOString(),
      extraction_confidence: workout.extractionMetadata.confidence,
      data_completeness: workoutData.metadata?.data_completeness,

      // Coach context
      coach_id: workout.coachIds[0],
      coach_name: workout.coachNames[0],
      conversation_id: workout.conversationId,

      // Semantic search categories
      topics: ['workout_performance', 'training_log', workoutData.discipline, workoutData.workout_type],

      // PR achievements (if any)
      ...(workoutData.pr_achievements && workoutData.pr_achievements.length > 0 && {
        pr_achievements: workoutData.pr_achievements.map(pr => pr.pr_type),
        has_pr: true
      }),

      // Additional context for retrieval (filter out null values)
      ...(workoutData.location !== null && { location: workoutData.location }),
      logged_at: new Date().toISOString()
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
      record_type: 'workout_summary',
      workout_id: workoutId
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
