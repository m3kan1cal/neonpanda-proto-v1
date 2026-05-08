/**
 * Adapt a v1 `Tool<TContext>` (from `core/types`) into a v2 `Tool<TContext>`.
 * Lets v2 host agents whose tool sets haven't been rewritten in Zod yet —
 * critical for migrating one agent at a time without rewriting 30+ tool
 * factories upfront.
 *
 * Phase 1 — see plan §2.6.
 */

import type { Tool as LegacyTool, AgentContext } from "../../types";
import type {
  Tool,
  ToolExecutionContext,
  ToolMiddleware,
  ToolResult,
  ToolValidator,
} from "./tool-types";

export interface AdaptLegacyToolOptions<TContext extends AgentContext> {
  contextualMessages?: string[];
  timeoutMs?: number;
  parallelSafe?: boolean;
  retryable?: boolean;
  redactInput?: boolean;
  middleware?: ToolMiddleware<TContext>[];
}

export function adaptLegacyTool<TContext extends AgentContext>(
  legacy: LegacyTool<TContext>,
  opts: AdaptLegacyToolOptions<TContext> = {},
): Tool<TContext> {
  const passthroughValidator: ToolValidator<unknown> = (value) => ({
    ok: true,
    value,
  });

  return {
    id: legacy.id,
    description: legacy.description,
    inputSchema: legacy.inputSchema,
    outputSchema: legacy.outputSchema,
    contextualMessages: opts.contextualMessages,
    timeoutMs: opts.timeoutMs ?? 25_000,
    parallelSafe: opts.parallelSafe ?? false,
    retryable: opts.retryable ?? true,
    redactInput: opts.redactInput ?? false,
    middleware: opts.middleware ?? [],
    validateInput: passthroughValidator,
    execute: async (
      input: unknown,
      ctx: ToolExecutionContext<TContext>,
    ): Promise<ToolResult<unknown>> => {
      try {
        const data = await legacy.execute(input, ctx.agentContext);
        if (data && typeof data === "object" && "error" in (data as any)) {
          const errMsg = String((data as any).error ?? "Tool returned error");
          return {
            ok: false,
            code: "permanent",
            message: errMsg,
            retryable: false,
            details: data,
          };
        }
        return {
          ok: true,
          data,
          conversationSummary: (data as any)?.conversationSummary,
        };
      } catch (error: any) {
        return {
          ok: false,
          code: "permanent",
          message: error?.message ?? String(error),
          retryable: false,
        };
      }
    },
  };
}
