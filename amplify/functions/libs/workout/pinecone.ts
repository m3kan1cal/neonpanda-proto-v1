/**
 * Workout Pinecone Integration
 *
 * This module handles storing workout-related data in Pinecone for semantic search
 * and coach memory capabilities.
 */

import { storePineconeContext, deletePineconeContext } from "../api-helpers";
import { storeWithAutoCompression } from "../pinecone-compression";
import { filterNullish } from "../object-utils";
import { UniversalWorkoutSchema, Workout } from "./types";
import { logger } from "../logger";

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
  workout: Workout,
) => {
  try {
    // Build base metadata (always present)
    const baseMetadata = {
      recordType: "workout_summary",
      workoutId: workoutData.workout_id,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name || "Custom Workout",
      workoutType: workoutData.workout_type,
      completedAt:
        workout.completedAt instanceof Date
          ? workout.completedAt.toISOString()
          : String(workout.completedAt),
      extractionConfidence: workout.extractionMetadata.confidence,
      dataCompleteness: workoutData.metadata?.data_completeness ?? 0, // Default to 0 if null
      coachId: workout.coachIds[0],
      coachName: workout.coachNames[0],
      conversationId: workout.conversationId,
      topics: [
        "workout_performance",
        "training_log",
        workoutData.discipline,
        workoutData.workout_type,
      ],
      loggedAt: new Date().toISOString(),
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

    if (
      workoutData.discipline === "crossfit" &&
      workoutData.discipline_specific?.crossfit
    ) {
      const crossfit = workoutData.discipline_specific.crossfit;
      disciplineMetadata = {
        workoutFormat: crossfit.workout_format,
        rxStatus: crossfit.rx_status,
        ...filterNullish({
          totalTime: crossfit.performance_data?.total_time,
          roundsCompleted: crossfit.performance_data?.rounds_completed,
          totalReps: crossfit.performance_data?.total_reps,
        }),
      };
    }

    if (
      workoutData.discipline === "running" &&
      workoutData.discipline_specific?.running
    ) {
      const running = workoutData.discipline_specific.running;
      disciplineMetadata = {
        runType: running.run_type,
        ...filterNullish({
          totalDistance: running.total_distance,
          totalTime: running.total_time,
          averagePace: running.average_pace,
          surface: running.surface,
          elevationGain: running.elevation_gain,
        }),
      };
    }

    if (
      workoutData.discipline === "trail_running" &&
      workoutData.discipline_specific?.trail_running
    ) {
      const trailRunning = workoutData.discipline_specific.trail_running;
      disciplineMetadata = {
        runType: trailRunning.run_type,
        isUltra: trailRunning.is_ultra ?? false,
        ...filterNullish({
          totalDistance: trailRunning.total_distance,
          totalTime: trailRunning.total_time,
          averagePace: trailRunning.average_pace,
          surface: trailRunning.surface,
          technicality: trailRunning.technicality,
          elevationGain: trailRunning.elevation_gain,
          elevationLoss: trailRunning.elevation_loss,
          raceName: trailRunning.race_name,
        }),
      };
    }

    if (
      workoutData.discipline === "backpacking" &&
      workoutData.discipline_specific?.backpacking
    ) {
      const backpacking = workoutData.discipline_specific.backpacking;
      disciplineMetadata = {
        ...filterNullish({
          tripName: backpacking.trip_name,
          tripDay: backpacking.trip_day,
          totalTripDays: backpacking.total_trip_days,
          totalDistance: backpacking.total_distance,
          totalTime: backpacking.total_time,
          movingTime: backpacking.moving_time,
          packWeight: backpacking.pack_weight,
          packWeightUnit: backpacking.pack_weight_unit,
          elevationGain: backpacking.elevation_gain,
          elevationLoss: backpacking.elevation_loss,
          surface: backpacking.surface,
        }),
      };
    }

    if (
      workoutData.discipline === "rucking" &&
      workoutData.discipline_specific?.rucking
    ) {
      const rucking = workoutData.discipline_specific.rucking;
      disciplineMetadata = {
        ruckType: rucking.ruck_type,
        ...filterNullish({
          eventName: rucking.event_name,
          totalDistance: rucking.total_distance,
          totalTime: rucking.total_time,
          averagePace: rucking.average_pace,
          packWeight: rucking.pack_weight,
          packWeightUnit: rucking.pack_weight_unit,
          cadence: rucking.cadence,
          elevationGain: rucking.elevation_gain,
          surface: rucking.surface,
        }),
      };
    }

    // PR achievements (if any)
    const prMetadata =
      workoutData.pr_achievements && workoutData.pr_achievements.length > 0
        ? {
            prAchievements: workoutData.pr_achievements.map((pr) => pr.pr_type),
            hasPr: true,
          }
        : {};

    // Combine all metadata
    const workoutMetadata = {
      ...baseMetadata,
      ...optionalFields,
      ...disciplineMetadata,
      ...prMetadata,
    };

    // Store with automatic AI compression if size limit exceeded
    const result = await storeWithAutoCompression(
      (content) => storePineconeContext(userId, content, workoutMetadata),
      workoutSummary,
      workoutMetadata,
      "workout summary",
    );

    logger.info("✅ Successfully stored workout summary in Pinecone:", {
      workoutId: workoutData.workout_id,
      recordId: result.recordId,
      namespace: result.namespace,
      discipline: workoutData.discipline,
      summaryLength: workoutSummary.length,
    });

    return result;
  } catch (error) {
    logger.error("❌ Failed to store workout summary in Pinecone:", error);

    // Don't throw error to avoid breaking the workout extraction process
    // Pinecone storage is for future retrieval/analysis, not critical for immediate functionality
    logger.warn(
      "Workout extraction will continue despite Pinecone storage failure",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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
  workoutId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    logger.info("🗑️ Deleting workout summary from Pinecone:", {
      userId,
      workoutId,
    });

    // Use centralized deletion function with workout-specific filter
    const result = await deletePineconeContext(userId, {
      recordType: "workout_summary",
      workoutId: workoutId,
    });

    if (result.success) {
      logger.info("✅ Successfully deleted workout summary from Pinecone:", {
        userId,
        workoutId,
        deletedRecords: result.deletedCount,
      });
    } else {
      logger.warn("⚠️ Failed to delete workout summary from Pinecone:", {
        userId,
        workoutId,
        error: result.error,
      });
    }

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    logger.error("❌ Failed to delete workout summary from Pinecone:", error);

    // Don't throw error to avoid breaking the workout deletion process
    // Pinecone cleanup failure shouldn't prevent DynamoDB deletion
    logger.warn(
      "Workout deletion will continue despite Pinecone cleanup failure",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
