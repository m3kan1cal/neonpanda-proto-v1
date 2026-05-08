import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadTodayWorkoutStatus,
  formatTodayWorkoutStatusForPrompt,
} from "./today-status";

vi.mock("./s3-utils", () => ({
  getProgramDetailsFromS3: vi.fn(),
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { getProgramDetailsFromS3 } = await import("./s3-utils");

describe("loadTodayWorkoutStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when activeProgram is null", async () => {
    const result = await loadTodayWorkoutStatus(null, undefined);
    expect(result).toBeNull();
    expect(getProgramDetailsFromS3).not.toHaveBeenCalled();
  });

  it("returns null when s3DetailKey is missing", async () => {
    const result = await loadTodayWorkoutStatus(
      { currentDay: 5, totalDays: 28 },
      undefined,
    );
    expect(result).toBeNull();
    expect(getProgramDetailsFromS3).not.toHaveBeenCalled();
  });

  it("returns null when neither requestedDay nor currentDay is provided", async () => {
    const result = await loadTodayWorkoutStatus(
      { s3DetailKey: "programs/u/p_123.json", totalDays: 28 },
      undefined,
    );
    expect(result).toBeNull();
  });

  it("returns null when requestedDay exceeds totalDays", async () => {
    const result = await loadTodayWorkoutStatus(
      { s3DetailKey: "programs/u/p_123.json", currentDay: 5, totalDays: 28 },
      99,
    );
    expect(result).toBeNull();
    expect(getProgramDetailsFromS3).not.toHaveBeenCalled();
  });

  it("returns rest day when no templates match the requested day", async () => {
    (getProgramDetailsFromS3 as any).mockResolvedValueOnce({
      workoutTemplates: [
        { dayNumber: 1, templateId: "t1", name: "Other Day", status: "pending" },
      ],
    });

    const result = await loadTodayWorkoutStatus(
      { s3DetailKey: "programs/u/p_123.json", currentDay: 5, totalDays: 28 },
      undefined,
    );
    expect(result).toEqual({
      dayNumber: 5,
      restDay: true,
      templates: [],
    });
  });

  it("returns templates for the requested day with status preserved", async () => {
    const completedAt = new Date("2026-05-06T18:30:00Z");
    (getProgramDetailsFromS3 as any).mockResolvedValueOnce({
      workoutTemplates: [
        {
          dayNumber: 17,
          templateId: "t_pc",
          name: "Power Clean Escalation",
          status: "completed",
          completedAt,
        },
        {
          dayNumber: 17,
          templateId: "t_acc",
          name: "Upper Accessory",
          status: "pending",
        },
        { dayNumber: 18, templateId: "t_other", name: "Skip me" },
      ],
    });

    const result = await loadTodayWorkoutStatus(
      { s3DetailKey: "programs/u/p_123.json", currentDay: 17, totalDays: 28 },
      undefined,
    );
    expect(result).toEqual({
      dayNumber: 17,
      restDay: false,
      templates: [
        {
          templateId: "t_pc",
          name: "Power Clean Escalation",
          status: "completed",
          completedAt: completedAt.toISOString(),
        },
        {
          templateId: "t_acc",
          name: "Upper Accessory",
          status: "pending",
        },
      ],
    });
  });

  it("uses the explicit requestedDay over currentDay when both are present", async () => {
    (getProgramDetailsFromS3 as any).mockResolvedValueOnce({
      workoutTemplates: [
        { dayNumber: 12, templateId: "t12", name: "Day 12 work", status: "pending" },
      ],
    });

    const result = await loadTodayWorkoutStatus(
      { s3DetailKey: "programs/u/p_123.json", currentDay: 17, totalDays: 28 },
      12,
    );
    expect(result?.dayNumber).toBe(12);
    expect(result?.templates[0].templateId).toBe("t12");
  });

  it("returns null on s3 read failure (warn-not-throw contract)", async () => {
    (getProgramDetailsFromS3 as any).mockRejectedValueOnce(
      new Error("S3 access denied"),
    );

    const result = await loadTodayWorkoutStatus(
      { s3DetailKey: "programs/u/p_123.json", currentDay: 5, totalDays: 28 },
      undefined,
    );
    expect(result).toBeNull();
  });

  it("defaults missing template status to 'pending'", async () => {
    (getProgramDetailsFromS3 as any).mockResolvedValueOnce({
      workoutTemplates: [
        { dayNumber: 5, templateId: "t1", name: "Whatever" },
      ],
    });

    const result = await loadTodayWorkoutStatus(
      { s3DetailKey: "programs/u/p_123.json", currentDay: 5, totalDays: 28 },
      undefined,
    );
    expect(result?.templates[0].status).toBe("pending");
  });
});

describe("formatTodayWorkoutStatusForPrompt", () => {
  it("renders rest day variant when restDay is true", () => {
    const out = formatTodayWorkoutStatusForPrompt({
      dayNumber: 5,
      restDay: true,
      templates: [],
    });
    expect(out).toContain("## TODAY'S PRESCRIBED WORKOUT STATUS (Day 5)");
    expect(out).toContain("rest day");
  });

  it("renders pending and completed templates with correct labels", () => {
    const out = formatTodayWorkoutStatusForPrompt({
      dayNumber: 17,
      restDay: false,
      templates: [
        {
          templateId: "t1",
          name: "Power Clean Escalation",
          status: "completed",
          completedAt: "2026-05-06T18:30:00.000Z",
        },
        {
          templateId: "t2",
          name: "Upper Accessory",
          status: "pending",
        },
      ],
    });
    expect(out).toContain("## TODAY'S PRESCRIBED WORKOUT STATUS (Day 17)");
    expect(out).toContain('"Power Clean Escalation" — completed');
    expect(out).toContain("logged at 2026-05-06T18:30:00.000Z");
    expect(out).toContain('"Upper Accessory" — pending (not yet logged)');
    expect(out).toContain("Treat these statuses as authoritative");
  });

  it("includes the disambiguation note about query_exercise_history rows", () => {
    const out = formatTodayWorkoutStatusForPrompt({
      dayNumber: 1,
      restDay: false,
      templates: [
        { templateId: "t", name: "X", status: "pending" },
      ],
    });
    expect(out).toContain("query_exercise_history");
    expect(out).toMatch(/does NOT necessarily\s+correspond/);
  });
});
