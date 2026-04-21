/**
 * Build Workout Analysis Lambda Handler
 *
 * Async Lambda that generates AI insights for a logged workout by comparing
 * it against recent training history. Invoked fire-and-forget after workout save.
 *
 * Flow:
 * 1. Fetch recent workouts for comparison context
 * 2. Build prompt with current workout + history
 * 3. Call Bedrock (Haiku 4.5) with structured tool output
 * 4. Save insights back to the workout record
 */

import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../libs/api-helpers";
import type { BedrockToolUseResult } from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import { queryWorkouts, updateWorkout } from "../../dynamodb/workout";
import {
  WORKOUT_INSIGHTS_TOOL,
  getWorkoutInsightsPrompt,
} from "../libs/schemas/workout-insights-schema";
import type { WorkoutInsights } from "../libs/workout/types";
import { logger } from "../libs/logger";

interface BuildWorkoutAnalysisEvent {
  userId: string;
  coachId: string;
  workoutId: string;
  workoutData: any;
  summary: string;
  completedAt: string;
  userTimezone?: string;
  templateComparison?: {
    wasScaled: boolean;
    modifications: string[];
    adherenceScore: number;
    analysisConfidence: number;
  };
}

export const handler = async (event: BuildWorkoutAnalysisEvent) => {
  return withHeartbeat(
    "Workout Analysis",
    async () => {
      const startTime = Date.now();

      try {
        logger.info("🧠 Starting workout analysis:", {
          userId: event.userId,
          workoutId: event.workoutId,
          discipline: event.workoutData?.discipline,
          hasTemplateComparison: !!event.templateComparison,
          timestamp: new Date().toISOString(),
        });

        // Validate required fields
        if (
          !event.userId ||
          !event.coachId ||
          !event.workoutId ||
          !event.workoutData ||
          !event.summary ||
          !event.completedAt
        ) {
          logger.error("❌ Missing required fields:", {
            hasUserId: !!event.userId,
            hasCoachId: !!event.coachId,
            hasWorkoutId: !!event.workoutId,
            hasWorkoutData: !!event.workoutData,
            hasSummary: !!event.summary,
            hasCompletedAt: !!event.completedAt,
          });
          return createErrorResponse(
            400,
            "Missing required fields (userId, coachId, workoutId, workoutData, summary, completedAt)",
          );
        }

        // Step 1: Fetch recent workouts for comparison context
        logger.info("📋 Fetching recent workouts for comparison...");
        const recentWorkouts = await queryWorkouts(event.userId, {
          limit: 10,
          sortBy: "completedAt",
          sortOrder: "desc",
        });

        // Exclude the current workout from comparison history
        const historicalWorkouts = recentWorkouts.filter(
          (w) => w.workoutId !== event.workoutId,
        );

        const recentSummaries = historicalWorkouts
          .filter((w) => w.summary)
          .map((w) => w.summary!);

        logger.info("✅ Fetched workout history:", {
          totalFound: recentWorkouts.length,
          historicalCount: historicalWorkouts.length,
          withSummaries: recentSummaries.length,
        });

        // Step 2: Build prompt and call Bedrock
        logger.info("🤖 Generating workout insights...");
        const systemPrompt = getWorkoutInsightsPrompt(
          event.summary,
          event.workoutData.discipline || "general",
          recentSummaries,
          event.templateComparison,
          event.userTimezone,
        );

        const userPrompt =
          "Analyze this workout and generate insights using the generate_workout_insights tool.";

        const response = await callBedrockApi(
          systemPrompt,
          userPrompt,
          MODEL_IDS.EXECUTOR_MODEL_FULL,
          {
            temperature: TEMPERATURE_PRESETS.STRUCTURED,
            tools: WORKOUT_INSIGHTS_TOOL,
            expectedToolName: "generate_workout_insights",
          },
        );

        // callBedrockApi extracts tool use when tools are provided
        const toolResult = response as BedrockToolUseResult;
        const parsed = toolResult.input;

        logger.info("✅ Insights generated:", {
          hasPerformanceComparison: !!parsed.performance_comparison,
          hasAchievements: !!parsed.achievements,
          hasScalingAnalysis: !!parsed.scaling_analysis,
          hasRecoveryImpact: !!parsed.recovery_impact,
          hasCoachNote: !!parsed.coach_note,
        });

        // Step 3: Build insights object
        const insights: WorkoutInsights = {
          performanceComparison: parsed.performance_comparison,
          achievements: parsed.achievements || null,
          scalingAnalysis: parsed.scaling_analysis || null,
          recoveryImpact: parsed.recovery_impact,
          coachNote: parsed.coach_note,
          generatedAt: new Date().toISOString(),
          modelId: MODEL_IDS.EXECUTOR_MODEL_FULL,
        };

        // Step 4: Save insights back to the workout record
        logger.info("💾 Saving insights to workout record...");
        await updateWorkout(event.userId, event.workoutId, {
          insights,
        } as any);

        const processingTimeMs = Date.now() - startTime;

        logger.info("✅ Workout analysis completed:", {
          userId: event.userId,
          workoutId: event.workoutId,
          discipline: event.workoutData.discipline,
          processingTimeMs,
        });

        return createOkResponse({
          success: true,
          workoutId: event.workoutId,
          processingTimeMs,
        });
      } catch (error) {
        logger.error("❌ Error in workout analysis:", error);
        logger.error("Event data:", {
          userId: event.userId,
          workoutId: event.workoutId,
          discipline: event.workoutData?.discipline,
        });

        const errorMessage =
          error instanceof Error ? error.message : "Unknown analysis error";
        return createErrorResponse(500, "Failed to generate workout insights", {
          error: errorMessage,
          userId: event.userId,
          workoutId: event.workoutId,
        });
      }
    },
    5000,
  ); // 5 second heartbeat interval
};
