import { describe, expect, it, vi } from "vitest";
import { adaptLegacyTool } from "./legacy-adapter";
import type { Tool as LegacyTool } from "../../types";
import { ToolResultStore } from "./tool-result-store";

interface Ctx {
  userId: string;
  scratchpad?: string[];
}

const makeCtx = () => ({
  agentContext: { userId: "u1", scratchpad: [] } as Ctx,
  resultStore: new ToolResultStore(),
  toolUseId: "t1",
  signal: new AbortController().signal,
  iteration: 1,
});

describe("adaptLegacyTool", () => {
  it("returns ok:false when the legacy tool returns a truthy `error` field", async () => {
    const legacy: LegacyTool<Ctx> = {
      id: "legacy",
      description: "...",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ error: "something broke" }),
    };
    const v2 = adaptLegacyTool(legacy);
    const result = await v2.execute({}, makeCtx());
    expect(result.ok).toBe(false);
    if (!result.ok && result.code !== "human_input_required") {
      expect(result.code).toBe("permanent");
      expect(result.message).toBe("something broke");
    }
  });

  it("treats `{ error: null }` and `{ error: false }` as successes (key-presence != failure)", async () => {
    // Regression for Bugbot finding ad83a227: prior code used `'error' in
    // data` which fired on falsy `error` values too. v1 tools that return
    // `{ error: null, value: 42 }` happen in some methodology lookups.
    const nullErr: LegacyTool<Ctx> = {
      id: "null-err",
      description: "...",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ error: null, value: 42 }),
    };
    const r1 = await adaptLegacyTool(nullErr).execute({}, makeCtx());
    expect(r1.ok).toBe(true);

    const falseErr: LegacyTool<Ctx> = {
      id: "false-err",
      description: "...",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ error: false, value: 7 }),
    };
    const r2 = await adaptLegacyTool(falseErr).execute({}, makeCtx());
    expect(r2.ok).toBe(true);
  });

  it("wraps thrown exceptions as ok:false `permanent`", async () => {
    const throws: LegacyTool<Ctx> = {
      id: "throws",
      description: "...",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        throw new Error("boom");
      },
    };
    const result = await adaptLegacyTool(throws).execute({}, makeCtx());
    expect(result.ok).toBe(false);
    if (!result.ok && result.code !== "human_input_required") {
      expect(result.code).toBe("permanent");
      expect(result.message).toBe("boom");
    }
  });

  it("injects getToolResult into the legacy context for cross-tool reads", async () => {
    const captured = vi.fn();
    const reader: LegacyTool<Ctx> = {
      id: "reader",
      description: "...",
      inputSchema: { type: "object", properties: {} },
      execute: async (_input, ctx) => {
        captured((ctx as any).getToolResult?.("requirements"));
        return { ok: true };
      },
    };
    const v2 = adaptLegacyTool(reader);
    const ctx = makeCtx();
    ctx.resultStore.put("requirements", { sessionId: "abc" });
    await v2.execute({}, ctx);
    expect(captured).toHaveBeenCalledWith({ sessionId: "abc" });
  });
});
