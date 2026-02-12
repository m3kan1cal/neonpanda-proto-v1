/**
 * Centralized logging utility for backend Lambda functions
 * Uses loglevel for structured logging with configurable levels
 *
 * Production default: WARN (only warnings and errors)
 * Development default: DEBUG (all messages)
 *
 * Override via LOG_LEVEL environment variable:
 * - debug: Most verbose (development)
 * - info: General operational messages
 * - warn: Warnings and errors only (production default)
 * - error: Errors only
 * - silent: No logging
 */

import log from "loglevel";

// Set log level based on environment
// Production: Default to WARN to minimize CloudWatch costs
// Development: Default to DEBUG for full visibility
const isProduction = process.env.NODE_ENV === "production";
const defaultLevel = isProduction ? "warn" : "debug";
const logLevel = process.env.LOG_LEVEL || defaultLevel;

try {
  log.setLevel(logLevel as log.LogLevelDesc);
} catch (e) {
  // Fallback if invalid level provided
  log.setLevel(defaultLevel as log.LogLevelDesc);
  log.warn(`Invalid LOG_LEVEL "${logLevel}", using default "${defaultLevel}"`);
}

// Log the current configuration (only in development)
if (!isProduction) {
  log.info(`Logger initialized: level=${log.getLevel()} (${logLevel})`);
}

// Create a logger instance
export const logger = log;

// Export convenience methods
export const debug = log.debug.bind(log);
export const info = log.info.bind(log);
export const warn = log.warn.bind(log);
export const error = log.error.bind(log);

export default logger;
