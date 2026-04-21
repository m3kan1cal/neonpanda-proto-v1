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
import { getUserProfile } from "../../dynamodb/operations";
import { CoachCreatorAgent } from "../libs/agents/coach-creator/agent";
import type { CoachCreatorContext } from "../libs/agents/coach-creator/types";
import { logger } from "../libs/logger";

// Interface for the event payload
interface CoachConfigEvent {
  userId: string;
  sessionId: string;
  userTimezone?: string;
}

export const handler: Handler<CoachConfigEvent> = async (
  event: CoachConfigEvent,
  context: Context,
) => {
  return withHeartbeat("Coach Creator Agent", async () => {
    const { userId, sessionId, userTimezone } = event;
    let session: any = null;
    let updatedSession: any = null;

    try {
      logger.info("🎨 Starting Coach Creator Agent:", {
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      if (!userId || !sessionId) {
        throw new Error("Missing required fields: userId, sessionId");
      }

      // Step 1: Load and validate session
      logger.info("📂 Step 1: Loading coach creator session");
      session = await getCoachCreatorSession(userId, sessionId);
      if (!session) {
        throw new Error("Session not found or expired");
      }

      if (!session.isComplete) {
        throw new Error("Session is not complete");
      }

      // Step 2: Generate consistent timestamp for all operations
      logger.info(
        "⏰ Step 2: Generating consistent timestamp for config creation",
      );
      const creationTimestamp = new Date().toISOString();
      const creationDate = new Date(creationTimestamp);
      logger.info("Timestamp generated:", creationTimestamp);

      // Step 3: Update session to indicate config generation is in progress
      logger.info("🔄 Step 3: Marking session as IN_PROGRESS");
      updatedSession = {
        ...session,
        configGeneration: {
          status: "IN_PROGRESS" as const,
          startedAt: creationDate,
        },
        lastActivity: creationDate,
      };
      await saveCoachCreatorSession(updatedSession);

      // Step 4: Load user profile for critical training directive
      let criticalTrainingDirective: any;
      try {
        const userProfile = await getUserProfile(userId);
        criticalTrainingDirective = userProfile?.criticalTrainingDirective;
      } catch (profileError) {
        logger.warn(
          "⚠️ Could not load user profile for training directive (non-blocking):",
          profileError,
        );
      }

      // Step 5: Build agent context
      const agentContext: CoachCreatorContext = {
        userId,
        sessionId,
        criticalTrainingDirective,
        userTimezone,
      };

      // Step 6: Create CoachCreator agent and run workflow
      logger.info(
        "🤖 Step 6: Creating CoachCreator agent and starting workflow",
      );
      const agent = new CoachCreatorAgent(agentContext);
      const result = await agent.createCoach();

      logger.info("✅ Agent workflow completed:", {
        success: result.success,
        coachConfigId: result.coachConfigId,
        skipped: result.skipped,
      });

      // Return response based on result
      if (result.success) {
        logger.info("✅ Coach config generation completed successfully:", {
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
        logger.warn("⚠️ Coach creation skipped or failed:", {
          reason: result.reason,
          validationIssues: result.validationIssues,
        });

        try {
          const failedSession = {
            ...updatedSession,
            configGeneration: {
              ...updatedSession.configGeneration,
              status: "FAILED" as const,
              failedAt: new Date(),
              error:
                result.reason || "Coach creation was skipped or incomplete",
            },
            lastActivity: new Date(),
          };
          await saveCoachCreatorSession(failedSession);
          logger.info("✅ Session updated to FAILED status");
        } catch (updateError) {
          logger.error(
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
      logger.error("❌ Error in coach creator agent:", error);

      // Update session to indicate failure
      // Use updatedSession if available (has startedAt), otherwise fall back to session
      const sessionToUpdate = updatedSession || session;
      if (event.userId && event.sessionId && sessionToUpdate) {
        try {
          const failedSession = {
            ...sessionToUpdate,
            configGeneration: {
              ...sessionToUpdate.configGeneration,
              status: "FAILED" as const,
              failedAt: new Date(),
              error: error instanceof Error ? error.message : "Unknown error",
            },
            lastActivity: new Date(),
          };
          await saveCoachCreatorSession(failedSession);
        } catch (updateError) {
          logger.error(
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
