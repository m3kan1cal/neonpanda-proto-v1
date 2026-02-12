/**
 * Base Agent Class
 *
 * Implements the core agent pattern with tool execution loop.
 * Uses Bedrock Converse API to let Claude decide when and how to use tools.
 *
 * Features:
 * - Tool execution loop (Reason → Tool Use → Execute → Reflect → Repeat)
 * - Full multimodal support (text + images via S3)
 * - Type-safe context passing to tools
 * - Automatic conversation history management
 */

import {
  callBedrockApiForAgent,
  type BedrockToolConfig,
} from "../../api-helpers";
import type {
  AgentContext,
  AgentConfig,
  AgentMessage,
  BedrockResponse,
  ToolUseBlock,
  Tool,
} from "./types";
import { MODEL_IDS } from "../../api-helpers";
import { buildMultimodalContent } from "../../streaming/multimodal-helpers";
import { MESSAGE_TYPES } from "../../coach-conversation/types";
import { logger } from "../../logger";

const MAX_TOKENS = 32768;
const TEMPERATURE = 0.7;

export class Agent<TContext extends AgentContext = AgentContext> {
  protected config: AgentConfig<TContext>; // Protected so subclasses can access
  private conversationHistory: AgentMessage[] = [];

  constructor(config: AgentConfig<TContext>) {
    this.config = {
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      ...config,
    };
  }

  /**
   * Main conversation entry point
   * Runs the tool execution loop until Claude provides a final response
   */
  async converse(userMessage: string, imageS3Keys?: string[]): Promise<string> {
    logger.info("🤖 Agent conversation started", {
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
      imageCount: imageS3Keys?.length || 0,
    });

    // Add user message to history (await for multimodal content)
    const userContent = await this.buildUserContent(userMessage, imageS3Keys);
    this.conversationHistory.push({
      role: "user",
      content: userContent,
    });

    // The Strands loop: Reason → Tool Use → Reflect
    let shouldContinue = true;
    let finalResponse = "";
    let iterationCount = 0;
    const MAX_ITERATIONS = 20; // Safety limit

    while (shouldContinue && iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      logger.info(`🔄 Agent iteration ${iterationCount}`);

      const response = await this.invokeModel();

      if (response.stopReason === "tool_use") {
        logger.info("🔧 Claude decided to use tools");
        await this.handleToolUse(response);
        continue; // Let Claude reflect on tool results
      }

      if (response.stopReason === "end_turn") {
        logger.info("✅ Claude provided final response");
        finalResponse = this.extractTextFromResponse(response);

        // Add final assistant message to history
        this.conversationHistory.push({
          role: "assistant",
          content: response.output.message.content,
        });

        shouldContinue = false;
      }

      if (response.stopReason === "max_tokens") {
        logger.warn("⚠️ Response hit max tokens limit");
        finalResponse =
          this.extractTextFromResponse(response) ||
          "Response exceeded token limit.";
        shouldContinue = false;
      }

      if (response.stopReason === "stop_sequence") {
        logger.info("🛑 Response stopped at stop sequence");
        finalResponse = this.extractTextFromResponse(response);

        // Add final assistant message to history
        this.conversationHistory.push({
          role: "assistant",
          content: response.output.message.content,
        });

        shouldContinue = false;
      }

      if (response.stopReason === "content_filtered") {
        logger.warn("⚠️ Response was content filtered");
        finalResponse =
          this.extractTextFromResponse(response) ||
          "Response was filtered due to content policy.";
        shouldContinue = false;
      }
    }

    if (iterationCount >= MAX_ITERATIONS) {
      logger.warn(`⚠️ Agent hit max iterations (${MAX_ITERATIONS})`);
      finalResponse = finalResponse || "Agent exceeded maximum iterations.";
    }

    logger.info("🏁 Agent conversation completed", {
      iterations: iterationCount,
      responseLength: finalResponse.length,
    });

    return finalResponse;
  }

