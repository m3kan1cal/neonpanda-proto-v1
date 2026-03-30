import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";
import { logger } from "../libs/logger";

const { Readable } = stream;
const pipeline = util.promisify(stream.pipeline);

// awslambda is a global object provided by Lambda's Node.js runtime environment
// No import or declaration is required - it's automatically available

// Import business logic utilities
import { saveSessionAndTriggerCoachConfig } from "../libs/coach-creator/session-management";
import {
  queryPineconeContext,
  MODEL_IDS,
  GuardrailInterventionError,
} from "../libs/api-helpers";
import { formatPineconeContext } from "../libs/pinecone-utils";
import { getUserTimezoneOrDefault } from "../libs/analytics/date-utils";
import {
  saveCoachCreatorSession,
  getUserProfile,
  getCoachCreatorSession,
} from "../../dynamodb/operations";
import { getTodoProgress } from "../libs/coach-creator/todo-list-utils";

// V2 agent imports
import { StreamingConversationAgent } from "../libs/agents/conversation/agent";
import type { CoachCreatorSessionAgentContext } from "../libs/agents/coach-creator-session/types";
import { coachCreatorSessionAgentTools } from "../libs/agents/coach-creator-session/tools";
import {
  buildCoachCreatorSessionAgentPrompt,
  selectModelForCoachCreatorAgent,
} from "../libs/agents/coach-creator-session/prompts";
import { buildCoachCreatorMessagesWithCaching } from "../libs/agents/coach-creator-session/helpers";
import type { ConversationAgentResult } from "../libs/agents/core/types";

// Import auth middleware (consolidated)
import {
  withStreamingAuth,
  type AuthenticatedLambdaFunctionURLEvent,
  type StreamingHandler,
} from "../libs/auth/middleware";

// Import streaming utilities
import {
  extractPathParameters,
  validateRequiredPathParams,
  STREAMING_ROUTE_PATTERNS,
  formatStartEvent,
  formatCompleteEvent,
  formatValidationErrorEvent,
  formatAuthErrorEvent,
  formatGuardrailWarningEvent,
  validateStreamingRequestBody,
} from "../libs/streaming";

// Route pattern for coach creator sessions
const COACH_CREATOR_SESSION_ROUTE =
  STREAMING_ROUTE_PATTERNS.COACH_CREATOR_SESSION ||
  "/users/{userId}/coach-creator-sessions/{sessionId}/stream";

// ============================================================================
// V2: Agent-based handler  (DEFAULT)
// ============================================================================

/**
 * Agent-based coach creator event stream.
 *
 * Mirrors createCoachConversationEventStreamV2 from stream-coach-conversation.
 * Key differences:
 *   - Uses CoachCreatorSessionAgentContext instead of ConversationAgentContext
 *   - Saves CoachCreatorSession (not CoachConversation)
 *   - Progress tracking via getTodoProgress() → progressDetails in complete event
 *   - No coachId/conversationId path params (sessionId only)
 */
