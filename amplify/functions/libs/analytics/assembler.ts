/**
 * Analytics Assembler
 *
 * Replaces the monolithic generate_analytics Bedrock call with three parallel
 * focused sub-task calls followed by a single human-summary call.
 *
 * Architecture:
 *   Step 1 (Volume)      ─┐
 *   Step 2 (Progression)  ├─ Promise.all ─► Assemble ─► Normalize ─► Step 4 (Summary)
 *   Step 3 (Intelligence) ─┘
 *
 * Each sub-task has a small, focused schema that:
 *   - Fits within Bedrock's tool grammar limits without skipToolEnforcement
 *   - Eliminates extended-thinking text-fallback failures
 *   - Completes in 20-40s instead of 90-470s
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import type { BedrockToolUseResult, BedrockApiOptions } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import {
  shouldNormalizeAnalytics,
  normalizeAnalytics,
  generateNormalizationSummary,
} from "./normalization";
import {
  ANALYTICS_SUBTASK_TOOLS,
  VOLUME_ANALYSIS_TOOL,
  PROGRESSION_ANALYSIS_TOOL,
  INTELLIGENCE_ANALYSIS_TOOL,
  HUMAN_SUMMARY_TOOL,
} from "../schemas/analytics-subtask-schemas";
import { UserWeeklyData, UserMonthlyData } from "./types";
import { convertUtcToUserDate } from "./date-utils";
import { logger } from "../logger";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Maximum time (ms) allowed for a single sub-task Bedrock call before it is
// considered hung and aborted. Set well above expected p99 call duration (40s)
// but low enough to leave budget for retries and subsequent steps.
const SUBTASK_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubtaskResult {
  data: Record<string, any>;
  toolName: string;
  succeeded: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Races a Bedrock call against a timeout. Throws a descriptive error if the
 * call does not complete within SUBTASK_TIMEOUT_MS. This prevents a hung
 * Bedrock call from silently consuming the Lambda execution budget.
 */
function withSubtaskTimeout<T>(
  label: string,
  operation: () => Promise<T>,
  timeoutMs: number = SUBTASK_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(`Sub-task '${label}' timed out after ${timeoutMs / 1000}s.`),
      );
    }, timeoutMs);

    operation()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Attempts to extract a usable object from a tool-use result.
 * Handles the text-fallback failure mode: model does the analysis in <thinking>
 * or as text, then returns an empty input object.
 *
 * Recovery strategy (per AGENTS.md):
 *   1. If input is non-empty: use it directly.
 *   2. If model returned text instead: retry without thinking.
 *   3. If retry also fails: try parseJsonWithFallbacks on the text response.
 *   4. Return empty object as last resort (normalization will catch gaps).
 */
async function callSubtaskWithRetry(
  prompt: string,
  userMessageLabel: string,
  tool: typeof VOLUME_ANALYSIS_TOOL,
  expectedToolName: string,
): Promise<SubtaskResult> {
  const bedrockOptions: BedrockApiOptions = {
    temperature: TEMPERATURE_PRESETS.STRUCTURED,
    enableThinking: false,
    tools: tool,
    expectedToolName,
    skipValidation: true,
    // Smaller schemas allow toolChoice enforcement -- no skipToolEnforcement needed
  };

  // First attempt (wrapped with timeout)
  const firstResult = (await withSubtaskTimeout(
    `${expectedToolName}_attempt1`,
    () =>
      callBedrockApi(
        prompt,
        userMessageLabel,
        MODEL_IDS.PLANNER_MODEL_FULL,
        bedrockOptions,
      ),
  )) as BedrockToolUseResult;

  if (firstResult.input && Object.keys(firstResult.input).length > 0) {
    logger.info(`Sub-task '${expectedToolName}' succeeded on first attempt.`, {
      topLevelKeys: Object.keys(firstResult.input).length,
    });
    return {
      data: firstResult.input,
      toolName: expectedToolName,
      succeeded: true,
    };
  }

  // Tool-use failure: model returned text instead of calling the tool
  logger.warn(
    `Sub-task '${expectedToolName}' returned text instead of tool call. Retrying with prior analysis as context.`,
    { textResponseLength: firstResult.textResponse?.length ?? 0 },
  );

  if (firstResult.textResponse) {
    const retryPrompt =
      `You previously analyzed the athlete's training data and produced the following analysis:\n\n` +
      firstResult.textResponse.substring(0, 40_000) +
      `\n\nYou MUST now call the ${expectedToolName} tool with the structured data from your analysis. Do NOT respond with text.`;

    const retryResult = (await withSubtaskTimeout(
      `${expectedToolName}_retry`,
      () =>
        callBedrockApi(
          retryPrompt,
          `${userMessageLabel}_retry`,
          MODEL_IDS.PLANNER_MODEL_FULL,
          {
            temperature: TEMPERATURE_PRESETS.STRUCTURED,
            enableThinking: false,
            tools: tool,
            expectedToolName,
            skipValidation: true,
          },
        ),
    )) as BedrockToolUseResult;

    if (retryResult.input && Object.keys(retryResult.input).length > 0) {
      logger.info(`Sub-task '${expectedToolName}' retry succeeded.`, {
        topLevelKeys: Object.keys(retryResult.input).length,
      });
      return {
        data: retryResult.input,
        toolName: expectedToolName,
        succeeded: true,
      };
    }

    // Both attempts failed via tool use; try parsing the text response directly
    const textToParse = retryResult.textResponse ?? firstResult.textResponse;
    if (textToParse) {
      logger.warn(
        `Sub-task '${expectedToolName}' retry also failed tool use. Attempting parseJsonWithFallbacks on text response.`,
      );
      const parsed = parseJsonWithFallbacks(textToParse);
      if (
        parsed &&
        typeof parsed === "object" &&
        Object.keys(parsed).length > 0
      ) {
        logger.info(
          `Sub-task '${expectedToolName}' recovered via parseJsonWithFallbacks.`,
        );
        return {
          data: parsed as Record<string, any>,
          toolName: expectedToolName,
          succeeded: true,
        };
      }
    }
  }

  logger.warn(
    `Sub-task '${expectedToolName}' could not produce structured output. Normalization will attempt to fill gaps.`,
  );
  return { data: {}, toolName: expectedToolName, succeeded: false };
}

