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
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
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

const MAX_TOKENS = 32768;
const TEMPERATURE = 0.7;

export class Agent<TContext extends AgentContext = AgentContext> {
  private client: BedrockRuntimeClient;
  protected config: AgentConfig<TContext>; // Protected so subclasses can access
  private conversationHistory: AgentMessage[] = [];

  constructor(config: AgentConfig<TContext>) {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-west-2",
    });
    this.config = {
      modelId: MODEL_IDS.CLAUDE_SONNET_4_FULL,
      ...config,
    };
  }

  /**
   * Main conversation entry point
   * Runs the tool execution loop until Claude provides a final response
   */
  async converse(userMessage: string, imageS3Keys?: string[]): Promise<string> {
    console.info("🤖 Agent conversation started", {
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
      console.info(`🔄 Agent iteration ${iterationCount}`);

      const response = await this.invokeModel();

      if (response.stopReason === "tool_use") {
        console.info("🔧 Claude decided to use tools");
        await this.handleToolUse(response);
        continue; // Let Claude reflect on tool results
      }

      if (response.stopReason === "end_turn") {
        console.info("✅ Claude provided final response");
        finalResponse = this.extractTextFromResponse(response);

        // Add final assistant message to history
        this.conversationHistory.push({
          role: "assistant",
          content: response.output.message.content,
        });

        shouldContinue = false;
      }

      if (response.stopReason === "max_tokens") {
        console.warn("⚠️ Response hit max tokens limit");
        finalResponse =
          this.extractTextFromResponse(response) ||
          "Response exceeded token limit.";
        shouldContinue = false;
      }
    }

    if (iterationCount >= MAX_ITERATIONS) {
      console.warn(`⚠️ Agent hit max iterations (${MAX_ITERATIONS})`);
      finalResponse = finalResponse || "Agent exceeded maximum iterations.";
    }

    console.info("🏁 Agent conversation completed", {
      iterations: iterationCount,
      responseLength: finalResponse.length,
    });

    return finalResponse;
  }

  /**
   * Invoke Bedrock model with current conversation history and tools
   */
  private async invokeModel(): Promise<BedrockResponse> {
    const command = new ConverseCommand({
      modelId: this.config.modelId,
      messages: this.conversationHistory,
      system: [{ text: this.config.systemPrompt }],
      toolConfig: this.getToolConfig(),
      inferenceConfig: {
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      },
    });

    const startTime = Date.now();
    const response = await this.client.send(command);
    const duration = Date.now() - startTime;

    console.info("📊 Bedrock response received", {
      stopReason: response.stopReason,
      duration: `${duration}ms`,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
    });

    return response as BedrockResponse;
  }

  /**
   * Handle tool use by executing tools and adding results to conversation
   */
  private async handleToolUse(response: BedrockResponse): Promise<void> {
    // Extract tool uses from response
    const contentBlocks = response.output?.message?.content || [];
    const toolUses = contentBlocks.filter(
      (block: any): block is ToolUseBlock => block.toolUse,
    );

    console.info(`🔧 Executing ${toolUses.length} tool(s)`);

    // First, add Claude's assistant message with tool uses to history
    this.conversationHistory.push({
      role: "assistant",
      content: contentBlocks,
    });

    // Execute each tool and collect results
    const toolResults: any[] = [];

    for (const block of toolUses) {
      const toolUse = block.toolUse;
      const tool = this.config.tools.find((t) => t.id === toolUse.name);

      if (!tool) {
        console.warn(`⚠️ Tool not found: ${toolUse.name}`);
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

      console.info(`⚙️ Executing tool: ${tool.id}`, {
        input: this.truncateForLog(toolUse.input),
      });

      try {
        const startTime = Date.now();

        // THIS IS WHERE YOUR CODE ACTUALLY EXECUTES THE TOOL
        const result = await tool.execute(toolUse.input, this.config.context);

        const duration = Date.now() - startTime;
        console.info(`✅ Tool ${tool.id} completed in ${duration}ms`, {
          resultPreview: this.truncateForLog(result),
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
        console.error(`❌ Tool ${tool.id} failed:`, error);

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

    console.info("📥 Tool results added to conversation history");
  }

  /**
   * Build tool config for Bedrock
   */
  private getToolConfig(): { tools: any[] } | undefined {
    if (!this.config.tools?.length) {
      return undefined;
    }

    return {
      tools: this.config.tools.map((t) => ({
        toolSpec: {
          name: t.id,
          description: t.description,
          inputSchema: { json: t.inputSchema },
        },
      })),
    };
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
    console.info("🖼️ Building multimodal content for agent conversation:", {
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
   * Get conversation history (for debugging)
   */
  getConversationHistory(): AgentMessage[] {
    return this.conversationHistory;
  }
}
