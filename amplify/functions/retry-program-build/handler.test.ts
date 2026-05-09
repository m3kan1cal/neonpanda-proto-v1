import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Pass-through `withAuth` so we can test the inner handler directly. The
// real middleware verifies a Cognito JWT — out of scope for unit tests.
vi.mock("../libs/auth/middleware", () => ({
  withAuth: vi.fn().mockImplementation((handler: any) => handler),
}));

vi.mock("../libs/api-helpers", () => ({
  createOkResponse: vi
    .fn()
    .mockImplementation((data: any) => ({ statusCode: 200, ...data })),
  createErrorResponse: vi
    .fn()
    .mockImplementation((statusCode: number, error: string) => ({
      statusCode,
      error,
    })),
  invokeAsyncLambda: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../dynamodb/operations", () => ({
  getProgramDesignerSession: vi.fn(),
  saveProgramDesignerSession: vi.fn().mockResolvedValue(undefined),
  getUserProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock("../libs/program-designer/session-management", () => ({
  createProgramGenerationLock: vi
    .fn()
    .mockImplementation((session: any) => ({
      ...session,
      programGeneration: {
        status: "IN_PROGRESS",
        startedAt: new Date("2026-05-08T20:30:00.000Z"),
      },
      lastActivity: new Date("2026-05-08T20:30:00.000Z"),
    })),
  createProgramGenerationFailure: vi
    .fn()
    .mockImplementation((session: any, error: any) => ({
      ...session,
      programGeneration: {
        status: "FAILED",
        startedAt:
          session.programGeneration?.startedAt ||
          new Date("2026-05-08T20:30:00.000Z"),
        failedAt: new Date("2026-05-08T20:31:00.000Z"),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      lastActivity: new Date("2026-05-08T20:31:00.000Z"),
    })),
}));

vi.mock("../libs/id-utils", () => ({
  generateProgramId: vi.fn().mockReturnValue("program_user-1_1700000000000_abc12"),
}));

vi.mock("../libs/user/timezone", () => ({
  getUserTimezone: vi.fn().mockReturnValue("America/Los_Angeles"),
}));

vi.mock("../libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { handler } from "./handler";
import {
  getProgramDesignerSession,
  saveProgramDesignerSession,
  getUserProfile,
} from "../../dynamodb/operations";
import {
  createOkResponse,
  createErrorResponse,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import {
  createProgramGenerationLock,
  createProgramGenerationFailure,
} from "../libs/program-designer/session-management";
import { generateProgramId } from "../libs/id-utils";

// ─── Factories ────────────────────────────────────────────────────────────────

const makeFailedSession = (overrides?: any) => ({
  pk: "user#user-1",
  sk: "programDesignerSession#session-1",
  userId: "user-1",
  sessionId: "session-1",
  coachId: "coach-1",
  coachName: "Diana",
  isComplete: true,
  todoList: {
    trainingGoals: { value: "strength", confirmed: true },
    programDuration: { value: "8 weeks", confirmed: true },
    trainingFrequency: { value: 3, confirmed: true },
  },
  conversationHistory: [
    { role: "user", content: "Build me a program" },
    { role: "assistant", content: "What's your goal?" },
  ],
  additionalConsiderations: "Saturday rest day non-negotiable",
  programGeneration: {
    status: "FAILED" as const,
    startedAt: new Date("2026-04-22T18:22:13.076Z"),
    failedAt: new Date("2026-05-09T00:36:00.000Z"),
    error: "Previous build failed",
  },
  startedAt: new Date("2026-04-22T17:18:57.350Z"),
  lastActivity: new Date("2026-04-22T18:22:13.076Z"),
  turnCount: 5,
  imageS3Keys: [],
  ...overrides,
});

const makeEvent = (overrides?: any) =>
  ({
    user: { userId: "user-1", username: "user-1", email: "user@example.com" },
    pathParameters: { sessionId: "session-1" },
    ...overrides,
  }) as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("retry-program-build handler", () => {
  const ORIGINAL_ENV = process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME =
      "neonpanda-build-program-test";

    // Re-establish mock implementations that vi.clearAllMocks() resets.
    vi.mocked(saveProgramDesignerSession).mockResolvedValue(undefined);
    vi.mocked(getUserProfile).mockResolvedValue(null);
    vi.mocked(invokeAsyncLambda).mockResolvedValue(undefined);
    vi.mocked(generateProgramId).mockReturnValue(
      "program_user-1_1700000000000_abc12",
    );
    vi.mocked(createProgramGenerationLock).mockImplementation((session: any) => ({
      ...session,
      programGeneration: {
        status: "IN_PROGRESS",
        startedAt: new Date("2026-05-08T20:30:00.000Z"),
      },
      lastActivity: new Date("2026-05-08T20:30:00.000Z"),
    }));
    vi.mocked(createProgramGenerationFailure).mockImplementation(
      (session: any, error: any) => ({
        ...session,
        programGeneration: {
          status: "FAILED",
          startedAt:
            session.programGeneration?.startedAt ||
            new Date("2026-05-08T20:30:00.000Z"),
          failedAt: new Date("2026-05-08T20:31:00.000Z"),
          error: error instanceof Error ? error.message : "Unknown error",
        },
        lastActivity: new Date("2026-05-08T20:31:00.000Z"),
      }),
    );
  });

  afterEach(() => {
    process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME = ORIGINAL_ENV;
  });

  it("returns 400 when sessionId is missing from path params", async () => {
    await handler(makeEvent({ pathParameters: {} }));

    expect(createErrorResponse).toHaveBeenCalledWith(
      400,
      "Session ID is required",
    );
    expect(getProgramDesignerSession).not.toHaveBeenCalled();
  });

  it("returns 404 when the session is not found", async () => {
    vi.mocked(getProgramDesignerSession).mockResolvedValue(null as any);

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(404, "Session not found");
    expect(saveProgramDesignerSession).not.toHaveBeenCalled();
    expect(invokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("returns 400 when the session is not complete", async () => {
    vi.mocked(getProgramDesignerSession).mockResolvedValue(
      makeFailedSession({ isComplete: false }) as any,
    );

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(
      400,
      "Session must be complete before building program",
    );
    expect(saveProgramDesignerSession).not.toHaveBeenCalled();
    expect(invokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("happy path: locks session, generates fresh programId, invokes build-program with full BuildProgramEvent payload", async () => {
    vi.mocked(getProgramDesignerSession).mockResolvedValue(
      makeFailedSession() as any,
    );

    await handler(makeEvent());

    // Lock applied via canonical helper
    expect(createProgramGenerationLock).toHaveBeenCalledTimes(1);

    // Session saved with the locked state (status flipped to IN_PROGRESS)
    expect(saveProgramDesignerSession).toHaveBeenCalledTimes(1);
    const savedSession = vi.mocked(saveProgramDesignerSession).mock.calls[0][0];
    expect(savedSession.programGeneration?.status).toBe("IN_PROGRESS");
    expect(savedSession.programGeneration?.error).toBeUndefined();
    expect(savedSession.programGeneration?.failedAt).toBeUndefined();

    // Async build-program triggered with a fully-formed BuildProgramEvent
    expect(invokeAsyncLambda).toHaveBeenCalledTimes(1);
    const [functionName, payload, label] = vi.mocked(invokeAsyncLambda).mock
      .calls[0];
    expect(functionName).toBe("neonpanda-build-program-test");
    expect(label).toBe("program build retry");
    expect(payload).toEqual(
      expect.objectContaining({
        userId: "user-1",
        coachId: "coach-1",
        programId: "program_user-1_1700000000000_abc12",
        sessionId: "session-1",
        todoList: expect.any(Object),
        conversationContext: expect.stringContaining("user: Build me a program"),
        additionalConsiderations: "Saturday rest day non-negotiable",
        userTimezone: "America/Los_Angeles",
      }),
    );

    // 200 response with the new programId echoed back
    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Program build retried successfully",
        sessionId: "session-1",
        userId: "user-1",
        programId: "program_user-1_1700000000000_abc12",
      }),
    );
  });

  it("falls back to 'none' when additionalConsiderations is missing", async () => {
    vi.mocked(getProgramDesignerSession).mockResolvedValue(
      makeFailedSession({ additionalConsiderations: undefined }) as any,
    );

    await handler(makeEvent());

    const payload = vi.mocked(invokeAsyncLambda).mock.calls[0][1];
    expect((payload as any).additionalConsiderations).toBe("none");
  });

  it("returns 500 when BUILD_TRAINING_PROGRAM_FUNCTION_NAME env var is missing — and does NOT lock the session", async () => {
    delete process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME;
    vi.mocked(getProgramDesignerSession).mockResolvedValue(
      makeFailedSession() as any,
    );

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining(
        "BUILD_TRAINING_PROGRAM_FUNCTION_NAME environment variable not set",
      ),
    );
    // Env var is checked before the lock save, so the session must NOT be
    // mutated and no Lambda may be triggered. This guarantees a misconfigured
    // function name can't strand a session in IN_PROGRESS.
    expect(createProgramGenerationLock).not.toHaveBeenCalled();
    expect(saveProgramDesignerSession).not.toHaveBeenCalled();
    expect(invokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("rolls session back to FAILED when invokeAsyncLambda throws after locking", async () => {
    vi.mocked(getProgramDesignerSession).mockResolvedValue(
      makeFailedSession() as any,
    );
    vi.mocked(invokeAsyncLambda).mockRejectedValue(
      new Error("Lambda invocation failed"),
    );

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      "Lambda invocation failed",
    );

    // Two saves: the IN_PROGRESS lock, then the FAILED rollback.
    expect(saveProgramDesignerSession).toHaveBeenCalledTimes(2);
    const firstSave = vi.mocked(saveProgramDesignerSession).mock.calls[0][0];
    const secondSave = vi.mocked(saveProgramDesignerSession).mock.calls[1][0];
    expect(firstSave.programGeneration?.status).toBe("IN_PROGRESS");
    expect(secondSave.programGeneration?.status).toBe("FAILED");
    expect(secondSave.programGeneration?.error).toBe("Lambda invocation failed");

    // Rollback was constructed via the canonical helper.
    expect(createProgramGenerationFailure).toHaveBeenCalledTimes(1);
  });

  it("still returns 500 if the rollback save itself fails (does not throw)", async () => {
    vi.mocked(getProgramDesignerSession).mockResolvedValue(
      makeFailedSession() as any,
    );
    vi.mocked(invokeAsyncLambda).mockRejectedValue(
      new Error("Lambda invocation failed"),
    );
    // First save (lock) succeeds, second save (rollback) fails.
    vi.mocked(saveProgramDesignerSession)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("DDB unavailable"));

    await handler(makeEvent());

    // Original error is what surfaces to the caller, not the rollback error.
    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      "Lambda invocation failed",
    );
  });
});
