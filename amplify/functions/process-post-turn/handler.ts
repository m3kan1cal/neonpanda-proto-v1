/**
 * Process Post Turn Lambda
 *
 * Triggered asynchronously after each conversation turn in stream-coach-conversation.
 * Runs post-turn operations that should not block the streaming response:
 *   - Conversation summary detection and triggering (analyze_complexity → build-conversation-summary)
 *   - Prospective memory extraction (future events, commitments, follow-ups)
 *
 * Both tasks run in parallel via Promise.allSettled so a failure in one
 * does not affect the other. This Lambda has its own full timeout, so
 * neither task is killed by the streaming handler's event loop freeze.
 *
 * Pipeline:
 *   stream-coach-conversation → invokeAsyncLambda("process-post-turn") → this handler
 */

import { BedrockClient, ListGuardrailsCommand } from "@aws-sdk/client-bedrock";
import { detectAndProcessConversationSummary } from "../libs/coach-conversation/detection";
import { extractAndSaveProspectiveMemories } from "../libs/coach-conversation/memory-processing";
import { logger } from "../libs/logger";

// Resolve guardrail ID from name on first invocation (cold start).
// processPostTurn is in the jobs stack, so the guardrail CDK token from the
// main stack can't be passed directly — we receive the deterministic guardrail
// name instead and resolve the ID via the Bedrock API once per container.
let _guardrailResolved = false;

async function resolveGuardrailId(): Promise<void> {
  if (_guardrailResolved || process.env.BEDROCK_GUARDRAIL_ID) return;

  const guardrailName = process.env.BEDROCK_GUARDRAIL_NAME;
  if (!guardrailName) {
    _guardrailResolved = true;
    return;
  }

  try {
    const client = new BedrockClient({});
    const response = await client.send(new ListGuardrailsCommand({}));
    const match = response.guardrails?.find((g) => g.name === guardrailName);
    if (match?.id) {
      process.env.BEDROCK_GUARDRAIL_ID = match.id;
      logger.info("Resolved guardrail ID from name:", {
        name: guardrailName,
        id: match.id,
      });
      _guardrailResolved = true;
    } else {
      logger.warn("Guardrail not found by name:", { name: guardrailName });
      _guardrailResolved = true;
    }
  } catch (error) {
    // Transient failure — leave _guardrailResolved false so the next
    // invocation on this container retries the resolution.
    logger.warn(
      "Failed to resolve guardrail ID — will retry next invocation:",
      error,
    );
  }
}

export interface ProcessPostTurnEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  userMessage: string;
  aiResponse: string;
  currentMessageCount: number;
}

export const handler = async (event: ProcessPostTurnEvent) => {
  await resolveGuardrailId();
  const {
    userId,
    coachId,
    conversationId,
    userMessage,
    aiResponse,
    currentMessageCount,
  } = event;

  logger.info("🔄 Starting post-turn processing:", {
    userId,
    conversationId,
    currentMessageCount,
    userMessageLength: userMessage.length,
    aiResponseLength: aiResponse.length,
  });

  const startTime = Date.now();

  const [summaryResult, prospectiveResult] = await Promise.allSettled([
    detectAndProcessConversationSummary(
      userId,
      coachId,
      conversationId,
      userMessage,
      currentMessageCount,
    ),
    extractAndSaveProspectiveMemories(
      userMessage,
      aiResponse,
      userId,
      coachId,
      conversationId,
    ),
  ]);

  const elapsed = Date.now() - startTime;

  const summaryOutcome =
    summaryResult.status === "fulfilled"
      ? {
          status: "ok",
          triggered: summaryResult.value.triggered,
          reason: summaryResult.value.triggerReason,
        }
      : {
          status: "error",
          error:
            summaryResult.reason instanceof Error
              ? summaryResult.reason.message
              : String(summaryResult.reason),
        };

  const prospectiveOutcome =
    prospectiveResult.status === "fulfilled"
      ? { status: "ok" }
      : {
          status: "error",
          error:
            prospectiveResult.reason instanceof Error
              ? prospectiveResult.reason.message
              : String(prospectiveResult.reason),
        };

  logger.info("✅ Post-turn processing complete:", {
    userId,
    conversationId,
    elapsedMs: elapsed,
    summary: summaryOutcome,
    prospective: prospectiveOutcome,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      summary: summaryOutcome,
      prospective: prospectiveOutcome,
    }),
  };
};
