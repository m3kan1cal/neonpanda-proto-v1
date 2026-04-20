import { describe, it, expect, beforeEach } from "vitest";
import {
  parseBuildMeta,
  isStale,
  readSnooze,
  writeSnooze,
  clearSnooze,
  isSnoozed,
  SNOOZE_STORAGE_KEY,
  SNOOZE_TTL_MS,
} from "./buildStaleness.js";

/** Minimal in-memory Web Storage stub that mirrors the behavior we rely on. */
function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    _dump: () => Object.fromEntries(store),
  };
}

describe("parseBuildMeta", () => {
  it("accepts a valid payload", () => {
    expect(parseBuildMeta({ buildId: "abc123", version: "1.0.0" })).toEqual({
      buildId: "abc123",
      version: "1.0.0",
    });
  });

  it("tolerates a missing version", () => {
    expect(parseBuildMeta({ buildId: "abc123" })).toEqual({
      buildId: "abc123",
      version: "",
    });
  });

  it("rejects missing or empty buildId", () => {
    expect(parseBuildMeta({})).toBeNull();
    expect(parseBuildMeta({ buildId: "" })).toBeNull();
    expect(parseBuildMeta({ buildId: "   " })).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseBuildMeta(null)).toBeNull();
    expect(parseBuildMeta(undefined)).toBeNull();
    expect(parseBuildMeta("abc")).toBeNull();
  });
});

describe("isStale", () => {
  it("is false when ids match", () => {
    expect(isStale("abc", "abc")).toBe(false);
  });

  it("is true when ids differ", () => {
    expect(isStale("abc", "def")).toBe(true);
  });

  it("is false when either id is missing", () => {
    expect(isStale("", "abc")).toBe(false);
    expect(isStale("abc", "")).toBe(false);
    expect(isStale(null, "abc")).toBe(false);
    expect(isStale("abc", undefined)).toBe(false);
  });
});

describe("snooze storage", () => {
  let storage;

  beforeEach(() => {
    storage = createStorage();
  });

  it("writes and reads a snooze record", () => {
    const now = 1_000_000;
    const record = writeSnooze("abc", now, storage);
    expect(record).toEqual({ buildId: "abc", until: now + SNOOZE_TTL_MS });
    expect(readSnooze(storage)).toEqual(record);
  });

  it("returns null when nothing is stored", () => {
    expect(readSnooze(storage)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    storage.setItem(SNOOZE_STORAGE_KEY, "{not json");
    expect(readSnooze(storage)).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    storage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify({ buildId: "abc" }));
    expect(readSnooze(storage)).toBeNull();
    storage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify({ until: 1 }));
    expect(readSnooze(storage)).toBeNull();
  });

  it("clearSnooze removes the record", () => {
    writeSnooze("abc", 1, storage);
    clearSnooze(storage);
    expect(readSnooze(storage)).toBeNull();
  });
});

describe("isSnoozed", () => {
  let storage;
  beforeEach(() => {
    storage = createStorage();
  });

  it("is false when no snooze is recorded", () => {
    expect(isSnoozed("abc", 0, storage)).toBe(false);
  });

  it("suppresses the banner within the TTL for the same buildId", () => {
    const now = 5_000;
    writeSnooze("abc", now, storage);
    expect(isSnoozed("abc", now + 60_000, storage)).toBe(true);
  });

  it("expires after the TTL elapses", () => {
    const now = 5_000;
    writeSnooze("abc", now, storage);
    expect(isSnoozed("abc", now + SNOOZE_TTL_MS + 1, storage)).toBe(false);
  });

  it("bypasses the snooze when the remote buildId changes", () => {
    const now = 5_000;
    writeSnooze("abc", now, storage);
    expect(isSnoozed("def", now + 60_000, storage)).toBe(false);
  });

  it("is false when remote buildId is missing", () => {
    writeSnooze("abc", 0, storage);
    expect(isSnoozed("", 1, storage)).toBe(false);
    expect(isSnoozed(null, 1, storage)).toBe(false);
  });
});
