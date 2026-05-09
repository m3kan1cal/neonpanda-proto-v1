/**
 * Sync runtime — wraps `callBedrockApiForAgent`. Used by sync agents
 * (coach-creator, program-designer, workout-logger) that don't need SSE.
 *
 * Phase 1 — see plan §1.
 */

import type { AgentContext } from "../../types";
import {
  callBedrockApiForAgent,
  type BedrockToolConfig,
  MODEL_IDS,
} from "../../../../api-helpers";
import type { InvokeTurnInput, ModelTurn, RuntimeAdapter } from "./runtime";

export class SyncRuntime<TContext extends AgentContext>
  implements RuntimeAdapter<TContext>
{
  async invokeTurn(input: InvokeTurnInput<TContext>): Promise<ModelTurn> {
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

    const response = await callBedrockApiForAgent(
      systemPrompt,
      input.history,
      toolConfigs,
      input.modelId || MODEL_IDS.PLANNER_MODEL_FULL,
      options as any,
    );

    return {
      stopReason: response.stopReason,
      assistantContent: response.output?.message?.content ?? [],
      usage: {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
        cacheReadInputTokens: response.usage?.cacheReadInputTokens,
      },
      modelId: input.modelId,
    };
  }
}
