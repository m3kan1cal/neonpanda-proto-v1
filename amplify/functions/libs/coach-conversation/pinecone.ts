/**
 * Coach Conversation Pinecone Integration
 *
 * This module handles storing and deleting coach conversation-related data in Pinecone
 * for semantic search and coach memory capabilities.
 */

import { deletePineconeContext, storePineconeContext } from '../api-helpers';
import { CoachConversationSummary } from './types';

/**
 * Store coach conversation summary in Pinecone for semantic search
 */
export async function storeCoachConversationSummaryInPinecone(
  summary: CoachConversationSummary
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    // Create searchable content combining narrative and key structured data
    const searchableContent = `
${summary.narrative}

Goals: ${summary.structuredData.current_goals.join(", ")}
Recent Progress: ${summary.structuredData.recent_progress.join(", ")}
Communication Style: ${summary.structuredData.preferences.communication_style}
Training Preferences: ${summary.structuredData.preferences.training_preferences.join(", ")}
Methodology Preferences: ${summary.structuredData.methodology_preferences.mentioned_methodologies.join(", ")} | Preferred Approaches: ${summary.structuredData.methodology_preferences.preferred_approaches.join(", ")} | Questions: ${summary.structuredData.methodology_preferences.methodology_questions.join(", ")}
Emotional State: ${summary.structuredData.emotional_state.current_mood} (motivation: ${summary.structuredData.emotional_state.motivation_level})
Key Insights: ${summary.structuredData.key_insights.join(", ")}
Important Context: ${summary.structuredData.important_context.join(", ")}
    `.trim();

    // Create metadata for Pinecone
    const metadata = {
      recordType: "conversation_summary",
      type: "conversation_summary", // Keep for backwards compatibility
      // userId not needed here - storePineconeContext adds userId automatically
      coachId: summary.coachId,
      conversationId: summary.conversationId,
      summaryId: summary.summaryId,
      createdAt: summary.metadata.createdAt.toISOString(),
      messageCount: summary.metadata.messageRange.totalMessages,
      triggerReason: summary.metadata.triggerReason,
      confidence: summary.metadata.confidence,
      // Add structured data for filtering
      hasGoals: summary.structuredData.current_goals.length > 0,
      hasProgress: summary.structuredData.recent_progress.length > 0,
      hasEmotionalState: !!summary.structuredData.emotional_state.current_mood,
      hasInsights: summary.structuredData.key_insights.length > 0,
      hasMethodologyPreferences:
        summary.structuredData.methodology_preferences.mentioned_methodologies
          .length > 0 ||
        summary.structuredData.methodology_preferences.preferred_approaches
          .length > 0,
    };

    // Store in Pinecone - storePineconeContext will use summaryId as the Pinecone record ID
    await storePineconeContext(summary.userId, searchableContent, metadata);

    console.info("✅ Conversation summary stored in Pinecone:", {
      pineconeId: summary.summaryId, // This is the actual Pinecone record ID
      summaryId: summary.summaryId,
      contentLength: searchableContent.length,
      confidence: summary.metadata.confidence,
    });

    return { success: true, recordId: summary.summaryId };
  } catch (error) {
    console.error("❌ Error storing conversation summary in Pinecone:", error);
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
  conversationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.info('🗑️ Deleting conversation summary from Pinecone:', {
      userId,
      conversationId
    });

    // Use centralized deletion function with conversation-specific filter
    const result = await deletePineconeContext(userId, {
      recordType: 'conversation_summary',
      conversationId: conversationId
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
