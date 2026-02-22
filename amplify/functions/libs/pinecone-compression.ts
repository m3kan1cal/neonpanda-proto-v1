/**
 * Pinecone Compression Utilities
 *
 * This module provides AI-powered compression for Pinecone metadata that exceeds size limits.
 * Instead of truncating content, we use Claude Sonnet 4.5 to intelligently summarize
 * while preserving semantic meaning and searchability.
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "./api-helpers";
import { logger } from "./logger";

/**
 * Pinecone metadata size limit (40KB)
 */
export const PINECONE_METADATA_LIMIT = 40960;

/**
 * Default target size ratio for compression (80% of limit)
 * Leaves 20% headroom for metadata overhead and safety margin
 */
export const DEFAULT_TARGET_SIZE_RATIO = 0.8;

/**
 * Safety margin for character count estimation (90%)
 * Accounts for byte-to-character encoding differences (especially for non-ASCII characters)
 * Applied after initial compression ratio calculation to ensure we don't overshoot
 */
export const COMPRESSION_SAFETY_MARGIN = 0.9;

/**
 * Truncation safety margin (95%)
 * Applied when content must be truncated (post-AI-compression or fallback scenarios)
 * Extra 5% buffer ensures we stay under the limit even with encoding variations
 */
export const TRUNCATION_SAFETY_MARGIN = 0.95;

/**
 * Emergency fallback ratio (80%)
 * Used as last resort when normal truncation logic fails
 * Provides significant buffer to ensure content fits
 */
export const EMERGENCY_FALLBACK_RATIO = 0.8;

/**
 * Calculate approximate metadata size in bytes
 */
export function calculateMetadataSize(
  content: string,
  metadata: Record<string, any>,
): number {
  const metadataJson = JSON.stringify(metadata);
  return (
    Buffer.byteLength(content, "utf8") + Buffer.byteLength(metadataJson, "utf8")
  );
}

/**
 * Retry delays for throttling errors (in milliseconds)
 * Aggressive exponential backoff for Bedrock token throttling: 30s, 90s, 180s, 300s = 600s total
 * This allows token bucket to refill after large summary generation calls
 */
const THROTTLE_RETRY_DELAYS = [30000, 90000, 180000, 300000];

/**
 * Helper to wait for specified milliseconds
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deterministic compression for conversation summaries
 * Intelligently truncates arrays and text while preserving important information
 * This is used as a fast fallback when AI compression isn't available or fails
 *
 * @param summaryData - The compact summary data object
 * @param targetSize - Target size in bytes
 * @returns Compressed summary data
 */
