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
