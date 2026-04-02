import { describe, it, expect } from "vitest";
import {
  validateProgramDurationInput,
  validateTrainingFrequencyInput,
  validateParsedProgramDuration,
  validateParsedTrainingFrequency,
  MAX_PROGRAM_DURATION_DAYS,
  MIN_PROGRAM_DURATION_DAYS,
} from "./validation-helpers";

describe("validateProgramDurationInput", () => {
  it("returns valid when undefined (optional field)", () => {
    expect(validateProgramDurationInput(undefined)).toEqual({ isValid: true });
  });

  it("returns valid for numeric string with time unit", () => {
    expect(validateProgramDurationInput("4 weeks")).toEqual({ isValid: true });
  });

  it("returns valid for numeric string", () => {
    expect(validateProgramDurationInput("56")).toEqual({ isValid: true });
  });

  it("returns valid for number", () => {
    expect(validateProgramDurationInput(56)).toEqual({ isValid: true });
  });

  it("returns valid for open-ended term", () => {
    expect(validateProgramDurationInput("ongoing")).toEqual({ isValid: true });
  });

  it("returns valid for vague term with unit", () => {
    expect(validateProgramDurationInput("couple weeks")).toEqual({ isValid: true });
  });

  it("returns invalid for bare text without digits or recognized terms", () => {
    const result = validateProgramDurationInput("some time");
    expect(result.isValid).toBe(false);
    expect(result.field).toBe("programDuration");
    expect(result.error).toBeDefined();
  });

  it("returns invalid for vague term without time unit", () => {
    const result = validateProgramDurationInput("couple");
    expect(result.isValid).toBe(false);
    expect(result.field).toBe("programDuration");
  });

  it("returns invalid for non-string non-number type", () => {
    const result = validateProgramDurationInput({ weeks: 2 });
    expect(result.isValid).toBe(false);
    expect(result.providedValue).toBeDefined();
  });
});

describe("validateTrainingFrequencyInput", () => {
  it("returns valid when undefined (optional field)", () => {
    expect(validateTrainingFrequencyInput(undefined)).toEqual({ isValid: true });
  });

  it("returns valid for positive number", () => {
    expect(validateTrainingFrequencyInput(3)).toEqual({ isValid: true });
  });

  it("returns valid for numeric string", () => {
    expect(validateTrainingFrequencyInput("5")).toEqual({ isValid: true });
  });

  it("returns invalid for zero", () => {
    const result = validateTrainingFrequencyInput(0);
    expect(result.isValid).toBe(false);
    expect(result.field).toBe("trainingFrequency");
  });

  it("returns invalid for negative number", () => {
    const result = validateTrainingFrequencyInput(-1);
    expect(result.isValid).toBe(false);
  });

  it("returns invalid for non-numeric string", () => {
    const result = validateTrainingFrequencyInput("abc");
    expect(result.isValid).toBe(false);
    expect(result.field).toBe("trainingFrequency");
  });
});

describe("validateParsedProgramDuration", () => {
  it("does not throw for valid duration within bounds", () => {
    expect(() => validateParsedProgramDuration(56, "8 weeks")).not.toThrow();
  });

  it("does not throw for minimum valid duration", () => {
    expect(() => validateParsedProgramDuration(MIN_PROGRAM_DURATION_DAYS, "1")).not.toThrow();
  });

  it("does not throw for maximum valid duration", () => {
    expect(() => validateParsedProgramDuration(MAX_PROGRAM_DURATION_DAYS, "180")).not.toThrow();
  });

  it("throws for zero duration", () => {
    expect(() => validateParsedProgramDuration(0, "0")).toThrow();
  });

  it("throws for negative duration", () => {
    expect(() => validateParsedProgramDuration(-7, "-1 weeks")).toThrow();
  });

  it("throws for duration exceeding maximum", () => {
    expect(() => validateParsedProgramDuration(181, "181")).toThrow(/181/);
  });

  it("throws for NaN", () => {
    expect(() => validateParsedProgramDuration(NaN, "bad")).toThrow();
  });
});

describe("validateParsedTrainingFrequency", () => {
  it("does not throw for valid frequency", () => {
    expect(() => validateParsedTrainingFrequency(3, "3")).not.toThrow();
  });

  it("does not throw for minimum frequency of 1", () => {
    expect(() => validateParsedTrainingFrequency(1, "1")).not.toThrow();
  });

  it("does not throw for high frequency (multiple sessions per day)", () => {
    expect(() => validateParsedTrainingFrequency(14, "14")).not.toThrow();
  });

  it("throws for zero frequency", () => {
    expect(() => validateParsedTrainingFrequency(0, "0")).toThrow();
  });

  it("throws for negative frequency", () => {
    expect(() => validateParsedTrainingFrequency(-1, "-1")).toThrow();
  });

  it("throws for NaN", () => {
    expect(() => validateParsedTrainingFrequency(NaN, "abc")).toThrow();
  });
});
