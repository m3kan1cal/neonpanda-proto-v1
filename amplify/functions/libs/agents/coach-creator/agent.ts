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
  validateCoachConfigTool,
  normalizeCoachConfigTool,
  saveCoachConfigToDatabaseTool,
} from "./tools";
import { buildCoachCreatorPrompt } from "./prompts";
import { MODEL_IDS } from "../../api-helpers";
import { enforceValidationBlocking, assembleCoachConfig } from "./helpers";

/**
 * Minimum number of tools that must be called for a complete coach creation workflow.
 * A complete workflow requires at minimum:
 * 1. load_session_requirements - Load user data and context
 * 2. select_personality_template - Choose personality
 * 3. select_methodology_template - Choose methodology
 * 4. generate_coach_prompts - Create all prompts
 *
 * Note: This is used to detect incomplete agent responses that should trigger a retry.
 */
const MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW = 4;

/**
 * Coach Creator Agent
 *
 * Coordinates coach creation using tool-based workflow.
 * Claude decides when to load requirements, select templates, generate prompts, validate, and save.
 */
export class CoachCreatorAgent extends Agent<CoachCreatorContext> {
  private toolResults: Map<string, any> = new Map(); // Track tool results

  /**
   * Store tool result with unique key for later retrieval
   * Prevents Claude from needing to echo large objects
   */
  private storeToolResult(toolId: string, result: any): void {
    this.toolResults.set(toolId, result);
    console.info(`📦 Stored tool result for ${toolId}`);
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
   * Typed for better IntelliSense and error detection
   */
  private getStructuredToolResults() {
    return {
      requirements: this.toolResults.get("load_session_requirements"),
      personalitySelection: this.toolResults.get("select_personality_template"),
      methodologySelection: this.toolResults.get("select_methodology_template"),
      coachPrompts: this.toolResults.get("generate_coach_prompts"),
      validation: this.toolResults.get("validate_coach_config"),
      normalization: this.toolResults.get("normalize_coach_config"),
      save: this.toolResults.get("save_coach_config_to_database"),
    };
  }

  /**
   * Override handleToolUse to implement blocking enforcement
   * Prevents save when validation failed
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

    // Execute tools sequentially with blocking enforcement
    const toolResults: any[] = [];
    const augmentedContext = this.createAugmentedContext();

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

      // Enforce blocking decisions from validation
      const validationResult = this.toolResults.get("validate_coach_config");
      const blockingResult = enforceValidationBlocking(tool.id, validationResult);

      if (blockingResult) {
        console.warn(`⛔ Blocking tool execution: ${tool.id}`);
        toolResults.push(this.buildToolResult(toolUse, blockingResult, "error"));
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

    // Add tool results back to conversation
    conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    console.info("📥 Tool results added to conversation history");
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

      // RETRY LOGIC: If AI didn't use enough tools (incomplete workflow),
      // retry with a stronger prompt forcing it to proceed
      if (this.shouldRetryWithStrongerPrompt(result, response)) {
        console.warn(
          "🔄 AI incomplete workflow - RETRYING with stronger prompt to force tool execution",
        );

        // Clear tool results and retry with explicit instruction
        this.toolResults.clear();

        const retryPrompt = this.buildRetryPrompt(response, creationTimestamp);
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
   * Determine if we should retry with a stronger prompt
   * This happens when AI doesn't use tools or workflow is incomplete
   */
  private shouldRetryWithStrongerPrompt(
    result: CoachCreatorResult,
    response: string,
  ): boolean {
    // Don't retry if it was successful
    if (result.success) {
      return false;
    }

    // Don't retry if validation explicitly failed
    if (
      result.reason &&
      result.reason.toLowerCase().includes("validation failed")
    ) {
      return false;
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

    return (noToolsCalled || minimalToolsCalled) && looksIncomplete;
  }

  /**
   * Build a stronger retry prompt that forces tool execution
   */
  private buildRetryPrompt(aiResponse: string, creationTimestamp: string): string {
    // Get any partial results
    const hasRequirements = !!this.toolResults.get("load_session_requirements");
    const hasPersonality = !!this.toolResults.get("select_personality_template");
    const hasMethodology = !!this.toolResults.get("select_methodology_template");

    return `CRITICAL OVERRIDE: You did not complete the coach creation workflow.

Your previous response: "${aiResponse.substring(0, 200)}..."

You MUST now complete the workflow by calling ALL required tools:
1. load_session_requirements ${hasRequirements ? "(✓ ALREADY DONE)" : ""}
2. select_personality_template ${hasPersonality ? "(✓ ALREADY DONE)" : ""}
3. select_methodology_template ${hasMethodology ? "(✓ ALREADY DONE)" : ""}
4. generate_coach_prompts
5. validate_coach_config
6. normalize_coach_config (if needed)
7. save_coach_config_to_database

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
