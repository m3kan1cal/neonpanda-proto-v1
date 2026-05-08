import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Agent, type AgentConfigV2 } from "./agent";
import type { ModelTurn, RuntimeAdapter } from "./runtime/runtime";
import { defineTool } from "./tools/define-tool";

vi.mock("../../../streaming/multimodal-helpers", () => ({
  buildMultimodalContent: vi.fn(),
}));
vi.mock("../../../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock("../../../api-helpers", () => ({
  MODEL_IDS: {
    PLANNER_MODEL_FULL: "test-planner",
    EXECUTOR_MODEL_FULL: "test-executor",
    CONTEXTUAL_MODEL_FULL: "test-contextual",
  },
}));

interface TestCtx {
  userId: string;
  scratchpad: string[];
}

class MockRuntime implements RuntimeAdapter<TestCtx> {
  constructor(public turns: ModelTurn[]) {}
  invokeTurn = vi.fn(async (): Promise<ModelTurn> => {
    const next = this.turns.shift();
    if (!next) throw new Error("MockRuntime: no more turns queued");
    return next;
  });
}

const textTurn = (text: string, modelId = "test-planner"): ModelTurn => ({
  stopReason: "end_turn",
  assistantContent: [{ text }],
  usage: { inputTokens: 10, outputTokens: 5 },
  modelId,
});

const toolUseTurn = (
  uses: { toolUseId: string; name: string; input: any }[],
  text = "",
  modelId = "test-planner",
): ModelTurn => ({
  stopReason: "tool_use",
  assistantContent: [
    ...(text ? [{ text }] : []),
    ...uses.map((u) => ({ toolUse: u })),
  ],
  usage: { inputTokens: 12, outputTokens: 6 },
  modelId,
});

const baseConfig = (
  overrides: Partial<AgentConfigV2<TestCtx>> = {},
): AgentConfigV2<TestCtx> => ({
  agentId: "test",
  context: { userId: "u1", scratchpad: [] },
  tools: [],
  modelId: "test-planner",
  staticPrompt: "STATIC",
  dynamicPrompt: "DYNAMIC",
  runtime: new MockRuntime([textTurn("hi")]),
  ...overrides,
});

