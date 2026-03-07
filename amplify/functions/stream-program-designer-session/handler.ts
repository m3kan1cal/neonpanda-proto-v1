import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";
import { logger } from "../libs/logger";

const { Readable } = stream;
const pipeline = util.promisify(stream.pipeline);

// awslambda is a global object provided by Lambda's Node.js runtime environment
// No import or declaration is required - it's automatically available

// Import business logic utilities
import { MODEL_IDS, queryPineconeContext } from "../libs/api-helpers";
import { formatPineconeContext } from "../libs/pinecone-utils";
import { getSsmStringList } from "../libs/ssm-utils";
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
import { handleProgramDesignerFlow } from "../libs/program-designer/handler-helpers";
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
  formatChunkEvent,
  formatContextualEvent,
  formatMetadataEvent,
  formatCompleteEvent,
  formatAuthErrorEvent,
  formatValidationErrorEvent,
  validateStreamingRequestBody,
  getRandomCoachAcknowledgement,
  type ConversationData,
  type BusinessLogicParams,
} from "../libs/streaming";

// Program Designer specific ValidationParams (session-based, not conversation-based)
interface ValidationParams {
  userId: string;
  sessionId: string; // Session ID instead of conversationId
  userResponse: string;
  messageTimestamp: string;
  imageS3Keys?: string[];
}

// Use centralized route pattern constant - matches CoachCreator session-based pattern
const PROGRAM_DESIGNER_SESSION_ROUTE =
  STREAMING_ROUTE_PATTERNS.PROGRAM_DESIGNER_SESSION ||
  "/users/{userId}/program-designer-sessions/{sessionId}/stream";

// Extract validation logic
async function validateAndExtractParams(
  event: AuthenticatedLambdaFunctionURLEvent,
  maxImages: number = 0,
): Promise<ValidationParams> {
  // Extract and validate path parameters
  const pathParams = extractPathParameters(
    event.rawPath,
    PROGRAM_DESIGNER_SESSION_ROUTE,
  );
  const { userId, sessionId } = pathParams;

  // Validate required path parameters
  const validation = validateRequiredPathParams(pathParams, [
    "userId",
    "sessionId",
  ]);
  if (!validation.isValid) {
    throw new Error(
      `Missing required path parameters: ${validation.missing.join(", ")}. Expected: ${PROGRAM_DESIGNER_SESSION_ROUTE}`,
    );
  }

  logger.info("✅ Path parameters validated:", {
    userId,
    sessionId,
  });

  // Parse and validate request body using shared utility
  const { userResponse, messageTimestamp, imageS3Keys } =
    validateStreamingRequestBody(event.body, userId as string, {
      requireUserResponse: true,
      maxImages,
    });

  logger.info("✅ Request body validated:", {
    hasUserResponse: !!userResponse,
    hasMessageTimestamp: !!messageTimestamp,
    userResponseLength: userResponse?.length || 0,
    imageCount: imageS3Keys?.length || 0,
  });

  return {
    userId: userId as string,
    sessionId: sessionId as string,
    userResponse,
    messageTimestamp,
    imageS3Keys: imageS3Keys || [],
  };
}

// Extract data loading logic - session-based (no conversation creation)
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
// V1/V2 routing helper
// ============================================================================

/**
 * Check whether this user should be served by the V1 procedural handler.
 *
 * V2 (agent-based) is the default. V1 is the fallback, controlled by the
 * PROGRAM_DESIGNER_V1_FALLBACK_USERS SSM parameter (comma-separated user IDs).
 * Changes take effect within 5 minutes (cache TTL) with no code deploy.
 */
async function shouldUseV1FallbackHandler(userId: string): Promise<boolean> {
  const paramPath = process.env.PROGRAM_DESIGNER_V1_FALLBACK_USERS_PARAM;
  if (!paramPath) {
    return false;
  }
  const fallbackUsers = await getSsmStringList(paramPath);
  return fallbackUsers.has(userId);
}

// ============================================================================
// V1: Existing procedural handler  (renamed, preserved as fallback)
// ============================================================================

/**
 * Generator function that yields SSE events for program designer flow
 * Pattern: Matches coach-creator-session exactly
 */
