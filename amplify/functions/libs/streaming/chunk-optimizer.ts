/**
 * Streaming chunk optimization utilities
 * Handles intelligent buffering to work around Lambda Function URL limitations
 */

// Optimal buffer sizes for Lambda Function URL streaming
export const STREAMING_BUFFER_CONFIG = {
  /** Minimum buffer size before considering flush triggers (chars) */
  MIN_BUFFER_SIZE: 30,
  /** Maximum buffer size before forcing flush (chars) */
  MAX_BUFFER_SIZE: 60,
  /** Punctuation marks that trigger immediate flush when above min size */
  FLUSH_TRIGGERS: ['.', '!', '?', ':', ';', ','] as const,
} as const;

export interface ChunkOptimizerOptions {
  /** Minimum buffer size before forcing flush (default: 50) */
  minBufferSize?: number;
  /** Maximum buffer size before forcing flush (default: 75) */
  maxBufferSize?: number;
  /** Punctuation marks that trigger immediate flush */
  flushTriggers?: string[];
}

export interface OptimizedChunk {
  content: string;
  shouldFlush: boolean;
  bufferSize: number;
}

/**
 * Intelligent chunk buffer that optimizes for Lambda Function URL streaming
 *
 * @param chunk - New chunk content to add
 * @param currentBuffer - Current buffer content
 * @param options - Optimization options
 * @returns Object with content and flush decision
 */
export function optimizeStreamingChunk(
  chunk: string,
  currentBuffer: string,
  options: ChunkOptimizerOptions = {}
): OptimizedChunk {
  const {
    minBufferSize = STREAMING_BUFFER_CONFIG.MIN_BUFFER_SIZE,
    maxBufferSize = STREAMING_BUFFER_CONFIG.MAX_BUFFER_SIZE,
    flushTriggers = [...STREAMING_BUFFER_CONFIG.FLUSH_TRIGGERS]
  } = options;

  const newBuffer = currentBuffer + chunk;
  const bufferSize = newBuffer.length;

  // Force flush if we hit max buffer size
  if (bufferSize >= maxBufferSize) {
    return {
      content: newBuffer,
      shouldFlush: true,
      bufferSize
    };
  }

  // Check for flush triggers if we're above minimum size
  if (bufferSize >= minBufferSize) {
    const hasFlushTrigger = flushTriggers.some(trigger => chunk.includes(trigger));

    if (hasFlushTrigger) {
      return {
        content: newBuffer,
        shouldFlush: true,
        bufferSize
      };
    }
  }

  // Continue buffering
  return {
    content: newBuffer,
    shouldFlush: false,
    bufferSize
  };
}

/**
 * Generator function that yields optimized chunks from a stream
 *
 * @param sourceStream - Async iterable of raw chunks
 * @param options - Optimization options
 * @yields Optimized chunks ready for streaming
 */
export async function* optimizeChunkStream(
  sourceStream: AsyncIterable<string>,
  options: ChunkOptimizerOptions = {}
): AsyncGenerator<string, void, unknown> {
  let buffer = "";
  let chunkIndex = 0;

  for await (const rawChunk of sourceStream) {
    chunkIndex++;

    const result = optimizeStreamingChunk(rawChunk, buffer, options);

    if (result.shouldFlush) {
      yield result.content;
      console.info(
        `📡 Optimized chunk #${chunkIndex} flushed: "${result.content.substring(0, 30)}..." (${result.bufferSize} chars)`
      );
      buffer = "";
    } else {
      buffer = result.content;
    }
  }

  // Yield any remaining buffer content
  if (buffer.length > 0) {
    yield buffer;
    console.info(`📡 Final buffer flushed: "${buffer.substring(0, 30)}..." (${buffer.length} chars)`);
  }
}

/**
 * Simple wrapper for common streaming optimization use case
 *
 * @param sourceStream - Raw chunk stream from Bedrock
 * @returns Optimized chunk stream with default buffer configuration
 */
export function createOptimizedChunkStream(sourceStream: AsyncIterable<string>) {
  return optimizeChunkStream(sourceStream, {
    minBufferSize: STREAMING_BUFFER_CONFIG.MIN_BUFFER_SIZE,
    maxBufferSize: STREAMING_BUFFER_CONFIG.MAX_BUFFER_SIZE,
    flushTriggers: [...STREAMING_BUFFER_CONFIG.FLUSH_TRIGGERS]
  });
}
