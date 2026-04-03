import { describe, it, expect } from "vitest";
import {
  calculateProgramMetrics,
  checkTrainingFrequencyCompliance,
  enforceAllBlocking,
} from "./helpers";
import type { WorkoutTemplate } from "../../program/types";

// ─── Factories ───────────────────────────────────────────────────────────────

const makeWorkout = (dayNumber: number, templateId?: string): WorkoutTemplate =>
  ({
    templateId: templateId ?? `t${dayNumber}`,
    groupId: `g${dayNumber}`,
    dayNumber,
    name: "Test Workout",
    type: "strength",
    description: "Test",
    prescribedExercises: [],
    scoringType: "load",
    estimatedDuration: 60,
    restAfter: 0,
    status: "pending",
  }) as unknown as WorkoutTemplate;

// ─── calculateProgramMetrics ──────────────────────────────────────────────────

describe("calculateProgramMetrics", () => {
  it("returns zeros for empty array", () => {
    const result = calculateProgramMetrics([]);
    expect(result.totalWorkoutTemplates).toBe(0);
    expect(result.uniqueTrainingDays).toBe(0);
    expect(result.averageSessionsPerDay).toBe("0.0");
  });

  it("counts total templates correctly", () => {
    const workouts = [makeWorkout(1), makeWorkout(2), makeWorkout(3)];
    expect(calculateProgramMetrics(workouts).totalWorkoutTemplates).toBe(3);
  });

  it("deduplicates workouts on the same day for uniqueTrainingDays", () => {
    // Two templates on day 1, one on day 2
    const workouts = [
      makeWorkout(1, "t1a"),
      makeWorkout(1, "t1b"),
      makeWorkout(2, "t2"),
    ];
    const result = calculateProgramMetrics(workouts);
    expect(result.totalWorkoutTemplates).toBe(3);
    expect(result.uniqueTrainingDays).toBe(2);
  });

  it("calculates average sessions per day to 1 decimal", () => {
    // 3 templates across 2 days = 1.5 sessions/day
    const workouts = [
      makeWorkout(1, "t1a"),
      makeWorkout(1, "t1b"),
      makeWorkout(2, "t2"),
    ];
    expect(calculateProgramMetrics(workouts).averageSessionsPerDay).toBe("1.5");
  });

  it("returns 1.0 when one session per day", () => {
    const workouts = [makeWorkout(1), makeWorkout(2), makeWorkout(3)];
    expect(calculateProgramMetrics(workouts).averageSessionsPerDay).toBe("1.0");
  });

  it("returns 2.0 when all days have two sessions", () => {
    const workouts = [
      makeWorkout(1, "t1a"),
      makeWorkout(1, "t1b"),
      makeWorkout(2, "t2a"),
      makeWorkout(2, "t2b"),
    ];
    expect(calculateProgramMetrics(workouts).averageSessionsPerDay).toBe("2.0");
  });
});

// ─── checkTrainingFrequencyCompliance ─────────────────────────────────────────

describe("checkTrainingFrequencyCompliance", () => {
  it("returns no pruning needed for empty workouts", () => {
    expect(checkTrainingFrequencyCompliance([], 56, 3)).toEqual({
      shouldPrune: false,
      isUnderGenerated: false,
    });
  });

  it("returns no pruning when expectedTrainingDays < 3 (edge case guard)", () => {
    // 1 day program, 2 days/week → expectedTrainingDays = floor(1/7 * 2) = 0
    const workouts = [makeWorkout(1)];
    expect(checkTrainingFrequencyCompliance(workouts, 1, 2)).toEqual({
      shouldPrune: false,
      isUnderGenerated: false,
    });
  });

  it("returns shouldPrune=false when within 20% tolerance", () => {
    // 56-day program, 3 days/week → expected = 24 training days; tolerance = ±4.8
    // 26 actual training days = within tolerance
    const workouts = Array.from({ length: 26 }, (_, i) => makeWorkout(i + 1));
    const result = checkTrainingFrequencyCompliance(workouts, 56, 3);
    expect(result.shouldPrune).toBe(false);
    expect(result.isUnderGenerated).toBe(false);
  });

  it("returns shouldPrune=true when significantly over expected training days", () => {
    // 56-day program, 3 days/week → expected = 24 training days; tolerance = 4.8
    // 40 actual training days = 16 over (way beyond tolerance)
    const workouts = Array.from({ length: 40 }, (_, i) => makeWorkout(i + 1));
    const result = checkTrainingFrequencyCompliance(workouts, 56, 3);

    expect(result.shouldPrune).toBe(true);
    expect(result.isUnderGenerated).toBe(false);
    expect(result.pruningMetadata).toBeDefined();
    expect(result.pruningMetadata!.currentTrainingDays).toBe(40);
    expect(result.pruningMetadata!.expectedTrainingDays).toBe(24);
    expect(result.pruningMetadata!.targetTrainingDays).toBe(24);
  });

  it("returns shouldPrune=false and isUnderGenerated=true when under expected training days", () => {
    // 56-day program, 5 days/week → expected = 40; actual = 20 (50% — well under 90% threshold)
    const workouts = Array.from({ length: 20 }, (_, i) => makeWorkout(i + 1));
    const result = checkTrainingFrequencyCompliance(workouts, 56, 5);
    expect(result.shouldPrune).toBe(false);
    expect(result.isUnderGenerated).toBe(true);
    expect(result.underGenerationMetadata).toBeDefined();
    expect(result.underGenerationMetadata!.currentTrainingDays).toBe(20);
    expect(result.underGenerationMetadata!.expectedTrainingDays).toBe(40);
    expect(result.underGenerationMetadata!.deficit).toBe(20);
  });

  it("returns isUnderGenerated=false when slightly under but within 10% tolerance", () => {
    // 56-day program, 3 days/week → expected = 24; actual = 22 (92% — within threshold)
    const workouts = Array.from({ length: 22 }, (_, i) => makeWorkout(i + 1));
    const result = checkTrainingFrequencyCompliance(workouts, 56, 3);
    expect(result.shouldPrune).toBe(false);
    expect(result.isUnderGenerated).toBe(false);
  });

  it("includes variance in pruningMetadata", () => {
    const workouts = Array.from({ length: 40 }, (_, i) => makeWorkout(i + 1));
    const result = checkTrainingFrequencyCompliance(workouts, 56, 3);
    expect(result.pruningMetadata!.variance).toBeGreaterThan(0);
  });
});

