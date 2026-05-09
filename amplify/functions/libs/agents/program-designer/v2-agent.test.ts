import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/v2/runtime/sync-runtime", () => ({
  SyncRuntime: vi.fn().mockImplementation(function (this: any) {
    this.invokeTurn = vi.fn();
  }),
}));
vi.mock("./tools", () => ({
  loadProgramRequirementsTool: makeToolMock("load_program_requirements"),
  generatePhaseStructureTool: makeToolMock("generate_phase_structure"),
  generatePhaseWorkoutsTool: makeToolMock("generate_phase_workouts"),
  validateProgramStructureTool: makeToolMock("validate_program_structure"),
  pruneExcessWorkoutsTool: makeToolMock("prune_excess_workouts"),
  normalizeProgramDataTool: makeToolMock("normalize_program_data"),
  generateProgramSummaryTool: makeToolMock("generate_program_summary"),
  saveProgramToDatabaseTool: makeToolMock("save_program_to_database"),
}));
vi.mock("./prompts", () => ({
  buildProgramDesignerPrompt: vi.fn(() => "STATIC PROMPT"),
}));
vi.mock("./helpers", async () => {
  const actual = await vi.importActual<any>("./helpers");
  return {
    ...actual,
    // Use real enforceAllBlocking + calculateProgramMetrics; mocks would
    // hide migration parity bugs.
  };
});
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

