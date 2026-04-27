import { describe, it, expect } from "vitest";
import {
  validateConversationClientContext,
  validateStreamingRequestBody,
} from "./request-validation";

describe("validateConversationClientContext", () => {
  it("returns undefined for absent or empty", () => {
    expect(validateConversationClientContext(undefined)).toBeUndefined();
    expect(validateConversationClientContext(null)).toBeUndefined();
    expect(validateConversationClientContext({})).toBeUndefined();
  });

  it("accepts program_dashboard with programId", () => {
    expect(
      validateConversationClientContext({
        surface: "program_dashboard",
        programId: "program_u_1_abc",
      }),
    ).toEqual({
      surface: "program_dashboard",
      programId: "program_u_1_abc",
    });
  });

  it("trims programId", () => {
    expect(
      validateConversationClientContext({
        surface: "program_dashboard",
        programId: "  pid  ",
      }),
    ).toEqual({
      surface: "program_dashboard",
      programId: "pid",
    });
  });

  it("rejects unknown surface", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "other",
        programId: "x",
      }),
    ).toThrow(/surface/);
  });

  it("accepts training_grounds without programId", () => {
    expect(
      validateConversationClientContext({ surface: "training_grounds" }),
    ).toEqual({ surface: "training_grounds" });
  });

  it("rejects training_grounds with programId", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "training_grounds",
        programId: "program_u_1_abc",
      }),
    ).toThrow(/not allowed for training_grounds/);
  });

  it("accepts view_workouts with programId only", () => {
    expect(
      validateConversationClientContext({
        surface: "view_workouts",
        programId: "program_u_1_abc",
      }),
    ).toEqual({
      surface: "view_workouts",
      programId: "program_u_1_abc",
    });
  });

  it("accepts view_workouts with dayNumber and isViewingToday", () => {
    expect(
      validateConversationClientContext({
        surface: "view_workouts",
        programId: "pid",
        dayNumber: 5,
        isViewingToday: false,
      }),
    ).toEqual({
      surface: "view_workouts",
      programId: "pid",
      dayNumber: 5,
      isViewingToday: false,
    });
  });

  it("rejects view_workouts without programId", () => {
    expect(() =>
      validateConversationClientContext({ surface: "view_workouts" }),
    ).toThrow(/programId is required for view_workouts/);
  });

  it("rejects view_workouts with non-numeric dayNumber", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "view_workouts",
        programId: "pid",
        dayNumber: "five",
      }),
    ).toThrow(/dayNumber must be a positive number/);
  });

  it("rejects view_workouts with non-boolean isViewingToday", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "view_workouts",
        programId: "pid",
        isViewingToday: "yes",
      }),
    ).toThrow(/isViewingToday must be a boolean/);
  });

  // training_pulse ----------------------------------------------------------

  it("accepts training_pulse with timeRange only", () => {
    expect(
      validateConversationClientContext({
        surface: "training_pulse",
        timeRange: "8w",
      }),
    ).toEqual({ surface: "training_pulse", timeRange: "8w" });
  });

  it("accepts training_pulse with timeRange and exerciseName", () => {
    expect(
      validateConversationClientContext({
        surface: "training_pulse",
        timeRange: "12w",
        exerciseName: "  back squat  ",
      }),
    ).toEqual({
      surface: "training_pulse",
      timeRange: "12w",
      exerciseName: "back squat",
    });
  });

  it("rejects training_pulse without timeRange", () => {
    expect(() =>
      validateConversationClientContext({ surface: "training_pulse" }),
    ).toThrow(/timeRange must be one of/);
  });

  it("rejects training_pulse with invalid timeRange", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "training_pulse",
        timeRange: "2y",
      }),
    ).toThrow(/timeRange must be one of/);
  });

  it("rejects training_pulse with empty exerciseName", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "training_pulse",
        timeRange: "4w",
        exerciseName: "   ",
      }),
    ).toThrow(/exerciseName must be a non-empty string/);
  });

  it("rejects training_pulse with programId", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "training_pulse",
        timeRange: "4w",
        programId: "pid",
      }),
    ).toThrow(/programId is not allowed for training_pulse/);
  });

  // reports_list ------------------------------------------------------------

  it("accepts reports_list with reportType=weekly", () => {
    expect(
      validateConversationClientContext({
        surface: "reports_list",
        reportType: "weekly",
      }),
    ).toEqual({ surface: "reports_list", reportType: "weekly" });
  });

  it("accepts reports_list with reportType=monthly", () => {
    expect(
      validateConversationClientContext({
        surface: "reports_list",
        reportType: "monthly",
      }),
    ).toEqual({ surface: "reports_list", reportType: "monthly" });
  });

  it("rejects reports_list without reportType", () => {
    expect(() =>
      validateConversationClientContext({ surface: "reports_list" }),
    ).toThrow(/reportType must be one of/);
  });

  it("rejects reports_list with invalid reportType", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "reports_list",
        reportType: "yearly",
      }),
    ).toThrow(/reportType must be one of/);
  });

  it("rejects reports_list with programId", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "reports_list",
        reportType: "weekly",
        programId: "pid",
      }),
    ).toThrow(/programId is not allowed for reports_list/);
  });

  // weekly_report -----------------------------------------------------------

  it("accepts weekly_report with weekId", () => {
    expect(
      validateConversationClientContext({
        surface: "weekly_report",
        weekId: "  2025-W32  ",
      }),
    ).toEqual({ surface: "weekly_report", weekId: "2025-W32" });
  });

  it("rejects weekly_report without weekId", () => {
    expect(() =>
      validateConversationClientContext({ surface: "weekly_report" }),
    ).toThrow(/weekId is required for weekly_report/);
  });

  it("rejects weekly_report with empty weekId", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "weekly_report",
        weekId: "   ",
      }),
    ).toThrow(/weekId is required for weekly_report/);
  });

  // monthly_report ----------------------------------------------------------

  it("accepts monthly_report with monthId", () => {
    expect(
      validateConversationClientContext({
        surface: "monthly_report",
        monthId: "2025-10",
      }),
    ).toEqual({ surface: "monthly_report", monthId: "2025-10" });
  });

  it("rejects monthly_report without monthId", () => {
    expect(() =>
      validateConversationClientContext({ surface: "monthly_report" }),
    ).toThrow(/monthId is required for monthly_report/);
  });

  it("rejects monthly_report with programId", () => {
    expect(() =>
      validateConversationClientContext({
        surface: "monthly_report",
        monthId: "2025-10",
        programId: "pid",
      }),
    ).toThrow(/programId is not allowed for monthly_report/);
  });
});

describe("validateStreamingRequestBody clientContext", () => {
  const body = (extra: Record<string, unknown>) =>
    JSON.stringify({
      userResponse: "hi",
      messageTimestamp: new Date().toISOString(),
      ...extra,
    });

  it("parses valid clientContext", () => {
    const out = validateStreamingRequestBody(
      body({
        clientContext: {
          surface: "program_dashboard",
          programId: "program_1",
        },
      }),
      "user-1",
    );
    expect(out.clientContext).toEqual({
      surface: "program_dashboard",
      programId: "program_1",
    });
  });
});
