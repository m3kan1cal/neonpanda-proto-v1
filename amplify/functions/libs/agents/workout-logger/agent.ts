/**
 * Workout Logger Agent
 *
 * Agent that orchestrates workout extraction, validation, and storage.
 * Uses 6 specialized tools to accomplish the task with Claude making decisions.
 *
 * Architecture follows Coach Creator pattern:
 * - Tools retrieve previous results via context.getToolResult()
 * - No large objects passed as Claude inputs (prevents double-encoding)
 * - handleToolUse() override for augmented context injection
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
import { logger } from "../../logger";

/**
 * Semantic storage key mapping for tool results
 * Maps tool IDs to shorter, meaningful keys for cleaner result storage
 * Following Coach Creator pattern for consistent data retrieval
 */
const STORAGE_KEY_MAP: Record<string, string> = {
  detect_discipline: "discipline",
  extract_workout_data: "extraction",
  validate_workout_completeness: "validation",
  normalize_workout_data: "normalization",
  generate_workout_summary: "summary",
  save_workout_to_database: "save",
};

/**
 * Workout Logger Agent
 *
 * Coordinates workout extraction and storage using tool-based workflow.
 * Claude decides when to extract, validate, normalize, summarize, and save.
 */
export class WorkoutLoggerAgent extends Agent<WorkoutLoggerContext> {
  private toolResults: Map<string, any[]> = new Map(); // Track tool results (array-based for multi-workout support)

  /**
   * Store tool result with semantic key for later retrieval
   * Maps tool IDs to semantic keys (Coach Creator pattern)
   */
  private storeToolResult(
    toolId: string,
    result: any,
    workoutIndex?: number,
  ): void {
    const storageKey = STORAGE_KEY_MAP[toolId] || toolId;

    // Debug: Deep inspection if nested objects are double-encoded at storage time
    if (storageKey === "extraction" && result?.workoutData) {
      const workoutData = result.workoutData;
      const nestedFieldTypes: Record<string, string> = {};
      const doubleEncodedFields: string[] = [];
      const deeperInspection: Record<string, Record<string, string>> = {};

      for (const key of [
        "discipline_specific",
        "performance_metrics",
        "subjective_feedback",
        "metadata",
        "coach_notes",
      ]) {
        if (workoutData[key] !== undefined) {
          const value = workoutData[key];
          const valueType = typeof value;
          nestedFieldTypes[key] = valueType;

          // Check if it's a string that looks like JSON (top level)
          if (
            valueType === "string" &&
            (value.startsWith("{") || value.startsWith("["))
          ) {
            doubleEncodedFields.push(key);
          }

          // Deeper inspection: check properties INSIDE these objects
          if (valueType === "object" && value !== null) {
            deeperInspection[key] = {};
            for (const [subKey, subValue] of Object.entries(value)) {
              const subType = typeof subValue;
              deeperInspection[key][subKey] = subType;

              // Check for double-encoding at the nested level
              if (
                subType === "string" &&
                typeof subValue === "string" &&
                (subValue.startsWith("{") || subValue.startsWith("["))
              ) {
                doubleEncodedFields.push(`${key}.${subKey}`);
                logger.warn(
                  `🔴 NESTED DOUBLE-ENCODING AT STORAGE: ${key}.${subKey}`,
                  {
                    type: subType,
                    preview: subValue.substring(0, 150),
                  },
                );
              }
            }
          }
        }
      }

      if (doubleEncodedFields.length > 0) {
        logger.warn("⚠️ DOUBLE-ENCODING DETECTED AT STORAGE TIME:", {
          toolId,
          storageKey,
          nestedFieldTypes,
          doubleEncodedFields,
          deeperInspection,
          note: "Data is ALREADY double-encoded when arriving at storeToolResult",
        });
      } else {
        logger.info("✅ Storage check: Nested fields are proper objects", {
          toolId,
          storageKey,
          nestedFieldTypes,
          deeperInspection,
        });
      }
    }

    // Store result in array (multi-workout safe)
    if (!this.toolResults.has(storageKey)) {
      this.toolResults.set(storageKey, []);
    }
    const arr = this.toolResults.get(storageKey)!;

    if (workoutIndex !== undefined) {
      // Positional storage: ensures the result for workoutIndex N is at arr[N]
      // regardless of execution order within a turn
      arr[workoutIndex] = result;
      logger.info(
        `📦 Stored tool result: ${toolId} → ${storageKey}[${workoutIndex}] (positional)`,
      );
    } else {
      // Append storage: for tools without workoutIndex (detect, extract)
      arr.push(result);
      logger.info(
        `📦 Stored tool result: ${toolId} → ${storageKey}[${arr.length - 1}] (append)`,
      );
    }
  }

