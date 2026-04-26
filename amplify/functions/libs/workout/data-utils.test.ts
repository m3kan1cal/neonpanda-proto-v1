import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../dynamodb/workout", () => ({
  queryWorkouts: vi.fn(),
  queryWorkoutsByTemplate: vi.fn(),
}));

import { checkDuplicateWorkout } from "./data-utils";
import {
  queryWorkouts,
  queryWorkoutsByTemplate,
} from "../../../dynamodb/workout";

const queryWorkoutsMock = queryWorkouts as unknown as ReturnType<typeof vi.fn>;
const queryWorkoutsByTemplateMock = queryWorkoutsByTemplate as unknown as ReturnType<
  typeof vi.fn
>;

describe("checkDuplicateWorkout", () => {
  beforeEach(() => {
    queryWorkoutsMock.mockReset();
    queryWorkoutsByTemplateMock.mockReset();
  });

  // ─── Template-scoped dedup (preferred path) ─────────────────────────────────

  it("uses template-scoped dedup when templateId is provided", async () => {
    queryWorkoutsByTemplateMock.mockResolvedValue([
      { workoutId: "w_existing", userId: "u1", templateId: "tpl_1" },
    ]);

    const result = await checkDuplicateWorkout(
      "u1",
      "program_designer",
      "2026-04-25",
      "tpl_1",
    );

    expect(result?.workoutId).toBe("w_existing");
    expect(queryWorkoutsByTemplateMock).toHaveBeenCalledWith("tpl_1");
    expect(queryWorkoutsMock).not.toHaveBeenCalled();
  });

  it("returns undefined when template index has no matching userId", async () => {
    queryWorkoutsByTemplateMock.mockResolvedValue([
      { workoutId: "w_other_user", userId: "u2", templateId: "tpl_1" },
    ]);

    const result = await checkDuplicateWorkout(
      "u1",
      "program_designer",
      "2026-04-25",
      "tpl_1",
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined when template has no workouts logged yet", async () => {
    queryWorkoutsByTemplateMock.mockResolvedValue([]);

    const result = await checkDuplicateWorkout(
      "u1",
      "program_designer",
      "2026-04-25",
      "tpl_1",
    );

    expect(result).toBeUndefined();
  });

  it("does NOT cross-collide two distinct templates on the same date", async () => {
    // Regression for the program-designer "stuck processing" incident:
    // two different templates logged on the same calendar day must NOT
    // collide just because the conversationId fallback was the same.
    queryWorkoutsByTemplateMock.mockResolvedValue([]);

    const result = await checkDuplicateWorkout(
      "u1",
      "program_designer",
      "2026-04-25",
      "tpl_2", // different template than any existing workout
    );

    expect(result).toBeUndefined();
    expect(queryWorkoutsByTemplateMock).toHaveBeenCalledWith("tpl_2");
  });

  // ─── Free-text fallback path (no templateId) ────────────────────────────────

  it("falls back to conversationId + date matching when templateId is absent", async () => {
    queryWorkoutsMock.mockResolvedValue([
      {
        workoutId: "w_existing",
        conversationId: "conv_abc",
        completedAt: new Date("2026-04-25T15:00:00Z"),
      },
    ]);

    const result = await checkDuplicateWorkout(
      "u1",
      "conv_abc",
      "2026-04-25",
    );

    expect(result?.workoutId).toBe("w_existing");
    expect(queryWorkoutsMock).toHaveBeenCalled();
    expect(queryWorkoutsByTemplateMock).not.toHaveBeenCalled();
  });

  it("falls back to conversationId match — does not match a different conversation", async () => {
    queryWorkoutsMock.mockResolvedValue([
      {
        workoutId: "w_existing",
        conversationId: "conv_other",
        completedAt: new Date("2026-04-25T15:00:00Z"),
      },
    ]);

    const result = await checkDuplicateWorkout(
      "u1",
      "conv_abc",
      "2026-04-25",
    );

    expect(result).toBeUndefined();
  });

  it("falls back to conversationId match — does not match a different date", async () => {
    queryWorkoutsMock.mockResolvedValue([
      {
        workoutId: "w_existing",
        conversationId: "conv_abc",
        completedAt: new Date("2026-04-24T15:00:00Z"),
      },
    ]);

    const result = await checkDuplicateWorkout(
      "u1",
      "conv_abc",
      "2026-04-25",
    );

    expect(result).toBeUndefined();
  });

  // ─── Error swallowing ───────────────────────────────────────────────────────

  it("swallows query errors and returns undefined (non-blocking)", async () => {
    queryWorkoutsByTemplateMock.mockRejectedValue(new Error("dynamo down"));

    const result = await checkDuplicateWorkout(
      "u1",
      "program_designer",
      "2026-04-25",
      "tpl_1",
    );

    expect(result).toBeUndefined();
  });
});
