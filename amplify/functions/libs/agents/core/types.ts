/**
 * Core Agent Types
 *
 * Generic type definitions for the agent pattern implementation.
 * Agents use tools to accomplish tasks via the Bedrock Converse API.
 *
 * These types are framework-agnostic and can be extended for specific use cases.
 */

/**
 * Base agent context - shared data available to all tools
 * Extend this interface for specific agent implementations
 */
export interface AgentContext {
  userId: string; // Required for all agents
  [key: string]: any; // Allow additional context fields
}

/**
 * Tool definition for agent execution
 * Tools are functions that agents can call to accomplish tasks
 *
 * @template TContext - The context type for this tool (extends AgentContext)
 */
export interface Tool<TContext extends AgentContext = AgentContext> {
  id: string;
  description: string; // Rich description helps Claude reason about when to use the tool
  inputSchema: any; // JSON Schema for Bedrock toolConfig
  outputSchema?: any; // Optional validation schema
  execute: (input: any, context: TContext) => Promise<any>;
}

/**
 * Agent configuration
 *
 * @template TContext - The context type for this agent (extends AgentContext)
 */
export interface AgentConfig<TContext extends AgentContext = AgentContext> {
  systemPrompt: string;
  tools: Tool<TContext>[];
  modelId?: string;
  context: TContext; // Shared context passed to all tools
}

/**
 * Agent message format (matches Bedrock Converse API)
 */
export interface AgentMessage {
  role: "user" | "assistant";
  content: any; // Can be text, multimodal content, or tool use/result
}

/**
 * Bedrock response from ConverseCommand
 */
export interface BedrockResponse {
  stopReason:
    | "tool_use"
    | "end_turn"
    | "max_tokens"
    | "stop_sequence"
    | "content_filtered";
  output: {
    message: {
      role: "assistant";
      content: any[];
    };
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Tool use block from Bedrock response
 */
export interface ToolUseBlock {
  toolUse: {
    toolUseId: string;
    name: string;
    input: any;
  };
}

/**
 * Tool result format for adding back to conversation
 */
export interface ToolResultBlock {
  toolResult: {
    toolUseId: string;
    content: Array<{ json: any }>;
    status?: "success" | "error";
  };
}