import { ProgramDesignerAgentV2 } from "./v2-agent";
import { SyncRuntime } from "../core/v2/runtime/sync-runtime";
import {
  loadProgramRequirementsTool,
  generatePhaseStructureTool,
  generatePhaseWorkoutsTool,
  validateProgramStructureTool,
  pruneExcessWorkoutsTool,
  normalizeProgramDataTool,
  generateProgramSummaryTool,
  saveProgramToDatabaseTool,
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
  programId: "program_test",
  sessionId: "session_test",
  todoList: {
    trainingGoals: { value: "Strength + conditioning" },
    programDuration: { value: "4 weeks" },
    trainingFrequency: { value: "4x/week" },
    trainingMethodology: { value: "balanced" },
  },
  conversationContext: "User wants to build strength and stay conditioned",
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

describe("ProgramDesignerAgentV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    [
      loadProgramRequirementsTool,
      generatePhaseStructureTool,
      generatePhaseWorkoutsTool,
      validateProgramStructureTool,
      pruneExcessWorkoutsTool,
      normalizeProgramDataTool,
      generateProgramSummaryTool,
      saveProgramToDatabaseTool,
    ].forEach((t: any) => t.execute.mockReset());
  });

  it("happy path: load → phase_structure → phase_workouts (3 phases) → validate → save → success", async () => {
    (loadProgramRequirementsTool.execute as any).mockResolvedValue({
      programDuration: 28,
      trainingFrequency: 4,
    });
    (generatePhaseStructureTool.execute as any).mockResolvedValue({
      phases: [
        { phaseId: "phase_1" },
        { phaseId: "phase_2" },
        { phaseId: "phase_3" },
      ],
    });
    // Three parallel calls — each returns workoutTemplates for its phase.
    let phaseCallIdx = 0;
    (generatePhaseWorkoutsTool.execute as any).mockImplementation(
      async (input: any) => {
        phaseCallIdx++;
        return {
          workoutTemplates: [
            { id: `wt_${input.phase.phaseId}_1`, day: 1 },
            { id: `wt_${input.phase.phaseId}_2`, day: 3 },
          ],
        };
      },
    );
    (validateProgramStructureTool.execute as any).mockResolvedValue({
      isValid: true,
      shouldNormalize: false,
      shouldPrune: false,
    });
    (generateProgramSummaryTool.execute as any).mockResolvedValue({
      summary: "Looks great",
    });
    (saveProgramToDatabaseTool.execute as any).mockResolvedValue({
      success: true,
      programId: "program_test_123",
      name: "4-Week Strength + conditioning",
      startDate: "2026-05-10",
      endDate: "2026-06-07",
      pineconeRecordId: "rec_1",
      s3Key: "programs/program_test_123.json",
    });

    const agent = new ProgramDesignerAgentV2(baseContext);
    wireRuntime([
      turn([toolUseBlock("u1", "load_program_requirements", {})], "tool_use"),
      turn([toolUseBlock("u2", "generate_phase_structure", {})], "tool_use"),
      // Three phase calls in one tool_use turn — exercise parallelSafe.
      turn(
        [
          toolUseBlock("u3", "generate_phase_workouts", {
            phase: { phaseId: "phase_1" },
          }),
          toolUseBlock("u4", "generate_phase_workouts", {
            phase: { phaseId: "phase_2" },
          }),
          toolUseBlock("u5", "generate_phase_workouts", {
            phase: { phaseId: "phase_3" },
          }),
        ],
        "tool_use",
      ),
      turn([toolUseBlock("u6", "validate_program_structure", {})], "tool_use"),
      turn([toolUseBlock("u7", "generate_program_summary", {})], "tool_use"),
      turn([toolUseBlock("u8", "save_program_to_database", {})], "tool_use"),
      turn([{ text: "Program designed." }], "end_turn"),
    ]);

    const result = await agent.designProgram();
    expect(result.success).toBe(true);
    expect(result.programId).toBe("program_test_123");
    expect(result.programName).toBe("4-Week Strength + conditioning");
    expect(result.phaseCount).toBe(3);
    expect(result.totalWorkoutTemplates).toBe(6);
    expect(result.generationMethod).toBe("agent_v2");
    expect(generatePhaseWorkoutsTool.execute).toHaveBeenCalledTimes(3);
    expect(saveProgramToDatabaseTool.execute).toHaveBeenCalledTimes(1);
  });

  it("phase_workouts middleware writes each phase under phase_workouts:{phaseId}", async () => {
    (loadProgramRequirementsTool.execute as any).mockResolvedValue({
      programDuration: 28,
      trainingFrequency: 3,
    });
    (generatePhaseStructureTool.execute as any).mockResolvedValue({
      phases: [{ phaseId: "phase_alpha" }, { phaseId: "phase_beta" }],
    });
    (generatePhaseWorkoutsTool.execute as any).mockImplementation(
      async (input: any) => ({
        // Tag the result so we can identify which call landed where.
        phaseTag: input.phase.phaseId,
        workoutTemplates: [],
      }),
    );

    const agent = new ProgramDesignerAgentV2(baseContext);
    wireRuntime([
      turn([toolUseBlock("u1", "load_program_requirements", {})], "tool_use"),
      turn([toolUseBlock("u2", "generate_phase_structure", {})], "tool_use"),
      turn(
        [
          toolUseBlock("u3", "generate_phase_workouts", {
            phase: { phaseId: "phase_alpha" },
          }),
          toolUseBlock("u4", "generate_phase_workouts", {
            phase: { phaseId: "phase_beta" },
          }),
        ],
        "tool_use",
      ),
      turn([{ text: "Stopping here." }], "end_turn"),
    ]);
    await agent.designProgram();

    const store = (agent as any).agent.getResultStore();
    expect(store.get("phase_workouts:phase_alpha")).toMatchObject({
      phaseTag: "phase_alpha",
    });
    expect(store.get("phase_workouts:phase_beta")).toMatchObject({
      phaseTag: "phase_beta",
    });
  });

  it("prune_excess_workouts middleware applies phaseUpdates back to phase keys", async () => {
    (pruneExcessWorkoutsTool.execute as any).mockResolvedValue({
      pruningApplied: true,
      phaseUpdates: [
        {
          storageKey: "phase_workouts:phase_1",
          updatedResult: { workoutTemplates: [{ id: "pruned_1" }] },
        },
        {
          storageKey: "phase_workouts:phase_2",
          updatedResult: { workoutTemplates: [{ id: "pruned_2" }] },
        },
      ],
    });

    const agent = new ProgramDesignerAgentV2(baseContext);
    wireRuntime([
      turn([toolUseBlock("u1", "prune_excess_workouts", {})], "tool_use"),
      turn([{ text: "Pruned." }], "end_turn"),
    ]);
    await agent.designProgram();

    const store = (agent as any).agent.getResultStore();
    expect(store.get("phase_workouts:phase_1")).toEqual({
      workoutTemplates: [{ id: "pruned_1" }],
    });
    expect(store.get("phase_workouts:phase_2")).toEqual({
      workoutTemplates: [{ id: "pruned_2" }],
    });
  });

  it("blocks save_program_to_database when validation returns isValid:false", async () => {
    (validateProgramStructureTool.execute as any).mockResolvedValue({
      isValid: false,
      validationIssues: ["phase 2 has no workouts"],
    });
    (saveProgramToDatabaseTool.execute as any).mockResolvedValue({
      success: true,
      programId: "should_not_save",
    });

    const agent = new ProgramDesignerAgentV2(baseContext);
    wireRuntime([
      turn(
        [toolUseBlock("u1", "validate_program_structure", {})],
        "tool_use",
      ),
      turn([toolUseBlock("u2", "save_program_to_database", {})], "tool_use"),
      turn([{ text: "Validation failed." }], "end_turn"),
    ]);

    const result = await agent.designProgram();
    expect(saveProgramToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toMatch(/Program validation failed/);
    expect(result.blockingFlags).toEqual(["phase 2 has no workouts"]);
  });

  it("blocks save when validate throws an exception (defense-in-depth)", async () => {
    (validateProgramStructureTool.execute as any).mockRejectedValue(
      new Error("validation lambda timed out"),
    );
    (saveProgramToDatabaseTool.execute as any).mockResolvedValue({
      success: true,
      programId: "should_not_save",
    });

    const agent = new ProgramDesignerAgentV2(baseContext);
    wireRuntime([
      turn(
        [toolUseBlock("u1", "validate_program_structure", {})],
        "tool_use",
      ),
      turn([toolUseBlock("u2", "save_program_to_database", {})], "tool_use"),
      turn([{ text: "Validation threw." }], "end_turn"),
    ]);

    const result = await agent.designProgram();
    expect(saveProgramToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("returns skipped result with the agent response when no tools are called", async () => {
    const agent = new ProgramDesignerAgentV2(baseContext);
    wireRuntime([
      turn(
        [{ text: "I need more info before I can design a program." }],
        "end_turn",
      ),
      turn(
        [{ text: "Still need clarification on goals." }],
        "end_turn",
      ),
    ]);

    const result = await agent.designProgram();
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    // First-turn text is captured as the reason via the agent's
    // lastTurnResponseText snapshot (or the initial finalText).
    expect(result.reason).toMatch(/clarification|more info/i);
  });
});