  /**
   * Retrieve stored tool result by key
   * Supports optional index for multi-workout targeting.
   * Defaults to latest result (backward compatible with single-workout flow).
   */
  private getToolResult(key: string, index?: number): any {
    const results = this.toolResults.get(key);
    if (!results || results.length === 0) return undefined;
    if (index !== undefined) return results[index];
    return results[results.length - 1]; // Default: latest
  }

  /**
   * Retrieve all stored results for a key (multi-workout aggregation)
   */
  private getAllToolResults(key: string): any[] {
    return this.toolResults.get(key) || [];
  }

  /**
   * Create augmented context with getToolResult accessor
   * Used by all tool executions for data retrieval
   * Supports optional index parameter for multi-workout targeting
   */
  private createAugmentedContext(): WorkoutLoggerContext & {
    getToolResult: (key: string, index?: number) => any;
  } {
    return {
      ...this.config.context,
      getToolResult: this.getToolResult.bind(this),
    };
  }

  /**
   * Build standardized tool result structure for Bedrock conversation
   */
  private buildToolResult(
    toolUse: any,
    result: any,
    status: "success" | "error",
  ): any {
    return {
      toolResult: {
        toolUseId: toolUse.toolUseId,
        content: [{ json: result }],
        status,
      },
    };
  }

  /**
   * Retrieve all tool results in structured format
   * Uses semantic keys for consistent access
   * Returns the latest result for each key (backward compatible with single-workout flow)
   */
  private getStructuredToolResults() {
    return {
      discipline: this.getToolResult("discipline"),
      extraction: this.getToolResult("extraction"),
      validation: this.getToolResult("validation"),
      normalization: this.getToolResult("normalization"),
      summary: this.getToolResult("summary"),
      save: this.getToolResult("save"),
    };
  }

  /**
   * Override enforceToolBlocking to implement validation-based blocking
   * Prevents save/normalize when validation failed (defense in depth)
   * Index-aware: uses workoutIndex from tool input to check the correct validation result
   */
  protected enforceToolBlocking(
    toolId: string,
    toolInput: any,
  ): {
    error: boolean;
    blocked: boolean;
    reason: string;
  } | null {
    // Extract workoutIndex from tool input to check the correct validation result
    const workoutIndex = toolInput?.workoutIndex;
    const validationResult = this.getToolResult("validation", workoutIndex);

    // Delegate to helper function for blocking logic
    return enforceValidationBlocking(toolId, validationResult);
  }

