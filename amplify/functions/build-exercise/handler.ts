/**
 * Build Exercise Lambda Handler
 *
 * Async Lambda that extracts exercise-level data from logged workouts.
 * Invoked fire-and-forget after workout save completes.
 *
 * Flow:
 * 1. Extract exercises from workoutData (discipline-specific)
 * 2. Batch normalize exercise names using AI
 * 3. Batch save exercises to DynamoDB
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import type {
  BuildExerciseEvent,
  Exercise,
  ExtractedExercise,
} from "../libs/exercise/types";
import { extractExercisesFromWorkout } from "../libs/exercise/extraction";
import { normalizeExerciseNamesBatch } from "../libs/exercise/normalization";
import { saveExercises } from "../../dynamodb/operations";
import { deleteExercisesByWorkoutId } from "../../dynamodb/exercise";
import { generateExerciseId } from "../libs/id-utils";
import { logger } from "../libs/logger";

export const handler = async (event: BuildExerciseEvent) => {
  return withHeartbeat(
    "Exercise Builder",
    async () => {
      const startTime = Date.now();

      try {
        logger.info("🏋️ Starting exercise extraction:", {
          userId: event.userId,
          workoutId: event.workoutId,
          discipline: event.workoutData?.discipline,
          completedAt: event.completedAt,
          timestamp: new Date().toISOString(),
        });

        // Validate required fields
        if (
          !event.userId ||
          !event.coachId ||
          !event.workoutId ||
          !event.workoutData ||
          !event.completedAt
        ) {
          logger.error("❌ Missing required fields:", {
            hasUserId: !!event.userId,
            hasCoachId: !!event.coachId,
            hasWorkoutId: !!event.workoutId,
            hasWorkoutData: !!event.workoutData,
            hasCompletedAt: !!event.completedAt,
          });
          return createErrorResponse(
            400,
            "Missing required fields (userId, coachId, workoutId, workoutData, completedAt)",
          );
        }

        // Validate completedAt is a valid date
        const completedAtDate = new Date(event.completedAt);
        if (isNaN(completedAtDate.getTime())) {
          logger.error("❌ Invalid completedAt date:", event.completedAt);
          return createErrorResponse(400, "Invalid completedAt date format");
        }

        // Step 0 (edit mode only): Delete stale exercise records before re-extraction
        if (event.isEdit) {
          logger.info("🗑️ Edit mode: deleting stale exercise records...");
          try {
            const { deleted } = await deleteExercisesByWorkoutId(
              event.userId,
              event.workoutId,
            );
            logger.info("✅ Stale exercise records deleted:", { deleted });
          } catch (err) {
            logger.error(
              "⚠️ Failed to delete stale exercise records (non-blocking):",
              err,
            );
          }
        }

        // Step 1: Extract exercises from workout data
        logger.info("📋 Extracting exercises from workout...");
        const extractionResult = extractExercisesFromWorkout(event.workoutData);

        logger.info("✅ Extraction completed:", {
          exerciseCount: extractionResult.exercises.length,
          discipline: extractionResult.discipline,
          method: extractionResult.extractionMethod,
        });

        if (extractionResult.exercises.length === 0) {
          logger.info("ℹ️ No exercises found in workout, skipping");
          return createOkResponse({
            success: true,
            skipped: true,
            reason: "No exercises found in workout",
            extractionMethod: extractionResult.extractionMethod,
          });
        }

        // Step 2: Batch normalize exercise names
        logger.info("🔄 Normalizing exercise names...");
        const originalNames = extractionResult.exercises.map(
          (e: ExtractedExercise) => e.originalName,
        );
        const normalizationResult =
          await normalizeExerciseNamesBatch(originalNames);

        logger.info("✅ Normalization completed:", {
          count: normalizationResult.normalizations.length,
          processingTimeMs: normalizationResult.processingTimeMs,
        });

        // Step 3: Build exercise records
        const completedAt = new Date(event.completedAt);
        const exercises: Exercise[] = [];

        // Track sequence numbers for duplicate exercise handling
        const sequenceMap = new Map<string, number>();

        for (let i = 0; i < extractionResult.exercises.length; i++) {
          const extracted = extractionResult.exercises[i];
          const normalization = normalizationResult.normalizations[i];

          // Get sequence number for this exercise (handles duplicates in same workout)
          const exerciseKey = `${normalization.normalizedName}#${event.workoutId}`;
          const sequence = (sequenceMap.get(exerciseKey) || 0) + 1;
          sequenceMap.set(exerciseKey, sequence);

          // Generate unique ID
          const exerciseId = generateExerciseId(event.userId);

          // Build metadata object, only including defined optional fields
          const metadata: any = {
            extractedAt: new Date(),
            normalizationConfidence: normalization.confidence,
          };

          // Only add optional fields if they're defined
          if (extracted.sourceRound !== undefined) {
            metadata.sourceRound = extracted.sourceRound;
          }
          if (extracted.sourceSet !== undefined) {
            metadata.sourceSet = extracted.sourceSet;
          }
          if (extracted.sourceSegment !== undefined) {
            metadata.sourceSegment = extracted.sourceSegment;
          }
          if (extracted.notes !== undefined) {
            metadata.notes = extracted.notes;
          }

          const exercise: Exercise = {
            exerciseId,
            userId: event.userId,
            coachId: event.coachId,
            workoutId: event.workoutId,
            exerciseName: normalization.normalizedName,
            originalName: extracted.originalName,
            discipline: extracted.discipline,
            completedAt,
            sequence,
            metrics: extracted.metrics,
            metadata,
          };

          exercises.push(exercise);
        }

        logger.info("📝 Built exercise records:", {
          count: exercises.length,
          uniqueExercises: sequenceMap.size,
        });

        // Step 4: Batch save to DynamoDB
        logger.info("💾 Saving exercises to DynamoDB...");
        const saveResult = await saveExercises(exercises);

        const processingTimeMs = Date.now() - startTime;

        logger.info("✅ Exercise extraction completed:", {
          userId: event.userId,
          workoutId: event.workoutId,
          discipline: extractionResult.discipline,
          exercisesExtracted: extractionResult.exercises.length,
          exercisesSaved: saveResult.successful,
          exercisesFailed: saveResult.failed,
          processingTimeMs,
        });

        return createOkResponse({
          success: true,
          workoutId: event.workoutId,
          discipline: extractionResult.discipline,
          exercisesExtracted: extractionResult.exercises.length,
          exercisesSaved: saveResult.successful,
          exercisesFailed: saveResult.failed,
          processingTimeMs,
          extractionMethod: extractionResult.extractionMethod,
        });
      } catch (error) {
        logger.error("❌ Error in exercise extraction:", error);
        logger.error("Event data:", {
          userId: event.userId,
          workoutId: event.workoutId,
          discipline: event.workoutData?.discipline,
        });

        const errorMessage =
          error instanceof Error ? error.message : "Unknown extraction error";
        return createErrorResponse(500, "Failed to extract exercises", {
          error: errorMessage,
          userId: event.userId,
          workoutId: event.workoutId,
        });
      }
    },
    5000,
  ); // 5 second heartbeat interval
};
