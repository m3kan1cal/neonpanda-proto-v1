/**
 * Training Program Pinecone Integration
 *
 * This module handles storing training program-related data in Pinecone for semantic search
 * and coach memory capabilities.
 */

import { storePineconeContext, deletePineconeContext } from "../api-helpers";
import { storeWithAutoCompression } from "../pinecone-compression";
import { filterNullish } from "../object-utils";
import { Program } from "./types";

/**
 * Store training program summary in Pinecone for semantic search and coach context
 * Follows the same pattern as workout summary storage
 *
 * @param userId - The user ID for namespace targeting
 * @param programSummary - The AI-generated program summary text
 * @param program - The complete training program object
 * @returns Promise with storage result
 */
export const storeProgramSummaryInPinecone = async (
  userId: string,
  programSummary: string,
  program: Program,
) => {
  try {
    // Build base metadata (always present)
    const baseMetadata = {
      recordType: "program_summary",
      programId: program.programId,
      programName: program.name,
      status: program.status,
      primaryCoachId: program.coachIds[0], // Primary coach (first in array)
      coachNames: program.coachNames, // All coach names
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
        "training_program",
        "program_structure",
        program.status,
        ...program.trainingGoals.slice(0, 3), // Include up to 3 goals as topics
      ],
      createdAt: new Date().toISOString(),
    };

    // Optional fields (filtered for null/undefined)
    const optionalFields = filterNullish({
      lastActivityAt: program.lastActivityAt?.toISOString(),
      pausedAt: program.pausedAt?.toISOString(),
      pausedDuration:
        program.pausedDuration > 0 ? program.pausedDuration : undefined,
    });

    // Phase metadata (summarize phases for searchability)
    // Note: Only include arrays of strings, not complex objects (Pinecone limitation)
    const phasesMetadata = {
      phaseNames: program.phases.map((p) => p.name),
      allFocusAreas: [...new Set(program.phases.flatMap((p) => p.focusAreas))],
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

    // Store with automatic AI compression if size limit exceeded
    const result = await storeWithAutoCompression(
      (content) => storePineconeContext(userId, content, programMetadata),
      programSummary,
      programMetadata,
      "training program summary",
    );

    console.info(
      "✅ Successfully stored training program summary in Pinecone:",
      {
        programId: program.programId,
        recordId: result.recordId,
        namespace: result.namespace,
        programName: program.name,
        summaryLength: programSummary.length,
        status: program.status,
      },
    );

    return result;
  } catch (error) {
    console.error(
      "❌ Failed to store training program summary in Pinecone:",
      error,
    );

    // Don't throw error to avoid breaking the program generation process
    // Pinecone storage is for future retrieval/analysis, not critical for immediate functionality
    console.warn(
      "Training program generation will continue despite Pinecone storage failure",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Delete program summary from Pinecone vector database
 * Cleans up indexed program data when programs are deleted
 */
export async function deleteProgramSummaryFromPinecone(
  userId: string,
  programId: string,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    console.info("🗑️ Deleting program summary from Pinecone:", {
      userId,
      programId,
    });

    // Use the existing deletePineconeContext helper with programId filter
    const result = await deletePineconeContext(userId, {
      programId: programId,
      recordType: "program_summary",
    });

    if (result.success) {
      console.info("✅ Program summary deleted from Pinecone:", {
        userId,
        programId,
        deletedCount: result.deletedCount,
      });
    } else {
      console.warn("⚠️ Failed to delete program summary from Pinecone:", {
        userId,
        programId,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    console.error("❌ Error deleting program summary from Pinecone:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
