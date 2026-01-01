/**
 * Coach Creator Agent
 *
 * Agent that orchestrates coach configuration creation from intake sessions.
 * Uses 7 specialized tools to accomplish the task with Claude making decisions.
 */

import { Agent } from "../core/agent";
import type { CoachCreatorContext, CoachCreatorResult } from "./types";
import {
  loadSessionRequirementsTool,
  selectPersonalityTemplateTool,
  selectMethodologyTemplateTool,
  generateCoachPromptsTool,
  assembleCoachConfigTool,
  validateCoachConfigTool,
  normalizeCoachConfigTool,
  saveCoachConfigToDatabaseTool,
} from "./tools";
import { buildCoachCreatorPrompt } from "./prompts";
import { MODEL_IDS } from "../../api-helpers";
import { enforceValidationBlocking } from "./helpers";

/**
 * Minimum number of tools that must be called for a complete coach creation workflow.
 * A complete workflow requires at minimum:
 * 1. load_session_requirements - Load user data and context
 * 2. select_personality_template - Choose personality
 * 3. select_methodology_template - Choose methodology
 * 4. generate_coach_prompts - Create all prompts
 * 5. assemble_coach_config - Assemble complete coach configuration
 *
 * Note: This is used to detect incomplete agent responses that should trigger a retry.
 */
const MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW = 5;

/**
 * Coach Creator Agent
 *
 * Coordinates coach creation using tool-based workflow.
 * Claude decides when to load requirements, select templates, generate prompts, assemble, validate, and save.
 */
/**
 * Mapping from tool IDs to semantic storage keys
 * Following program-designer pattern for consistent data retrieval
 */
const STORAGE_KEY_MAP: Record<string, string> = {
  load_session_requirements: "requirements",
  select_personality_template: "personality_selection",
  select_methodology_template: "methodology_selection",
  generate_coach_prompts: "coach_prompts",
  assemble_coach_config: "assembled_config",
  validate_coach_config: "validation",
  normalize_coach_config: "normalization",
  save_coach_config_to_database: "save",
};

export class CoachCreatorAgent extends Agent<CoachCreatorContext> {
  private toolResults: Map<string, any> = new Map(); // Track tool results

  /**
   * Store tool result with semantic key for later retrieval
   * Maps tool IDs to semantic keys (like program-designer pattern)
   */
  private storeToolResult(toolId: string, result: any): void {
    const storageKey = STORAGE_KEY_MAP[toolId] || toolId;
    this.toolResults.set(storageKey, result);
    console.info(`📦 Stored tool result: ${toolId} → ${storageKey}`);
  }

  /**
   * Retrieve stored tool result by key
   */
  private getToolResult(key: string): any {
    return this.toolResults.get(key);
  }

