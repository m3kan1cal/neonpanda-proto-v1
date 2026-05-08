/**
 * Translates the v2 AgentEvent union into the SSE wire format used by every
 * streaming Lambda handler. Drop-in compatible with v1: `chunk` and
 * `contextual` events keep their existing shape, so a v1 frontend continues
 * to render tokens correctly. New event types (`tool_call`, `run_start`,
 * `run_complete`, `human_input_required`) are forward-compatible — older
 * frontends ignore unknown event types.
 *
 * Phase 2 — see plan §1.
 */

import {
  formatChunkEvent,
  formatContextualEvent,
  formatToolCallEvent,
} from "../../../../streaming/formatters";
import type { AgentEvent } from "../events/events";

/**
 * Convert a single AgentEvent to its SSE string form. Returns `null` for
 * event types that don't have a wire representation (e.g. `iteration_start`
 * is internal-only).
 */
export function formatAgentEventToSSE(event: AgentEvent): string | null {
  switch (event.type) {
    case "chunk":
      return formatChunkEvent(event.text);
    case "contextual":
      return formatContextualEvent(event.content, event.stage);
    case "tool_call_start":
      return formatToolCallEvent({
        toolUseId: event.record.toolUseId,
        toolName: event.record.toolName,
        status: "running",
        iteration: event.record.iteration,
        contentOffset: event.record.contentOffset,
        toolInput: event.record.toolInput,
      });
    case "tool_call_complete": {
      const r = event.record;
      return formatToolCallEvent({
        toolUseId: r.toolUseId,
        toolName: r.toolName,
        status: r.status === "complete" ? "complete" : "error",
        iteration: r.iteration,
        contentOffset: r.contentOffset,
        durationMs: r.durationMs,
        toolInput: r.toolInput,
        resultSummary: r.resultSummary,
        errorMessage: r.errorMessage,
        errorCode: r.errorCode,
      });
    }
    case "human_input_required":
      return `data: ${JSON.stringify({
        type: "human_input_required",
        prompt: event.prompt,
        resumeToken: event.resumeToken,
        suggestedReplies: event.suggestedReplies,
      })}\n\n`;
    case "run_start":
    case "iteration_start":
    case "assistant_text":
    case "run_complete":
      // Intentionally not surfaced to the SSE wire — these are run-loop
      // internals consumed by the Lambda handler around the agent stream.
      return null;
  }
}
