import { authenticatedFetch } from './apiConfig';

/**
 * Generic Server-Sent Events (SSE) streaming API helper
 * Handles common patterns for streaming API responses with fallback support
 */

/**
 * Generic streaming API handler with Server-Sent Events (SSE) support
 * @param {string} url - The API endpoint URL
 * @param {Object} requestBody - The request body to send
 * @param {Object} options - Configuration options
 * @param {string} options.method - HTTP method ('POST' or 'PUT')
 * @param {Function} options.fallbackFunction - Non-streaming function to call on fallback
 * @param {Array} options.fallbackParams - Parameters to pass to fallback function
 * @param {string} options.operationName - Name for logging (e.g., 'coach conversation message')
 * @param {Object} options.errorMessages - Custom error messages
 * @returns {AsyncGenerator} - Stream of message chunks
 */
export async function* handleStreamingApiRequest(url, requestBody, options = {}) {
  const {
    method = 'POST',
    fallbackFunction,
    fallbackParams = [],
    operationName = 'streaming request',
    errorMessages = {}
  } = options;

  console.info(`🔄 Starting streaming ${operationName}:`, {
    url: url.replace(/\/[^\/]*\/[^\/]*\/[^\/]*\//, '/[userId]/[id]/[id]/'), // Mask sensitive IDs
    bodyKeys: Object.keys(requestBody || {})
  });

  try {
    const response = await authenticatedFetch(url, {
      method,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(errorMessages.notFound || 'Resource not found');
      }
      if (response.status === 503) {
        throw new Error(errorMessages.serviceUnavailable || 'Service temporarily unavailable - request took too long');
      }
      throw new Error(`API Error: ${response.status}`);
    }

    // Check if response is streaming (SSE)
    const contentType = response.headers.get('content-type');
    console.info('🔍 Response Content-Type:', contentType);
    if (!contentType?.includes('text/plain')) {
      console.warn('⚠️ Expected SSE response but got:', contentType, '- falling back to non-streaming');
      // Fallback to non-streaming response
      const fallbackResult = await response.json();
      yield {
        type: 'fallback',
        data: fallbackResult
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No stream reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decodedChunk = decoder.decode(value, { stream: true });

        buffer += decodedChunk;
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                yield data;

                // If this is the completion message, we're done
                if (data.type === 'complete') {
                  return;
                }
              }
            } catch (parseError) {
              console.warn('⚠️ Failed to parse SSE data:', parseError, 'Line:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    console.error(`❌ Error in streaming ${operationName}:`, error);

    // Fallback to non-streaming API
    console.info('🔄 Falling back to non-streaming API');
    try {
      const fallbackResult = await fallbackFunction(...fallbackParams);
      yield {
        type: 'fallback',
        data: fallbackResult
      };
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      yield {
        type: 'error',
        error: fallbackError.message || `Failed to ${operationName.toLowerCase()}`
      };
    }
  }
}

/**
 * Common SSE chunk types for type safety and documentation
 */
export const SSE_CHUNK_TYPES = {
  CHUNK: 'chunk',
  COMPLETE: 'complete',
  FALLBACK: 'fallback',
  ERROR: 'error'
};
