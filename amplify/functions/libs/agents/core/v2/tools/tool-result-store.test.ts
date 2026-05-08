import { describe, expect, it } from "vitest";
import { ToolResultStore } from "./tool-result-store";

describe("ToolResultStore", () => {
  it("stores and retrieves a single value by tool id", () => {
    const s = new ToolResultStore();
    s.put("foo", { x: 1 });
    expect(s.get("foo")).toEqual({ x: 1 });
    expect(s.has("foo")).toBe(true);
    expect(s.has("bar")).toBe(false);
  });

  it("rewrites tool ids to alias keys (coach-creator semantic aliases)", () => {
    const s = new ToolResultStore({
      load_session_requirements: "requirements",
      select_personality_template: "personality_selection",
    });
    s.put("load_session_requirements", { sessionId: "abc" });
    expect(s.get("requirements")).toEqual({ sessionId: "abc" });
    expect(s.has("requirements")).toBe(true);
  });

  it("supports indexed put for array semantics (workout-logger)", () => {
    const s = new ToolResultStore();
    s.put("workout", { idx: 0 }, { index: 0 });
    s.put("workout", { idx: 1 }, { index: 1 });
    expect(s.getAll("workout")).toEqual([{ idx: 0 }, { idx: 1 }]);
    expect(s.get("workout", 1)).toEqual({ idx: 1 });
  });

  it("supports uniqueKey put for keyed semantics (program-designer phase IDs)", () => {
    const s = new ToolResultStore();
    s.put("phase_workout", { day: 1 }, { uniqueKey: "phase-1" });
    s.put("phase_workout", { day: 2 }, { uniqueKey: "phase-2" });
    expect(s.get("phase-1")).toEqual({ day: 1 });
    expect(s.get("phase-2")).toEqual({ day: 2 });
  });

  it("flatten unwraps single-element arrays in toFlatRecord()", () => {
    const s = new ToolResultStore();
    s.put("single", { only: true });
    // Multi-value semantics now require explicit `index` — bare `put`
    // replaces, matching coach-creator's expectation that re-calls don't
    // stack stale entries.
    s.put("multi", "a", { index: 0 });
    s.put("multi", "b", { index: 1 });
    const flat = s.toFlatRecord();
    expect(flat.single).toEqual({ only: true });
    expect(flat.multi).toEqual(["a", "b"]);
  });

  it("replaces single-value entries on re-call instead of appending", () => {
    // Regression for Bugbot finding 59c7a210: prior to the fix, retry
    // sequences left stale failure entries in the array, leaking through
    // `getAll()` and `toFlatRecord()`.
    const s = new ToolResultStore();
    s.put("save", { ok: false, message: "first attempt failed" });
    s.put("save", { ok: true, coachConfigId: "coach_1" });
    expect(s.get("save")).toEqual({ ok: true, coachConfigId: "coach_1" });
    expect(s.getAll("save")).toEqual([
      { ok: true, coachConfigId: "coach_1" },
    ]);
    expect(s.toFlatRecord()).toEqual({
      save: { ok: true, coachConfigId: "coach_1" },
    });
  });

  it("replaces under uniqueKey on re-call too", () => {
    const s = new ToolResultStore();
    s.put("phase_workout", { day: 1, attempt: 1 }, { uniqueKey: "phase-1" });
    s.put("phase_workout", { day: 1, attempt: 2 }, { uniqueKey: "phase-1" });
    expect(s.getAll("phase-1")).toEqual([{ day: 1, attempt: 2 }]);
  });
});
