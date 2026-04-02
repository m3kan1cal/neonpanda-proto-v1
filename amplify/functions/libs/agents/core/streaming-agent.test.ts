import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StreamAgentEvent, Tool, BaseStreamingAgentContext } from "./types";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../../api-helpers", () => ({
  callBedrockApiStreamForAgent: vi.fn(),
}));

vi.mock("../../streaming/multimodal-helpers", () => ({
  buildMultimodalContent: vi.fn(),
}));

// Import AFTER mocks are set up
import { StreamingConversationAgent } from "./streaming-agent";
import { callBedrockApiStreamForAgent } from "../../api-helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockStreamEvent = StreamAgentEvent;

async function* makeStream(
  events: MockStreamEvent[],
): AsyncGenerator<MockStreamEvent> {
  for (const event of events) {
    yield event;
  }
}

/** Collect all yielded values from the converseStream generator */
async function collectStream(
  agent: StreamingConversationAgent<TestContext>,
  message: string,
): Promise<{ yielded: string[]; result: any }> {
  const yielded: string[] = [];
  let result: any;
  const gen = agent.converseStream(message);

  while (true) {
    const { value, done } = await gen.next();
    if (done) {
      result = value;
      break;
    }
    yielded.push(value as string);
  }

  return { yielded, result };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestContext extends BaseStreamingAgentContext {
  userId: string;
  userTimezone: string;
}

// ─── Factories ───────────────────────────────────────────────────────────────

const makeContext = (): TestContext => ({
  userId: "user-1",
  userTimezone: "America/Los_Angeles",
});

const makeEndTurnStream = (text: string): MockStreamEvent[] => [
  { type: "text_delta", text },
  {
    type: "message_complete",
    stopReason: "end_turn",
    assistantContent: [{ text }],
    usage: { inputTokens: 10, outputTokens: 5 },
  },
];

const makeToolUseStream = (
  toolUseId: string,
  toolName: string,
  input: object,
): MockStreamEvent[] => {
  const inputStr = JSON.stringify(input);
  return [
    { type: "tool_use_start", toolUseId, toolName },
    { type: "tool_use_delta", toolUseId, inputFragment: inputStr },
    { type: "tool_use_stop", toolUseId },
    {
      type: "message_complete",
      stopReason: "tool_use",
      assistantContent: [{ toolUse: { toolUseId, name: toolName, input } }],
      usage: { inputTokens: 20, outputTokens: 10 },
    },
  ];
};

const makeMockTool = (
  id: string,
  executeResult: any = { ok: true },
): Tool<TestContext> => ({
  id,
  description: `Tool: ${id}`,
  inputSchema: { type: "object" },
  execute: vi.fn().mockResolvedValue(executeResult),
});

const makeAgent = (
  tools: Tool<TestContext>[] = [],
): StreamingConversationAgent<TestContext> =>
  new StreamingConversationAgent<TestContext>({
    staticPrompt: "Static system prompt",
    dynamicPrompt: "Dynamic context",
    tools,
    modelId: "test-model",
    context: makeContext(),
    existingMessages: [],
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("StreamingConversationAgent.converseStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── end_turn immediately ─────────────────────────────────────────────────

  it("yields text chunk and returns ConversationAgentResult on end_turn", async () => {
    const mockStream = vi.mocked(callBedrockApiStreamForAgent);
    mockStream.mockReturnValue(makeStream(makeEndTurnStream("Hello there!")));

    const agent = makeAgent();
    const { yielded, result } = await collectStream(agent, "hi");

    // Should have yielded some text events
    expect(yielded.length).toBeGreaterThan(0);
    expect(result.fullResponseText).toBe("Hello there!");
    expect(result.iterationCount).toBe(1);
    expect(result.toolsUsed).toEqual([]);
  });

  it("returns correct token counts in result", async () => {
    vi.mocked(callBedrockApiStreamForAgent).mockReturnValue(
      makeStream(makeEndTurnStream("response")),
    );

    const agent = makeAgent();
    const { result } = await collectStream(agent, "message");

    expect(result.totalInputTokens).toBe(10);
    expect(result.totalOutputTokens).toBe(5);
  });

  // ─── tool_use then end_turn ───────────────────────────────────────────────

  it("executes tool when model requests it, then continues to end_turn", async () => {
    const tool = makeMockTool("my_tool", { processed: true });
    const mockStream = vi.mocked(callBedrockApiStreamForAgent);

    // First call: model requests tool
    mockStream.mockReturnValueOnce(
      makeStream(makeToolUseStream("use-1", "my_tool", { query: "test" })),
    );
    // Second call: model provides final text after seeing tool result
    mockStream.mockReturnValueOnce(makeStream(makeEndTurnStream("Done!")));

    const agent = makeAgent([tool]);
    const { result } = await collectStream(agent, "do the thing");

    expect(tool.execute).toHaveBeenCalledOnce();
    expect(result.toolsUsed).toContain("my_tool");
    expect(result.fullResponseText).toBe("Done!");
    expect(result.iterationCount).toBe(2);
  });

  it("passes tool input to execute()", async () => {
    const tool = makeMockTool("search_tool");
    vi.mocked(callBedrockApiStreamForAgent)
      .mockReturnValueOnce(
        makeStream(makeToolUseStream("use-1", "search_tool", { keyword: "squats" })),
      )
      .mockReturnValueOnce(makeStream(makeEndTurnStream("Found it")));

    const agent = makeAgent([tool]);
    await collectStream(agent, "search");

    expect(tool.execute).toHaveBeenCalledWith(
      { keyword: "squats" },
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  // ─── unknown tool ─────────────────────────────────────────────────────────

  it("appends error result and continues when tool is not found", async () => {
    vi.mocked(callBedrockApiStreamForAgent)
      .mockReturnValueOnce(
        makeStream(makeToolUseStream("use-x", "nonexistent_tool", {})),
      )
      .mockReturnValueOnce(makeStream(makeEndTurnStream("Handled error")));

    const agent = makeAgent([]); // no tools registered
    const { result } = await collectStream(agent, "do something");

    expect(result.fullResponseText).toBe("Handled error");
    expect(result.iterationCount).toBe(2);
  });

  // ─── parse error on tool input ────────────────────────────────────────────

  it("handles malformed JSON tool input gracefully", async () => {
    const badInputEvents: MockStreamEvent[] = [
      { type: "tool_use_start", toolUseId: "use-bad", toolName: "my_tool" },
      { type: "tool_use_delta", toolUseId: "use-bad", inputFragment: "{bad json!!!" },
      { type: "tool_use_stop", toolUseId: "use-bad" },
      {
        type: "message_complete",
        stopReason: "tool_use",
        assistantContent: [],
        usage: { inputTokens: 5, outputTokens: 5 },
      },
    ];

    const tool = makeMockTool("my_tool");
    vi.mocked(callBedrockApiStreamForAgent)
      .mockReturnValueOnce(makeStream(badInputEvents))
      .mockReturnValueOnce(makeStream(makeEndTurnStream("Recovered")));

    const agent = makeAgent([tool]);
    const { result } = await collectStream(agent, "test");

    // Tool should NOT be called with bad input
    expect(tool.execute).not.toHaveBeenCalled();
    expect(result.fullResponseText).toBe("Recovered");
  });

  // ─── tool execution error ─────────────────────────────────────────────────

  it("appends error result when tool.execute() throws", async () => {
    const failTool: Tool<TestContext> = {
      id: "fail_tool",
      description: "Always fails",
      inputSchema: {},
      execute: vi.fn().mockRejectedValue(new Error("Tool exploded")),
    };

    vi.mocked(callBedrockApiStreamForAgent)
      .mockReturnValueOnce(
        makeStream(makeToolUseStream("use-fail", "fail_tool", {})),
      )
      .mockReturnValueOnce(makeStream(makeEndTurnStream("Error handled")));

    const agent = makeAgent([failTool]);
    const { result } = await collectStream(agent, "do it");

    expect(result.fullResponseText).toBe("Error handled");
    expect(result.toolsUsed).not.toContain("fail_tool");
  });

  // ─── getFullResponseText() ────────────────────────────────────────────────

  it("getFullResponseText() returns accumulated text", async () => {
    vi.mocked(callBedrockApiStreamForAgent).mockReturnValue(
      makeStream(makeEndTurnStream("Hello world")),
    );

    const agent = makeAgent();
    await collectStream(agent, "hi");

    expect(agent.getFullResponseText()).toBe("Hello world");
  });

  // ─── max_tokens stop ──────────────────────────────────────────────────────

  it("stops cleanly on max_tokens stop reason", async () => {
    const maxTokensStream: MockStreamEvent[] = [
      { type: "text_delta", text: "partial response" },
      {
        type: "message_complete",
        stopReason: "max_tokens",
        assistantContent: [{ text: "partial response" }],
        usage: { inputTokens: 50, outputTokens: 100 },
      },
    ];

    vi.mocked(callBedrockApiStreamForAgent).mockReturnValue(makeStream(maxTokensStream));

    const agent = makeAgent();
    const { result } = await collectStream(agent, "long question");

    expect(result.iterationCount).toBe(1);
    expect(result.fullResponseText).toBe("partial response");
  });
});