export function deterministicCompressSummary(
  summaryData: any,
  targetSize: number = PINECONE_METADATA_LIMIT * DEFAULT_TARGET_SIZE_RATIO,
): any {
  logger.info("📐 Applying deterministic compression:", {
    targetSize,
    originalSize: Buffer.byteLength(JSON.stringify(summaryData), "utf8"),
  });

  const compressed = { ...summaryData };

  // Priority order: narrative > goals > emotional_state > insights > progress
  // Truncate arrays to keep only most important items
  const truncateArray = (arr: any[], maxItems: number): any[] => {
    if (!Array.isArray(arr)) return arr;
    return arr.slice(0, maxItems);
  };

  // Keep narrative but cap at reasonable length
  if (compressed.narrative && typeof compressed.narrative === "string") {
    if (compressed.narrative.length > 500) {
      compressed.narrative = compressed.narrative.substring(0, 497) + "...";
    }
  }

  // Truncate arrays to top 3 items
  if (compressed.current_goals) {
    compressed.current_goals = truncateArray(compressed.current_goals, 3);
  }
  if (compressed.recent_progress) {
    compressed.recent_progress = truncateArray(compressed.recent_progress, 3);
  }
  if (compressed.key_insights) {
    compressed.key_insights = truncateArray(compressed.key_insights, 3);
  }
  if (compressed.important_context) {
    compressed.important_context = truncateArray(
      compressed.important_context,
      3,
    );
  }
  if (compressed.conversation_tags) {
    compressed.conversation_tags = truncateArray(
      compressed.conversation_tags,
      5,
    );
  }

  // Truncate flat v2 fields
  if (compressed.training_preferences) {
    compressed.training_preferences = truncateArray(
      compressed.training_preferences,
      4,
    );
  }
  if (compressed.schedule_constraints) {
    compressed.schedule_constraints = truncateArray(
      compressed.schedule_constraints,
      2,
    );
  }

  // Legacy v1 nested preference arrays (backward compat)
  if (compressed.preferences) {
    if (compressed.preferences.training_preferences) {
      compressed.preferences.training_preferences = truncateArray(
        compressed.preferences.training_preferences,
        3,
      );
    }
    if (compressed.preferences.schedule_constraints) {
      compressed.preferences.schedule_constraints = truncateArray(
        compressed.preferences.schedule_constraints,
        2,
      );
    }
  }

  if (compressed.methodology_preferences) {
    if (compressed.methodology_preferences.mentioned_methodologies) {
      compressed.methodology_preferences.mentioned_methodologies =
        truncateArray(
          compressed.methodology_preferences.mentioned_methodologies,
          3,
        );
    }
    if (compressed.methodology_preferences.preferred_approaches) {
      compressed.methodology_preferences.preferred_approaches = truncateArray(
        compressed.methodology_preferences.preferred_approaches,
        2,
      );
    }
    if (compressed.methodology_preferences.methodology_questions) {
      compressed.methodology_preferences.methodology_questions = truncateArray(
        compressed.methodology_preferences.methodology_questions,
        2,
      );
    }
  }

  const compressedSize = Buffer.byteLength(JSON.stringify(compressed), "utf8");
  logger.info("✅ Deterministic compression completed:", {
    originalSize: Buffer.byteLength(JSON.stringify(summaryData), "utf8"),
    compressedSize,
    targetSize,
    withinTarget: compressedSize <= targetSize,
    reduction:
      Math.round(
        ((Buffer.byteLength(JSON.stringify(summaryData), "utf8") -
          compressedSize) /
          Buffer.byteLength(JSON.stringify(summaryData), "utf8")) *
          100,
      ) + "%",
  });

  return compressed;
}

/**
 * Compress content while preserving semantic meaning and searchability
 *
 * Uses AI (Claude Sonnet 4.5) to intelligently compress content.
 * Implements retry logic with exponential backoff for throttling errors.
 *
 * @param content - The original content that needs compression
 * @param contentType - Type of content being compressed (for context)
 * @param currentSize - Current size in bytes
 * @param targetSize - Target size in bytes (default: 80% of limit to leave room for metadata)
 * @returns Compressed content that maintains semantic meaning
 */
