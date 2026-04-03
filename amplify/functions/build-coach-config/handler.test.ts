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

vi.mock("../libs/agents/coach-creator/agent", () => ({
  // Use a regular function so `new CoachCreatorAgent()` returns the right mock instance
  CoachCreatorAgent: vi.fn().mockImplementation(function (this: any) {
    this.createCoach = vi.fn().mockResolvedValue({
      success: true,
      coachConfigId: "coach_user1_123456",
      coachName: "Alex",
      primaryPersonality: "motivating_mentor",
      primaryMethodology: "strength_fundamentals",
      pineconeStored: true,
      generationMethod: "agent_v2",
    });
  }),
}));

vi.mock("../../dynamodb/operations", () => ({
  getCoachCreatorSession: vi.fn().mockResolvedValue({
    sessionId: "session-1",
    userId: "user-1",
    isComplete: true,
    configGeneration: { status: "IN_PROGRESS", startedAt: new Date() },
    lastActivity: new Date(),
  }),
  saveCoachCreatorSession: vi.fn().mockResolvedValue(undefined),
  getUserProfile: vi.fn().mockResolvedValue({ criticalTrainingDirective: undefined }),
}));

vi.mock("../libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { handler } from "./handler";
import { CoachCreatorAgent } from "../libs/agents/coach-creator/agent";
import {
  getCoachCreatorSession,
  saveCoachCreatorSession,
} from "../../dynamodb/operations";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";

// ─── Factories ────────────────────────────────────────────────────────────────

const makeEvent = (overrides?: any) => ({
  userId: "user-1",
  sessionId: "session-1",
  ...overrides,
});

const makeLambdaContext = () => ({} as any);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("build-coach-config handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-initialize the default agent mock after vi.clearAllMocks clears inner spy implementations
    vi.mocked(CoachCreatorAgent).mockImplementation(function (this: any) {
      this.createCoach = vi.fn().mockResolvedValue({
        success: true,
        coachConfigId: "coach_user1_123456",
        coachName: "Alex",
        primaryPersonality: "motivating_mentor",
        primaryMethodology: "strength_fundamentals",
        pineconeStored: true,
        generationMethod: "agent_v2",
      });
    });
    // Restore default session mock
    vi.mocked(getCoachCreatorSession).mockResolvedValue({
      sessionId: "session-1",
      userId: "user-1",
      isComplete: true,
      configGeneration: { status: "IN_PROGRESS", startedAt: new Date() },
      lastActivity: new Date(),
    } as any);
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  it("returns 500 error when userId is missing", async () => {
    await handler(makeEvent({ userId: undefined }), makeLambdaContext(), vi.fn());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining("Missing required fields"),
      expect.any(Object),
    );
  });

  it("returns 500 error when sessionId is missing", async () => {
    await handler(makeEvent({ sessionId: undefined }), makeLambdaContext(), vi.fn());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining("Missing required fields"),
      expect.any(Object),
    );
  });

  it("returns 500 error when session is not found", async () => {
    vi.mocked(getCoachCreatorSession).mockResolvedValue(null);

    await handler(makeEvent(), makeLambdaContext(), vi.fn());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining("Session not found"),
      expect.any(Object),
    );
  });

  it("returns 500 error when session is not complete", async () => {
    vi.mocked(getCoachCreatorSession).mockResolvedValue({
      sessionId: "session-1",
      userId: "user-1",
      isComplete: false,
    } as any);

    await handler(makeEvent(), makeLambdaContext(), vi.fn());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining("Session is not complete"),
      expect.any(Object),
    );
  });

  // ─── Session lifecycle ────────────────────────────────────────────────────

  it("marks session as IN_PROGRESS before creating the agent", async () => {
    await handler(makeEvent(), makeLambdaContext(), vi.fn());

    expect(saveCoachCreatorSession).toHaveBeenCalledWith(
      expect.objectContaining({
        configGeneration: expect.objectContaining({ status: "IN_PROGRESS" }),
      }),
    );
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  it("creates CoachCreatorAgent with correct context and returns success", async () => {
    await handler(makeEvent(), makeLambdaContext(), vi.fn());

    expect(CoachCreatorAgent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", sessionId: "session-1" }),
    );

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        coachConfigId: "coach_user1_123456",
        coachName: "Alex",
      }),
    );
  });

  // ─── Agent failure ────────────────────────────────────────────────────────

  it("updates session to FAILED and returns skipped when agent returns failure", async () => {
    vi.mocked(CoachCreatorAgent).mockImplementation(function (this: any) {
      this.createCoach = vi.fn().mockResolvedValue({
        success: false,
        skipped: true,
        reason: "Validation failed",
        validationIssues: ["missing personality template"],
      });
    });

    await handler(makeEvent(), makeLambdaContext(), vi.fn());

    expect(saveCoachCreatorSession).toHaveBeenCalledWith(
      expect.objectContaining({
        configGeneration: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, skipped: true }),
    );
  });

  // ─── Unexpected error ─────────────────────────────────────────────────────

  it("returns 500 error and updates session to FAILED when agent throws", async () => {
    vi.mocked(CoachCreatorAgent).mockImplementation(function (this: any) {
      this.createCoach = vi.fn().mockRejectedValue(new Error("Bedrock timeout"));
    });

    await handler(makeEvent(), makeLambdaContext(), vi.fn());

    expect(saveCoachCreatorSession).toHaveBeenCalledWith(
      expect.objectContaining({
        configGeneration: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining("Bedrock timeout"),
      expect.any(Object),
    );
  });
});
