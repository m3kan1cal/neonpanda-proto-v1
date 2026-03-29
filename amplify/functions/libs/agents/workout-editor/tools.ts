/**
 * Workout Editor Agent Tools
 *
 * Two specialized tools for the workout_edit conversation mode:
 *   1. load_workout_details — reads the full workout from DynamoDB
 *   2. apply_workout_edits — validates, persists edits, and triggers the post-edit pipeline
 *
 * The post-edit pipeline inside apply_workout_edits:
 *   - Regenerates the AI summary
 *   - Updates the Pinecone vector (delete → store)
 *   - Fire-and-forgets build-workout-analysis (insights refresh)
 *   - Fire-and-forgets build-exercise (exercise catalog cleanup + rebuild, isEdit: true)
 *
 * Pattern: follows agents/workout-logger/tools.ts conventions.
 */

import type { Tool } from "../core/types";
import type { ConversationAgentContext } from "../conversation/types";
import {
  LOAD_WORKOUT_DETAILS_SCHEMA,
  APPLY_WORKOUT_EDITS_SCHEMA,
} from "../../schemas/conversation-agent-tool-schemas";
import { getWorkout, updateWorkout } from "../../../../dynamodb/workout";
import { generateWorkoutSummary } from "../../workout/extraction";
import {
  storeWorkoutSummaryInPinecone,
  deleteWorkoutSummaryFromPinecone,
} from "../../workout/pinecone";
import { invokeAsyncLambda } from "../../api-helpers";
import { logger } from "../../logger";

// Immutable fields that must never be overwritten by AI edits
const IMMUTABLE_FIELDS = new Set([
  "workoutId",
  "userId",
  "coachIds",
  "coachNames",
  "conversationId",
]);

// ============================================================================
// Tool 1: load_workout_details
// ============================================================================

export const loadWorkoutDetailsTool: Tool<ConversationAgentContext> = {
  id: "load_workout_details",
  description:
    "Load the full details of the workout being edited. Call this on your first turn to understand the current state before proposing any changes.",
  inputSchema: LOAD_WORKOUT_DETAILS_SCHEMA,
  execute: async (
    _input: Record<string, any>,
    context: ConversationAgentContext,
  ) => {
    try {
      const editContext = context.editContext;
      if (!editContext || editContext.entityType !== "workout") {
        return { error: "No workout edit context available" };
      }

      const workout = await getWorkout(context.userId, editContext.entityId);
      if (!workout) {
        return { error: `Workout ${editContext.entityId} not found` };
      }

      logger.info("✅ Workout details loaded for editing:", {
        workoutId: workout.workoutId,
        discipline: workout.workoutData?.discipline,
      });

      return {
        workoutId: workout.workoutId,
        completedAt: workout.completedAt,
        summary: workout.summary,
        workoutData: workout.workoutData,
        extractionMetadata: workout.extractionMetadata,
        programContext: workout.programContext,
        templateId: workout.templateId,
        imageS3Keys: workout.imageS3Keys,
      };
    } catch (error) {
      logger.error("❌ load_workout_details failed:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to load workout",
      };
    }
  },
};

(loadWorkoutDetailsTool as any).contextualMessage = [
  "Loading workout details...",
  "Reading your workout data...",
  "Fetching workout information...",
];

// ============================================================================
// Tool 2: apply_workout_edits
// ============================================================================

