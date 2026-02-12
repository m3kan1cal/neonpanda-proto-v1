/**
 * Centralized logging utility for frontend React application
 * Uses loglevel for structured logging with configurable levels
 *
 * Current default: DEBUG (all environments)
 * We're in active development and rely on logs for troubleshooting.
 * Can be tightened later via VITE_LOG_LEVEL env var.
 *
 * Override via VITE_LOG_LEVEL environment variable:
 * - debug: Most verbose (current default)
 * - info: General operational messages
 * - warn: Warnings and errors
 * - error: Errors only
 * - silent: No logging
 *
 * Temporary override in browser console:
 *   localStorage.setItem('loglevel:webpack-dev-server', 'DEBUG');
 *   location.reload();
 */

import log from "loglevel";

// Set log level based on environment
// Default to DEBUG for maximum observability during active development
const defaultLevel = "debug";
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

// Log the current configuration
log.info(
  `Logger initialized: level=${log.getLevel()} (${logLevel}), mode=${import.meta.env.MODE}`,
);

// Create a logger instance
export const logger = log;

// Export convenience methods
export const debug = log.debug.bind(log);
export const info = log.info.bind(log);
export const warn = log.warn.bind(log);
export const error = log.error.bind(log);

export default logger;
