/**
 * ID Generation Utilities
 *
 * Centralized utilities for generating consistent entity IDs across the system.
 * Pattern: {entityType}_{userId}_{timestamp}_{shortId}
 */

import { customAlphabet, nanoid } from "nanoid";

// Lowercase-alphanumeric short-ID generator. Backed by `crypto.randomBytes`
// via nanoid, so it remains unique under v2's parallel tool execution (two
// `extract_workout_data` calls landing in the same Node tick previously
// produced identical IDs because `Math.random()` advanced its state
// predictably enough that paired calls collided — see Bugbot
// multi-workout `workout_id` duplication finding).
//
// Alphabet [0-9a-z] (length 36) is deliberately preserved to stay
// compatible with the `workout_[a-z0-9_]+` fallback regex in
// workout-logger/{agent,v2-agent}.ts that scrapes IDs out of model
// narration. URL-safe nanoid would introduce `-` and `A-Z` and silently
// truncate that match.
const generateShortIdInternal = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  9,
);

/**
 * Generate a random short ID (9 characters, lowercase alphanumeric).
 *
 * Cryptographically strong: each call is independent and safe across
 * concurrent invocations within the same Lambda process.
 *
 * @returns Random short ID string
 */
export function generateShortId(): string {
  return generateShortIdInternal();
}

/**
 * Generate a program ID
 * Format: program_{userId}_{timestamp}_{shortId}
 *
 * @param userId - User ID who owns the program
 * @returns Generated program ID
 */
export function generateProgramId(userId: string): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `program_${userId}_${timestamp}_${shortId}`;
}

/**
 * Generate a shared program ID
 * Format: sharedProgram_{nanoId}
 * Note: Does not include userId to maintain privacy in public share links
 *
 * @returns Generated shared program ID
 */
export function generateSharedProgramId(): string {
  // Use nanoid for strong collision resistance (21 chars = ~2.8 million years to 1% collision at 1000 IDs/hour)
  return `sharedProgram_${nanoid(21)}`;
}

/**
 * Generate a workout template ID
 * Format: template_{userId}_{timestamp}_{shortId}
 *
 * @param userId - User ID who owns the template
 * @returns Generated template ID
 */
export function generateTemplateId(userId: string): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `template_${userId}_${timestamp}_${shortId}`;
}

/**
 * Generate a workout group ID
 * Format: group_{userId}_{timestamp}_{shortId}
 *
 * @param userId - User ID who owns the group
 * @returns Generated group ID
 */
export function generateGroupId(userId: string): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `group_${userId}_${timestamp}_${shortId}`;
}

/**
 * Generate a program designer session ID
 * Format: program_designer_{userId}_{timestamp}
 *
 * @param userId - User ID who owns the session
 * @returns Generated session ID
 */
export function generateProgramDesignerSessionId(userId: string): string {
  const timestamp = Date.now();
  return `program_designer_${userId}_${timestamp}`;
}

/**
 * Generate a workout ID
 * Format: workout_{userId}_{timestamp}_{shortId}
 *
 * @param userId - User ID who owns the workout
 * @returns Generated workout ID
 */
export function generateWorkoutId(userId: string): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `workout_${userId}_${timestamp}_${shortId}`;
}

/**
 * Generate an exercise ID
 * Format: exercise_{userId}_{timestamp}_{shortId}
 *
 * @param userId - User ID who owns the exercise
 * @returns Generated exercise ID
 */
export function generateExerciseId(userId: string): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `exercise_${userId}_${timestamp}_${shortId}`;
}

/**
 * Generate a memory ID
 * Format: user_memory_{userId}_{timestamp}_{shortId}
 * Note: Uses user_memory prefix for consistency with existing memory system
 *
 * @param userId - User ID who owns the memory
 * @returns Generated memory ID
 */
export function generateMemoryId(userId: string): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `user_memory_${userId}_${timestamp}_${shortId}`;
}

/**
 * Generic entity ID generator
 * Format: {entityType}_{userId}_{timestamp}_{shortId}
 *
 * @param entityType - Type of entity (e.g., "workout", "exercise", "conversation")
 * @param userId - User ID who owns the entity
 * @returns Generated entity ID
 */
export function generateEntityId(entityType: string, userId: string): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `${entityType}_${userId}_${timestamp}_${shortId}`;
}
