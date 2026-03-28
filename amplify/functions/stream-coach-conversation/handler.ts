import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";
import { logger } from "../libs/logger";

const { Readable } = stream;
const pipeline = util.promisify(stream.pipeline);

// awslambda is a global object provided by Lambda's Node.js runtime environment
// No import or declaration is required - it's automatically available

// Import business logic utilities
import {
  MODEL_IDS,
  AI_ERROR_FALLBACK_MESSAGE,
  GuardrailInterventionError,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import {
  getCoachConversation,
  sendCoachConversationMessage,
  getCoachConfig,
  getUserProfile,
  getCoachConversationSummary,
} from "../../dynamodb/operations";
import {
  CoachMessage,
  MESSAGE_TYPES,
  CONVERSATION_MODES,
} from "../libs/coach-conversation/types";
import { queryPrograms } from "../../dynamodb/program";
import {
  queryMemories as queryMemoriesFromDb,
  queryEmotionalSnapshots,
  getLatestEmotionalTrend,
} from "../../dynamodb/memory";
import { formatEmotionalContextForPrompt } from "../libs/memory/emotional";
import { formatLivingProfileForPrompt } from "../libs/user/living-profile";
import {
  filterActiveProspectiveMemories,
  formatProspectiveMemoriesForPrompt,
} from "../libs/memory/prospective";
import { formatConversationSummaryForPrompt } from "../libs/coach-conversation/summary";
import { buildMessagesWithCaching } from "../libs/agents/shared/message-caching";
import { getUserTimezoneOrDefault } from "../libs/analytics/date-utils";
import { StreamingConversationAgent } from "../libs/agents/conversation/agent";
import {
  buildConversationAgentPrompt,
  selectModelForConversationAgent,
} from "../libs/agents/conversation/prompts";
import { conversationAgentTools } from "../libs/agents/conversation/tools";
import type {
  ConversationAgentContext,
  ConversationAgentResult,
} from "../libs/agents/conversation/types";

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
  formatMetadataEvent,
  formatCompleteEvent,
  formatAuthErrorEvent,
  formatValidationErrorEvent,
  formatGuardrailWarningEvent,
  validateStreamingRequestBody,
  buildMessageContextFromMessages,
} from "../libs/streaming";

// Use centralized route pattern constant
const COACH_CONVERSATION_ROUTE = STREAMING_ROUTE_PATTERNS.COACH_CONVERSATION;

const internalStreamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => {
  logger.info("Starting stream-coach-conversation handler");

  logger.info("Event details:", {
    rawPath: event.rawPath,
    method: event.requestContext.http.method,
    hasBody: !!event.body,
    authenticatedUser: event.user.userId,
  });

  const eventGenerator = createCoachConversationEventStreamV2(event, context);
  const sseEventStream = Readable.from(eventGenerator);
  await pipeline(sseEventStream, responseStream);

  logger.info("✅ Streaming pipeline completed successfully");

  // FIX: Prevent Lambda from hanging - all streaming is complete, don't wait for event loop
  context.callbackWaitsForEmptyEventLoop = false;
};

// ============================================================================
// V2 AGENT HANDLER (Phase 4a)
// ============================================================================

/**
 * V2 Generator function — Streaming Conversation Agent
 *
 * Dramatically simpler than V1 (~100 lines vs ~900 lines):
 * - No Smart Router AI call (eliminated)
 * - No intent classification or procedural branching
 * - No workout session state machine
 * - No separate contextual update generation
 * - Agent model orchestrates itself via tools based on full conversation context
 *
 * Flow per plan section 4.1:
 * 1. Yield start event
 * 2. Validate params
 * 3. Load data (DynamoDB only — no Smart Router!)
 * 4. Build agent context
 * 5. Create StreamingConversationAgent
 * 6. Yield agent SSE events directly
 * 7. Save messages
 * 8. Fire-and-forget: conversation summary
 * 9. Yield complete event
 */
