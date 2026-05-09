import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineTool } from "./define-tool";
import { ToolResultStore } from "./tool-result-store";
import { ToolScheduler, type ParsedToolUse } from "./tool-scheduler";
import type { ToolExecutionContext } from "./tool-types";

interface Ctx {
  userId: string;
}

const ctxBuilder = (toolUseId: string, signal: AbortSignal) =>
  ({
    agentContext: { userId: "u1" },
    resultStore: new ToolResultStore(),
    toolUseId,
    signal,
    iteration: 1,
  }) satisfies ToolExecutionContext<Ctx>;

describe("ToolScheduler", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("groups consecutive parallelSafe tools and runs them concurrently", async () => {
    const order: string[] = [];
    const a = defineTool<Ctx, z.ZodObject<{}>>({
      id: "a",
      description: "...",
      parallelSafe: true,
      input: z.object({}),
      execute: async () => {
        order.push("a-start");
        await new Promise((r) => setTimeout(r, 30));
        order.push("a-end");
        return { ok: true, data: 1 };
      },
    });
    const b = defineTool<Ctx, z.ZodObject<{}>>({
      id: "b",
      description: "...",
      parallelSafe: true,
      input: z.object({}),
      execute: async () => {
        order.push("b-start");
        await new Promise((r) => setTimeout(r, 30));
        order.push("b-end");
        return { ok: true, data: 2 };
      },
    });
    const scheduler = new ToolScheduler<Ctx>([a, b]);
    const uses: ParsedToolUse[] = [
      { toolUseId: "1", toolName: "a", input: {} },
      { toolUseId: "2", toolName: "b", input: {} },
    ];
    const results = await scheduler.execute(uses, ctxBuilder);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.result.ok)).toBe(true);
    // Both should start before either ends (parallel)
    expect(order.indexOf("a-end")).toBeGreaterThan(order.indexOf("b-start"));
    expect(order.indexOf("b-end")).toBeGreaterThan(order.indexOf("a-start"));
  });

  it("falls back to sequential when a non-parallel-safe tool is mixed in", async () => {
    const order: string[] = [];
    const a = defineTool<Ctx, z.ZodObject<{}>>({
      id: "a",
      description: "...",
      parallelSafe: true,
      input: z.object({}),
      execute: async () => {
        order.push("a");
        return { ok: true, data: 1 };
      },
    });
    const b = defineTool<Ctx, z.ZodObject<{}>>({
      id: "b",
      description: "...",
      parallelSafe: false,
      input: z.object({}),
      execute: async () => {
        order.push("b");
        return { ok: true, data: 2 };
      },
    });
    const scheduler = new ToolScheduler<Ctx>([a, b]);
    await scheduler.execute(
      [
        { toolUseId: "1", toolName: "a", input: {} },
        { toolUseId: "2", toolName: "b", input: {} },
      ],
      ctxBuilder,
    );
    // 'a' finishes before 'b' starts (different groups when mixed)
    expect(order).toEqual(["a", "b"]);
  });

  it("aborts a tool that exceeds its timeout", async () => {
    const slow = defineTool<Ctx, z.ZodObject<{}>>({
      id: "slow",
      description: "...",
      timeoutMs: 30,
      input: z.object({}),
      execute: async (_, ctx) =>
        new Promise((resolve) => {
          ctx.signal.addEventListener("abort", () => {
            resolve({
              ok: false,
              code: "permanent",
              message: "should not get here",
              retryable: false,
            });
          });
          setTimeout(
            () =>
              resolve({
                ok: true,
                data: "should have aborted",
              }),
            500,
          );
        }),
    });
    const scheduler = new ToolScheduler<Ctx>([slow]);
    const start = Date.now();
    const [result] = await scheduler.execute(
      [{ toolUseId: "1", toolName: "slow", input: {} }],
      ctxBuilder,
    );
    expect(Date.now() - start).toBeLessThan(200);
    expect(result.result.ok).toBe(false);
    if (!result.result.ok) expect(result.result.code).toBe("timeout");
  });

  it("returns tool_not_found when the agent doesn't know the tool", async () => {
    const scheduler = new ToolScheduler<Ctx>([]);
    const [r] = await scheduler.execute(
      [{ toolUseId: "1", toolName: "ghost", input: {} }],
      ctxBuilder,
    );
    expect(r.result.ok).toBe(false);
    if (!r.result.ok) expect(r.result.code).toBe("tool_not_found");
  });

  it("returns tool_input_invalid when Zod validation fails", async () => {
    const tool = defineTool<Ctx, z.ZodObject<{ x: z.ZodString }>>({
      id: "t",
      description: "...",
      input: z.object({ x: z.string() }),
      execute: async (input) => ({ ok: true, data: input.x }),
    });
    const scheduler = new ToolScheduler<Ctx>([tool]);
    const [r] = await scheduler.execute(
      [{ toolUseId: "1", toolName: "t", input: { x: 42 } }],
      ctxBuilder,
    );
    expect(r.result.ok).toBe(false);
    if (!r.result.ok) expect(r.result.code).toBe("tool_input_invalid");
  });

  it("blocks a tool when blockingFn returns a decision", async () => {
    const tool = defineTool<Ctx, z.ZodObject<{}>>({
      id: "save",
      description: "...",
      input: z.object({}),
      execute: async () => ({ ok: true, data: "saved" }),
    });
    const scheduler = new ToolScheduler<Ctx>([tool]);
    const [r] = await scheduler.execute(
      [{ toolUseId: "1", toolName: "save", input: {} }],
      ctxBuilder,
      (toolId) => (toolId === "save" ? { reason: "validation failed" } : null),
    );
    expect(r.result.ok).toBe(false);
    if (!r.result.ok && r.result.code !== "human_input_required") {
      expect(r.result.code).toBe("tool_blocked");
      expect(r.result.message).toBe("validation failed");
    }
  });

  it("recovers from streamed __parseError input", async () => {
    const tool = defineTool<Ctx, z.ZodObject<{ x: z.ZodString }>>({
      id: "t",
      description: "...",
      input: z.object({ x: z.string() }),
      execute: async (input) => ({ ok: true, data: input.x }),
    });
    const scheduler = new ToolScheduler<Ctx>([tool]);
    const [r] = await scheduler.execute(
      [
        {
          toolUseId: "1",
          toolName: "t",
          input: { __parseError: "Unexpected token", rawInput: "{x:" },
        },
      ],
      ctxBuilder,
    );
    expect(r.result.ok).toBe(false);
    if (!r.result.ok && r.result.code !== "human_input_required") {
      expect(r.result.code).toBe("tool_input_invalid");
      expect(r.result.retryable).toBe(true);
    }
    expect(r.parseError).toMatch(/Unexpected token/);
  });
});
