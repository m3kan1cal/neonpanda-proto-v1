import { logger } from "../logger";
/**
 * Parallel Execution Helpers for Streaming
 *
 * Provides utilities for executing work in parallel with contextual updates
 * during streaming responses.
 */

/**
 * Execute work in parallel with contextual update generation
 * Uses "await after work" approach - simple and generator-compatible
 *
 * This helper allows you to start generating a contextual update while
 * simultaneously performing the actual work. The update is typically very
 * fast (Nova Micro) and will usually be ready by the time the work completes.
 *
 * @param updatePromise - Promise that generates the contextual update text
 * @param workPromise - Promise that performs the actual work
 * @param updateType - Type of update (for logging purposes)
 * @returns Object with the update (or null if failed) and the work result
 */
export async function executeWithContextualUpdate<T>(
  updatePromise: Promise<string>,
  workPromise: Promise<T>,
  updateType: string
): Promise<{ update: string | null, workResult: T }> {
  // Start update generation (don't await yet)
  const startedUpdate = updatePromise;

  // Do actual work - this runs in parallel with update
  const workResult = await workPromise;

  // Update has probably finished by now, await it quickly
  let update = null;
  try {
    update = await startedUpdate;  // Usually instant (already resolved)
  } catch (err) {
    logger.warn(`Contextual update ${updateType} failed (non-critical):`, err);
  }

  return { update, workResult };
}
