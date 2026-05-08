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
 * Minimum context required by the StreamingConversationAgent and all shared tools.
 * Extend this for role-specific contexts (ConversationAgentContext,
 * CoachCreatorSessionAgentContext, etc.)
 */
export interface BaseStreamingAgentContext extends AgentContext {
  userId: string;
  userTimezone: string;
  /**
   * Optional flags for richer streaming contextual UX (SSE). Set by stream handlers.
   */
  contextualFlags?: {
    historyHasUserImages: boolean;
    historyHasUserDocuments: boolean;
    contextualUserRole: "coach" | "program_designer" | "coach_creator";
    coachConfig?: any;
    coachName?: string;
    coachPersonality?: string;
  };
}

/**
 * Streaming events yielded by callBedrockApiStreamForAgent.
 * Re-exported here so role-specific agent files can import from the core module.
 */
export type StreamAgentEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; toolUseId: string; toolName: string }
  | { type: "tool_use_delta"; toolUseId: string; inputFragment: string }
  | { type: "tool_use_stop"; toolUseId: string }
  | {
      type: "message_complete";
      stopReason: string;
      assistantContent: any[];
      usage: { inputTokens: number; outputTokens: number };
    };

/**
 * Single tool call observed during one converseStream invocation. Captured by
 * the streaming agent so the handler can persist a richer per-call record on
 * the assistant message metadata (`metadata.agent.toolCalls`) and the UI can
 * render faint Claude-Code-style blocks in the message bubble.
 *
 * `toolInput` is omitted when the corresponding `Tool.redactInput === true`
 * (e.g. save_memory, where the content can be deeply personal).
 */
export interface ToolCallRecord {
  toolUseId: string;
  toolName: string;
  status: "complete" | "error";
  durationMs: number;
  errorMessage?: string;
  toolInput?: any;
  /**
   * Character offset into the assistant's cumulative response text at which
   * this tool call fired. Used by the UI to interleave tool-call blocks with
   * the surrounding text segments instead of stacking them after the message.
   * Optional for backward compatibility with messages persisted before this
   * field existed — renderers fall back to placing the call at end-of-text.
   */
  contentOffset?: number;
}

/**
 * Result returned by StreamingConversationAgent.converseStream()
 * after the generator is fully consumed.
 * Re-exported here so role-specific handler files can import from the core module.
 */
export interface ConversationAgentResult {
  fullResponseText: string;
  toolsUsed: string[];
  /**
   * Richer per-call tool record. Parallel to `toolsUsed` (kept for back-compat
   * with persisted message metadata), but carries the data needed to render
   * the streaming tool-call blocks in the UI even after page reload.
   */
  toolCalls: ToolCallRecord[];
  modelId: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  iterationCount: number;
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
  /**
   * When true, the tool's `toolInput` is omitted from the SSE `tool_call`
   * event and from the persisted `metadata.agent.toolCalls` record. Use for
   * tools whose input can contain user-sensitive content (e.g. save_memory).
   * The tool name and timing are still surfaced so the UI can render a block —
   * just without an expandable disclosure of the input.
   */
  redactInput?: boolean;
}

/**
 * Agent configuration
 *
 * @template TContext - The context type for this agent (extends AgentContext)
 */
export interface AgentConfig<TContext extends AgentContext = AgentContext> {
  systemPrompt: string; // Backward compatibility (or full prompt if no split)
  staticPrompt?: string; // Large unchanging portion (cached) - NEW
  dynamicPrompt?: string; // Small dynamic portion (not cached) - NEW
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