async function* createCoachConversationEventStreamV2(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context,
): AsyncGenerator<string, void, unknown> {
  // 1. Yield start event immediately
  yield formatStartEvent();
  logger.info("📡 V2: Yielded start event");

  try {
    // 2. Validate and extract params (using v1 pattern)
    const pathParams = extractPathParameters(
      event.rawPath,
      COACH_CONVERSATION_ROUTE,
    );
    const { userId, coachId, conversationId } = pathParams;

    if (!userId || !coachId || !conversationId) {
      yield formatValidationErrorEvent(
        new Error("Missing required path parameters"),
      );
      return;
    }

    const { userResponse, imageS3Keys } = validateStreamingRequestBody(
      event.body,
      userId,
      {
        requireUserResponse: true,
        maxImages: 5,
      },
    );

    const params = {
      userResponse,
      imageS3Keys,
    };

    logger.info("✅ V2: Params validated:", {
      userId,
      coachId,
      conversationId,
      messageLength: params.userResponse.length,
      hasImages: !!(params.imageS3Keys && params.imageS3Keys.length > 0),
    });

    const timings: Record<string, number> = {};
    const mark = (label: string, start: number) => {
      timings[label] = Date.now() - start;
    };

    // 3. Parallel data loading (DynamoDB only — no Smart Router!)
    let stepStart = Date.now();
    const [
      userProfile,
      existingConversation,
      coachConfig,
      activeProgramResult,
      emotionalSnapshots,
      emotionalTrend,
      prospectiveMemoriesRaw,
      conversationSummary,
    ] = await Promise.all([
      getUserProfile(userId),
      getCoachConversation(userId, coachId, conversationId),
      getCoachConfig(userId, coachId),
      queryPrograms(userId, { includeStatus: ["active"], limit: 1 }),
      queryEmotionalSnapshots(userId, undefined, { limit: 5 }).catch(() => []),
      getLatestEmotionalTrend(userId, "weekly").catch(() => null),
      queryMemoriesFromDb(userId, coachId, { memoryType: "prospective" }).catch(
        () => [],
      ),
      getCoachConversationSummary(userId, conversationId).catch(() => null),
    ]);

    mark("dataLoading", stepStart);

    if (!existingConversation || !coachConfig) {
      throw new Error("Failed to load conversation or coach config");
    }

    // 4. Build agent context
    const emotionalContext = formatEmotionalContextForPrompt(
      emotionalSnapshots,
      emotionalTrend,
    );

    const livingProfileContext = userProfile?.livingProfile
      ? formatLivingProfileForPrompt(userProfile.livingProfile)
      : undefined;

    const activeProspectiveMemories = filterActiveProspectiveMemories(
      prospectiveMemoriesRaw,
    );
    const prospectiveContext =
      activeProspectiveMemories.length > 0
        ? formatProspectiveMemoriesForPrompt(activeProspectiveMemories)
        : undefined;

    const conversationSummaryContext =
      formatConversationSummaryForPrompt(conversationSummary);

    logger.info("✅ V2: Data loaded:", {
      hasUserProfile: !!userProfile,
      existingMessageCount: existingConversation.messages.length,
      hasActiveProgram: activeProgramResult.length > 0,
      hasLivingProfile: !!userProfile?.livingProfile,
      activeProspectiveCount: activeProspectiveMemories.length,
      hasConversationSummary: !!conversationSummary,
    });

    const userTimezone = getUserTimezoneOrDefault(
      (userProfile as any)?.timezone || null,
    );
    const activeProgram = activeProgramResult[0] || null;

    // Transform critical training directive to expected format
    const criticalDirective = userProfile?.criticalTrainingDirective
      ? {
          enabled: userProfile.criticalTrainingDirective.enabled,
          directive: userProfile.criticalTrainingDirective.content,
        }
      : undefined;

    // Collect images from user messages since the last logged workout.
    // findLastIndex locates the most recent assistant message that used log_workout;
    // we only gather user-attached images AFTER that boundary to avoid leaking
    // images from previously logged workouts into the current one.
    const messages = existingConversation.messages;
    let lastLogWorkoutIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i] as CoachMessage;
      if (
        m.role === "assistant" &&
        (m.metadata as any)?.agent?.toolsUsed?.includes("log_workout")
      ) {
        lastLogWorkoutIndex = i;
        break;
      }
    }

    const messagesSinceLastLog =
      lastLogWorkoutIndex >= 0
        ? existingConversation.messages.slice(lastLogWorkoutIndex + 1)
        : existingConversation.messages;

    const historicalImageKeys = messagesSinceLastLog
      .filter((m: CoachMessage) => m.role === "user" && m.imageS3Keys?.length)
      .flatMap((m: CoachMessage) => m.imageS3Keys!);

    const allImageS3Keys = [
      ...new Set([...(params.imageS3Keys ?? []), ...historicalImageKeys]),
    ];

    // Cap accumulated images to 5 (matching log-workout-template constraint)
    // to prevent unbounded image accumulation from multiple user messages
    const cappedImageS3Keys = allImageS3Keys.slice(0, 5);
    const imageCountTruncated = allImageS3Keys.length > 5;

    if (cappedImageS3Keys.length > 0) {
      logger.info("V2: Image S3 keys collected for agent context", {
        currentMessageImages: params.imageS3Keys?.length ?? 0,
        historicalImages: historicalImageKeys.length,
        totalUniqueImages: allImageS3Keys.length,
        cappedToMaxImages: cappedImageS3Keys.length,
        imageCountTruncated,
        lastLogWorkoutBoundaryIndex: lastLogWorkoutIndex,
      });
    }

    const agentContext: ConversationAgentContext = {
      userId,
      coachId,
      conversationId,
      coachConfig,
      userTimezone,
      criticalTrainingDirective: criticalDirective,
      activeProgram: activeProgram
        ? {
            programId: activeProgram.programId,
            programName: activeProgram.name || "Active Program",
            currentDay: activeProgram.currentDay || 1,
            totalDays: activeProgram.totalDays || 1,
            status: activeProgram.status || "active",
            completedWorkouts: activeProgram.completedWorkouts || 0,
            totalWorkouts: activeProgram.totalWorkouts || 0,
            s3DetailKey: activeProgram.s3DetailKey,
            phases: activeProgram.phases || [],
          }
        : null,
      ...(cappedImageS3Keys.length && { imageS3Keys: cappedImageS3Keys }),
    };

    // 5. Build system prompt
    stepStart = Date.now();
    const { staticPrompt, dynamicPrompt } = buildConversationAgentPrompt(
      coachConfig,
      {
        userProfile: userProfile || undefined,
        userTimezone,
        criticalTrainingDirective: criticalDirective,
        activeProgram: agentContext.activeProgram,
        coachCreatorSessionSummary:
          coachConfig.metadata?.coach_creator_session_summary,
        conversationSummaryContext,
        emotionalContext: emotionalContext || undefined,
        livingProfileContext,
        prospectiveContext,
      },
    );

    mark("promptBuild", stepStart);

    logger.info("✅ V2: System prompt built:", {
      staticLength: staticPrompt.length,
      dynamicLength: dynamicPrompt.length,
    });

    // 6. Build conversation history with caching
    stepStart = Date.now();
    const cachedMessages = await buildMessagesWithCaching(
      existingConversation.messages,
      "coach conversation",
    );

    mark("historyCaching", stepStart);

    // 7. Select model
    const modelId = selectModelForConversationAgent(
      existingConversation.messages.length,
      !!(params.imageS3Keys && params.imageS3Keys.length > 0),
    );

    logger.info("✅ V2: Model selected:", {
      modelId:
        modelId === MODEL_IDS.PLANNER_MODEL_FULL
          ? MODEL_IDS.PLANNER_MODEL_DISPLAY + " (Sonnet 4.5)"
          : MODEL_IDS.EXECUTOR_MODEL_DISPLAY + " (Haiku 4.5)",
      reason:
        existingConversation.messages.length > 20
          ? "long conversation (>20 messages)"
          : params.imageS3Keys && params.imageS3Keys.length > 0
            ? "multimodal (has images)"
            : "simple conversation",
    });

    // 8. Create agent
    const agent = new StreamingConversationAgent({
      staticPrompt,
      dynamicPrompt,
      tools: conversationAgentTools,
      modelId,
      context: agentContext,
      existingMessages: cachedMessages,
    });

    // 9. Yield metadata event (mode = chat, agent handles mode contextually)
    yield formatMetadataEvent({ mode: CONVERSATION_MODES.CHAT });

    // 10. Stream agent response — yields SSE events directly
    logger.info("🤖 V2: Starting agent stream");
    logger.info("⏱️ V2: Pre-stream timings (ms):", timings);

    stepStart = Date.now();

    let fullResponseText = "";
    let toolsUsed: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterationCount = 0;
    let guardrailWarning = false;

    try {
      const agentGenerator = agent.converseStream(
        params.userResponse,
        params.imageS3Keys,
      );

      // Consume the generator and capture the return value
      let result = await agentGenerator.next();
      while (!result.done) {
        yield result.value; // Yield SSE events
        result = await agentGenerator.next();
      }

      // Capture the final result from the generator's return value
      const agentResult: ConversationAgentResult = result.value;
      fullResponseText = agentResult.fullResponseText;
      toolsUsed = agentResult.toolsUsed;
      totalInputTokens = agentResult.totalInputTokens;
      totalOutputTokens = agentResult.totalOutputTokens;
      iterationCount = agentResult.iterationCount;

      mark("agentStream", stepStart);

      logger.info("✅ V2: Agent stream completed:", {
        responseLength: fullResponseText.length,
        toolsUsed,
        totalInputTokens,
        totalOutputTokens,
        iterationCount,
        timingsMs: timings,
      });
    } catch (agentError) {
      if (agentError instanceof GuardrailInterventionError) {
        // Content already streamed in ASYNC mode — emit a warning event and continue
        // saving the response so the conversation is preserved alongside the warning.
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

    // 11. Build and save messages
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: params.userResponse,
      timestamp: new Date(),
      ...(params.imageS3Keys && params.imageS3Keys.length > 0
        ? {
            imageS3Keys: params.imageS3Keys,
            messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
          }
        : {}),
      ...(guardrailWarning ? { metadata: { guardrailWarning: true } } : {}),
    };

    const newAiMessage: CoachMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: fullResponseText,
      timestamp: new Date(),
      metadata: {
        model:
          modelId === MODEL_IDS.PLANNER_MODEL_FULL
            ? MODEL_IDS.PLANNER_MODEL_DISPLAY
            : MODEL_IDS.EXECUTOR_MODEL_DISPLAY,
        mode: CONVERSATION_MODES.CHAT,
        tokens: totalInputTokens + totalOutputTokens,
        ...(guardrailWarning ? { guardrailWarning: true } : {}),
      } as any, // Use type assertion to allow agent-specific metadata
    };

    // Add agent-specific metadata separately
    (newAiMessage.metadata as any).agent = {
      toolsUsed,
      totalInputTokens,
      totalOutputTokens,
      iterationCount,
    };

    // 12. Save to DynamoDB
    const saveResult = await sendCoachConversationMessage(
      userId,
      coachId,
      conversationId,
      [newUserMessage, newAiMessage],
    );

    logger.info("✅ V2: Messages saved to DynamoDB");

    // Extract size information from the save result
    const itemSizeKb = parseFloat(
      saveResult?.dynamodbResult?.itemSizeKB || "0",
    );
    const sizePercentage = Math.min(Math.round((itemSizeKb / 400) * 100), 100);
    const isApproachingLimit = itemSizeKb > 350;

    logger.info("📊 V2: Conversation size:", {
      sizeKB: itemSizeKb,
      percentage: sizePercentage,
      isApproachingLimit,
      maxSizeKB: 400,
    });

    // 13. Invoke post-turn Lambda (awaited so the SDK call completes before the runtime freezes).
    // invokeAsyncLambda uses InvocationType.Event — it returns as soon as AWS accepts the
    // invocation (~50ms), not when process-post-turn finishes. The user's stream is unaffected
    // since this runs before the complete event is yielded in step 14.
    const postTurnFunctionName = process.env.PROCESS_POST_TURN_FUNCTION_NAME;
    if (postTurnFunctionName) {
      await invokeAsyncLambda(
        postTurnFunctionName,
        {
          userId,
          coachId,
          conversationId,
          userMessage: params.userResponse,
          aiResponse: newAiMessage.content,
          currentMessageCount: existingConversation.messages.length + 2,
        },
        `post-turn processing for conversation ${conversationId}`,
      ).catch((err) => {
        logger.error(
          "⚠️ Failed to invoke process-post-turn (non-blocking):",
          err,
        );
      });
    } else {
      logger.warn(
        "⚠️ PROCESS_POST_TURN_FUNCTION_NAME not set — skipping post-turn processing",
      );
    }

    // 14. Yield complete event
    yield formatCompleteEvent({
      messageId: newAiMessage.id,
      userMessage: newUserMessage,
      aiMessage: newAiMessage,
      conversationId,
      conversationSize: {
        sizeKB: itemSizeKb,
        percentage: sizePercentage,
        maxSizeKB: 400,
        isApproachingLimit,
      },
    });

    logger.info("✅ V2: Agent handler completed successfully");
  } catch (error) {
    logger.error("❌ V2: Error in agent handler:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during conversation processing";

    yield formatCompleteEvent({
      messageId: "",
      userMessage: null,
      aiMessage: {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: AI_ERROR_FALLBACK_MESSAGE,
        timestamp: new Date(),
        metadata: {
          error: errorMessage,
        },
      },
      conversationId: "",
    });
  }
}

