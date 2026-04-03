import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../../api-helpers", () => ({
  callBedrockApiForAgent: vi.fn(),
  MODEL_IDS: { PLANNER_MODEL_FULL: "test-model" },
}));

vi.mock("./prompts", () => ({
  buildProgramDesignerPrompt: vi.fn().mockReturnValue("test program designer prompt"),
}));

vi.mock("./tools", () => ({
  loadProgramRequirementsTool: {
    id: "load_program_requirements",
    description: "Loads requirements",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      requirements: { trainingGoals: "strength", programDuration: "8 weeks" },
    }),
  },
  generatePhaseStructureTool: {
    id: "generate_phase_structure",
    description: "Generates phases",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      phases: [{ phaseId: "p1", name: "Foundation", startDay: 1, endDay: 28 }],
    }),
  },
  generatePhaseWorkoutsTool: {
    id: "generate_phase_workouts",
    description: "Generates phase workouts",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      workouts: [{ templateId: "t1", dayNumber: 1, name: "Squat Day" }],
    }),
  },
  validateProgramStructureTool: {
    id: "validate_program_structure",
    description: "Validates structure",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      isValid: true,
      validationIssues: [],
      shouldPrune: false,
    }),
  },
  pruneExcessWorkoutsTool: {
    id: "prune_excess_workouts",
    description: "Prunes excess workouts",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({ pruned: true, removedCount: 0 }),
  },
  normalizeProgramDataTool: {
    id: "normalize_program_data",
    description: "Normalizes program",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      isValid: true,
      issuesFound: 0,
      correctionsMade: 0,
    }),
  },
  generateProgramSummaryTool: {
    id: "generate_program_summary",
    description: "Generates summary",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({ summary: "8-week strength program" }),
  },
  saveProgramToDatabaseTool: {
    id: "save_program_to_database",
    description: "Saves program",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      programId: "prog_user1_123456",
      success: true,
      totalDays: 56,
      startDate: "2025-01-01",
      endDate: "2025-02-25",
      pineconeStored: true,
      pineconeRecordId: "vec_789",
    }),
  },
}));

vi.mock("../../streaming/multimodal-helpers", () => ({
  buildMultimodalContent: vi.fn(),
}));

// Import after mocks
import { ProgramDesignerAgent } from "./agent";
import { callBedrockApiForAgent } from "../../api-helpers";
import * as tools from "./tools";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeBedrockResponse = (stopReason: string, content: any[] = []): any => ({
  stopReason,
  output: { message: { role: "assistant", content } },
  usage: { inputTokens: 30, outputTokens: 15 },
});

const makeToolUseContent = (toolId: string, input: any = {}): any[] => [
  { toolUse: { toolUseId: `use-${toolId}`, name: toolId, input } },
];

const makeTextContent = (text: string): any[] => [{ text }];

// ─── Factories ────────────────────────────────────────────────────────────────