  /**
   * Invoke Bedrock model with current conversation history and tools
   * Uses api-helpers for automatic caching support
   */
  private async invokeModel(): Promise<BedrockResponse> {
    logger.info("🤖 Invoking model with agent conversation history", {
      messageCount: this.conversationHistory.length,
      hasStaticPrompt: !!this.config.staticPrompt,
      hasDynamicPrompt: !!this.config.dynamicPrompt,
      toolCount: this.config.tools?.length || 0,
    });

    // Convert tools to BedrockToolConfig format
    const tools: BedrockToolConfig[] = this.config.tools.map((t) => ({
      name: t.id,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    // Prepare caching options
    const options: any = {};

    // Use static/dynamic prompt split if available (enables caching)
    if (this.config.staticPrompt && this.config.dynamicPrompt) {
      options.staticPrompt = this.config.staticPrompt;
      options.dynamicPrompt = this.config.dynamicPrompt;
      logger.info(
        "🔥 AGENT CACHING ENABLED: Using static/dynamic prompt structure",
      );
    }

    // Determine system prompt (use staticPrompt if available, else systemPrompt)
    const systemPrompt = this.config.staticPrompt || this.config.systemPrompt;

    // Call agent-optimized API helper (automatically gets caching + logging)
    const startTime = Date.now();
    const response = await callBedrockApiForAgent(
      systemPrompt,
      this.conversationHistory,
      tools,
      this.config.modelId || MODEL_IDS.PLANNER_MODEL_FULL,
      options,
    );
    const duration = Date.now() - startTime;

    logger.info("📊 Bedrock response received", {
      stopReason: response.stopReason,
      duration: `${duration}ms`,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      ...(response.usage?.cacheReadInputTokens && {
        cacheHits: response.usage.cacheReadInputTokens,
      }),
    });

    return response as BedrockResponse;
  }

  /**
   * Optional blocking enforcement hook for subclasses
   *
   * Override this method to implement validation-based blocking.
   * Called before each tool execution to check if the tool should be blocked.
   *
   * Pattern used by agents to enforce validation decisions (e.g., prevent save
   * when validation failed). Provides "defense in depth" - blocking decisions
   * are enforced at code level, not just prompt level.
   *
   * @param toolId - The ID of the tool about to be executed
   * @param toolInput - The input parameters for the tool
   * @returns Error result if tool should be blocked, null if should proceed
   *
   * @example
   * ```typescript
   * protected enforceToolBlocking(toolId: string, toolInput: any) {
   *   const validation = this.toolResults.get("validate_workout_completeness");
   *
   *   if (toolId === "save_workout_to_database" && validation?.shouldSave === false) {
   *     return {
   *       error: true,
   *       blocked: true,
   *       reason: `Cannot save - validation blocked: ${validation.reason}`,
   *       blockingFlags: validation.blockingFlags,
   *     };
   *   }
   *
   *   return null; // Allow tool to proceed
   * }
   * ```
   */
  protected enforceToolBlocking(
    toolId: string,
    toolInput: any,
  ): {
    error: boolean;
    blocked: boolean;
    reason: string;
    [key: string]: any;
  } | null {
    return null; // Default: no blocking
  }

  /**
   * Optional retry logic hook for subclasses
   *
   * Override this method to implement custom retry behavior when AI doesn't
   * use tools or workflow is incomplete. This is useful for "fire-and-forget"
   * systems where the AI might ask clarifying questions but the user won't see them.
   *
   * Default implementation: No retry (returns null)
   *
   * @param result - The result object from the agent workflow
   * @param aiResponse - The text response from the AI
   * @returns Object with shouldRetry flag and optional retryPrompt, or null to skip retry
   *
   * @example
   * ```typescript
   * protected shouldRetryWorkflow(result: any, aiResponse: string) {
   *   // Don't retry if successful
   *   if (result.success) return null;
   *
   *   // Retry if no tools were called and response looks like a question
   *   const noToolsCalled = this.toolResults.size === 0;
   *   const looksLikeQuestion = aiResponse.includes("?");
   *
   *   if (noToolsCalled && looksLikeQuestion) {
   *     return {
   *       shouldRetry: true,
   *       retryPrompt: "CRITICAL: You must use your tools to complete the task...",
   *       logMessage: "AI asked question instead of using tools",
   *     };
   *   }
   *
   *   return null; // Don't retry
   * }
   * ```
   */
  protected shouldRetryWorkflow(
    result: any,
    aiResponse: string,
  ): {
    shouldRetry: boolean;
    retryPrompt: string;
    logMessage: string;
  } | null {
    return null; // Default: no retry
  }

  /**
   * Handle tool use by executing tools and adding results to conversation
   * Can be overridden by subclasses for custom execution strategies (e.g., parallel execution)
   */
  protected async handleToolUse(response: BedrockResponse): Promise<void> {
    // Extract tool uses from response
    const contentBlocks = response.output?.message?.content || [];
    const toolUses = contentBlocks.filter(
      (block: any): block is ToolUseBlock => block.toolUse,
    );

    logger.info(`🔧 Executing ${toolUses.length} tool(s)`);

    // First, add Claude's assistant message with tool uses to history
    this.conversationHistory.push({
      role: "assistant",
      content: contentBlocks,
    });

    // Execute each tool and collect results (sequential by default)
    const toolResults: any[] = [];

    for (const block of toolUses) {
      const toolUse = block.toolUse;
      const tool = this.config.tools.find((t) => t.id === toolUse.name);

      if (!tool) {
        logger.warn(`⚠️ Tool not found: ${toolUse.name}`);
        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [
              {
                json: {
                  error: `Tool '${toolUse.name}' not found`,
                },
              },
            ],
            status: "error",
          },
        });
        continue;
      }

      // Check if tool execution should be blocked (subclass hook)
      const blockingResult = this.enforceToolBlocking(tool.id, toolUse.input);
      if (blockingResult) {
        // Structured logging: Tool blocked
        this.logToolExecution({
          phase: "blocked",
          toolId: tool.id,
          toolUseId: toolUse.toolUseId,
          blockReason: blockingResult.reason,
        });

        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [{ json: blockingResult }],
            status: "error",
          },
        });
        continue;
      }

      // Structured logging: Tool execution start
      this.logToolExecution({
        phase: "start",
        toolId: tool.id,
        toolUseId: toolUse.toolUseId,
        inputPreview: this.truncateForLog(toolUse.input),
      });

      try {
        const startTime = Date.now();
        const result = await tool.execute(toolUse.input, this.config.context);
        const duration = Date.now() - startTime;

        // Structured logging: Tool execution success
        this.logToolExecution({
          phase: "success",
          toolId: tool.id,
          toolUseId: toolUse.toolUseId,
          duration,
          resultPreview: this.truncateForLog(result),
          resultSize: JSON.stringify(result).length,
        });

        // Add successful result
        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [{ json: result }],
            status: "success",
          },
        });
      } catch (error) {
        // Structured logging: Tool execution error
        this.logToolExecution({
          phase: "error",
          toolId: tool.id,
          toolUseId: toolUse.toolUseId,
          error: error instanceof Error ? error.message : String(error),
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        });

        // Add error result
        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [
              {
                json: {
                  error: error instanceof Error ? error.message : String(error),
                },
              },
            ],
            status: "error",
          },
        });
      }
    }

    // Add all tool results back to conversation as 'user' role
    // This is how Claude sees the results of its tool calls
    this.conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    logger.info("📥 Tool results added to conversation history");
  }

  /**
   * Build user content (handles text and multimodal)
   * Uses existing multimodal helpers for consistent S3 image handling
   */
  private async buildUserContent(
    userMessage: string,
    imageS3Keys?: string[],
  ): Promise<any> {
    // If no images, return simple text content
    if (!imageS3Keys || imageS3Keys.length === 0) {
      return [{ text: userMessage }];
    }

    // Build multimodal content using existing helper
    logger.info("🖼️ Building multimodal content for agent conversation:", {
      messageLength: userMessage.length,
      imageCount: imageS3Keys.length,
    });

    const multimodalMessage = {
      role: "user",
      content: userMessage,
      messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
      imageS3Keys,
    };

    const converseMessages = await buildMultimodalContent([multimodalMessage]);

    // Return the content blocks (not the full message wrapper)
    return converseMessages[0].content;
  }

  /**
   * Extract text from Bedrock response
   */
  private extractTextFromResponse(response: BedrockResponse): string {
    const contentBlocks = response.output?.message?.content || [];
    const textBlocks = contentBlocks.filter((block: any) => block.text);

    return textBlocks.map((block: any) => block.text).join("\n");
  }

  /**
   * Truncate large objects for logging
   */
  private truncateForLog(obj: any, maxLength: number = 200): string {
    const str = JSON.stringify(obj);
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  }

  /**
   * Structured logging for tool execution
   * Provides consistent, detailed logging across all agents
   */
  private logToolExecution(log: {
    phase: "start" | "success" | "error" | "blocked";
    toolId: string;
    toolUseId: string;
    inputPreview?: string;
    duration?: number;
    resultPreview?: string;
    resultSize?: number;
    error?: string;
    errorType?: string;
    blockReason?: string;
  }): void {
    const baseLog = {
      toolId: log.toolId,
      toolUseId: log.toolUseId,
      timestamp: new Date().toISOString(),
    };

    switch (log.phase) {
      case "start":
        logger.info(`⚙️ [TOOL_START] ${log.toolId}`, {
          ...baseLog,
          inputPreview: log.inputPreview,
        });
        break;

      case "success":
        logger.info(`✅ [TOOL_SUCCESS] ${log.toolId}`, {
          ...baseLog,
          duration: `${log.duration}ms`,
          resultPreview: log.resultPreview,
          resultSize: `${log.resultSize} bytes`,
        });
        break;

      case "error":
        logger.error(`❌ [TOOL_ERROR] ${log.toolId}`, {
          ...baseLog,
          error: log.error,
          errorType: log.errorType,
        });
        break;

      case "blocked":
        logger.warn(`⛔ [TOOL_BLOCKED] ${log.toolId}`, {
          ...baseLog,
          blockReason: log.blockReason,
        });
        break;
    }
  }

  /**
   * Get conversation history (for debugging)
   */
  getConversationHistory(): AgentMessage[] {
    return this.conversationHistory;
  }
}
