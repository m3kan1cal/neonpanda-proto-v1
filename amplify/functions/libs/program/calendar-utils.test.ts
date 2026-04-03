import { describe, it, expect } from "vitest";
import {
  calculateEndDate,
  calculateScheduledDate,
  calculatePauseDuration,
  recalculateWorkoutDates,
  isWorkoutOverdue,
  getWorkoutsForWeek,
  getUpcomingWorkouts,
  getDaysRemaining,
  getProgressPercentage,
  formatDate,
  parseDate,
  getPhaseForDay,
} from "./calendar-utils";
import type { WorkoutTemplate } from "./types";
import type { Program } from "./types";

// ─── Factories ───────────────────────────────────────────────────────────────

const makeWorkout = (
  overrides?: Partial<WorkoutTemplate>,
): WorkoutTemplate =>
  ({
    templateId: "t1",
    groupId: "g1",
    dayNumber: 1,
    name: "Test Workout",
    type: "strength",
    description: "A test workout",
    prescribedExercises: [],
    scoringType: "load",
    estimatedDuration: 60,
    restAfter: 0,
    status: "pending",
    ...overrides,
  }) as unknown as WorkoutTemplate;

const makeProgram = (overrides?: Partial<Program>): Program =>
  ({
    programId: "prog1",
    userId: "user1",
    phases: [
      { phaseId: "p1", name: "Phase 1", startDay: 1, endDay: 14, durationDays: 14, description: "", focusAreas: [] },
      { phaseId: "p2", name: "Phase 2", startDay: 15, endDay: 28, durationDays: 14, description: "", focusAreas: [] },
    ],
    ...overrides,
  }) as unknown as Program;

// ─── formatDate ──────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatDate(new Date(2025, 0, 7))).toBe("2025-01-07");
  });

  it("zero-pads single-digit month and day", () => {
    expect(formatDate(new Date(2025, 0, 1))).toBe("2025-01-01");
  });

  it("handles December correctly", () => {
    expect(formatDate(new Date(2025, 11, 31))).toBe("2025-12-31");
  });
});

// ─── parseDate ───────────────────────────────────────────────────────────────