async function* createProgramDesignerEventStreamV1(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context,
): AsyncGenerator<string, void, unknown> {
  // Yield start event IMMEDIATELY (this happens right away)
  yield formatStartEvent();
  logger.info("📡 V1: Yielded start event immediately");

  try {
    // Validate and extract parameters (no images in V1)
    const params = await validateAndExtractParams(event, 0);

    const { userId, sessionId, userResponse, messageTimestamp } = params;

    logger.info(
      "🚀 V1: Starting program design business logic (Session-Based)",
      {
        userId,
        sessionId,
        userResponseLength: userResponse.length,
      },
    );

    // Yield initial acknowledgment while processing starts
    const acknowledgment = getRandomCoachAcknowledgement();
    yield formatContextualEvent(acknowledgment);
    logger.info(
      `📡 V1: Yielded coach acknowledgment (contextual): "${acknowledgment}"`,
    );

    // Load session data + Pinecone context in parallel
    logger.info("🔄 V1: Loading session data + Pinecone context...");
    const [sessionData, pineconeResult] = await Promise.all([
      loadSessionData(userId, sessionId),
      queryPineconeContext(
        userId,
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
          "⚠️ V1: Pinecone query failed, continuing without context:",
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

    // Format Pinecone context for prompt injection
    let pineconeContext = "";
    if (pineconeResult.success && pineconeResult.matches.length > 0) {
      pineconeContext = formatPineconeContext(pineconeResult.matches);
      logger.info("✅ V1: Pinecone context retrieved for program designer:", {
        totalMatches: pineconeResult.totalMatches,
        relevantMatches: pineconeResult.relevantMatches,
        contextLength: pineconeContext.length,
      });
    } else {
      logger.info("📭 V1: No Pinecone context available for program designer");
    }

    logger.info("✅ V1: Session data loaded", {
      sessionId: programSession.sessionId,
      coachId: programSession.coachId,
      conversationHistoryLength:
        programSession.conversationHistory?.length || 0,
      isComplete: programSession.isComplete,
    });

    // Add user message to session conversation history (full CoachMessage format)
    const userMessage: CoachMessage = {
      id: `msg_${Date.now()}_${userId}_user`,
      role: "user",
      content: userResponse,
      timestamp: new Date(messageTimestamp || new Date().toISOString()),
      messageType:
        params.imageS3Keys && params.imageS3Keys.length > 0
          ? "text_with_images"
          : "text",
      ...(params.imageS3Keys && params.imageS3Keys.length > 0
        ? { imageS3Keys: params.imageS3Keys }
        : {}),
    };
    programSession.conversationHistory =
      programSession.conversationHistory || [];
    programSession.conversationHistory.push(userMessage);
    programSession.lastActivity = new Date();

    logger.info("📝 V1: User message added to session conversation history", {
      conversationHistoryLength: programSession.conversationHistory.length,
    });

    // Save updated session with user message
    await saveProgramDesignerSession(programSession);

    // Check for slash command to restart
    const slashCommandResult = parseSlashCommand(userResponse);
    const isProgramDesignSlashCommand =
      slashCommandResult.isSlashCommand &&
      isProgramDesignCommand(slashCommandResult.command);

    if (isProgramDesignSlashCommand) {
      logger.info("⚡ V1: Restarting session due to slash command");
      programSession.isDeleted = true;
      programSession.completedAt = new Date();
      await saveProgramDesignerSession(programSession);
      // TODO: Create new session and redirect
      yield formatCompleteEvent({
        messageId: `restart_${Date.now()}`,
      });
      return;
    }

    // Build context with Pinecone data for cross-context awareness
    const sessionContext = pineconeContext
      ? {
          pineconeContext: {
            formatted: pineconeContext,
            matches: pineconeResult.matches,
          },
        }
      : {};

    // Build business logic params (session-based, no conversation)
    const businessLogicParams: BusinessLogicParams = {
      userId,
      coachId: programSession.coachId,
      conversationId: "", // Not used in program designer flow
      userResponse,
      messageTimestamp,
      existingConversation: null as any, // Not used
      coachConfig,
      userProfile,
      context: sessionContext,
    };

    // Continue the session flow
    // Note: Progress metadata will be sent by handleProgramDesignerFlow after processing
    const conversationData = {
      existingConversation: null as any,
      coachConfig,
      userProfile,
      context: sessionContext,
    };

    yield* handleProgramDesignerFlow(
      businessLogicParams,
      conversationData,
      programSession,
    );
  } catch (error) {
    logger.error("❌ V1: Error in program designer streaming:", error);
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error("Unknown error occurred"),
    );
    yield errorEvent;
  }
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
      });

    const hasImages = !!(imageS3Keys && imageS3Keys.length > 0);

    logger.info("✅ V2: Params validated:", {
      userId,
      sessionId,
      messageLength: userResponse.length,
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
    const slashCommandResult = parseSlashCommand(userResponse);
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

    const agentContext: ProgramDesignerSessionAgentContext = {
      userId: userId as string,
      sessionId: sessionId as string,
      userTimezone,
      coachId: programSession.coachId,
      coachName: programSession.coachName || coachConfig?.name || undefined,
      coachPersonality,
      session: programSession, // Mutable — tools mutate session.todoList and session.isComplete
      pineconeContext,
    };

    // 6. Build system prompts
    const { staticPrompt, dynamicPrompt } =
      buildProgramDesignerSessionAgentPrompt(programSession, {
        userTimezone,
        coachName: agentContext.coachName,
        coachPersonality,
        pineconeContext,
        messageCount: programSession.conversationHistory?.length || 0,
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

    try {
      const agentGenerator = agent.converseStream(userResponse, imageS3Keys);

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
      logger.error("❌ V2: Agent stream error:", agentError);
      throw agentError;
    }

    // 12. Build messages to save in conversation history
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userResponse,
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
          conversationId: "",
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
// Internal streaming handler — routes V1 or V2
// ============================================================================

/**
 * Internal streaming handler with authentication
 * Pattern: Matches coach-creator-session exactly
 */
const internalStreamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => {
  logger.info("🎬 Starting program designer session streaming handler");

  try {
    const useV1Fallback = await shouldUseV1FallbackHandler(event.user.userId);

    if (useV1Fallback) {
      logger.info("Routing to V1 procedural handler (fallback)", {
        userId: event.user.userId,
      });
      const eventGenerator = createProgramDesignerEventStreamV1(event, context);
      const sseEventStream = Readable.from(eventGenerator);
      await pipeline(sseEventStream, responseStream);
    } else {
      logger.info("Routing to V2 agent handler (default)");
      const eventGenerator = createProgramDesignerEventStreamV2(event, context);
      const sseEventStream = Readable.from(eventGenerator);
      await pipeline(sseEventStream, responseStream);
    }

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
