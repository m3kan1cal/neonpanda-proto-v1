/**
 * Streaming Utilities for Lambda Function URLs
 *
 * Reusable utilities for Server-Sent Events (SSE) streaming across Lambda functions.
 * This library provides:
 *
 * - Type definitions for SSE events and streaming handlers
 * - Authentication middleware adapted for Lambda Function URLs
 * - Path and query parameter extraction utilities
 * - Pipeline-compatible SSE formatting utilities
 * - Business logic types for streaming functions
 *
 * Usage:
 * ```typescript
 * import {
 *   withStreamingAuth,
 *   formatSseEvent,
 *   extractPathParameters,
 *   ValidationParams
 * } from '../libs/streaming';
 *
 * const handler = withStreamingAuth(async (event, responseStream, context) => {
 *   const pathParams = extractPathParameters(event.rawPath);
 *   const startEvent = formatStartEvent();
 *   sseStream.push(startEvent);
 *   // ... streaming logic with pipeline
 * });
 * ```
 */

// Core type definitions
export * from "./types";

// Business logic types for streaming functions
export * from "./business-types";

// Pipeline-compatible SSE formatters
export * from "./formatters";

// Path parameter utilities
export * from "./path-utils";

// Route pattern constants
export * from "./route-patterns";

// Request validation utilities
export * from "./request-validation";

// Multimodal helpers (includes S3 image fetching and Bedrock formatting)
export * from "./multimodal-helpers";

// Memory helpers
export * from "./memory-helpers";

// Streaming contextual UX (SSE)
export * from "./streaming-contextual-static";
export * from "./streaming-contextual-flags";
export { maybeStreamingCoachPulse } from "./streaming-contextual-llm";

// Note: Authentication middleware moved to ../auth/middleware.ts

// Convenience re-exports for common patterns
export {
  formatSseEvent,
  formatStartEvent,
  formatChunkEvent,
  formatContextualEvent,
  formatMetadataEvent,
  formatProgressEvent,
  formatErrorEvent,
  formatCompleteEvent,
  formatAuthErrorEvent,
  formatValidationErrorEvent,
  formatGuardrailWarningEvent,
  getErrorCodeFromError,
  createStreamTerminator,
} from "./formatters";

export {
  extractPathParameters,
  validateRequiredPathParams,
} from "./path-utils";

// Auth exports moved to ../auth/middleware.ts
