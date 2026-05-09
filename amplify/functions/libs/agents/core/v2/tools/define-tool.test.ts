import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool } from "./define-tool";

interface TestCtx {
  userId: string;
}

describe("defineTool", () => {
  const tool = defineTool<TestCtx, z.ZodObject<{ name: z.ZodString; age: z.ZodNumber }>>(
    {
      id: "echo",
      description: "echoes",
      input: z.object({
        name: z.string(),
        age: z.number().int().min(0),
      }),
      execute: async (input) => ({ ok: true, data: input }),
    },
  );

  it("auto-generates a Bedrock-compatible JSON schema", () => {
    expect(tool.inputSchema).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
      },
      required: expect.arrayContaining(["name", "age"]),
    });
    expect(tool.inputSchema).not.toHaveProperty("$schema");
  });

  it("validates valid input", () => {
    const r = tool.validateInput({ name: "Lucy", age: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: "Lucy", age: 30 });
  });

  it("rejects invalid input with a readable error", () => {
    const r = tool.validateInput({ name: "Lucy", age: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/age/);
  });

  it("applies defaults: timeoutMs=25_000, parallelSafe=false, retryable=true, redactInput=false", () => {
    expect(tool.timeoutMs).toBe(25_000);
    expect(tool.parallelSafe).toBe(false);
    expect(tool.retryable).toBe(true);
    expect(tool.redactInput).toBe(false);
  });

  it("respects per-tool overrides", () => {
    const override = defineTool<TestCtx, z.ZodObject<{ x: z.ZodString }>>({
      id: "save",
      description: "saves",
      input: z.object({ x: z.string() }),
      timeoutMs: 60_000,
      parallelSafe: true,
      retryable: false,
      redactInput: true,
      execute: async (input) => ({ ok: true, data: input.x }),
    });
    expect(override.timeoutMs).toBe(60_000);
    expect(override.parallelSafe).toBe(true);
    expect(override.retryable).toBe(false);
    expect(override.redactInput).toBe(true);
  });

  it("validates output when an output schema is provided", () => {
    const echoChecked = defineTool<
      TestCtx,
      z.ZodObject<{ x: z.ZodString }>,
      z.ZodObject<{ x: z.ZodString }>
    >({
      id: "echoChecked",
      description: "...",
      input: z.object({ x: z.string() }),
      output: z.object({ x: z.string() }),
      execute: async () => ({ ok: true, data: { x: 123 } as any }),
    });
    expect(echoChecked.validateOutput).toBeDefined();
    const ok = echoChecked.validateOutput!({ x: "valid" });
    expect(ok.ok).toBe(true);
    const bad = echoChecked.validateOutput!({ x: 123 });
    expect(bad.ok).toBe(false);
  });
});
