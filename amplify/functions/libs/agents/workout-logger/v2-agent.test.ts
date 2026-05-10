import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/v2/runtime/sync-runtime", () => ({
  SyncRuntime: vi.fn().mockImplementation(function (this: any) {
    this.invokeTurn = vi.fn();
  }),
}));
vi.mock("./tools", () => ({
  detectDisciplineTool: makeToolMock("detect_discipline"),
  extractWorkoutDataTool: makeToolMock("extract_workout_data"),
  validateWorkoutCompletenessTool: makeToolMock(
    "validate_workout_completeness",
  ),
  normalizeWorkoutDataTool: makeToolMock("normalize_workout_data"),
  generateWorkoutSummaryTool: makeToolMock("generate_workout_summary"),
  saveWorkoutToDatabaseTool: makeToolMock("save_workout_to_database"),
  computeDateTool: makeToolMock("compute_date"),
}));
vi.mock("./prompts", () => ({
  buildWorkoutLoggerPrompt: vi.fn(() => "STATIC PROMPT"),
}));
vi.mock("../../api-helpers", () => ({
  MODEL_IDS: {
    PLANNER_MODEL_FULL: "test-planner",
    EXECUTOR_MODEL_FULL: "test-executor",
    CONTEXTUAL_MODEL_FULL: "test-contextual",
  },
  callBedrockApiForAgent: vi.fn(),
}));
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
vi.mock("../../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { WorkoutLoggerAgentV2, __test } from "./v2-agent";
import { SyncRuntime } from "../core/v2/runtime/sync-runtime";
import {
  detectDisciplineTool,
  extractWorkoutDataTool,
  validateWorkoutCompletenessTool,
  normalizeWorkoutDataTool,
  generateWorkoutSummaryTool,
  saveWorkoutToDatabaseTool,
  computeDateTool,
} from "./tools";

function makeToolMock(id: string) {
  return {
    id,
    description: `Mock for ${id}`,
    inputSchema: { type: "object", properties: {}, additionalProperties: true },
    execute: vi.fn(),
  };
}

const baseContext: any = {
  userId: "user_test",
  coachId: "coach_test",
  conversationId: "conv_test",
  coachConfig: { coach_name: "Mock Coach" },
  userTimezone: "America/Los_Angeles",
  imageS3Keys: [],
};

const turn = (assistantContent: any[], stopReason: string) => ({
  stopReason,
  assistantContent,
  usage: { inputTokens: 10, outputTokens: 5 },
  modelId: "test-planner",
});

const toolUseBlock = (toolUseId: string, name: string, input: any = {}) => ({
  toolUse: { toolUseId, name, input },
});

const wireRuntime = (turns: any[]) => {
  const runtimeInstance = (SyncRuntime as any).mock.instances.at(-1);
  runtimeInstance.invokeTurn = vi.fn(async () => {
    const next = turns.shift();
    if (!next) throw new Error("no more turns");
    return next;
  });
};

const ALL_TOOL_MOCKS = [
  detectDisciplineTool,
  extractWorkoutDataTool,
  validateWorkoutCompletenessTool,
  normalizeWorkoutDataTool,
  generateWorkoutSummaryTool,
  saveWorkoutToDatabaseTool,
  computeDateTool,
];

describe("WorkoutLoggerAgentV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ALL_TOOL_MOCKS.forEach((t: any) => t.execute.mockReset());
  });

  it("happy path: detect → extract → validate → summary → save → success", async () => {
    (detectDisciplineTool.execute as any).mockResolvedValue({
      discipline: "crossfit",
      confidence: 0.92,
    });
    (extractWorkoutDataTool.execute as any).mockResolvedValue({
      workoutData: {
        discipline: "crossfit",
        workout_name: "Fran",
        metadata: { data_confidence: 0.9 },
      },
      generationMethod: "tool",
      completedAt: new Date(),
    });
    (validateWorkoutCompletenessTool.execute as any).mockResolvedValue({
      isValid: true,
      shouldSave: true,
      shouldNormalize: false,
      confidence: 0.9,
      completeness: 1.0,
      validationFlags: [],
      blockingFlags: [],
    });
    (generateWorkoutSummaryTool.execute as any).mockResolvedValue({
      summary: "Logged Fran in 4:32",
    });
    (saveWorkoutToDatabaseTool.execute as any).mockResolvedValue({
      workoutId: "workout_abc",
      success: true,
      pineconeStored: true,
      pineconeRecordId: "rec_1",
    });

    const agent = new WorkoutLoggerAgentV2(baseContext);
    wireRuntime([
      turn([toolUseBlock("u1", "detect_discipline", {})], "tool_use"),
      turn([toolUseBlock("u2", "extract_workout_data", {})], "tool_use"),
      turn(
        [toolUseBlock("u3", "validate_workout_completeness", {})],
        "tool_use",
      ),
      turn(
        [toolUseBlock("u4", "generate_workout_summary", {})],
        "tool_use",
      ),
      turn([toolUseBlock("u5", "save_workout_to_database", {})], "tool_use"),
      turn([{ text: "Workout logged." }], "end_turn"),
    ]);

    const result = await agent.logWorkout("Did Fran in 4:32");
    expect(result.success).toBe(true);
    expect(result.workoutId).toBe("workout_abc");
    expect(result.discipline).toBe("crossfit");
    expect(result.workoutName).toBe("Fran");
    expect(saveWorkoutToDatabaseTool.execute).toHaveBeenCalledTimes(1);
  });

  it("multi-workout: index middleware places each call at its workoutIndex; allWorkouts aggregates the saves", async () => {
    (detectDisciplineTool.execute as any).mockImplementation(
      async (input: any) => ({
        discipline: input.discipline ?? "crossfit",
      }),
    );
    let extractIdx = 0;
    (extractWorkoutDataTool.execute as any).mockImplementation(async () => ({
      workoutData: {
        discipline: "crossfit",
        workout_name: `Workout ${extractIdx++}`,
        metadata: { data_confidence: 0.85 },
      },
      generationMethod: "tool",
    }));
    (validateWorkoutCompletenessTool.execute as any).mockResolvedValue({
      isValid: true,
      shouldSave: true,
      shouldNormalize: false,
      confidence: 0.9,
      completeness: 1.0,
      blockingFlags: [],
    });
    (generateWorkoutSummaryTool.execute as any).mockResolvedValue({
      summary: "ok",
    });
    let saveIdx = 0;
    (saveWorkoutToDatabaseTool.execute as any).mockImplementation(async () => ({
      workoutId: `workout_${saveIdx++}`,
      success: true,
      pineconeStored: true,
    }));

    const agent = new WorkoutLoggerAgentV2(baseContext);
    wireRuntime([
      // Three detect_discipline calls — sequential, append via middleware
      turn(
        [
          toolUseBlock("u1", "detect_discipline", {}),
          toolUseBlock("u2", "detect_discipline", {}),
          toolUseBlock("u3", "detect_discipline", {}),
        ],
        "tool_use",
      ),
      // Three extract calls
      turn(
        [
          toolUseBlock("u4", "extract_workout_data", {}),
          toolUseBlock("u5", "extract_workout_data", {}),
          toolUseBlock("u6", "extract_workout_data", {}),
        ],
        "tool_use",
      ),
      // Three validate calls with explicit workoutIndex
      turn(
        [
          toolUseBlock("u7", "validate_workout_completeness", {
            workoutIndex: 0,
          }),
          toolUseBlock("u8", "validate_workout_completeness", {
            workoutIndex: 1,
          }),
          toolUseBlock("u9", "validate_workout_completeness", {
            workoutIndex: 2,
          }),
        ],
        "tool_use",
      ),
      // Three summary calls
      turn(
        [
          toolUseBlock("u10", "generate_workout_summary", { workoutIndex: 0 }),
          toolUseBlock("u11", "generate_workout_summary", { workoutIndex: 1 }),
          toolUseBlock("u12", "generate_workout_summary", { workoutIndex: 2 }),
        ],
        "tool_use",
      ),
      // Three save calls
      turn(
        [
          toolUseBlock("u13", "save_workout_to_database", { workoutIndex: 0 }),
          toolUseBlock("u14", "save_workout_to_database", { workoutIndex: 1 }),
          toolUseBlock("u15", "save_workout_to_database", { workoutIndex: 2 }),
        ],
        "tool_use",
      ),
      turn([{ text: "All three logged." }], "end_turn"),
    ]);

    const result = await agent.logWorkout("Did 3 workouts back-to-back");
    expect(result.success).toBe(true);
    expect(saveWorkoutToDatabaseTool.execute).toHaveBeenCalledTimes(3);
    expect(result.allWorkouts).toBeDefined();
    expect(result.allWorkouts).toHaveLength(3);
    expect(result.allWorkouts!.map((w) => w.workoutId)).toEqual([
      "workout_0",
      "workout_1",
      "workout_2",
    ]);

    // Confirm the index middleware placed each call at its assigned slot
    // (rather than collapsing to a single replace under the alias key).
    const store = (agent as any).agent.getResultStore();
    expect(store.getAll("save")).toHaveLength(3);
    expect(store.getAll("validation")).toHaveLength(3);
    expect(store.getAll("extraction")).toHaveLength(3);
  });

  it("blocks normalize + save when validation returns shouldSave:false (planning detection)", async () => {
    (detectDisciplineTool.execute as any).mockResolvedValue({
      discipline: "crossfit",
    });
    (extractWorkoutDataTool.execute as any).mockResolvedValue({
      workoutData: { discipline: "crossfit", workout_name: "?" },
      generationMethod: "tool",
    });
    (validateWorkoutCompletenessTool.execute as any).mockResolvedValue({
      isValid: false,
      shouldSave: false,
      shouldNormalize: false,
      confidence: 0.4,
      completeness: 0.1,
      blockingFlags: ["planning_inquiry"],
      reason: "User is planning a future workout, not logging a completed one",
    });
    (saveWorkoutToDatabaseTool.execute as any).mockResolvedValue({
      workoutId: "should_not_save",
      success: true,
    });

    const agent = new WorkoutLoggerAgentV2(baseContext);
    wireRuntime([
      turn([toolUseBlock("u1", "detect_discipline", {})], "tool_use"),
      turn([toolUseBlock("u2", "extract_workout_data", {})], "tool_use"),
      turn(
        [toolUseBlock("u3", "validate_workout_completeness", {})],
        "tool_use",
      ),
      // Claude attempts to save anyway — must be blocked by policy.
      turn([toolUseBlock("u4", "save_workout_to_database", {})], "tool_use"),
      turn(
        [{ text: "⚠️ This is planning, not a completed workout." }],
        "end_turn",
      ),
    ]);

    const result = await agent.logWorkout(
      "Thinking about doing 5x5 squats tomorrow",
    );
    expect(saveWorkoutToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.blockingFlags).toEqual(["planning_inquiry"]);
    expect(result.reason).toMatch(/planning|future/i);
  });

  it("blocks save when validate throws an exception (defense-in-depth)", async () => {
    (detectDisciplineTool.execute as any).mockResolvedValue({
      discipline: "crossfit",
    });
    (extractWorkoutDataTool.execute as any).mockResolvedValue({
      workoutData: { discipline: "crossfit", workout_name: "Fran" },
    });
    (validateWorkoutCompletenessTool.execute as any).mockRejectedValue(
      new Error("validation lambda 500"),
    );
    (saveWorkoutToDatabaseTool.execute as any).mockResolvedValue({
      workoutId: "should_not_save",
      success: true,
    });

    const agent = new WorkoutLoggerAgentV2(baseContext);
    wireRuntime([
      turn([toolUseBlock("u1", "detect_discipline", {})], "tool_use"),
      turn([toolUseBlock("u2", "extract_workout_data", {})], "tool_use"),
      turn(
        [toolUseBlock("u3", "validate_workout_completeness", {})],
        "tool_use",
      ),
      turn([toolUseBlock("u4", "save_workout_to_database", {})], "tool_use"),
      turn([{ text: "Validation threw." }], "end_turn"),
    ]);

    const result = await agent.logWorkout("Did Fran");
    expect(saveWorkoutToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("returns skipped:false on infrastructure timeout (so the handler doesn't conflate it with user rejection)", async () => {
    // The v1 tool itself doesn't have access to `ctx.signal` — the
    // legacy adapter doesn't pass it through (it gives v1 tools the
    // augmented agentContext instead). So we hang the promise and let
    // the scheduler's timer + AbortController fire, which lands a
    // `{ ok: false, code: "timeout" }` envelope in the result store.
    (detectDisciplineTool.execute as any).mockResolvedValue({
      discipline: "crossfit",
    });
    (extractWorkoutDataTool.execute as any).mockImplementation(
      () => new Promise(() => {}), // never resolves; relies on scheduler timeout
    );

    const agent = new WorkoutLoggerAgentV2(baseContext);
    // Reduce extract timeout to 20ms for test speed (vs the production
    // 180s ceiling). Pass-through to the underlying tool config.
    const innerAgent = (agent as any).agent;
    const extractTool = innerAgent.config.tools.find(
      (t: any) => t.id === "extract_workout_data",
    );
    extractTool.timeoutMs = 20;

    wireRuntime([
      turn([toolUseBlock("u1", "detect_discipline", {})], "tool_use"),
      turn([toolUseBlock("u2", "extract_workout_data", {})], "tool_use"),
      // After first timeout, shouldRetry's tool_timeout branch fires →
      // the agent runs one more round with a fresh prompt.
      turn(
        [{ text: "I had trouble extracting the workout details." }],
        "end_turn",
      ),
      // Retry round: extract times out again, model gives up.
      turn([toolUseBlock("u3", "extract_workout_data", {})], "tool_use"),
      turn([{ text: "Still couldn't extract." }], "end_turn"),
    ]);

    const result = await agent.logWorkout("Did some lift");
    // Timeout retry was triggered, but extraction kept timing out, so
    // the run ends with the timeout envelope still in the store.
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.reason).toMatch(/infrastructure|timeout|retry/i);
  });

  it("returns skipped result with the agent response when no tools are called", async () => {
    const agent = new WorkoutLoggerAgentV2(baseContext);
    wireRuntime([
      turn(
        [
          {
            text:
              "Could you tell me what exercises you did and how many sets and reps?",
          },
        ],
        "end_turn",
      ),
      // Retry round (incomplete-workflow path triggers because finalText
      // matches the question pattern). Still no tools called.
      turn(
        [{ text: "I still need clarification on the workout." }],
        "end_turn",
      ),
    ]);

    const result = await agent.logWorkout("did stuff");
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
  });

  it("does not retry when Claude correctly identifies non-workout content (valid blocking response)", async () => {
    const agent = new WorkoutLoggerAgentV2(baseContext);
    wireRuntime([
      // Claude blocks without tools — finalText matches isValidBlockingResponse.
      turn(
        [
          {
            text:
              "⚠️ This message is asking about a future workout, not logging a completed one. I can't log a planning request.",
          },
        ],
        "end_turn",
      ),
      // No second turn — if the retry policy fires we'd hit "no more turns".
    ]);

    const result = await agent.logWorkout(
      "What should I do for legs tomorrow?",
    );
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    // Asserting the runtime was only called once verifies retry was suppressed.
    const runtimeInstance = (SyncRuntime as any).mock.instances.at(-1);
    expect(runtimeInstance.invokeTurn).toHaveBeenCalledTimes(1);
  });

  it("surfaces duplicate-skip with existing workoutId when templateLinked", async () => {
    (detectDisciplineTool.execute as any).mockResolvedValue({
      discipline: "crossfit",
    });
    (extractWorkoutDataTool.execute as any).mockResolvedValue({
      workoutData: { discipline: "crossfit", workout_name: "Fran" },
    });
    (validateWorkoutCompletenessTool.execute as any).mockResolvedValue({
      isValid: true,
      shouldSave: true,
      shouldNormalize: false,
      confidence: 0.9,
      completeness: 1,
      blockingFlags: [],
    });
    (generateWorkoutSummaryTool.execute as any).mockResolvedValue({
      summary: "ok",
    });
    (saveWorkoutToDatabaseTool.execute as any).mockResolvedValue({
      workoutId: "",
      success: false,
      duplicate: true,
      skipped: true,
      existingWorkoutId: "workout_existing_123",
      templateLinked: true,
      reason: "Workout already exists; relinked template to existing entry.",
    });

    const agent = new WorkoutLoggerAgentV2({
      ...baseContext,
      templateContext: { templateId: "tpl_1" },
    });
    wireRuntime([
      turn([toolUseBlock("u1", "detect_discipline", {})], "tool_use"),
      turn([toolUseBlock("u2", "extract_workout_data", {})], "tool_use"),
      turn(
        [toolUseBlock("u3", "validate_workout_completeness", {})],
        "tool_use",
      ),
      turn(
        [toolUseBlock("u4", "generate_workout_summary", {})],
        "tool_use",
      ),
      turn([toolUseBlock("u5", "save_workout_to_database", {})], "tool_use"),
      turn([{ text: "Already exists." }], "end_turn"),
    ]);

    const result = await agent.logWorkout("Did Fran");
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    // Critical: when templateLinked is true, the existing workoutId
    // must be surfaced so the handler doesn't revert the optimistic
    // template "completed" status.
    expect(result.workoutId).toBe("workout_existing_123");
    expect(result.reason).toMatch(/already exists/i);
  });
});

describe("isValidBlockingResponse / isIncompleteWorkflow regex catalogs", () => {
  // Sanity checks — these patterns came from v1 production tuning and
  // we want a fast signal if the migration accidentally trims one.
  it("recognises ⚠️ + workout context as a valid block", () => {
    expect(__test.isValidBlockingResponse("⚠️ Not a valid workout log")).toBe(
      true,
    );
  });

  it("recognises planning intent as a valid block", () => {
    expect(
      __test.isValidBlockingResponse(
        "This is a planning question about future training.",
      ),
    ).toBe(true);
  });

  it("does not flag a normal save acknowledgement as a block", () => {
    expect(__test.isValidBlockingResponse("Workout logged successfully.")).toBe(
      false,
    );
  });

  it("flags '?' as incomplete", () => {
    expect(__test.isIncompleteWorkflow("How many sets did you do?")).toBe(true);
  });

  it("flags 'Could you provide' as incomplete", () => {
    expect(
      __test.isIncompleteWorkflow(
        "Could you provide more details about the workout",
      ),
    ).toBe(true);
  });

  it("does not flag a normal description as incomplete", () => {
    expect(__test.isIncompleteWorkflow("Logged your workout.")).toBe(false);
  });
});
