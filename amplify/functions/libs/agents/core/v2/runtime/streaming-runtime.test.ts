import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Agent, stripLeadingTextBlocks, type AgentConfigV2 } from "../agent";
import type { ModelTurn } from "./runtime";
import type { StreamingRuntimeAdapter, TurnStreamEvent } from "./streaming-runtime";
import { defineTool } from "../tools/define-tool";
import type { AgentEvent } from "../events/events";
import { formatAgentEventToSSE } from "./sse-formatter";

vi.mock("../../../../streaming/multimodal-helpers", () => ({
  buildMultimodalContent: vi.fn(),
}));
vi.mock("../../../../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock("../../../../api-helpers", () => ({
  MODEL_IDS: {
    PLANNER_MODEL_FULL: "test-planner",
    EXECUTOR_MODEL_FULL: "test-executor",
    CONTEXTUAL_MODEL_FULL: "test-contextual",
  },
  callBedrockApiStreamForAgent: vi.fn(),
}));

interface TestCtx {
  userId: string;
}

class MockStreamingRuntime implements StreamingRuntimeAdapter<TestCtx> {
  constructor(
    public turns: Array<{
      stream: TurnStreamEvent[];
      result: ModelTurn;
    }>,
  ) {}
  async invokeTurn(): Promise<ModelTurn> {
    const turn = this.turns.shift();
    if (!turn) throw new Error("no more turns");
    return turn.result;
  }
  async *invokeTurnStream(): AsyncGenerator<TurnStreamEvent, ModelTurn, void> {
    const turn = this.turns.shift();
    if (!turn) throw new Error("no more turns");
    for (const ev of turn.stream) yield ev;
    return turn.result;
  }
}

const baseConfig = (
  overrides: Partial<AgentConfigV2<TestCtx>> = {},
): AgentConfigV2<TestCtx> => ({
  agentId: "test",
  context: { userId: "u1" },
  tools: [],
  modelId: "test-planner",
  staticPrompt: "S",
  dynamicPrompt: "D",
  runtime: new MockStreamingRuntime([
    {
      stream: [{ type: "text_delta", text: "ok" }],
      result: {
        stopReason: "end_turn",
        assistantContent: [{ text: "ok" }],
        usage: { inputTokens: 1, outputTokens: 1 },
        modelId: "test-planner",
      },
    },
  ]),
  ...overrides,
});

const drain = async (gen: AsyncGenerator<AgentEvent, any, void>) => {
  const events: AgentEvent[] = [];
  while (true) {
    const { value, done } = await gen.next();
    if (done) return { events, result: value };
    events.push(value);
  }
};

