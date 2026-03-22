/**
 * Pure object/array helpers for the React app.
 */

/**
 * Coerces analytics fields that may be `string | string[] | null` (e.g. red_flags) to
 * `string[]` for list rendering.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeListFieldToStringArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .filter((v) => v != null && String(v).trim() !== "")
      .map((v) => String(v));
  }
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }
  return [];
}