// ─── enforceAllBlocking ───────────────────────────────────────────────────────

describe("enforceAllBlocking", () => {
  // ─── No results yet ────────────────────────────────────────────────────────

  it("returns null when all results are null/undefined", () => {
    expect(
      enforceAllBlocking("save_program_to_database", null, null),
    ).toBeNull();
    expect(
      enforceAllBlocking("save_program_to_database", undefined, undefined),
    ).toBeNull();
  });

  // ─── Non-save tools pass through ─────────────────────────────────────────

  it("returns null for tools other than save_program_to_database", () => {
    const validation = { isValid: false };
    expect(
      enforceAllBlocking("normalize_program_data", validation, null),
    ).toBeNull();
    expect(
      enforceAllBlocking("validate_program_structure", validation, null),
    ).toBeNull();
  });

  // ─── Validation exception ─────────────────────────────────────────────────

  it("blocks save when validationResult.error is set", () => {
    const result = enforceAllBlocking(
      "save_program_to_database",
      { error: "Validation threw" },
      null,
    );
    expect(result).not.toBeNull();
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.reason).toContain("validation failed with error");
  });

  // ─── Validation isValid: false ────────────────────────────────────────────

  it("blocks save when validation isValid is false", () => {
    const result = enforceAllBlocking(
      "save_program_to_database",
      { isValid: false, validationIssues: ["missing phases"] },
      null,
    );
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.validationIssues).toEqual(["missing phases"]);
  });

  // ─── Pruning failure is best-effort (no block) ────────────────────────────

  it("does NOT block save when pruning was recommended but not executed", () => {
    const validationWithPrune = {
      isValid: true,
      shouldPrune: true,
      pruningMetadata: { currentTrainingDays: 40, targetTrainingDays: 24 },
    };
    const result = enforceAllBlocking(
      "save_program_to_database",
      validationWithPrune,
      { isValid: true }, // normalization passed
      null, // no pruning result
    );
    // Should allow save to proceed despite missed pruning
    expect(result).toBeNull();
  });

  it("does NOT block save when pruning result has error (best-effort)", () => {
    const validationWithPrune = { isValid: true, shouldPrune: true };
    const result = enforceAllBlocking(
      "save_program_to_database",
      validationWithPrune,
      { isValid: true },
      { error: "Pruning failed" },
    );
    expect(result).toBeNull();
  });

  // ─── Normalization exception ──────────────────────────────────────────────

  it("blocks save when normalizationResult.error is set", () => {
    const result = enforceAllBlocking(
      "save_program_to_database",
      { isValid: true },
      { error: "Normalization threw" },
    );
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.reason).toContain("normalization failed with error");
  });

  // ─── Normalization isValid: false ─────────────────────────────────────────

  it("blocks save when normalization isValid is false", () => {
    const result = enforceAllBlocking(
      "save_program_to_database",
      { isValid: true },
      { isValid: false, issuesFound: 3, correctionsMade: 1 },
    );
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.normalizationIssues).toBeDefined();
    expect(result!.normalizationIssues!.issuesFound).toBe(3);
    expect(result!.normalizationIssues!.correctionsMade).toBe(1);
    expect(result!.normalizationIssues!.remainingIssues).toBe(2);
  });

  // ─── All passing ─────────────────────────────────────────────────────────

  it("returns null when validation and normalization both pass", () => {
    const result = enforceAllBlocking(
      "save_program_to_database",
      { isValid: true },
      { isValid: true },
    );
    expect(result).toBeNull();
  });
});
