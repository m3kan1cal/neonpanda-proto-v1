/**
 * Centralized logging utility for frontend React application
 * Uses loglevel for structured logging with configurable levels
 *
 * Production default: ERROR (only errors, minimize browser console noise)
 * Development default: DEBUG (all messages)
 *
 * Override via VITE_LOG_LEVEL environment variable:
 * - debug: Most verbose (development)
 * - info: General operational messages
 * - warn: Warnings and errors
 * - error: Errors only (production default)
 * - silent: No logging
 *
 * Temporary override in browser console:
 *   localStorage.setItem('loglevel:webpack-dev-server', 'DEBUG');
 *   location.reload();
 */

import log from "loglevel";

// Set log level based on environment
// Production: Default to ERROR to keep browser console clean
// Development: Default to DEBUG for full visibility
const isDevelopment = import.meta.env.MODE === "development";
const defaultLevel = isDevelopment ? "debug" : "error";
const logLevel = import.meta.env.VITE_LOG_LEVEL || defaultLevel;

try {
  log.setLevel(logLevel);
} catch (e) {
  // Fallback if invalid level provided
  log.setLevel(defaultLevel);
  log.warn(
    `Invalid VITE_LOG_LEVEL "${logLevel}", using default "${defaultLevel}"`,
  );
}

// Log the current configuration (only in development)
if (isDevelopment) {
  log.info(
    `Logger initialized: level=${log.getLevel()} (${logLevel}), mode=${import.meta.env.MODE}`,
  );
}

// Create a logger instance
export const logger = log;

// Export convenience methods
export const debug = log.debug.bind(log);
export const info = log.info.bind(log);
export const warn = log.warn.bind(log);
export const error = log.error.bind(log);

export default logger;
