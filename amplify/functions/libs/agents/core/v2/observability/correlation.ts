/**
 * Per-run correlation context propagated via Node's AsyncLocalStorage so any
 * log line emitted inside an agent run gets userId / runId / iteration /
 * toolUseId stamped on it without threading them through every signature.
 *
 * Phase 1 — see plan §7.1.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface CorrelationContext {
  userId: string;
  agentId: string;
  agentRunId: string;
  iteration: number;
  toolUseId?: string;
  conversationId?: string;
  sessionId?: string;
  coachId?: string;
}

export const correlationStore = new AsyncLocalStorage<CorrelationContext>();

export function getCorrelation(): CorrelationContext | undefined {
  return correlationStore.getStore();
}

export function withCorrelation<T>(
  ctx: CorrelationContext,
  fn: () => T,
): T {
  return correlationStore.run(ctx, fn);
}

export function withToolCorrelation<T>(
  toolUseId: string,
  fn: () => T,
): T {
  const parent = correlationStore.getStore();
  if (!parent) return fn();
  return correlationStore.run({ ...parent, toolUseId }, fn);
}

export function withIterationCorrelation<T>(
  iteration: number,
  fn: () => T,
): T {
  const parent = correlationStore.getStore();
  if (!parent) return fn();
  return correlationStore.run({ ...parent, iteration }, fn);
}
