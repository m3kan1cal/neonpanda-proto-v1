/**
 * Per-run keyed result store. Replaces the three hand-rolled implementations
 * in coach-creator, program-designer, and workout-logger.
 *
 *   - Coach-creator uses semantic aliases (`load_session_requirements` ->
 *     `requirements`).
 *   - Workout-logger needs array semantics for batched workouts (`index`).
 *   - Program-designer keys phases by phase ID (`uniqueKey`).
 *
 * Phase 1 — see plan §1.7.
 */

import type { ToolResultStoreLike } from "./tool-types";

export interface PutOptions {
  /** Place the value at this index in the keyed array. Mutually exclusive
   *  with `uniqueKey`. */
  index?: number;
  /** Override the storage key entirely (used by program-designer phase IDs). */
  uniqueKey?: string;
}

export class ToolResultStore implements ToolResultStoreLike {
  private byKey = new Map<string, unknown[]>();

  constructor(private readonly aliases: Record<string, string> = {}) {}

  put(toolId: string, result: unknown, opts: PutOptions = {}): void {
    const baseKey = this.aliases[toolId] ?? toolId;
    const key = opts.uniqueKey ?? baseKey;
    if (opts.index !== undefined) {
      // Positional / batched semantics (workout-logger). Preserve the array.
      const existing = this.byKey.get(key) ?? [];
      existing[opts.index] = result;
      this.byKey.set(key, existing);
      return;
    }
    // Single-value semantics (coach-creator aliases, program-designer phase
    // keys). Replace, don't append — re-calling a tool during retry must
    // not stack the stale failure alongside the new success in `getAll()`
    // / `toFlatRecord()`. `get()` always returned the last value so most
    // callers were correct, but this makes the contract consistent.
    this.byKey.set(key, [result]);
  }

  /** Most-recent value by default; pass an explicit index for array semantics. */
  get<T = unknown>(key: string, index = -1): T | undefined {
    const arr = this.byKey.get(key);
    if (!arr || arr.length === 0) return undefined;
    if (index === -1) {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] !== undefined) return arr[i] as T;
      }
      return undefined;
    }
    return arr[index] as T | undefined;
  }

  getAll<T = unknown>(key: string): T[] | undefined {
    return this.byKey.get(key) as T[] | undefined;
  }

  has(key: string): boolean {
    const arr = this.byKey.get(key);
    return !!arr && arr.length > 0;
  }

  /** Flatten to a record keyed by storage key. Single-element arrays are
   *  unwrapped (matches v1 coach-creator's `getStructuredToolResults`). */
  toFlatRecord(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, arr] of this.byKey.entries()) {
      out[k] = arr.length === 1 ? arr[0] : arr.slice();
    }
    return out;
  }

  clear(): void {
    this.byKey.clear();
  }
}
