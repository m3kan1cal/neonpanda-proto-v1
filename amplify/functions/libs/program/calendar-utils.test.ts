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
  buildProgramCalendarWindow,
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

// ─── buildProgramCalendarWindow ─────────────────────────────────────────────

describe("buildProgramCalendarWindow", () => {
  it("centers the window on today and labels weekdays correctly (LA timezone)", () => {
    // Program starts Tue 2026-04-21. "Now" is 2026-05-09 19:00 UTC = noon LA on Saturday.
    // Saturday 2026-05-09 should be Day 19 (Day 1 = 2026-04-21 Tuesday).
    const now = new Date("2026-05-09T19:00:00Z");
    const window = buildProgramCalendarWindow(
      { startDate: "2026-04-21", pausedDuration: 0, totalDays: 84 },
      "America/Los_Angeles",
      3,
      5,
      now,
    );

    expect(window.todayIsoDate).toBe("2026-05-09");
    expect(window.todayDayNumber).toBe(19);

    const day19 = window.rows.find((r) => r.dayNumber === 19);
    expect(day19).toEqual({
      dayNumber: 19,
      isoDate: "2026-05-09",
      dayOfWeek: "Saturday",
      relative: "today",
    });

    const day24 = window.rows.find((r) => r.dayNumber === 24);
    // Original screenshot bug: AI claimed Day 24 was "Monday May 13".
    // The window must show Day 24 = Thursday 2026-05-14, in 5 days.
    expect(day24).toEqual({
      dayNumber: 24,
      isoDate: "2026-05-14",
      dayOfWeek: "Thursday",
      relative: "in 5 days",
    });

    expect(window.rows.find((r) => r.dayNumber === 18)?.relative).toBe(
      "yesterday",
    );
    expect(window.rows.find((r) => r.dayNumber === 20)?.relative).toBe(
      "tomorrow",
    );
    expect(window.rows.find((r) => r.dayNumber === 17)?.relative).toBe(
      "2 days ago",
    );

    // daysBefore=3, daysAfter=5 -> Day 16..Day 24
    expect(window.rows[0].dayNumber).toBe(16);
    expect(window.rows[window.rows.length - 1].dayNumber).toBe(24);
  });

  it("clamps to program range — never emits day < 1 or > totalDays", () => {
    // Today is Day 2 of a 5-day program, daysBefore=3 would request Day -1.
    const now = new Date("2026-04-22T19:00:00Z"); // Wednesday 2026-04-22
    const window = buildProgramCalendarWindow(
      { startDate: "2026-04-21", pausedDuration: 0, totalDays: 5 },
      "America/Los_Angeles",
      3,
      10,
      now,
    );
    expect(window.todayDayNumber).toBe(2);
    expect(window.rows[0].dayNumber).toBe(1);
    expect(window.rows[window.rows.length - 1].dayNumber).toBe(5);
  });

  it("returns null todayDayNumber when today is before program start", () => {
    const now = new Date("2026-04-15T19:00:00Z"); // Wednesday, before start
    const window = buildProgramCalendarWindow(
      { startDate: "2026-04-21", pausedDuration: 0, totalDays: 28 },
      "America/Los_Angeles",
      3,
      5,
      now,
    );
    expect(window.todayDayNumber).toBeNull();
    // Anchors on Day 1 when today is before the program.
    expect(window.rows[0].dayNumber).toBe(1);
    const day1 = window.rows.find((r) => r.dayNumber === 1);
    expect(day1?.isoDate).toBe("2026-04-21");
    expect(day1?.relative).toBe("in 6 days");
  });

  it("returns null todayDayNumber when today is after program end", () => {
    const now = new Date("2026-06-01T19:00:00Z"); // After 28-day program from 2026-04-21
    const window = buildProgramCalendarWindow(
      { startDate: "2026-04-21", pausedDuration: 0, totalDays: 28 },
      "America/Los_Angeles",
      3,
      5,
      now,
    );
    expect(window.todayDayNumber).toBeNull();
    // Anchors on the final day when today is after the program.
    expect(window.rows[window.rows.length - 1].dayNumber).toBe(28);
  });

  it("shifts the calendar by pausedDuration (paused programs)", () => {
    // Program started 2026-04-21 but was paused for 7 days. Today 2026-05-09
    // should now correspond to Day 12 (not Day 19): 19 - 7 = 12.
    const now = new Date("2026-05-09T19:00:00Z");
    const window = buildProgramCalendarWindow(
      { startDate: "2026-04-21", pausedDuration: 7, totalDays: 84 },
      "America/Los_Angeles",
      0,
      0,
      now,
    );
    expect(window.todayDayNumber).toBe(12);
    expect(window.rows).toHaveLength(1);
    expect(window.rows[0]).toEqual({
      dayNumber: 12,
      isoDate: "2026-05-09",
      dayOfWeek: "Saturday",
      relative: "today",
    });
  });

  it("handles DST spring-forward correctly", () => {
    // 2026-03-08 is DST spring-forward in LA. A program straddling it should
    // still produce contiguous YYYY-MM-DD rows with no missing/duplicate days.
    const now = new Date("2026-03-09T19:00:00Z"); // Monday after DST
    const window = buildProgramCalendarWindow(
      { startDate: "2026-03-06", pausedDuration: 0, totalDays: 14 },
      "America/Los_Angeles",
      3,
      3,
      now,
    );
    const dates = window.rows.map((r) => r.isoDate);
    expect(dates).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
    ]);
    expect(window.rows.find((r) => r.isoDate === "2026-03-08")?.dayOfWeek).toBe(
      "Sunday",
    );
  });

  it("respects user timezone for 'today' boundary", () => {
    // 2026-05-10T03:00 UTC: still 2026-05-09 in LA (8pm Saturday) but already
    // 2026-05-10 in Tokyo (noon Sunday). Same instant, different "today".
    const now = new Date("2026-05-10T03:00:00Z");

    const la = buildProgramCalendarWindow(
      { startDate: "2026-04-21", pausedDuration: 0, totalDays: 84 },
      "America/Los_Angeles",
      0,
      0,
      now,
    );
    expect(la.todayIsoDate).toBe("2026-05-09");
    expect(la.todayDayNumber).toBe(19);

    const tokyo = buildProgramCalendarWindow(
      { startDate: "2026-04-21", pausedDuration: 0, totalDays: 84 },
      "Asia/Tokyo",
      0,
      0,
      now,
    );
    expect(tokyo.todayIsoDate).toBe("2026-05-10");
    expect(tokyo.todayDayNumber).toBe(20);
  });
});
