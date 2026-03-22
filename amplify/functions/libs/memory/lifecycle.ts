/**
 * Memory Lifecycle Module — DSR-Inspired Temporal Decay
 *
 * Replaces the flat 30-day recency scoring with a real decay curve based on
 * the FSRS v6 algorithm (Free Spaced Repetition Scheduler). Core insight:
 * memory stability GROWS with each successful retrieval (spaced repetition effect).
 *
 * Three key functions from FSRS v6:
 * 1. calculateRetrievability — how "fresh" a memory is right now
 * 2. updateStabilityAfterReinforcement — how much stronger a memory gets after use
 * 3. getCompressionThresholdDays — when to consider compressing/archiving
 *
 * Reference: https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
 */

import { UserMemory, MemoryLifecycleMetadata } from "./types";
import { logger } from "../logger";

// ── FSRS v6 Constants ──

/** FSRS v6 decay constant (negative for proper power-law decay) */
const DECAY = -0.5;

/** Derived factor for 90% target retention: (0.9^(1/DECAY) - 1) */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

// ── Initial Stability by Importance ──

/** Initial stability in days — how long until retrievability drops to ~37% without reinforcement */
const INITIAL_STABILITY: Record<string, number> = {
  high: 30,
  medium: 15,
  low: 7,
};

// ── Core DSR Functions ──

/**
 * Calculate retrievability — the probability (0-1) that this memory can be recalled.
 * Uses the FSRS v6 power-law forgetting curve.
 *
 * R(t, S) = (1 + FACTOR * t / S)^DECAY
 *
 * @param elapsedDays - Days since last reinforcement (or creation if never reinforced)
 * @param stability - Current stability in days
 * @returns Retrievability probability (0-1). 1.0 = perfectly fresh, 0.0 = completely forgotten
 */
export function calculateRetrievability(
  elapsedDays: number,
  stability: number,
): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

/**
 * Update stability after a memory is reinforced (used in conversation).
 * Stability grows MORE when a memory is retrieved at lower retrievability
 * (the "desirable difficulty" effect from spaced repetition).
 *
 * Simplified from FSRS v6:
 * S' = S * (e^0.5 * (11 - D) * S^-0.2 * (e^(0.1*(1-R)) - 1) + 1)
 *
 * @param stability - Current stability in days
 * @param difficulty - Memory difficulty (0-1, derived from inverse of importance)
 * @param retrievability - Current retrievability when reinforced
 * @returns New stability in days
 */
export function updateStabilityAfterReinforcement(
  stability: number,
  difficulty: number,
  retrievability: number,
): number {
  // Difficulty scaled to 1-10 range for FSRS formula (1=easy, 10=hard)
  const d = Math.max(1, Math.min(10, difficulty * 10));

  const stabilityGrowth =
    Math.exp(0.5) *
      (11 - d) *
      Math.pow(stability, -0.2) *
      (Math.exp(0.1 * (1 - retrievability)) - 1) +
    1;

  // Cap growth at 5x to prevent runaway stability
  const cappedGrowth = Math.min(stabilityGrowth, 5);
  return stability * Math.max(cappedGrowth, 1);
}

/**
 * Calculate when a memory should be considered for compression.
 * Returns the number of days until retrievability drops to the target threshold.
 *
 * I(r, S) = (r^(1/DECAY) - 1) / FACTOR * S
 *
 * @param stability - Current stability in days
 * @param targetRetention - Retrievability threshold (default 0.3 = compress when 70% forgotten)
 * @returns Days until the memory reaches the target retrievability
 */
export function getCompressionThresholdDays(
  stability: number,
  targetRetention: number = 0.3,
): number {
  if (stability <= 0 || targetRetention <= 0 || targetRetention >= 1) return 0;
  return ((Math.pow(targetRetention, 1 / DECAY) - 1) / FACTOR) * stability;
}

// ── Lifecycle State Management ──

/**
 * Get the difficulty value for a memory based on its importance.
 * Maps importance to difficulty (inverse relationship):
 * - high importance → low difficulty (0.3) — easier to retain
 * - medium importance → moderate difficulty (0.5)
 * - low importance → high difficulty (0.7) — harder to retain
 */
export function getDifficulty(importance: string): number {
  switch (importance) {
    case "high":
      return 0.3;
    case "medium":
      return 0.5;
    case "low":
      return 0.7;
    default:
      return 0.5;
  }
}

/**
 * Initialize lifecycle metadata for a new memory.
 */
