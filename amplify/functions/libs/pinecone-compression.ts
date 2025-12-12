/**
 * Pinecone Compression Utilities
 *
 * This module provides AI-powered compression for Pinecone metadata that exceeds size limits.
 * Instead of truncating content, we use Claude Sonnet 4.5 to intelligently summarize
 * while preserving semantic meaning and searchability.
 */

import { callBedrockApi, MODEL_IDS } from "./api-helpers";

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
 * Compress content while preserving semantic meaning and searchability
 *
 * Uses AI (Claude Sonnet 4.5) to intelligently compress content.
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

  console.info("🤖 AI compressing content for Pinecone:", {
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

  try {
    const compressedContent = (await callBedrockApi(
      compressionPrompt,
      "", // No user content, it's in the prompt
      MODEL_IDS.CLAUDE_SONNET_4_FULL, // Sonnet 4.5
    )) as string;

    const finalSize = Buffer.byteLength(compressedContent, "utf8");
    const compressionAchieved = ((currentSize - finalSize) / currentSize) * 100;

    console.info("✅ AI compression completed:", {
      contentType,
      originalSize: currentSize,
      compressedSize: finalSize,
      compressionAchieved: Math.round(compressionAchieved) + "%",
      originalChars: content.length,
      compressedChars: compressedContent.length,
      withinTarget: finalSize <= targetSize,
    });

    // If still too large, do emergency truncation as last resort
    if (finalSize > targetSize) {
      const truncateAt = Math.floor(
        compressedContent.length * (targetSize / finalSize) * 0.95,
      );
      console.warn("⚠️ AI compression still too large, applying truncation:", {
        compressedSize: finalSize,
        targetSize,
        truncatingTo: truncateAt,
      });
      return compressedContent.substring(0, truncateAt) + "...";
    }

    return compressedContent;
  } catch (error) {
    console.error("❌ AI compression failed:", error);
    // Fallback to simple truncation
    const truncateAt = Math.floor(content.length * (targetSize / currentSize));
    console.warn("⚠️ Falling back to truncation due to AI error:", {
      truncatingTo: truncateAt,
    });
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

  console.info("📊 Pinecone storage size check:", {
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
        console.warn(
          "⚠️ Size error despite estimate being under limit, compressing...",
          {
            estimatedSize: initialSize,
            actualError: error.message,
          },
        );
        // Fall through to compression
      } else {
        // Different error, re-throw
        throw error;
      }
    }
  }

  // Size limit exceeded or size error caught - compress and retry
  console.info("🔄 Content exceeds Pinecone limit, using AI compression...", {
    contentType,
    originalSize: initialSize,
    overageBytes: initialSize - PINECONE_METADATA_LIMIT,
  });

  const compressedContent = await compressContent(
    content,
    contentType,
    initialSize,
  );

  const compressedSize = calculateMetadataSize(compressedContent, metadata);
  console.info("🎯 Retrying storage with compressed content:", {
    contentType,
    originalSize: initialSize,
    compressedSize,
    reduction:
      Math.round(((initialSize - compressedSize) / initialSize) * 100) + "%",
  });

  return await storeFn(compressedContent);
}
