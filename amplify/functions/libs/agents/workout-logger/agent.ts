/**
 * Workout Logger Agent
 *
 * Agent that orchestrates workout extraction, validation, and storage.
 * Uses 5 specialized tools to accomplish the task with Claude making decisions.
 */

import { Agent } from "../core/agent";
import type { WorkoutLoggerContext, WorkoutLogResult } from "./types";
import {
  detectDisciplineTool,
  extractWorkoutDataTool,
  validateWorkoutCompletenessTool,
  normalizeWorkoutDataTool,
  generateWorkoutSummaryTool,
  saveWorkoutToDatabaseTool,
} from "./tools";
import { buildWorkoutLoggerPrompt } from "./prompts";
import { MODEL_IDS } from "../../api-helpers";
import { enforceValidationBlocking } from "./helpers";

/**
 * Workout Logger Agent
 *
 * Coordinates workout extraction and storage using tool-based workflow.
 * Claude decides when to extract, validate, normalize, summarize, and save.
 */
export class WorkoutLoggerAgent extends Agent<WorkoutLoggerContext> {
  private toolResults: Map<string, any> = new Map(); // Track tool results

  constructor(context: WorkoutLoggerContext) {
    const fullPrompt = buildWorkoutLoggerPrompt(context);

    super({
      // Large static portion (tools, rules, examples) - ~90% of tokens
      staticPrompt: fullPrompt,

      // Small dynamic portion (session data) - ~10% of tokens
      dynamicPrompt:
        `\n## CURRENT LOGGING SESSION\n` +
        `- User ID: ${context.userId}\n` +
        `- Images: ${context.imageS3Keys?.length || 0}\n` +
        `- Workout ID: ${context.workoutId}`,

      // Backward compatibility (not used when staticPrompt/dynamicPrompt provided)
      systemPrompt: fullPrompt,

      tools: [
        detectDisciplineTool,
        extractWorkoutDataTool,
        validateWorkoutCompletenessTool,
        normalizeWorkoutDataTool,
        generateWorkoutSummaryTool,
        saveWorkoutToDatabaseTool,
      ],
      modelId: MODEL_IDS.CLAUDE_SONNET_4_FULL,
      context,
    });

    console.info("🔥 WorkoutLoggerAgent initialized with caching support");
  }

