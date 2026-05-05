import { describe, it, expect } from "vitest";
import { extractExercisesFromWorkout } from "./extraction";
import type { UniversalWorkoutSchema } from "../workout/types";

/**
 * Tests for CrossFit exercise metric extraction.
 *
 * Locks in the fix for the "Found many undefined values in DynamoDB
 * serialization" warning that fired because extractCrossFitMetrics was
 * assigning explicit undefined to optional fields (variation, percentage1rm,
 * reps, rxStatus). The fix uses conditional spreads so optional keys are
 * absent rather than undefined.
 */

function buildCrossFitWorkout(
  exercises: any[],
): UniversalWorkoutSchema {
  return {
    discipline: "crossfit",
    discipline_specific: {
      crossfit: {
        workout_format: "amrap",
        rx_status: "rx",
        rounds: [
          {
            round_number: 1,
            exercises,
          },
        ],
      },
    },
  } as unknown as UniversalWorkoutSchema;
}

describe("extractExercisesFromWorkout — CrossFit metrics shape", () => {
  it("omits optional fields entirely for a bare exercise (no undefined keys)", () => {
    const workout = buildCrossFitWorkout([
      {
        exercise_name: "pull_up",
        movement_type: "bodyweight",
      },
    ]);

    const result = extractExercisesFromWorkout(workout);

    expect(result.exercises).toHaveLength(1);
    const metrics = result.exercises[0].metrics;

    expect(metrics).toEqual({ movementType: "bodyweight" });
    expect(Object.keys(metrics)).not.toContain("variation");
    expect(Object.keys(metrics)).not.toContain("percentage1rm");
    expect(Object.keys(metrics)).not.toContain("reps");
    expect(Object.keys(metrics)).not.toContain("rxStatus");
  });

  it("omits percentage1rm and rxStatus when weight is provided without percentage_1rm", () => {
    const workout = buildCrossFitWorkout([
      {
        exercise_name: "thruster",
        movement_type: "barbell",
        weight: { value: 95, unit: "lbs" },
      },
    ]);

    const result = extractExercisesFromWorkout(workout);
    const metrics = result.exercises[0].metrics;

    expect(metrics.weight).toBe(95);
    expect(metrics.weightUnit).toBe("lbs");
    expect(Object.keys(metrics)).not.toContain("percentage1rm");
    expect(Object.keys(metrics)).not.toContain("rxStatus");
    expect(Object.keys(metrics)).not.toContain("reps");
  });

  it("omits reps key entirely when reps.completed is non-numeric", () => {
    const workout = buildCrossFitWorkout([
      {
        exercise_name: "pull_up",
        movement_type: "bodyweight",
        reps: { prescribed: "max", completed: null },
      },
    ]);

    const result = extractExercisesFromWorkout(workout);
    const metrics = result.exercises[0].metrics;

    expect(Object.keys(metrics)).not.toContain("reps");
  });

  it("includes all optional fields when fully populated", () => {
    const workout = buildCrossFitWorkout([
      {
        exercise_name: "back_squat",
        movement_type: "barbell",
        variation: "high_bar",
        weight: { value: 225, unit: "lbs", percentage_1rm: 0.8 },
        reps: { prescribed: 5, completed: 5 },
        distance: 0,
        time: 0,
        calories: 0,
      },
    ]);

    const result = extractExercisesFromWorkout(workout);
    const metrics = result.exercises[0].metrics;

    expect(metrics.movementType).toBe("barbell");
    expect(metrics.variation).toBe("high_bar");
    expect(metrics.weight).toBe(225);
    expect(metrics.weightUnit).toBe("lbs");
    expect(metrics.percentage1rm).toBe(0.8);
    expect(metrics.reps).toBe(5);
    // distance/time/calories use truthy guard so 0 is intentionally excluded
    expect(Object.keys(metrics)).not.toContain("distance");
    expect(Object.keys(metrics)).not.toContain("time");
    expect(Object.keys(metrics)).not.toContain("calories");
    expect(Object.keys(metrics)).not.toContain("rxStatus");
  });

  it("includes distance/time/calories only when truthy", () => {
    const workout = buildCrossFitWorkout([
      {
        exercise_name: "row",
        movement_type: "machine",
        distance: 500,
        time: 90,
        calories: 25,
      },
    ]);

    const result = extractExercisesFromWorkout(workout);
    const metrics = result.exercises[0].metrics;

    expect(metrics.distance).toBe(500);
    expect(metrics.time).toBe(90);
    expect(metrics.calories).toBe(25);
  });

  it("never assigns undefined to any field (regression guard for DDB warning)", () => {
    const workout = buildCrossFitWorkout([
      {
        exercise_name: "burpee",
        movement_type: "bodyweight",
      },
      {
        exercise_name: "wall_ball",
        movement_type: "medicine_ball",
        weight: { value: 20, unit: "lbs" },
      },
      {
        exercise_name: "double_under",
        movement_type: "bodyweight",
        reps: { prescribed: 50, completed: 50 },
      },
    ]);

    const result = extractExercisesFromWorkout(workout);

    for (const ex of result.exercises) {
      const undefinedFields = Object.entries(ex.metrics)
        .filter(([_, v]) => v === undefined)
        .map(([k]) => k);
      expect(undefinedFields).toEqual([]);
    }
  });
});
