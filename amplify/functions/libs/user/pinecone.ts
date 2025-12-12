/**
 * Pinecone integration for user memories
 * Handles storage and retrieval of user memories for semantic search
 */

import { storePineconeContext, deletePineconeContext } from "../api-helpers";
import { storeWithAutoCompression } from "../pinecone-compression";
import { filterNullish } from "../object-utils";
import { UserMemory } from "../memory/types";

/**
 * Store user memory in Pinecone for semantic search
 * Follows the same pattern as workout and coach creator summaries
 */
export const storeMemoryInPinecone = async (
  memory: UserMemory,
): Promise<{ success: boolean; recordId?: string; error?: string }> => {
  try {
    console.info("🧠 Storing memory in Pinecone:", {
      memoryId: memory.memoryId,
      userId: memory.userId,
      coachId: memory.coachId,
      type: memory.memoryType,
      importance: memory.metadata.importance,
      contentLength: memory.content.length,
    });

    const baseMetadata = {
      recordType: "user_memory",
      memoryId: memory.memoryId,
      memoryType: memory.memoryType,
      importance: memory.metadata.importance,
      createdAt: memory.metadata.createdAt.toISOString(),
      usageCount: memory.metadata.usageCount,
      tags: memory.metadata.tags || [],
      topics: [
        `memory_${memory.memoryType}`,
        "user_context",
        "personalization",
      ],
      isGlobal: !memory.coachId || memory.coachId === null,
      loggedAt: new Date().toISOString(),
    };

    // Optional fields that may be null/undefined
    const optionalFields = filterNullish({
      coachId: memory.coachId,
    });

    const metadata = {
      ...baseMetadata,
      ...optionalFields,
    };

    // Enhance searchable content by including tags for better semantic matching
    const enhancedContent = [
      memory.content,
      ...(memory.metadata.tags || []).map((tag) => `tag: ${tag}`),
    ].join(" ");

    // Store with automatic AI compression if size limit exceeded
    const result = await storeWithAutoCompression(
      (content) => storePineconeContext(memory.userId, content, metadata),
      enhancedContent,
      metadata,
      "user memory",
    );

    console.info("✅ Successfully stored memory in Pinecone:", {
      memoryId: memory.memoryId,
      recordId: result.recordId,
      namespace: result.namespace,
      importance: memory.metadata.importance,
      contentLength: memory.content.length,
      enhancedContentLength: enhancedContent.length,
      tagCount: memory.metadata.tags?.length || 0,
      tags: memory.metadata.tags || [],
    });

    return result;
  } catch (error) {
    console.error("❌ Failed to store memory in Pinecone:", error);

    // Don't throw error to avoid breaking the memory creation process
    // Pinecone storage is for semantic search enhancement, not critical for core functionality
    console.warn(
      "Memory creation will continue despite Pinecone storage failure",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Delete memory from Pinecone when deleted from DynamoDB
 * Follows the same pattern as workout deletion
 */
export const deleteMemoryFromPinecone = async (
  userId: string,
  memoryId: string,
): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    console.info("🗑️ Deleting memory from Pinecone:", {
      userId,
      memoryId,
    });

    const result = await deletePineconeContext(userId, {
      memoryId: memoryId,
      recordType: "user_memory",
    });

    if (result.success) {
      console.info("✅ Successfully deleted memory from Pinecone:", {
        userId,
        memoryId,
        deletedCount: result.deletedCount,
      });
    } else {
      console.warn("⚠️ Failed to delete memory from Pinecone:", {
        userId,
        memoryId,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to delete memory from Pinecone:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Future functions can be added here:
 * - querySemanticMemories() - moved to api-helpers.ts for centralization
 * - updateMemoryInPinecone() - for when memory content changes
 * - getMemoryUsageAnalytics() - for memory usage patterns
 */
