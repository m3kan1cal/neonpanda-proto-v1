/**
 * Coach Creator Pinecone Integration
 *
 * This module handles storing coach creator-related data in Pinecone for semantic search
 * and future analysis capabilities.
 */

import { storePineconeContext } from '../api-helpers';
import { CoachCreatorSession, CoachConfig } from './types';

/**
 * Store coach creator session summary in Pinecone for future analysis
 *
 * @param userId - The user ID for namespace targeting
 * @param conversationSummary - The generated summary of the coach creator session
 * @param session - The complete coach creator session data
 * @param coachConfig - The generated coach configuration
 * @returns Promise with storage result
 */
export const storeCoachCreatorSummaryInPinecone = async (
  userId: string,
  conversationSummary: string,
  session: CoachCreatorSession,
  coachConfig: CoachConfig
) => {
  try {
    // Prepare coach creator specific metadata for Pinecone
    const coachCreatorMetadata = {
      record_type: 'coach_creator_summary',

      // Coach creator specific metadata
      sophistication_level: session.userContext.sophisticationLevel,
      selected_personality: coachConfig.selected_personality.primary_template,
      selected_methodology: coachConfig.selected_methodology.primary_methodology,
      safety_considerations: coachConfig.metadata.safety_profile?.injuries?.length || 0,
      creation_date: coachConfig.metadata.created_date,

      // Coach identification
      coach_id: coachConfig.coach_id,
      coach_name: coachConfig.coach_name,

      // Session metadata
      session_id: session.sessionId,
      questions_completed: session.questionHistory.length,
      session_duration_minutes: session.completedAt && session.startedAt
        ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60))
        : null,

      // Technical configuration highlights
      programming_focus: coachConfig.technical_config.programming_focus,
      experience_level: coachConfig.technical_config.experience_level,
      training_frequency: coachConfig.technical_config.training_frequency,
      specializations: coachConfig.technical_config.specializations,

      // Methodology details
      methodology_reasoning: coachConfig.selected_methodology.methodology_reasoning,
      programming_emphasis: coachConfig.selected_methodology.programming_emphasis,
      periodization_approach: coachConfig.selected_methodology.periodization_approach,

      // Personality details
      personality_reasoning: coachConfig.selected_personality.selection_reasoning,
      personality_blending: JSON.stringify(coachConfig.selected_personality.blending_weights),

      // Safety and constraints
      injury_considerations: coachConfig.technical_config.injury_considerations,
      equipment_available: coachConfig.technical_config.equipment_available,
      goal_timeline: coachConfig.technical_config.goal_timeline,
      preferred_intensity: coachConfig.technical_config.preferred_intensity,

      // Semantic search categories
      topics: ['coach_creator', 'user_onboarding', 'personality_selection', 'methodology_selection'],

      // Additional context for retrieval
      outcome: 'coach_created',
      logged_at: new Date().toISOString(),

      // Only include user_satisfaction if it has a value (Pinecone doesn't accept null)
      ...(coachConfig.metadata.user_satisfaction !== null && coachConfig.metadata.user_satisfaction !== undefined
        ? { user_satisfaction: coachConfig.metadata.user_satisfaction }
        : {})
    };

    // Use centralized storage function
    const result = await storePineconeContext(userId, conversationSummary, coachCreatorMetadata);

    console.info('✅ Successfully stored coach creator summary in Pinecone:', {
      coachId: coachConfig.coach_id,
      recordId: result.recordId,
      namespace: result.namespace,
      sessionId: session.sessionId,
      sophisticationLevel: session.userContext.sophisticationLevel,
      summaryLength: conversationSummary.length
    });

    return result;

  } catch (error) {
    console.error('❌ Failed to store coach creator summary in Pinecone:', error);

    // Don't throw error to avoid breaking the coach creator process
    // Pinecone storage is for analytics/future retrieval, not critical for immediate functionality
    console.warn('Coach creator will continue despite Pinecone storage failure');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Future functions can be added here:
 * - retrieveCoachCreatorHistory()
 * - searchSimilarCoachConfigs()
 * - getCoachCreatorPatterns()
 * - updateCoachCreatorSummary()
 * - analyzeCoachCreatorTrends()
 */