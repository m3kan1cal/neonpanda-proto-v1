import { describe, it, expect } from "vitest";
import {
  formatWeeklyReportForPrompt,
  formatMonthlyReportForPrompt,
} from "./format-for-prompt";
import type { WeeklyAnalytics, MonthlyAnalytics } from "./types";

const baseStructured = {
  metadata: { sessions_completed: 5 },
  volume_breakdown: {
    working_sets: { total_tonnage: 42500 },
    movements: [
      { name: "Back Squat", tonnage: 18000 },
      { name: "Bench Press", tonnage: 12000 },
      { name: "Deadlift", tonnage: 9500 },
      { name: "Overhead Press", tonnage: 3000 },
    ],
  },
  weekly_progression: { progressive_overload_score: 7 },
  fatigue_management: { recovery_score: 8 },
  raw_aggregations: {
    daily_volume: [
      { duration: 65, avg_rpe: 7.5 },
      { duration: 72, avg_rpe: 8.0 },
      { duration: 0, avg_rpe: 0 },
      { duration: 60, avg_rpe: 7.0 },
    ],
  },
  performance_markers: {
    records_set: [
      { exercise: "Back Squat", detail: "315 x 5" },
      { exercise: "Deadlift", detail: "405 x 3" },
    ],
  },
};

const weekly: WeeklyAnalytics = {
  userId: "u_1",
  weekId: "2025-W32",
  weekStart: "2025-08-04",
  weekEnd: "2025-08-10",
  analyticsData: {
    structured_analytics: baseStructured,
    human_summary:
      "Solid hypertrophy week — held intent through Friday and recovered well. " +
      "RPE crept up by Saturday, recommend a deload-light next week.",
  },
  s3Location: "ignored",
  metadata: {
    workoutCount: 4,
    conversationCount: 0,
    memoryCount: 0,
    historicalSummaryCount: 0,
    analyticsLength: 0,
    hasAthleteProfile: true,
    hasDualOutput: true,
    humanSummaryLength: 200,
    analysisConfidence: "high",
    dataCompleteness: 0.95,
  },
};

const monthly: MonthlyAnalytics = {
  ...weekly,
  weekId: undefined as any,
  weekStart: undefined as any,
  weekEnd: undefined as any,
  monthId: "2025-08",
  monthStart: "2025-08-01",
  monthEnd: "2025-08-31",
} as any;

describe("formatWeeklyReportForPrompt", () => {
  it("includes the week identity header", () => {
    const out = formatWeeklyReportForPrompt(weekly);
    expect(out).toContain("WEEKLY REPORT IN FOCUS");
    expect(out).toContain("Week ID: 2025-W32");
    expect(out).toContain("Week of: 2025-08-04 → 2025-08-10");
  });

  it("includes core highlights", () => {
    const out = formatWeeklyReportForPrompt(weekly);
    expect(out).toContain("Sessions completed: 5");
    expect(out).toContain("Total working-set tonnage: 42,500 lbs");
    expect(out).toContain("Total training time: 197 min");
    expect(out).toContain("Progressive overload score: 7/10");
    expect(out).toContain("Recovery score: 8/10");
    expect(out).toMatch(/Average RPE: 7\.5/);
    expect(out).toContain("Records set: 2");
  });

  it("lists top movements with tonnage", () => {
    const out = formatWeeklyReportForPrompt(weekly);
    expect(out).toContain("Top Movements (by volume)");
    expect(out).toContain("Back Squat (18,000 lbs)");
    expect(out).toContain("Bench Press (12,000 lbs)");
  });

  it("lists records set", () => {
    const out = formatWeeklyReportForPrompt(weekly);
    expect(out).toContain("Records Set");
    expect(out).toContain("Back Squat: 315 x 5");
    expect(out).toContain("Deadlift: 405 x 3");
  });

  it("includes a coach's-eye summary when human_summary is present", () => {
    const out = formatWeeklyReportForPrompt(weekly);
    expect(out).toContain("Coach's-Eye Summary");
    expect(out).toContain("Solid hypertrophy week");
  });

  it("truncates absurdly long human summaries", () => {
    const huge = "x".repeat(10_000);
    const r = {
      ...weekly,
      analyticsData: { structured_analytics: baseStructured, human_summary: huge },
    } as WeeklyAnalytics;
    const out = formatWeeklyReportForPrompt(r);
    expect(out).toContain("…");
    expect(out.length).toBeLessThan(2_500);
  });

  it("tolerates a sparse report (no structured data)", () => {
    const sparse = {
      ...weekly,
      analyticsData: {},
    } as WeeklyAnalytics;
    const out = formatWeeklyReportForPrompt(sparse);
    expect(out).toContain("WEEKLY REPORT IN FOCUS");
    expect(out).toContain("Week ID: 2025-W32");
    expect(out).not.toContain("Sessions completed");
    expect(out).not.toContain("Top Movements");
  });
});

describe("formatMonthlyReportForPrompt", () => {
  it("includes the month identity header", () => {
    const out = formatMonthlyReportForPrompt(monthly);
    expect(out).toContain("MONTHLY REPORT IN FOCUS");
    expect(out).toContain("Month ID: 2025-08");
    expect(out).toContain("Month of: 2025-08-01 → 2025-08-31");
  });

  it("includes shared highlight rendering", () => {
    const out = formatMonthlyReportForPrompt(monthly);
    expect(out).toContain("Sessions completed: 5");
    expect(out).toContain("Total working-set tonnage: 42,500 lbs");
  });
});
