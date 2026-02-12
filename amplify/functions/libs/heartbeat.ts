import { logger } from "./logger";
/**
 * Heartbeat Utility for Long-Running Lambda Handlers
 *
 * Provides standardized heartbeat logging for async Lambda functions
 * to track progress and diagnose timeouts in CloudWatch logs.
 *
 * Usage:
 * ```typescript
 * const heartbeat = startHeartbeat('Coach Config Generation');
 * try {
 *   // ... long operation ...
 * } finally {
 *   stopHeartbeat(heartbeat);
 * }
 * ```
 */

const DEFAULT_INTERVAL_MS = 10000;

/**
 * Heartbeat handle returned by startHeartbeat()
 * Contains internal state for tracking heartbeat progress
 */
export interface HeartbeatHandle {
  _operationName: string;
  _interval: NodeJS.Timeout;
  _intervalMs: number;
  _count: number;
}

/**
 * Start a heartbeat monitor with custom interval and operation name
 *
 * @param operationName - Name of the operation being monitored (e.g., "Workout Extraction")
 * @param intervalMs - Heartbeat interval in milliseconds (default: 10000ms = 10s)
 * @returns HeartbeatHandle to pass to stopHeartbeat()
 */
export function startHeartbeat(
  operationName: string,
  intervalMs: number = DEFAULT_INTERVAL_MS
): HeartbeatHandle {
  logger.info(`💓 Starting heartbeat monitoring for: ${operationName} (${intervalMs/1000}s interval)`);

  const handle: HeartbeatHandle = {
    _operationName: operationName,
    _interval: null as any, // Will be set immediately below
    _intervalMs: intervalMs,
    _count: 0,
  };

  handle._interval = setInterval(() => {
    handle._count++;
    const elapsedSeconds = handle._count * (intervalMs / 1000);
    logger.info(
      `💓 Heartbeat #${handle._count}: ${operationName} in progress (${elapsedSeconds}s elapsed)`
    );
  }, intervalMs);

  return handle;
}

/**
 * Stop a heartbeat monitor and log final statistics
 *
 * @param handle - HeartbeatHandle returned from startHeartbeat()
 */
export function stopHeartbeat(handle: HeartbeatHandle | null): void {
  if (!handle) return;

  if (handle._interval) {
    clearInterval(handle._interval);
    const totalSeconds = handle._count * (handle._intervalMs / 1000);
    logger.info(
      `💓 Heartbeat stopped for ${handle._operationName}: ${handle._count} beats (${totalSeconds}s total)`
    );
  }
}

/**
 * Get the current heartbeat count
 *
 * @param handle - HeartbeatHandle returned from startHeartbeat()
 * @returns Number of heartbeats that have occurred
 */
export function getHeartbeatCount(handle: HeartbeatHandle | null): number {
  return handle?._count || 0;
}

/**
 * Get the elapsed time in seconds
 *
 * @param handle - HeartbeatHandle returned from startHeartbeat()
 * @returns Elapsed time in seconds
 */
export function getHeartbeatElapsed(handle: HeartbeatHandle | null): number {
  if (!handle) return 0;
  return handle._count * (handle._intervalMs / 1000);
}

/**
 * Utility to wrap an async operation with automatic heartbeat monitoring
 *
 * @param operationName - Name of the operation
 * @param operation - Async function to execute
 * @param intervalMs - Heartbeat interval in milliseconds (default: 10000ms = 10s)
 * @returns Result of the operation
 */
export async function withHeartbeat<T>(
  operationName: string,
  operation: () => Promise<T>,
  intervalMs: number = DEFAULT_INTERVAL_MS
): Promise<T> {
  const heartbeat = startHeartbeat(operationName, intervalMs);

  try {
    return await operation();
  } finally {
    stopHeartbeat(heartbeat);
  }
}

