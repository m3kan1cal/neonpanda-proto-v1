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

vi.mock("../libs/exercise/extraction", () => ({
  extractExercisesFromWorkout: vi.fn().mockReturnValue({
    exercises: [
      { originalName: "back_squat", discipline: "strength", metrics: { weight: 315 } },
    ],
    discipline: "strength",
    extractionMethod: "structured",
  }),
}));

vi.mock("../libs/exercise/normalization", () => ({
  normalizeExerciseNamesBatch: vi.fn().mockResolvedValue({
    normalizations: [
      { normalizedName: "Back Squat", confidence: 0.99 },
    ],
    processingTimeMs: 50,
  }),
}));

vi.mock("../../dynamodb/operations", () => ({
  saveExercises: vi.fn().mockResolvedValue({ successful: 1, failed: 0 }),
}));

vi.mock("../../dynamodb/exercise", () => ({
  deleteExercisesByWorkoutId: vi.fn().mockResolvedValue({ deleted: 2 }),
}));

vi.mock("../libs/id-utils", () => ({
  generateExerciseId: vi.fn().mockReturnValue("exercise-id-1"),
}));

vi.mock("../libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { handler } from "./handler";
import { extractExercisesFromWorkout } from "../libs/exercise/extraction";
import { normalizeExerciseNamesBatch } from "../libs/exercise/normalization";
import { saveExercises } from "../../dynamodb/operations";
import { deleteExercisesByWorkoutId } from "../../dynamodb/exercise";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";

// ─── Factories ────────────────────────────────────────────────────────────────

const makeEvent = (overrides?: any) => ({
  userId: "user-1",
  coachId: "coach-1",
  workoutId: "workout-1",
  workoutData: { discipline: "strength" },
  completedAt: "2025-01-01T12:00:00Z",
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("build-exercise handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-initialize mocks that vi.clearAllMocks() clears their implementations
    vi.mocked(extractExercisesFromWorkout).mockReturnValue({
      exercises: [
        { originalName: "back_squat", discipline: "strength", metrics: { weight: 315 } },
      ],
      discipline: "strength",
      extractionMethod: "structured",
    } as any);
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  it("returns 400 when required fields are missing", async () => {
    const result = await handler(makeEvent({ userId: undefined }) as any);

    expect(createErrorResponse).toHaveBeenCalledWith(
      400,
      expect.stringContaining("Missing required fields"),
    );
    expect((result as any).statusCode).toBe(400);
  });

  it("returns 400 when completedAt is not a valid date", async () => {
    const result = await handler(makeEvent({ completedAt: "not-a-date" }) as any);

    expect(createErrorResponse).toHaveBeenCalledWith(400, expect.stringContaining("Invalid"));
    expect((result as any).statusCode).toBe(400);
  });

  // ─── Empty exercises ──────────────────────────────────────────────────────

  it("returns skipped when no exercises are found in workout", async () => {
    vi.mocked(extractExercisesFromWorkout).mockReturnValue({
      exercises: [],
      discipline: "strength",
      extractionMethod: "structured",
    } as any);

    await handler(makeEvent() as any);

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, skipped: true }),
    );
    expect(normalizeExerciseNamesBatch).not.toHaveBeenCalled();
    expect(saveExercises).not.toHaveBeenCalled();
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  it("extracts, normalizes, and saves exercises on happy path", async () => {
    const result = await handler(makeEvent() as any);

    expect(extractExercisesFromWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: "strength" }),
    );
    expect(normalizeExerciseNamesBatch).toHaveBeenCalledWith(["back_squat"]);
    expect(saveExercises).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "user-1",
          coachId: "coach-1",
          workoutId: "workout-1",
          exerciseName: "Back Squat",
          originalName: "back_squat",
        }),
      ]),
    );

    expect(createOkResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        workoutId: "workout-1",
        exercisesExtracted: 1,
        exercisesSaved: 1,
      }),
    );
  });

  // ─── Edit mode ────────────────────────────────────────────────────────────

  it("deletes stale exercise records before re-extraction when isEdit=true", async () => {
    await handler(makeEvent({ isEdit: true }) as any);

    expect(deleteExercisesByWorkoutId).toHaveBeenCalledWith("user-1", "workout-1");
    // Should continue to extract and save after deletion
    expect(saveExercises).toHaveBeenCalled();
  });

  it("does NOT delete exercise records when isEdit is false or undefined", async () => {
    await handler(makeEvent() as any);

    expect(deleteExercisesByWorkoutId).not.toHaveBeenCalled();
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it("returns 500 when extraction throws an unexpected error", async () => {
    vi.mocked(extractExercisesFromWorkout).mockImplementation(() => {
      throw new Error("Extraction failed");
    });

    await handler(makeEvent() as any);

    expect(createErrorResponse).toHaveBeenCalledWith(
      500,
      expect.stringContaining("Failed to extract exercises"),
      expect.any(Object),
    );
  });
});
