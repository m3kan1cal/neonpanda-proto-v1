import { describe, it, expect } from "vitest";
import {
  isPrimaryTemplate,
  pickPrimaryTemplate,
  countOptionalTemplates,
} from "./templateRoles.js";

const makeTemplate = (templateId, sessionRole) => ({ templateId, sessionRole });

describe("isPrimaryTemplate (frontend)", () => {
  it("returns true for the only template on a day", () => {
    const t = makeTemplate("template_user_001_aaa");
    expect(isPrimaryTemplate(t, [t])).toBe(true);
  });

  it("returns false when called without a template", () => {
    expect(isPrimaryTemplate(undefined, [])).toBe(false);
    expect(isPrimaryTemplate(null, [])).toBe(false);
  });

  it("respects explicit sessionRole on multi-template days", () => {
    const primary = makeTemplate("template_user_001_zzz", "primary");
    const optional = makeTemplate("template_user_001_aaa", "optional");
    const day = [primary, optional];
    expect(isPrimaryTemplate(primary, day)).toBe(true);
    expect(isPrimaryTemplate(optional, day)).toBe(false);
  });

  it("falls back to alphabetic sort for legacy programs", () => {
    const t1 = makeTemplate("template_user_001_aaa");
    const t2 = makeTemplate("template_user_001_zzz");
    const day = [t2, t1];
    expect(isPrimaryTemplate(t1, day)).toBe(true);
    expect(isPrimaryTemplate(t2, day)).toBe(false);
  });

  it("does NOT fall back when any sibling has explicit role", () => {
    const labeledPrimary = makeTemplate("template_user_001_zzz", "primary");
    const unlabeled = makeTemplate("template_user_001_aaa");
    expect(isPrimaryTemplate(unlabeled, [labeledPrimary, unlabeled])).toBe(
      false,
    );
  });
});

describe("pickPrimaryTemplate (frontend)", () => {
  it("returns undefined for empty / invalid input", () => {
    expect(pickPrimaryTemplate([])).toBeUndefined();
    expect(pickPrimaryTemplate(null)).toBeUndefined();
    expect(pickPrimaryTemplate(undefined)).toBeUndefined();
  });

  it("returns the only template on a single-template day", () => {
    const t = makeTemplate("template_user_001_aaa");
    expect(pickPrimaryTemplate([t])).toBe(t);
  });

  it("returns the explicitly-primary template on a multi-template day", () => {
    const primary = makeTemplate("template_user_001_mmm", "primary");
    const optional = makeTemplate("template_user_001_aaa", "optional");
    expect(pickPrimaryTemplate([optional, primary])).toBe(primary);
  });

  it("returns the alphabetically-first template for legacy programs", () => {
    const t1 = makeTemplate("template_user_001_aaa");
    const t2 = makeTemplate("template_user_001_zzz");
    expect(pickPrimaryTemplate([t2, t1])).toBe(t1);
  });
});

describe("countOptionalTemplates (frontend)", () => {
  it("returns 0 for empty / single-template days", () => {
    expect(countOptionalTemplates([])).toBe(0);
    expect(countOptionalTemplates([makeTemplate("a")])).toBe(0);
  });

  it("counts templates with sessionRole === 'optional' when fully labeled", () => {
    const day = [
      makeTemplate("a", "primary"),
      makeTemplate("b", "optional"),
      makeTemplate("c", "optional"),
    ];
    expect(countOptionalTemplates(day)).toBe(2);
  });

  it("counts unlabeled siblings as optional when any template has an explicit role", () => {
    // Stays in lockstep with isPrimaryTemplate, which treats unlabeled
    // templates as non-primary in the explicit-role mode.
    const day = [
      makeTemplate("a", "primary"),
      makeTemplate("b", "optional"),
      makeTemplate("c"), // unlabeled
    ];
    expect(countOptionalTemplates(day)).toBe(2);
  });

  it("falls back to length - 1 for legacy programs", () => {
    const day = [makeTemplate("a"), makeTemplate("b"), makeTemplate("c")];
    expect(countOptionalTemplates(day)).toBe(2);
  });
});
