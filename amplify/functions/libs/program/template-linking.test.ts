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

    it("does NOT promote alphabetically-first when an explicit primary exists", () => {
      // optional1 is alphabetically first ("aaa") but explicitly optional —
      // it must remain optional, not get promoted, because the day
      // already has a real primary on a different template.
      expect(isPrimaryTemplate(optional1, day)).toBe(false);
    });
  });

  describe("malformed days (explicit roles, but no primary)", () => {
    // Runtime safety net: AI prompt + JSON schema + integration validator
    // forbid this shape, but if it slips through we degrade gracefully
    // by falling back to alphabetic sort instead of "no primary at all".
    const t1 = makeTemplate("template_user_001_aaa", "optional");
    const t2 = makeTemplate("template_user_001_zzz", "optional");
    const day = [t2, t1];

    it("falls back to alphabetic-first when no template is primary", () => {
      expect(isPrimaryTemplate(t1, day)).toBe(true);
      expect(isPrimaryTemplate(t2, day)).toBe(false);
    });

    it("countOptionalTemplates agrees with the fallback (length - 1)", () => {
      // Without a fallback, countOptionalTemplates would have returned
      // dayTemplates.length here (filter !== "primary" matches both),
      // breaking the invariant `optionalCompleted ≤ totalOptional`.
      expect(countOptionalTemplates(day)).toBe(1);
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
    it("counts templates with sessionRole === 'optional' on a fully-labeled day", () => {
      const day = [
        makeTemplate("a", "primary"),
        makeTemplate("b", "optional"),
        makeTemplate("c", "optional"),
      ];
      expect(countOptionalTemplates(day)).toBe(2);
    });

    it("counts unlabeled siblings as optional when any template has an explicit role", () => {
      // Defensive consistency with isPrimaryTemplate: as soon as any
      // sibling declares a role, unlabeled templates are non-primary
      // (i.e. optional). totalOptional must agree or `optionalCompleted`
      // will exceed `totalOptional` after all logs land.
      const day = [
        makeTemplate("a", "primary"),
        makeTemplate("b", "optional"),
        makeTemplate("c"), // unlabeled, partial-label day
      ];
      expect(countOptionalTemplates(day)).toBe(2);
    });

    it("returns length - 1 when every template is explicitly primary", () => {
      // Edge case: malformed program where every template was labeled
      // primary. The shared resolver picks the first explicit primary
      // (alphabetic by find order in the array) so isPrimaryTemplate
      // identifies exactly one as primary; countOptionalTemplates must
      // agree (everything else is non-primary).
      const day = [
        makeTemplate("a", "primary"),
        makeTemplate("b", "primary"),
      ];
      expect(countOptionalTemplates(day)).toBe(1);
      expect(isPrimaryTemplate(day[0], day)).toBe(true);
      expect(isPrimaryTemplate(day[1], day)).toBe(false);
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
