import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../libs/heartbeat", () => ({
  withHeartbeat: vi.fn().mockImplementation((_name: string, fn: () => any) => fn()),
}));

vi.mock("../libs/api-helpers", () => ({
  createOkResponse: vi.fn().mockImplementation((data: any) => ({ statusCode: 200, ...data })),
  createErrorResponse: vi.fn().mockImplementation((statusCode: number, error: string) => ({
    statusCode,
    error,
  })),
}));

vi.mock("../libs/agents/program-designer/agent", () => ({
  // Use a regular function so `new ProgramDesignerAgent()` returns the right mock instance
  ProgramDesignerAgent: vi.fn().mockImplementation(function (this: any) {
    this.designProgram = vi.fn().mockResolvedValue({
      success: true,
      programId: "prog_user1_123456",
      programName: "8-Week Strength Program",
      totalDays: 56,
      phaseCount: 2,
      totalWorkoutTemplates: 24,
      uniqueTrainingDays: 24,
      trainingFrequency: 3,
      startDate: "2025-01-01",
      endDate: "2025-02-25",
      averageSessionsPerDay: "1.0",
      pineconeStored: true,
    });
  }),
}));

vi.mock("../../dynamodb/operations", () => ({
  getProgramDesignerSession: vi.fn().mockResolvedValue({
    sessionId: "session-1",
    userId: "user-1",
    isComplete: true,
    programGeneration: { status: "IN_PROGRESS", startedAt: new Date("2025-01-01") },
    lastActivity: new Date(),
  }),
  saveProgramDesignerSession: vi.fn().mockResolvedValue(undefined),
  getProgram: vi.fn().mockResolvedValue(null),
}));

vi.mock("../libs/program-designer/session-management", () => ({
  generateProgramDesignerSessionSummary: vi.fn().mockResolvedValue({ summary: "test" }),
}));

vi.mock("../libs/program-designer/pinecone", () => ({
  storeProgramDesignerSessionSummaryInPinecone: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../libs/program/validation-helpers", () => ({
  validateProgramDurationInput: vi.fn().mockReturnValue({ isValid: true }),
  validateTrainingFrequencyInput: vi.fn().mockReturnValue({ isValid: true }),
}));

vi.mock("../libs/program/duration-normalizer", () => ({
  normalizeDuration: vi.fn().mockResolvedValue({
    normalizedDuration: "8 weeks",
    confidence: "high",
    originalInterpretation: "8-week program",
  }),
}));

vi.mock("../libs/program/duration-parser", () => ({
  DEFAULT_PROGRAM_DURATION_STRING: "8 weeks",
}));

vi.mock("../libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { handler } from "./handler";
import { ProgramDesignerAgent } from "../libs/agents/program-designer/agent";
import { getProgramDesignerSession, saveProgramDesignerSession } from "../../dynamodb/operations";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { validateTrainingFrequencyInput } from "../libs/program/validation-helpers";

// ─── Factories ────────────────────────────────────────────────────────────────

const makeTodoList = (overrides?: any) => ({
  trainingGoals: { value: "strength", confirmed: true },
  programDuration: { value: "8 weeks", confirmed: true },
  trainingFrequency: { value: 3, confirmed: true },
  ...overrides,
});

const makeEvent = (overrides?: any) => ({
  userId: "user-1",
  coachId: "coach-1",
  programId: "prog-1",
  sessionId: "session-1",
  todoList: makeTodoList(),
  conversationContext: "User wants strength training",
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("build-program handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-initialize mocks that vi.clearAllMocks() clears their implementations.
    // Also re-create objects that the handler mutates, so mutations in one test
    // don't leak through the shared mockResolvedValue reference to the next test.
    vi.mocked(validateTrainingFrequencyInput).mockReturnValue({ isValid: true } as any);
    vi.mocked(getProgramDesignerSession).mockResolvedValue({
      sessionId: "session-1",
      userId: "user-1",
      isComplete: true,
      programGeneration: { status: "IN_PROGRESS", startedAt: new Date("2025-01-01") },
      lastActivity: new Date(),
    } as any);
    vi.mocked(ProgramDesignerAgent).mockImplementation(function (this: any) {
      this.designProgram = vi.fn().mockResolvedValue({
        success: true,
        programId: "prog_user1_123456",
        programName: "8-Week Strength Program",
        totalDays: 56,
        phaseCount: 2,
        totalWorkoutTemplates: 24,
        uniqueTrainingDays: 24,
        trainingFrequency: 3,
        startDate: "2025-01-01",
        endDate: "2025-02-25",
        averageSessionsPerDay: "1.0",
        pineconeStored: true,
      });
    });
  });

  // ─── Pre-validation ───────────────────────────────────────────────────────

  it("returns 400 when required fields are missing", async () => {
    await handler(makeEvent({ userId: undefined }));

    expect(createErrorResponse).toHaveBeenCalledWith(
      400,
      expect.stringContaining("Missing required fields"),
    );
  });

  it("returns 400 when todoList is missing", async () => {
    await handler(makeEvent({ todoList: undefined }));

    expect(createErrorResponse).toHaveBeenCalledWith(400, expect.any(String));
  });

  it("returns skipped when todoList has no trainingGoals or programDuration", async () => {
    await handler(makeEvent({ todoList: { trainingFrequency: { value: 3 } } }));

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, skipped: true }),
    );
    expect(ProgramDesignerAgent).not.toHaveBeenCalled();
  });

  it("returns 400 when training frequency is invalid type", async () => {
    vi.mocked(validateTrainingFrequencyInput).mockReturnValue({
      isValid: false,
      error: "trainingFrequency must be a number",
      field: "trainingFrequency",
      providedValue: "abc",
    } as any);

    await handler(makeEvent({ todoList: makeTodoList({ trainingFrequency: { value: "abc" } }) }));

    expect(createErrorResponse).toHaveBeenCalledWith(400, expect.any(String), expect.any(Object));
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  it("calls designProgram and returns success with programId", async () => {
    await handler(makeEvent());

    expect(ProgramDesignerAgent).toHaveBeenCalled();
    const instance = vi.mocked(ProgramDesignerAgent).mock.instances[0] as any;
    expect(instance.designProgram).toHaveBeenCalled();

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, programId: "prog_user1_123456" }),
    );
  });

  it("updates session to COMPLETE status when agent succeeds", async () => {
    await handler(makeEvent());

    expect(saveProgramDesignerSession).toHaveBeenCalledWith(
      expect.objectContaining({
        programGeneration: expect.objectContaining({ status: "COMPLETE" }),
      }),
    );
  });

  // ─── Agent failure ────────────────────────────────────────────────────────

  it("updates session to FAILED and returns skipped when agent returns failure", async () => {
    vi.mocked(ProgramDesignerAgent).mockImplementation(function (this: any) {
      this.designProgram = vi.fn().mockResolvedValue({
        success: false,
        skipped: true,
        reason: "Requirements incomplete",
      });
    });

    await handler(makeEvent());

    expect(saveProgramDesignerSession).toHaveBeenCalledWith(
      expect.objectContaining({
        programGeneration: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, skipped: true }),
    );
  });

  // ─── Unexpected error ─────────────────────────────────────────────────────

  it("returns 500 and updates session to FAILED when agent throws", async () => {
    vi.mocked(ProgramDesignerAgent).mockImplementation(function (this: any) {
      this.designProgram = vi.fn().mockRejectedValue(new Error("Bedrock error"));
    });

    await handler(makeEvent());

    expect(saveProgramDesignerSession).toHaveBeenCalledWith(
      expect.objectContaining({
        programGeneration: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.any(String),
      expect.any(Object),
    );
  });
});
