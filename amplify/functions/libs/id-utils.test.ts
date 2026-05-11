import { describe, it, expect } from "vitest";
import {
  generateShortId,
  generateWorkoutId,
  generateEntityId,
} from "./id-utils";

describe("generateShortId", () => {
  it("returns a 9-character lowercase alphanumeric string", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateShortId();
      expect(id).toHaveLength(9);
      expect(id).toMatch(/^[0-9a-z]{9}$/);
    }
  });

  // Regression: the previous `Math.random().toString(36).substring(2, 11)`
  // implementation occasionally returned duplicates when v2's workout-logger
  // agent executed multiple `extract_workout_data` tool calls inside the
  // same Lambda tick. That caused parallel saves to overwrite each other in
  // DynamoDB because workoutId is the partition-sort key.
  it("produces unique IDs across a large synchronous burst", () => {
    const ids = new Set<string>();
    const count = 10_000;
    for (let i = 0; i < count; i++) {
      ids.add(generateShortId());
    }
    expect(ids.size).toBe(count);
  });

  it("yields distinct workoutIds when called back-to-back in the same ms", () => {
    const userId = "user_test_abc";
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateWorkoutId(userId));
    }
    expect(ids.size).toBe(1000);
  });

  it("keeps generic entity IDs unique across the same userId/timestamp", () => {
    const userId = "user_test_xyz";
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateEntityId("workout", userId));
    }
    expect(ids.size).toBe(1000);
  });
});
