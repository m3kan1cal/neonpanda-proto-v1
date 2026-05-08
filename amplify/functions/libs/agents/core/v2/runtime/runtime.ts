/**
 * RuntimeAdapter — the tiny seam between the Agent run loop and Bedrock.
 * The sync runtime wraps `callBedrockApiForAgent`; the streaming runtime
 * (Phase 2) wraps `callBedrockApiStreamForAgent` and yields incremental
 * SSE-shaped events while a turn is in flight.
 *
 * Phase 1 — see plan §1.
 */

import type { AgentMessage } from "../../types";
import type { Tool } from "../tools/tool-types";
import type { AgentContext } from "../../types";

export interface ModelTurnUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
}

export interface ModelTurn {
  stopReason:
    | "tool_use"
    | "end_turn"
    | "max_tokens"
    | "stop_sequence"
    | "content_filtered"
    | "guardrail_intervened";
  /** Raw assistant content blocks, in Bedrock Converse format. Pushed to
   *  history verbatim so subsequent turns see the same shape Bedrock
   *  produced. */
  assistantContent: any[];
  usage: ModelTurnUsage;
  modelId: string;
}

export interface InvokeTurnInput<TContext extends AgentContext> {
  history: AgentMessage[];
  staticPrompt?: string;
  dynamicPrompt?: string;
  systemPrompt?: string;
  tools: Tool<TContext>[];
  modelId: string;
  /** Optional per-turn flags (e.g. extended-thinking on Sonnet). Forwarded
   *  to `callBedrockApiForAgent` `options`. */
  options?: Record<string, unknown>;
}

export interface RuntimeAdapter<TContext extends AgentContext> {
  invokeTurn(input: InvokeTurnInput<TContext>): Promise<ModelTurn>;
}
