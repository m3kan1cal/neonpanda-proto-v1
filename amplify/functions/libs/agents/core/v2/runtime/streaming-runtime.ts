/**
 * StreamingRuntime — wraps `callBedrockApiStreamForAgent`, translating
 * Bedrock's incremental events into the v2 `TurnStreamEvent` union and
 * returning the assembled `ModelTurn` once Bedrock signals `message_complete`.
 *
 * The runtime is split into two surfaces:
 *   - `invokeTurn(input)`     — sync-runtime parity (drains the stream and
 *                                returns the final ModelTurn). Used when
 *                                callers don't care about deltas.
 *   - `invokeTurnStream(input)` — yields incremental events; returns the
 *                                final ModelTurn.
 *
 * Phase 2 — see plan §1, §2.5.
 */

import type { AgentContext } from "../../types";
import {
  callBedrockApiStreamForAgent,
  type BedrockToolConfig,
  MODEL_IDS,
} from "../../../../api-helpers";
import type { InvokeTurnInput, ModelTurn } from "./runtime";

export type TurnStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; toolUseId: string; toolName: string }
  | { type: "tool_use_input_delta"; toolUseId: string; fragment: string }
  | { type: "tool_use_stop"; toolUseId: string };

export interface StreamingRuntimeAdapter<TContext extends AgentContext> {
  invokeTurn(input: InvokeTurnInput<TContext>): Promise<ModelTurn>;
  invokeTurnStream(
    input: InvokeTurnInput<TContext>,
  ): AsyncGenerator<TurnStreamEvent, ModelTurn, void>;
}

export class StreamingRuntime<TContext extends AgentContext>
  implements StreamingRuntimeAdapter<TContext>
{
  async invokeTurn(input: InvokeTurnInput<TContext>): Promise<ModelTurn> {
    const gen = this.invokeTurnStream(input);
    while (true) {
      const { value, done } = await gen.next();
      if (done) return value;
    }
  }

  async *invokeTurnStream(
    input: InvokeTurnInput<TContext>,
  ): AsyncGenerator<TurnStreamEvent, ModelTurn, void> {
    const toolConfigs: BedrockToolConfig[] = input.tools.map((t) => ({
      name: t.id,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    const useCaching = !!(input.staticPrompt && input.dynamicPrompt);
    const systemPrompt =
      input.systemPrompt ?? input.staticPrompt ?? input.dynamicPrompt ?? "";

    const options: Record<string, unknown> = { ...(input.options ?? {}) };
    if (useCaching) {
      options.staticPrompt = input.staticPrompt;
      options.dynamicPrompt = input.dynamicPrompt;
    }

    const stream = callBedrockApiStreamForAgent(
      systemPrompt,
      input.history,
      toolConfigs,
      input.modelId || MODEL_IDS.PLANNER_MODEL_FULL,
      options as any,
    );

    let messageComplete: {
      stopReason: ModelTurn["stopReason"];
      assistantContent: any[];
      usage: ModelTurn["usage"];
    } | null = null;

    for await (const ev of stream) {
      switch (ev.type) {
        case "text_delta":
          yield { type: "text_delta", text: ev.text };
          break;
        case "tool_use_start":
          yield {
            type: "tool_use_start",
            toolUseId: ev.toolUseId,
            toolName: ev.toolName,
          };
          break;
        case "tool_use_delta":
          yield {
            type: "tool_use_input_delta",
            toolUseId: ev.toolUseId,
            fragment: ev.inputFragment,
          };
          break;
        case "tool_use_stop":
          yield { type: "tool_use_stop", toolUseId: ev.toolUseId };
          break;
        case "message_complete":
          messageComplete = {
            stopReason: ev.stopReason as ModelTurn["stopReason"],
            assistantContent: ev.assistantContent,
            usage: {
              inputTokens: ev.usage.inputTokens,
              outputTokens: ev.usage.outputTokens,
              cacheReadInputTokens: (ev.usage as any).cacheReadInputTokens,
            },
          };
          break;
      }
    }

    if (!messageComplete) {
      throw new Error(
        "StreamingRuntime: Bedrock stream ended without a message_complete event",
      );
    }
    return {
      stopReason: messageComplete.stopReason,
      assistantContent: messageComplete.assistantContent,
      usage: messageComplete.usage,
      modelId: input.modelId,
    };
  }
}
