/**
 * Lambda Function URL Streaming API
 *
 * Direct streaming API calls to Lambda Function URLs, bypassing API Gateway.
 * This provides true Server-Sent Events (SSE) streaming with real-time AI responses.
 */

import { getAuthHeaders } from "./apiConfig";
import { logger } from "../logger";
import {
  STREAMING_CONFIG,
  getStreamingUrl,
  isStreamingEnabled,
} from "./apiConfig";

/**
 * Generic Lambda Function URL streaming handler
 * @private
 * @param {Object} config - Streaming configuration
 * @param {string} config.endpointType - The endpoint type ('coachConversation' or 'coachCreatorSession')
 * @param {string} config.path - URL path for the streaming endpoint
 * @param {string} config.method - HTTP method (POST or PUT)
 * @param {string} config.userResponse - User's message/response
 * @param {string[]} config.imageS3Keys - Optional array of S3 keys for images
 * @param {Object} config.logContext - Optional context for logging
 * @returns {AsyncGenerator} - Stream of SSE events
 */
async function* streamLambdaRequest({
  endpointType,
  path,
  method,
  userResponse,
  imageS3Keys = [],
  logContext = {},
}) {
  if (!isStreamingEnabled(endpointType)) {
    throw new Error(
      `${endpointType} Lambda Function URL streaming is not enabled or configured`,
    );
  }

  const url = getStreamingUrl(endpointType, path);

  const requestBody = {
    userResponse,
    messageTimestamp: new Date().toISOString(),
  };

  // Add imageS3Keys if present
  if (imageS3Keys && imageS3Keys.length > 0) {
    requestBody.imageS3Keys = imageS3Keys;
  }

  try {
    // Get authentication headers
    const authHeaders = await getAuthHeaders();

    if (!authHeaders.Authorization) {
      throw new Error("Authentication required for streaming");
    }

    // Optional logging for debugging
    if (Object.keys(logContext).length > 0) {
      logger.info(`🚀 Streaming to ${endpointType} Lambda Function URL:`, {
        url: url.substring(0, 50) + "...",
        ...logContext,
      });
    }

    // Make the streaming request
    const response = await fetch(url, {
      method,
      headers: {
        ...authHeaders,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(STREAMING_CONFIG.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Streaming request failed: ${response.status} ${response.statusText}`,
      );
    }

    if (!response.body) {
      throw new Error("No response body received from streaming endpoint");
    }

    // Process the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decodedChunk = decoder.decode(value, { stream: true });

        buffer += decodedChunk;
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);

                yield data;

                // If this is the completion event, we're done
                if (data.type === "complete") {
                  return;
                }

                // Handle error events
                if (data.type === "error") {
                  throw new Error(data.message || "Streaming error occurred");
                }
              }
            } catch (parseError) {
              logger.warn(
                "⚠️ Failed to parse Lambda SSE data:",
                parseError,
                "Line:",
                line,
              );
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    logger.error(
      `❌ ${endpointType} Lambda Function URL streaming error:`,
      error,
    );

    // Provide more specific error messages
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      throw new Error("Streaming request timed out. Please try again.");
    } else if (error.message.includes("Authentication")) {
      throw new Error("Authentication failed. Please refresh and try again.");
    } else if (error.message.includes("404")) {
      throw new Error("Resource not found or expired.");
    } else if (error.message.includes("500")) {
      throw new Error("Server error occurred. Please try again in a moment.");
    }

    throw error;
  }
}

/**
 * Streams a coach conversation message using Lambda Function URL
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @param {string} userResponse - The user's message/response
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @returns {AsyncGenerator} - Stream of SSE events
 */
export async function* streamCoachConversationLambda(
  userId,
  coachId,
  conversationId,
  userResponse,
  imageS3Keys = [],
) {
  const path = `users/${userId}/coaches/${coachId}/conversations/${conversationId}/stream`;

  yield* streamLambdaRequest({
    endpointType: "coachConversation",
    path,
    method: "POST",
    userResponse,
    imageS3Keys,
  });
}

/**
 * Updates a coach creator session using Lambda Function URL streaming
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @param {string} userResponse - The user's response
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @returns {AsyncGenerator} - Stream of SSE events
 */
export async function* streamCoachCreatorSessionLambda(
  userId,
  sessionId,
  userResponse,
  imageS3Keys = [],
) {
  const path = `users/${userId}/coach-creator-sessions/${sessionId}/stream`;

  yield* streamLambdaRequest({
    endpointType: "coachCreatorSession",
    path,
    method: "PUT",
    userResponse,
    imageS3Keys,
  });
}

/**
 * Streams a program designer session using Lambda Function URL
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @param {string} userResponse - The user's message/response
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @returns {AsyncGenerator} - Stream of SSE events
 */
export async function* streamProgramDesignerSessionLambda(
  userId,
  sessionId,
  userResponse,
  imageS3Keys = [],
) {
  const path = `users/${userId}/program-designer-sessions/${sessionId}/stream`;

  yield* streamLambdaRequest({
    endpointType: "programDesignerSession",
    path,
    method: "POST",
    userResponse,
    imageS3Keys,
  });
}

/**
 * Test the Lambda Function URL streaming connection
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} conversationId - The conversation ID
 * @param {string} testMessage - Test message to send
 * @returns {Promise<Object>} - Test result with metrics
 */
export async function testLambdaStreamingConnection(
  userId,
  coachId,
  conversationId,
  testMessage = "Test message",
) {
  const startTime = Date.now();
  const events = [];
  let error = null;

  try {
    const stream = streamCoachConversationLambda(
      userId,
      coachId,
      conversationId,
      testMessage,
    );

    for await (const event of stream) {
      events.push({
        ...event,
        receivedAt: Date.now() - startTime,
      });
    }
  } catch (err) {
    error = err.message;
  }

  const endTime = Date.now();

  return {
    success: !error,
    error,
    duration: endTime - startTime,
    eventCount: events.length,
    events: events.slice(0, 5), // First 5 events for debugging
    streamingChunks: events.filter((e) => e.type === "chunk" && e.content)
      .length,
    hasCompleteEvent: events.some((e) => e.type === "complete"),
    config: {
      functionUrl: STREAMING_CONFIG.coachConversation.functionUrl,
      enabled: isStreamingEnabled("coachConversation"),
      timeout: STREAMING_CONFIG.timeout,
    },
  };
}

/**
 * Check if Lambda Function URL streaming is available
 * @param {string} endpointType - Optional endpoint type ('coachConversation' or 'coachCreatorSession')
 * @returns {Promise<Object>} - Health check result
 */
export async function checkLambdaStreamingHealth(
  endpointType = "coachConversation",
) {
  return {
    available: isStreamingEnabled(endpointType),
    functionUrl: STREAMING_CONFIG[endpointType]?.functionUrl,
    enabled: STREAMING_CONFIG.enabled,
    timeout: STREAMING_CONFIG.timeout,
    endpointType,
    browserSupport: {
      fetch: typeof fetch !== "undefined",
      readableStream: typeof ReadableStream !== "undefined",
      abortSignal: typeof AbortSignal !== "undefined",
    },
  };
}
