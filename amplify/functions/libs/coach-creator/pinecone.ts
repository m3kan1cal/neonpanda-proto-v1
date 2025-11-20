/**
 * Coach Creator Pinecone Integration
 *
 * This module handles storing coach creator-related data in Pinecone for semantic search
 * and future analysis capabilities.
 */

import { storePineconeContext } from '../api-helpers';
import { filterNullish } from '../object-utils';
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
    // Generate structured summary_id (consistent with conversation summaries)
    const timestamp = Date.now();
    const shortId = Math.random().toString(36).substring(2, 11);
    const summary_id = `coach_creator_summary_${userId}_${timestamp}_${shortId}`;

    // Prepare coach creator specific metadata for Pinecone
    const baseMetadata = {
      recordType: 'coach_creator_summary',
      summaryId: summary_id,
      sophisticationLevel: session.sophisticationLevel,
      selectedPersonality: coachConfig.selected_personality.primary_template,
      selectedMethodology: coachConfig.selected_methodology.primary_methodology,
      safetyConsiderations: coachConfig.metadata.safety_profile?.injuries?.length || 0,
      creationDate: coachConfig.metadata.created_date,
      coachId: coachConfig.coach_id,
      coachName: coachConfig.coach_name,
      sessionId: session.sessionId,
      conversationTurns: session.conversationHistory?.filter(m => m.role === 'user').length || 0,
      programmingFocus: coachConfig.technical_config.programming_focus,
      experienceLevel: coachConfig.technical_config.experience_level,
      trainingFrequency: coachConfig.technical_config.training_frequency,
      specializations: coachConfig.technical_config.specializations,
      methodologyReasoning: coachConfig.selected_methodology.methodology_reasoning,
      programmingEmphasis: coachConfig.selected_methodology.programming_emphasis,
      periodizationApproach: coachConfig.selected_methodology.periodization_approach,
      personalityReasoning: coachConfig.selected_personality.selection_reasoning,
      personalityBlending: JSON.stringify(coachConfig.selected_personality.blending_weights),
      injuryConsiderations: coachConfig.technical_config.injury_considerations,
      equipmentAvailable: coachConfig.technical_config.equipment_available,
      goalTimeline: coachConfig.technical_config.goal_timeline,
      preferredIntensity: coachConfig.technical_config.preferred_intensity,
      topics: ['coach_creator', 'user_onboarding', 'personality_selection', 'methodology_selection'],
      outcome: 'coach_created',
      loggedAt: new Date().toISOString(),
    };

    // Optional fields that may be null/undefined
    const optionalFields = filterNullish({
      sessionDurationMinutes: session.completedAt && session.startedAt
        ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60))
        : null,
      userSatisfaction: coachConfig.metadata.user_satisfaction,
    });

    const coachCreatorMetadata = {
      ...baseMetadata,
      ...optionalFields
    };

    // Use centralized storage function
    const result = await storePineconeContext(userId, conversationSummary, coachCreatorMetadata);

    console.info('✅ Successfully stored coach creator summary in Pinecone:', {
      coachId: coachConfig.coach_id,
      summary_id,
      pineconeId: summary_id, // summary_id is used as the Pinecone record ID
      namespace: result.namespace,
      sessionId: session.sessionId,
      sophisticationLevel: session.sophisticationLevel,
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