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
