/**
 * Generic Streaming Agent
 *
 * Role-agnostic streaming AI agent that runs a ReAct loop
 * (Reason → Tool Use → Observe → Repeat) with real-time text streaming.
 *
 * Usage: instantiate with a role-specific TContext, tool set, and prompts.
 * The class has no knowledge of any specific role — all role-specific logic
 * lives in the tools, prompts, and context objects passed to the constructor.
 *
 * Roles using this class:
 *   - Coach Conversation  → StreamingConversationAgent (conversation/agent.ts)
 *   - Coach Creator       → StreamingConversationAgent<CoachCreatorSessionAgentContext>
 *   - Program Designer    → StreamingConversationAgent<ProgramDesignerSessionAgentContext> (future)
 */

import { callBedrockApiStreamForAgent } from "../../api-helpers";
import {
  formatChunkEvent,
  formatContextualEvent,
} from "../../streaming/formatters";
import { buildMultimodalContent } from "../../streaming/multimodal-helpers";
import type {
  Tool,
  BaseStreamingAgentContext,
  ConversationAgentResult,
} from "./types";

const MAX_ITERATIONS = 15; // Safety limit for ReAct loop

// ---------------------------------------------------------------------------
// Inline helpers (copied from conversation/helpers.ts to avoid core → role
// dependency; these are trivially small pure utilities)
// ---------------------------------------------------------------------------

function formatToolResult(
  toolUseId: string,
  result: any,
  status: "success" | "error" = "success",
): any {
  return {
    toolResult: {
      toolUseId,
      content: [{ json: result }],
      status,
    },
  };
}

function buildUserToolResultMessage(toolResults: any[]): any {
  return {
    role: "user",
    content: toolResults,
  };
}

/**
 * Generic Streaming Conversation Agent
 *
 * Yields SSE-formatted events (chunk, contextual) that can be piped directly
 * to the Lambda response stream. Returns a ConversationAgentResult when the
 * generator is fully consumed.
 *
 * @template TContext - Role-specific context that extends BaseStreamingAgentContext.
 *   Tools typed with TContext will receive the full role context at execution time.
 */
export class StreamingConversationAgent<
  TContext extends BaseStreamingAgentContext,