async function* createCoachCreatorEventStreamV2(
  event: AuthenticatedLambdaFunctionURLEvent,
  _context: Context,
): AsyncGenerator<string, void, unknown> {
  // 1. Yield start event immediately
  yield formatStartEvent();
  logger.info("📡 V2: Yielded start event");

  try {
    // 2. Validate and extract params
    const pathParams = extractPathParameters(
      event.rawPath,
      COACH_CREATOR_SESSION_ROUTE,
    );
    const { userId, sessionId } = pathParams;

    if (!userId || !sessionId) {
      yield formatValidationErrorEvent(
        new Error("Missing required path parameters"),
      );
      return;
    }

    const { userResponse, messageTimestamp, imageS3Keys } =
      validateStreamingRequestBody(event.body, userId as string, {
        requireUserResponse: true,
        maxImages: 5,
        isBase64Encoded: event.isBase64Encoded,
      });

    const hasImages = !!(imageS3Keys && imageS3Keys.length > 0);

    logger.info("✅ V2: Params validated:", {
      userId,
      sessionId,
      messageLength: userResponse?.length || 0,
      hasImages,
    });

    // 3. Parallel data loading
    const [session, userProfile, pineconeResult] = await Promise.all([
      getCoachCreatorSession(userId as string, sessionId as string),
      getUserProfile(userId as string),
      queryPineconeContext(
        userId as string,
        `User fitness background, training history, goals, and preferences for coach creation: ${userResponse}`,
        {
          workoutTopK: 3,
          conversationTopK: 3,
          programTopK: 2,
          coachCreatorTopK: 2,
          programDesignerTopK: 2,
          userMemoryTopK: 2,
          includeMethodology: false,
          minScore: 0.5,
        },
      ).catch((error) => {
        logger.warn(
          "⚠️ V2: Pinecone query failed, continuing without context:",
          error,
        );
        return {
          success: false,
          matches: [],
          totalMatches: 0,
          relevantMatches: 0,
        };
      }),
    ]);

    if (!session) {
      throw new Error("Session not found or expired");
    }

    logger.info("✅ V2: Data loaded:", {
      messageCount: session.conversationHistory.length,
      sophisticationLevel: session.sophisticationLevel,
      hasPinecone: pineconeResult.success && pineconeResult.matches.length > 0,
    });

    const rawPineconeContext =
      pineconeResult.success && pineconeResult.matches.length > 0
        ? formatPineconeContext(pineconeResult.matches)
        : "";

    const MAX_PINECONE_CONTEXT_CHARS = 6000;
    const pineconeContext =
      rawPineconeContext.length > MAX_PINECONE_CONTEXT_CHARS
        ? rawPineconeContext.slice(0, MAX_PINECONE_CONTEXT_CHARS) +
          "\n[...context truncated for brevity]"
        : rawPineconeContext;

    if (rawPineconeContext.length > MAX_PINECONE_CONTEXT_CHARS) {
      logger.info("⚠️ V2: Pinecone context truncated:", {
        originalChars: rawPineconeContext.length,
        cappedChars: MAX_PINECONE_CONTEXT_CHARS,
      });
    }

    // 4. Build agent context
    const userTimezone = getUserTimezoneOrDefault(
      (userProfile as any)?.timezone || null,
    );

    const criticalTrainingDirective = (userProfile as any)
      ?.criticalTrainingDirective;

    const agentContext: CoachCreatorSessionAgentContext = {
      userId: userId as string,
      sessionId: sessionId as string,
      userTimezone,
      session, // Mutable — tools mutate session.todoList and session.isComplete
      pineconeContext,
      criticalTrainingDirective,
    };

    // 5. Build system prompts
    const { staticPrompt, dynamicPrompt } = buildCoachCreatorSessionAgentPrompt(
      session,
      {
        userTimezone,
        pineconeContext,
        messageCount: session.conversationHistory.length,
        criticalTrainingDirective,
      },
    );

    logger.info("✅ V2: System prompt built:", {
      staticLength: staticPrompt.length,
      dynamicLength: dynamicPrompt.length,
    });

    // 6. Convert conversation history to Bedrock format with caching
    const cachedMessages = await buildCoachCreatorMessagesWithCaching(
      session.conversationHistory,
    );

    // 7. Select model
    const modelId = selectModelForCoachCreatorAgent(
      session.conversationHistory.length,
      hasImages,
    );

    logger.info("✅ V2: Model selected:", {
      modelId:
        modelId === MODEL_IDS.PLANNER_MODEL_FULL
          ? MODEL_IDS.PLANNER_MODEL_DISPLAY + " (Sonnet 4.5)"
          : MODEL_IDS.EXECUTOR_MODEL_DISPLAY + " (Haiku 4.5)",
      reason:
        session.conversationHistory.length > 20
          ? "long conversation (>20 messages)"
          : hasImages
            ? "multimodal (has images)"
            : "standard turn",
    });

    // 8. Create agent
    const agent =
      new StreamingConversationAgent<CoachCreatorSessionAgentContext>({
        staticPrompt,
        dynamicPrompt,
        tools: coachCreatorSessionAgentTools,
        modelId,
        context: agentContext,
        existingMessages: cachedMessages,
      });

    // 9. Stream agent response
    logger.info("🤖 V2: Starting agent stream");

    let fullResponseText = "";
    let toolsUsed: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterationCount = 0;
    let guardrailWarning = false;

    try {
      const agentGenerator = agent.converseStream(userResponse!, imageS3Keys);

      let result = await agentGenerator.next();
      while (!result.done) {
        yield result.value;
        result = await agentGenerator.next();
      }

      const agentResult: ConversationAgentResult = result.value;
      fullResponseText = agentResult.fullResponseText;
      toolsUsed = agentResult.toolsUsed;
      totalInputTokens = agentResult.totalInputTokens;
      totalOutputTokens = agentResult.totalOutputTokens;
      iterationCount = agentResult.iterationCount;

      logger.info("✅ V2: Agent stream completed:", {
        responseLength: fullResponseText.length,
        toolsUsed,
        totalInputTokens,
        totalOutputTokens,
        iterationCount,
      });
    } catch (agentError) {
      if (agentError instanceof GuardrailInterventionError) {
        logger.warn(
          "🛡️ V2: Guardrail intervened (ASYNC) — emitting warning event",
        );
        guardrailWarning = true;
        fullResponseText = agent.getFullResponseText();
        yield formatGuardrailWarningEvent();
      } else {
        logger.error("❌ V2: Agent stream error:", agentError);
        throw agentError;
      }
    }

    // 10. Build messages to save in conversation history
    const newUserMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user" as const,
      content: userResponse!,
      timestamp: messageTimestamp ? new Date(messageTimestamp) : new Date(),
      ...(hasImages
        ? {
            imageS3Keys,
            messageType: "text_with_images" as const,
          }
        : {}),
    };

    const newAiMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant" as const,
      content: fullResponseText,
      timestamp: new Date(),
      metadata: {
        model:
          modelId === MODEL_IDS.PLANNER_MODEL_FULL
            ? MODEL_IDS.PLANNER_MODEL_DISPLAY
            : MODEL_IDS.EXECUTOR_MODEL_DISPLAY,
        agent: {
          toolsUsed,
          totalInputTokens,
          totalOutputTokens,
          iterationCount,
        },
        ...(guardrailWarning ? { guardrailWarning: true } : {}),
      } as any,
    };

    // 11. Update session state from agent context (tools mutated session in-place)
    //     Then append the new messages and save
    session.conversationHistory.push(newUserMessage, newAiMessage);
    session.lastActivity = new Date();

    // Compute and persist updated progressDetails
    const progress = getTodoProgress(agentContext.session.todoList);
    session.progressDetails = {
      questionsCompleted: progress.completed,
      totalQuestions: progress.total,
      percentage: progress.percentage,
      sophisticationLevel: session.sophisticationLevel,
      currentQuestion: progress.completed + 1,
    };

    // Save the session — if complete_intake ran, session.isComplete is already true.
    // This is the ONLY save call for this turn — messages are appended before saving
    // so they are persisted atomically with any config generation lock.
    const saveResult = await saveSessionAndTriggerCoachConfig(
      userId as string,
      sessionId as string,
      session,
      session.isComplete,
    );

    logger.info("✅ V2: Session saved:", {
      isComplete: session.isComplete,
      coachConfigGenerating: session.configGeneration?.status === "IN_PROGRESS",
      coachConfigId: saveResult.coachConfigId,
      progressPercentage: session.progressDetails.percentage,
    });

    // 12. Yield complete event
    yield formatCompleteEvent({
      messageId: newAiMessage.id,
      type: "complete",
      fullMessage: fullResponseText,
      aiResponse: fullResponseText,
      isComplete: session.isComplete,
      sessionId: sessionId as string,
      progressDetails: session.progressDetails,
      nextQuestion: null,
      coachConfigGenerating:
        session.configGeneration?.status === "IN_PROGRESS" &&
        !saveResult.coachConfigId,
      coachConfigId:
        saveResult.coachConfigId ||
        (session.configGeneration?.status === "COMPLETE"
          ? session.configGeneration.coachConfigId
          : undefined),
    });

    logger.info("✅ V2: Coach creator agent handler completed successfully");
  } catch (error) {
    logger.error("❌ V2: Error in agent handler:", error);
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error("Unknown error occurred"),
    );
    yield errorEvent;
  }
}

