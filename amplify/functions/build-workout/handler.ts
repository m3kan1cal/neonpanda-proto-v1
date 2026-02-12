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
import type { WorkoutLoggerContext } from "../libs/agents/workout-logger/types";
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
      };

      // Create WorkoutLogger agent
      const agent = new WorkoutLoggerAgent(context);

      // Let agent handle the entire workflow
      logger.info("🤖 Starting agent workflow...");
      const result = await agent.logWorkout(
        event.userMessage,
        event.imageS3Keys,
      );

      logger.info("✅ Agent workflow completed:", {
        success: result.success,
        workoutId: result.workoutId,
        skipped: result.skipped,
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
        return createOkResponse({
          success: false,
          skipped: true,
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
