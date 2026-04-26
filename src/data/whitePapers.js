// White papers data module — single source of truth for the /white-papers hub
// and individual paper route components.
//
// Each entry drives:
//   - the hub card grid at /white-papers
//   - per-paper metadata (document.title, meta description, OG, canonical)
//   - the slug → component map in WhitePaperRouter
//
// When adding a new paper:
//   1. Add an entry here.
//   2. Create src/components/white-papers/papers/<Component>.jsx.
//   3. Register it in WhitePaperRouter.jsx.

/**
 * @typedef {'published' | 'approved' | 'draft-for-subject-review' | 'internal-draft'} WhitePaperStatus
 */

/**
 * @typedef WhitePaper
 * @property {string} slug                 URL segment (filename without .html).
 * @property {string} title                Display title for the hub card.
 * @property {string} subtitle             One-line tagline.
 * @property {string} subject              Athlete first name or subject label.
 * @property {string} description          Short paragraph for hub card + meta description.
 * @property {WhitePaperStatus} status     Consent/publication status.
 * @property {string} publishedAt          ISO date (YYYY-MM-DD) — used for sort + meta.
 * @property {string} readTime             Human-readable reading time.
 * @property {string[]} topics             Short tags shown as pills on the card.
 */

/** @type {WhitePaper[]} */
export const whitePapers = [
  {
    slug: "use-case-grant-first-meet-prep",
    title:
      "Grant — First-meet prep, in-chat program rebuild, adductor resolved in nine days",
    subtitle:
      "When the 5-workout-a-week program didn't fit a 4-day-a-week athlete, the fix took thirty-three minutes. The harder work came next.",
    subject: "Grant",
    description:
      "How an intermediate powerlifter used NeonPanda to rebuild meet prep in one conversation, resolve an adductor asymmetry in nine days, and land sumo.",
    status: "published",
    publishedAt: "2026-04-18",
    readTime: "14 min read",
    topics: ["Powerlifting", "Meet prep", "In-chat program editing"],
  },
  {
    slug: "use-case-james-functional-chaos",
    title:
      "James — Functional Chaos Training, 199 workouts, and four PRs in one week",
    subtitle:
      "James's coach barely needed to prescribe. NeonPanda recorded what he already did — so when four rep-max PRs landed in one week, both sides could see exactly why.",
    subject: "James",
    description:
      "A masters CrossFit athlete names his own training philosophy, logs 199 workouts across nine months, and peaks cleanly with four rep-max PRs in one week.",
    status: "published",
    publishedAt: "2026-04-17",
    readTime: "16 min read",
    topics: ["CrossFit", "Masters", "Self-directed training"],
  },
  {
    slug: "use-case-paige-respiratory-therapist-iterates",
    title:
      "Paige — Six programs, two coaches, one conversation that unlocked the rest",
    subtitle:
      "What most fitness apps would log as churn, NeonPanda held as a nine-week design conversation — and Week 12 closed at 100% adherence with three PRs.",
    subject: "Paige",
    description:
      "A hospital respiratory therapist on rotating 12-hour night shifts iterates six programs across two coaches to find the one she can actually execute.",
    status: "draft-for-subject-review",
    publishedAt: "2026-04-15",
    readTime: "15 min read",
    topics: ["Spartan Trifecta", "Shift work", "Constraint-heavy athlete"],
  },
  {
    slug: "use-case-david-returning-athlete",
    title:
      "David — Returning 50-year-old athlete, 6-month plan, hockey comeback",
    subtitle:
      "A multi-modal program that treated Sunday Sabbath as a core principle, not a workaround — and got the follow-through to match.",
    subject: "David",
    description:
      "A 50-year-old returning athlete rebuilds his coach, builds a 180-day four-phase block plan, and executes across strength, running, CrossFit, cycling, and rec hockey.",
    status: "draft-for-subject-review",
    publishedAt: "2026-04-14",
    readTime: "12 min read",
    topics: ["Returning athlete", "Multi-modal", "Hockey"],
  },
];

/**
 * Human-readable label for a WhitePaperStatus value. Used in kickers, cards,
 * and footer pills.
 *
 * @param {WhitePaperStatus} status
 * @returns {string}
 */
export function statusLabel(status) {
  switch (status) {
    case "published":
      return "Published";
    case "approved":
      return "Approved for publication";
    case "draft-for-subject-review":
      return "Draft · For subject review";
    case "internal-draft":
      return "Internal draft only";
    default:
      return "Draft";
  }
}

/**
 * Map a WhitePaperStatus to the CSS modifier class used by status pills.
 *
 * @param {WhitePaperStatus} status
 * @returns {string}
 */
export function statusPillClass(status) {
  switch (status) {
    case "published":
      return "published";
    case "approved":
      return "approved";
    case "draft-for-subject-review":
      return "draft";
    case "internal-draft":
      return "internal";
    default:
      return "draft";
  }
}

/**
 * Resolve a white paper by slug. Returns `undefined` if the slug is unknown so
 * callers can redirect to the hub.
 *
 * @param {string} slug
 * @returns {WhitePaper | undefined}
 */
export function getWhitePaperBySlug(slug) {
  return whitePapers.find((paper) => paper.slug === slug);
}

/**
 * White papers sorted newest-first by publication date. The hub renders this
 * list directly.
 *
 * @returns {WhitePaper[]}
 */
export function getWhitePapersForHub() {
  return [...whitePapers].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1,
  );
}

/**
 * Format an ISO date (YYYY-MM-DD) as e.g. "April 18, 2026" for the hub card /
 * meta line. Safe for a missing/invalid date (falls back to the raw string).
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatPublishedDate(isoDate) {
  if (!isoDate) return "";
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
