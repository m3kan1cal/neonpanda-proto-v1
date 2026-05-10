/**
 * Workout template role helpers.
 *
 * Mirrors the backend helpers in
 * `amplify/functions/libs/program/template-linking.ts` so that frontend
 * components reach the same conclusion as the backend about which template
 * is the day's "primary" workout (the one the user must complete to advance
 * the program) and which are "optional" supplementary work.
 *
 * Behavior:
 * - If ANY template on the day declares an explicit `sessionRole`, the
 *   primary is the template with `sessionRole === "primary"`.
 * - Otherwise (legacy programs that pre-date the `sessionRole` field), fall
 *   back to deterministic alphabetic sort by `templateId` — first wins.
 *
 * Keep this module in sync with the backend helpers; if the backend rule
 * changes, change this too (and update the integration validators in
 * `test-build-program.ts`).
 */

const hasExplicitSessionRoles = (dayTemplates) =>
  dayTemplates.some(
    (t) => t.sessionRole === "primary" || t.sessionRole === "optional",
  );

/**
 * Single source of truth for "which template is the day's primary?".
 * All exported helpers derive from this so they cannot drift.
 *
 * Resolution order:
 *  1. Empty / non-array → undefined.
 *  2. Single-template day → that template's id.
 *  3. Explicit roles present AND a sessionRole === "primary" exists →
 *     that template's id.
 *  4. Otherwise (legacy programs with no sessionRole anywhere, OR
 *     malformed explicit-role days that lack a primary) → alphabetic
 *     sort by templateId, first wins.
 *
 * The alphabetic fallback for malformed explicit-role days is a runtime
 * safety net so a missing/wrong label can't disappear today's workout
 * from the UI. Keep this in sync with the backend helper in
 * amplify/functions/libs/program/template-linking.ts.
 *
 * @param {object[]} dayTemplates
 * @returns {string|undefined}
 */
const getPrimaryTemplateId = (dayTemplates) => {
  if (!Array.isArray(dayTemplates) || dayTemplates.length === 0) {
    return undefined;
  }
  if (dayTemplates.length === 1) return dayTemplates[0].templateId;

  if (hasExplicitSessionRoles(dayTemplates)) {
    const explicit = dayTemplates.find((t) => t.sessionRole === "primary");
    if (explicit) return explicit.templateId;
  }

  const sorted = [...dayTemplates].sort((a, b) =>
    a.templateId.localeCompare(b.templateId),
  );
  return sorted[0]?.templateId;
};

/**
 * Determine whether a given template is the primary workout for its day.
 * Single-template days: always primary.
 *
 * @param {object} template - The template under test.
 * @param {object[]} dayTemplates - All templates sharing the same day.
 * @returns {boolean}
 */
export const isPrimaryTemplate = (template, dayTemplates) => {
  if (!template) return false;
  const primaryId = getPrimaryTemplateId(dayTemplates);
  return primaryId !== undefined && primaryId === template.templateId;
};

/**
 * Pick the primary template from a day group. Always returns a template
 * for non-empty days (never undefined) — see `getPrimaryTemplateId` for
 * the resolution rules including the alphabetic safety net.
 *
 * @param {object[]} dayTemplates - All templates sharing the same day.
 * @returns {object|undefined}
 */
export const pickPrimaryTemplate = (dayTemplates) => {
  const primaryId = getPrimaryTemplateId(dayTemplates);
  if (primaryId === undefined) return undefined;
  return dayTemplates.find((t) => t.templateId === primaryId);
};

/**
 * Count optional-role templates on a day. Equivalent to "everything
 * that isn't the primary" once a primary is identified. Returns 0 for
 * empty and single-template days. Always >= 0.
 *
 * @param {object[]} dayTemplates - All templates sharing the same day.
 * @returns {number}
 */
export const countOptionalTemplates = (dayTemplates) => {
  if (!Array.isArray(dayTemplates) || dayTemplates.length <= 1) return 0;
  const primaryId = getPrimaryTemplateId(dayTemplates);
  if (primaryId === undefined) return Math.max(0, dayTemplates.length - 1);
  return dayTemplates.filter((t) => t.templateId !== primaryId).length;
};
