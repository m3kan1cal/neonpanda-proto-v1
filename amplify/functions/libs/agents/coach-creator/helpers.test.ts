import { describe, it, expect } from "vitest";
import { enforceValidationBlocking, validateGenderConsistency } from "./helpers";
import type { CoachConfig } from "../../coach-creator/types";

// ─── enforceValidationBlocking ────────────────────────────────────────────────

describe("enforceValidationBlocking (coach creator)", () => {
  // ─── Non-targeted tools always pass through ─────────────────────────────

  it("returns null for tools other than save_coach_config_to_database", () => {
    const validation = { isValid: false };
    const otherTools = [
      "load_session_requirements",
      "select_personality_template",
      "select_methodology_template",
      "generate_coach_prompts",
      "assemble_coach_config",
      "validate_coach_config",
      "normalize_coach_config",
    ];
    for (const toolId of otherTools) {
      expect(enforceValidationBlocking(toolId, validation)).toBeNull();
    }
  });

  // ─── Null validation result ──────────────────────────────────────────────

  it("returns null when validationResult is null (save tool, no validation yet)", () => {
    expect(enforceValidationBlocking("save_coach_config_to_database", null)).toBeNull();
  });

  it("returns null when validationResult is undefined", () => {
    expect(enforceValidationBlocking("save_coach_config_to_database", undefined)).toBeNull();
  });

  // ─── Validation exception ────────────────────────────────────────────────

  it("blocks save when validationResult.error is set", () => {
    const validation = { error: "Schema validation threw an exception" };
    const result = enforceValidationBlocking("save_coach_config_to_database", validation);

    expect(result).not.toBeNull();
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.reason).toContain("validation failed with error");
  });

  // ─── isValid: false ──────────────────────────────────────────────────────

  it("blocks save when isValid is false", () => {
    const validation = {
      isValid: false,
      validationIssues: ["missing personality", "empty prompts"],
      confidence: 0.2,
    };
    const result = enforceValidationBlocking("save_coach_config_to_database", validation);

    expect(result).not.toBeNull();
    expect(result!.error).toBe(true);
    expect(result!.blocked).toBe(true);
    expect(result!.validationIssues).toEqual(["missing personality", "empty prompts"]);
  });

  it("block result includes reason string referencing validation issues", () => {
    const validation = { isValid: false, validationIssues: ["bad field"] };
    const result = enforceValidationBlocking("save_coach_config_to_database", validation);
    expect(result!.reason).toContain("bad field");
  });

  // ─── isValid: true — allow ───────────────────────────────────────────────

  it("returns null when isValid is true (allows save to proceed)", () => {
    const validation = { isValid: true };
    expect(enforceValidationBlocking("save_coach_config_to_database", validation)).toBeNull();
  });
});

// ─── validateGenderConsistency ────────────────────────────────────────────────

describe("validateGenderConsistency", () => {
  const makeConfig = (gender: string): CoachConfig =>
    ({ gender_preference: gender }) as unknown as CoachConfig;

  it("returns valid when no gender is requested (empty string)", () => {
    expect(validateGenderConsistency(makeConfig("female"), "")).toEqual({ isValid: true });
  });

  it("returns valid when requested gender matches config", () => {
    expect(validateGenderConsistency(makeConfig("male"), "male")).toEqual({ isValid: true });
  });

  it("returns valid when case-matched", () => {
    expect(validateGenderConsistency(makeConfig("female"), "female")).toEqual({ isValid: true });
  });

  it("returns invalid when config gender does not match request", () => {
    const result = validateGenderConsistency(makeConfig("male"), "female");
    expect(result.isValid).toBe(false);
    expect(result.issue).toBeDefined();
    expect(result.issue).toContain("mismatch");
  });

  it("invalid result includes both requested and actual genders in the issue", () => {
    const result = validateGenderConsistency(makeConfig("male"), "female");
    expect(result.issue).toContain("female");
    expect(result.issue).toContain("male");
  });
});
