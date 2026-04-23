import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────
// Must be declared before any imports that depend on them

vi.mock("../../api-helpers", () => ({
  callBedrockApiForAgent: vi.fn(),
  MODEL_IDS: { PLANNER_MODEL_FULL: "test-model" },
  buildMultimodalContent: vi.fn(),
}));

vi.mock("./prompts", () => ({
  buildWorkoutLoggerPrompt: vi
    .fn()
    .mockReturnValue("test workout logger prompt"),
}));

vi.mock("./tools", () => ({
  detectDisciplineTool: {
    id: "detect_discipline",
    description: "Detects discipline",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      discipline: "crossfit",
      confidence: 0.95,
      method: "ai_detection",
      reasoning: "CrossFit movements detected",
    }),
  },
  extractWorkoutDataTool: {
    id: "extract_workout_data",
    description: "Extracts workout data",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      workoutData: { workout_name: "Fran", discipline: "crossfit" },
      completedAt: new Date(),
      generationMethod: "tool",
      userMessage: "Did Fran",
    }),
  },
  validateWorkoutCompletenessTool: {
    id: "validate_workout_completeness",
    description: "Validates workout",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      isValid: true,
      shouldSave: true,
      shouldNormalize: false,
      confidence: 0.9,
      completeness: 0.85,
      validationFlags: [],
      blockingFlags: [],
    }),
  },
  normalizeWorkoutDataTool: {
    id: "normalize_workout_data",
    description: "Normalizes workout data",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      normalizedData: { workout_name: "Fran", discipline: "crossfit" },
      isValid: true,
      issuesFound: 0,
      issuesCorrected: 0,
      normalizationSummary: "No issues",
      normalizationConfidence: 1.0,
    }),
  },
  generateWorkoutSummaryTool: {
    id: "generate_workout_summary",
    description: "Generates summary",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({ summary: "Completed Fran in 8:57" }),
  },
  saveWorkoutToDatabaseTool: {
    id: "save_workout_to_database",
    description: "Saves workout",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      workoutId: "workout_user1_123456",
      success: true,
      pineconeStored: true,
      pineconeRecordId: "vec_123",
      templateLinked: false,
    }),
  },
  computeDateTool: {
    id: "compute_date",
    description: "Resolves date references",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      now: { isoDate: "2026-04-20", timezone: "America/Los_Angeles" },
      results: [],
    }),
  },
}));

vi.mock("../../streaming/multimodal-helpers", () => ({
  buildMultimodalContent: vi.fn(),
}));

// Import after mocks
import { WorkoutLoggerAgent } from "./agent";
import { callBedrockApiForAgent } from "../../api-helpers";
import * as tools from "./tools";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeBedrockResponse = (stopReason: string, content: any[] = []): any => ({
  stopReason,
  output: { message: { role: "assistant", content } },
  usage: { inputTokens: 10, outputTokens: 5 },
});

const makeToolUseContent = (toolId: string, input: any = {}): any[] => [
  { toolUse: { toolUseId: `use-${toolId}`, name: toolId, input } },
];

const makeTextContent = (text: string): any[] => [{ text }];

// ─── Factories ────────────────────────────────────────────────────────────────

