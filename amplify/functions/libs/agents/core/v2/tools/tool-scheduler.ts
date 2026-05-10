/**
 * Tool scheduler. Within a single Bedrock `tool_use` turn, groups consecutive
 * `parallelSafe` tools and runs each group via `Promise.all`; mixed groups
 * fall back to sequential execution. Each call gets its own `AbortController`
 * so a slow tool can't starve the rest of the iteration.
 *
 * Phase 1 — see plan §2.4.
 */

import type { AgentContext } from "../../types";
import { TimeoutError } from "../errors/agent-errors";
import { withToolCorrelation } from "../observability/correlation";
import type { RunMetrics } from "../observability/metrics";
import type {
  Tool,
  ToolExecutionContext,
  ToolResult,
} from "./tool-types";

export interface ParsedToolUse {
  toolUseId: string;
  toolName: string;
  input: unknown;
}

export interface ScheduledResult {
  toolUseId: string;
  toolName: string;
  result: ToolResult<unknown>;
  durationMs: number;
  /** Set when the model emitted a tool_use block whose input couldn't be
   *  parsed. Surfaced to the agent so it can record a `tool_input_invalid`
   *  call without a `parsedInput`. */
  parseError?: string;
}

export type BlockingDecision =
  | null
  | {
      reason: string;
      details?: unknown;
    };

export type BlockingFn<TContext extends AgentContext> = (
  toolId: string,
  toolInput: unknown,
  ctx: ToolExecutionContext<TContext>,
) => BlockingDecision | Promise<BlockingDecision>;

export type ContextBuilderFn<TContext extends AgentContext> = (
  toolUseId: string,
  signal: AbortSignal,
) => ToolExecutionContext<TContext>;

export class ToolScheduler<TContext extends AgentContext> {
  constructor(
    private readonly tools: Tool<TContext>[],
    private readonly metrics?: RunMetrics,
  ) {}

  async execute(
    uses: ParsedToolUse[],
    contextBuilder: ContextBuilderFn<TContext>,
    blockingFn?: BlockingFn<TContext>,
  ): Promise<ScheduledResult[]> {
    const groups = this.groupByParallelSafety(uses);
    const out: ScheduledResult[] = new Array(uses.length);
    for (const group of groups) {
      if (group.length > 1 && this.metrics) this.metrics.parallelToolBatches++;
      const groupResults = await Promise.all(
        group.map(({ index, use }) =>
          this.executeOne(use, contextBuilder, blockingFn).then((r) => ({
            ...r,
            index,
          })),
        ),
      );
      for (const r of groupResults) {
        const { index, ...rest } = r;
        out[index] = rest;
      }
    }
    return out;
  }

  private groupByParallelSafety(
    uses: ParsedToolUse[],
  ): Array<Array<{ index: number; use: ParsedToolUse }>> {
    const groups: Array<Array<{ index: number; use: ParsedToolUse }>> = [];
    let current: Array<{ index: number; use: ParsedToolUse }> = [];

    const isParallelSafe = (name: string) =>
      this.tools.find((t) => t.id === name)?.parallelSafe === true;

    for (let i = 0; i < uses.length; i++) {
      const useEntry = { index: i, use: uses[i] };
      const safe = isParallelSafe(uses[i].toolName);
      if (safe && current.length > 0 && current.every((c) => isParallelSafe(c.use.toolName))) {
        current.push(useEntry);
      } else {
        if (current.length > 0) groups.push(current);
        current = [useEntry];
      }
    }
    if (current.length > 0) groups.push(current);
    return groups;
  }

