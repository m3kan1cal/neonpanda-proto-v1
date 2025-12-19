/**
 * Program Designer Pinecone Integration
 *
 * This module handles storing program designer session data in Pinecone
 * for semantic search and coach context capabilities.
 */

import { storePineconeContext, deletePineconeContext } from "../api-helpers";
import { storeWithAutoCompression } from "../pinecone-compression";
import { filterNullish } from "../object-utils";
import { ProgramDesignerSession } from "./types";
import { Program } from "../program/types";

/**
 * Store program designer session summary in Pinecone for coach context
 *
 * This captures the conversational flow and user responses during program creation,
 * allowing coaches to reference "what the user said during setup" for better context.
 *
 * @param userId - The user ID for namespace targeting
 * @param sessionSummary - The generated summary of the program designer session
 * @param session - The complete program designer session data
 * @param program - The created program (for additional context)
 * @returns Promise with storage result
 */
export const storeProgramDesignerSessionSummaryInPinecone = async (
  userId: string,
  sessionSummary: string,
  session: ProgramDesignerSession,
  program: Program,
) => {
  try {
    // Generate structured summary_id (consistent with coach_creator_summary pattern)
    const timestamp = Date.now();
    const shortId = Math.random().toString(36).substring(2, 11);
    const summary_id = `program_designer_summary_${userId}_${timestamp}_${shortId}`;

    // Prepare program designer specific metadata for Pinecone
    const sessionMetadata = {
      recordType: "program_designer_summary",
      summaryId: summary_id,
      sessionId: session.sessionId,
      programId: program.programId,
      programName: program.name,
      coachId: session.coachId,
      coachName: session.coachName,
      conversationTurns:
        session.conversationHistory?.filter((m) => m.role === "user").length ||
        0,
      createdAt: new Date().toISOString(),

      // Program-specific metadata for searchability
      totalDays: program.totalDays,
      trainingFrequency: program.trainingFrequency,
      phaseCount: program.phases.length,
      totalWorkouts: program.totalWorkouts,
      trainingGoals: program.trainingGoals.slice(0, 3), // Top 3 goals
      equipmentConstraints: program.equipmentConstraints.slice(0, 3), // Top 3 constraints

      // Topics for semantic search
      topics: [
        "program_designer_session",
        "program_creation",
        "training_goals",
        "program_requirements",
        ...program.trainingGoals.slice(0, 2), // Include top goals as topics
      ],
    };

    // Use auto-compression for storage (handles large summaries)
    const result = await storeWithAutoCompression(
      (content) => storePineconeContext(userId, content, sessionMetadata),
      sessionSummary,
      sessionMetadata,
      "program designer session summary",
    );

    console.info(
      "✅ Program designer session summary stored in Pinecone successfully:",
      {
        userId,
        sessionId: session.sessionId,
        programId: program.programId,
        summaryId: summary_id,
        recordId: result.recordId,
        namespace: result.namespace,
        summaryLength: sessionSummary.length,
      },
    );

    return {
      success: true,
      summaryId: summary_id,
      recordId: result.recordId,
      namespace: result.namespace,
    };
  } catch (error) {
    console.error(
      "Failed to store program designer session summary in Pinecone:",
      error,
    );

    // Non-blocking: Return failure but don't throw
    // Program creation should succeed even if Pinecone storage fails
    console.warn(
      "Program creation will continue despite Pinecone session storage failure",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Delete program designer session summary from Pinecone vector database
 * Cleans up indexed session data when sessions are deleted
 */
export async function deleteProgramDesignerSessionSummaryFromPinecone(
  userId: string,
  sessionId: string,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    console.info(
      "🗑️ Deleting program designer session summary from Pinecone:",
      {
        userId,
        sessionId,
      },
    );

    // Use the existing deletePineconeContext helper with sessionId filter
    const result = await deletePineconeContext(userId, {
      sessionId: sessionId,
      recordType: "program_designer_summary",
    });

    if (result.success) {
      console.info(
        "✅ Program designer session summary deleted from Pinecone:",
        {
          userId,
          sessionId,
          deletedCount: result.deletedCount,
        },
      );
    } else {
      console.warn(
        "⚠️ Failed to delete program designer session summary from Pinecone:",
        {
          userId,
          sessionId,
          error: result.error,
        },
      );
    }

    return result;
  } catch (error) {
    console.error(
      "❌ Error deleting program designer session summary from Pinecone:",
      error,
    );
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