// ============================================================================
// Internal streaming handler
// ============================================================================

const internalStreamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => {
  logger.info("🎬 Starting coach creator session streaming handler");

  try {
    const eventGenerator = createCoachCreatorEventStreamV2(event, context);
    const sseEventStream = Readable.from(eventGenerator);
    await pipeline(sseEventStream, responseStream);

    logger.info("✅ Streaming pipeline completed successfully");

    context.callbackWaitsForEmptyEventLoop = false;
  } catch (error) {
    logger.error("❌ Fatal error in streaming handler:", error);
    throw error;
  }
};

// Streaming headers (CORS handled by Lambda Function URL configuration)
const STREAMING_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

/**
 * Authenticated streaming handler
 * Wraps internal handler with auth middleware
 */
const authenticatedStreamingHandler = async (
  event: any,
  responseStream: any,
  context: Context,
) => {
  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: STREAMING_HEADERS,
  });

  try {
    const method = event.requestContext?.http?.method;
    const path = event.rawPath || "";

    if (!path || path === "/" || method === "OPTIONS") {
      logger.info("⚠️ Ignoring health check or OPTIONS request:", {
        method,
        path,
      });
      responseStream.end();
      return;
    }

    logger.info("🚀 Processing streaming request:", { method, path });

    return await withStreamingAuth(internalStreamingHandler, {
      allowInternalCalls: false,
      requireUserId: true,
      validateUserIdMatch: true,
      routePattern: STREAMING_ROUTE_PATTERNS.COACH_CREATOR_SESSION,
    })(event, responseStream, context);
  } catch (error) {
    logger.error("❌ Authentication error:", error);

    const errorEvent = formatAuthErrorEvent(
      error instanceof Error ? error : new Error("Authentication failed"),
    );

    const errorStream = Readable.from([errorEvent]);
    await pipeline(errorStream, responseStream);
  }
};

logger.info(
  "🔧 awslambda global available:",
  typeof (globalThis as any).awslambda !== "undefined",
);
logger.info(
  "🔧 streamifyResponse available:",
  typeof (globalThis as any).awslambda?.streamifyResponse === "function",
);

/* global awslambda */
let handler: any;

if (
  typeof awslambda === "undefined" ||
  typeof awslambda.streamifyResponse !== "function"
) {
  throw new Error(
    "❌ awslambda.streamifyResponse is not available. This function requires Lambda streaming support. " +
      "Ensure the function is deployed with RESPONSE_STREAM invoke mode.",
  );
}

logger.info("✅ Using awslambda.streamifyResponse for streaming mode");
handler = awslambda.streamifyResponse(authenticatedStreamingHandler);

export { handler };
