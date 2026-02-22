/**
 * Coach Conversation Pinecone Integration
 *
 * This module handles storing and deleting coach conversation-related data in Pinecone
 * for semantic search and coach memory capabilities.
 */

import { deletePineconeContext, storePineconeContext } from "../api-helpers";
import {
  storeWithAutoCompression,
  deterministicCompressSummary,
  calculateMetadataSize,
  PINECONE_METADATA_LIMIT,
} from "../pinecone-compression";
import { CoachConversationSummary } from "./types";
import { deriveCompactSummary } from "./summary";
import { logger } from "../logger";

/**
 * Store coach conversation summary in Pinecone for semantic search.
 * Uses a programmatically derived compact summary to minimize token usage.
 * Applies deterministic compression if needed, with AI fallback for extreme cases.
 */
export async function storeCoachConversationSummaryInPinecone(
  summary: CoachConversationSummary,
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    // Derive compact summary programmatically (replaces AI-generated compact_summary)
    const compactData = deriveCompactSummary(summary);

    logger.info("📊 Preparing summary for Pinecone (derived compact)");

    const buildSearchableContent = (data: typeof compactData) =>
      `
${data.narrative || ""}

Goals: ${data.current_goals?.join(", ") || ""}
Recent Progress: ${data.recent_progress?.join(", ") || ""}
Training Preferences: ${data.training_preferences?.join(", ") || ""}
Schedule Constraints: ${data.schedule_constraints?.join(", ") || ""}
Key Insights: ${data.key_insights?.join(", ") || ""}
Important Context: ${data.important_context?.join(", ") || ""}
Conversation Tags: ${data.conversation_tags?.join(", ") || "none"}
    `.trim();

    const searchableContent = buildSearchableContent(compactData);

    const metadata = {
      recordType: "conversation_summary",
      type: "conversation_summary",
      coachId: summary.coachId,
      conversationId: summary.conversationId,
      summaryId: summary.summaryId,
      createdAt: summary.metadata.createdAt.toISOString(),
      messageCount: summary.metadata.messageRange.totalMessages,
      triggerReason: summary.metadata.triggerReason,
      confidence: summary.metadata.confidence,
      hasGoals: summary.structuredData.current_goals.length > 0,
      hasProgress: summary.structuredData.recent_progress.length > 0,
      hasInsights: summary.structuredData.key_insights.length > 0,
      hasTrainingPreferences:
        summary.structuredData.training_preferences.length > 0,
    };

    const initialSize = calculateMetadataSize(searchableContent, metadata);
    let finalContent = searchableContent;

    logger.info("📏 Initial content size check:", {
      initialSize,
      limit: PINECONE_METADATA_LIMIT,
      utilizationPercent:
        Math.round((initialSize / PINECONE_METADATA_LIMIT) * 100) + "%",
      needsCompression: initialSize > PINECONE_METADATA_LIMIT,
    });

    if (initialSize > PINECONE_METADATA_LIMIT) {
      logger.info("🔧 Applying deterministic compression...");
      const compressedData = deterministicCompressSummary(
        compactData,
        PINECONE_METADATA_LIMIT * 0.8,
      );

      finalContent = buildSearchableContent(
        compressedData as typeof compactData,
      );

      const compressedSize = calculateMetadataSize(finalContent, metadata);
      logger.info("✅ Deterministic compression applied:", {
        originalSize: initialSize,
        compressedSize,
        reduction:
          Math.round(((initialSize - compressedSize) / initialSize) * 100) +
          "%",
        withinLimit: compressedSize <= PINECONE_METADATA_LIMIT,
      });

      if (compressedSize > PINECONE_METADATA_LIMIT) {
        logger.warn(
          "⚠️ Deterministic compression insufficient, falling back to AI compression",
        );
        await storeWithAutoCompression(
          (content) => storePineconeContext(summary.userId, content, metadata),
          finalContent,
          metadata,
          "conversation summary",
        );
      } else {
        await storePineconeContext(summary.userId, finalContent, metadata);
      }
    } else {
      await storePineconeContext(summary.userId, finalContent, metadata);
    }

    logger.info("✅ Conversation summary stored in Pinecone:", {
      pineconeId: summary.summaryId,
      summaryId: summary.summaryId,
      contentLength: finalContent.length,
      confidence: summary.metadata.confidence,
    });

    return { success: true, recordId: summary.summaryId };
  } catch (error) {
    logger.error("❌ Error storing conversation summary in Pinecone:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete conversation summary from Pinecone when conversation is deleted
 *
 * @param userId - The user ID for namespace targeting
 * @param conversationId - The conversation ID to delete from Pinecone
 * @returns Promise with deletion result
 */
export const deleteConversationSummaryFromPinecone = async (
  userId: string,
  conversationId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    logger.info("🗑️ Deleting conversation summary from Pinecone:", {
      userId,
      conversationId,
    });

    // Use centralized deletion function with conversation-specific filter
    const result = await deletePineconeContext(userId, {
      recordType: "conversation_summary",
      conversationId: conversationId,
    });

    if (result.success) {
      logger.info(
        "✅ Successfully deleted conversation summary from Pinecone:",
        {
          userId,
          conversationId,
          deletedRecords: result.deletedCount,
        },
      );
    } else {
      logger.warn("⚠️ Failed to delete conversation summary from Pinecone:", {
        userId,
        conversationId,
        error: result.error,
      });
    }

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    logger.error(
      "❌ Failed to delete conversation summary from Pinecone:",
      error,
    );

    // Don't throw error to avoid breaking the conversation deletion process
    // Pinecone cleanup failure shouldn't prevent DynamoDB deletion
    logger.warn(
      "Conversation deletion will continue despite Pinecone cleanup failure",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