  /**
   * Log workout from user message
   * Returns standardized result structure matching existing build-workout Lambda
   */
  async logWorkout(
    userMessage: string,
    imageS3Keys?: string[],
  ): Promise<WorkoutLogResult> {
    console.info("🏋️ WorkoutLogger agent starting", {
      messageLength: userMessage.length,
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
      userId: this.config.context.userId,
      conversationId: this.config.context.conversationId,
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
          // If validate_workout_completeness returned shouldSave: false,
          // prevent normalize_workout_data and save_workout_to_database
          // from executing, even if Claude tries to call them.
          //
          // This is a code-level enforcement in addition to prompt-level
          // guidance, ensuring blocking decisions are AUTHORITATIVE.
          // ============================================================

          const validationResult = this.toolResults.get(
            "validate_workout_completeness",
          );

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

      const response = await this.converse(userMessage, imageS3Keys);

      console.info("Agent response received:", {
        responseLength: response.length,
        responsePreview: response.substring(0, 200),
        toolResultsCollected: Array.from(this.toolResults.keys()),
      });

      const result = this.buildResultFromToolData(response);

      // RETRY LOGIC: If AI asked a clarifying question (no tools called),
      // retry with a stronger prompt forcing it to make assumptions
      if (this.shouldRetryWithStrongerPrompt(result, response)) {
        console.warn(
          "🔄 AI asked clarifying question - RETRYING with stronger prompt to force extraction",
        );

        // Clear tool results and retry with explicit instruction
        this.toolResults.clear();

        const retryPrompt = this.buildRetryPrompt(userMessage, response);
        const retryResponse = await this.converse(retryPrompt);

        console.info("Retry response received:", {
          responseLength: retryResponse.length,
          toolResultsCollected: Array.from(this.toolResults.keys()),
        });

        const retryResult = this.buildResultFromToolData(retryResponse);

        // If retry also failed, fall back to original result
        if (!retryResult.success && retryResult.skipped) {
          console.warn(
            "⚠️ Retry also resulted in skip - using original result",
          );
          return result;
        }

        console.info(
          "✅ Retry successful - workout logged after clarification",
        );
        return retryResult;
      }

      console.info("Built workout log result:", {
        success: result.success,
        workoutId: result.workoutId,
        hasAllFields: !!(result.discipline && result.confidence),
      });

      return result;
    } catch (error) {
      console.error("❌ WorkoutLogger agent error:", error);

      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Determine if we should retry with a stronger prompt
   * This happens when AI asks a clarifying question instead of processing
   *
   * NOTE: While stream-coach-conversation does initial detection, this provides
   * defense-in-depth to prevent retry logic from overriding correct blocking decisions.
   */
  private shouldRetryWithStrongerPrompt(
    result: WorkoutLogResult,
    response: string,
  ): boolean {
    // Don't retry if it was successful
    if (result.success) {
      return false;
    }

    // Don't retry if AI correctly detected non-workout content
    // This is CRITICAL: If AI blocked something, trust that decision and don't override it
    if (result.reason) {
      const reasonLower = result.reason.toLowerCase();

      // Past workout reflections (retrospective content)
      const isPastWorkout =
        reasonLower.includes("past workout") ||
        reasonLower.includes("yesterday") ||
        reasonLower.includes("retrospective") ||
        reasonLower.includes("reflection") ||
        reasonLower.includes("previous workout") ||
        reasonLower.includes("last week") ||
        reasonLower.includes("earlier today") ||
        reasonLower.includes("already completed");

      // Future/planning content
      const isPlanning =
        reasonLower.includes("planning") ||
        reasonLower.includes("future workout") ||
        reasonLower.includes("going to") ||
        reasonLower.includes("will do") ||
        reasonLower.includes("tomorrow") ||
        reasonLower.includes("next week") ||
        reasonLower.includes("thinking about") ||
        reasonLower.includes("considering");

      // Not a completed workout
      const isNotCompleted =
        reasonLower.includes("not a completed workout") ||
        reasonLower.includes("no workout") ||
        reasonLower.includes("didn't work out") ||
        reasonLower.includes("did not work out") ||
        reasonLower.includes("skipped");

      // Questions/advice seeking
      const isQuestion =
        reasonLower.includes("asking") ||
        reasonLower.includes("question") ||
        reasonLower.includes("advice") ||
        reasonLower.includes("should i") ||
        reasonLower.includes("how do i") ||
        reasonLower.includes("what should");

      // General discussion/context
      const isDiscussion =
        reasonLower.includes("discussion") ||
        reasonLower.includes("general") ||
        reasonLower.includes("context") ||
        reasonLower.includes("background");

      // If ANY of these patterns match, don't retry
      if (
        isPastWorkout ||
        isPlanning ||
        isNotCompleted ||
        isQuestion ||
        isDiscussion
      ) {
        console.info(
          "✋ Blocking retry - AI correctly detected non-workout content:",
          {
            isPastWorkout,
            isPlanning,
            isNotCompleted,
            isQuestion,
            isDiscussion,
            reasonPreview: result.reason.substring(0, 100),
          },
        );
        return false;
      }
    }

    // Only retry if no tools were called and response looks like a genuine clarifying question
    // (e.g., AI needs more info about an actual workout being logged)
    const noToolsCalled = this.toolResults.size === 0;
    const looksLikeQuestion =
      response.includes("?") ||
      response.toLowerCase().includes("confirm") ||
      response.toLowerCase().includes("verify") ||
      response.toLowerCase().includes("could you") ||
      response.toLowerCase().includes("can you provide");

    return noToolsCalled && looksLikeQuestion;
  }

  /**
   * Build a stronger retry prompt that forces extraction with assumptions
   */
  private buildRetryPrompt(
    originalMessage: string,
    aiQuestion: string,
  ): string {
    return `CRITICAL OVERRIDE: You just asked a clarifying question, but this is a FIRE-AND-FORGET system where the user CANNOT respond.

Your question was: "${aiQuestion.substring(0, 200)}..."

You MUST now process the original message by making reasonable assumptions:
- Extract what you can from the available data
- Use sensible defaults for missing information (intensity: 5/10, time: current time, etc.)
- CALL YOUR TOOLS to extract, validate, normalize, and save the workout
- Do NOT ask any more questions

Original message to process:
"${originalMessage}"

Now extract and save this workout using your tools. Make assumptions where needed.`;
  }

  /**
   * Build WorkoutLogResult from tool execution data
   *
   * Uses stored tool results to construct complete response with all metadata.
   * Handles clarifying questions and text responses appropriately.
   */
  private buildResultFromToolData(agentResponse: string): WorkoutLogResult {
    const extractionResult = this.toolResults.get("extract_workout_data");
    const validationResult = this.toolResults.get(
      "validate_workout_completeness",
    );
    const normalizationResult = this.toolResults.get("normalize_workout_data");
    const saveResult = this.toolResults.get("save_workout_to_database");

    console.info("Tool results available:", {
      hasExtraction: !!extractionResult,
      hasValidation: !!validationResult,
      hasNormalization: !!normalizationResult,
      hasSave: !!saveResult,
    });

    // If save tool was called successfully, we have a complete workout
    if (saveResult?.success && saveResult?.workoutId) {
      console.info("✅ Building success result from save tool");

      return {
        success: true,
        workoutId: saveResult.workoutId,
        discipline: extractionResult?.workoutData?.discipline,
        workoutName: extractionResult?.workoutData?.workout_name,
        confidence:
          validationResult?.confidence ||
          extractionResult?.workoutData?.metadata?.data_confidence,
        completeness: validationResult?.completeness,
        extractionMetadata: {
          generationMethod: extractionResult?.generationMethod,
          confidence: validationResult?.confidence,
        },
        normalizationSummary: normalizationResult?.normalizationSummary,
      };
    }

    // If validation blocked save, return structured failure
    if (validationResult && !validationResult.shouldSave) {
      console.info("⚠️ Building failure result from validation");

      return {
        success: false,
        skipped: true,
        reason: validationResult.reason || agentResponse,
        blockingFlags: validationResult.blockingFlags,
        confidence: validationResult.confidence,
      };
    }

    // If no tools were called, agent is likely asking a clarifying question
    // This is EXPECTED behavior, not a failure
    if (
      !extractionResult &&
      !validationResult &&
      !normalizationResult &&
      !saveResult
    ) {
      console.info(
        "💬 Agent asking clarifying question (no tools called - this is expected)",
      );

      // Check if it looks like a question or confirmation request
      const isQuestion =
        agentResponse.includes("?") ||
        agentResponse.toLowerCase().includes("confirm") ||
        agentResponse.toLowerCase().includes("verify") ||
        agentResponse.toLowerCase().includes("need to") ||
        agentResponse.toLowerCase().includes("please");

      if (isQuestion) {
        console.info("✅ Recognized as clarifying question");
      }

      return {
        success: false,
        skipped: true,
        reason: agentResponse || "Agent requested clarification",
      };
    }

    // If some tools were called but save wasn't, try to parse the response
    console.warn(
      "⚠️ Partial tool execution - attempting to parse text response",
    );

    const workoutIdMatch = agentResponse.match(/workout_[a-z0-9_]+/i);
    if (workoutIdMatch) {
      return {
        success: true,
        workoutId: workoutIdMatch[0],
        discipline: extractionResult?.workoutData?.discipline,
        workoutName: extractionResult?.workoutData?.workout_name,
        confidence: validationResult?.confidence,
      };
    }

    // Complete failure - tools were partially called but workflow didn't complete
    return {
      success: false,
      skipped: true,
      reason:
        agentResponse ||
        "Workflow incomplete - could not determine workout log result",
    };
  }
}
