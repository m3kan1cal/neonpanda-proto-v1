import { describe, it, expect, vi } from "vitest";
import { getUserTimezone, isValidIanaTimezone } from "./timezone";

vi.mock("../logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("isValidIanaTimezone", () => {
  it("accepts common IANA zones", () => {
    expect(isValidIanaTimezone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaTimezone("America/New_York")).toBe(true);
    expect(isValidIanaTimezone("Europe/London")).toBe(true);
    expect(isValidIanaTimezone("Asia/Tokyo")).toBe(true);
    expect(isValidIanaTimezone("UTC")).toBe(true);
  });

  it("rejects nonsense strings", () => {
    expect(isValidIanaTimezone("Not/A/Zone")).toBe(false);
    expect(isValidIanaTimezone("Pacific")).toBe(false);
    expect(isValidIanaTimezone("")).toBe(false);
  });
});

describe("getUserTimezone", () => {
  it("reads preferences.timezone when present and valid", () => {
    const profile = {
      preferences: { timezone: "America/New_York" },
    } as any;
    expect(getUserTimezone(profile)).toBe("America/New_York");
  });

  it("falls back to America/Los_Angeles when preferences.timezone is missing", () => {
    expect(getUserTimezone({ preferences: {} } as any)).toBe(
      "America/Los_Angeles",
    );
    expect(getUserTimezone(null)).toBe("America/Los_Angeles");
    expect(getUserTimezone(undefined)).toBe("America/Los_Angeles");
  });

  it("falls back to America/Los_Angeles when stored timezone is invalid", () => {
    const profile = {
      preferences: { timezone: "Mars/Olympus_Mons" },
    } as any;
    expect(getUserTimezone(profile)).toBe("America/Los_Angeles");
  });

  it("does not read a top-level timezone field", () => {
    // Historically some code read (userProfile as any).timezone — which is wrong.
    // getUserTimezone deliberately ignores that shape.
    const profile = {
      timezone: "America/New_York",
      preferences: {},
    } as any;
    expect(getUserTimezone(profile)).toBe("America/Los_Angeles");
  });
});
