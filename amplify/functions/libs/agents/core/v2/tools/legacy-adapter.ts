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
  /** See `Tool.getStoreLocation`. Forwarded onto the wrapped tool so the
   *  scheduler can read it across all persist paths. */
  getStoreLocation?: Tool<TContext>["getStoreLocation"];
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
    getStoreLocation: opts.getStoreLocation,
    validateInput: passthroughValidator,
    execute: async (
      input: unknown,
      ctx: ToolExecutionContext<TContext>,
    ): Promise<ToolResult<unknown>> => {
      // Inject `getToolResult(key, index?)` into the v1 context so legacy
      // tools (coach-creator, program-designer, workout-logger) that read
      // prior tool outputs continue to work unchanged. Reads from the v2
      // result store with semantic-alias resolution.
      //
      // The optional `index` argument is forwarded for positional reads —
      // workout-logger's multi-workout flow stores each extraction /
      // validation / save at a positional slot via `getStoreLocation` and
      // later reads back by `workoutIndex`. Dropping the second argument
      // here silently returns the latest entry across the board, which
      // caused two saves in a multi-workout flow to overwrite each other
      // with the second workout's data (see test fixture
      // `multi-workout-two-sessions_result.json`).
      const augmentedContext = {
        ...ctx.agentContext,
        getToolResult: <T = unknown>(
          key: string,
          index?: number,
        ): T | undefined =>
          ctx.resultStore.get<T>(key, index ?? -1),
      };
      try {
        const data = await legacy.execute(input, augmentedContext as TContext);
        // v1 tools signal failures by returning `{ error: <message> }`.
        // Check `.error` truthiness (not just key presence) so success-shape
        // objects that incidentally have `error: null` / `error: false`
        // aren't miscategorised as failures.
        const errorField =
          data && typeof data === "object"
            ? (data as Record<string, unknown>).error
            : undefined;
        if (errorField) {
          return {
            ok: false,
            code: "permanent",
            message: String(errorField),
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
