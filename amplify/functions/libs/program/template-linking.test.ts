import { describe, it, expect } from "vitest";
import {
  isPrimaryTemplate,
  countOptionalTemplates,
} from "./template-linking";

// Minimal template factory — only the fields the role helpers read.
const makeTemplate = (
  templateId: string,
  sessionRole?: "primary" | "optional",
) => ({ templateId, sessionRole });

describe("isPrimaryTemplate", () => {
  describe("single-template days", () => {
    it("returns true for the only template on the day", () => {
      const t = makeTemplate("template_user_001_aaa");
      expect(isPrimaryTemplate(t, [t])).toBe(true);
    });

    it("returns true for the only template even with explicit optional role", () => {
      // Defensive: a single-template day is always primary regardless of label.
      const t = makeTemplate("template_user_001_aaa", "optional");
      expect(isPrimaryTemplate(t, [t])).toBe(true);
    });
  });

  describe("multi-template days with explicit sessionRole", () => {
    const primary = makeTemplate("template_user_001_zzz", "primary");
    const optional1 = makeTemplate("template_user_001_aaa", "optional");
    const optional2 = makeTemplate("template_user_001_mmm", "optional");
    const day = [primary, optional1, optional2];

    it("returns true only for the explicitly-primary template", () => {
      expect(isPrimaryTemplate(primary, day)).toBe(true);
    });

    it("returns false for explicitly-optional templates", () => {
      expect(isPrimaryTemplate(optional1, day)).toBe(false);
      expect(isPrimaryTemplate(optional2, day)).toBe(false);
    });

    it("does NOT fall back to alphabetic sort when explicit roles exist", () => {
      // optional1 is alphabetically first ("aaa") but explicitly optional —
      // it must remain optional, not get promoted by the legacy fallback.
      expect(isPrimaryTemplate(optional1, day)).toBe(false);
    });
  });

  describe("legacy programs (no sessionRole on any template)", () => {
    const t1 = makeTemplate("template_user_001_aaa");
    const t2 = makeTemplate("template_user_001_mmm");
    const t3 = makeTemplate("template_user_001_zzz");
    const day = [t3, t1, t2]; // intentionally unsorted

    it("treats the alphabetically-first templateId as primary", () => {
      expect(isPrimaryTemplate(t1, day)).toBe(true);
    });

    it("returns false for non-first templates", () => {
      expect(isPrimaryTemplate(t2, day)).toBe(false);
      expect(isPrimaryTemplate(t3, day)).toBe(false);
    });
  });

  describe("partially-labeled days (mixed)", () => {
    // A day where SOME templates declare sessionRole and others don't.
    // The "any explicit role" branch fires — unlabeled templates are not
    // promoted by the legacy fallback. This is the conservative choice that
    // makes the explicit-label invariant authoritative as soon as it appears.
    const labeledPrimary = makeTemplate(
      "template_user_001_zzz",
      "primary",
    );
    const unlabeled = makeTemplate("template_user_001_aaa");
    const day = [labeledPrimary, unlabeled];

    it("respects the explicitly-primary template", () => {
      expect(isPrimaryTemplate(labeledPrimary, day)).toBe(true);
    });

    it("treats unlabeled siblings as non-primary when any explicit role exists", () => {
      expect(isPrimaryTemplate(unlabeled, day)).toBe(false);
    });
  });
});

describe("countOptionalTemplates", () => {
  it("returns 0 for an empty day", () => {
    expect(countOptionalTemplates([])).toBe(0);
  });

  it("returns 0 for a single-template day", () => {
    expect(countOptionalTemplates([makeTemplate("a")])).toBe(0);
  });

  describe("explicit sessionRole", () => {
    it("counts templates with sessionRole === 'optional'", () => {
      const day = [
        makeTemplate("a", "primary"),
        makeTemplate("b", "optional"),
        makeTemplate("c", "optional"),
      ];
      expect(countOptionalTemplates(day)).toBe(2);
    });

    it("returns 0 when no template is explicitly optional (all primary)", () => {
      // Edge case: malformed program where every template was labeled
      // primary. The count reflects the labels, not a fallback.
      const day = [
        makeTemplate("a", "primary"),
        makeTemplate("b", "primary"),
      ];
      expect(countOptionalTemplates(day)).toBe(0);
    });
  });

  describe("legacy programs (no sessionRole)", () => {
    it("returns length - 1 for a multi-template day", () => {
      const day = [makeTemplate("a"), makeTemplate("b"), makeTemplate("c")];
      expect(countOptionalTemplates(day)).toBe(2);
    });
  });

  it("never returns negative", () => {
    expect(countOptionalTemplates([])).toBeGreaterThanOrEqual(0);
    expect(countOptionalTemplates([makeTemplate("a")])).toBeGreaterThanOrEqual(
      0,
    );
  });
});