describe("parseDate", () => {
  it("parses YYYY-MM-DD to a Date", () => {
    const d = parseDate("2025-06-15");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it("round-trips through formatDate", () => {
    expect(formatDate(parseDate("2025-03-20"))).toBe("2025-03-20");
  });
});

// ─── calculateEndDate ────────────────────────────────────────────────────────

describe("calculateEndDate", () => {
  it("day 1 is the start date so 7-day program ends on day 7", () => {
    expect(calculateEndDate("2025-01-01", 7)).toBe("2025-01-07");
  });

  it("single-day program ends on start date", () => {
    expect(calculateEndDate("2025-01-01", 1)).toBe("2025-01-01");
  });

  it("56-day program adds 55 calendar days to start date", () => {
    expect(calculateEndDate("2025-01-01", 56)).toBe("2025-02-25");
  });

  it("handles month boundary correctly", () => {
    expect(calculateEndDate("2025-01-28", 7)).toBe("2025-02-03");
  });
});

// ─── calculateScheduledDate ──────────────────────────────────────────────────

describe("calculateScheduledDate", () => {
  it("day 1 with no pause equals start date", () => {
    expect(calculateScheduledDate("2025-01-01", 1, 0)).toBe("2025-01-01");
  });

  it("day 3 with no pause is start + 2 days", () => {
    expect(calculateScheduledDate("2025-01-01", 3, 0)).toBe("2025-01-03");
  });

  it("day 3 with 2-day pause is start + 4 days", () => {
    expect(calculateScheduledDate("2025-01-01", 3, 2)).toBe("2025-01-05");
  });

  it("day 1 with 5-day pause is start + 5 days", () => {
    expect(calculateScheduledDate("2025-01-01", 1, 5)).toBe("2025-01-06");
  });
});

// ─── calculatePauseDuration ──────────────────────────────────────────────────

describe("calculatePauseDuration", () => {
  it("calculates 4 days between Jan 1 and Jan 5", () => {
    expect(calculatePauseDuration(new Date("2025-01-01"), new Date("2025-01-05"))).toBe(4);
  });

  it("calculates 1 day between consecutive days", () => {
    expect(calculatePauseDuration(new Date("2025-03-10"), new Date("2025-03-11"))).toBe(1);
  });

  it("returns 0 when same day", () => {
    expect(calculatePauseDuration(new Date("2025-01-01"), new Date("2025-01-01"))).toBe(0);
  });
});

// ─── recalculateWorkoutDates ─────────────────────────────────────────────────

describe("recalculateWorkoutDates", () => {
  it("updates scheduledDate for each workout using pausedDuration", () => {
    const workouts = [
      makeWorkout({ dayNumber: 1 }),
      makeWorkout({ dayNumber: 3 }),
    ];
    const result = recalculateWorkoutDates(workouts, "2025-01-01", 0);
    expect(result[0].scheduledDate).toBe("2025-01-01");
    expect(result[1].scheduledDate).toBe("2025-01-03");
  });

  it("accounts for paused duration when recalculating", () => {
    const workouts = [makeWorkout({ dayNumber: 1 })];
    const result = recalculateWorkoutDates(workouts, "2025-01-01", 2);
    expect(result[0].scheduledDate).toBe("2025-01-03");
  });

  it("does not mutate original workout objects", () => {
    const workout = makeWorkout({ dayNumber: 2 });
    recalculateWorkoutDates([workout], "2025-01-01", 0);
    expect((workout as any).scheduledDate).toBeUndefined();
  });
});

// ─── isWorkoutOverdue ────────────────────────────────────────────────────────

describe("isWorkoutOverdue", () => {
  const pastDate = "2020-01-01"; // Always in the past
  const futureDate = "2099-12-31"; // Always in the future

  it("returns false for completed workout regardless of date", () => {
    expect(isWorkoutOverdue(pastDate, "completed")).toBe(false);
  });

  it("returns false for skipped workout regardless of date", () => {
    expect(isWorkoutOverdue(pastDate, "skipped")).toBe(false);
  });

  it("returns true for past-dated pending workout", () => {
    expect(isWorkoutOverdue(pastDate, "pending")).toBe(true);
  });

  it("returns false for future-dated pending workout", () => {
    expect(isWorkoutOverdue(futureDate, "pending")).toBe(false);
  });
});

// ─── getUpcomingWorkouts ─────────────────────────────────────────────────────

describe("getUpcomingWorkouts", () => {
  it("returns up to N pending workouts sorted by dayNumber", () => {
    const workouts = [
      makeWorkout({ dayNumber: 5, status: "pending", templateId: "t5" }),
      makeWorkout({ dayNumber: 1, status: "pending", templateId: "t1" }),
      makeWorkout({ dayNumber: 3, status: "pending", templateId: "t3" }),
    ];
    const result = getUpcomingWorkouts(workouts, 2);
    expect(result).toHaveLength(2);
    expect(result[0].dayNumber).toBe(1);
    expect(result[1].dayNumber).toBe(3);
  });

  it("excludes completed and skipped workouts", () => {
    const workouts = [
      makeWorkout({ dayNumber: 1, status: "completed" }),
      makeWorkout({ dayNumber: 2, status: "skipped" }),
      makeWorkout({ dayNumber: 3, status: "pending" }),
    ];
    const result = getUpcomingWorkouts(workouts, 10);
    expect(result).toHaveLength(1);
    expect(result[0].dayNumber).toBe(3);
  });

  it("returns empty array when no pending workouts", () => {
    const workouts = [makeWorkout({ status: "completed" })];
    expect(getUpcomingWorkouts(workouts, 5)).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(getUpcomingWorkouts([], 5)).toHaveLength(0);
  });
});

// ─── getDaysRemaining ─────────────────────────────────────────────────────────

describe("getDaysRemaining", () => {
  it("returns correct days remaining", () => {
    expect(getDaysRemaining(10, 56)).toBe(47);
  });

  it("returns 1 on the final day", () => {
    expect(getDaysRemaining(56, 56)).toBe(1);
  });

  it("returns 0 when past the end", () => {
    expect(getDaysRemaining(60, 56)).toBe(0);
  });

  it("returns totalDays on day 1", () => {
    expect(getDaysRemaining(1, 56)).toBe(56);
  });
});

// ─── getProgressPercentage ───────────────────────────────────────────────────

describe("getProgressPercentage", () => {
  it("returns 50 at halfway point", () => {
    expect(getProgressPercentage(28, 56)).toBe(50);
  });

  it("returns 100 on the final day", () => {
    expect(getProgressPercentage(56, 56)).toBe(100);
  });

  it("returns 0 on day 0 (before start)", () => {
    expect(getProgressPercentage(0, 56)).toBe(0);
  });

  it("returns 0 for zero totalDays (guard against division by zero)", () => {
    expect(getProgressPercentage(0, 0)).toBe(0);
  });

  it("caps at 100 when currentDay exceeds totalDays", () => {
    expect(getProgressPercentage(70, 56)).toBe(100);
  });
});

// ─── getPhaseForDay ──────────────────────────────────────────────────────────

describe("getPhaseForDay", () => {
  const program = makeProgram();

  it("returns phase 1 for day 1", () => {
    const phase = getPhaseForDay(program, 1);
    expect(phase).not.toBeNull();
    expect(phase!.phaseId).toBe("p1");
  });

  it("returns phase 1 for last day of phase 1", () => {
    const phase = getPhaseForDay(program, 14);
    expect(phase!.phaseId).toBe("p1");
  });

  it("returns phase 2 for first day of phase 2", () => {
    const phase = getPhaseForDay(program, 15);
    expect(phase!.phaseId).toBe("p2");
  });

  it("returns null when day is beyond all phases", () => {
    expect(getPhaseForDay(program, 999)).toBeNull();
  });

  it("returns null when day is before all phases (day 0)", () => {
    expect(getPhaseForDay(program, 0)).toBeNull();
  });
});

// ─── getWorkoutsForWeek ───────────────────────────────────────────────────────

describe("getWorkoutsForWeek", () => {
  it("returns workouts scheduled within the 7-day window", () => {
    const workouts = [
      makeWorkout({ dayNumber: 1, templateId: "t1" }), // Jan 1
      makeWorkout({ dayNumber: 2, templateId: "t2" }), // Jan 2
      makeWorkout({ dayNumber: 8, templateId: "t8" }), // Jan 8 — outside week
    ];
    const result = getWorkoutsForWeek(workouts, "2025-01-01", "2025-01-01", 0);
    expect(result).toHaveLength(2);
    expect(result.map((w) => w.templateId)).toEqual(["t1", "t2"]);
  });

  it("returns empty array when no workouts fall in the window", () => {
    const workouts = [makeWorkout({ dayNumber: 10, templateId: "t10" })];
    const result = getWorkoutsForWeek(workouts, "2025-01-01", "2025-01-01", 0);
    expect(result).toHaveLength(0);
  });

  it("includes workouts on both boundary days", () => {
    const workouts = [
      makeWorkout({ dayNumber: 1, templateId: "t1" }), // Jan 1 — week start
      makeWorkout({ dayNumber: 7, templateId: "t7" }), // Jan 7 — week end
    ];
    const result = getWorkoutsForWeek(workouts, "2025-01-01", "2025-01-01", 0);
    expect(result).toHaveLength(2);
  });
});