// ---------------------------------------------------------------------------
// Sub-task prompt builders
// ---------------------------------------------------------------------------

function buildDirectiveSection(userProfile?: any): string {
  const directive = userProfile?.criticalTrainingDirective;
  if (!directive?.enabled || !directive?.content) return "";
  return `CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:\n\n${directive.content}\n\nThis directive takes precedence over all other instructions except safety constraints.\n\n---\n\n`;
}

function buildVolumeAnalysisPrompt(
  weeklyData: UserWeeklyData | UserMonthlyData,
  userProfile?: any,
): string {
  const isPeriodWeekly = "weekRange" in weeklyData;
  const period = isPeriodWeekly ? "weekly" : "monthly";
  const periodLabel = isPeriodWeekly ? "THIS WEEK'S" : "THIS MONTH'S";

  const rangeStart = isPeriodWeekly
    ? (weeklyData as UserWeeklyData).weekRange.weekStart
        .toISOString()
        .split("T")[0]
    : (weeklyData as UserMonthlyData).monthRange.monthStart
        .toISOString()
        .split("T")[0];
  const rangeEnd = isPeriodWeekly
    ? (weeklyData as UserWeeklyData).weekRange.weekEnd
        .toISOString()
        .split("T")[0]
    : (weeklyData as UserMonthlyData).monthRange.monthEnd
        .toISOString()
        .split("T")[0];

  const currentWorkouts = weeklyData.workouts.summaries
    .map((s) => {
      const localDate = convertUtcToUserDate(
        s.date,
        s.userTimezone || "America/Los_Angeles",
      );
      return `${localDate} - ${s.workoutName || "Workout"} (${s.discipline || "Unknown"}) [workout_id: ${s.workoutId}]\n${s.summary}`;
    })
    .join("\n\n");

  return `${buildDirectiveSection(userProfile)}You are an elite strength and conditioning analyst. Your task is to analyze ${period} training VOLUME data only.

PERIOD: ${rangeStart} to ${rangeEnd} (${period})
SESSIONS THIS PERIOD: ${weeklyData.workouts.count}

${periodLabel} WORKOUT SUMMARIES:
${currentWorkouts || "No workouts this period."}

ATHLETE PROFILE:
${userProfile?.athleteProfile?.summary || "No athlete profile available."}

TASK: Analyze the volume data above and call the ${ANALYTICS_SUBTASK_TOOLS.VOLUME_ANALYSIS} tool with:
- metadata (period identification, session counts, data quality)
- volume_breakdown (working sets, by-movement detail, conditioning work)
- raw_aggregations (daily_volume entries for EVERY day in the period range -- include rest days with 0 values)
- data_quality_report (any data gaps or inconsistencies found)

CRITICAL: All daily_volume dates MUST be within ${rangeStart} to ${rangeEnd}. Use exact workout_ids from the data above.
Do NOT respond with text -- call the tool only.`;
}