export const applyWorkoutEditsTool: Tool<ConversationAgentContext> = {
  id: "apply_workout_edits",
  description:
    "Apply confirmed edits to the workout. Only call this after the user has explicitly approved the proposed changes. Provide a partial Workout object with only the fields to update, plus a human-readable editSummary describing what changed.",
  inputSchema: APPLY_WORKOUT_EDITS_SCHEMA,
  execute: async (
    input: { edits: Record<string, any>; editSummary: string },
    context: ConversationAgentContext,
  ) => {
    try {
      const editContext = context.editContext;
      if (!editContext || editContext.entityType !== "workout") {
        return { error: "No workout edit context available" };
      }

      const { edits, editSummary } = input;

      if (!edits || typeof edits !== "object") {
        return { error: "edits must be an object" };
      }
      if (!editSummary || typeof editSummary !== "string") {
        return { error: "editSummary is required" };
      }

      // Guard immutable fields
      for (const field of IMMUTABLE_FIELDS) {
        if (field in edits) {
          return {
            error: `Cannot edit immutable field: ${field}`,
          };
        }
      }

      // Add reviewedAt and clear stale templateComparison if workoutData changed
      const enrichedEdits: Record<string, any> = { ...edits };
      if (edits.workoutData) {
        enrichedEdits.extractionMetadata = {
          ...(edits.extractionMetadata ?? {}),
          reviewedAt: new Date(),
          templateComparison: undefined,
        };
      } else {
        enrichedEdits.extractionMetadata = {
          ...(edits.extractionMetadata ?? {}),
          reviewedAt: new Date(),
        };
      }

      logger.info("💾 Applying workout edits:", {
        workoutId: editContext.entityId,
        editSummary,
        editedFields: Object.keys(edits),
      });

      // Persist edits via updateWorkout (uses deepMerge internally)
      const updatedWorkout = await updateWorkout(
        context.userId,
        editContext.entityId,
        enrichedEdits,
      );

      // Post-edit pipeline (best-effort, non-blocking where possible)
      // 1. Regenerate summary
      let newSummary: string | undefined;
      try {
        newSummary = await generateWorkoutSummary(
          updatedWorkout.workoutData,
          editSummary,
        );
        await updateWorkout(context.userId, editContext.entityId, {
          summary: newSummary,
        });
        logger.info("✅ Workout summary regenerated");
      } catch (err) {
        logger.error(
          "⚠️ Failed to regenerate workout summary (non-blocking):",
          err,
        );
      }

      // 2. Update Pinecone vector (delete stale → store fresh)
      try {
        await deleteWorkoutSummaryFromPinecone(
          context.userId,
          editContext.entityId,
        );
        if (newSummary) {
          await storeWorkoutSummaryInPinecone(
            context.userId,
            newSummary,
            updatedWorkout.workoutData,
            updatedWorkout,
          );
        }
        logger.info("✅ Pinecone vector updated");
      } catch (err) {
        logger.error(
          "⚠️ Failed to update Pinecone vector (non-blocking):",
          err,
        );
      }

      // 3. Fire-and-forget: rebuild workout analysis (insights)
      const buildWorkoutAnalysisFunction =
        process.env.BUILD_WORKOUT_ANALYSIS_FUNCTION_NAME;
      if (buildWorkoutAnalysisFunction) {
        invokeAsyncLambda(
          buildWorkoutAnalysisFunction,
          {
            userId: context.userId,
            coachId: context.coachId,
            workoutId: editContext.entityId,
            workoutData: updatedWorkout.workoutData,
            summary: newSummary ?? updatedWorkout.summary,
            completedAt:
              updatedWorkout.completedAt instanceof Date
                ? updatedWorkout.completedAt.toISOString()
                : updatedWorkout.completedAt,
          },
          "workout analysis (post-edit)",
        ).catch((err) => {
          logger.error(
            "⚠️ Failed to invoke build-workout-analysis (non-blocking):",
            err,
          );
        });
      }

      // 4. Fire-and-forget: rebuild exercise catalog (cleanup stale records first)
      const buildExerciseFunction = process.env.BUILD_EXERCISE_FUNCTION_NAME;
      if (buildExerciseFunction) {
        invokeAsyncLambda(
          buildExerciseFunction,
          {
            userId: context.userId,
            coachId: context.coachId,
            workoutId: editContext.entityId,
            workoutData: updatedWorkout.workoutData,
            completedAt:
              updatedWorkout.completedAt instanceof Date
                ? updatedWorkout.completedAt.toISOString()
                : updatedWorkout.completedAt,
            isEdit: true,
          },
          "exercise catalog (post-edit)",
        ).catch((err) => {
          logger.error(
            "⚠️ Failed to invoke build-exercise (non-blocking):",
            err,
          );
        });
      }

      logger.info("✅ Workout edits applied successfully:", {
        workoutId: editContext.entityId,
        editSummary,
      });

      return {
        applied: true,
        editSummary,
        refreshTriggered: true,
        workoutId: editContext.entityId,
      };
    } catch (error) {
      logger.error("❌ apply_workout_edits failed:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to apply edits",
        applied: false,
      };
    }
  },
};

(applyWorkoutEditsTool as any).contextualMessage = [
  "Applying your changes...",
  "Saving workout edits...",
  "Updating workout data...",
  "Refreshing insights...",
];
