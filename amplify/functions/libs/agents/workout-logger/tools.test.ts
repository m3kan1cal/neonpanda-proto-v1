import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────
// Must be declared before importing the SUT.
//
// We mock the *minimum* surface that `validateWorkoutCompletenessTool` calls
// directly: classification, exercise-structure validation, schema validation,
// blocking-flag determination, and a couple of pure helpers. Everything else
// (date parsing, completeness scoring, etc.) is allowed to run with real
// implementations because they are deterministic and side-effect free.

vi.mock("../../workout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../workout")>();
  return {
    ...actual,
    // Deterministic high scores so we don't hit the <0.2 completeness short-circuit.
    calculateConfidence: vi.fn().mockReturnValue(0.9),
    calculateCompleteness: vi.fn().mockReturnValue(0.7),
    // Default to *quantitative* discipline classification. Individual tests
    // override this when they want to assert the qualitative-discipline path.
    classifyWorkoutCharacteristics: vi.fn().mockResolvedValue({
      isQualitative: false,
      requiresPreciseMetrics: true,
      environment: "indoor",
      primaryFocus: "strength",
      confidence: 0.95,
      reasoning: "Discipline is typically quantitative",
    }),
  };
});

vi.mock("../../workout/validation-helpers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../workout/validation-helpers")>();
  return {
    ...actual,
    validateAndCorrectWorkoutDate: vi.fn(),
    validateExerciseStructure: vi.fn(),
    validateSchemaStructure: vi.fn().mockReturnValue({ isValid: true }),
    // We use the *real* determineBlockingFlags + buildBlockingReason — they're
    // the unit under indirect test. The whole point of this file is to prove
    // the orchestration in tools.ts correctly *unwinds* a flag that
    // determineBlockingFlags legitimately set.
    determineBlockingFlags: actual.determineBlockingFlags,
    buildBlockingReason: actual.buildBlockingReason,
  };
});

vi.mock("../../workout/normalization", () => ({
  shouldNormalizeWorkout: vi.fn().mockReturnValue(false),
  normalizeWorkout: vi.fn(),
  generateNormalizationSummary: vi.fn(),
}));

vi.mock("../../response-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../response-utils")>();
  return {
    ...actual,
    // Pass workoutData through untouched so the test can shape it freely.
    fixDoubleEncodedProperties: vi.fn((data: unknown) => data),
  };
});

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { validateWorkoutCompletenessTool } from "./tools";
import {
  validateExerciseStructure,
  validateSchemaStructure,
} from "../../workout/validation-helpers";
import { classifyWorkoutCharacteristics } from "../../workout";

// ─── Fixtures & helpers ──────────────────────────────────────────────────────

/**
 * Minimal workout shape sufficient to exercise the validator without tripping
 * the pre-validation guards (low completeness, missing metadata, etc.). The
 * specific discipline doesn't matter — we control the qualitative signals
 * directly via mocks.
 */
function makeWorkoutData(overrides: Record<string, unknown> = {}) {
  return {
    workout_id: "workout_test_123",
    workout_name: "Test Workout",
    discipline: "crossfit",
    metadata: {
      validation_flags: ["no_performance_data"],
    },
    discipline_specific: {
      crossfit: {},
    },
    ...overrides,
  };
}