describe("Agent.runStream + StreamingRuntime", () => {
  it("yields chunk events for each text_delta and a final run_complete", async () => {
    const runtime = new MockStreamingRuntime([
      {
        stream: [
          { type: "text_delta", text: "Hello, " },
          { type: "text_delta", text: "world!" },
        ],
        result: {
          stopReason: "end_turn",
          assistantContent: [{ text: "Hello, world!" }],
          usage: { inputTokens: 5, outputTokens: 3 },
          modelId: "test-planner",
        },
      },
    ]);
    const agent = new Agent<TestCtx>(baseConfig({ runtime }));
    const { events, result } = await drain(agent.runStream({ userMessage: "hi" }));

    const chunkTexts = events.filter((e) => e.type === "chunk").map((e: any) => e.text);
    expect(chunkTexts).toEqual(["Hello, ", "world!"]);
    expect(events.find((e) => e.type === "run_start")).toBeDefined();
    expect(events.find((e) => e.type === "iteration_start")).toBeDefined();
    expect(events.find((e) => e.type === "run_complete")).toBeDefined();
    expect(result.status).toBe("ok");
    expect(result.finalResponseText).toBe("Hello, world!");
  });

  it("emits tool_call_start before tool_call_complete with the same toolUseId", async () => {
    const search = defineTool<TestCtx, z.ZodObject<{ q: z.ZodString }>>({
      id: "search",
      description: "...",
      input: z.object({ q: z.string() }),
      execute: async (input) => ({ ok: true, data: { q: input.q } }),
    });
    const runtime = new MockStreamingRuntime([
      {
        stream: [
          { type: "text_delta", text: "Looking that up." },
          { type: "tool_use_start", toolUseId: "u1", toolName: "search" },
          { type: "tool_use_input_delta", toolUseId: "u1", fragment: '{"q":"x"}' },
          { type: "tool_use_stop", toolUseId: "u1" },
        ],
        result: {
          stopReason: "tool_use",
          assistantContent: [
            { text: "Looking that up." },
            { toolUse: { toolUseId: "u1", name: "search", input: { q: "x" } } },
          ],
          usage: { inputTokens: 5, outputTokens: 3 },
          modelId: "test-planner",
        },
      },
      {
        stream: [{ type: "text_delta", text: "Found it." }],
        result: {
          stopReason: "end_turn",
          assistantContent: [{ text: "Found it." }],
          usage: { inputTokens: 5, outputTokens: 2 },
          modelId: "test-planner",
        },
      },
    ]);
    const agent = new Agent<TestCtx>(baseConfig({ tools: [search], runtime }));
    const { events, result } = await drain(agent.runStream({ userMessage: "go" }));

    const toolEvents = events.filter(
      (e) => e.type === "tool_call_start" || e.type === "tool_call_complete",
    );
    expect(toolEvents).toHaveLength(2);
    expect(toolEvents[0].type).toBe("tool_call_start");
    expect((toolEvents[0] as any).record.status).toBe("running");
    expect(toolEvents[1].type).toBe("tool_call_complete");
    expect((toolEvents[1] as any).record.status).toBe("complete");
    expect((toolEvents[0] as any).record.toolUseId).toBe(
      (toolEvents[1] as any).record.toolUseId,
    );
    // The completion record must carry durationMs
    expect((toolEvents[1] as any).record.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.toolsUsed).toEqual(["search"]);
  });

  it("anchors contentOffset to the assistant text emitted before the tool call", async () => {
    const search = defineTool<TestCtx, z.ZodObject<{}>>({
      id: "search",
      description: "...",
      input: z.object({}),
      execute: async () => ({ ok: true, data: 1 }),
    });
    const runtime = new MockStreamingRuntime([
      {
        stream: [
          { type: "text_delta", text: "Looking up." },
          { type: "tool_use_start", toolUseId: "u1", toolName: "search" },
        ],
        result: {
          stopReason: "tool_use",
          assistantContent: [
            { text: "Looking up." },
            { toolUse: { toolUseId: "u1", name: "search", input: {} } },
          ],
          usage: { inputTokens: 1, outputTokens: 1 },
          modelId: "test-planner",
        },
      },
      {
        stream: [{ type: "text_delta", text: "ok" }],
        result: {
          stopReason: "end_turn",
          assistantContent: [{ text: "ok" }],
          usage: { inputTokens: 1, outputTokens: 1 },
          modelId: "test-planner",
        },
      },
    ]);
    const agent = new Agent<TestCtx>(baseConfig({ tools: [search], runtime }));
    const { events } = await drain(agent.runStream({ userMessage: "go" }));
    const start = events.find((e) => e.type === "tool_call_start") as any;
    expect(start.record.contentOffset).toBe("Looking up.".length);
  });

  it("strips leading text blocks from tool_use iterations before pushing to history", async () => {
    const search = defineTool<TestCtx, z.ZodObject<{}>>({
      id: "search",
      description: "...",
      input: z.object({}),
      execute: async () => ({ ok: true, data: 1 }),
    });
    const runtime = new MockStreamingRuntime([
      {
        stream: [{ type: "text_delta", text: "Sure thing!" }],
        result: {
          stopReason: "tool_use",
          assistantContent: [
            { text: "Sure thing!" },
            { toolUse: { toolUseId: "u1", name: "search", input: {} } },
          ],
          usage: { inputTokens: 1, outputTokens: 1 },
          modelId: "test-planner",
        },
      },
      {
        stream: [{ type: "text_delta", text: "Done." }],
        result: {
          stopReason: "end_turn",
          assistantContent: [{ text: "Done." }],
          usage: { inputTokens: 1, outputTokens: 1 },
          modelId: "test-planner",
        },
      },
    ]);
    const agent = new Agent<TestCtx>(baseConfig({ tools: [search], runtime }));
    await drain(agent.runStream({ userMessage: "go" }));
    const history = agent.getHistory();
    // user message, assistant (toolUse only — text stripped), user (toolResult), assistant (final text)
    const firstAssistant = history[1];
    expect(firstAssistant.role).toBe("assistant");
    expect(firstAssistant.content).toHaveLength(1);
    expect(firstAssistant.content[0]).toHaveProperty("toolUse");
  });
});

describe("stripLeadingTextBlocks", () => {
  it("removes leading text blocks before a tool_use", () => {
    const before = [
      { text: "preamble" },
      { toolUse: { toolUseId: "u1", name: "x", input: {} } },
    ];
    expect(stripLeadingTextBlocks(before)).toEqual([
      { toolUse: { toolUseId: "u1", name: "x", input: {} } },
    ]);
  });
  it("leaves all-text content alone", () => {
    const before = [{ text: "a" }, { text: "b" }];
    expect(stripLeadingTextBlocks(before)).toEqual(before);
  });
  it("leaves content already starting with tool_use alone", () => {
    const before = [{ toolUse: { toolUseId: "u1", name: "x", input: {} } }];
    expect(stripLeadingTextBlocks(before)).toEqual(before);
  });
});

describe("formatAgentEventToSSE", () => {
  it("produces v1-compatible chunk events", () => {
    const sse = formatAgentEventToSSE({ type: "chunk", text: "hi" });
    expect(sse).toBe('data: {"type":"chunk","content":"hi"}\n\n');
  });

  it("produces v1-compatible contextual events with stage", () => {
    const sse = formatAgentEventToSSE({
      type: "contextual",
      content: "thinking",
      stage: "streaming_tick",
    });
    expect(sse).toBe(
      'data: {"type":"contextual","content":"thinking","stage":"streaming_tick"}\n\n',
    );
  });

  it("produces tool_call events with running status and contentOffset", () => {
    const sse = formatAgentEventToSSE({
      type: "tool_call_start",
      record: {
        toolUseId: "u1",
        toolName: "search",
        status: "running",
        iteration: 1,
        contentOffset: 12,
        startedAtMs: 1000,
        toolInput: { q: "test" },
      },
    });
    expect(sse).not.toBeNull();
    expect(sse).toContain('"type":"tool_call"');
    expect(sse).toContain('"status":"running"');
    expect(sse).toContain('"toolUseId":"u1"');
    expect(sse).toContain('"contentOffset":12');
  });

  it("returns null for internal-only event types", () => {
    expect(
      formatAgentEventToSSE({ type: "iteration_start", iteration: 1 }),
    ).toBeNull();
    expect(
      formatAgentEventToSSE({
        type: "run_start",
        runId: "r",
        agentId: "a",
      }),
    ).toBeNull();
  });
});
