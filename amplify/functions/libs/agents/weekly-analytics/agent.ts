/**
 * Weekly Analytics Agent
 *
 * Agent that orchestrates weekly analytics generation, validation, and storage.
 * Uses 5 specialized tools to accomplish the task with Claude making decisions.
 */

import { Agent } from "../core/agent";
import type { WeeklyAnalyticsContext, WeeklyAnalyticsResult } from "./types";
import {
  fetchWeeklyDataTool,
  validateWeeklyDataTool,
  generateWeeklyAnalyticsTool,
  normalizeAnalyticsDataTool,
  saveAnalyticsToDatabaseTool,
} from "./tools";
import { buildWeeklyAnalyticsPrompt } from "./prompts";
import { MODEL_IDS } from "../../api-helpers";
import { enforceValidationBlocking, calculateAnalyticsMetrics } from "./helpers";

/**
 * Weekly Analytics Agent
 *
 * Coordinates weekly analytics generation using tool-based workflow.
 * Claude decides when to fetch, validate, generate, normalize, and save.
 */
export class WeeklyAnalyticsAgent extends Agent<WeeklyAnalyticsContext> {
  private toolResults: Map<string, any> = new Map(); // Track tool results

  constructor(context: WeeklyAnalyticsContext) {
    const fullPrompt = buildWeeklyAnalyticsPrompt(context);

    // Format dates for dynamic prompt
    const weekStartStr = context.weekStart.toISOString().split("T")[0];
    const weekEndStr = context.weekEnd.toISOString().split("T")[0];

    super({
      // Large static portion (tools, rules, examples) - ~90% of tokens
      staticPrompt: fullPrompt,

      // Small dynamic portion (session data) - ~10% of tokens
      dynamicPrompt:
        `\n## CURRENT ANALYTICS SESSION\n` +
        `- User ID: ${context.userId}\n` +
        `- Week ID: ${context.weekId}\n` +
        `- Week Range: ${weekStartStr} to ${weekEndStr}\n` +
        `- Timezone: ${context.userTimezone}`,

      // Backward compatibility (not used when staticPrompt/dynamicPrompt provided)
      systemPrompt: fullPrompt,

      tools: [
        fetchWeeklyDataTool,
        validateWeeklyDataTool,
        generateWeeklyAnalyticsTool,
        normalizeAnalyticsDataTool,
        saveAnalyticsToDatabaseTool,
      ],
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      context,
    });

    console.info("🔥 WeeklyAnalyticsAgent initialized with caching support");
  }

