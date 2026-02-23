/**
 * Conversation Agent Helper Functions
 *
 * Shared utilities for the streaming conversation agent:
 * - Tool config construction for Bedrock
 * - Tool input parsing from streaming fragments
 * - Tool result formatting for conversation history
 */

import type { Tool } from "../core/types";
import type { ConversationAgentContext } from "./types";

/**
 * Convert tool definitions to Bedrock toolConfig format
 *
 * Pattern: Reuses the same approach as base Agent's invokeModel method
 * Maps Tool<ConversationAgentContext>[] to Bedrock's toolSpec format
 */
export function buildToolConfig(
  tools: Tool<ConversationAgentContext>[],
): any[] {
  return tools.map((tool) => ({
    toolSpec: {
      name: tool.id,
      description: tool.description,
      inputSchema: { json: tool.inputSchema },
    },
  }));
}

/**
 * Assemble complete JSON tool input from streaming fragments
 *
 * Bedrock streams tool inputs as JSON fragments via contentBlockDelta.delta.toolUse.input
 * This function concatenates the fragments and parses the complete JSON
 *
 * @param fragments - Array of JSON string fragments in order received
 * @returns Parsed tool input object
 */
export function parseToolInput(fragments: string[]): any {
  const completeJson = fragments.join("");

  try {
    return JSON.parse(completeJson);
  } catch (error) {
    console.error("Failed to parse tool input from fragments:", error);
    console.error("Complete JSON string:", completeJson);
    throw new Error(
      `Tool input JSON parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Build Bedrock toolResult content block for conversation history
 *
 * Pattern: Matches the format used by base Agent class in handleToolUse
 * Bedrock expects: { toolResult: { toolUseId, content: [{ json: result }], status } }
 *
 * @param toolUseId - The unique ID from the tool_use block
 * @param result - The tool execution result (any serializable object)
 * @param status - "success" or "error"
 * @returns Bedrock-format toolResult block
 */
export function formatToolResult(
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

/**
 * Build complete "user" message containing all tool results
 *
 * After the model uses tools, we append a "user" message to conversation history
 * containing the results. This message has role="user" and content=[toolResult blocks]
 *
 * Pattern: Same as base Agent's handleToolUse method (lines 165-175 of core/agent.ts)
 *
 * @param toolResults - Array of formatted toolResult blocks
 * @returns Bedrock-format message with role="user" and toolResult content
 */
export function buildUserToolResultMessage(toolResults: any[]): any {
  return {
    role: "user",
    content: toolResults,
  };
}