describe("Agent v2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns final text on a single end_turn iteration", async () => {
    const agent = new Agent<TestCtx>(baseConfig({ runtime: new MockRuntime([textTurn("hello")]) }));
    const result = await agent.run({ userMessage: "hi" });
    expect(result.status).toBe("ok");
    expect(result.finalResponseText).toBe("hello");
    expect(result.iterations).toBe(1);
    expect(result.toolsUsed).toEqual([]);
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });

  it("dispatches tools, appends results to history, and continues the loop", async () => {
    const search = defineTool<TestCtx, z.ZodObject<{ q: z.ZodString }>>({
      id: "search",
      description: "...",
      input: z.object({ q: z.string() }),
      execute: async (input, ctx) => {
        ctx.agentContext.scratchpad.push(`search:${input.q}`);
        return { ok: true, data: { hits: [`result-for-${input.q}`] } };
      },
    });
    const runtime = new MockRuntime([
      toolUseTurn([{ toolUseId: "u1", name: "search", input: { q: "hello" } }]),
      textTurn("done"),
    ]);
    const agent = new Agent<TestCtx>(
      baseConfig({ tools: [search], runtime }),
    );
    const result = await agent.run({ userMessage: "go" });
    expect(result.status).toBe("ok");
    expect(result.toolsUsed).toEqual(["search"]);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].status).toBe("complete");
    expect(result.toolCalls[0].iteration).toBe(1);
    expect(result.iterations).toBe(2);
    expect(agent.getResultStore().get("search")).toEqual({
      hits: ["result-for-hello"],
    });
    expect(agent.getHistory()).toHaveLength(4); // user, assistant(toolUse), user(toolResult), assistant(text)
  });

  it("redacts toolInput on records when tool sets redactInput=true", async () => {
    const sensitive = defineTool<TestCtx, z.ZodObject<{ secret: z.ZodString }>>(
      {
        id: "save_memory",
        description: "...",
        input: z.object({ secret: z.string() }),
        redactInput: true,
        execute: async () => ({ ok: true, data: "saved" }),
      },
    );
    const runtime = new MockRuntime([
      toolUseTurn([
        { toolUseId: "u1", name: "save_memory", input: { secret: "hush" } },
      ]),
      textTurn("ok"),
    ]);
    const agent = new Agent<TestCtx>(
      baseConfig({ tools: [sensitive], runtime }),
    );
    const result = await agent.run({ userMessage: "go" });
    expect(result.toolCalls[0].toolInput).toBeUndefined();
  });

  it("blocks tools via policy.blocking and surfaces a tool_blocked error", async () => {
    const save = defineTool<TestCtx, z.ZodObject<{}>>({
      id: "save",
      description: "...",
      input: z.object({}),
      execute: async () => ({ ok: true, data: "saved" }),
    });
    const runtime = new MockRuntime([
      toolUseTurn([{ toolUseId: "u1", name: "save", input: {} }]),
      textTurn("ok"),
    ]);
    const agent = new Agent<TestCtx>(
      baseConfig({
        tools: [save],
        runtime,
        policy: {
          blocking: (toolId) =>
            toolId === "save" ? { reason: "validation failed" } : null,
        },
      }),
    );
    const result = await agent.run({ userMessage: "go" });
    expect(result.toolCalls[0].status).toBe("error");
    expect(result.toolCalls[0].errorCode).toBe("tool_blocked");
  });

  it("retries via policy.shouldRetry when the workflow looks incomplete", async () => {
    const t1 = defineTool<TestCtx, z.ZodObject<{}>>({
      id: "t1",
      description: "...",
      input: z.object({}),
      execute: async () => ({ ok: true, data: 1 }),
    });
    const runtime = new MockRuntime([
      // First pass: model just talks, doesn't call tools
      textTurn("would you like me to proceed?"),
      // After retry prompt, model uses tool then ends
      toolUseTurn([{ toolUseId: "u1", name: "t1", input: {} }]),
      textTurn("done"),
    ]);
    const agent = new Agent<TestCtx>(
      baseConfig({
        tools: [t1],
        runtime,
        policy: {
          maxRetries: 1,
          shouldRetry: ({ toolsUsed, finalText }) => {
            if (toolsUsed.length === 0 && /\?/.test(finalText)) {
              return {
                retryPrompt: "Please use your tools. Don't ask questions.",
                reason: "tool_not_called",
              };
            }
            return null;
          },
        },
      }),
    );
    const result = await agent.run({ userMessage: "go" });
    expect(result.toolsUsed).toEqual(["t1"]);
    expect(result.iterations).toBe(3);
  });

  it("strips leading text blocks from tool_use iterations in the sync path too", async () => {
    // Regression for Bugbot finding e470f264: streaming runLoop strips, sync
    // runLoop didn't, leaving the model to repeat preambles on subsequent
    // turns and inflating the final fullResponseText with leftover text.
    const search = defineTool<TestCtx, z.ZodObject<{}>>({
      id: "search",
      description: "...",
      input: z.object({}),
      execute: async () => ({ ok: true, data: 1 }),
    });
    const runtime = new MockRuntime([
      // Iteration 1: model says "Sure thing!" then calls a tool
      toolUseTurn(
        [{ toolUseId: "u1", name: "search", input: {} }],
        "Sure thing!",
      ),
      // Iteration 2: terminal text-only turn
      textTurn("Done."),
    ]);
    const agent = new Agent<TestCtx>(baseConfig({ tools: [search], runtime }));
    const result = await agent.run({ userMessage: "go" });
    const history = agent.getHistory();
    // user message, assistant (toolUse only — preamble stripped),
    // user (toolResult), assistant (final text)
    const firstAssistant = history[1];
    expect(firstAssistant.role).toBe("assistant");
    expect(firstAssistant.content).toHaveLength(1);
    expect(firstAssistant.content[0]).toHaveProperty("toolUse");
    // Final response should not include the stripped preamble
    expect(result.finalResponseText).toBe("Done.");
  });

  it("stops at maxIterations", async () => {
    const t1 = defineTool<TestCtx, z.ZodObject<{}>>({
      id: "t1",
      description: "...",
      input: z.object({}),
      execute: async () => ({ ok: true, data: 1 }),
    });
    const runtime = new MockRuntime([
      toolUseTurn([{ toolUseId: "u1", name: "t1", input: {} }]),
      toolUseTurn([{ toolUseId: "u2", name: "t1", input: {} }]),
      toolUseTurn([{ toolUseId: "u3", name: "t1", input: {} }]),
    ]);
    const agent = new Agent<TestCtx>(
      baseConfig({ tools: [t1], runtime, maxIterations: 2 }),
    );
    const result = await agent.run({ userMessage: "go" });
    expect(result.status).toBe("max_iterations");
    expect(result.iterations).toBe(2);
  });

  it("captures cache-read input tokens when the runtime reports them", async () => {
    const turn: ModelTurn = {
      stopReason: "end_turn",
      assistantContent: [{ text: "hi" }],
      usage: { inputTokens: 50, outputTokens: 10, cacheReadInputTokens: 40 },
      modelId: "test-planner",
    };
    const agent = new Agent<TestCtx>(baseConfig({ runtime: new MockRuntime([turn]) }));
    const result = await agent.run({ userMessage: "hi" });
    expect(result.cacheReadInputTokens).toBe(40);
  });

  it("stores tool failures in the result store too (for blocking middleware to read)", async () => {
    const fail = defineTool<TestCtx, z.ZodObject<{}>>({
      id: "fail",
      description: "...",
      input: z.object({}),
      execute: async () => ({
        ok: false,
        code: "permanent",
        message: "boom",
        retryable: false,
      }),
    });
    const runtime = new MockRuntime([
      toolUseTurn([{ toolUseId: "u1", name: "fail", input: {} }]),
      textTurn("ok"),
    ]);
    const agent = new Agent<TestCtx>(baseConfig({ tools: [fail], runtime }));
    await agent.run({ userMessage: "go" });
    const stored = agent.getResultStore().get("fail") as any;
    expect(stored.ok).toBe(false);
    expect(stored.message).toBe("boom");
  });
});
