/**
 * Build Workout V2 Lambda Handler
 *
 * Uses WorkoutBuilder agent to extract, validate, and save workouts.
 * Maintains same interface as build-workout but uses agent pattern internally.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import type { BuildWorkoutEvent } from "../libs/workout/types";
import { WorkoutLoggerAgent } from "../libs/agents/workout-logger/agent";
import { WorkoutLoggerAgentV2 } from "../libs/agents/workout-logger/v2-agent";
import type { WorkoutLoggerContext } from "../libs/agents/workout-logger/types";
import { revertTemplateStatus } from "../libs/program/template-linking";
import { logger } from "../libs/logger";

export const handler = async (event: BuildWorkoutEvent) => {
  return withHeartbeat("Workout Logger Agent", async () => {
    try {
      logger.info("🏋️ Starting Workout Logger Agent:", {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        messageLength: event.userMessage.length,
        coachName: event.coachConfig.coach_name,
        detectionType: event.isSlashCommand
          ? "slash_command"
          : "natural_language",
        slashCommand: event.slashCommand || null,
        hasImages: !!(event.imageS3Keys && event.imageS3Keys.length > 0),
        imageCount: event.imageS3Keys?.length || 0,
        timestamp: new Date().toISOString(),
        note: "Discipline detection handled by agent's detect_discipline tool",
      });

      // Pre-validation (same as original build-workout)
      if (event.isSlashCommand) {
        const workoutContent = event.userMessage;
        const contentTrimmed = workoutContent.trim();
        const wordCount = contentTrimmed.split(/\s+/).length;
        const charCount = contentTrimmed.length;

        // Check for obviously incomplete submissions
        if (charCount < 10 || wordCount < 3) {
          logger.warn("⚠️ Suspiciously short workout content detected:", {
            content: contentTrimmed,
            charCount,
            wordCount,
            isLikelyIncomplete: true,
          });

          return createOkResponse({
            success: false,
            skipped: true,
            reason:
              "Workout description too short - please provide more details about your workout (exercises, sets, reps, weights, etc.)",
            validation: {
              contentLength: charCount,
              wordCount,
              minimumRequired:
                "At least 10 characters and 3 words describing your workout",
            },
          });
        }

        // Check if it's just a single word or partial word
        const singleWordPattern =
          /^(warm|workout|exercise|training|gym|lift)\s*(up)?$/i;
        if (singleWordPattern.test(contentTrimmed)) {
          logger.warn("⚠️ Single keyword detected without workout details:", {
            content: contentTrimmed,
            isKeywordOnly: true,
          });

          return createOkResponse({
            success: false,
            skipped: true,
            reason:
              "Please provide complete workout details - what exercises did you do? Sets, reps, weights?",
            validation: {
              detectedKeyword: contentTrimmed,
              suggestion:
                "Example: '3 sets of squats at 185lbs for 5 reps, then 20 minute AMRAP of burpees and pull-ups'",
            },
          });
        }
      }

      // Build agent context (all BuildWorkoutEvent fields except message data)
      // Note: Discipline detection is handled by the agent's detect_discipline tool (agent-first approach)
      const context: WorkoutLoggerContext = {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        coachConfig: event.coachConfig,
        completedAt: event.completedAt,
        isSlashCommand: event.isSlashCommand,
        slashCommand: event.slashCommand,
        messageTimestamp: event.messageTimestamp,
        userTimezone: event.userTimezone || "America/Los_Angeles",
        criticalTrainingDirective: event.criticalTrainingDirective,
        templateContext: event.templateContext,
        imageS3Keys: event.imageS3Keys,
      };

      // Create WorkoutLogger agent.
      // Per the unified-agent-framework migration plan, v2 is gated
      // behind a per-agent env flag so v1 stays as instant rollback.
      // Flip AGENT_V2_WORKOUT_LOGGER=true once the v2 path is verified
      // end to end.
      const useV2 = process.env.AGENT_V2_WORKOUT_LOGGER === "true";
      logger.info(
        `🤖 Starting agent workflow (${useV2 ? "v2" : "v1"})...`,
      );
      const agent = useV2
        ? new WorkoutLoggerAgentV2(context)
        : new WorkoutLoggerAgent(context);

      // Let agent handle the entire workflow
      const result = await agent.logWorkout(
        event.userMessage,
        event.imageS3Keys,
      );

      logger.info("✅ Agent workflow completed:", {
        success: result.success,
        workoutId: result.workoutId,
        skipped: result.skipped,
        templateId: event.templateContext?.templateId,
        dayNumber: event.templateContext?.dayNumber,
      });

      // Return same response format as original build-workout
      if (result.success) {
        return createOkResponse({
          success: true,
          workoutId: result.workoutId,
          discipline: result.discipline,
          workoutName: result.workoutName,
          confidence: result.confidence,
          extractionMetadata: result.extractionMetadata,
          normalizationSummary: result.normalizationSummary,
          allWorkouts: result.allWorkouts,
        });
      } else {
        // Failure path. Revert the optimistic "completed" status when no
        // workout was produced — pure extraction/validation failures and
        // the exception path below.
        //
        // NOT covered: the duplicate-skip path where relink also failed
        // (the agent returns the existing workoutId, so this gate is not
        // hit), and the "saved but linking failed after retries" case.
        // After retries inside linkWorkoutToTemplate succeed at handling
        // transient S3 issues, the residual failure modes (program/template
        // not found, S3 fundamentally unavailable) are rare enough that we
        // accept leaving the workout orphaned in DynamoDB and rely on
        // scripts/relink-orphaned-templates.js for recovery. The UI can
        // also re-fetch via "Refresh to check" if linkedWorkoutId arrives
        // late.
        if (event.templateContext && !result.workoutId) {
          await revertTemplateStatus(
            event.userId,
            event.coachId,
            event.templateContext,
          );
        }

        // v2 returns `skipped: false` for infrastructure failures (e.g. tool
        // timeouts) so the caller can distinguish "user rejected / planning"
        // from "Bedrock slow". Mirrors program-designer/v2's
        // `result.skipped ?? true` pattern. v1 always set skipped:true on
        // the failure branch — this fall-through preserves that behaviour
        // when v2 doesn't explicitly set the field.
        return createOkResponse({
          success: false,
          skipped: result.skipped ?? true,
          reason: result.reason,
          blockingFlags: result.blockingFlags,
          confidence: result.confidence,
        });
      }
    } catch (error) {
      logger.error("❌ Error in workout builder agent:", error);
      logger.error("Event data:", {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        messagePreview: event.userMessage.substring(0, 100),
      });

      // Same revert: an exception path also leaves an optimistically-completed
      // template orphaned. Best-effort revert; don't let revert errors mask
      // the original exception.
      if (event.templateContext) {
        await revertTemplateStatus(
          event.userId,
          event.coachId,
          event.templateContext,
        ).catch((err) => {
          logger.error("⚠️ revertTemplateStatus failed in catch block:", err);
        });
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown extraction error";
      return createErrorResponse(500, "Failed to extract workout session", {
        error: errorMessage,
        userId: event.userId,
        conversationId: event.conversationId,
      });
    }
  }); // 10 second default heartbeat interval
};
