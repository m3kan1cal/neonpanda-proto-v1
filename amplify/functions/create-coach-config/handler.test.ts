import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Pass-through `withAuth` so we can drive the inner handler directly. The
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
  getCoachCreatorSession: vi.fn(),
  saveCoachCreatorSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../libs/coach-creator/session-management", () => ({
  createCoachConfigGenerationLock: vi
    .fn()
    .mockImplementation((session: any) => ({
      ...session,
      configGeneration: {
        status: "IN_PROGRESS",
        startedAt: new Date("2026-05-08T20:30:00.000Z"),
      },
      lastActivity: new Date("2026-05-08T20:30:00.000Z"),
    })),
  createCoachConfigGenerationFailure: vi
    .fn()
    .mockImplementation((session: any, error: any) => ({
      ...session,
      configGeneration: {
        status: "FAILED",
        startedAt:
          session.configGeneration?.startedAt ||
          new Date("2026-05-08T20:30:00.000Z"),
        failedAt: new Date("2026-05-08T20:31:00.000Z"),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      lastActivity: new Date("2026-05-08T20:31:00.000Z"),
    })),
}));

vi.mock("../libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { handler } from "./handler";
import {
  getCoachCreatorSession,
  saveCoachCreatorSession,
} from "../../dynamodb/operations";
import {
  createOkResponse,
  createErrorResponse,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import {
  createCoachConfigGenerationLock,
  createCoachConfigGenerationFailure,
} from "../libs/coach-creator/session-management";

// ─── Factories ────────────────────────────────────────────────────────────────

const makeSession = (overrides?: any) => ({
  pk: "user#user-1",
  sk: "coachCreatorSession#session-1",
  userId: "user-1",
  sessionId: "session-1",
  isComplete: true,
  configGeneration: {
    status: "FAILED" as const,
    startedAt: new Date("2026-04-22T18:22:13.076Z"),
    failedAt: new Date("2026-05-09T00:36:00.000Z"),
    error: "Previous build failed",
  },
  startedAt: new Date("2026-04-22T17:18:57.350Z"),
  lastActivity: new Date("2026-04-22T18:22:13.076Z"),
  ...overrides,
});

const makeEvent = (overrides?: any) =>
  ({
    user: { userId: "user-1", username: "user-1", email: "user@example.com" },
    pathParameters: { sessionId: "session-1" },
    ...overrides,
  }) as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("create-coach-config handler", () => {
  const ORIGINAL_ENV = process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUILD_COACH_CONFIG_FUNCTION_NAME =
      "neonpanda-build-coach-config-test";

    // Re-establish mock implementations that vi.clearAllMocks() resets.
    vi.mocked(saveCoachCreatorSession).mockResolvedValue(undefined);
    vi.mocked(invokeAsyncLambda).mockResolvedValue(undefined);
    vi.mocked(createCoachConfigGenerationLock).mockImplementation(
      (session: any) => ({
        ...session,
        configGeneration: {
          status: "IN_PROGRESS",
          startedAt: new Date("2026-05-08T20:30:00.000Z"),
        },
        lastActivity: new Date("2026-05-08T20:30:00.000Z"),
      }),
    );
    vi.mocked(createCoachConfigGenerationFailure).mockImplementation(
      (session: any, error: any) => ({
        ...session,
        configGeneration: {
          status: "FAILED",
          startedAt:
            session.configGeneration?.startedAt ||
            new Date("2026-05-08T20:30:00.000Z"),
          failedAt: new Date("2026-05-08T20:31:00.000Z"),
          error: error instanceof Error ? error.message : "Unknown error",
        },
        lastActivity: new Date("2026-05-08T20:31:00.000Z"),
      }),
    );
  });

  afterEach(() => {
    process.env.BUILD_COACH_CONFIG_FUNCTION_NAME = ORIGINAL_ENV;
  });

  it("returns 400 when sessionId is missing from path params", async () => {
    await handler(makeEvent({ pathParameters: {} }));

    expect(createErrorResponse).toHaveBeenCalledWith(
      400,
      "Session ID is required",
    );
    expect(getCoachCreatorSession).not.toHaveBeenCalled();
  });

  it("returns 404 when the session is not found", async () => {
    vi.mocked(getCoachCreatorSession).mockResolvedValue(null as any);

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(404, "Session not found");
    expect(saveCoachCreatorSession).not.toHaveBeenCalled();
    expect(invokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("returns 400 when the session is not complete", async () => {
    vi.mocked(getCoachCreatorSession).mockResolvedValue(
      makeSession({ isComplete: false }) as any,
    );

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(
      400,
      "Session must be complete before building coach config",
    );
    expect(saveCoachCreatorSession).not.toHaveBeenCalled();
    expect(invokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("happy path: locks session, invokes build-coach-config, returns 200", async () => {
    vi.mocked(getCoachCreatorSession).mockResolvedValue(makeSession() as any);

    await handler(makeEvent());

    // Lock applied via the canonical helper (not inline spread)
    expect(createCoachConfigGenerationLock).toHaveBeenCalledTimes(1);

    // Session saved with IN_PROGRESS, prior error/failedAt cleared
    expect(saveCoachCreatorSession).toHaveBeenCalledTimes(1);
    const savedSession = vi.mocked(saveCoachCreatorSession).mock.calls[0][0];
    expect(savedSession.configGeneration?.status).toBe("IN_PROGRESS");
    expect(savedSession.configGeneration?.error).toBeUndefined();
    expect(savedSession.configGeneration?.failedAt).toBeUndefined();

    // Async build-coach-config triggered with { userId, sessionId }
    expect(invokeAsyncLambda).toHaveBeenCalledTimes(1);
    const [functionName, payload, label] = vi.mocked(invokeAsyncLambda).mock
      .calls[0];
    expect(functionName).toBe("neonpanda-build-coach-config-test");
    expect(label).toBe("coach config generation");
    expect(payload).toEqual({ userId: "user-1", sessionId: "session-1" });

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Coach config build triggered successfully",
        sessionId: "session-1",
        userId: "user-1",
      }),
    );
  });

  it("returns 500 when BUILD_COACH_CONFIG_FUNCTION_NAME env var is missing — and does NOT lock the session", async () => {
    delete process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
    vi.mocked(getCoachCreatorSession).mockResolvedValue(makeSession() as any);

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining(
        "BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set",
      ),
    );
    // Env var is checked before the lock save, so the session must NOT be
    // mutated and no Lambda may be triggered. This guarantees a misconfigured
    // function name can't strand a session in IN_PROGRESS.
    expect(createCoachConfigGenerationLock).not.toHaveBeenCalled();
    expect(saveCoachCreatorSession).not.toHaveBeenCalled();
    expect(invokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("rolls session back to FAILED when invokeAsyncLambda throws after locking", async () => {
    vi.mocked(getCoachCreatorSession).mockResolvedValue(makeSession() as any);
    vi.mocked(invokeAsyncLambda).mockRejectedValue(
      new Error("Lambda invocation failed"),
    );

    await handler(makeEvent());

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      "Lambda invocation failed",
    );

    // Two saves: the IN_PROGRESS lock, then the FAILED rollback.
    expect(saveCoachCreatorSession).toHaveBeenCalledTimes(2);
    const firstSave = vi.mocked(saveCoachCreatorSession).mock.calls[0][0];
    const secondSave = vi.mocked(saveCoachCreatorSession).mock.calls[1][0];
    expect(firstSave.configGeneration?.status).toBe("IN_PROGRESS");
    expect(secondSave.configGeneration?.status).toBe("FAILED");
    expect(secondSave.configGeneration?.error).toBe("Lambda invocation failed");

    // Rollback was constructed via the canonical helper.
    expect(createCoachConfigGenerationFailure).toHaveBeenCalledTimes(1);
  });

  it("still returns 500 if the rollback save itself fails (does not throw)", async () => {
    vi.mocked(getCoachCreatorSession).mockResolvedValue(makeSession() as any);
    vi.mocked(invokeAsyncLambda).mockRejectedValue(
      new Error("Lambda invocation failed"),
    );
    // First save (lock) succeeds, second save (rollback) fails.
    vi.mocked(saveCoachCreatorSession)
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
