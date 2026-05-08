import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/v2/runtime/sync-runtime", () => ({
  SyncRuntime: vi.fn().mockImplementation(function (this: any) {
    this.invokeTurn = vi.fn();
  }),
}));
vi.mock("./tools", () => ({
  loadSessionRequirementsTool: makeToolMock("load_session_requirements"),
  selectPersonalityTemplateTool: makeToolMock("select_personality_template"),
  selectMethodologyTemplateTool: makeToolMock("select_methodology_template"),
  generateCoachPromptsTool: makeToolMock("generate_coach_prompts"),
  assembleCoachConfigTool: makeToolMock("assemble_coach_config"),
  validateCoachConfigTool: makeToolMock("validate_coach_config"),
  normalizeCoachConfigTool: makeToolMock("normalize_coach_config"),
  saveCoachConfigToDatabaseTool: makeToolMock("save_coach_config_to_database"),
}));
vi.mock("./prompts", () => ({
  buildCoachCreatorPrompt: vi.fn(() => "STATIC PROMPT"),
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

import { CoachCreatorAgentV2 } from "./v2-agent";
import { SyncRuntime } from "../core/v2/runtime/sync-runtime";
import {
  loadSessionRequirementsTool,
  selectPersonalityTemplateTool,
  selectMethodologyTemplateTool,
  generateCoachPromptsTool,
  assembleCoachConfigTool,
  validateCoachConfigTool,
  normalizeCoachConfigTool,
  saveCoachConfigToDatabaseTool,
} from "./tools";

function makeToolMock(id: string) {
  return {
    id,
    description: `Mock for ${id}`,
    inputSchema: { type: "object", properties: {}, additionalProperties: true },
    execute: vi.fn(),
  };
}

const baseContext = {
  userId: "user_test",
  sessionId: "session_test",
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

function setRuntimeResponses(turns: any[]) {
  const ctor = SyncRuntime as unknown as ReturnType<typeof vi.fn>;
  const instances: any[] = (ctor as any).mock.instances;
  // The most recently constructed instance is the one the agent uses.
  // We override its invokeTurn AFTER agent construction.
  return (instance: any) => {
    instance.invokeTurn = vi.fn(async () => {
      const next = turns.shift();
      if (!next) throw new Error("no more turns");
      return next;
    });
  };
}

describe("CoachCreatorAgentV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    [
      loadSessionRequirementsTool,
      selectPersonalityTemplateTool,
      selectMethodologyTemplateTool,
      generateCoachPromptsTool,
      assembleCoachConfigTool,
      validateCoachConfigTool,
      normalizeCoachConfigTool,
      saveCoachConfigToDatabaseTool,
    ].forEach((t: any) => t.execute.mockReset());
  });

  it("constructs and produces a success result when save tool returns coachConfigId", async () => {
    (loadSessionRequirementsTool.execute as any).mockResolvedValue({
      genderPreference: "neutral",
    });
    (selectPersonalityTemplateTool.execute as any).mockResolvedValue({
      primaryTemplate: "emma",
    });
    (selectMethodologyTemplateTool.execute as any).mockResolvedValue({
      primaryMethodology: "comptrain",
    });
    (generateCoachPromptsTool.execute as any).mockResolvedValue({
      personalityPrompt: "...",
    });
    (assembleCoachConfigTool.execute as any).mockResolvedValue({
      coachConfig: {},
    });
    (validateCoachConfigTool.execute as any).mockResolvedValue({
      isValid: true,
    });
    (saveCoachConfigToDatabaseTool.execute as any).mockResolvedValue({
      success: true,
      coachConfigId: "coach_test_123",
      coachName: "Emma",
      pineconeStored: true,
      pineconeRecordId: "rec_1",
    });

    const turns = [
      turn(
        [toolUseBlock("u1", "load_session_requirements", {})],
        "tool_use",
      ),
      turn(
        [
          toolUseBlock("u2", "select_personality_template", {}),
          toolUseBlock("u3", "select_methodology_template", {}),
        ],
        "tool_use",
      ),
      turn([toolUseBlock("u4", "generate_coach_prompts", {})], "tool_use"),
      turn(
        [toolUseBlock("u5", "assemble_coach_config", { creationTimestamp: "x" })],
        "tool_use",
      ),
      turn([toolUseBlock("u6", "validate_coach_config", {})], "tool_use"),
      turn([toolUseBlock("u7", "save_coach_config_to_database", {})], "tool_use"),
      turn([{ text: "Coach created." }], "end_turn"),
    ];
    const agent = new CoachCreatorAgentV2(baseContext);
    // Override the runtime created inside the agent
    const runtimeInstance = (SyncRuntime as any).mock.instances.at(-1);
    runtimeInstance.invokeTurn = vi.fn(async () => {
      const next = turns.shift();
      if (!next) throw new Error("no more turns");
      return next;
    });

    const result = await agent.createCoach();
    expect(result.success).toBe(true);
    expect(result.coachConfigId).toBe("coach_test_123");
    expect(result.coachName).toBe("Emma");
    expect(result.primaryPersonality).toBe("emma");
    expect(result.primaryMethodology).toBe("comptrain");
    expect(result.genderPreference).toBe("neutral");
    expect(saveCoachConfigToDatabaseTool.execute).toHaveBeenCalledTimes(1);
  });

  it("blocks save_coach_config_to_database when validate returns isValid:false", async () => {
    (validateCoachConfigTool.execute as any).mockResolvedValue({
      isValid: false,
      validationIssues: ["missing field"],
    });
    (saveCoachConfigToDatabaseTool.execute as any).mockResolvedValue({
      success: true,
      coachConfigId: "should_not_save",
    });

    const turns = [
      turn([toolUseBlock("u1", "validate_coach_config", {})], "tool_use"),
      turn([toolUseBlock("u2", "save_coach_config_to_database", {})], "tool_use"),
      turn([{ text: "Validation failed." }], "end_turn"),
    ];
    const agent = new CoachCreatorAgentV2(baseContext);
    const runtimeInstance = (SyncRuntime as any).mock.instances.at(-1);
    runtimeInstance.invokeTurn = vi.fn(async () => {
      const next = turns.shift();
      if (!next) throw new Error("no more turns");
      return next;
    });

    const result = await agent.createCoach();
    expect(saveCoachConfigToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toMatch(/validation failed/i);
    expect(result.validationIssues).toEqual(["missing field"]);
  });

  it("blocks save_coach_config_to_database when validate throws an exception (defense-in-depth)", async () => {
    // adaptLegacyTool wraps thrown exceptions in a v2 ToolResult envelope
    // (`{ ok: false, code: "permanent", message }`), which v1's
    // enforceValidationBlocking can't read directly. The v2 agent must
    // normalise back to v1's `{ error }` shape so the save still gets
    // blocked. Regression test for Bugbot finding 1a120900.
    (validateCoachConfigTool.execute as any).mockRejectedValue(
      new Error("validation lambda timed out"),
    );
    (saveCoachConfigToDatabaseTool.execute as any).mockResolvedValue({
      success: true,
      coachConfigId: "should_not_save",
    });

    const turns = [
      turn([toolUseBlock("u1", "validate_coach_config", {})], "tool_use"),
      turn(
        [toolUseBlock("u2", "save_coach_config_to_database", {})],
        "tool_use",
      ),
      turn([{ text: "Validation threw." }], "end_turn"),
    ];
    const agent = new CoachCreatorAgentV2(baseContext);
    const runtimeInstance = (SyncRuntime as any).mock.instances.at(-1);
    runtimeInstance.invokeTurn = vi.fn(async () => {
      const next = turns.shift();
      if (!next) throw new Error("no more turns");
      return next;
    });

    const result = await agent.createCoach();
    expect(saveCoachConfigToDatabaseTool.execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("returns skipped result with the agent response when no tools are called", async () => {
    const turns = [
      turn(
        [{ text: "What kind of coach would you like?" }],
        "end_turn",
      ),
      turn(
        [{ text: "I still need clarification." }],
        "end_turn",
      ),
    ];
    const agent = new CoachCreatorAgentV2(baseContext);
    const runtimeInstance = (SyncRuntime as any).mock.instances.at(-1);
    runtimeInstance.invokeTurn = vi.fn(async () => {
      const next = turns.shift();
      if (!next) throw new Error("no more turns");
      return next;
    });

    const result = await agent.createCoach();
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toMatch(/clarification|kind of coach/i);
  });
});
