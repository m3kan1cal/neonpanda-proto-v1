/**
 * Streaming Conversation Agent
 *
 * Streaming AI agent that replaces the procedural Smart Router pipeline.
 * Uses a ReAct loop (Reason → Tool Use → Observe → Repeat) with real-time
 * text streaming to the user.
 *
 * Key differences from base Agent class:
 * - Returns AsyncGenerator<string> yielding SSE events instead of Promise<string>
 * - Uses callBedrockApiStreamForAgent (streaming) instead of callBedrockApiForAgent (batch)
 * - Seeds conversation history with existing messages (not starting fresh)
 * - Yields formatChunkEvent for text deltas and formatContextualEvent for tool execution
 *
 * Pattern: Standalone class following the same Tool<TContext> interface pattern
 * as WorkoutLoggerAgent, ProgramDesignerAgent, and CoachCreatorAgent.
 */

import { callBedrockApiStreamForAgent } from "../../api-helpers";
import {
  formatChunkEvent,
  formatContextualEvent,
} from "../../streaming/formatters";
import { buildMultimodalContent } from "../../streaming/multimodal-helpers";
import type { Tool } from "../core/types";
import type {
  ConversationAgentContext,
  StreamAgentEvent,
  ConversationAgentResult,
} from "./types";
import { formatToolResult, buildUserToolResultMessage } from "./helpers";

const MAX_ITERATIONS = 15; // Safety limit for ReAct loop

/**
 * Streaming Conversation Agent
 *
 * Implements streaming ReAct loop with tool execution for coach conversations.
 * Yields SSE-formatted events that can be piped directly to the Lambda response stream.
 */
export class StreamingConversationAgent {
  private config: {
    staticPrompt: string;
    dynamicPrompt: string;
    tools: Tool<ConversationAgentContext>[];
    modelId: string;
    context: ConversationAgentContext;
  };
  private conversationHistory: any[]; // Bedrock-format messages
  private toolsUsed: string[] = [];
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  /**
   * @param config.staticPrompt - Large, cacheable portion of system prompt
   * @param config.dynamicPrompt - Small, per-request portion of system prompt
   * @param config.tools - All available tools for the agent
   * @param config.modelId - Bedrock model ID (Haiku 4.5 or Sonnet 4.5)
   * @param config.context - Shared context passed to all tools
   * @param config.existingMessages - Pre-built Bedrock-format messages from buildMessagesWithHistoryCaching()
   */
  constructor(config: {
    staticPrompt: string;
    dynamicPrompt: string;
    tools: Tool<ConversationAgentContext>[];
    modelId: string;
    context: ConversationAgentContext;
    existingMessages: any[];
  }) {
    this.config = {
      staticPrompt: config.staticPrompt,
      dynamicPrompt: config.dynamicPrompt,
      tools: config.tools,
      modelId: config.modelId,
      context: config.context,
    };

    // Seed conversation history with existing messages (with caching boundaries)
    this.conversationHistory = [...config.existingMessages];

    console.info("🤖 StreamingConversationAgent initialized:", {
      userId: config.context.userId,
      coachId: config.context.coachId,
      conversationId: config.context.conversationId,
      modelId: config.modelId,
      toolCount: config.tools.length,
      existingMessageCount: config.existingMessages.length,
      hasActiveProgram: !!config.context.activeProgram,
    });
  }