// Streaming headers (CORS handled by Lambda Function URL configuration)
const STREAMING_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// Create the final handler that wraps authentication with error handling
const authenticatedStreamingHandler = async (
  event: any,
  responseStream: any,
  context: Context,
) => {
  // Set streaming headers (CORS headers are handled by Lambda Function URL CORS config)
  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: STREAMING_HEADERS,
  });

  try {
    // Check if this is a health check or OPTIONS request (these don't have proper paths/auth)
    const method = event.requestContext?.http?.method;
    const path = event.rawPath || "";

    if (!path || path === "/" || method === "OPTIONS") {
      logger.info("⚠️ Ignoring health check or OPTIONS request:", {
        method,
        path,
      });
      // Just close the stream for these requests
      responseStream.end();
      return;
    }

    // OPTIONS requests are handled automatically by Lambda Function URL CORS config
    logger.info("🚀 Processing streaming request:", {
      method,
      path,
    });

    // Call the authenticated handler
    return await withStreamingAuth(internalStreamingHandler, {
      allowInternalCalls: false,
      requireUserId: true,
      validateUserIdMatch: true,
      routePattern: COACH_CONVERSATION_ROUTE,
    })(event, responseStream, context);
  } catch (error) {
    logger.error("❌ Authentication error:", error);

    // Create error stream using pipeline approach
    const errorEvent = formatAuthErrorEvent(
      error instanceof Error ? error : new Error("Authentication failed"),
    );

    const errorStream = Readable.from([errorEvent]);
    await pipeline(errorStream, responseStream);
  }
};

// Use awslambda.streamifyResponse to enable streaming responses
// awslambda is a global object provided by Lambda's Node.js runtime
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

// Check if awslambda global is available and has streamifyResponse
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
