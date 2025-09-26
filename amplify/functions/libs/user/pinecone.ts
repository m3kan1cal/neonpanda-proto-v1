/**
 * Pinecone integration for user memories
 * Handles storage and retrieval of user memories for semantic search
 */

import { storePineconeContext, deletePineconeContext } from '../api-helpers';
import { UserMemory } from '../memory/types';

/**
 * Store user memory in Pinecone for semantic search
 * Follows the same pattern as workout and coach creator summaries
 */
export const storeMemoryInPinecone = async (memory: UserMemory): Promise<{ success: boolean; recordId?: string; error?: string }> => {
  try {
    console.info('🧠 Storing memory in Pinecone:', {
      memoryId: memory.memoryId,
      userId: memory.userId,
      coachId: memory.coachId,
      type: memory.memoryType,
      importance: memory.metadata.importance,
      contentLength: memory.content.length
    });

    const metadata = {
      record_type: 'user_memory',
      memory_id: memory.memoryId,
      memory_type: memory.memoryType,
      importance: memory.metadata.importance,
      coach_id: memory.coachId,
      created_at: memory.metadata.createdAt.toISOString(),
      usage_count: memory.metadata.usageCount,
      tags: memory.metadata.tags || [],

      // Additional semantic search categories for better matching
      topics: [`memory_${memory.memoryType}`, 'user_context', 'personalization'],

      // Add context for retrieval
      is_global: !memory.coachId || memory.coachId === null, // True if memory applies to all coaches
      logged_at: new Date().toISOString()
    };

    // Enhance searchable content by including tags for better semantic matching
    const enhancedContent = [
      memory.content,
      ...(memory.metadata.tags || []).map(tag => `tag: ${tag}`)
    ].join(' ');

    // Use centralized storage function with enhanced content
    const result = await storePineconeContext(memory.userId, enhancedContent, metadata);

    console.info('✅ Successfully stored memory in Pinecone:', {
      memoryId: memory.memoryId,
      recordId: result.recordId,
      namespace: result.namespace,
      importance: memory.metadata.importance,
      contentLength: memory.content.length,
      enhancedContentLength: enhancedContent.length,
      tagCount: memory.metadata.tags?.length || 0,
      tags: memory.metadata.tags || []
    });

    return result;

  } catch (error) {
    console.error('❌ Failed to store memory in Pinecone:', error);

    // Don't throw error to avoid breaking the memory creation process
    // Pinecone storage is for semantic search enhancement, not critical for core functionality
    console.warn('Memory creation will continue despite Pinecone storage failure');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Delete memory from Pinecone when deleted from DynamoDB
 * Follows the same pattern as workout deletion
 */
export const deleteMemoryFromPinecone = async (
  userId: string,
  memoryId: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    console.info('🗑️ Deleting memory from Pinecone:', {
      userId,
      memoryId
    });

    const result = await deletePineconeContext(userId, {
      memory_id: memoryId,
      record_type: 'user_memory'
    });

    if (result.success) {
      console.info('✅ Successfully deleted memory from Pinecone:', {
        userId,
        memoryId,
        deletedCount: result.deletedCount
      });
    } else {
      console.warn('⚠️ Failed to delete memory from Pinecone:', {
        userId,
        memoryId,
        error: result.error
      });
    }

    return result;

  } catch (error) {
    console.error('❌ Failed to delete memory from Pinecone:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Future functions can be added here:
 * - querySemanticMemories() - moved to api-helpers.ts for centralization
 * - updateMemoryInPinecone() - for when memory content changes
 * - getMemoryUsageAnalytics() - for memory usage patterns
 */