> {
  private config: {
    staticPrompt: string;
    dynamicPrompt: string;
    tools: Tool<TContext>[];
    modelId: string;
    context: TContext;
  };
  private conversationHistory: any[];
  private toolsUsed: string[] = [];
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private _fullResponseText = "";

  /**
   * @param config.staticPrompt      - Large, cacheable portion of system prompt
   * @param config.dynamicPrompt     - Small, per-request portion of system prompt
   * @param config.tools             - Tools available for this role
   * @param config.modelId           - Bedrock model ID (Haiku 4.5 or Sonnet 4.5)
   * @param config.context           - Shared context passed to all tool execute() calls
   * @param config.existingMessages  - Pre-built Bedrock-format messages (with cache points)
   */
  constructor(config: {
    staticPrompt: string;
    dynamicPrompt: string;
    tools: Tool<TContext>[];
    modelId: string;
    context: TContext;
    existingMessages: any[];
  }) {
    this.config = {
      staticPrompt: config.staticPrompt,
      dynamicPrompt: config.dynamicPrompt,
      tools: config.tools,
      modelId: config.modelId,
      context: config.context,
    };

    this.conversationHistory = [...config.existingMessages];

    console.info("🤖 StreamingConversationAgent initialized:", {
      userId: config.context.userId,
      modelId: config.modelId,
      toolCount: config.tools.length,
      existingMessageCount: config.existingMessages.length,
    });
  }

  /**
   * Main entry point — Streaming ReAct loop.
   *
   * Yields SSE-formatted string events:
   *   - formatChunkEvent(text)        for text deltas (streamed directly to user)
   *   - formatContextualEvent(msg)    for tool execution UX feedback (ephemeral)
   *
   * Returns ConversationAgentResult with aggregated stats after generator exhaustion.
   */
  async *converseStream(
    userMessage: string,
    imageS3Keys?: string[],
  ): AsyncGenerator<string, ConversationAgentResult, unknown> {
    console.info("🤖 StreamingConversationAgent.converseStream started:", {
      messageLength: userMessage.length,
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
      imageCount: imageS3Keys?.length || 0,
    });

    // Step 1: Build user content (text or multimodal)
    let userContent: any;

    if (imageS3Keys && imageS3Keys.length > 0) {
      const tempMessage = {
        role: "user" as const,
        content: userMessage,
        messageType: "text_with_images" as const,
        imageS3Keys,
      };
      const multimodalMessages = await buildMultimodalContent([tempMessage]);
      userContent = multimodalMessages[0].content;
    } else {
      userContent = [{ text: userMessage }];
    }

    // Step 2: Append user message to conversation history
    this.conversationHistory.push({
      role: "user",
      content: userContent,
    });

    // Step 3: ReAct loop
    let shouldContinue = true;
    let iterationCount = 0;
    let fullResponseText = "";
    this._fullResponseText = "";

    const iterationMessages = [
      "Processing your request...",
      "Working on that...",
      "Putting it together...",
      "Almost there...",
      "Pulling it all together...",
    ];

    while (shouldContinue && iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      console.info(`🔄 Streaming agent iteration ${iterationCount}`);

      // Bridge gap between tool execution and next AI text response
      if (iterationCount > 1) {
        const message =
          iterationMessages[
            Math.floor(Math.random() * iterationMessages.length)
          ];
        yield formatContextualEvent(message);
      }

      // Accumulate tool use blocks from the stream
      const toolUseBlocks: Array<{
        toolUseId: string;
        toolName: string;
        toolInput: any;
      }> = [];
      let currentToolUseId: string | null = null;
      let currentToolName: string | null = null;
      const toolInputFragments: Map<string, string[]> = new Map();

      let assistantContent: any[] = [];
      let stopReason = "";
      let iterationUsage = { inputTokens: 0, outputTokens: 0 };

      // Call Bedrock with streaming + tool support
      const streamEvents = callBedrockApiStreamForAgent(
        this.config.staticPrompt + "\n\n" + this.config.dynamicPrompt,
        this.conversationHistory,
        this.config.tools.map((t) => ({
          name: t.id,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
        this.config.modelId,
        {
          staticPrompt: this.config.staticPrompt,
          dynamicPrompt: this.config.dynamicPrompt,
        },
      );

      let needsSeparator = iterationCount > 1 && fullResponseText.length > 0;

      for await (const event of streamEvents) {
        if (event.type === "text_delta") {
          if (needsSeparator) {
            fullResponseText += "\n\n";
            this._fullResponseText += "\n\n";
            yield formatChunkEvent("\n\n");
            needsSeparator = false;
          }
          fullResponseText += event.text;
          this._fullResponseText += event.text;
          yield formatChunkEvent(event.text);
        } else if (event.type === "tool_use_start") {
          currentToolUseId = event.toolUseId;
          currentToolName = event.toolName;
          toolInputFragments.set(event.toolUseId, []);
          console.info(
            `🔧 Tool use started: ${event.toolName} (${event.toolUseId})`,
          );
        } else if (event.type === "tool_use_delta") {
          const fragments = toolInputFragments.get(event.toolUseId) || [];
          fragments.push(event.inputFragment);
          toolInputFragments.set(event.toolUseId, fragments);
        } else if (event.type === "tool_use_stop") {
          const fragments = toolInputFragments.get(event.toolUseId) || [];
          const completeInput = fragments.join("");

          if (!completeInput.trim()) {
            const toolName =
              currentToolUseId === event.toolUseId
                ? currentToolName
                : "unknown";
            console.info(
              `Tool ${toolName} called with empty input (using defaults)`,
            );
            toolUseBlocks.push({
              toolUseId: event.toolUseId,
              toolName: toolName || "unknown",
              toolInput: {},
            });
          } else {
            try {
              const parsedInput = JSON.parse(completeInput);
              const toolName =
                currentToolUseId === event.toolUseId
                  ? currentToolName
                  : "unknown";
              toolUseBlocks.push({
                toolUseId: event.toolUseId,
                toolName: toolName || "unknown",
                toolInput: parsedInput,
              });
              console.info(
                `✅ Tool use complete: ${toolName} (${event.toolUseId})`,
              );
            } catch (parseError) {
              console.error("Failed to parse tool input:", parseError);
              console.error("Raw input:", completeInput);
              const toolName =
                currentToolUseId === event.toolUseId
                  ? currentToolName
                  : "unknown";
              toolUseBlocks.push({
                toolUseId: event.toolUseId,
                toolName: toolName || "unknown",
                toolInput: { __parseError: true, rawInput: completeInput },
              });
            }
          }
        } else if (event.type === "message_complete") {
          assistantContent = event.assistantContent;
          stopReason = event.stopReason;
          iterationUsage = event.usage;

          this.totalInputTokens += iterationUsage.inputTokens;
          this.totalOutputTokens += iterationUsage.outputTokens;

          console.info(`📊 Iteration ${iterationCount} complete:`, {
            stopReason,
            textLength: fullResponseText.length,
            toolsUsed: toolUseBlocks.length,
            inputTokens: iterationUsage.inputTokens,
            outputTokens: iterationUsage.outputTokens,
          });
        }
      }

      // Append assistant message to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: assistantContent,
      });

      if (stopReason === "end_turn") {
        console.info("✅ Model provided final response (end_turn)");
        shouldContinue = false;
        break;
      }

      if (stopReason === "tool_use") {
        console.info(`🔧 Model wants to use ${toolUseBlocks.length} tool(s)`);

        if (toolUseBlocks.length === 0) {
          console.error(
            "❌ Stop reason is 'tool_use' but no tool blocks were collected. Stopping to avoid empty content error.",
          );
          shouldContinue = false;
          break;
        }

        const toolResults: any[] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.toolInput?.__parseError) {
            console.error(`❌ Tool input parse error for ${toolUse.toolName}`);
            toolResults.push(
              formatToolResult(
                toolUse.toolUseId,
                {
                  error: "Tool input was malformed or empty. Please try again.",
                },
                "error",
              ),
            );
            continue;
          }

          const tool = this.config.tools.find((t) => t.id === toolUse.toolName);

          if (!tool) {
            console.error(`❌ Tool not found: ${toolUse.toolName}`);
            toolResults.push(
              formatToolResult(
                toolUse.toolUseId,
                {
                  error: `Tool ${toolUse.toolName} not found`,
                },
                "error",
              ),
            );
            continue;
          }

          // Yield contextual message for UX feedback during tool execution
          const toolWithContext = tool as any;
          if (toolWithContext.contextualMessage) {
            const message = Array.isArray(toolWithContext.contextualMessage)
              ? toolWithContext.contextualMessage[
                  Math.floor(
                    Math.random() * toolWithContext.contextualMessage.length,
                  )
                ]
              : toolWithContext.contextualMessage;
            yield formatContextualEvent(message);
          }

          const toolStartTime = Date.now();

          try {
            const result = await tool.execute(
              toolUse.toolInput,
              this.config.context,
            );
            const toolTime = Date.now() - toolStartTime;
            console.info(`✅ Tool executed: ${tool.id} (${toolTime}ms)`);
            toolResults.push(
              formatToolResult(toolUse.toolUseId, result, "success"),
            );
            this.toolsUsed.push(tool.id);
          } catch (toolError) {
            const toolTime = Date.now() - toolStartTime;
            console.error(
              `❌ Tool execution failed: ${tool.id} (${toolTime}ms)`,
              toolError,
            );
            toolResults.push(
              formatToolResult(
                toolUse.toolUseId,
                {
                  error:
                    toolError instanceof Error
                      ? toolError.message
                      : "Tool execution failed",
                },
                "error",
              ),
            );
          }
        }

        if (toolResults.length > 0) {
          this.conversationHistory.push(
            buildUserToolResultMessage(toolResults),
          );
        } else {
          console.error(
            "❌ No tool results to append. Stopping to avoid empty content error.",
          );
          shouldContinue = false;
          break;
        }

        continue;
      }

      if (stopReason === "max_tokens") {
        console.warn("⚠️ Response hit max tokens limit");
        shouldContinue = false;
      } else if (stopReason === "content_filtered") {
        console.warn("⚠️ Response was content filtered");
        shouldContinue = false;
      } else if (stopReason === "stop_sequence") {
        console.info("🛑 Response stopped at stop sequence");
        shouldContinue = false;
      }
    }

    if (iterationCount >= MAX_ITERATIONS) {
      console.warn(`⚠️ Agent hit max iterations (${MAX_ITERATIONS})`);
    }

    console.info("🏁 StreamingConversationAgent completed:", {
      iterationCount,
      toolsUsed: this.toolsUsed,
      responseLength: fullResponseText.length,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
    });

    return {
      fullResponseText,
      toolsUsed: this.toolsUsed,
      modelId: this.config.modelId,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      iterationCount,
    };
  }

  /**
   * Returns the full accumulated response text streamed so far.
   * Useful when a GuardrailInterventionError interrupts converseStream early —
   * the handler can recover the partial/full text to persist alongside the warning.
   */
  getFullResponseText(): string {
    return this._fullResponseText;
  }
}