const makeContext = () => ({
  userId: "user-test",
  coachId: "coach-test",
  programId: "prog-test",
  sessionId: "session-test",
  todoList: {
    trainingGoals: { value: "strength", confirmed: true },
    programDuration: { value: "8 weeks", confirmed: true },
    trainingFrequency: { value: 4, confirmed: true },
  },
  conversationContext: "User wants a strength program",
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProgramDesignerAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-initialize tool mocks whose implementations may have been changed by prior tests.
    // vi.clearAllMocks() clears call history but NOT implementations, so individual tests
    // that override a mock (e.g. isValid: false) will pollute subsequent tests.
    vi.mocked(tools.normalizeProgramDataTool.execute).mockResolvedValue({
      isValid: true,
      issuesFound: 0,
      correctionsMade: 0,
    } as any);
    vi.mocked(tools.validateProgramStructureTool.execute).mockResolvedValue({
      isValid: true,
      validationIssues: [],
      shouldPrune: false,
    } as any);
    vi.mocked(tools.pruneExcessWorkoutsTool.execute).mockResolvedValue({
      pruned: true,
      removedCount: 0,
    } as any);
  });

  // ─── Instantiation ────────────────────────────────────────────────────────

  it("instantiates without throwing", () => {
    expect(() => new ProgramDesignerAgent(makeContext())).not.toThrow();
  });

  // ─── No-tools path ────────────────────────────────────────────────────────

  it("returns skipped when Bedrock returns end_turn without tools", async () => {
    vi.mocked(callBedrockApiForAgent).mockResolvedValue(
      makeBedrockResponse("end_turn", makeTextContent("Could you clarify your goals?")),
    );

    const agent = new ProgramDesignerAgent(makeContext());
    const result = await agent.designProgram();

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
  });

  // ─── Error handling ──────────────────────────────────────────────────────

  it("returns skipped with error reason when Bedrock throws", async () => {
    vi.mocked(callBedrockApiForAgent).mockRejectedValue(
      new Error("Timeout connecting to Bedrock"),
    );

    const agent = new ProgramDesignerAgent(makeContext());
    const result = await agent.designProgram();

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("Timeout connecting to Bedrock");
  });

  // ─── Happy path ──────────────────────────────────────────────────────────

  it("returns success when tool sequence completes and program is saved", async () => {
    const mock = vi.mocked(callBedrockApiForAgent);

    mock
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("load_program_requirements")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("generate_phase_structure")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("generate_phase_workouts")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("validate_program_structure")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("normalize_program_data")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("save_program_to_database")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("end_turn", makeTextContent("Program created!")),
      );

    const agent = new ProgramDesignerAgent(makeContext());
    const result = await agent.designProgram();

    expect(result.success).toBe(true);
    expect(result.programId).toBe("prog_user1_123456");
    expect(tools.saveProgramToDatabaseTool.execute).toHaveBeenCalled();
  });

  // ─── Validation blocks save ───────────────────────────────────────────────

  it("blocks save when validation returns isValid=false", async () => {
    vi.mocked(tools.validateProgramStructureTool.execute).mockResolvedValue({
      isValid: false,
      validationIssues: ["no phases defined"],
      shouldPrune: false,
    });

    const mock = vi.mocked(callBedrockApiForAgent);

    mock
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("validate_program_structure")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("normalize_program_data")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("save_program_to_database")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("end_turn", makeTextContent("Validation failed.")),
      );

    const agent = new ProgramDesignerAgent(makeContext());
    const result = await agent.designProgram();

    // Save should NOT have been called (blocked by enforceAllBlocking)
    expect(tools.saveProgramToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  // ─── Normalization blocks save ────────────────────────────────────────────

  it("blocks save when normalization returns isValid=false", async () => {
    vi.mocked(tools.normalizeProgramDataTool.execute).mockResolvedValue({
      isValid: false,
      issuesFound: 5,
      correctionsMade: 2,
    });

    const mock = vi.mocked(callBedrockApiForAgent);

    mock
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("validate_program_structure")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("normalize_program_data")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("save_program_to_database")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("end_turn", makeTextContent("Normalization failed.")),
      );

    const agent = new ProgramDesignerAgent(makeContext());
    const result = await agent.designProgram();

    expect(tools.saveProgramToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  // ─── Pruning failure is best-effort (save still proceeds) ────────────────

  it("allows save to proceed even when pruning fails (best-effort)", async () => {
    vi.mocked(tools.pruneExcessWorkoutsTool.execute).mockRejectedValue(
      new Error("Pruning error"),
    );

    const mock = vi.mocked(callBedrockApiForAgent);

    mock
      .mockResolvedValueOnce(
        // Validation says shouldPrune=true
        makeBedrockResponse("tool_use", makeToolUseContent("validate_program_structure")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("prune_excess_workouts")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("normalize_program_data")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("save_program_to_database")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("end_turn", makeTextContent("Program saved despite pruning failure.")),
      );

    // Validation says shouldPrune=true but everything else is valid
    vi.mocked(tools.validateProgramStructureTool.execute).mockResolvedValue({
      isValid: true,
      validationIssues: [],
      shouldPrune: true,
      pruningMetadata: { currentTrainingDays: 40, targetTrainingDays: 24 },
    });

    const agent = new ProgramDesignerAgent(makeContext());
    const result = await agent.designProgram();

    // Save SHOULD proceed despite pruning error (pruning is best-effort)
    expect(tools.saveProgramToDatabaseTool.execute).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