export async function compressContent(
  content: string,
  contentType: string,
  currentSize: number,
  targetSize: number = PINECONE_METADATA_LIMIT * DEFAULT_TARGET_SIZE_RATIO,
): Promise<string> {
  const compressionRatio = targetSize / currentSize;
  const targetChars = Math.floor(
    content.length * compressionRatio * COMPRESSION_SAFETY_MARGIN,
  );

  logger.info("🤖 AI compressing content for Pinecone:", {
    contentType,
    originalSize: currentSize,
    targetSize,
    compressionRatio: Math.round(compressionRatio * 100) + "%",
    originalChars: content.length,
    targetChars,
  });

  const compressionPrompt = `You are a semantic compression expert. Your task is to compress the following ${contentType} content to approximately ${targetChars} characters while preserving ALL key information for semantic search.

CRITICAL REQUIREMENTS:
1. Preserve all important keywords, concepts, and entities
2. Maintain searchability - keep terms people would search for
3. Remove redundancy and verbose explanations
4. Use concise phrasing without losing meaning
5. Prioritize facts over narrative flow
6. Keep specific details (names, numbers, dates, etc.)
7. Target length: ~${targetChars} characters (strict limit)

Original content to compress:
${content}

Return ONLY the compressed content, no explanations or meta-commentary.`;

  // Retry logic for throttling errors with exponential backoff
  let lastError: any;
  for (let attempt = 0; attempt <= THROTTLE_RETRY_DELAYS.length; attempt++) {
    try {
      const compressedContent = (await callBedrockApi(
        compressionPrompt,
        "", // No user content, it's in the prompt
        MODEL_IDS.PLANNER_MODEL_FULL, // Sonnet 4.5
        {
          temperature: TEMPERATURE_PRESETS.BALANCED,
        },
      )) as string;

      const finalSize = Buffer.byteLength(compressedContent, "utf8");
      const compressionAchieved =
        ((currentSize - finalSize) / currentSize) * 100;

      logger.info("✅ AI compression completed:", {
        contentType,
        originalSize: currentSize,
        compressedSize: finalSize,
        compressionAchieved: Math.round(compressionAchieved) + "%",
        originalChars: content.length,
        compressedChars: compressedContent.length,
        withinTarget: finalSize <= targetSize,
        attemptsNeeded: attempt + 1,
      });

      // If still too large, do emergency truncation as last resort
      if (finalSize > targetSize) {
        const truncateAt = Math.floor(
          compressedContent.length *
            (targetSize / finalSize) *
            TRUNCATION_SAFETY_MARGIN,
        );
        logger.warn("⚠️ AI compression still too large, applying truncation:", {
          compressedSize: finalSize,
          targetSize,
          truncatingTo: truncateAt,
        });
        return compressedContent.substring(0, truncateAt) + "...";
      }

      return compressedContent;
    } catch (error: any) {
      lastError = error;

      // Check if it's a throttling error that we should retry
      const isThrottling =
        error?.name === "ThrottlingException" ||
        error?.message?.includes("ThrottlingException") ||
        error?.message?.includes("Too many tokens") ||
        error?.message?.includes("throttl") ||
        error?.$metadata?.httpStatusCode === 429;

      if (isThrottling && attempt < THROTTLE_RETRY_DELAYS.length) {
        const delayMs = THROTTLE_RETRY_DELAYS[attempt];
        logger.warn(
          `⚠️ Bedrock API throttled (attempt ${attempt + 1}/${THROTTLE_RETRY_DELAYS.length + 1}) - waiting ${delayMs}ms before retry`,
          {
            errorName: error.name,
            errorMessage: error.message,
            statusCode: error.$metadata?.httpStatusCode,
            nextRetryIn: `${delayMs}ms`,
          },
        );
        await wait(delayMs);
        continue; // Retry
      }

      // Either not a throttling error, or we've exhausted retries
      if (isThrottling) {
        logger.error(
          "❌ Bedrock API still throttled after all retries - falling back to truncation",
          {
            totalAttempts: attempt + 1,
            totalWaitTime: THROTTLE_RETRY_DELAYS.reduce(
              (sum, delay) => sum + delay,
              0,
            ),
          },
        );
      }

      // Break out of retry loop to handle error below
      break;
    }
  }

  // If we get here, all attempts failed
  logger.error("❌ AI compression failed after all attempts:", lastError);

  // Check if final error was throttling
  const wasThrottling =
    lastError?.name === "ThrottlingException" ||
    lastError?.message?.includes("ThrottlingException") ||
    lastError?.message?.includes("Too many tokens") ||
    lastError?.message?.includes("throttl") ||
    lastError?.$metadata?.httpStatusCode === 429;

  if (wasThrottling) {
    // Use conservative truncation for throttling scenarios
    const conservativeTruncate = Math.floor(
      (targetSize / currentSize) * content.length * 0.8, // Extra conservative (80% of target)
    );
    logger.warn(
      "⚠️ Falling back to conservative truncation due to persistent throttling",
      {
        targetChars: conservativeTruncate,
      },
    );
    return content.substring(0, conservativeTruncate) + "...";
  } else {
    // Non-throttling error - use standard fallback truncation
    const ratio = Math.min(1, targetSize / currentSize);
    const truncateAt = Math.floor(
      content.length * ratio * TRUNCATION_SAFETY_MARGIN,
    );
    logger.warn(
      "⚠️ Falling back to truncation due to non-throttling AI error:",
      {
        currentSize,
        targetSize,
        ratio,
        truncatingTo: truncateAt,
        willTruncate: truncateAt < content.length,
        errorType: lastError?.name || "unknown",
      },
    );

    if (truncateAt >= content.length) {
      logger.error("❌ Truncation calculation error - would not reduce size", {
        contentLength: content.length,
        calculatedTruncateAt: truncateAt,
        currentSize,
        targetSize,
      });
      // Emergency fallback: use emergency ratio of target size
      const emergencyTruncate = Math.floor(
        (targetSize / Buffer.byteLength(content, "utf8")) *
          content.length *
          EMERGENCY_FALLBACK_RATIO,
      );
      return content.substring(0, emergencyTruncate) + "...";
    }

    return content.substring(0, truncateAt) + "...";
  }
}

