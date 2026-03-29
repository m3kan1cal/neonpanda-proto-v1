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
  queryPineconeContext,
  GuardrailInterventionError,
} from "../libs/api-helpers";
import { formatPineconeContext } from "../libs/pinecone-utils";
import { getUserTimezoneOrDefault } from "../libs/analytics/date-utils";
import { getTodoProgress } from "../libs/program-designer/todo-list-utils";
import { saveSessionAndTriggerProgramGeneration } from "../libs/program-designer/session-management";
import { generateProgramId } from "../libs/id-utils";
import {
  getCoachConfig,
  getUserProfile,
  getProgramDesignerSession,
  saveProgramDesignerSession,
} from "../../dynamodb/operations";
import {
  CoachMessage,
  MESSAGE_TYPES,
  CONVERSATION_MODES,
} from "../libs/coach-conversation/types";
import { isProgramDesignCommand } from "../libs/program-designer";
import { parseSlashCommand } from "../libs/workout";

// V2 agent imports
import { StreamingConversationAgent } from "../libs/agents/conversation/agent";
import type { ProgramDesignerSessionAgentContext } from "../libs/agents/program-designer-session/types";
import { programDesignerSessionAgentTools } from "../libs/agents/program-designer-session/tools";
import {
  buildProgramDesignerSessionAgentPrompt,
  selectModelForProgramDesignerAgent,
} from "../libs/agents/program-designer-session/prompts";
import { buildProgramDesignerMessagesWithCaching } from "../libs/agents/program-designer-session/helpers";
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
  formatMetadataEvent,
  formatCompleteEvent,
  formatAuthErrorEvent,
  formatValidationErrorEvent,
  formatGuardrailWarningEvent,
  validateStreamingRequestBody,
} from "../libs/streaming";

// Use centralized route pattern constant - matches CoachCreator session-based pattern
const PROGRAM_DESIGNER_SESSION_ROUTE =
  STREAMING_ROUTE_PATTERNS.PROGRAM_DESIGNER_SESSION ||
  "/users/{userId}/program-designer-sessions/{sessionId}/stream";

async function loadSessionData(
  userId: string,
  sessionId: string,
): Promise<{
  programSession: any;
  coachConfig: any;
  userProfile: any;
}> {
  // Load program designer session
  let programSession = await getProgramDesignerSession(userId, sessionId);

  // If session doesn't exist, this is an error (session should be created before first message)
  if (!programSession) {
    throw new Error(
      `Program designer session not found: ${sessionId}. Session must be created before sending messages.`,
    );
  }

  logger.info("✅ Program designer session loaded:", {
    sessionId: programSession.sessionId,
    userId: programSession.userId,
    isComplete: programSession.isComplete,
    turnCount: programSession.turnCount,
    conversationHistoryLength: programSession.conversationHistory?.length || 0,
  });

  // Validate session has required coachId (handles legacy/corrupt sessions)
  if (!programSession.coachId) {
    throw new Error(
      "Program designer session is missing coachId. This session may be from an older version. Please delete this session and start a new one.",
    );
  }

  // Get coach config from session (coachId is stored in session, not in route)
  const coachConfig = await getCoachConfig(userId, programSession.coachId);
  if (!coachConfig) {
    throw new Error(
      `Coach configuration not found for coachId: ${programSession.coachId}`,
    );
  }

  const userProfile = await getUserProfile(userId);

  return {
    programSession,
    coachConfig,
    userProfile: userProfile || undefined,
  };
}

// ============================================================================
// V2: Agent-based handler  (DEFAULT)
// ============================================================================

/**
 * Agent-based program designer event stream.
 *
 * Mirrors createCoachCreatorEventStreamV2 from stream-coach-creator-session.
 * Key differences from coach creator:
 *   - Uses ProgramDesignerSessionAgentContext with coachId/coachPersonality
 *   - Saves ProgramDesignerSession (not CoachCreatorSession)
 *   - Progress tracking via getTodoProgress() → progressDetails in complete event
 *   - Slash command check pre-agent (same as V1)
 *   - complete_design tool handles additionalConsiderations + generation trigger
 */