function buildProgressionAnalysisPrompt(
  weeklyData: UserWeeklyData | UserMonthlyData,
  userProfile?: any,
): string {
  const isPeriodWeekly = "weekRange" in weeklyData;
  const period = isPeriodWeekly ? "weekly" : "monthly";
  const periodLabel = isPeriodWeekly ? "THIS WEEK'S" : "THIS MONTH'S";
  const historicalLabel = isPeriodWeekly ? "PREVIOUS WEEKS" : "PREVIOUS MONTHS";

  const currentWorkouts = weeklyData.workouts.summaries
    .map((s) => {
      const localDate = convertUtcToUserDate(
        s.date,
        s.userTimezone || "America/Los_Angeles",
      );
      return `${localDate} - ${s.workoutName || "Workout"} (${s.discipline || "Unknown"})\n${s.summary}`;
    })
    .join("\n\n");

  const historicalWorkouts = weeklyData.historical.workoutSummaries
    .map((s) => {
      const localDate = convertUtcToUserDate(
        s.date,
        s.userTimezone || "America/Los_Angeles",
      );
      return `${localDate} - ${s.workoutName || "Workout"}: ${s.summary}`;
    })
    .join("\n\n");

  return `${buildDirectiveSection(userProfile)}You are an elite strength and conditioning analyst. Your task is to analyze ${period} PROGRESSION, MOVEMENT PATTERNS, and FATIGUE.

ATHLETE PROFILE:
${userProfile?.athleteProfile?.summary || "No athlete profile available."}

${periodLabel} WORKOUT SUMMARIES:
${currentWorkouts || "No workouts this period."}

${historicalLabel} WORKOUT SUMMARIES (for trending):
${historicalWorkouts || "No historical data available."}

TASK: Analyze the data above and call the ${ANALYTICS_SUBTASK_TOOLS.PROGRESSION_ANALYSIS} tool with:
- weekly_progression (period-over-period comparison, 4-period trend, progressive overload score)
- performance_markers (PRs, benchmark workouts, competition readiness)
- movement_analysis (frequency map, pattern balance by squat/hinge/push/pull/carry/core, imbalance flags)
- fatigue_management (ACWR, recovery score, deload indicators, suggested action)

Compare to previous periods -- never analyze in isolation. Detect deload weeks and adjust expectations.
Do NOT respond with text -- call the tool only.`;
}