  /**
   * Main entry point — Streaming ReAct loop
   *
   * Yields SSE-formatted events:
   * - formatChunkEvent(text) for text deltas
   * - formatContextualEvent(message) for tool execution updates
   *
   * Returns ConversationAgentResult with aggregated stats
   *
   * Algorithm per plan section 3.3:
   * 1. Build user content (text + optional images)
   * 2. Append user message to conversationHistory
   * 3. Loop (max MAX_ITERATIONS):
   *    a. Call callBedrockApiStreamForAgent(systemPrompt, conversationHistory, tools)
   *    b. Consume stream:
   *       - text_delta: yield formatChunkEvent immediately
   *       - tool_use_start/delta/stop: accumulate silently
   *       - message_complete: append to history, check stopReason
   *         - If end_turn: break and return
   *         - If tool_use: execute tools, append results, continue
   * 4. Return ConversationAgentResult
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

    // Step 1: Build user content (handle multimodal)
    let userContent: any;

    if (imageS3Keys && imageS3Keys.length > 0) {
      // Build multimodal content (text + images)
      const tempMessage = {
        role: "user" as const,
        content: userMessage,
        messageType: "text_with_images" as const,
        imageS3Keys,
      };
      const multimodalMessages = await buildMultimodalContent([tempMessage]);
      userContent = multimodalMessages[0].content;
    } else {
      // Text only
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

    // Define variety for iteration bridging messages
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

      // Yield contextual event for iterations after the first (bridges gap between tool execution and next AI response)
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

      // Track the complete assistant content and usage
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
          // strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
        },
      );

      // Track if we need to insert a paragraph separator before the next text
      // (happens when text flows across iterations after tool execution)
      let needsSeparator = iterationCount > 1 && fullResponseText.length > 0;

      // Consume the stream
      for await (const event of streamEvents) {
        if (event.type === "text_delta") {
          // Insert paragraph separator if this is the first text in a new iteration
          if (needsSeparator) {
            fullResponseText += "\n\n";
            yield formatChunkEvent("\n\n");
            needsSeparator = false;
          }
          // Yield text chunk immediately to user
          fullResponseText += event.text;
          yield formatChunkEvent(event.text);
        } else if (event.type === "tool_use_start") {
          // Tool use starting — track it silently
          currentToolUseId = event.toolUseId;
          currentToolName = event.toolName;
          toolInputFragments.set(event.toolUseId, []);

          console.info(
            `🔧 Tool use started: ${event.toolName} (${event.toolUseId})`,
          );
        } else if (event.type === "tool_use_delta") {
          // Accumulate tool input fragments
          const fragments = toolInputFragments.get(event.toolUseId) || [];
          fragments.push(event.inputFragment);
          toolInputFragments.set(event.toolUseId, fragments);
        } else if (event.type === "tool_use_stop") {
          // Tool use complete — parse the full input
          const fragments = toolInputFragments.get(event.toolUseId) || [];
          const completeInput = fragments.join("");

          if (!completeInput.trim()) {
            // Empty input is expected for tools with no required params (e.g., get_todays_workout)
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
          } else
            try {
              const parsedInput = JSON.parse(completeInput);

              // Find the tool name for this toolUseId
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
              // Still add the tool so we return a toolResult for it
              // This ensures Bedrock gets a response for every toolUse in the assistant message
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
        } else if (event.type === "message_complete") {
          // Stream complete — capture metadata
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

      // Check stop reason and decide whether to continue
      if (stopReason === "end_turn") {
        console.info("✅ Model provided final response (end_turn)");
        shouldContinue = false;
        break;
      }

      if (stopReason === "tool_use") {
        console.info(`🔧 Model wants to use ${toolUseBlocks.length} tool(s)`);

        // Defensive check: If no tools were collected but stop reason is tool_use,
        // this indicates a streaming parse error. Log and stop to avoid empty content error.
        if (toolUseBlocks.length === 0) {
          console.error(
            "❌ Stop reason is 'tool_use' but no tool blocks were collected from stream. This indicates a parse error or incomplete stream.",
          );
          console.error(
            "Tool input fragments collected:",
            Array.from(toolInputFragments.entries()).map(([id, frags]) => ({
              toolUseId: id,
              fragmentCount: frags.length,
              totalLength: frags.join("").length,
            })),
          );
          shouldContinue = false;
          break;
        }

        // Execute tools sequentially
        const toolResults: any[] = [];

        for (const toolUse of toolUseBlocks) {
          // Handle tools with unparseable input
          if (toolUse.toolInput?.__parseError) {
            console.error(
              `❌ Tool input parse error for ${toolUse.toolName} (${toolUse.toolUseId})`,
            );
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
                { error: `Tool ${toolUse.toolName} not found` },
                "error",
              ),
            );
            continue;
          }

          // Optional: Yield contextual update for tool execution
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

          // Execute the tool
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

        // Only append tool results if we have any (defensive check)
        if (toolResults.length > 0) {
          this.conversationHistory.push(
            buildUserToolResultMessage(toolResults),
          );
        } else {
          console.error(
            "❌ No tool results to append despite executing tool_use block. Stopping to avoid empty content error.",
          );
          shouldContinue = false;
          break;
        }

        // Continue loop — model will process tool results in next iteration
        continue;
      }

      // Other stop reasons (max_tokens, content_filtered, stop_sequence)
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

    // Check if we hit max iterations
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

    // Step 4: Return aggregated result
    return {
      fullResponseText,
      toolsUsed: this.toolsUsed,
      modelId: this.config.modelId,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      iterationCount,
    };
  }
}
