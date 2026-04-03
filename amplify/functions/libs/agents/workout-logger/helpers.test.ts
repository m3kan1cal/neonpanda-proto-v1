import { describe, it, expect } from "vitest";
import { enforceValidationBlocking } from "./helpers";

describe("enforceValidationBlocking", () => {
  // ─── Null passthrough cases ─────────────────────────────────────────────────

  it("returns null when validationResult is null (tool proceeds)", () => {
    expect(enforceValidationBlocking("normalize_workout_data", null)).toBeNull();
  });

  it("returns null when validationResult is undefined", () => {
    expect(enforceValidationBlocking("save_workout_to_database", undefined)).toBeNull();
  });

  it("returns null for a tool not subject to blocking", () => {
    const validation = { shouldSave: false, blockingFlags: ["bad_data"] };
    expect(enforceValidationBlocking("detect_discipline", validation)).toBeNull();
    expect(enforceValidationBlocking("extract_workout_data", validation)).toBeNull();
    expect(enforceValidationBlocking("generate_workout_summary", validation)).toBeNull();
  });

  it("returns null when shouldSave is true (unblocked path)", () => {
    const validation = { shouldSave: true };
    expect(enforceValidationBlocking("normalize_workout_data", validation)).toBeNull();
    expect(enforceValidationBlocking("save_workout_to_database", validation)).toBeNull();
  });

  // ─── Blocking on validation.error ──────────────────────────────────────────

  it("blocks normalize_workout_data when validation threw an exception", () => {
    const validation = { error: "Validation exception message" };
    const result = enforceValidationBlocking("normalize_workout_data", validation);

    expect(result).not.toBeNull();
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.reason).toContain("normalize");
  });

  it("blocks save_workout_to_database when validation threw an exception", () => {
    const validation = { error: "Validation exception message" };
    const result = enforceValidationBlocking("save_workout_to_database", validation);

    expect(result).not.toBeNull();
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.reason).toContain("save");
  });

  // ─── Blocking on shouldSave === false ─────────────────────────────────────

  it("blocks normalize_workout_data when shouldSave is false", () => {
    const validation = {
      shouldSave: false,
      blockingFlags: ["no_exercises_found"],
      reason: "No exercises detected",
    };
    const result = enforceValidationBlocking("normalize_workout_data", validation);

    expect(result).not.toBeNull();
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.reason).toBeDefined();
    expect(result!.blockingFlags).toEqual(["no_exercises_found"]);
  });

  it("blocks save_workout_to_database when shouldSave is false", () => {
    const validation = {
      shouldSave: false,
      blockingFlags: ["insufficient_data"],
      reason: "Workout data is incomplete",
    };
    const result = enforceValidationBlocking("save_workout_to_database", validation);

    expect(result).not.toBeNull();
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.blockingFlags).toEqual(["insufficient_data"]);
  });

  it("block result includes { error: true, blocked: true, reason: string }", () => {
    const validation = { shouldSave: false, reason: "Test reason" };
    const result = enforceValidationBlocking("normalize_workout_data", validation);

    expect(typeof result!.error).toBe("boolean");
    expect(typeof result!.blocked).toBe("boolean");
    expect(typeof result!.reason).toBe("string");
    expect(result!.reason.length).toBeGreaterThan(0);
  });
});