/**
 * Store content in Pinecone with automatic AI compression if size limit exceeded
 *
 * This is a wrapper around storePineconeContext that adds intelligent retry logic:
 * 1. Try to store original content
 * 2. If size error occurs, use AI to compress content
 * 3. Retry with compressed content
 *
 * @param storeFn - Function that attempts to store in Pinecone
 * @param content - Content to store
 * @param metadata - Metadata to store
 * @param contentType - Type of content (for logging and AI context)
 * @returns Result of storage operation
 */
export async function storeWithAutoCompression<T>(
  storeFn: (content: string) => Promise<T>,
  content: string,
  metadata: Record<string, any>,
  contentType: string,
): Promise<T> {
  // Calculate initial size
  const initialSize = calculateMetadataSize(content, metadata);
  const utilizationPercent = Math.round(
    (initialSize / PINECONE_METADATA_LIMIT) * 100,
  );

  logger.info("📊 Pinecone storage size check:", {
    contentType,
    estimatedSize: initialSize,
    limitBytes: PINECONE_METADATA_LIMIT,
    utilizationPercent: utilizationPercent + "%",
    willAttemptCompression: initialSize > PINECONE_METADATA_LIMIT,
  });

  // If within limit, store directly
  if (initialSize <= PINECONE_METADATA_LIMIT) {
    try {
      return await storeFn(content);
    } catch (error: any) {
      // Check if it's a size error despite our estimate
      if (
        error?.message?.includes("Metadata size") ||
        error?.message?.includes("exceeds the limit")
      ) {
        logger.warn(
          "⚠️ Size error despite estimate being under limit, will attempt compression...",
          {
            estimatedSize: initialSize,
            actualError: error.message,
          },
        );
        // Fall through to compression (which has its own retry logic for throttling)
      } else {
        // Different error (including throttling during storage), re-throw
        // Note: We only handle throttling during compression, not during storage itself
        throw error;
      }
    }
  }

  // Size limit exceeded or size error caught - compress and retry
  // IMPORTANT: Use actual content size, not estimate, for compression calculation
  const actualContentSize = Buffer.byteLength(content, "utf8");
  const actualMetadataSize = Buffer.byteLength(
    JSON.stringify(metadata),
    "utf8",
  );
  const actualTotalSize = actualContentSize + actualMetadataSize;

  logger.info("🔄 Content exceeds Pinecone limit, using AI compression...", {
    contentType,
    estimatedSize: initialSize,
    actualSize: actualTotalSize,
    sizeDifference: actualTotalSize - initialSize,
    overageBytes: actualTotalSize - PINECONE_METADATA_LIMIT,
  });

  // Attempt AI compression (will fall back to truncation on throttling errors)
  const compressedContent = await compressContent(
    content,
    contentType,
    actualTotalSize, // Use actual size, not estimate
  );

  const compressedSize = calculateMetadataSize(compressedContent, metadata);
  logger.info("🎯 Retrying storage with compressed content:", {
    contentType,
    originalSize: actualTotalSize,
    compressedSize,
    reduction:
      Math.round(((actualTotalSize - compressedSize) / actualTotalSize) * 100) +
      "%",
  });

  return await storeFn(compressedContent);
}