async function* createProgramDesignerEventStreamV2(
  event: AuthenticatedLambdaFunctionURLEvent,
  _context: Context,
): AsyncGenerator<string, void, unknown> {
  // 1. Yield start event immediately
  yield formatStartEvent();
  logger.info("📡 V2: Yielded start event");

  try {
    // 2. Validate and extract params (enable images in V2)
    const pathParams = extractPathParameters(
      event.rawPath,
      PROGRAM_DESIGNER_SESSION_ROUTE,
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
    const [sessionData, pineconeResult] = await Promise.all([
      loadSessionData(userId as string, sessionId as string),
      queryPineconeContext(
        userId as string,
        `User training history, preferences, goals, and coaching discussions for program design: ${userResponse}`,
        {
          workoutTopK: 5,
          conversationTopK: 5,
          programTopK: 3,
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

    const { programSession, coachConfig, userProfile } = sessionData;

    logger.info("✅ V2: Data loaded:", {
      sessionId: programSession.sessionId,
      messageCount: programSession.conversationHistory?.length || 0,
      isComplete: programSession.isComplete,
      hasPinecone: pineconeResult.success && pineconeResult.matches.length > 0,
    });

    // 4. Pre-agent slash command check — same behavior as V1
    const slashCommandResult = parseSlashCommand(userResponse!);
    const isProgramDesignSlashCommand =
      slashCommandResult.isSlashCommand &&
      isProgramDesignCommand(slashCommandResult.command);

    if (isProgramDesignSlashCommand) {
      logger.info("⚡ V2: Restarting session due to slash command");
      programSession.isDeleted = true;
      programSession.completedAt = new Date();
      await saveProgramDesignerSession(programSession);
      yield formatCompleteEvent({
        messageId: `restart_${Date.now()}`,
      });
      return;
    }

    // Build Pinecone context string
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

    // 5. Build agent context
    const userTimezone = getUserTimezoneOrDefault(
      (userProfile as any)?.timezone || null,
    );

    const coachPersonality =
      coachConfig?.generated_prompts?.personality_prompt || undefined;

    const criticalTrainingDirective = (userProfile as any)
      ?.criticalTrainingDirective;

    const agentContext: ProgramDesignerSessionAgentContext = {
      userId: userId as string,
      sessionId: sessionId as string,
      userTimezone,
      coachId: programSession.coachId,
      coachName: programSession.coachName || coachConfig?.name || undefined,
      coachPersonality,
      session: programSession, // Mutable — tools mutate session.todoList and session.isComplete
      pineconeContext,
      criticalTrainingDirective,
    };

    // 6. Build system prompts
    const { staticPrompt, dynamicPrompt } =
      buildProgramDesignerSessionAgentPrompt(programSession, {
        userTimezone,
        coachName: agentContext.coachName,
        coachPersonality,
        pineconeContext,
        messageCount: programSession.conversationHistory?.length || 0,
        criticalTrainingDirective,
      });

    logger.info("✅ V2: System prompt built:", {
      staticLength: staticPrompt.length,
      dynamicLength: dynamicPrompt.length,
    });

    // 7. Convert conversation history to Bedrock format with caching
    const cachedMessages = await buildProgramDesignerMessagesWithCaching(
      programSession.conversationHistory || [],
    );

    // 8. Select model
    const modelId = selectModelForProgramDesignerAgent(
      programSession.conversationHistory?.length || 0,
      hasImages,
    );

    logger.info("✅ V2: Model selected:", {
      modelId:
        modelId === MODEL_IDS.PLANNER_MODEL_FULL
          ? MODEL_IDS.PLANNER_MODEL_DISPLAY + " (Sonnet 4.5)"
          : MODEL_IDS.EXECUTOR_MODEL_DISPLAY + " (Haiku 4.5)",
      reason:
        (programSession.conversationHistory?.length || 0) > 20
          ? "long conversation (>20 messages)"
          : hasImages
            ? "multimodal (has images)"
            : "standard turn",
    });

    // 9. Create agent
    const agent =
      new StreamingConversationAgent<ProgramDesignerSessionAgentContext>({
        staticPrompt,
        dynamicPrompt,
        tools: programDesignerSessionAgentTools,
        modelId,
        context: agentContext,
        existingMessages: cachedMessages,
      });

    // 10. Emit metadata event before streaming (sets mode on frontend)
    const initialProgress = getTodoProgress(programSession.todoList);
    yield formatMetadataEvent({
      mode: CONVERSATION_MODES.PROGRAM_DESIGN,
      progress: {
        questionsCompleted: initialProgress.requiredCompleted,
        estimatedTotal: initialProgress.requiredTotal,
        percentage: initialProgress.requiredPercentage,
      },
    });

    // 11. Stream agent response
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

    // 12. Build messages to save in conversation history
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userResponse!,
      timestamp: messageTimestamp ? new Date(messageTimestamp) : new Date(),
      ...(hasImages
        ? {
            imageS3Keys,
            messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
          }
        : {}),
    };

    const newAiMessage: CoachMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: fullResponseText,
      timestamp: new Date(),
      metadata: {
        mode: CONVERSATION_MODES.PROGRAM_DESIGN,
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

    // 13. Update session state from agent context (tools mutated session in-place)
    //     Then append the new messages and save
    programSession.conversationHistory =
      programSession.conversationHistory || [];
    programSession.conversationHistory.push(newUserMessage, newAiMessage);
    programSession.lastActivity = new Date();
    programSession.turnCount = (programSession.turnCount || 0) + 1;

    // Compute and persist updated progressDetails.
    // Use required-field counts so percentage reflects only the 19 required fields
    // and reaches 100% when all required fields are collected (not the optional targetEvent).
    const progress = getTodoProgress(agentContext.session.todoList);
    programSession.progressDetails = {
      itemsCompleted: progress.requiredCompleted,
      totalItems: progress.requiredTotal,
      percentage: progress.requiredPercentage,
    };

    // Build generation payload AFTER messages are appended so conversationContext
    // includes the full history including this turn's exchange.
    // Mirrors coach creator: complete_design just sets isComplete=true, handler
    // always calls saveSessionAndTriggerProgramGeneration with the isComplete flag.
    const buildEvent = programSession.isComplete
      ? {
          userId: userId as string,
          coachId: programSession.coachId,
          programId: generateProgramId(userId as string),
          sessionId: sessionId as string,
          todoList: agentContext.session.todoList,
          conversationContext: programSession.conversationHistory
            .map((m: any) => `${m.role}: ${m.content}`)
            .join("\n\n"),
          additionalConsiderations:
            programSession.additionalConsiderations || "none",
        }
      : undefined;

    // Always save — handler owns the single save call for this turn.
    // saveSessionAndTriggerProgramGeneration handles idempotency, the
    // IN_PROGRESS lock, and async Lambda invocation when isComplete is true.
    const saveResult = await saveSessionAndTriggerProgramGeneration(
      userId as string,
      programSession,
      programSession.isComplete,
      buildEvent,
    );

    logger.info("✅ V2: Session saved:", {
      isComplete: programSession.isComplete,
      programGenerating:
        programSession.programGeneration?.status === "IN_PROGRESS",
      programId: saveResult?.programId,
      alreadyGenerating: saveResult?.alreadyGenerating,
      progressPercentage: programSession.progressDetails.percentage,
    });

    // 14. Emit updated progress metadata after agent completes
    yield formatMetadataEvent({
      mode: CONVERSATION_MODES.PROGRAM_DESIGN,
      progress: {
        questionsCompleted: progress.requiredCompleted,
        estimatedTotal: progress.requiredTotal,
        percentage: progress.requiredPercentage,
      },
    });

    // 15. Yield complete event
    yield formatCompleteEvent({
      messageId: newAiMessage.id,
      type: "complete",
      fullMessage: fullResponseText,
      aiResponse: fullResponseText,
      isComplete: programSession.isComplete,
      progressDetails: programSession.progressDetails,
      mode: CONVERSATION_MODES.PROGRAM_DESIGN,
      programDesignerSession: !programSession.isComplete
        ? programSession
        : undefined,
      programGenerating: programSession.isComplete && !saveResult?.programId,
      programId:
        saveResult?.programId ||
        buildEvent?.programId ||
        (programSession.programGeneration?.status === "COMPLETE"
          ? (programSession.programGeneration as any).programId
          : undefined),
      metadata: {
        programCollectionInProgress: !programSession.isComplete,
        programGenerationTriggered: programSession.isComplete,
      },
    });

    logger.info("✅ V2: Program designer agent handler completed successfully");
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
  logger.info("🎬 Starting program designer session streaming handler");

  try {
    const eventGenerator = createProgramDesignerEventStreamV2(event, context);
    const sseEventStream = Readable.from(eventGenerator);
    await pipeline(sseEventStream, responseStream);

    logger.info("✅ Streaming pipeline completed successfully");

    // FIX: Prevent Lambda from hanging - all streaming is complete, don't wait for event loop
    context.callbackWaitsForEmptyEventLoop = false;
  } catch (error) {
    logger.error("❌ Fatal error in streaming handler:", error);
    // Error will be caught by Lambda runtime
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

    // Apply authentication middleware
    return await withStreamingAuth(internalStreamingHandler, {
      allowInternalCalls: false,
      requireUserId: true,
      validateUserIdMatch: true,
      routePattern: PROGRAM_DESIGNER_SESSION_ROUTE,
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
