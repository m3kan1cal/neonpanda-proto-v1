import {
  createOkResponse,
  createErrorResponse,
  MODEL_IDS,
  storeDebugDataInS3,
} from "../libs/api-helpers";
import {
  generateTrainingProgram,
} from "../libs/training-program/program-generator";
import { generateTrainingProgramSummary } from "../libs/training-program/summary";
import { storeTrainingProgramSummaryInPinecone } from "../libs/training-program/pinecone";
import { BuildTrainingProgramEvent } from "../libs/training-program/types";

/**
 * Build Training Program Lambda Handler
 * Triggered asynchronously from Build mode conversations
 *
 * This handler follows the same pattern as build-workout:
 * 1. Extract program structure from conversation (with AI normalization)
 * 2. Generate workout templates for each phase
 * 3. Store in S3 and DynamoDB
 * 4. Return success/error response
 *
 * Similar to build-workout, but for multi-week training programs
 */
export const handler = async (event: BuildTrainingProgramEvent) => {
  try {
    console.info("🏋️ Starting training program generation:", {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      messageCount: event.conversationMessages?.length || 0,
      coachName: event.coachConfig.coach_name || "Unknown",
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!event.userId || !event.coachId || !event.conversationId) {
      console.error("❌ Missing required fields:", {
        hasUserId: !!event.userId,
        hasCoachId: !!event.coachId,
        hasConversationId: !!event.conversationId,
      });
      return createErrorResponse(400, "Missing required fields");
    }

    if (!event.conversationMessages || event.conversationMessages.length === 0) {
      console.error("❌ No conversation messages provided");
      return createErrorResponse(400, "Conversation messages are required");
    }

    console.info("Calling AI to generate training program from conversation...");

    // Generate the complete training program using AI
    // This function handles:
    // - Structure extraction with normalization
    // - Workout template generation per phase
    // - S3 storage for detailed program data
    // - DynamoDB storage for program metadata (saveTrainingProgram called internally)
    const { programId, program } = await generateTrainingProgram(
      event.conversationMessages,
      event.userId,
      event.coachId,
      event.conversationId
    );

    console.info("✅ Training program generation completed successfully:", {
      programId,
      programName: program.name,
      totalDays: program.totalDays,
      phases: program.phases.length,
      totalWorkouts: program.totalWorkouts,
      trainingFrequency: program.trainingFrequency,
      s3DetailKey: program.s3DetailKey,
    });

    // Generate AI summary for coach context and UI display
    console.info("Generating training program summary...");
    const summary = await generateTrainingProgramSummary(
      program,
      event.conversationMessages
    );
    console.info("Generated summary:", { summary, length: summary.length });

    // Store program summary in Pinecone for semantic search and coach context
    console.info("📝 Storing program summary in Pinecone...");
    const pineconeResult = await storeTrainingProgramSummaryInPinecone(
      event.userId,
      summary,
      program
    );

    // Store debug data in S3 for troubleshooting
    try {
      const conversationSummary = event.conversationMessages
        .slice(-5)
        .map(m => `${m.role}: ${m.content?.substring(0, 100)}...`)
        .join('\n\n');

      const debugContent = JSON.stringify({
        conversationSummary,
        programStructure: {
          programId,
          name: program.name,
          totalDays: program.totalDays,
          phases: program.phases.map(p => ({
            name: p.name,
            duration: p.durationDays,
            focusAreas: p.focusAreas,
          })),
        },
      }, null, 2);

      await storeDebugDataInS3(
        debugContent,
        {
          userId: event.userId,
          programId,
          type: 'training-program-generation',
        },
        'training-program'
      );
    } catch (debugError) {
      console.warn("Failed to store debug data (non-critical):", debugError);
    }

    return createOkResponse({
      success: true,
      programId,
      programName: program.name,
      totalDays: program.totalDays,
      phases: program.phases.length,
      totalWorkouts: program.totalWorkouts,
      trainingFrequency: program.trainingFrequency,
      startDate: program.startDate,
      endDate: program.endDate,
      status: program.status,
      summary,
      pineconeStored: pineconeResult.success,
      pineconeRecordId: pineconeResult.success && 'recordId' in pineconeResult
        ? pineconeResult.recordId
        : null,
    });
  } catch (error) {
    console.error("❌ Error generating training program:", error);
    console.error("Event data:", {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      messageCount: event.conversationMessages?.length || 0,
    });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown generation error";
    return createErrorResponse(500, "Failed to generate training program", {
      error: errorMessage,
      userId: event.userId,
      conversationId: event.conversationId,
    });
  }
};