export function initializeLifecycle(
  importance: string,
): MemoryLifecycleMetadata {
  return {
    state: "active",
    stability: INITIAL_STABILITY[importance] || INITIAL_STABILITY.medium,
    reinforcementCount: 0,
    lastReinforcedAt: new Date().toISOString(),
  };
}

/**
 * Reinforce a memory — call this when a memory is retrieved and used in conversation.
 * Updates stability and resets the decay clock.
 */
export function reinforceMemory(
  lifecycle: MemoryLifecycleMetadata,
  importance: string,
  elapsedDays: number,
): MemoryLifecycleMetadata {
  const currentRetrievability = calculateRetrievability(
    elapsedDays,
    lifecycle.stability,
  );
  const difficulty = getDifficulty(importance);

  const newStability = updateStabilityAfterReinforcement(
    lifecycle.stability,
    difficulty,
    currentRetrievability,
  );

  return {
    ...lifecycle,
    stability: newStability,
    reinforcementCount: lifecycle.reinforcementCount + 1,
    lastReinforcedAt: new Date().toISOString(),
  };
}

/**
 * Calculate the decay-based recency score for a memory.
 * Drop-in replacement for the existing flat 30-day recency score.
 *
 * Current:  recencyScore = Math.max(0, 30 - daysSinceCreated)  → max 30
 * New:      recencyScore = retrievability * 30                   → same 0-30 range
 */
export function calculateDecayScore(memory: UserMemory): number {
  const lifecycle = memory.metadata.lifecycle;

  if (!lifecycle) {
    // Fallback to flat scoring for memories without lifecycle data
    const now = new Date().getTime();
    const createdAt = new Date(memory.metadata.createdAt).getTime();
    const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);
    return Math.max(0, 30 - daysSinceCreated);
  }

  const lastReinforced = lifecycle.lastReinforcedAt
    ? new Date(lifecycle.lastReinforcedAt).getTime()
    : new Date(memory.metadata.createdAt).getTime();
  const elapsedDays = (Date.now() - lastReinforced) / (1000 * 60 * 60 * 24);

  const retrievability = calculateRetrievability(
    elapsedDays,
    lifecycle.stability,
  );

  // Scale to 0-30 range to match existing composite scoring
  return retrievability * 30;
}

/**
 * Determine if a memory should be compressed (gist-ified).
 * Criteria: retrievability < 0.3, still active, low reinforcement, older than 60 days
 */
export function shouldCompressMemory(memory: UserMemory): boolean {
  // Prospective memories have their own lifecycle
  if (memory.memoryType === "prospective") return false;

  const lifecycle = memory.metadata.lifecycle;
  if (!lifecycle || lifecycle.state !== "active") return false;

  const createdAt = new Date(memory.metadata.createdAt).getTime();
  const daysSinceCreated = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated < 60) return false;
  if (lifecycle.reinforcementCount >= 3) return false;

  const lastReinforced = lifecycle.lastReinforcedAt
    ? new Date(lifecycle.lastReinforcedAt).getTime()
    : createdAt;
  const elapsedDays = (Date.now() - lastReinforced) / (1000 * 60 * 60 * 24);
  const retrievability = calculateRetrievability(
    elapsedDays,
    lifecycle.stability,
  );

  return retrievability < 0.3;
}

/**
 * Determine if a compressed memory should be archived (excluded from queries).
 * Criteria: already compressed, retrievability < 0.1, compressed > 90 days ago
 */
export function shouldArchiveMemory(memory: UserMemory): boolean {
  if (memory.memoryType === "prospective") return false;

  const lifecycle = memory.metadata.lifecycle;
  if (!lifecycle || lifecycle.state !== "compressed") return false;

  const compressedAt = lifecycle.compressedAt
    ? new Date(lifecycle.compressedAt).getTime()
    : Date.now();
  const daysSinceCompressed =
    (Date.now() - compressedAt) / (1000 * 60 * 60 * 24);
  if (daysSinceCompressed < 90) return false;

  const lastReinforced = lifecycle.lastReinforcedAt
    ? new Date(lifecycle.lastReinforcedAt).getTime()
    : new Date(memory.metadata.createdAt).getTime();
  const elapsedDays = (Date.now() - lastReinforced) / (1000 * 60 * 60 * 24);
  const retrievability = calculateRetrievability(
    elapsedDays,
    lifecycle.stability,
  );

  return retrievability < 0.1;
}
