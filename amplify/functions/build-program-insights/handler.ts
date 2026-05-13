/**
 * Build Program Insights Lambda Handler
 *
 * Async Lambda that synthesizes an evolving "Program Insights" snapshot for a
 * single program by composing pre-digested AI signals (per-workout insights,
 * weekly analytics actionable_insights) with the program record, memories,
 * and the living profile.
 *
 * Triggered:
 *   1. After build-workout-analysis completes, fanned out across the user's
 *      active programs (fires on ANY workout — program-linked or ad-hoc).
 *   2. From the weekly analytics batch, fanned out per active program with
 *      force=true.
 *   3. Manual / future on-demand refresh.
 *
 * Idempotency / cost control:
 *   - Throttle: skip regeneration if last synthesis was < 15m ago, unless
 *     the event sets `force: true`.
 *   - Empty short-circuit: skip the Bedrock call entirely if no workouts have
 *     been logged in the program window yet.
 *
 * Output:
 *   - Upserts a `programInsights` record (one per program), overwriting any
 *     previous synthesis.
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
import {
  getProgramInsights,
  saveProgramInsights,
} from "../../dynamodb/operations";
import { gatherProgramInsightsContext } from "../libs/program/insights-context";
import {
  PROGRAM_INSIGHTS_TOOL,
  getProgramInsightsPrompt,
} from "../libs/schemas/program-insights-schema";
import type {
  ProgramInsights,
  BuildProgramInsightsEvent,
} from "../libs/program/types";
import { logger } from "../libs/logger";

const MIN_REGEN_INTERVAL_MS = 15 * 60 * 1000;

export const handler = async (event: BuildProgramInsightsEvent) => {
  return withHeartbeat(
    "Program Insights",
    async () => {
      const startTime = Date.now();

      try {
        logger.info("🧠 Starting program insights synthesis:", {
          userId: event.userId,
          coachId: event.coachId,
          programId: event.programId,
          source: event.source,
          force: !!event.force,
          triggerWorkoutId: event.triggerWorkoutId,
          timestamp: new Date().toISOString(),
        });

        if (!event.userId || !event.coachId || !event.programId) {
          logger.error("❌ Missing required fields:", {
            hasUserId: !!event.userId,
            hasCoachId: !!event.coachId,
            hasProgramId: !!event.programId,
          });
          return createErrorResponse(
            400,
            "Missing required fields (userId, coachId, programId)",
          );
        }

        // Step 1: Throttle check
        if (!event.force) {
          const existing = await getProgramInsights(
            event.userId,
            event.programId,
          );
          if (existing) {
            const ageMs =
              Date.now() - new Date(existing.generatedAt).getTime();
            if (ageMs < MIN_REGEN_INTERVAL_MS) {
              logger.info(
                "⏭️ Skipping program insights — regenerated recently:",
                {
                  userId: event.userId,
                  programId: event.programId,
                  ageMs,
                  thresholdMs: MIN_REGEN_INTERVAL_MS,
                },
              );
              return createOkResponse({
                skipped: true,
                reason: "throttled",
                ageMs,
              });
            }
          }
        }

        // Step 2: Parallel-fetch context
        logger.info("📋 Gathering program insights context...");
        const ctx = await gatherProgramInsightsContext({
          userId: event.userId,
          coachId: event.coachId,
          programId: event.programId,
        });

        logger.info("✅ Context gathered:", {
          ...ctx.counts,
          programName: ctx.program.name,
          programStatus: ctx.program.status,
        });

        // Empty short-circuit: if there are zero workouts in the program
        // window, there's nothing to synthesize — surface the empty state in
        // the UI via the absence of a programInsights record.
        if (
          ctx.counts.programLinkedWorkoutCount === 0 &&
          ctx.counts.adHocWorkoutCount === 0
        ) {
          logger.info(
            "⏭️ Skipping program insights — no workouts logged in program window yet:",
            {
              userId: event.userId,
              programId: event.programId,
            },
          );
          return createOkResponse({
            skipped: true,
            reason: "no_workouts",
          });
        }

        // Step 3: Build prompt and call Bedrock
        logger.info("🤖 Generating program insights via Bedrock...");
        const systemPrompt = getProgramInsightsPrompt({
          programSnapshot: ctx.programSnapshot,
          programLinkedWorkouts: ctx.programLinkedWorkouts,
          adHocWorkouts: ctx.adHocWorkouts,
          weeklyAnalytics: ctx.weeklyAnalytics,
          memories: ctx.memories,
          livingProfile: ctx.livingProfile,
          userTimezone: ctx.userTimezone,
        });

        const userPrompt =
          "Synthesize this athlete's progress through their program and emit the result via the generate_program_insights tool.";

        const response = await callBedrockApi(
          systemPrompt,
          userPrompt,
          MODEL_IDS.EXECUTOR_MODEL_FULL,
          {
            temperature: TEMPERATURE_PRESETS.STRUCTURED,
            tools: PROGRAM_INSIGHTS_TOOL,
            expectedToolName: "generate_program_insights",
          },
        );

        const toolResult = response as BedrockToolUseResult;
        const parsed = toolResult.input;

        logger.info("✅ Synthesis generated:", {
          hasAdherenceTrend: !!parsed.adherence_trend,
          goalCount: Array.isArray(parsed.goal_progress)
            ? parsed.goal_progress.length
            : 0,
          riskFlagCount: Array.isArray(parsed.risk_flags)
            ? parsed.risk_flags.length
            : 0,
          hasPrTrends: !!parsed.exercise_pr_trends,
          hasMemorySignals: !!parsed.memory_signals,
          hasLivingProfileShifts: !!parsed.living_profile_shifts,
        });

        // Step 4: Persist
        const insights: ProgramInsights = {
          programId: event.programId,
          userId: event.userId,
          coachId: event.coachId,
          adherenceTrend: parsed.adherence_trend,
          goalProgress: Array.isArray(parsed.goal_progress)
            ? parsed.goal_progress
            : [],
          exercisePrTrends: parsed.exercise_pr_trends || null,
          memorySignals: parsed.memory_signals || null,
          livingProfileShifts: parsed.living_profile_shifts || null,
          phaseProgress: {
            currentPhase: parsed.phase_progress?.current_phase || "n/a",
            onPace: !!parsed.phase_progress?.on_pace,
            notes: parsed.phase_progress?.notes || "",
          },
          riskFlags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : [],
          coachRecommendation: parsed.coach_recommendation,
          coachNote: parsed.coach_note,
          inputs: ctx.counts,
          generatedAt: new Date().toISOString(),
          modelId: MODEL_IDS.EXECUTOR_MODEL_FULL,
          source: event.source,
        };

        await saveProgramInsights(insights);

        const processingTimeMs = Date.now() - startTime;
        logger.info("✅ Program insights completed:", {
          userId: event.userId,
          programId: event.programId,
          source: event.source,
          processingTimeMs,
        });

        return createOkResponse({
          success: true,
          programId: event.programId,
          processingTimeMs,
        });
      } catch (error) {
        logger.error("❌ Error in program insights synthesis:", error);
        logger.error("Event data:", {
          userId: event.userId,
          coachId: event.coachId,
          programId: event.programId,
          source: event.source,
        });

        const errorMessage =
          error instanceof Error ? error.message : "Unknown synthesis error";
        return createErrorResponse(
          500,
          "Failed to generate program insights",
          {
            error: errorMessage,
            userId: event.userId,
            programId: event.programId,
          },
        );
      }
    },
    5000,
  );
};
