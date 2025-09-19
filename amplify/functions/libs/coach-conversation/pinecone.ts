/**
 * Coach Conversation Pinecone Integration
 *
 * This module handles storing and deleting coach conversation-related data in Pinecone
 * for semantic search and coach memory capabilities.
 */

import { deletePineconeContext } from '../api-helpers';

/**
 * Delete conversation summary from Pinecone when conversation is deleted
 *
 * @param userId - The user ID for namespace targeting
 * @param conversationId - The conversation ID to delete from Pinecone
 * @returns Promise with deletion result
 */
export const deleteConversationSummaryFromPinecone = async (
  userId: string,
  conversationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.info('🗑️ Deleting conversation summary from Pinecone:', {
      userId,
      conversationId
    });

    // Use centralized deletion function with conversation-specific filter
    const result = await deletePineconeContext(userId, {
      record_type: 'conversation_summary',
      conversation_id: conversationId
    });

    if (result.success) {
      console.info('✅ Successfully deleted conversation summary from Pinecone:', {
        userId,
        conversationId,
        deletedRecords: result.deletedCount
      });
    } else {
      console.warn('⚠️ Failed to delete conversation summary from Pinecone:', {
        userId,
        conversationId,
        error: result.error
      });
    }

    return {
      success: result.success,
      error: result.error
    };

  } catch (error) {
    console.error('❌ Failed to delete conversation summary from Pinecone:', error);

    // Don't throw error to avoid breaking the conversation deletion process
    // Pinecone cleanup failure shouldn't prevent DynamoDB deletion
    console.warn('Conversation deletion will continue despite Pinecone cleanup failure');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
