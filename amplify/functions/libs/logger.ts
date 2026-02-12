/**
 * Centralized logging utility for backend Lambda functions
 * Uses loglevel for structured logging with configurable levels
 *
 * Current default: DEBUG (all environments)
 * We're in active development and rely on logs for troubleshooting backend issues.
 * Can be tightened later via LOG_LEVEL env var for production cost optimization.
 *
 * Override via LOG_LEVEL environment variable:
 * - debug: Most verbose (current default)
 * - info: General operational messages
 * - warn: Warnings and errors only
 * - error: Errors only
 * - silent: No logging
 */

import log from "loglevel";

// Set log level based on environment
// Default to DEBUG for maximum observability during active development
const defaultLevel = "debug";
const logLevel = process.env.LOG_LEVEL || defaultLevel;

try {
  log.setLevel(logLevel as log.LogLevelDesc);
} catch (e) {
  // Fallback if invalid level provided
  log.setLevel(defaultLevel as log.LogLevelDesc);
  log.warn(`Invalid LOG_LEVEL "${logLevel}", using default "${defaultLevel}"`);
}

// Log the current configuration
log.info(`Logger initialized: level=${log.getLevel()} (${logLevel})`);

// Create a logger instance
export const logger = log;

// Export convenience methods
export const debug = log.debug.bind(log);
export const info = log.info.bind(log);
export const warn = log.warn.bind(log);
export const error = log.error.bind(log);

export default logger;