function buildIntelligenceAnalysisPrompt(
  weeklyData: UserWeeklyData | UserMonthlyData,
  userProfile?: any,
): string {
  const isPeriodWeekly = "weekRange" in weeklyData;
  const period = isPeriodWeekly ? "weekly" : "monthly";
  const periodLabel = isPeriodWeekly ? "THIS WEEK'S" : "THIS MONTH'S";

  const currentWorkouts = weeklyData.workouts.summaries
    .map((s) => {
      const localDate = convertUtcToUserDate(
        s.date,
        s.userTimezone || "America/Los_Angeles",
      );
      return `${localDate} - ${s.workoutName || "Workout"} (${s.discipline || "Unknown"})\n${s.summary}`;
    })
    .join("\n\n");

  const coachingContext = weeklyData.coaching.summaries
    .map(
      (s) =>
        `Conversation (${s.metadata.createdAt.toISOString().split("T")[0]}):\n${s.narrative}\nKey Insights: ${s.structuredData.key_insights.join(", ")}`,
    )
    .join("\n\n");

  const memories = weeklyData.userContext.memories
    .map((m) => `${m.memoryType.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `${buildDirectiveSection(userProfile)}You are an elite strength and conditioning analyst. Your task is to analyze ${period} TRAINING INTELLIGENCE, coaching insights, and generate actionable recommendations.

ATHLETE CONTEXT:
${userProfile?.athleteProfile?.summary || "No athlete profile available."}

DETAILED CONTEXT:
${memories || "No memories available."}

${periodLabel} WORKOUT SUMMARIES:
${currentWorkouts || "No workouts this period."}

COACHING CONVERSATION SUMMARIES:
${coachingContext || "No coaching summaries available."}

TASK: Analyze the data above and call the ${ANALYTICS_SUBTASK_TOOLS.INTELLIGENCE_ANALYSIS} tool with:
- training_intelligence (set performance analysis, exercise ordering, workout pacing, superset efficiency)
- coaching_synthesis (technical focus, workout feedback, adherence analysis from coach/athlete notes)
- actionable_insights (top_priority with data_support, quick_wins, week_ahead_focus, red_flags if any)

Every recommendation MUST cite specific data. Do NOT respond with text -- call the tool only.`;
}

function buildHumanSummaryPrompt(
  structuredAnalytics: Record<string, any>,
  weeklyData: UserWeeklyData | UserMonthlyData,
): string {
  const isPeriodWeekly = "weekRange" in weeklyData;
  const periodLabel = isPeriodWeekly ? "Weekly" : "Monthly";

  return `You are an elite strength and conditioning coach. Write a ${periodLabel.toLowerCase()} training summary for your athlete.

STRUCTURED ANALYTICS (use these numbers -- do not invent data):
${JSON.stringify(structuredAnalytics, null, 2).substring(0, 15_000)}

TASK: Call the ${ANALYTICS_SUBTASK_TOOLS.HUMAN_SUMMARY} tool with a coach-friendly narrative that:
- Starts with "${periodLabel} Training Summary"
- Includes session completion stats with a data quality note
- Highlights key achievements (PRs, progress toward goals with specific numbers)
- Lists top volume leaders by tonnage
- Provides training intelligence insights with specific metrics
- Identifies 2-3 areas for improvement with actionable suggestions
- Ends with prioritised next steps and a clear red flag assessment

Tone: direct, specific, data-driven. Every claim must reference numbers from the analytics above.
Do NOT respond with text -- call the tool only.`;
}

// ---------------------------------------------------------------------------
// Main assembler
// ---------------------------------------------------------------------------

/**
 * Assembles a complete analytics object from three parallel sub-task Bedrock
 * calls followed by a human summary call.
 *
 * This replaces the monolithic generateAnalytics() Bedrock call. Expected
 * wall-clock time: ~40-80s (vs 90-470s for the monolithic approach).
 */
export const assembleAnalytics = async (
  weeklyData: UserWeeklyData | UserMonthlyData,
  userProfile?: any,
): Promise<any> => {
  const userId = weeklyData.userId;
  const isPeriodWeekly = "weekRange" in weeklyData;
  const periodLabel = isPeriodWeekly ? "weekly" : "monthly";

  logger.info(
    `Assembling ${periodLabel} analytics for user ${userId} via sub-task pattern.`,
  );

  // ---------------------------------------------------------------------------
  // Steps 1-3: Run in parallel
  // ---------------------------------------------------------------------------

  const [volumeResult, progressionResult, intelligenceResult] =
    await Promise.all([
      callSubtaskWithRetry(
        buildVolumeAnalysisPrompt(weeklyData, userProfile),
        "analytics_volume_analysis",
        VOLUME_ANALYSIS_TOOL,
        ANALYTICS_SUBTASK_TOOLS.VOLUME_ANALYSIS,
      ).catch((error) => {
        logger.error(
          `Volume analysis sub-task threw for user ${userId}:`,
          error,
        );
        return {
          data: {},
          toolName: ANALYTICS_SUBTASK_TOOLS.VOLUME_ANALYSIS,
          succeeded: false,
        } as SubtaskResult;
      }),

      callSubtaskWithRetry(
        buildProgressionAnalysisPrompt(weeklyData, userProfile),
        "analytics_progression_analysis",
        PROGRESSION_ANALYSIS_TOOL,
        ANALYTICS_SUBTASK_TOOLS.PROGRESSION_ANALYSIS,
      ).catch((error) => {
        logger.error(
          `Progression analysis sub-task threw for user ${userId}:`,
          error,
        );
        return {
          data: {},
          toolName: ANALYTICS_SUBTASK_TOOLS.PROGRESSION_ANALYSIS,
          succeeded: false,
        } as SubtaskResult;
      }),

      callSubtaskWithRetry(
        buildIntelligenceAnalysisPrompt(weeklyData, userProfile),
        "analytics_intelligence_analysis",
        INTELLIGENCE_ANALYSIS_TOOL,
        ANALYTICS_SUBTASK_TOOLS.INTELLIGENCE_ANALYSIS,
      ).catch((error) => {
        logger.error(
          `Intelligence analysis sub-task threw for user ${userId}:`,
          error,
        );
        return {
          data: {},
          toolName: ANALYTICS_SUBTASK_TOOLS.INTELLIGENCE_ANALYSIS,
          succeeded: false,
        } as SubtaskResult;
      }),
    ]);

  logger.info(`Sub-tasks 1-3 completed for user ${userId}.`, {
    volumeSucceeded: volumeResult.succeeded,
    progressionSucceeded: progressionResult.succeeded,
    intelligenceSucceeded: intelligenceResult.succeeded,
  });

  // ---------------------------------------------------------------------------
  // Assemble structured_analytics from sub-task outputs
  // ---------------------------------------------------------------------------

  const structuredAnalytics: Record<string, any> = {
    // Step 1 sections
    metadata: volumeResult.data.metadata ?? {},
    volume_breakdown: volumeResult.data.volume_breakdown ?? {},
    raw_aggregations: volumeResult.data.raw_aggregations ?? {
      daily_volume: [],
    },
    data_quality_report: volumeResult.data.data_quality_report ?? {},
    // Step 2 sections
    weekly_progression: progressionResult.data.weekly_progression ?? {},
    performance_markers: progressionResult.data.performance_markers ?? {},
    movement_analysis: progressionResult.data.movement_analysis ?? {
      pattern_balance: {},
    },
    fatigue_management: progressionResult.data.fatigue_management ?? {
      recovery_score: 5,
      suggested_action: "maintain",
    },
    // Step 3 sections
    training_intelligence: intelligenceResult.data.training_intelligence ?? {},
    coaching_synthesis: intelligenceResult.data.coaching_synthesis ?? {},
    actionable_insights: intelligenceResult.data.actionable_insights ?? {
      top_priority: {
        insight: "Insufficient data to generate priority insight.",
        data_support: "Sub-task generation failed.",
        recommended_action: "Review analytics pipeline logs.",
        expected_outcome: "Corrected analytics on next run.",
      },
      quick_wins: [],
    },
  };

  // ---------------------------------------------------------------------------
  // Normalization (required per AGENTS.md)
  // ---------------------------------------------------------------------------

  let normalizedStructuredAnalytics = structuredAnalytics;

  // human_summary has not been generated yet at this stage, so skip that check
  // to avoid a spurious structural error that would always trigger normalization.
  if (
    shouldNormalizeAnalytics(
      { structured_analytics: structuredAnalytics },
      weeklyData,
      { skipHumanSummaryCheck: true },
    )
  ) {
    logger.info(
      `Running normalization on assembled analytics for user ${userId}.`,
    );

    const normalizationResult = await normalizeAnalytics(
      { structured_analytics: structuredAnalytics, human_summary: "" },
      weeklyData,
      userId,
      false, // enableThinking: false -- smaller schema, no need for extended thinking
    );

    const normalizationSummary =
      generateNormalizationSummary(normalizationResult);
    logger.info(`Normalization completed for user ${userId}:`, {
      isValid: normalizationResult.isValid,
      issuesFound: normalizationResult.issues.length,
      correctionsMade: normalizationResult.issues.filter((i) => i.corrected)
        .length,
      summary: normalizationSummary,
    });

    if (
      normalizationResult.isValid ||
      normalizationResult.issues.some((i) => i.corrected)
    ) {
      const normalizedData = normalizationResult.normalizedData;
      normalizedStructuredAnalytics =
        normalizedData?.structured_analytics ?? structuredAnalytics;
    }
  } else {
    logger.info(
      `Normalization skipped for user ${userId}: no critical issues detected in assembled data.`,
    );
  }

  // ---------------------------------------------------------------------------
  // Step 4: Human summary (sequential, uses assembled data as context)
  // ---------------------------------------------------------------------------

  const summaryResult = await callSubtaskWithRetry(
    buildHumanSummaryPrompt(normalizedStructuredAnalytics, weeklyData),
    "analytics_human_summary",
    HUMAN_SUMMARY_TOOL,
    ANALYTICS_SUBTASK_TOOLS.HUMAN_SUMMARY,
  ).catch((error) => {
    logger.error(`Human summary sub-task threw for user ${userId}:`, error);
    return {
      data: {
        human_summary: `${isPeriodWeekly ? "Weekly" : "Monthly"} Training Summary\n\nAnalytics generated successfully. Human summary generation encountered an error.`,
      },
      toolName: ANALYTICS_SUBTASK_TOOLS.HUMAN_SUMMARY,
      succeeded: false,
    } as SubtaskResult;
  });

  const humanSummary =
    summaryResult.data.human_summary ??
    `${isPeriodWeekly ? "Weekly" : "Monthly"} Training Summary\n\nAnalytics assembled successfully.`;

  logger.info(`Analytics assembly complete for user ${userId}.`, {
    structuredSections: Object.keys(normalizedStructuredAnalytics).length,
    humanSummaryLength: humanSummary.length,
  });

  return {
    structured_analytics: normalizedStructuredAnalytics,
    human_summary: humanSummary,
  };
};
