import { describe, it, expect } from "vitest";
import {
  extractNumericValue,
  parseProgramDuration,
  canParseDuration,
  DEFAULT_PROGRAM_DURATION_DAYS,
} from "./duration-parser";

describe("extractNumericValue", () => {
  it("extracts explicit digit from week string", () => {
    expect(extractNumericValue("2 weeks")).toBe(2);
  });

  it("extracts explicit digit from month string", () => {
    expect(extractNumericValue("3 months")).toBe(3);
  });

  it("extracts explicit digit from bare number string", () => {
    expect(extractNumericValue("30")).toBe(30);
  });

  it("interprets 'couple' as 2", () => {
    expect(extractNumericValue("couple weeks")).toBe(2);
  });

  it("interprets 'few' as 3", () => {
    expect(extractNumericValue("few months")).toBe(3);
  });

  it("interprets 'several' as 4", () => {
    expect(extractNumericValue("several days")).toBe(4);
  });

  it("interprets 'some' as 4", () => {
    expect(extractNumericValue("some weeks")).toBe(4);
  });

  it("interprets 'a week' as 1", () => {
    expect(extractNumericValue("a week")).toBe(1);
  });

  it("interprets 'an month' as 1", () => {
    expect(extractNumericValue("an month")).toBe(1);
  });

  it("returns default 8 when no number found", () => {
    expect(extractNumericValue("no number here")).toBe(8);
  });

  it("does not match 'awesome' as 'some'", () => {
    // 'awesome' contains 'some' but should not trigger the word-boundary match
    // falls through to default 8
    expect(extractNumericValue("awesome")).toBe(8);
  });
});

describe("parseProgramDuration", () => {
  it("converts '2 weeks' to 14 days", () => {
    expect(parseProgramDuration("2 weeks")).toBe(14);
  });

  it("converts '3 months' to 90 days", () => {
    expect(parseProgramDuration("3 months")).toBe(90);
  });

  it("converts '30 days' to 30", () => {
    expect(parseProgramDuration("30 days")).toBe(30);
  });

  it("parses bare numeric string as days", () => {
    expect(parseProgramDuration("30")).toBe(30);
  });

  it("passes numeric input through directly", () => {
    expect(parseProgramDuration(14)).toBe(14);
  });

  it("converts 'couple weeks' to 14 days via vague term", () => {
    expect(parseProgramDuration("couple weeks")).toBe(14);
  });

  it("converts 'few months' to 90 days via vague term", () => {
    expect(parseProgramDuration("few months")).toBe(90);
  });

  it("converts 'a week' to 7 days", () => {
    expect(parseProgramDuration("a week")).toBe(7);
  });

  it("resolves 'ongoing' to default duration", () => {
    expect(parseProgramDuration("ongoing")).toBe(DEFAULT_PROGRAM_DURATION_DAYS);
  });

  it("resolves 'forever' to default duration", () => {
    expect(parseProgramDuration("forever")).toBe(DEFAULT_PROGRAM_DURATION_DAYS);
  });

  it("resolves 'no end date' to default duration", () => {
    expect(parseProgramDuration("no end date")).toBe(DEFAULT_PROGRAM_DURATION_DAYS);
  });

  it("explicit unit wins over open-ended term in same string", () => {
    // "12 week long-term program" — explicit "week" unit should be parsed, not the open-ended "long-term"
    expect(parseProgramDuration("12 week long-term program")).toBe(84);
  });

  it("returns default when undefined", () => {
    expect(parseProgramDuration(undefined)).toBe(DEFAULT_PROGRAM_DURATION_DAYS);
  });

  it("returns default when null", () => {
    expect(parseProgramDuration(null as any)).toBe(DEFAULT_PROGRAM_DURATION_DAYS);
  });

  it("accepts custom default fallback", () => {
    expect(parseProgramDuration(undefined, 42)).toBe(42);
  });

  it("returns default for unparseable string with no unit", () => {
    expect(parseProgramDuration("something vague")).toBe(DEFAULT_PROGRAM_DURATION_DAYS);
  });
});

describe("canParseDuration", () => {
  it("returns true for undefined (optional field)", () => {
    expect(canParseDuration(undefined)).toBe(true);
  });

  it("returns true for null (optional field)", () => {
    expect(canParseDuration(null)).toBe(true);
  });

  it("returns true for numeric input", () => {
    expect(canParseDuration(56)).toBe(true);
  });

  it("returns true for string with digits", () => {
    expect(canParseDuration("4 weeks")).toBe(true);
  });

  it("returns true for open-ended terms", () => {
    expect(canParseDuration("ongoing")).toBe(true);
    expect(canParseDuration("forever")).toBe(true);
  });

  it("returns true for vague term with time unit", () => {
    expect(canParseDuration("couple weeks")).toBe(true);
    expect(canParseDuration("few months")).toBe(true);
  });

  it("returns true for 'a week' / 'an month' pattern", () => {
    expect(canParseDuration("a week")).toBe(true);
    expect(canParseDuration("an month")).toBe(true);
  });

  it("returns false for vague term without time unit", () => {
    expect(canParseDuration("couple")).toBe(false);
    expect(canParseDuration("few")).toBe(false);
  });

  it("returns false for non-string non-number type", () => {
    expect(canParseDuration({ weeks: 2 })).toBe(false);
  });

  it("returns false for bare text with no digits and no recognized term", () => {
    expect(canParseDuration("some time")).toBe(false);
  });
});
