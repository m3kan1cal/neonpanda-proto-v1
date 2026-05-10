import { describe, it, expect } from "vitest";
import { buildDayPruneSummaries } from "./prune-helpers";
import type { WorkoutTemplate } from "../../program/types";

// Minimal factory — only fields the helper reads. Cast to WorkoutTemplate
// so callers don't need to construct the full schema for unit-level tests.
const makeTemplate = (overrides: Partial<WorkoutTemplate>): WorkoutTemplate =>
  ({
    templateId: "template_test_default",
    groupId: "group_test_default",
    dayNumber: 1,
    name: "Test Workout",
    type: "strength",
    description: "",
    prescribedExercises: [],
    scoringType: "completion",
    estimatedDuration: 30,
    restAfter: 0,
    ...overrides,
  }) as WorkoutTemplate;

describe("buildDayPruneSummaries", () => {
  it("returns an empty array for no templates", () => {
    expect(buildDayPruneSummaries([])).toEqual([]);
  });

  it("groups templates by dayNumber and sorts ascending", () => {
    const day3 = makeTemplate({ templateId: "t_d3", dayNumber: 3 });
    const day1 = makeTemplate({ templateId: "t_d1", dayNumber: 1 });
    const day2 = makeTemplate({ templateId: "t_d2", dayNumber: 2 });

    const summaries = buildDayPruneSummaries([day3, day1, day2]);

    expect(summaries.map((s) => s.dayNumber)).toEqual([1, 2, 3]);
  });

  describe("single-template days", () => {
    it("treats the only template as primary with no optionals", () => {
      const t = makeTemplate({
        templateId: "t_d1_a",
        dayNumber: 1,
        name: "Heavy Squat",
        type: "strength",
        estimatedDuration: 45,
      });

      const [day] = buildDayPruneSummaries([t]);

      expect(day.primary).toEqual({
        name: "Heavy Squat",
        type: "strength",
        estimatedDuration: 45,
      });
      expect(day.optionals).toEqual([]);
      expect(day.totalDuration).toBe(45);
    });
  });

  describe("multi-template days with explicit sessionRole", () => {
    it("identifies the explicitly-primary template even when not alphabetically first", () => {
      // The explicitly-primary template has the alphabetically-LAST id, to
      // make sure the role helper isn't accidentally falling through to the
      // legacy alphabetic-sort branch.
      const explicitPrimary = makeTemplate({
        templateId: "template_user_001_zzz",
        dayNumber: 1,
        name: "Main Lift",
        type: "strength",
        estimatedDuration: 50,
        sessionRole: "primary",
      });
      const optional1 = makeTemplate({
        templateId: "template_user_001_aaa",
        dayNumber: 1,
        name: "Conditioning Finisher",
        type: "conditioning",
        estimatedDuration: 15,
        sessionRole: "optional",
      });
      const optional2 = makeTemplate({
        templateId: "template_user_001_mmm",
        dayNumber: 1,
        name: "Mobility",
        type: "mobility",
        estimatedDuration: 10,
        sessionRole: "optional",
      });

      const [day] = buildDayPruneSummaries([
        optional1,
        explicitPrimary,
        optional2,
      ]);

      expect(day.primary?.name).toBe("Main Lift");
      expect(day.primary?.type).toBe("strength");
      expect(day.optionals.map((o) => o.name)).toEqual([
        "Conditioning Finisher",
        "Mobility",
      ]);
      expect(day.totalDuration).toBe(75);
    });

    it("does NOT promote an explicitly-optional template even when alphabetically first", () => {
      const explicitPrimary = makeTemplate({
        templateId: "template_user_001_zzz",
        dayNumber: 2,
        sessionRole: "primary",
      });
      const explicitOptional = makeTemplate({
        templateId: "template_user_001_aaa",
        dayNumber: 2,
        sessionRole: "optional",
      });

      const [day] = buildDayPruneSummaries([
        explicitOptional,
        explicitPrimary,
      ]);

      expect(day.primary?.name).toBe(explicitPrimary.name);
      expect(day.optionals).toHaveLength(1);
      expect(day.optionals[0].name).toBe(explicitOptional.name);
    });
  });

  describe("legacy programs (no sessionRole)", () => {
    it("uses alphabetic-sort fallback to pick the primary", () => {
      const t1 = makeTemplate({
        templateId: "template_user_001_aaa",
        dayNumber: 1,
        name: "First Alphabetically",
        type: "strength",
      });
      const t2 = makeTemplate({
        templateId: "template_user_001_zzz",
        dayNumber: 1,
        name: "Last Alphabetically",
        type: "accessory",
      });

      const [day] = buildDayPruneSummaries([t2, t1]);

      expect(day.primary?.name).toBe("First Alphabetically");
      expect(day.optionals).toHaveLength(1);
      expect(day.optionals[0].name).toBe("Last Alphabetically");
    });
  });

  describe("partially-labeled days (mixed)", () => {
    it("respects the explicit-role branch when at least one sibling declares a role", () => {
      const explicitPrimary = makeTemplate({
        templateId: "template_user_001_zzz",
        dayNumber: 1,
        name: "Main Workout",
        sessionRole: "primary",
      });
      const unlabeled = makeTemplate({
        templateId: "template_user_001_aaa",
        dayNumber: 1,
        name: "Unlabeled Sibling",
      });

      const [day] = buildDayPruneSummaries([unlabeled, explicitPrimary]);

      // The unlabeled template should NOT be promoted to primary by the
      // alphabetic-sort fallback: as soon as ANY sibling declares an
      // explicit role, the explicit-role branch is authoritative.
      expect(day.primary?.name).toBe("Main Workout");
      expect(day.optionals).toHaveLength(1);
      expect(day.optionals[0].name).toBe("Unlabeled Sibling");
    });
  });

  describe("totalDuration", () => {
    it("treats missing estimatedDuration as 0", () => {
      const t1 = makeTemplate({
        templateId: "t_d1_a",
        dayNumber: 1,
        estimatedDuration: 0,
      });
      const t2 = makeTemplate({
        templateId: "t_d1_b",
        dayNumber: 1,
        estimatedDuration: 30,
      });

      const [day] = buildDayPruneSummaries([t1, t2]);

      expect(day.totalDuration).toBe(30);
    });
  });

  it("preserves phaseId from the primary template", () => {
    const primary = makeTemplate({
      templateId: "t_d1_a",
      dayNumber: 1,
      phaseId: "phase_user_001_foundation",
      sessionRole: "primary",
    });
    const optional = makeTemplate({
      templateId: "t_d1_b",
      dayNumber: 1,
      phaseId: "phase_user_001_foundation",
      sessionRole: "optional",
    });

    const [day] = buildDayPruneSummaries([primary, optional]);

    expect(day.phaseId).toBe("phase_user_001_foundation");
  });
});