  /**
   * Override handleToolUse to implement augmented context and blocking enforcement
   *
   * Workout Logger needs custom execution for:
   * - Augmented context with getToolResult accessor
   * - Tool result storage for cross-tool data passing
   * - Blocking enforcement from validation
   * - Defensive sanitization before storage
   */
  protected async handleToolUse(response: any): Promise<void> {
    const conversationHistory = this.getConversationHistory();
    const contentBlocks = response.output?.message?.content || [];

    // Add Claude's tool use message to history
    conversationHistory.push({
      role: "assistant",
      content: contentBlocks,
    });

    // Extract tool uses
    const toolUses = contentBlocks.filter((block: any) => block.toolUse);

    logger.info(`🔧 Executing ${toolUses.length} tool(s)`);

    const toolResults: any[] = [];
    const augmentedContext = this.createAugmentedContext();

    // Execute tools sequentially (workout logging has dependencies within a pipeline)
    // Note: With array-based storage, duplicate tool calls push safely -- no blocking needed.
    // Claude can call the same tool multiple times for multi-workout parallel processing.
    for (const block of toolUses) {
      const toolUse = block.toolUse;

      const tool = this.config.tools.find((t) => t.id === toolUse.name);

      if (!tool) {
        logger.warn(`⚠️ Tool not found: ${toolUse.name}`);
        toolResults.push(
          this.buildToolResult(
            toolUse,
            { error: `Tool '${toolUse.name}' not found` },
            "error",
          ),
        );
        continue;
      }

      // Use base class blocking enforcement hook
      const blockingResult = this.enforceToolBlocking(tool.id, toolUse.input);
      if (blockingResult) {
        logger.warn(`⛔ Blocking tool execution: ${tool.id}`);
        toolResults.push(
          this.buildToolResult(toolUse, blockingResult, "error"),
        );
        continue;
      }

      logger.info(`⚙️ Executing tool: ${tool.id}`);

      // Extract workoutIndex from tool input for positional storage alignment
      const workoutIndex: number | undefined = toolUse.input?.workoutIndex;

      try {
        const startTime = Date.now();
        const result = await tool.execute(toolUse.input, augmentedContext);
        const duration = Date.now() - startTime;

        logger.info(`✅ Tool ${tool.id} completed in ${duration}ms`);

        // Store result for later retrieval (with sanitization)
        this.storeToolResult(tool.id, result, workoutIndex);

        toolResults.push(this.buildToolResult(toolUse, result, "success"));
      } catch (error) {
        logger.error(`❌ Tool ${tool.id} failed:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorResult = { error: errorMessage || "Unknown error" };

        // Store error result for later retrieval (important for blocking enforcement)
        // Uses storeToolResult() to apply semantic key mapping
        this.storeToolResult(tool.id, errorResult, workoutIndex);

        toolResults.push(this.buildToolResult(toolUse, errorResult, "error"));
      }
    }

    // Add tool results back to conversation
    conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    logger.info("📥 Tool results added to conversation history");
  }

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
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      context,
    });

    logger.info("🔥 WorkoutLoggerAgent initialized with caching support");
  }

  /**
   * Log workout from user message
   * Returns standardized result structure matching existing build-workout Lambda
   */
  async logWorkout(
    userMessage: string,
    imageS3Keys?: string[],
  ): Promise<WorkoutLogResult> {
    logger.info("🏋️ WorkoutLogger agent starting", {
      messageLength: userMessage.length,
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
      userId: this.config.context.userId,
      conversationId: this.config.context.conversationId,
    });

    try {
      // handleToolUse override handles tool execution, storage, and blocking
      // No tool wrapping needed here - the override pattern handles everything
      const response = await this.converse(userMessage, imageS3Keys);

      logger.info("Agent response received:", {
        responseLength: response.length,
        responsePreview: response.substring(0, 200),
        toolResultsCollected: Array.from(this.toolResults.keys()),
      });

      const result = this.buildResultFromToolData(response);

      // RETRY LOGIC: Use base class hook to determine if retry is needed
      const retryDecision = this.shouldRetryWorkflow(result, response);
      if (retryDecision?.shouldRetry) {
        logger.warn(`🔄 ${retryDecision.logMessage}`);

        // NOTE: We do NOT clear tool results here. If the retry prompt references
        // already-completed tools, those results need to remain available for dependent
        // tools to retrieve. If the AI re-runs a tool, the new result appends to the array.

        const retryResponse = await this.converse(retryDecision.retryPrompt);

        logger.info("Retry response received:", {
          responseLength: retryResponse.length,
          toolResultsCollected: Array.from(this.toolResults.keys()),
        });

        const retryResult = this.buildResultFromToolData(retryResponse);

        // If retry also failed, fall back to original result
        if (!retryResult.success && retryResult.skipped) {
          logger.warn(
            "⚠️ Retry also resulted in skip - using original result",
          );
          return result;
        }

        logger.info(
          "✅ Retry successful - workout logged after clarification",
        );
        return retryResult;
      }

      logger.info("Built workout log result:", {
        success: result.success,
        workoutId: result.workoutId,
        hasAllFields: !!(result.discipline && result.confidence),
      });

      return result;
    } catch (error) {
      logger.error("❌ WorkoutLogger agent error:", error);

      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Override base class retry hook to implement workout-specific retry logic
   *
   * Determines if we should retry when AI asks a clarifying question instead of processing.
   * Follows Coach Creator pattern: trusts validation tool's AI-based blocking decisions.
   */
  protected shouldRetryWorkflow(
    result: WorkoutLogResult,
    response: string,
  ): {
    shouldRetry: boolean;
    retryPrompt: string;
    logMessage: string;
  } | null {
    // Don't retry if it was successful
    if (result.success) {
      return null;
    }

    // Don't retry if validation explicitly blocked (trust AI validation decision)
    // Validation tool uses AI to determine blocking flags (planning, advice-seeking, etc.)
    if (result.blockingFlags && result.blockingFlags.length > 0) {
      logger.info("✋ Not retrying - validation blocked with flags:", {
        blockingFlags: result.blockingFlags,
        reason: result.reason,
      });
      return null;
    }

    // Count only successful tool results (exclude error results)
    // Error results are stored for blocking enforcement but shouldn't count toward progress
    // Flatten arrays since each key stores an array of results (multi-workout support)
    const successfulToolCount = Array.from(this.toolResults.values())
      .flat()
      .filter((result) => result && !("error" in result)).length;

    // Check if Claude's response is a valid blocking response
    // If Claude correctly identifies non-workout content, it will respond with blocking
    // phrases WITHOUT calling tools - this is CORRECT behavior, not a retry case
    if (this.isValidBlockingResponse(response)) {
      logger.info(
        "✅ Valid blocking response detected - Claude correctly blocked non-workout content",
      );
      return null; // Don't retry
    }

    // Retry if no tools were called and response looks incomplete
    const noToolsCalled = successfulToolCount === 0;

    if (noToolsCalled && this.isIncompleteWorkflow(response)) {
      // Get the original user message from context for retry
      const userMessage = this.getConversationHistory().find(
        (msg) => msg.role === "user",
      )?.content;
      const originalMessage = Array.isArray(userMessage)
        ? userMessage.find((block: any) => block.text)?.text || ""
        : "";

      return {
        shouldRetry: true,
        retryPrompt: this.buildRetryPrompt(originalMessage, response),
        logMessage:
          "AI incomplete workflow - RETRYING with stronger prompt to force tool execution",
      };
    }

    return null; // Don't retry
  }

  /**
   * Detect if Claude's response is a valid blocking response
   *
   * Claude may correctly identify non-workout content and respond with a blocking
   * message WITHOUT calling tools. This is correct behavior that shouldn't trigger retry.
   *
   * Detection uses pattern matching rather than exact phrase matching for robustness:
   * 1. Warning indicator (⚠️) with workout context
   * 2. Negation patterns ("unable to", "cannot", "not a", etc.)
   * 3. Non-workout content types ("planning", "reflection", "advice", etc.)
   * 4. Explicit blocking statements
   */
  private isValidBlockingResponse(response: string): boolean {
    const responseLower = response.toLowerCase();

    // Pattern 1: Warning emoji with workout-related content (strongest signal)
    const hasWarningEmoji = response.includes("⚠️");
    const hasWorkoutContext =
      responseLower.includes("workout") ||
      responseLower.includes("log") ||
      responseLower.includes("exercise") ||
      responseLower.includes("training");
    if (hasWarningEmoji && hasWorkoutContext) {
      return true;
    }

    // Pattern 2: Negation patterns indicating blocking
    const negationPatterns = [
      // Unable/cannot variations
      /unable to (log|save|record|process|extract|complete)/i,
      /cannot (log|save|record|process|extract|complete)/i,
      /can'?t (log|save|record|process|extract|complete)/i,
      /couldn'?t (log|save|record|process|extract|complete)/i,
      /won'?t be able to (log|save|record|process)/i,
      // Not a workout variations
      /not a (workout|completed workout|valid workout|loggable workout)/i,
      /this is(n't| not) a (workout|completed workout|valid workout)/i,
      /doesn'?t (appear|seem|look) (to be |like )?(a )?workout/i,
      // Missing data variations
      /no (workout|performance|exercise|training) data/i,
      /no (actionable|loggable|extractable) (data|information)/i,
      /insufficient (data|information|details|context)/i,
      /missing (data|information|details|required|key|essential)/i,
      /lack(s|ing)? (sufficient |enough |the )?(data|information|details)/i,
      // Cannot extract variations
      /nothing to (log|save|record|extract)/i,
      /no (data|information|details) to (log|save|extract)/i,
    ];
    if (negationPatterns.some((pattern) => pattern.test(response))) {
      return true;
    }

    // Pattern 3: Non-workout content type identification
    const nonWorkoutTypes = [
      // Planning/future content
      /this is (a |an )?(planning|reflection|advice|question|inquiry)/i,
      /(planning|future|upcoming) (question|request|inquiry|workout|session)/i,
      /workout.*(you'?re |you are )?(planning|going to|will|intend)/i,
      /plan(ning)? to (do|complete|perform)/i,
      // Advice/question content
      /(asking|seeking|looking) (for )?(advice|help|guidance|recommendations)/i,
      /question about (workout|training|exercise|fitness)/i,
      /advice (on|about|regarding|for)/i,
      // Reflection/past without data
      /reflect(ion|ing) (on|about)/i,
      /thinking (about|back on)/i,
      /remember(ing)? (when|that|my)/i,
      // Not completed
      /not (a )?(completed|finished|done) workout/i,
      /workout.*(not|hasn'?t|wasn'?t).*(completed|finished|done)/i,
      /haven'?t (yet )?(completed|finished|done)/i,
      // Future intention
      /future (workout|training|intention|plan)/i,
      /(tomorrow|next|later|upcoming).*(workout|training|session)/i,
      /going to (do|complete|perform|try)/i,
      /will (do|complete|perform|try)/i,
      /intend(ing)? to/i,
    ];
    if (nonWorkoutTypes.some((pattern) => pattern.test(response))) {
      return true;
    }

    // Pattern 4: Explicit blocking statements
    const explicitBlocking = [
      /i (can'?t|cannot|won'?t|am unable to) (log|save|record) this/i,
      /this (message|request|input) (is|isn'?t|does|doesn'?t)/i,
      /not (a )?valid (workout )?log/i,
      /no (valid |actual )?(workout|exercise) (was )?(performed|completed|done)/i,
      /only (log|save|record) (completed|actual|real) workouts/i,
    ];
    if (explicitBlocking.some((pattern) => pattern.test(response))) {
      return true;
    }

    return false;
  }

  /**
   * Detect if Claude's response looks like an incomplete workflow
   *
   * When Claude doesn't call tools and asks clarifying questions instead,
   * we may want to retry with a stronger prompt. This detects those cases.
   *
   * Detection patterns:
   * 1. Direct questions (contains "?")
   * 2. Request phrases ("could you", "can you provide", etc.)
   * 3. Confirmation requests ("confirm", "verify", etc.)
   * 4. Incomplete action phrases ("need to", "should I", etc.)
   * 5. Waiting for input indicators
   * 6. Conditional statements requiring user response
   */
  private isIncompleteWorkflow(response: string): boolean {
    // Pattern 1: Contains question marks (direct questions)
    if (response.includes("?")) {
      return true;
    }

    // Pattern 2: Request/clarification phrases
    const requestPatterns = [
      // Could/can you variations
      /could you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
      /can you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
      /would you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
      /will you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
      // Please variations
      /please (provide|share|confirm|clarify|tell|specify|give|let me know)/i,
      // More info requests
      /need (more |additional )?(information|details|data|context|specifics)/i,
      /require (more |additional )?(information|details|data|context)/i,
      /looking for (more |additional )?(information|details|data|specifics)/i,
    ];
    if (requestPatterns.some((pattern) => pattern.test(response))) {
      return true;
    }

    // Pattern 3: Confirmation requests
    const confirmationPatterns = [
      // Direct confirmation
      /(can|could|would|will) you (please )?confirm/i,
      /please (confirm|verify|validate|check)/i,
      /(confirm|verify|validate) (that|this|the|if|whether)/i,
      // Let me know variations
      /let me know (if|when|what|which|whether|about)/i,
      /get back to me/i,
      /respond (with|when|if)/i,
      // Awaiting response
      /await(ing)? (your|a|the) (response|reply|confirmation|answer)/i,
      /waiting (for|on) (your|a|the)/i,
    ];
    if (confirmationPatterns.some((pattern) => pattern.test(response))) {
      return true;
    }

    // Pattern 4: Incomplete action indicators
    const incompletePatterns = [
      // I need variations
      /i (need|require|would need|will need) (to|more|additional)/i,
      /i'?d need (to|more|additional)/i,
      // Should I variations
      /should i (proceed|continue|assume|go ahead|start|begin)/i,
      /shall i (proceed|continue|assume|go ahead|start|begin)/i,
      /do you want me to (proceed|continue|assume|go ahead)/i,
      // Before I can variations
      /before i (can|could|am able to|proceed|continue)/i,
      /in order to (log|save|process|extract|complete)/i,
      /to (proceed|continue|complete), i (need|require|would need)/i,
      // Once you variations
      /once you (provide|share|confirm|tell|give|specify)/i,
      /when you (provide|share|confirm|tell|give|specify)/i,
      /after you (provide|share|confirm|tell|give|specify)/i,
      /if you (provide|share|confirm|tell|give|specify)/i,
    ];
    if (incompletePatterns.some((pattern) => pattern.test(response))) {
      return true;
    }

    // Pattern 5: Conditional/dependent statements
    const conditionalPatterns = [
      /if (you |this |the |that )/i,
      /assuming (you |this |the |that )/i,
      /depending on/i,
      /based on (your|the|what)/i,
      /without (more |additional |further |this |the )/i,
    ];
    // Only match conditionals that also suggest waiting for input
    const hasConditional = conditionalPatterns.some((pattern) =>
      pattern.test(response),
    );
    const suggestsWaiting =
      /then i (can|could|will|would)/i.test(response) ||
      /i (can|could|will|would) (then|proceed|continue)/i.test(response);
    if (hasConditional && suggestsWaiting) {
      return true;
    }

    return false;
  }

  /**
   * Build a stronger retry prompt that forces tool execution
   * Following Coach Creator pattern
   */
  private buildRetryPrompt(
    originalMessage: string,
    aiResponse: string,
  ): string {
    return `CRITICAL OVERRIDE: You did not complete the workflow. This is a FIRE-AND-FORGET system where the user CANNOT respond to questions.

Your incomplete response was: "${aiResponse.substring(0, 200)}..."

You MUST now complete the workflow by:
- Using your tools to extract, validate, normalize, and save the workout
- Making reasonable assumptions for missing information (intensity: 5/10, time: current time, etc.)
- NOT asking questions or requesting clarification
- Proceeding with the data available in the original message

Original message to process:
"${originalMessage}"

Complete the workout logging workflow now using your tools.`;
  }

  /**
   * Build WorkoutLogResult from tool execution data
   *
   * Uses stored tool results to construct complete response with all metadata.
   * Handles clarifying questions and text responses appropriately.
   */
  private buildResultFromToolData(agentResponse: string): WorkoutLogResult {
    // Use structured access helper for typed results
    const results = this.getStructuredToolResults();

    logger.info("Tool results available:", {
      hasDiscipline: !!results.discipline,
      hasExtraction: !!results.extraction,
      hasValidation: !!results.validation,
      hasNormalization: !!results.normalization,
      hasSummary: !!results.summary,
      hasSave: !!results.save,
    });

    // Check if ANY save succeeded (not just the latest)
    const allSaves = this.getAllToolResults("save");
    const allExtractions = this.getAllToolResults("extraction");
    const successfulSaves = allSaves
      .map((save, originalIndex) => ({ save, originalIndex }))
      .filter((entry) => entry.save.success && entry.save.workoutId);

    if (successfulSaves.length > 0) {
      // Use the first successful save as the primary result for backward compatibility
      const primarySave = successfulSaves[0];
      const primaryExtraction = allExtractions[primarySave.originalIndex];
      // For validation/normalization/summary, use latest (single-workout) or first successful match
      const primaryValidation =
        this.getToolResult("validation", primarySave.originalIndex) ||
        results.validation;
      const primaryNormalization =
        this.getToolResult("normalization", primarySave.originalIndex) ||
        results.normalization;

      logger.info("✅ Building success result from save tool", {
        totalSaves: allSaves.length,
        successfulSaves: successfulSaves.length,
        primaryIndex: primarySave.originalIndex,
      });

      const primaryResult: WorkoutLogResult = {
        success: true,
        workoutId: primarySave.save.workoutId,
        discipline: primaryExtraction?.workoutData?.discipline,
        workoutName: primaryExtraction?.workoutData?.workout_name,
        confidence:
          primaryValidation?.confidence ||
          primaryExtraction?.workoutData?.metadata?.data_confidence,
        completeness: primaryValidation?.completeness,
        extractionMetadata: {
          generationMethod: primaryExtraction?.generationMethod,
          confidence: primaryValidation?.confidence,
        },
        normalizationSummary: primaryNormalization?.normalizationSummary,
      };

      // Aggregate all saved workouts for multi-workout support
      if (successfulSaves.length > 1) {
        primaryResult.allWorkouts = successfulSaves.map((entry) => {
          const extraction = allExtractions[entry.originalIndex];
          return {
            workoutId: entry.save.workoutId,
            workoutName: extraction?.workoutData?.workout_name,
            discipline: extraction?.workoutData?.discipline,
            saved: true,
          };
        });

        logger.info("📋 Multi-workout aggregation:", {
          totalSaves: allSaves.length,
          totalExtractions: allExtractions.length,
          successfulWorkouts: primaryResult.allWorkouts.length,
          failedSaves: allSaves.length - successfulSaves.length,
        });
      }

      return primaryResult;
    }

    // If validation blocked save, return structured failure
    if (results.validation && !results.validation.shouldSave) {
      logger.info("⚠️ Building failure result from validation");

      return {
        success: false,
        skipped: true,
        reason: results.validation.reason || agentResponse,
        blockingFlags: results.validation.blockingFlags,
        confidence: results.validation.confidence,
      };
    }

    // If no tools were called, agent is likely asking a clarifying question
    // This is EXPECTED behavior, not a failure
    if (
      !results.extraction &&
      !results.validation &&
      !results.normalization &&
      !results.save
    ) {
      logger.info(
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
        logger.info("✅ Recognized as clarifying question");
      }

      return {
        success: false,
        skipped: true,
        reason: agentResponse || "Agent requested clarification",
      };
    }

    // If some tools were called but save wasn't, try to parse the response
    logger.warn(
      "⚠️ Partial tool execution - attempting to parse text response",
    );

    const workoutIdMatch = agentResponse.match(/workout_[a-z0-9_]+/i);
    if (workoutIdMatch) {
      return {
        success: true,
        workoutId: workoutIdMatch[0],
        discipline: results.extraction?.workoutData?.discipline,
        workoutName: results.extraction?.workoutData?.workout_name,
        confidence: results.validation?.confidence,
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
