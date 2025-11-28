/**
 * SSE Event Formatters for Pipeline-Based Streaming
 *
 * Utilities for formatting Server-Sent Events compatible with AWS Lambda
 * streaming using util.promisify(stream.pipeline) approach.
 *
 * These formatters create SSE-formatted strings that can be pushed to
 * a Readable stream for pipeline-based streaming.
 */

import { SseEvent, SseCompleteEvent } from "./types";
import { ProgressEventType } from "./business-types";

/**
 * Formats any SSE event as a properly formatted SSE string
 * Compatible with stream.Readable.push() for pipeline streaming
 */
export function formatSseEvent(event: SseEvent): string {
  const data = JSON.stringify(event);
  return `data: ${data}\n\n`;
}

/**
 * Creates a formatted SSE start event
 */
export function formatStartEvent(): string {
  return formatSseEvent({
    type: "start",
    status: "initialized"
  });
}

/**
 * Creates a formatted SSE chunk event for content streaming
 */
export function formatChunkEvent(content: string): string {
  return formatSseEvent({
    type: "chunk",
    content
  });
}

/**
 * Creates a formatted SSE contextual event for ephemeral UX feedback
 * These updates inform users of processing stages but are NOT saved to conversation history
 */
export function formatContextualEvent(content: string, stage?: string): string {
  return formatSseEvent({
    type: "contextual",
    content,
    ...(stage ? { stage } : {})
  });
}

/**
 * Creates a formatted SSE metadata event for early UI configuration
 * Sent after processing (e.g., workout detection) but before AI streaming
 * to inform UI about message mode/type so badges can show during streaming
 */
export function formatMetadataEvent(metadata: {
  mode?: string;
  [key: string]: any;
}): string {
  return formatSseEvent({
    type: "metadata",
    ...metadata
  });
}

/**
 * Creates a formatted SSE progress event for user feedback
 */
export function formatProgressEvent(progressType: ProgressEventType, message?: string): string {
  const progressMessages = {
    start: "Initializing..",
    processing_message: "Processing your message..",
    generating_response: "Generating response..",
    ai_chunk: "", // AI chunks use their actual content
    complete: "Complete"
  };

  return formatSseEvent({
    type: "chunk",
    content: message || progressMessages[progressType]
  });
}

/**
 * Creates a formatted SSE error event with proper error codes
 */
export function formatErrorEvent(
  message: string,
  code?: string,
  originalError?: Error
): string {
  return formatSseEvent({
    type: "error",
    message,
    code: code || "PROCESSING_ERROR"
  });
}

/**
 * Creates a formatted SSE completion event with full context
 */
export function formatCompleteEvent(data: {
  messageId: string;
  userMessage?: any;
  aiMessage?: any;
  conversationId?: string;
  pineconeContext?: {
    used: boolean;
    matches: number;
    contextLength: number;
  };
  [key: string]: any;
}): string {
  return formatSseEvent({
    type: "complete",
    status: "finished",
    ...data
  });
}

/**
 * Maps error types to appropriate SSE error codes
 */
export function getErrorCodeFromError(error: Error): string {
  const message = error.message;

  if (message.includes("Authorization")) return "MISSING_AUTH_HEADER";
  if (message.includes("Invalid JWT")) return "INVALID_TOKEN_FORMAT";
  if (message.includes("Failed to decode")) return "INVALID_TOKEN_FORMAT";
  if (message.includes("userId not found")) return "MISSING_CUSTOM_USER_ID";
  if (message.includes("Access denied")) return "USER_ID_MISMATCH";
  if (message.includes("Missing required path parameters")) return "MISSING_PATH_PARAMS";
  if (message.includes("Request body is required")) return "MISSING_REQUEST_BODY";
  if (message.includes("Invalid JSON")) return "INVALID_JSON";
  if (message.includes("userResponse is required")) return "INVALID_USER_RESPONSE";
  if (message.includes("Message timestamp is required")) return "MISSING_TIMESTAMP";
  if (message.includes("Conversation not found")) return "CONVERSATION_NOT_FOUND";
  if (message.includes("Coach configuration not found")) return "COACH_CONFIG_NOT_FOUND";

  return "PROCESSING_ERROR";
}

/**
 * Creates a formatted authentication error event
 */
export function formatAuthErrorEvent(error: Error): string {
  return formatErrorEvent(
    error.message,
    getErrorCodeFromError(error),
    error
  );
}

/**
 * Creates a formatted validation error event
 */
export function formatValidationErrorEvent(error: Error): string {
  return formatErrorEvent(
    error.message,
    getErrorCodeFromError(error),
    error
  );
}

/**
 * Utility to create a stream terminator (null) for ending streams
 */
export function createStreamTerminator(): null {
  return null;
}
