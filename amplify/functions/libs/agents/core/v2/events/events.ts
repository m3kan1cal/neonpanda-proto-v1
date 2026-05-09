/**
 * AgentEvent union — yielded by the agent run loop. Sync runtimes
 * iterate-and-discard; the streaming runtime maps each into an SSE frame.
 *
 * Phase 1 — see plan §1.
 */

import type { ToolCallRecord } from "../tools/tool-types";

export interface RunStartEvent {
  type: "run_start";
  runId: string;
  agentId: string;
}

export interface IterationStartEvent {
  type: "iteration_start";
  iteration: number;
}

export interface AssistantTextEvent {
  type: "assistant_text";
  text: string;
  iteration: number;
}

export interface ToolCallStartEvent {
  type: "tool_call_start";
  record: ToolCallRecord;
}

export interface ToolCallCompleteEvent {
  type: "tool_call_complete";
  record: ToolCallRecord;
}

export interface RunCompleteEvent {
  type: "run_complete";
  iterations: number;
  toolsUsed: string[];
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  status: "ok" | "max_iterations" | "stopped" | "paused" | "error";
}

export interface ChunkEvent {
  type: "chunk";
  text: string;
}

export interface ContextualEvent {
  type: "contextual";
  content: string;
  stage?: string;
}

export interface HumanInputRequiredEvent {
  type: "human_input_required";
  prompt: string;
  resumeToken: string;
  suggestedReplies?: string[];
}

export type AgentEvent =
  | RunStartEvent
  | IterationStartEvent
  | AssistantTextEvent
  | ToolCallStartEvent
  | ToolCallCompleteEvent
  | RunCompleteEvent
  | ChunkEvent
  | ContextualEvent
  | HumanInputRequiredEvent;
