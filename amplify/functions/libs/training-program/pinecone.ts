/**
 * Training Program Pinecone Integration
 *
 * This module handles storing training program-related data in Pinecone for semantic search
 * and coach memory capabilities.
 */

import { storePineconeContext, deletePineconeContext } from '../api-helpers';
import { filterNullish } from '../object-utils';
import { TrainingProgram } from './types';

/**
 * Store training program summary in Pinecone for semantic search and coach context
 * Follows the same pattern as workout summary storage
 *
 * @param userId - The user ID for namespace targeting
 * @param programSummary - The AI-generated program summary text
 * @param program - The complete training program object
 * @returns Promise with storage result
 */
export const storeTrainingProgramSummaryInPinecone = async (
  userId: string,
  programSummary: string,
  program: TrainingProgram
) => {
  try {
    // Build base metadata (always present)
    const baseMetadata = {
      recordType: 'training_program_summary',
      programId: program.programId,
      programName: program.name,
      status: program.status,
      coachId: program.coachId,
      conversationId: program.creationConversationId,
      startDate: program.startDate,
      endDate: program.endDate,
      totalDays: program.totalDays,
      currentDay: program.currentDay,
      trainingFrequency: program.trainingFrequency,
      totalWorkouts: program.totalWorkouts,
      completedWorkouts: program.completedWorkouts,
      adherenceRate: program.adherenceRate,
      phaseCount: program.phases.length,
      topics: [
        'training_program',
        'program_structure',
        program.status,
        ...program.trainingGoals.slice(0, 3), // Include up to 3 goals as topics
      ],
      createdAt: new Date().toISOString()
    };

    // Optional fields (filtered for null/undefined)
    const optionalFields = filterNullish({
      lastActivityDate: program.lastActivityDate?.toISOString(),
      pausedAt: program.pausedAt?.toISOString(),
      pausedDuration: program.pausedDuration > 0 ? program.pausedDuration : undefined,
    });

    // Phase metadata (summarize phases for searchability)
    const phasesMetadata = {
      phases: program.phases.map(phase => ({
        name: phase.name,
        durationDays: phase.durationDays,
        focusAreas: phase.focusAreas,
      })),
      phaseNames: program.phases.map(p => p.name),
      allFocusAreas: [...new Set(program.phases.flatMap(p => p.focusAreas))],
    };

    // Equipment and goals metadata
    const contextMetadata = {
      trainingGoals: program.trainingGoals,
      equipmentConstraints: program.equipmentConstraints,
      hasEquipmentConstraints: program.equipmentConstraints.length > 0,
    };

    // Combine all metadata
    const programMetadata = {
      ...baseMetadata,
      ...optionalFields,
      ...phasesMetadata,
      ...contextMetadata,
    };

    // Use centralized storage function
    const result = await storePineconeContext(userId, programSummary, programMetadata);

    console.info('✅ Successfully stored training program summary in Pinecone:', {
      programId: program.programId,
      recordId: result.recordId,
      namespace: result.namespace,
      programName: program.name,
      summaryLength: programSummary.length,
      status: program.status,
    });

    return result;

  } catch (error) {
    console.error('❌ Failed to store training program summary in Pinecone:', error);

    // Don't throw error to avoid breaking the program generation process
    // Pinecone storage is for future retrieval/analysis, not critical for immediate functionality
    console.warn('Training program generation will continue despite Pinecone storage failure');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Delete training program summary from Pinecone when program is deleted
 * Follows the same pattern as workout deletion
 *
 * @param userId - The user ID for namespace targeting
 * @param programId - The program ID to delete from Pinecone
 * @returns Promise with deletion result
 */
export const deleteTrainingProgramSummaryFromPinecone = async (
  userId: string,
  programId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.info('🗑️ Deleting training program summary from Pinecone:', {
      userId,
      programId
    });

    // Use centralized deletion function with program-specific filter
    const result = await deletePineconeContext(userId, {
      recordType: 'training_program_summary',
      programId: programId
    });

    if (result.success) {
      console.info('✅ Successfully deleted training program summary from Pinecone:', {
        userId,
        programId,
        deletedRecords: result.deletedCount
      });
    } else {
      console.warn('⚠️ Failed to delete training program summary from Pinecone:', {
        userId,
        programId,
        error: result.error
      });
    }

    return {
      success: result.success,
      error: result.error
    };

  } catch (error) {
    console.error('❌ Failed to delete training program summary from Pinecone:', error);

    // Don't throw error to avoid breaking the program deletion process
    // Pinecone cleanup failure shouldn't prevent DynamoDB deletion
    console.warn('Training program deletion will continue despite Pinecone cleanup failure');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};


