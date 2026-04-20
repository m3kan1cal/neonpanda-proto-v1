/**
 * Pure helpers for detecting when the deployed SPA is newer than the running tab.
 *
 * A new build is published at `/build-meta.json` with a `buildId`. The running
 * bundle embeds its own `__BUILD_ID__` via Vite `define`. When the two diverge
 * we show a calm banner that lets the user reload.
 *
 * Everything here is a pure function so it can be unit-tested without React.
 */

export const BUILD_META_URL = "/build-meta.json";
export const DEFAULT_POLL_INTERVAL_MS = 10 * 60 * 1000;
export const SNOOZE_TTL_MS = 24 * 60 * 60 * 1000;
export const SNOOZE_STORAGE_KEY = "neonpanda.buildStaleness.snooze";

/**
 * Parse a `build-meta.json` payload into a `{ buildId, version }` record.
 * Returns `null` for anything that does not contain a usable `buildId`.
 */
export function parseBuildMeta(raw) {
  if (!raw || typeof raw !== "object") return null;
  const buildId = typeof raw.buildId === "string" ? raw.buildId.trim() : "";
  if (!buildId) return null;
  const version = typeof raw.version === "string" ? raw.version : "";
  return { buildId, version };
}

/**
 * True when the remote build id is usable and different from the running tab's id.
 * Unknown or empty remote ids are treated as "not stale" so we never show a
 * banner based on a malformed payload.
 */
export function isStale(remoteBuildId, localBuildId) {
  if (!remoteBuildId || typeof remoteBuildId !== "string") return false;
  if (!localBuildId || typeof localBuildId !== "string") return false;
  return remoteBuildId !== localBuildId;
}

function safeStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    // localStorage (not sessionStorage) is intentional: SNOOZE_TTL_MS is 24h
    // and must survive tab closes. A newer remote buildId always bypasses the
    // snooze via isSnoozed(), so users never get trapped on a stale build.
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Read the current snooze record, if any. Shape: `{ buildId, until }`.
 * Returns `null` when nothing is stored or the stored value is unusable.
 */
export function readSnooze(storage) {
  const store = safeStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const buildId = typeof parsed.buildId === "string" ? parsed.buildId : null;
    const until = typeof parsed.until === "number" ? parsed.until : null;
    if (!buildId || !until) return null;
    return { buildId, until };
  } catch {
    return null;
  }
}

export function writeSnooze(buildId, now = Date.now(), storage) {
  const store = safeStorage(storage);
  if (!store || !buildId) return null;
  const record = { buildId, until: now + SNOOZE_TTL_MS };
  try {
    store.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private-mode / quota errors are non-fatal; we just won't snooze.
    return null;
  }
  return record;
}

export function clearSnooze(storage) {
  const store = safeStorage(storage);
  if (!store) return;
  try {
    store.removeItem(SNOOZE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * True when the user has snoozed *this exact* remote build id and the snooze
 * has not yet expired. A newer remote id bypasses the snooze so a fresh deploy
 * can always re-prompt.
 */
export function isSnoozed(remoteBuildId, now = Date.now(), storage) {
  if (!remoteBuildId) return false;
  const snooze = readSnooze(storage);
  if (!snooze) return false;
  if (snooze.buildId !== remoteBuildId) return false;
  return snooze.until > now;
}