function makeContext(workoutData: unknown) {
  return {
    userId: "user_test",
    conversationId: "conv_test",
    userTimezone: "America/Los_Angeles",
    getToolResult: vi.fn().mockImplementation((key: string) => {
      if (key === "extraction") {
        return {
          workoutData,
          completedAt: "2026-04-20T10:00:00Z",
          userMessage: "logged a chipper, no precise data",
          generationMethod: "tool",
        };
      }
      return undefined;
    }),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-assert defaults — `clearAllMocks` clears call history but does NOT
  // reset implementations set via `mockResolvedValue` in earlier tests, which
  // would otherwise bleed between tests via `vi.mocked(...).mockResolvedValue`.
  vi.mocked(classifyWorkoutCharacteristics).mockResolvedValue({
    isQualitative: false,
    requiresPreciseMetrics: true,
    environment: "indoor",
    primaryFocus: "strength",
    confidence: 0.95,
    reasoning: "Discipline is typically quantitative",
  });
  vi.mocked(validateSchemaStructure).mockReturnValue({ isValid: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("validateWorkoutCompletenessTool – workout-level qualitative promotion", () => {
  it("clears no_performance_data when workout-level isQualitative is true (the bug fix)", async () => {
    // Discipline-level: quantitative (CrossFit default) -> no_performance_data
    // ends up in the strict-block list and is *present* on the workout.
    // Workout-level: qualitative -> we expect the flag to be cleared and the
    // workout to be saveable.
    vi.mocked(validateExerciseStructure).mockResolvedValue({
      hasExercises: true,
      method: "qualitative_workout",
      aiReasoning: "Activity-based CrossFit log",
      isQualitative: true,
    });

    const workoutData = makeWorkoutData();
    const ctx = makeContext(workoutData);

    const result = await validateWorkoutCompletenessTool.execute(
      { isSlashCommand: false },
      ctx,
    );

    expect(result.isValid).toBe(true);
    expect(result.shouldSave).toBe(true);
    expect(result.blockingFlags).not.toContain("no_performance_data");
    expect(result.reason).toBeUndefined();
  });

  it("retains no_performance_data when workout-level isQualitative is false (unchanged behavior)", async () => {
    // Discipline-level quantitative + workout-level *not* qualitative
    // => the flag must remain and block the save.
    vi.mocked(validateExerciseStructure).mockResolvedValue({
      hasExercises: true,
      method: "property_check",
      isQualitative: false,
    });

    const workoutData = makeWorkoutData();
    const ctx = makeContext(workoutData);

    const result = await validateWorkoutCompletenessTool.execute(
      { isSlashCommand: false },
      ctx,
    );

    expect(result.isValid).toBe(false);
    expect(result.shouldSave).toBe(false);
    expect(result.blockingFlags).toContain("no_performance_data");
    expect(result.reason).toMatch(/no performance data/i);
  });

  it("still blocks on planning_inquiry even when workout-level isQualitative is true", async () => {
    // The qualitative promotion ONLY clears no_performance_data. Intent-based
    // flags (planning_inquiry / advice_seeking / future_planning) must
    // continue to block regardless of qualitative classification.
    vi.mocked(validateExerciseStructure).mockResolvedValue({
      hasExercises: true,
      method: "qualitative_workout",
      isQualitative: true,
    });

    const workoutData = makeWorkoutData({
      metadata: {
        validation_flags: ["no_performance_data", "planning_inquiry"],
      },
    });
    const ctx = makeContext(workoutData);

    const result = await validateWorkoutCompletenessTool.execute(
      { isSlashCommand: false },
      ctx,
    );

    expect(result.shouldSave).toBe(false);
    expect(result.blockingFlags).not.toContain("no_performance_data");
    expect(result.blockingFlags).toContain("planning_inquiry");
  });

  it("leaves blocking flags untouched when discipline itself is qualitative (no-op path)", async () => {
    // If the discipline is *already* qualitative at the discipline level,
    // determineBlockingFlags never adds no_performance_data in the first
    // place. The promotion logic should be a no-op here.
    vi.mocked(classifyWorkoutCharacteristics).mockResolvedValue({
      isQualitative: true,
      requiresPreciseMetrics: false,
      environment: "outdoor",
      primaryFocus: "endurance",
      confidence: 0.9,
      reasoning: "Hiking is qualitative",
    });
    vi.mocked(validateExerciseStructure).mockResolvedValue({
      hasExercises: true,
      method: "qualitative_workout",
      isQualitative: true,
    });

    const workoutData = makeWorkoutData({
      discipline: "hiking",
      // no_performance_data wouldn't realistically appear here, but we
      // include it to assert it isn't *added* by the qualitative-discipline path.
      metadata: { validation_flags: [] },
      discipline_specific: { hiking: {} },
    });
    const ctx = makeContext(workoutData);

    const result = await validateWorkoutCompletenessTool.execute(
      { isSlashCommand: false },
      ctx,
    );

    expect(result.isValid).toBe(true);
    expect(result.shouldSave).toBe(true);
    expect(result.blockingFlags).toEqual([]);
  });

  it("does not promote when validateExerciseStructure returns isQualitative undefined", async () => {
    // Defensive: an undefined `isQualitative` (legacy / property_check path)
    // must be treated as false, not truthy.
    vi.mocked(validateExerciseStructure).mockResolvedValue({
      hasExercises: true,
      method: "property_check",
      // isQualitative deliberately omitted
    } as any);

    const workoutData = makeWorkoutData();
    const ctx = makeContext(workoutData);

    const result = await validateWorkoutCompletenessTool.execute(
      { isSlashCommand: false },
      ctx,
    );

    expect(result.shouldSave).toBe(false);
    expect(result.blockingFlags).toContain("no_performance_data");
  });
});
