import {
  createOkResponse,
  createErrorResponse,
  MODEL_IDS,
  storeDebugDataInS3,
} from "../libs/api-helpers";
import { generateProgramV2 } from "../libs/program/program-generator";
import { generateProgramSummary } from "../libs/program/summary";
import { storeProgramSummaryInPinecone } from "../libs/program/pinecone";
import { BuildProgramEvent } from "../libs/program/types";
import { withHeartbeat } from "../libs/heartbeat";
import { saveProgram } from "../../dynamodb/operations";
import { storeProgramDetailsInS3 } from "../libs/program/s3-utils";
import {
  normalizeProgram,
  shouldNormalizeProgram,
  generateNormalizationSummary,
} from "../libs/program/normalization";

/**
 * Build Training Program Lambda Handler (V2 - Parallel Generation)
 * Triggered asynchronously from Build mode conversations
 *
 * Pattern: Follows build-workout and build-coach-config handlers
 * 1. Generate program using parallel phase generation (V2)
 * 2. Normalize program structure with toolConfig
 * 3. Store in S3 and DynamoDB
 * 4. Generate and store summary in Pinecone
 * 5. Return success/error response
 *
 * Critical: Uses parallel execution to stay within 15-minute Lambda timeout
 */
export const handler = async (event: BuildProgramEvent) => {
  return withHeartbeat("Training Program Generation", async () => {
    let debugData: any = null; // Track debug data for error scenarios

    try {
      console.info("🏋️ Starting V2 parallel training program generation:", {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        programId: event.programId,
        sessionId: event.sessionId,
        timestamp: new Date().toISOString(),
      });

      // Validate required fields
      if (
        !event.userId ||
        !event.coachId ||
        !event.conversationId ||
        !event.programId
      ) {
        console.error("❌ Missing required fields:", {
          hasUserId: !!event.userId,
          hasCoachId: !!event.coachId,
          hasConversationId: !!event.conversationId,
          hasProgramId: !!event.programId,
        });
        return createErrorResponse(400, "Missing required fields");
      }

      if (!event.todoList) {
        console.error("❌ No todo list provided");
        return createErrorResponse(400, "Todo list is required");
      }

      // Prepare debug data for potential error scenarios
      debugData = {
        todoListSummary: {
          programName: event.todoList.programName?.value,
          programGoals: event.todoList.programGoals?.value,
          programDuration: event.todoList.programDuration?.value,
          trainingFrequency: event.todoList.trainingFrequency?.value,
        },
        conversationContextPreview: event.conversationContext?.substring(
          0,
          200,
        ),
        timestamp: new Date().toISOString(),
        eventMetadata: {
          userId: event.userId,
          coachId: event.coachId,
          conversationId: event.conversationId,
          programId: event.programId,
          sessionId: event.sessionId,
        },
      };

      console.info("🚀 Calling V2 parallel program generator...");

      // Generate the complete training program using V2 parallel approach
      const { program, debugData: programGenerationDebugData } =
        await generateProgramV2(
          event.userId,
          event.programId,
          event.conversationId,
          event.coachId,
          event.todoList,
          event.conversationContext,
          event.additionalConsiderations, // User's final thoughts/requirements
        );

      // Merge generation debug data into outer debugData for error case
      debugData.programGenerationDebugData = programGenerationDebugData;

      console.info("✅ V2 parallel program generation completed:", {
        programId: program.programId,
        programName: program.name,
        totalDays: program.totalDays,
        phases: program.phases.length,
        totalWorkouts: program.totalWorkouts,
        trainingFrequency: program.trainingFrequency,
        generationTimings: programGenerationDebugData.timings,
      });

      // Determine if normalization is needed
      const shouldNormalize = shouldNormalizeProgram(program, 0.9);

      let normalizedProgram = program;
      let normalizationSummary = "Not needed - program structure is valid";

      if (shouldNormalize) {
        console.info(
          "🔧 Program normalization needed, running normalization pass...",
        );

        const normalizationResult = await normalizeProgram(
          program,
          event.userId,
          false, // Don't enable thinking for normalization to save cost
        );

        if (normalizationResult.isValid) {
          normalizedProgram = normalizationResult.normalizedData as any;

          // ✅ CRITICAL: Preserve s3DetailKey from original program
          // The AI normalization doesn't include s3DetailKey in the schema, so we must preserve it
          if (program.s3DetailKey && !normalizedProgram.s3DetailKey) {
            normalizedProgram.s3DetailKey = program.s3DetailKey;
            console.info(
              "✅ Preserved s3DetailKey from original program:",
              program.s3DetailKey,
            );
          }

          normalizationSummary =
            generateNormalizationSummary(normalizationResult);

          console.info("✅ Program normalization completed:", {
            isValid: normalizationResult.isValid,
            issuesFound: normalizationResult.issues.length,
            confidence: normalizationResult.confidence,
            method: normalizationResult.normalizationMethod,
          });
        } else {
          console.warn("⚠️ Normalization completed but issues remain:", {
            issues: normalizationResult.issues,
            confidence: normalizationResult.confidence,
          });
        }
      } else {
        console.info("✅ Program structure is valid, skipping normalization");
      }

      // Note: S3 storage of workout templates is handled inside generateProgramV2
      // The s3DetailKey is set during generation

      // Save program metadata to DynamoDB
      console.info("💾 Saving program to DynamoDB...");
      await saveProgram(normalizedProgram);

      console.info("✅ Program storage completed:", {
        programId: program.programId,
        s3DetailKey: program.s3DetailKey,
      });

      // Generate AI summary for coach context and UI display
      console.info("📝 Generating training program summary...");
      const summary = await generateProgramSummary(
        normalizedProgram,
        [], // conversationMessages not available in V2, summary generated from program data
      );
      console.info("Generated summary:", { summary, length: summary.length });

      // Store program summary in Pinecone for semantic search and coach context
      console.info("🔍 Storing program summary in Pinecone...");
      const pineconeResult = await storeProgramSummaryInPinecone(
        event.userId,
        summary,
        normalizedProgram,
      );

      // Store debug data in S3 for troubleshooting (success case)
      try {
        const debugContent = JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            userId: event.userId,
            programId: normalizedProgram.programId,
            conversationId: event.conversationId,
            sessionId: event.sessionId,

            // Input data
            todoListSummary: debugData.todoListSummary,
            conversationContextPreview: debugData.conversationContextPreview,

            // AI Debug Data (full prompts, responses, timings from generateProgramV2)
            programGenerationDebugData: debugData.programGenerationDebugData,

            // Program structure
            programStructure: {
              programId: normalizedProgram.programId,
              name: normalizedProgram.name,
              totalDays: normalizedProgram.totalDays,
              trainingFrequency: normalizedProgram.trainingFrequency,
              phases: normalizedProgram.phases.map((p: any) => ({
                name: p.name,
                duration: p.durationDays,
                startDay: p.startDay,
                endDay: p.endDay,
                focusAreas: p.focusAreas,
              })),
              totalWorkouts: normalizedProgram.totalWorkouts,
            },

            // Normalization
            normalizationApplied: shouldNormalize,
            normalizationSummary,

            generationMethod: "v2_parallel",
          },
          null,
          2,
        );

        await storeDebugDataInS3(
          debugContent,
          {
            userId: event.userId,
            programId: normalizedProgram.programId,
            conversationId: event.conversationId,
            sessionId: event.sessionId,
            type: "program-generation-success",
          },
          "program",
        );

        console.info("✅ Stored success debug data in S3");
      } catch (debugError) {
        console.warn(
          "⚠️ Failed to store debug data (non-critical):",
          debugError,
        );
      }

      console.info("🎉 Training program generation completed successfully!");

      return createOkResponse({
        success: true,
        programId: normalizedProgram.programId,
        programName: normalizedProgram.name,
        totalDays: normalizedProgram.totalDays,
        phases: normalizedProgram.phases.length,
        totalWorkouts: normalizedProgram.totalWorkouts,
        trainingFrequency: normalizedProgram.trainingFrequency,
        startDate: normalizedProgram.startDate,
        endDate: normalizedProgram.endDate,
        status: normalizedProgram.status,
        summary,
        pineconeStored: pineconeResult.success,
        pineconeRecordId:
          pineconeResult.success && "recordId" in pineconeResult
            ? pineconeResult.recordId
            : null,
        normalizationApplied: shouldNormalize,
        generationMethod: "v2_parallel",
      });
    } catch (error) {
      console.error("❌ Error generating training program:", error);
      console.error("Event data:", {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        programId: event.programId,
        sessionId: event.sessionId,
      });

      // Store debug data on error for troubleshooting
      if (debugData) {
        try {
          const errorDebugContent = JSON.stringify(
            {
              ...debugData,
              error: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString(),
              },
            },
            null,
            2,
          );

          await storeDebugDataInS3(
            errorDebugContent,
            {
              userId: event.userId,
              conversationId: event.conversationId,
              programId: event.programId,
              sessionId: event.sessionId,
              type: "program-generation-error",
            },
            "program",
          );

          console.info("✅ Error debug data saved to S3");
        } catch (debugError) {
          console.warn(
            "Failed to store error debug data (non-critical):",
            debugError,
          );
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown generation error";
      return createErrorResponse(500, "Failed to generate training program", {
        error: errorMessage,
        userId: event.userId,
        conversationId: event.conversationId,
      });
    }
  }); // 10 second default heartbeat interval
};
