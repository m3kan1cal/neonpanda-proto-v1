/**
 * Build Coach Config Lambda Handler
 *
 * Uses CoachCreatorAgent to create, validate, and save coach configurations.
 * Maintains same interface as original build-coach-config but uses agent pattern internally.
 */

import { Context, Handler } from "aws-lambda";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import {
  getCoachCreatorSession,
  saveCoachCreatorSession,
} from "../../dynamodb/operations";
import { CoachCreatorAgent } from "../libs/agents/coach-creator/agent";
import type { CoachCreatorContext } from "../libs/agents/coach-creator/types";

// Interface for the event payload
interface CoachConfigEvent {
  userId: string;
  sessionId: string;
}

export const handler: Handler<CoachConfigEvent> = async (
  event: CoachConfigEvent,
  context: Context,
) => {
  return withHeartbeat("Coach Creator Agent", async () => {
    const { userId, sessionId } = event;
    let session: any = null;

    try {
      console.info("🎨 Starting Coach Creator Agent:", {
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      if (!userId || !sessionId) {
        throw new Error("Missing required fields: userId, sessionId");
      }

      // Step 1: Load and validate session
      console.info("📂 Step 1: Loading coach creator session");
      session = await getCoachCreatorSession(userId, sessionId);
      if (!session) {
        throw new Error("Session not found or expired");
      }

      if (!session.isComplete) {
        throw new Error("Session is not complete");
      }

      // Step 2: Generate consistent timestamp for all operations
      console.info("⏰ Step 2: Generating consistent timestamp for config creation");
      const creationTimestamp = new Date().toISOString();
      const creationDate = new Date(creationTimestamp);
      console.info("Timestamp generated:", creationTimestamp);

      // Step 3: Update session to indicate config generation is in progress
      console.info("🔄 Step 3: Marking session as IN_PROGRESS");
      const updatedSession = {
        ...session,
        configGeneration: {
          status: "IN_PROGRESS" as const,
          startedAt: creationDate,
        },
        lastActivity: creationDate,
      };
      await saveCoachCreatorSession(updatedSession);

      // Step 4: Build agent context
      const agentContext: CoachCreatorContext = {
        userId,
        sessionId,
      };

      // Step 5: Create CoachCreator agent and run workflow
      console.info("🤖 Step 5: Creating CoachCreator agent and starting workflow");
      const agent = new CoachCreatorAgent(agentContext);
      const result = await agent.createCoach();

      console.info("✅ Agent workflow completed:", {
        success: result.success,
        coachConfigId: result.coachConfigId,
        skipped: result.skipped,
      });

      // Return response based on result
      if (result.success) {
        console.info("✅ Coach config generation completed successfully:", {
          coachConfigId: result.coachConfigId,
          coachName: result.coachName,
          primaryPersonality: result.primaryPersonality,
          primaryMethodology: result.primaryMethodology,
          genderPreference: result.genderPreference,
          userId,
          sessionId,
          creationTimestamp,
          pineconeStored: result.pineconeStored,
          pineconeRecordId: result.pineconeRecordId,
          generationMethod: result.generationMethod,
        });

        return createOkResponse({
          success: true,
          coachConfigId: result.coachConfigId,
          coachName: result.coachName,
          userId,
          sessionId,
          message: "Coach configuration generated successfully",
          generationMethod: result.generationMethod,
        });
      } else {
        // Update session to indicate failure
        console.warn("⚠️ Coach creation skipped or failed:", {
          reason: result.reason,
          validationIssues: result.validationIssues,
        });

        try {
          const failedSession = {
            ...session,
            configGeneration: {
              ...session.configGeneration,
              status: "FAILED" as const,
              failedAt: new Date(),
              error: result.reason || "Coach creation was skipped or incomplete",
            },
            lastActivity: new Date(),
          };
          await saveCoachCreatorSession(failedSession);
          console.info("✅ Session updated to FAILED status");
        } catch (updateError) {
          console.error(
            "⚠️ Failed to update session to FAILED (non-blocking):",
            updateError,
          );
        }

        return createOkResponse({
          success: false,
          skipped: true,
          reason: result.reason,
          validationIssues: result.validationIssues,
          userId,
          sessionId,
        });
      }
    } catch (error) {
      console.error("❌ Error in coach creator agent:", error);

      // Update session to indicate failure
      if (event.userId && event.sessionId && session) {
        try {
          const failedSession = {
            ...session,
            configGeneration: {
              ...session.configGeneration,
              status: "FAILED" as const,
              failedAt: new Date(),
              error: error instanceof Error ? error.message : "Unknown error",
            },
            lastActivity: new Date(),
          };
          await saveCoachCreatorSession(failedSession);
        } catch (updateError) {
          console.error(
            "Failed to update session with error status:",
            updateError,
          );
        }
      }

      // Return error response instead of throwing (for consistency with other Lambda functions)
      return createErrorResponse(
        500,
        error instanceof Error
          ? error.message
          : "Failed to generate coach configuration",
        {
          userId: event.userId,
          sessionId: event.sessionId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
    }
  }); // 10 second default heartbeat interval
};
