/**
 * Build Program V2 Lambda Handler
 *
 * Uses ProgramDesigner agent to design, validate, and save training programs.
 * Maintains same interface as build-program but uses agent pattern internally.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import type { BuildProgramEvent } from "../libs/program/types";
import { ProgramDesignerAgent } from "../libs/agents/program-designer/agent";

export const handler = async (event: BuildProgramEvent) => {
  return withHeartbeat("Program Designer Agent", async () => {
    try {
      console.info("🏋️ Starting program designer agent (V2):", {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        programId: event.programId,
        sessionId: event.sessionId,
        timestamp: new Date().toISOString(),
      });

      // Pre-validation (same as original build-program)
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

      // Check for obviously incomplete program requirements
      const todoList = event.todoList;
      const hasBasicRequirements =
        todoList.trainingGoals?.value || todoList.programDuration?.value;

      if (!hasBasicRequirements) {
        console.warn("⚠️ Incomplete program requirements detected:", {
          hasTrainingGoals: !!todoList.trainingGoals?.value,
          hasProgramDuration: !!todoList.programDuration?.value,
          todoListKeys: Object.keys(todoList),
        });

        return createOkResponse({
          success: false,
          skipped: true,
          reason:
            "Program requirements incomplete - please provide at least training goals and program duration",
          validation: {
            requiredFields: ["trainingGoals", "programDuration"],
            providedFields: Object.keys(todoList).filter(
              (k) => todoList[k]?.value,
            ),
          },
        });
      }

      // Create ProgramDesigner agent
      // ProgramDesignerContext extends BuildProgramEvent, so event is the context
      const agent = new ProgramDesignerAgent(event);

      // Let agent handle the entire workflow
      console.info("🤖 Starting agent workflow...");
      const result = await agent.designProgram();

      console.info("✅ Agent workflow completed:", {
        success: result.success,
        programId: result.programId,
        skipped: result.skipped,
      });

      // Return same response format as original build-program
      if (result.success) {
        return createOkResponse({
          success: true,
          programId: result.programId,
          programName: result.programName,
          totalDays: result.totalDays,
          phases: result.phases,
          totalWorkouts: result.totalWorkouts,
          trainingFrequency: result.trainingFrequency,
          startDate: result.startDate,
          endDate: result.endDate,
          status: result.status,
          summary: result.summary,
          pineconeStored: result.pineconeStored,
          pineconeRecordId: result.pineconeRecordId,
          normalizationApplied: result.normalizationApplied,
          generationMethod: result.generationMethod || "agent_v2",
        });
      } else {
        return createOkResponse({
          success: false,
          skipped: true,
          reason: result.reason,
        });
      }
    } catch (error) {
      console.error("❌ Error in program designer agent:", error);
      console.error("Event data:", {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        programId: event.programId,
        sessionId: event.sessionId,
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown generation error";
      return createErrorResponse(500, "Failed to design training program", {
        error: errorMessage,
        userId: event.userId,
        conversationId: event.conversationId,
      });
    }
  }); // 10 second default heartbeat interval
};
