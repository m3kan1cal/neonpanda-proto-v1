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

vi.mock("../libs/agents/workout-logger/agent", () => ({
  // Use a regular function so `new WorkoutLoggerAgent()` returns the right mock instance
  WorkoutLoggerAgent: vi.fn().mockImplementation(function (this: any) {
    this.logWorkout = vi.fn().mockResolvedValue({
      success: true,
      workoutId: "workout-user1-123",
      discipline: "crossfit",
      workoutName: "Fran",
      confidence: 0.95,
    });
  }),
}));

vi.mock("../libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { handler } from "./handler";
import { WorkoutLoggerAgent } from "../libs/agents/workout-logger/agent";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";

// ─── Factories ────────────────────────────────────────────────────────────────

const makeEvent = (overrides?: any) => ({
  userId: "user-1",
  coachId: "coach-1",
  conversationId: "conv-1",
  userMessage: "Did Fran today in 8:57, 21-15-9 thrusters and pull-ups",
  coachConfig: { coach_name: "Alex" },
  isSlashCommand: false,
  userTimezone: "America/Los_Angeles",
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("build-workout handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-initialize the default agent mock (vi.clearAllMocks clears the inner spy implementations)
    vi.mocked(WorkoutLoggerAgent).mockImplementation(function (this: any) {
      this.logWorkout = vi.fn().mockResolvedValue({
        success: true,
        workoutId: "workout-user1-123",
        discipline: "crossfit",
        workoutName: "Fran",
        confidence: 0.95,
      });
    });
  });

  // ─── Slash command pre-validation ─────────────────────────────────────────

  it("returns skipped for slash command with too-short content", async () => {
    await handler(makeEvent({ isSlashCommand: true, userMessage: "squat" }));

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, skipped: true }),
    );
    expect(WorkoutLoggerAgent).not.toHaveBeenCalled();
  });

  it("returns skipped for slash command with a bare keyword", async () => {
    await handler(makeEvent({ isSlashCommand: true, userMessage: "workout" }));

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, skipped: true }),
    );
    expect(WorkoutLoggerAgent).not.toHaveBeenCalled();
  });

  // ─── Agent construction ───────────────────────────────────────────────────

  it("constructs WorkoutLoggerAgent with correct context fields", async () => {
    await handler(makeEvent());

    expect(WorkoutLoggerAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        coachId: "coach-1",
        conversationId: "conv-1",
        coachConfig: { coach_name: "Alex" },
      }),
    );
  });

  // ─── Success response ─────────────────────────────────────────────────────

  it("returns ok response with workoutId when agent succeeds", async () => {
    await handler(makeEvent());

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, workoutId: "workout-user1-123" }),
    );
  });

  // ─── Failure response ─────────────────────────────────────────────────────

  it("returns skipped ok response when agent returns failure", async () => {
    vi.mocked(WorkoutLoggerAgent).mockImplementation(function (this: any) {
      this.logWorkout = vi.fn().mockResolvedValue({
        success: false,
        skipped: true,
        reason: "Looks like a future plan, not a completed workout",
        blockingFlags: ["planning_request"],
      });
    });

    await handler(makeEvent());

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, skipped: true }),
    );
    expect(createErrorResponse).not.toHaveBeenCalled();
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it("returns 500 error response when agent throws", async () => {
    vi.mocked(WorkoutLoggerAgent).mockImplementation(function (this: any) {
      this.logWorkout = vi.fn().mockRejectedValue(new Error("Bedrock timeout"));
    });

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining("Failed to extract workout session"),
      expect.any(Object),
    );
  });
});
