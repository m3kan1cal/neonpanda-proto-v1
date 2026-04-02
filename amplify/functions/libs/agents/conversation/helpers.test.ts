import { describe, it, expect } from "vitest";
import {
  buildToolConfig,
  parseToolInput,
  formatToolResult,
  buildUserToolResultMessage,
} from "./helpers";
import type { Tool } from "../core/types";
import type { ConversationAgentContext } from "./types";

// ─── Factories ───────────────────────────────────────────────────────────────

const makeTool = (
  overrides?: Partial<Tool<ConversationAgentContext>>,
): Tool<ConversationAgentContext> => ({
  id: "test_tool",
  description: "A test tool",
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
  execute: async () => ({}),
  ...overrides,
});

// ─── buildToolConfig ──────────────────────────────────────────────────────────

describe("buildToolConfig", () => {
  it("converts a tool to the Bedrock toolSpec format", () => {
    const tool = makeTool({ id: "my_tool", description: "Does something" });
    const result = buildToolConfig([tool]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      toolSpec: {
        name: "my_tool",
        description: "Does something",
        inputSchema: { json: tool.inputSchema },
      },
    });
  });

  it("maps multiple tools preserving order", () => {
    const tools = [
      makeTool({ id: "tool_a" }),
      makeTool({ id: "tool_b" }),
      makeTool({ id: "tool_c" }),
    ];
    const result = buildToolConfig(tools);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.toolSpec.name)).toEqual(["tool_a", "tool_b", "tool_c"]);
  });

  it("returns empty array for empty tool list", () => {
    expect(buildToolConfig([])).toEqual([]);
  });

  it("wraps inputSchema in a json key", () => {
    const schema = { type: "object", required: ["id"], properties: { id: { type: "string" } } };
    const result = buildToolConfig([makeTool({ inputSchema: schema })]);
    expect(result[0].toolSpec.inputSchema).toEqual({ json: schema });
  });
});

// ─── parseToolInput ───────────────────────────────────────────────────────────

describe("parseToolInput", () => {
  it("parses complete JSON from a single fragment", () => {
    const result = parseToolInput(['{"key": "value"}']);
    expect(result).toEqual({ key: "value" });
  });

  it("concatenates multiple fragments and parses the result", () => {
    const result = parseToolInput(['{"ke', 'y": "va', 'lue"}']);
    expect(result).toEqual({ key: "value" });
  });

  it("parses nested objects", () => {
    const result = parseToolInput(['{"outer": {"inner": 42}}']);
    expect(result).toEqual({ outer: { inner: 42 } });
  });

  it("parses arrays", () => {
    const result = parseToolInput(['[1, 2, ', "3]"]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseToolInput(["{bad json"])).toThrow();
  });

  it("handles empty fragment array (empty string → invalid JSON)", () => {
    expect(() => parseToolInput([])).toThrow();
  });
});

// ─── formatToolResult ─────────────────────────────────────────────────────────

describe("formatToolResult", () => {
  it("creates a toolResult block with success status by default", () => {
    const result = formatToolResult("use-id-1", { data: 42 });
    expect(result).toEqual({
      toolResult: {
        toolUseId: "use-id-1",
        content: [{ json: { data: 42 } }],
        status: "success",
      },
    });
  });

  it("accepts explicit success status", () => {
    const result = formatToolResult("use-id-2", { ok: true }, "success");
    expect(result.toolResult.status).toBe("success");
  });

  it("accepts error status", () => {
    const result = formatToolResult("use-id-3", { error: "oops" }, "error");
    expect(result.toolResult.status).toBe("error");
    expect(result.toolResult.content[0].json).toEqual({ error: "oops" });
  });

  it("preserves the toolUseId", () => {
    const result = formatToolResult("my-unique-id", {});
    expect(result.toolResult.toolUseId).toBe("my-unique-id");
  });
});

// ─── buildUserToolResultMessage ───────────────────────────────────────────────

describe("buildUserToolResultMessage", () => {
  it("wraps tool results in a user message", () => {
    const toolResult = formatToolResult("id-1", { ok: true });
    const message = buildUserToolResultMessage([toolResult]);

    expect(message).toEqual({
      role: "user",
      content: [toolResult],
    });
  });

  it("includes multiple tool results in content", () => {
    const r1 = formatToolResult("id-1", { a: 1 });
    const r2 = formatToolResult("id-2", { b: 2 });
    const message = buildUserToolResultMessage([r1, r2]);

    expect(message.content).toHaveLength(2);
    expect(message.content[0]).toBe(r1);
    expect(message.content[1]).toBe(r2);
  });

  it("role is always 'user'", () => {
    expect(buildUserToolResultMessage([]).role).toBe("user");
  });
});