const makeContext = () => ({
  userId: "user-test",
  coachId: "coach-test",
  conversationId: "conv-test",
  workoutId: "workout-new",
  coachConfig: {} as any,
  userTimezone: "America/Los_Angeles",
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WorkoutLoggerAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Instantiation ────────────────────────────────────────────────────────

  it("instantiates without throwing", () => {
    expect(() => new WorkoutLoggerAgent(makeContext())).not.toThrow();
  });

  // ─── No-tools path (end_turn immediately) ─────────────────────────────────

  it("returns skipped result when Bedrock returns end_turn without calling any tools", async () => {
    vi.mocked(callBedrockApiForAgent).mockResolvedValue(
      makeBedrockResponse(
        "end_turn",
        makeTextContent("I need more information about your workout."),
      ),
    );

    const agent = new WorkoutLoggerAgent(makeContext());
    const result = await agent.logWorkout("hello");

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
  });

  // ─── Error handling ──────────────────────────────────────────────────────

  it("returns skipped with error reason when Bedrock throws", async () => {
    vi.mocked(callBedrockApiForAgent).mockRejectedValue(
      new Error("Bedrock service unavailable"),
    );

    const agent = new WorkoutLoggerAgent(makeContext());
    const result = await agent.logWorkout("Did 5x5 squats at 315lbs");

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("Bedrock service unavailable");
  });

  // ─── Happy path (full tool sequence) ──────────────────────────────────────

  it("returns success when complete tool sequence executes and save succeeds", async () => {
    const mock = vi.mocked(callBedrockApiForAgent);

    // Simulate: Bedrock calls each tool in sequence, then end_turn
    mock
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "tool_use",
          makeToolUseContent("detect_discipline"),
        ),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "tool_use",
          makeToolUseContent("extract_workout_data"),
        ),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "tool_use",
          makeToolUseContent("validate_workout_completeness"),
        ),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "tool_use",
          makeToolUseContent("save_workout_to_database"),
        ),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "end_turn",
          makeTextContent("Workout logged successfully!"),
        ),
      );

    const agent = new WorkoutLoggerAgent(makeContext());
    const result = await agent.logWorkout("Did Fran today, 8:57");

    expect(result.success).toBe(true);
    expect(result.workoutId).toBe("workout_user1_123456");
    expect(tools.saveWorkoutToDatabaseTool.execute).toHaveBeenCalled();
  });

  // ─── Blocking enforcement ─────────────────────────────────────────────────

  // ─── Boundary-case discipline detection ───────────────────────────────────
  //
  // These tests exercise the agent with mountain-discipline detection results
  // to confirm the full flow routes correctly for trail_running, backpacking,
  // and rucking, and that the agent keeps its tool ordering regardless of the
  // detected discipline. Full LLM-level accuracy for detect_discipline is
  // measured in test/evals/discipline-detection/ using labeled fixtures.

  it.each([
    {
      discipline: "trail_running",
      reasoning:
        "Trail surface with 2,800 ft of gain and singletrack references",
      utterance:
        "12 mile trail run, 2,800 ft of gain on singletrack. Ran the flats and power-hiked the climbs.",
      workoutName: "Trail long run",
    },
    {
      discipline: "backpacking",
      reasoning: "Multi-day trip, heavy pack, elevation over a full day",
      utterance:
        "Day 2 of the JMT — 14 miles with 40 lb pack, 3,500 ft gain over Muir Pass.",
      workoutName: "JMT Day 2 — Muir Pass",
    },
    {
      discipline: "rucking",
      reasoning: "Structured loaded-march on road with defined pace and weight",
      utterance:
        "45 min ruck, 3 miles on road with a 35 lb pack. Held a 15 min/mi pace.",
      workoutName: "Road ruck",
    },
  ])(
    "routes mountain discipline $discipline through the full tool sequence",
    async ({ discipline, reasoning, utterance, workoutName }) => {
      vi.mocked(tools.detectDisciplineTool.execute).mockResolvedValueOnce({
        discipline,
        confidence: 0.93,
        method: "ai_detection",
        reasoning,
      });

      vi.mocked(tools.extractWorkoutDataTool.execute).mockResolvedValueOnce({
        workoutData: { workout_name: workoutName, discipline },
        completedAt: new Date(),
        generationMethod: "tool",
        userMessage: utterance,
      } as any);

      const mock = vi.mocked(callBedrockApiForAgent);
      mock
        .mockResolvedValueOnce(
          makeBedrockResponse(
            "tool_use",
            makeToolUseContent("detect_discipline"),
          ),
        )
        .mockResolvedValueOnce(
          makeBedrockResponse(
            "tool_use",
            makeToolUseContent("extract_workout_data"),
          ),
        )
        .mockResolvedValueOnce(
          makeBedrockResponse(
            "tool_use",
            makeToolUseContent("validate_workout_completeness"),
          ),
        )
        .mockResolvedValueOnce(
          makeBedrockResponse(
            "tool_use",
            makeToolUseContent("save_workout_to_database"),
          ),
        )
        .mockResolvedValueOnce(
          makeBedrockResponse(
            "end_turn",
            makeTextContent("Workout logged successfully!"),
          ),
        );

      const agent = new WorkoutLoggerAgent(makeContext());
      const result = await agent.logWorkout(utterance);

      expect(result.success).toBe(true);
      expect(tools.detectDisciplineTool.execute).toHaveBeenCalled();
      expect(tools.extractWorkoutDataTool.execute).toHaveBeenCalled();
      expect(tools.saveWorkoutToDatabaseTool.execute).toHaveBeenCalled();
    },
  );

  it("blocks normalize and save when validation returns shouldSave=false", async () => {
    // Override validateWorkoutCompletenessTool to return blocking result
    vi.mocked(tools.validateWorkoutCompletenessTool.execute).mockResolvedValue({
      isValid: false,
      shouldSave: false,
      shouldNormalize: false,
      confidence: 0.2,
      completeness: 0.1,
      validationFlags: [],
      blockingFlags: ["planning_request"],
      reason: "This looks like a future plan, not a completed workout",
    });

    const mock = vi.mocked(callBedrockApiForAgent);

    mock
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "tool_use",
          makeToolUseContent("validate_workout_completeness"),
        ),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "tool_use",
          makeToolUseContent("normalize_workout_data"),
        ),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "tool_use",
          makeToolUseContent("save_workout_to_database"),
        ),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse(
          "end_turn",
          makeTextContent("I couldn't log this - looks like a future plan."),
        ),
      );

    const agent = new WorkoutLoggerAgent(makeContext());
    const result = await agent.logWorkout("Tomorrow I plan to do 5x5 squats");

    // Save should NOT have been called (blocked by enforceValidationBlocking)
    expect(tools.saveWorkoutToDatabaseTool.execute).not.toHaveBeenCalled();
    // normalize should NOT have been called (also blocked)
    expect(tools.normalizeWorkoutDataTool.execute).not.toHaveBeenCalled();
    // Result should reflect validation failure
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.blockingFlags).toContain("planning_request");
  });
});