  /**
   * Generate weekly analytics for user
   * Returns standardized result structure
   */
  async generateAnalytics(): Promise<WeeklyAnalyticsResult> {
    console.info("📊 WeeklyAnalytics agent starting", {
      userId: this.config.context.userId,
      weekId: this.config.context.weekId,
      weekRange: `${this.config.context.weekStart.toISOString().split("T")[0]} to ${this.config.context.weekEnd.toISOString().split("T")[0]}`,
    });

    try {
      // Override tool execute to track results AND enforce blocking decisions
      const originalTools = this.config.tools;
      this.config.tools = originalTools.map((tool) => ({
        ...tool,
        execute: async (input: any, context: any) => {
          // ============================================================
          // CRITICAL: ENFORCE BLOCKING DECISIONS (Defense in Depth)
          // ============================================================
          // If validate_weekly_data returned shouldGenerate: false,
          // prevent generate_weekly_analytics and save_analytics_to_database
          // from executing, even if Claude tries to call them.
          //
          // This is a code-level enforcement in addition to prompt-level
          // guidance, ensuring blocking decisions are AUTHORITATIVE.
          // ============================================================

          const validationResult = this.toolResults.get("validate_weekly_data");

          // Check if tool execution should be blocked
          const blockingResult = enforceValidationBlocking(
            tool.id,
            validationResult,
          );
          if (blockingResult) {
            return blockingResult; // Return error result to Claude
          }

          // Execute tool normally if not blocked
          const result = await tool.execute(input, context);
          this.toolResults.set(tool.id, result); // Store result
          console.info(`📦 Stored tool result for ${tool.id}`);
          return result;
        },
      }));

      const response = await this.converse(
        `Generate weekly analytics for user ${this.config.context.userId} for week ${this.config.context.weekId}.`,
      );

      console.info("Agent response received:", {
        responseLength: response.length,
        responsePreview: response.substring(0, 200),
        toolResultsCollected: Array.from(this.toolResults.keys()),
      });

      const result = this.buildResultFromToolData(response);

      console.info("Built analytics result:", {
        success: result.success,
        weekId: result.weekId,
        skipped: result.skipped,
      });

      return result;
    } catch (error) {
      console.error("❌ WeeklyAnalytics agent error:", error);

      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Build WeeklyAnalyticsResult from tool execution data
   *
   * Uses stored tool results to construct complete response with all metadata.
   * Handles skipped users and blocked generation appropriately.
   */
  private buildResultFromToolData(agentResponse: string): WeeklyAnalyticsResult {
    const fetchResult = this.toolResults.get("fetch_weekly_data");
    const validationResult = this.toolResults.get("validate_weekly_data");
    const generateResult = this.toolResults.get("generate_weekly_analytics");
    const normalizeResult = this.toolResults.get("normalize_analytics_data");
    const saveResult = this.toolResults.get("save_analytics_to_database");

    console.info("Tool results available:", {
      hasFetch: !!fetchResult,
      hasValidation: !!validationResult,
      hasGenerate: !!generateResult,
      hasNormalize: !!normalizeResult,
      hasSave: !!saveResult,
    });

    // If save tool was called successfully, we have complete analytics
    if (saveResult?.success && saveResult?.weekId) {
      console.info("✅ Building success result from save tool");

      // Get analytics data from generate or normalize result
      const analyticsData = normalizeResult?.normalizedData || {
        structured_analytics: generateResult?.structuredAnalytics,
        human_summary: generateResult?.humanSummary,
      };

      // Calculate metrics
      const metrics = calculateAnalyticsMetrics(analyticsData);

      return {
        success: true,
        weekId: saveResult.weekId,
        userId: this.config.context.userId,
        s3Location: saveResult.s3Location,
        analyticsData,
        metadata: {
          workoutCount: fetchResult?.workouts?.count || 0,
          conversationCount: fetchResult?.coaching?.count || 0,
          memoryCount: fetchResult?.userContext?.memoryCount || 0,
          historicalSummaryCount: fetchResult?.historical?.summaryCount || 0,
          analyticsLength: JSON.stringify(analyticsData).length,
          hasAthleteProfile: !!this.config.context.userProfile?.athleteProfile?.summary,
          hasDualOutput: metrics.hasDualOutput,
          humanSummaryLength: metrics.humanSummaryLength,
          normalizationApplied: !!normalizeResult,
          analysisConfidence: metrics.analysisConfidence,
          dataCompleteness: metrics.dataCompleteness,
        },
      };
    }

    // If validation blocked generation, return structured skip result
    if (validationResult && !validationResult.shouldGenerate) {
      console.info("⏭️ Building skip result from validation");

      return {
        success: false,
        skipped: true,
        reason: validationResult.reason || agentResponse,
        blockingFlags: validationResult.blockingFlags,
        weekId: this.config.context.weekId,
        userId: this.config.context.userId,
      };
    }

    // If no tools were called, agent may have encountered an issue
    if (!fetchResult && !validationResult && !generateResult && !saveResult) {
      console.info("💬 Agent didn't complete workflow (no tools called)");

      return {
        success: false,
        skipped: true,
        reason: agentResponse || "Agent workflow incomplete - no tools called",
        weekId: this.config.context.weekId,
        userId: this.config.context.userId,
      };
    }

    // Partial tool execution without save - this is a failure
    console.warn("⚠️ Partial tool execution - workflow incomplete");

    return {
      success: false,
      skipped: true,
      reason:
        agentResponse ||
        "Workflow incomplete - analytics were not saved to database",
      weekId: this.config.context.weekId,
      userId: this.config.context.userId,
    };
  }
}
