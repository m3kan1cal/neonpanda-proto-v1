import { Context, Handler } from "aws-lambda";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  generateCoachConfig,
  storeCoachCreatorSummaryInPinecone,
  generateCoachCreatorSessionSummary,
} from "../libs/coach-creator";
import {
  saveCoachConfig,
  getCoachCreatorSession,
  saveCoachCreatorSession,
} from "../../dynamodb/operations";
import { withHeartbeat } from "../libs/heartbeat";

// Interface for the event payload
interface CoachConfigEvent {
  userId: string;
  sessionId: string;
}

export const handler: Handler<CoachConfigEvent> = async (
  event: CoachConfigEvent,
  context: Context
) => {
  return withHeartbeat(
    "Coach Config Generation",
    async () => {
      const { userId, sessionId } = event;
      let session: any = null;

      try {
        console.info("🚀 Starting async coach config generation:", {
          userId,
          sessionId,
          timestamp: new Date().toISOString(),
        });

        if (!userId || !sessionId) {
          throw new Error("Missing required fields: userId, sessionId");
        }

        // Step 1: Load the completed session
        console.info("📂 Step 1: Loading coach creator session");
        session = await getCoachCreatorSession(userId, sessionId);
        if (!session) {
          throw new Error("Session not found or expired");
        }

        if (!session.isComplete) {
          throw new Error("Session is not complete");
        }

        // Step 2: Generate consistent timestamp for all operations (FIX 2.3)
        console.info(
          "⏰ Step 2: Generating consistent timestamp for config creation"
        );
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

        // Step 4: Generate the coach config (this is the long-running process)
        console.info(
          "🧠 Step 4: Generating coach configuration with AI (this may take 60-120s)"
        );
        const coachConfig = await generateCoachConfig(
          session,
          creationTimestamp
        );

        // Step 6: Save the coach config with consistent timestamp
        console.info("💾 Step 6: Saving coach configuration to DynamoDB");
        await saveCoachConfig(userId, coachConfig, creationTimestamp);

        // Step 7: Store coach creator summary in Pinecone for future analysis
        console.info("📝 Step 7: Storing coach creator summary in Pinecone");
        const conversationSummary = generateCoachCreatorSessionSummary(session);
        const pineconeResult = await storeCoachCreatorSummaryInPinecone(
          userId,
          conversationSummary,
          session,
          coachConfig
        );

        // Step 8: Update session to indicate completion and soft delete
        console.info("✅ Step 8: Marking session as COMPLETE");
        const completedSession = {
          ...session,
          configGeneration: {
            ...session.configGeneration,
            status: "COMPLETE" as const,
            completedAt: creationDate,
            coachConfigId: coachConfig.coach_id,
          },
          isDeleted: true, // Soft delete - session data preserved for history
          lastActivity: creationDate,
        };
        await saveCoachCreatorSession(completedSession);

        console.info("✅ Coach config generation completed successfully:", {
          coachConfigId: coachConfig.coach_id,
          coachName: coachConfig.coach_name,
          userId,
          sessionId,
          creationTimestamp,
          pineconeStored: pineconeResult.success,
          pineconeRecordId:
            pineconeResult.success && "recordId" in pineconeResult
              ? pineconeResult.recordId
              : null,
        });

        return createOkResponse({
          success: true,
          coachConfigId: coachConfig.coach_id,
          coachName: coachConfig.coach_name,
          userId,
          sessionId,
          message: "Coach configuration generated successfully",
        });
      } catch (error) {
        console.error("❌ Error generating coach config:", error);

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
              updateError
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
          }
        );
      }
    }
  ); // 10 second default heartbeat interval
};