  /**
   * Create augmented context with getToolResult accessor
   * Used by all tool executions for data retrieval
   */
  private createAugmentedContext(): CoachCreatorContext & {
    getToolResult: (key: string) => any;
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
   */
  private getStructuredToolResults() {
    return {
      requirements: this.toolResults.get("requirements"),
      personalitySelection: this.toolResults.get("personality_selection"),
      methodologySelection: this.toolResults.get("methodology_selection"),
      coachPrompts: this.toolResults.get("coach_prompts"),
      assembledConfig: this.toolResults.get("assembled_config"),
      validation: this.toolResults.get("validation"),
      normalization: this.toolResults.get("normalization"),
      save: this.toolResults.get("save"),
    };
  }

  /**
   * Override enforceToolBlocking to implement validation-based blocking
   * Prevents save when validation failed (defense in depth)
   */
  protected enforceToolBlocking(
    toolId: string,
    toolInput: any,
  ): {
    error: boolean;
    blocked: boolean;
    reason: string;
    validationIssues?: string[];
  } | null {
    // Get validation result from stored tool results using semantic key
    const validationResult = this.toolResults.get("validation");

    // Delegate to helper function for blocking logic
    return enforceValidationBlocking(toolId, validationResult);
  }

  /**
   * Override handleToolUse to implement augmented context, blocking enforcement, and parallel execution
   *
   * Coach Creator needs custom execution for:
   * - Augmented context with getToolResult accessor
   * - Tool result storage for cross-tool data passing
   * - Blocking enforcement from validation
   * - Parallel execution of independent tools (personality + methodology)
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

    console.info(`🔧 Executing ${toolUses.length} tool(s)`);

    // Check if we can parallelize personality and methodology selection
    const hasPersonalityTool = toolUses.some(
      (b: any) => b.toolUse.name === "select_personality_template",
    );
    const hasMethodologyTool = toolUses.some(
      (b: any) => b.toolUse.name === "select_methodology_template",
    );

    const canParallelize =
      hasPersonalityTool && hasMethodologyTool && toolUses.length === 2;

    let toolResults: any[] = [];

    if (canParallelize) {
      console.info(
        "🚀 Executing personality and methodology selection in parallel",
      );
      toolResults = await this.executeToolsInParallel(toolUses);
    } else {
      // Execute sequentially (default behavior)
      toolResults = await this.executeToolsSequentially(toolUses);
    }

    // Add tool results back to conversation
    conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    console.info("📥 Tool results added to conversation history");
  }

  /**
   * Execute tools in parallel (for independent tools like personality + methodology)
   */
  private async executeToolsInParallel(toolUses: any[]): Promise<any[]> {
    const augmentedContext = this.createAugmentedContext();

    const results = await Promise.all(
      toolUses.map(async (block: any) => {
        const toolUse = block.toolUse;
        const tool = this.config.tools.find((t) => t.id === toolUse.name);

        if (!tool) {
          console.warn(`⚠️ Tool not found: ${toolUse.name}`);
          return this.buildToolResult(
            toolUse,
            { error: `Tool '${toolUse.name}' not found` },
            "error",
          );
        }

        console.info(`⚙️ Executing tool: ${tool.id} (parallel)`);

        try {
          const startTime = Date.now();
          const result = await tool.execute(toolUse.input, augmentedContext);
          const duration = Date.now() - startTime;

          console.info(`✅ Tool ${tool.id} completed in ${duration}ms`);

          // Store result for later retrieval
          this.storeToolResult(tool.id, result);

          return this.buildToolResult(toolUse, result, "success");
        } catch (error) {
          console.error(`❌ Tool ${tool.id} failed:`, error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return this.buildToolResult(
            toolUse,
            { error: errorMessage },
            "error",
          );
        }
      }),
    );

    return results;
  }

  /**
   * Execute tools sequentially (default behavior with blocking checks)
   */
  private async executeToolsSequentially(toolUses: any[]): Promise<any[]> {
    const augmentedContext = this.createAugmentedContext();
    const toolResults: any[] = [];

    for (const block of toolUses) {
      const toolUse = block.toolUse;
      const tool = this.config.tools.find((t) => t.id === toolUse.name);

      if (!tool) {
        console.warn(`⚠️ Tool not found: ${toolUse.name}`);
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
        console.warn(`⛔ Blocking tool execution: ${tool.id}`);
        toolResults.push(
          this.buildToolResult(toolUse, blockingResult, "error"),
        );
        continue;
      }

      console.info(`⚙️ Executing tool: ${tool.id}`);

      try {
        const startTime = Date.now();
        const result = await tool.execute(toolUse.input, augmentedContext);
        const duration = Date.now() - startTime;

        console.info(`✅ Tool ${tool.id} completed in ${duration}ms`);

        // Store result for later retrieval
        this.storeToolResult(tool.id, result);

        toolResults.push(this.buildToolResult(toolUse, result, "success"));
      } catch (error) {
        console.error(`❌ Tool ${tool.id} failed:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolResults.push(
          this.buildToolResult(toolUse, { error: errorMessage }, "error"),
        );
      }
    }

    return toolResults;
  }

  constructor(context: CoachCreatorContext) {
    // Build full prompt
    const fullPrompt = buildCoachCreatorPrompt(context);

    super({
      // Large static portion (tools, rules, templates) - ~95% of tokens
      staticPrompt: fullPrompt,

      // Small dynamic portion (session-specific data) - ~5% of tokens
      dynamicPrompt:
        `\n## CURRENT CREATION SESSION\n` +
        `- User ID: ${context.userId}\n` +
        `- Session ID: ${context.sessionId}\n` +
        `- Timestamp: ${new Date().toISOString()}`,

      // Backward compatibility (not used when staticPrompt/dynamicPrompt provided)
      systemPrompt: fullPrompt,

      tools: [
        loadSessionRequirementsTool,
        selectPersonalityTemplateTool,
        selectMethodologyTemplateTool,
        generateCoachPromptsTool,
        assembleCoachConfigTool,
        validateCoachConfigTool,
        normalizeCoachConfigTool,
        saveCoachConfigToDatabaseTool,
      ],
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      context,
    });

    console.info("🔥 CoachCreatorAgent initialized with caching support");
  }

  /**
   * Create coach from session requirements
   * Returns standardized result structure matching existing build-coach-config Lambda
   */
  async createCoach(): Promise<CoachCreatorResult> {
    console.info("🎨 CoachCreator agent starting", {
      userId: this.config.context.userId,
      sessionId: this.config.context.sessionId,
    });

    // Generate consistent timestamp for all operations
    const creationTimestamp = new Date().toISOString();

    try {
      const response = await this.converse(
        `Create a personalized AI fitness coach for this user. Use timestamp: ${creationTimestamp}`,
      );

      console.info("Agent response received:", {
        responseLength: response.length,
        responsePreview: response.substring(0, 200),
        toolResultsCollected: Array.from(this.toolResults.keys()),
      });

      const result = this.buildResultFromToolData(response);

      // RETRY LOGIC: Use base class hook to determine if retry is needed
      const retryDecision = this.shouldRetryWorkflow(result, response);
      if (retryDecision?.shouldRetry) {
        console.warn(`🔄 ${retryDecision.logMessage}`);

        // NOTE: We do NOT clear tool results here. Tools marked as "(✓ ALREADY DONE)" in the
        // retry prompt may be skipped by the AI, and if so, they need their results to still
        // be available for dependent tools to retrieve via getToolResult().
        // If the AI re-runs a tool, it will simply overwrite the existing result.

        const retryResponse = await this.converse(retryDecision.retryPrompt);

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

        console.info("✅ Retry successful - coach created after retry");
        return retryResult;
      }

      console.info("Built coach creation result:", {
        success: result.success,
        coachConfigId: result.coachConfigId,
        hasAllFields: !!(result.coachName && result.primaryPersonality),
      });

      return result;
    } catch (error) {
      console.error("❌ CoachCreator agent error:", error);

      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Override base class retry hook to implement coach-creator-specific retry logic
   *
   * Determines if we should retry when AI doesn't use enough tools or workflow is incomplete.
   */
  protected shouldRetryWorkflow(
    result: CoachCreatorResult,
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

    // Don't retry if validation explicitly failed
    if (
      result.reason &&
      result.reason.toLowerCase().includes("validation failed")
    ) {
      return null;
    }

    // Retry if no tools were called and response looks incomplete
    const noToolsCalled = this.toolResults.size === 0;
    const minimalToolsCalled =
      this.toolResults.size < MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW;

    const looksIncomplete =
      response.includes("?") ||
      response.toLowerCase().includes("need to") ||
      response.toLowerCase().includes("should i") ||
      response.toLowerCase().includes("would you like") ||
      response.toLowerCase().includes("can you confirm");

    if ((noToolsCalled || minimalToolsCalled) && looksIncomplete) {
      const creationTimestamp = new Date().toISOString();

      return {
        shouldRetry: true,
        retryPrompt: this.buildRetryPrompt(response, creationTimestamp),
        logMessage:
          "AI incomplete workflow - RETRYING with stronger prompt to force tool execution",
      };
    }

    return null; // Don't retry
  }

  /**
   * Build a stronger retry prompt that forces tool execution
   */
  private buildRetryPrompt(
    aiResponse: string,
    creationTimestamp: string,
  ): string {
    // Get any partial results using semantic keys
    const hasRequirements = !!this.toolResults.get("requirements");
    const hasPersonality = !!this.toolResults.get("personality_selection");
    const hasMethodology = !!this.toolResults.get("methodology_selection");
    const hasPrompts = !!this.toolResults.get("coach_prompts");
    const hasAssembled = !!this.toolResults.get("assembled_config");

    return `CRITICAL OVERRIDE: You did not complete the coach creation workflow.

Your previous response: "${aiResponse.substring(0, 200)}..."

You MUST now complete the workflow by calling ALL required tools:
1. load_session_requirements ${hasRequirements ? "(✓ ALREADY DONE)" : ""}
2. select_personality_template ${hasPersonality ? "(✓ ALREADY DONE)" : ""}
3. select_methodology_template ${hasMethodology ? "(✓ ALREADY DONE)" : ""}
4. generate_coach_prompts ${hasPrompts ? "(✓ ALREADY DONE)" : ""}
5. assemble_coach_config ${hasAssembled ? "(✓ ALREADY DONE)" : ""}
6. validate_coach_config
7. normalize_coach_config (if needed)
8. save_coach_config_to_database

CRITICAL INSTRUCTIONS:
- DO NOT ask any questions
- CALL YOUR TOOLS to create and save the coach
- Make reasonable assumptions for any missing information
- Use timestamp: ${creationTimestamp}

Now create the coach using your tools.`;
  }

  /**
   * Build CoachCreatorResult from tool execution data
   *
   * Uses stored tool results to construct complete response with all metadata.
   * Handles incomplete workflows appropriately.
   */
  private buildResultFromToolData(agentResponse: string): CoachCreatorResult {
    // Extract tool results using structured helper
    const results = this.getStructuredToolResults();

    console.info("Tool results available:", {
      hasRequirements: !!results.requirements,
      hasPersonalitySelection: !!results.personalitySelection,
      hasMethodologySelection: !!results.methodologySelection,
      hasCoachPrompts: !!results.coachPrompts,
      hasValidation: !!results.validation,
      hasNormalization: !!results.normalization,
      hasSave: !!results.save,
    });

    // If save tool was called successfully, we have a complete coach
    if (results.save?.success && results.save?.coachConfigId) {
      console.info("✅ Building success result from save tool");

      return {
        success: true,
        coachConfigId: results.save.coachConfigId,
        coachName: results.save.coachName,
        primaryPersonality: results.personalitySelection?.primaryTemplate,
        primaryMethodology: results.methodologySelection?.primaryMethodology,
        genderPreference: results.requirements?.genderPreference,
        generationMethod: "tool",
        pineconeStored: results.save.pineconeStored,
        pineconeRecordId: results.save.pineconeRecordId,
      };
    }

    // If validation failed, return structured failure
    if (results.validation && !results.validation.isValid) {
      console.info("⚠️ Building failure result from validation");

      return {
        success: false,
        skipped: true,
        reason: `Coach validation failed: ${results.validation.validationIssues?.join(", ") || "Unknown issues"}`,
        validationIssues: results.validation.validationIssues,
      };
    }

    // If no tools were called, agent may be asking for clarification
    if (
      !results.requirements &&
      !results.personalitySelection &&
      !results.validation &&
      !results.save
    ) {
      console.info(
        "💬 Agent incomplete workflow (no tools called - may need retry)",
      );

      return {
        success: false,
        skipped: true,
        reason: agentResponse || "Agent workflow incomplete - no tools called",
      };
    }

    // Partial tool execution without save - this is a failure
    console.warn("⚠️ Partial tool execution - workflow incomplete");

    return {
      success: false,
      skipped: true,
      reason:
        agentResponse ||
        "Workflow incomplete - coach was not saved to database",
    };
  }
}
