/**
 * Helpers for v2 agents that wrap v1 tools via `adaptLegacyTool` and feed
 * the results into v1 helper functions. v1 helpers (e.g. coach-creator's
 * `enforceValidationBlocking`, program-designer's `enforceAllBlocking`)
 * inspect `.error` and `.isValid` on stored tool results. v2's
 * `adaptLegacyTool` stores failures in a different shape
 * (`{ ok: false, code, message, ... }`), so without translation the v1
 * helpers don't recognise them.
 *
 * These two helpers — extracted from coach-creator/v2-agent and
 * program-designer/v2-agent where they had drifted in name only — let
 * each migrated agent normalise reads and count successes consistently.
 */

import type { ToolResultStoreLike } from "./tools/tool-types";

/**
 * Translate a v2 `ToolResult`-shaped failure (`{ ok: false, code, message }`)
 * back to v1's `{ isValid: false, error, validationIssues }` shape so v1
 * helper functions that expect those fields still recognise the failure.
 *
 * Pass-through for anything that's not an object or that doesn't carry
 * `ok === false`.
 *
 * @param fallbackMessage Used only when the v2 envelope's `message` is
 *  absent or empty (rare — `adaptLegacyTool` sets it on every failure).
 */
export function normaliseLegacyToolResult(
  raw: unknown,
  fallbackMessage = "Tool failed",
): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  if (r.ok === false) {
    const message =
      typeof r.message === "string" && r.message ? r.message : fallbackMessage;
    return {
      isValid: false,
      validationIssues: [message],
      error: message,
    };
  }
  return raw;
}

/**
 * Count tools whose stored result represents a success. Mirrors v1's
 * `successfulToolCount` filter — exclude both v1 `{ error: ... }` shapes
 * (truthiness check, matching adaptLegacyTool's adapter) and v2
 * `{ ok: false }` envelopes.
 *
 * @param storageKeys The list of canonical storage keys to inspect (the
 *  values of an agent-specific STORAGE_KEY_MAP). Agents passing
 *  alias-rewritten keys count once per resolved key, regardless of how
 *  many tool IDs map to it.
 */
export function countSuccessfulToolResults(
  resultStore: ToolResultStoreLike,
  storageKeys: readonly string[],
): number {
  let count = 0;
  for (const key of storageKeys) {
    const r = resultStore.get<any>(key);
    if (!r || typeof r !== "object") continue;
    if (r.error) continue;
    if (r.ok === false) continue;
    count++;
  }
  return count;
}
