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
 * Determine whether a given template is the primary workout for its day.
 * Single-template days: the template is always primary.
 *
 * @param {object} template - The template under test.
 * @param {object[]} dayTemplates - All templates sharing the same day.
 * @returns {boolean}
 */
export const isPrimaryTemplate = (template, dayTemplates) => {
  if (!template) return false;
  if (!Array.isArray(dayTemplates) || dayTemplates.length <= 1) return true;

  if (hasExplicitSessionRoles(dayTemplates)) {
    return template.sessionRole === "primary";
  }

  const sorted = [...dayTemplates].sort((a, b) =>
    a.templateId.localeCompare(b.templateId),
  );
  return sorted[0]?.templateId === template.templateId;
};

/**
 * Pick the primary template from a day group.
 *
 * @param {object[]} dayTemplates - All templates sharing the same day.
 * @returns {object|undefined}
 */
export const pickPrimaryTemplate = (dayTemplates) => {
  if (!Array.isArray(dayTemplates) || dayTemplates.length === 0) {
    return undefined;
  }
  if (dayTemplates.length === 1) return dayTemplates[0];

  if (hasExplicitSessionRoles(dayTemplates)) {
    return dayTemplates.find((t) => t.sessionRole === "primary");
  }

  return [...dayTemplates].sort((a, b) =>
    a.templateId.localeCompare(b.templateId),
  )[0];
};

/**
 * Count optional-role templates on a day.
 *
 * If any template on the day declares an explicit sessionRole, counts
 * non-primary templates (sessionRole !== "primary") so unlabeled siblings
 * are included. This matches `isPrimaryTemplate`'s classification of
 * unlabeled templates as non-primary in that mode — the two helpers must
 * stay in sync or `optionalCompleted` can exceed `totalOptional`.
 * Always returns >= 0.
 *
 * @param {object[]} dayTemplates - All templates sharing the same day.
 * @returns {number}
 */
export const countOptionalTemplates = (dayTemplates) => {
  if (!Array.isArray(dayTemplates) || dayTemplates.length <= 1) return 0;

  if (hasExplicitSessionRoles(dayTemplates)) {
    return dayTemplates.filter((t) => t.sessionRole !== "primary").length;
  }

  return Math.max(0, dayTemplates.length - 1);
};
