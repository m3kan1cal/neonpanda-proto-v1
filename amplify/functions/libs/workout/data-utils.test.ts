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

  // ─── Multi-workout sibling intent (workoutIndex) ────────────────────────────

  it("short-circuits the conversationId-fallback when workoutIndex > 0 (sibling save)", async () => {
    // Regression for the 2026-05-18 sandbox failure on
    // `multi-workout-strength-and-cardio`. The model emits two distinct
    // workouts in one conversation turn; save #2 carries workoutIndex=1.
    // Without the short-circuit, the dup check finds save #1's row by
    // conversationId+date and rejects save #2. With the short-circuit,
    // the model's explicit sibling-intent signal is honored and the
    // sibling save proceeds.
    queryWorkoutsMock.mockResolvedValue([
      {
        workoutId: "w_existing_sibling",
        conversationId: "conv_abc",
        completedAt: new Date("2026-04-25T15:00:00Z"),
      },
    ]);

    const result = await checkDuplicateWorkout(
      "u1",
      "conv_abc",
      "2026-04-25",
      undefined,
      1, // workoutIndex > 0 → sibling save → skip dedup
    );

    expect(result).toBeUndefined();
    // Critical: we must not have even queried the table when sibling
    // intent is declared. Otherwise the function pays the DDB round-trip
    // for every multi-workout sibling for no useful work.
    expect(queryWorkoutsMock).not.toHaveBeenCalled();
  });

  it("still runs the conversationId-fallback for workoutIndex === 0 (first sibling)", async () => {
    // The first save in a multi-workout flow carries workoutIndex=0.
    // It still needs the dedup check — there could be a genuine
    // pre-existing duplicate from a Lambda retry / double-submit.
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
      undefined,
      0,
    );

    expect(result?.workoutId).toBe("w_existing");
    expect(queryWorkoutsMock).toHaveBeenCalled();
  });

  it("still runs the conversationId-fallback when workoutIndex is undefined (single workout)", async () => {
    // Default single-workout flow: no workoutIndex emitted by the model.
    // Behavior must be identical to pre-change.
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
  });

  it("template-scoped dedup is unaffected by workoutIndex (Strategy 1 always wins)", async () => {
    // Even a multi-workout sibling save (workoutIndex > 0) should hit
    // template-scoped dedup when a templateId is present. Template links
    // are precise and a duplicate template hit is a true duplicate
    // regardless of sibling intent.
    queryWorkoutsByTemplateMock.mockResolvedValue([
      { workoutId: "w_template_dup", userId: "u1", templateId: "tpl_1" },
    ]);

    const result = await checkDuplicateWorkout(
      "u1",
      "conv_abc",
      "2026-04-25",
      "tpl_1",
      2, // sibling — but template-scoped check still runs
    );

    expect(result?.workoutId).toBe("w_template_dup");
    expect(queryWorkoutsByTemplateMock).toHaveBeenCalledWith("tpl_1");
    expect(queryWorkoutsMock).not.toHaveBeenCalled();
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
