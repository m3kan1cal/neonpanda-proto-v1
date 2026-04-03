import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../../api-helpers", () => ({
  callBedrockApiForAgent: vi.fn(),
  MODEL_IDS: { PLANNER_MODEL_FULL: "test-model" },
}));

vi.mock("./prompts", () => ({
  buildCoachCreatorPrompt: vi.fn().mockReturnValue("test coach creator prompt"),
}));

vi.mock("./tools", () => ({
  loadSessionRequirementsTool: {
    id: "load_session_requirements",
    description: "Loads session",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      session: { primaryGoals: "strength" },
      safetyProfile: {},
      methodologyPreferences: {},
      genderPreference: "neutral",
      trainingFrequency: 4,
      goalTimeline: "3 months",
      preferredIntensity: "moderate",
      specializations: [],
      sessionSummary: "User wants strength",
    }),
  },
  selectPersonalityTemplateTool: {
    id: "select_personality_template",
    description: "Selects personality",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      primaryTemplate: "motivating_mentor",
      secondaryInfluences: [],
      selectionReasoning: "Good fit",
      blendingWeights: { primary: 0.7, secondary: 0.3 },
    }),
  },
  selectMethodologyTemplateTool: {
    id: "select_methodology_template",
    description: "Selects methodology",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      primaryMethodology: "strength_fundamentals",
      methodologyReasoning: "Good fit",
      programmingEmphasis: "strength",
      periodizationApproach: "linear",
      creativityEmphasis: "balanced",
      workoutInnovation: "moderate",
    }),
  },
  generateCoachPromptsTool: {
    id: "generate_coach_prompts",
    description: "Generates prompts",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      personalityPrompt: "You are a motivating coach",
      safetyIntegratedPrompt: "Safety first",
      motivationPrompt: "Keep going!",
      methodologyPrompt: "Use strength fundamentals",
      communicationStyle: "direct",
      learningAdaptationPrompt: "Adapt based on feedback",
      genderTonePrompt: "Neutral tone",
    }),
  },
  assembleCoachConfigTool: {
    id: "assemble_coach_config",
    description: "Assembles config",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      coach_id: "coach_user1_123456",
      coach_name: "Alex",
      status: "active",
    }),
  },
  validateCoachConfigTool: {
    id: "validate_coach_config",
    description: "Validates config",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      isValid: true,
      validationIssues: [],
      confidence: 0.95,
    }),
  },
  normalizeCoachConfigTool: {
    id: "normalize_coach_config",
    description: "Normalizes config",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({ normalized: true }),
  },
  saveCoachConfigToDatabaseTool: {
    id: "save_coach_config_to_database",
    description: "Saves config",
    inputSchema: {},
    execute: vi.fn().mockResolvedValue({
      coachConfigId: "coach_user1_123456",
      coachName: "Alex",
      success: true,
      pineconeStored: true,
      pineconeRecordId: "vec_456",
    }),
  },
}));

vi.mock("../../streaming/multimodal-helpers", () => ({
  buildMultimodalContent: vi.fn(),
}));

// Import after mocks
import { CoachCreatorAgent } from "./agent";
import { callBedrockApiForAgent } from "../../api-helpers";
import * as tools from "./tools";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeBedrockResponse = (stopReason: string, content: any[] = []): any => ({
  stopReason,
  output: { message: { role: "assistant", content } },
  usage: { inputTokens: 20, outputTokens: 10 },
});

const makeToolUseContent = (toolId: string, input: any = {}): any[] => [
  { toolUse: { toolUseId: `use-${toolId}`, name: toolId, input } },
];

const makeTextContent = (text: string): any[] => [{ text }];

// ─── Factories ────────────────────────────────────────────────────────────────

const makeContext = () => ({
  userId: "user-test",
  sessionId: "session-test",
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CoachCreatorAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Instantiation ────────────────────────────────────────────────────────

  it("instantiates without throwing", () => {
    expect(() => new CoachCreatorAgent(makeContext())).not.toThrow();
  });

  // ─── No-tools path ────────────────────────────────────────────────────────

  it("returns skipped when Bedrock returns end_turn without tools", async () => {
    vi.mocked(callBedrockApiForAgent).mockResolvedValue(
      makeBedrockResponse("end_turn", makeTextContent("I need clarification.")),
    );

    const agent = new CoachCreatorAgent(makeContext());
    const result = await agent.createCoach();

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
  });

  // ─── Error handling ──────────────────────────────────────────────────────

  it("returns skipped with error reason when Bedrock throws", async () => {
    vi.mocked(callBedrockApiForAgent).mockRejectedValue(
      new Error("Service error"),
    );

    const agent = new CoachCreatorAgent(makeContext());
    const result = await agent.createCoach();

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("Service error");
  });

  // ─── Happy path ──────────────────────────────────────────────────────────

  it("returns success when save tool executes successfully", async () => {
    const mock = vi.mocked(callBedrockApiForAgent);

    mock
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("load_session_requirements")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", [
          ...makeToolUseContent("select_personality_template"),
          ...makeToolUseContent("select_methodology_template"),
        ]),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("generate_coach_prompts")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("assemble_coach_config")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("validate_coach_config")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("save_coach_config_to_database")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("end_turn", makeTextContent("Coach created successfully!")),
      );

    const agent = new CoachCreatorAgent(makeContext());
    const result = await agent.createCoach();

    expect(result.success).toBe(true);
    expect(result.coachConfigId).toBe("coach_user1_123456");
    expect(result.coachName).toBe("Alex");
    expect(tools.saveCoachConfigToDatabaseTool.execute).toHaveBeenCalled();
  });

  // ─── Blocking enforcement (validation fails) ─────────────────────────────

  it("blocks save when validation returns isValid=false", async () => {
    vi.mocked(tools.validateCoachConfigTool.execute).mockResolvedValue({
      isValid: false,
      validationIssues: ["missing personality template", "empty prompts"],
      confidence: 0.1,
    });

    const mock = vi.mocked(callBedrockApiForAgent);

    mock
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("validate_coach_config")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("tool_use", makeToolUseContent("save_coach_config_to_database")),
      )
      .mockResolvedValueOnce(
        makeBedrockResponse("end_turn", makeTextContent("Validation failed.")),
      );

    const agent = new CoachCreatorAgent(makeContext());
    const result = await agent.createCoach();

    // Save should NOT have been called (blocked by enforceValidationBlocking)
    expect(tools.saveCoachConfigToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