  private async executeOne(
    use: ParsedToolUse,
    contextBuilder: ContextBuilderFn<TContext>,
    blockingFn?: BlockingFn<TContext>,
  ): Promise<ScheduledResult> {
    const startedAt = Date.now();
    const tool = this.tools.find((t) => t.id === use.toolName);

    if (!tool) {
      return {
        toolUseId: use.toolUseId,
        toolName: use.toolName,
        result: {
          ok: false,
          code: "tool_not_found",
          message: `Tool '${use.toolName}' is not registered with this agent`,
          retryable: false,
        },
        durationMs: 0,
      };
    }

    if (use.input && typeof use.input === "object" && "__parseError" in (use.input as any)) {
      const raw = (use.input as any).rawInput;
      return {
        toolUseId: use.toolUseId,
        toolName: tool.id,
        result: {
          ok: false,
          code: "tool_input_invalid",
          message:
            "Your tool arguments were not valid JSON. Re-emit the call with arguments that match the input schema.",
          retryable: true,
          details: { rawInput: raw },
        },
        durationMs: 0,
        parseError: String((use.input as any).__parseError ?? "JSON parse failed"),
      };
    }

    const inputCheck = tool.validateInput(use.input);
    if (!inputCheck.ok) {
      return {
        toolUseId: use.toolUseId,
        toolName: tool.id,
        result: {
          ok: false,
          code: "tool_input_invalid",
          message: inputCheck.error,
          retryable: true,
        },
        durationMs: Date.now() - startedAt,
      };
    }

    const ctrl = new AbortController();
    const ctx = contextBuilder(use.toolUseId, ctrl.signal);
    const timer = setTimeout(
      () => ctrl.abort(new TimeoutError(tool.id, tool.timeoutMs)),
      tool.timeoutMs,
    );

    return withToolCorrelation(use.toolUseId, async () => {
      try {
        if (blockingFn) {
          const decision = await blockingFn(tool.id, inputCheck.value, ctx);
          if (decision) {
            const blockedResult: ToolResult<unknown> = {
              ok: false as const,
              code: "tool_blocked" as const,
              message: decision.reason,
              retryable: false,
              details: decision.details,
            };
            // Persist the block to the store so downstream tools/policies
            // can observe it. See "persist immediately" note below.
            // Honour positional storage when the tool input carries a
            // `workoutIndex` (workout-logger's multi-workout convention)
            // so a single tool block doesn't replace the keyed array
            // and wipe earlier successful slots — Bugbot finding
            // 288d112c. Tools without that field are unaffected
            // (fallback resolves to undefined → bare put → replace).
            ctx.resultStore.put(tool.id, blockedResult, {
              index: inferInputIndex(inputCheck.value),
            });
            return {
              toolUseId: use.toolUseId,
              toolName: tool.id,
              result: blockedResult,
              durationMs: Date.now() - startedAt,
            };
          }
        }

        for (const mw of tool.middleware) {
          if (mw.before) await mw.before(inputCheck.value, ctx);
        }

        const execPromise = tool.execute(inputCheck.value, ctx);
        const abortPromise = new Promise<never>((_, reject) => {
          // `{ once: true }` ensures the listener is removed after a
          // single fire (or never, when the tool completes normally) so
          // we don't retain an unsettled promise + listener until the
          // AbortController is GC'd.
          ctrl.signal.addEventListener(
            "abort",
            () => {
              reject(ctrl.signal.reason ?? new TimeoutError(tool.id, tool.timeoutMs));
            },
            { once: true },
          );
        });

        let result: ToolResult<unknown> = await Promise.race([execPromise, abortPromise]);

        if (result.ok && tool.validateOutput) {
          const out = tool.validateOutput(result.data);
          if (!out.ok) {
            result = {
              ok: false,
              code: "tool_output_invalid",
              message: out.error,
              retryable: false,
            };
          }
        }

        for (const mw of tool.middleware) {
          if (mw.after) await mw.after(inputCheck.value, result, ctx);
        }

        const durationMs = Date.now() - startedAt;
        if (this.metrics) this.metrics.recordToolLatency(tool.id, durationMs);

        // Persist immediately so subsequent tools in the same tool_use
        // turn (e.g. a save tool blocked on a validate result emitted in
        // the same turn) see this entry when their blocking callback
        // runs. v1 wrote each result right after execute(); the v2
        // contract must match for defense-in-depth correctness.
        // Tools running concurrently in a parallelSafe group all write
        // here too — the contract is that they're independent, so they
        // don't read each other's results during their blocking checks.
        if (result.ok) {
          ctx.resultStore.put(tool.id, result.data, {
            index: result.toolStoreIndex,
            uniqueKey: result.toolStoreKey,
          });
        } else {
          // Honour `toolStoreIndex` / `toolStoreKey` on the failure path
          // too. Without this, a failure in a multi-workout flow under
          // an indexed alias (workout-logger pattern) replaces the
          // entire keyed array and silently drops earlier successful
          // results — Bugbot finding 288d112c. Middleware that wants
          // positional / keyed failure storage sets these fields via
          // `(result as any).toolStoreIndex` (ToolFailure doesn't
          // declare them in its type, hence the cast).
          ctx.resultStore.put(tool.id, result, {
            index: (result as any).toolStoreIndex,
            uniqueKey: (result as any).toolStoreKey,
          });
        }

        return {
          toolUseId: use.toolUseId,
          toolName: tool.id,
          result,
          durationMs,
        };
      } catch (error: unknown) {
        for (const mw of tool.middleware) {
          if (mw.onError) {
            try {
              await mw.onError(inputCheck.value, error, ctx);
            } catch {
              /* swallow middleware errors so the original surfaces */
            }
          }
        }

        const isTimeout =
          error instanceof TimeoutError ||
          (error as any)?.name === "TimeoutError" ||
          ctrl.signal.aborted;

        const durationMs = Date.now() - startedAt;
        if (this.metrics) this.metrics.recordToolLatency(tool.id, durationMs);

        const failure: ToolResult<unknown> = {
          ok: false as const,
          code: isTimeout ? ("timeout" as const) : ("permanent" as const),
          message: (error as any)?.message ?? String(error),
          retryable: !isTimeout && tool.retryable,
          details: { errorName: (error as any)?.name },
        };
        // Persist the failure for the same reason as the success path —
        // downstream same-turn tools must observe this result via blocking.
        // Same positional-storage convention as the blocked-by-policy
        // path: workout-logger's `workoutIndex` keeps multi-workout
        // arrays intact when a single call throws. Tools without
        // `workoutIndex` fall through to a bare put (replace) — same
        // as before this fix.
        ctx.resultStore.put(tool.id, failure, {
          index: inferInputIndex(inputCheck.value),
        });

        return {
          toolUseId: use.toolUseId,
          toolName: tool.id,
          result: failure,
          durationMs,
        };
      } finally {
        clearTimeout(timer);
      }
    });
  }
}

/**
 * Generic positional-storage hint used by the bypass-middleware put
 * sites (blocked-by-policy and execute-throws-catch). Tools whose input
 * objects carry a numeric `workoutIndex` (workout-logger's multi-workout
 * convention) get the index forwarded to `ToolResultStore.put` so a
 * single block / throw doesn't replace the entire keyed array. Tools
 * that don't carry the field return undefined → bare put → existing
 * replace semantics. Documented as a convention rather than a config
 * knob to keep the framework footprint small; if a future agent needs
 * positional storage with a different field name, this becomes a
 * per-tool callback.
 */
function inferInputIndex(input: unknown): number | undefined {
  if (input && typeof input === "object") {
    const v = (input as Record<string, unknown>).workoutIndex;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}
