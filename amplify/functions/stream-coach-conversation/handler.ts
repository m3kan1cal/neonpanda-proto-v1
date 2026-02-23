import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";
import { logger } from "../libs/logger";
import { getSsmStringList } from "../libs/ssm-utils";

const { Readable } = stream;
const pipeline = util.promisify(stream.pipeline);

// awslambda is a global object provided by Lambda's Node.js runtime environment
// No import or declaration is required - it's automatically available

// Import business logic utilities
import {
  MODEL_IDS,
  AI_ERROR_FALLBACK_MESSAGE,
  invokeAsyncLambda,
} from "../libs/api-helpers";
import {
  getCoachConversation,
  sendCoachConversationMessage,
  saveCoachConversation,
  getCoachConfig,
  getUserProfile,
} from "../../dynamodb/operations";
import { extractUserName } from "../libs/user";
import {
  CoachMessage,
  MESSAGE_TYPES,
  CoachConversation,
} from "../libs/coach-conversation/types";
import { gatherConversationContext } from "../libs/coach-conversation/context";
import {
  detectAndProcessWorkout,
  WorkoutDetectionResult,
  getFallbackWorkout,
} from "../libs/coach-conversation/workout-detection";
import {
  queryMemories,
  detectAndProcessMemory,
  MemoryRetrievalResult,
  getFallbackMemory,
} from "../libs/coach-conversation/memory-processing";
import {
  detectAndProcessConversationSummary,
  analyzeRequestCapabilities,
} from "../libs/coach-conversation/detection";
import { generateAIResponseStream } from "../libs/coach-conversation/response-orchestrator";
import {
  generateContextualUpdate,
  generateAndFormatUpdate,
  categorizeUserMessage,
} from "../libs/coach-conversation/contextual-updates";
import { analyzeMemoryNeeds } from "../libs/memory/detection";
import { BuildProgramEvent } from "../libs/program/types";
import { CONVERSATION_MODES } from "../libs/coach-conversation/types";
import { removeTriggerFromStream } from "../libs/response-utils";
import {
  startWorkoutCollection,
  handleWorkoutCreatorFlow,
  clearWorkoutSession,
} from "../libs/workout-creator/handler-helpers";
import { parseSlashCommand, isWorkoutSlashCommand } from "../libs/workout";
import { getUserTimezoneOrDefault } from "../libs/analytics/date-utils";
import { queryPrograms } from "../../dynamodb/program";
import { buildMessagesWithHistoryCaching } from "../libs/coach-conversation/response-orchestrator";
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
  formatChunkEvent,
  formatContextualEvent,
  formatMetadataEvent,
  formatCompleteEvent,
  formatAuthErrorEvent,
  formatValidationErrorEvent,
  createOptimizedChunkStream,
  validateStreamingRequestBody,
  getRandomCoachAcknowledgement,
  buildMessageContextFromMessages,
  type ValidationParams,
  type ConversationData,
  type BusinessLogicParams,
  type BusinessResults,
  type StreamingFeatureFlags,
  type SmartRequestRouter,
} from "../libs/streaming";
import { executeWithContextualUpdate } from "../libs/streaming/parallel-helpers";

// Use centralized route pattern constant
const COACH_CONVERSATION_ROUTE = STREAMING_ROUTE_PATTERNS.COACH_CONVERSATION;

// Feature flags for development
const FEATURE_FLAGS: StreamingFeatureFlags = {
  ENABLE_WORKOUT_DETECTION: true,
  ENABLE_MEMORY_PROCESSING: true,
  ENABLE_CONVERSATION_SUMMARY: true,
};

// Separate workout detection processing for concurrent execution
async function processWorkoutDetection(
  params: BusinessLogicParams,
  routerAnalysis?: SmartRequestRouter,
): Promise<any> {
  const {
    userId,
    coachId,
    conversationId,
    userResponse,
    messageTimestamp,
    existingConversation,
    coachConfig,
    userProfile,
    imageS3Keys,
  } = params;

  const conversationContext = {
    sessionNumber:
      existingConversation.messages.filter((msg: any) => msg.role === "user")
        .length + 1,
    userName: extractUserName(userProfile),
  };

  if (FEATURE_FLAGS.ENABLE_WORKOUT_DETECTION) {
    logger.info("🔍 Starting workout detection for message");
    try {
      return await detectAndProcessWorkout(
        userResponse,
        userId,
        coachId,
        conversationId,
        coachConfig,
        conversationContext,
        messageTimestamp,
        userProfile,
        routerAnalysis, // ✅ Pass Smart Router result to avoid duplicate AI call
        imageS3Keys, // ✅ Pass attached images (may contain workout data)
      );
    } catch (error) {
      logger.error("❌ Error in workout detection, using fallback:", error);
      return {
        isWorkoutLogging: false,
        workoutContent: userResponse,
        workoutDetectionContext: [],
        slashCommand: { isSlashCommand: false },
        isSlashCommandWorkout: false,
        isNaturalLanguageWorkout: false,
      };
    }
  } else {
    return {
      isWorkoutLogging: false,
      workoutContent: userResponse,
      workoutDetectionContext: [],
      slashCommand: { isSlashCommand: false },
      isSlashCommandWorkout: false,
      isNaturalLanguageWorkout: false,
    };
  }
}

// Extract validation logic
async function validateAndExtractParams(
  event: AuthenticatedLambdaFunctionURLEvent,
): Promise<ValidationParams> {
  // Extract and validate path parameters
  const pathParams = extractPathParameters(
    event.rawPath,
    COACH_CONVERSATION_ROUTE,
  );
  const { userId, coachId, conversationId } = pathParams;

  // Validate required path parameters
  const validation = validateRequiredPathParams(pathParams, [
    "userId",
    "coachId",
    "conversationId",
  ]);
  if (!validation.isValid) {
    throw new Error(
      `Missing required path parameters: ${validation.missing.join(", ")}. Expected: ${COACH_CONVERSATION_ROUTE}`,
    );
  }

  logger.info("✅ Path parameters validated:", {
    userId,
    coachId,
    conversationId,
  });

  // Parse and validate request body using shared utility
  const { userResponse, messageTimestamp, imageS3Keys } =
    validateStreamingRequestBody(event.body, userId as string, {
      requireUserResponse: false, // Either text or images is OK
      maxImages: 5,
    });

  logger.info("✅ Request body validated:", {
    hasUserResponse: !!userResponse,
    hasMessageTimestamp: !!messageTimestamp,
    userResponseLength: userResponse?.length || 0,
    imageCount: imageS3Keys?.length || 0,
  });

  return {
    userId: userId as string,
    coachId: coachId as string,
    conversationId: conversationId as string,
    userResponse,
    messageTimestamp,
    imageS3Keys, // NEW: Include imageS3Keys
  };
}

// Extract data loading logic
async function loadConversationData(
  userId: string,
  coachId: string,
  conversationId: string,
  userResponse: string,
  shouldQueryPinecone?: boolean,
  userProfile?: any, // Optional: if already loaded, we can reuse it
): Promise<ConversationData> {
  const existingConversation = await getCoachConversation(
    userId,
    coachId,
    conversationId,
  );
  if (!existingConversation) {
    throw new Error("Conversation not found");
  }

  const coachConfig = await getCoachConfig(userId, coachId);
  if (!coachConfig) {
    throw new Error("Coach configuration not found");
  }

  // Use provided user profile or load it (for backward compatibility with other callers)
  const profile = userProfile || (await getUserProfile(userId));

  logger.info(
    "✅ Conversation, coach config, and user profile loaded successfully",
    {
      hasUserProfile: !!profile,
      userTimezone: profile?.preferences?.timezone,
      profileWasReused: !!userProfile,
    },
  );

  // Gather all conversation context (workouts + Pinecone)
  // Pass through the shouldQueryPinecone flag from smart router (if provided)
  const context = await gatherConversationContext(
    userId,
    userResponse,
    shouldQueryPinecone,
  );

  return {
    existingConversation,
    coachConfig,
    context,
    userProfile: profile,
  };
}

// Main streaming handler using PROPER pipeline approach with on-demand generation
// ============================================================================
// V2 AGENT HANDLER IS DEFAULT - V1 FALLBACK via SSM
// ============================================================================

/**
 * V1 fallback: Check if user should be routed to the legacy V1 procedural handler.
 *
 * V2 agent handler is the default for all users.
 * To temporarily route a user back to V1, add their user ID to the SSM parameter
 * at /{branchName}/neonpanda-proto-v1/config/V1_FALLBACK_USERS (comma-separated).
 * Changes take effect within 5 minutes (cache TTL) with no code deploy required.
 *
 * NOTE: User IDs are raw Cognito user IDs (no prefix), as extracted from the auth token.
 */
async function shouldUseV1FallbackHandler(userId: string): Promise<boolean> {
  const paramPath = process.env.V1_FALLBACK_USERS_PARAM;
  if (!paramPath) {
    return false;
  }
  const fallbackUsers = await getSsmStringList(paramPath);
  return fallbackUsers.has(userId);
}

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

  const useV1Fallback = await shouldUseV1FallbackHandler(event.user.userId);

  if (useV1Fallback) {
    logger.info("Routing to V1 procedural handler (fallback)", {
      userId: event.user.userId,
    });
    const eventGenerator = createCoachConversationEventStream(event, context);
    const sseEventStream = Readable.from(eventGenerator);
    await pipeline(sseEventStream, responseStream);
  } else {
    logger.info("Routing to V2 agent handler (default)");
    const eventGenerator = createCoachConversationEventStreamV2(event, context);
    const sseEventStream = Readable.from(eventGenerator);
    await pipeline(sseEventStream, responseStream);
  }

  logger.info("✅ Streaming pipeline completed successfully");

  // FIX: Prevent Lambda from hanging - all streaming is complete, don't wait for event loop
  context.callbackWaitsForEmptyEventLoop = false;
};

// Generator function that yields SSE events with TRUE real-time streaming
async function* createCoachConversationEventStream(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context,
): AsyncGenerator<string, void, unknown> {
  // Yield start event IMMEDIATELY (this happens right away)
  yield formatStartEvent();
  logger.info("📡 Yielded start event immediately");

  try {
    // Start async processing but yield progress events as we go
    const processingPromise = processCoachConversationAsync(event, context);

    // Yield coach-like acknowledgment immediately while processing starts (as contextual update)
    const randomAcknowledgment = getRandomCoachAcknowledgement();
    yield formatContextualEvent(randomAcknowledgment, "initial_greeting");
    logger.info(
      `📡 Yielded coach acknowledgment (contextual): "${randomAcknowledgment}"`,
    );

    // Now yield events as they become available from the async processing
    for await (const event of processingPromise) {
      yield event;
    }
  } catch (error) {
    logger.error("❌ Processing error:", error);

    // Yield error event
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error("Unknown error occurred"),
    );
    yield errorEvent;
  }
}

// Smart Router-based processing with optimized AI calls
async function* processCoachConversationAsync(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context,
): AsyncGenerator<string, void, unknown> {
  // Step 1: Validate parameters (fast)
  const params = await validateAndExtractParams(event);

  // Step 2: Load user profile FIRST (needed for smart router temporal context)
  const userProfile = await getUserProfile(params.userId);
  const userTimezone = userProfile?.preferences?.timezone;
  const criticalTrainingDirective = userProfile?.criticalTrainingDirective;

  logger.info("✅ User profile loaded for smart router:", {
    hasProfile: !!userProfile,
    timezone: userTimezone || "America/Los_Angeles (default)",
    hasCriticalDirective: criticalTrainingDirective?.enabled || false,
  });

  // Step 3: PARALLEL BURST - Router analysis + DynamoDB calls
  // These operations are independent and can run simultaneously
  logger.info(
    "🚀 Starting parallel data loading: Router + Conversation + Config",
  );
  const parallelStartTime = Date.now();

  const [routerAnalysis, existingConversation, coachConfig] = await Promise.all(
    [
      analyzeRequestCapabilities(
        params.userResponse,
        undefined, // messageContext - could be added later
        0, // conversationLength - could be calculated later
        userTimezone,
        criticalTrainingDirective,
      ),
      getCoachConversation(
        params.userId,
        params.coachId,
        params.conversationId,
      ),
      getCoachConfig(params.userId, params.coachId),
    ],
  );

  const parallelLoadTime = Date.now() - parallelStartTime;
  logger.info(`✅ Parallel data loading completed in ${parallelLoadTime}ms`);

  // Validate loaded data
  if (!existingConversation) {
    throw new Error("Conversation not found");
  }
  if (!coachConfig) {
    throw new Error("Coach configuration not found");
  }

  // 📊 Diagnostic logging for conversation history debugging
  // This helps identify when conversation history isn't persisting
  const conversationMessages = existingConversation.messages || [];
  const actualConversationLength = conversationMessages.length;

  logger.info("📊 Conversation history diagnostics:", {
    conversationId: params.conversationId,
    actualMessageCount: actualConversationLength,
    routerUsedConversationLength: 0, // Router analysis ran in parallel, used 0
    hasMessages: actualConversationLength > 0,
    firstMessageRole: conversationMessages[0]?.role,
    lastMessageRole: conversationMessages[actualConversationLength - 1]?.role,
    isNewConversation: actualConversationLength === 0,
    conversationMode: existingConversation.mode,
    conversationTitle: existingConversation.title,
    hint:
      actualConversationLength === 0
        ? "Conversation has no messages - this might be a new conversation or messages weren't persisted"
        : undefined,
  });

  // Extract router decision flags for cleaner code
  const shouldShowUpdates = routerAnalysis.showContextualUpdates;

  // Step 4: CONDITIONAL Pinecone context loading based on router decision
  // Only query Pinecone if router determines it's necessary
  let gatheredContext;
  if (routerAnalysis.contextNeeds.needsPineconeSearch) {
    logger.info(
      "🔍 Router approved Pinecone search - loading conversation context",
    );
    const contextStartTime = Date.now();
    gatheredContext = await gatherConversationContext(
      params.userId,
      params.userResponse,
      true,
    );
    logger.info(
      `✅ Pinecone context loaded in ${Date.now() - contextStartTime}ms`,
    );
  } else {
    logger.info("⏭️ Router skipped Pinecone - loading basic context only");
    gatheredContext = await gatherConversationContext(
      params.userId,
      params.userResponse,
      false,
    );
  }

  // Reconstruct conversationData object (replaces loadConversationData return)
  const conversationData = {
    existingConversation,
    coachConfig,
    context: gatheredContext,
    userProfile,
  };

  logger.info(`🧠 Smart Router Analysis:`, {
    userIntent: routerAnalysis.userIntent,
    showContextualUpdates: routerAnalysis.showContextualUpdates,
    isWorkoutLog: routerAnalysis.workoutDetection.isWorkoutLog,
    needsMemoryRetrieval: routerAnalysis.memoryProcessing.needsRetrieval,
    needsPineconeSearch: routerAnalysis.contextNeeds.needsPineconeSearch,
    pineconeSearchUsed: routerAnalysis.contextNeeds.needsPineconeSearch, // Will control actual query
    hasComplexity: routerAnalysis.conversationComplexity.hasComplexity,
    processingTime: routerAnalysis.routerMetadata.processingTime,
    fallbackUsed: routerAnalysis.routerMetadata.fallbackUsed,
  });

  // ============================================================================
  // SLASH COMMAND BYPASS: Check if user provided slash command during multi-turn session
  // ============================================================================
  // If user provides a slash command (like /log-workout) while in a multi-turn session,
  // they're explicitly providing complete data - clear the session and log directly
  const slashCommandResult = parseSlashCommand(params.userResponse);
  const isSlashCommandWorkout = isWorkoutSlashCommand(slashCommandResult);

  if (
    isSlashCommandWorkout &&
    conversationData.existingConversation.workoutCreatorSession
  ) {
    logger.info(
      "⚡ Slash command detected during multi-turn session - clearing session and logging directly",
    );
    logger.info(
      "🧹 User provided complete workout data via slash command - bypassing multi-turn flow",
    );

    // Clear the workout creator session
    delete conversationData.existingConversation.workoutCreatorSession;

    // Continue to normal workout detection flow below (don't return early)
    // This allows the slash command to be processed normally
  }

  // ============================================================================
  // MULTI-TURN WORKOUT LOGGING: Check if workout collection session is in progress
  // ============================================================================
  const workoutSession =
    conversationData.existingConversation.workoutCreatorSession;

  if (workoutSession) {
    // Check for explicit cancel intent from the Smart Router
    if (routerAnalysis.userIntent === "cancel_request") {
      logger.info(
        "🚫 Cancel request detected by router - clearing workout session immediately",
      );

      // Clear the workout session and reset mode back to CHAT
      delete conversationData.existingConversation.workoutCreatorSession;
      conversationData.existingConversation.mode = CONVERSATION_MODES.CHAT;

      // Save the conversation without the session
      await saveCoachConversation(conversationData.existingConversation);

      logger.info(
        "✅ Workout session cancelled via cancel_request - re-processing as normal conversation",
      );

      // Fall through to normal conversation processing below
      // The complete event will be sent at the end with the actual AI response
    } else {
      logger.info(
        "🏋️ Workout collection session in progress - continuing multi-turn flow",
      );

      // Track message count before handling
      const messageCountBefore =
        conversationData.existingConversation.messages.length;

      const businessLogicParams = { ...params, ...conversationData };
      yield* handleWorkoutCreatorFlow(
        businessLogicParams,
        conversationData,
        workoutSession,
      );

      // Check if session was cancelled (topic change) vs completed successfully
      // Cancellation: session deleted, no messages added, should re-process
      // Completion: session deleted, messages added, should NOT re-process
      const sessionWasCleared =
        !conversationData.existingConversation.workoutCreatorSession;
      const messagesWereAdded =
        conversationData.existingConversation.messages.length >
        messageCountBefore;

      if (sessionWasCleared && !messagesWereAdded) {
        logger.info(
          "🔀 Workout session was cancelled - re-processing message as normal conversation",
        );
        // Don't return - fall through to normal conversation processing below
      } else {
        return; // Exit early - handled the workout collection flow normally (completed or in-progress)
      }
    } // end else (non-cancel path)
  }

  // ============================================================================
  // CREATE USER MESSAGE EARLY (before any early exits)
  // ============================================================================
  // This ensures user message is always saved regardless of which flow path we take
  const newUserMessage: CoachMessage = {
    id: `msg_${Date.now()}_user`,
    role: "user",
    content: params.userResponse || "",
    timestamp: new Date(params.messageTimestamp),
    messageType:
      params.imageS3Keys && params.imageS3Keys.length > 0
        ? MESSAGE_TYPES.TEXT_WITH_IMAGES
        : MESSAGE_TYPES.TEXT,
    ...(params.imageS3Keys && params.imageS3Keys.length > 0
      ? { imageS3Keys: params.imageS3Keys }
      : {}),
  };

  // ============================================================================
  // PROGRAM DESIGN IN COACH CONVERSATIONS
  // ============================================================================
  // The AI can help with program design in regular coach conversations.
  // The dedicated Program Designer page exists for a guided, structured experience,
  // but users can also get program design help here in regular chat.
  // The AI may naturally mention the Program Designer as an option while still helping.

  // Step 4: Generate initial acknowledgment ONLY if router determines it's appropriate
  let contextualUpdates: string[] = [];

  if (shouldShowUpdates) {
    logger.info("🚀 Generating initial acknowledgment (router-approved)...");
    const formattedUpdate = await generateAndFormatUpdate(
      conversationData.coachConfig,
      params.userResponse,
      "initial_greeting",
      { stage: "starting" },
    );
    if (formattedUpdate) {
      logger.info("📡 Initial acknowledgment ready");
      yield formattedUpdate;
      contextualUpdates.push(formattedUpdate);
    }
  }

  // Step 5: Process business logic based on router decisions with parallelization
  const businessLogicParams = { ...params, ...conversationData };
  let workoutResult: any = null;
  let memoryResult: any = null;
  let memoryRetrieval: any = null;
  let didInitiateMemorySave = false; // Track if we initiated a memory save (for "I'll remember this" acknowledgment)

  // Determine what processing is needed
  // NEW: Also check for workout_logging intent to support multi-turn collection
  // IMPORTANT: cancel_request should NEVER trigger workout processing
  const needsWorkout =
    routerAnalysis.userIntent !== "cancel_request" &&
    (routerAnalysis.workoutDetection.isWorkoutLog ||
      routerAnalysis.userIntent === "workout_logging");
  const needsMemory =
    routerAnalysis.memoryProcessing.needsRetrieval ||
    routerAnalysis.memoryProcessing.isMemoryRequest;

  logger.info(
    `📊 Processing plan: workout=${needsWorkout}, memory=${needsMemory}, workoutIntent=${routerAnalysis.userIntent === "workout_logging"}`,
  );

  // CASE 1: Both workout and memory needed - PARALLELIZE
  if (needsWorkout && needsMemory) {
    logger.info("⚡ Parallelizing workout + memory + contextual updates");
    const parallelStartTime = Date.now();

    // Parallel execution: contextual updates + workout + memory processing
    const parallelOperations = [
      // Workout processing
      processWorkoutDetection(businessLogicParams, routerAnalysis),
      // Memory processing
      (async () => {
        // Build message context
        const messageContext = buildMessageContextFromMessages(
          conversationData.existingConversation.messages,
          5,
        );

        // Analyze memory needs
        const consolidatedMemoryAnalysis = await analyzeMemoryNeeds(
          params.userResponse,
          messageContext,
          conversationData.coachConfig.coach_name,
        );

        // Process retrieval (MUST await - needed for AI response)
        const retrieval = consolidatedMemoryAnalysis.needsRetrieval
          ? await queryMemories(
              params.userId,
              params.coachId,
              params.userResponse,
              messageContext,
            )
          : { memories: [] };

        // Process saving (fire-and-forget - NOT needed for AI response)
        if (consolidatedMemoryAnalysis.isMemoryRequest) {
          didInitiateMemorySave = true;
          detectAndProcessMemory(
            params.userResponse,
            params.userId,
            params.coachId,
            params.conversationId,
            conversationData.existingConversation.messages,
            conversationData.coachConfig.coach_name,
          ).catch((err) => {
            logger.error("⚠️ Memory saving failed (non-blocking):", err);
          });
        }

        return { retrieval };
      })(),
    ];

    // Add contextual updates to parallel operations if enabled
    if (shouldShowUpdates) {
      parallelOperations.push(
        generateContextualUpdate(
          conversationData.coachConfig,
          params.userResponse,
          "workout_analysis",
          { stage: "analyzing_workouts" },
        ),
        generateContextualUpdate(
          conversationData.coachConfig,
          params.userResponse,
          "memory_analysis",
          {
            stage: "checking_memories",
            workoutDetected: true,
            recentWorkouts:
              conversationData.context?.recentWorkouts?.length || 0,
          },
        ),
      );
    }

    const results = await Promise.allSettled(parallelOperations);

    const parallelTime = Date.now() - parallelStartTime;
    logger.info(
      `✅ Parallel workout + memory + updates completed in ${parallelTime}ms`,
    );

    // Extract workout result
    workoutResult =
      results[0].status === "fulfilled"
        ? results[0].value
        : getFallbackWorkout();

    // Extract memory result
    if (results[1].status === "fulfilled") {
      memoryRetrieval = results[1].value.retrieval;
    } else {
      logger.error("⚠️ Memory processing failed:", results[1].reason);
      memoryRetrieval = getFallbackMemory();
    }

    // Yield contextual updates if they were generated
    if (shouldShowUpdates) {
      if (results[2]?.status === "fulfilled") {
        contextualUpdates.push(results[2].value);
        yield formatContextualEvent(results[2].value, "workout_analysis");
      } else if (results[2]?.status === "rejected") {
        logger.warn("⚠️ Workout update failed:", results[2].reason);
      }

      if (results[3]?.status === "fulfilled") {
        contextualUpdates.push(results[3].value);
        yield formatContextualEvent(results[3].value, "memory_analysis");
      } else if (results[3]?.status === "rejected") {
        logger.warn("⚠️ Memory update failed:", results[3].reason);
      }
    }

    // Don't await memory saving yet - we'll do it after AI streaming
    // Store promise for later to avoid blocking Phase 4 and AI generation
  }
  // CASE 2: Only workout needed
  else if (needsWorkout) {
    logger.info("🏋️ Processing workout only");

    if (shouldShowUpdates) {
      // Use helper to parallelize contextual update with workout processing
      const { update, workResult } = await executeWithContextualUpdate(
        generateContextualUpdate(
          conversationData.coachConfig,
          params.userResponse,
          "workout_analysis",
          { stage: "analyzing_workouts" },
        ),
        processWorkoutDetection(businessLogicParams, routerAnalysis),
        "workout_analysis",
      );

      workoutResult = workResult;

      // Yield update if it succeeded
      if (update) {
        contextualUpdates.push(update);
        yield formatContextualEvent(update, "workout_analysis");
      }
    } else {
      // No contextual update needed, just process workout
      workoutResult = await processWorkoutDetection(
        businessLogicParams,
        routerAnalysis,
      );
    }

    memoryRetrieval = getFallbackMemory();
    memoryResult = { memoryFeedback: null };
  }
  // CASE 3: Only memory needed
  else if (needsMemory) {
    logger.info("🧠 Processing memory only");

    // Build message context
    const messageContext = buildMessageContextFromMessages(
      conversationData.existingConversation.messages,
      5,
    );

    // Analyze memory needs
    const consolidatedMemoryAnalysis = await analyzeMemoryNeeds(
      params.userResponse,
      messageContext,
      conversationData.coachConfig.coach_name,
    );

    // Create retrieval work (this we need immediately)
    const processMemoryRetrieval = async () => {
      return consolidatedMemoryAnalysis.needsRetrieval
        ? await queryMemories(
            params.userId,
            params.coachId,
            params.userResponse,
            messageContext,
          )
        : getFallbackMemory();
    };

    // Start memory saving if needed (fire-and-forget - don't block Phase 4!)
    if (consolidatedMemoryAnalysis.isMemoryRequest) {
      didInitiateMemorySave = true;
      detectAndProcessMemory(
        params.userResponse,
        params.userId,
        params.coachId,
        params.conversationId,
        conversationData.existingConversation.messages,
        conversationData.coachConfig.coach_name,
      ).catch((err) => {
        logger.error("⚠️ Memory saving failed (non-blocking):", err);
      });
      logger.info("🔥 Memory saving started (fire-and-forget)");
    }

    if (shouldShowUpdates) {
      // Use helper to parallelize contextual update with memory RETRIEVAL only
      const { update, workResult } = await executeWithContextualUpdate(
        generateContextualUpdate(
          conversationData.coachConfig,
          params.userResponse,
          "memory_analysis",
          {
            stage: "checking_memories",
            workoutDetected: false,
            recentWorkouts:
              conversationData.context?.recentWorkouts?.length || 0,
          },
        ),
        processMemoryRetrieval(),
        "memory_analysis",
      );

      memoryRetrieval = workResult;

      // Yield update if it succeeded
      if (update) {
        contextualUpdates.push(update);
        yield formatContextualEvent(update, "memory_analysis");
      }
    } else {
      // No contextual update needed, just process memory retrieval
      memoryRetrieval = await processMemoryRetrieval();
    }

    workoutResult = getFallbackWorkout();
    // Don't set memoryResult yet - it's being saved in background
  }
  // CASE 4: Neither needed
  else {
    logger.info("⏭️ Router determined no workout or memory processing needed");
    workoutResult = getFallbackWorkout();
    memoryRetrieval = getFallbackMemory();
    memoryResult = { memoryFeedback: null };
  }

  // ============================================================================
  // MULTI-TURN WORKOUT LOGGING: Natural language workout detection
  // ============================================================================
  // Natural language workouts ALWAYS trigger multi-turn session (slash commands bypass this)
  // Check if: 1) workout intent exists, 2) not a slash command (isWorkoutLogging=false), 3) router confirms workout
  // IMPORTANT: cancel_request should NEVER trigger workout collection
  if (
    workoutResult &&
    !workoutResult.isWorkoutLogging &&
    routerAnalysis.userIntent !== "cancel_request" &&
    (routerAnalysis.workoutDetection.isWorkoutLog ||
      routerAnalysis.userIntent === "workout_logging")
  ) {
    logger.info(
      "🏋️ Natural language workout detected - starting multi-turn collection session",
    );
    yield* startWorkoutCollection(businessLogicParams, conversationData);
    return; // Exit early - handled the workout collection start
  }

  // OPTIMIZATION: Removed pattern/insights updates (Phase 4) to focus on 2-3 key updates
  // Keeping only: Initial acknowledgment + Workout/Memory analysis (most critical for UX)

  // ============================================================================
  // SEND METADATA EVENT: Inform UI of message mode BEFORE AI streaming starts
  // ============================================================================
  // Determine the mode early so UI can show badges during streaming, not after

  // Check if we're in an active workout logging flow (multi-turn collection)
  // Only set workout_log mode if there's an ACTIVE (not complete) session
  const isInWorkoutFlow =
    conversationData.existingConversation.workoutCreatorSession &&
    !conversationData.existingConversation.workoutCreatorSession.isComplete;

  // Determine message mode:
  // 1. Slash command with complete data → WORKOUT_LOG
  // 2. Natural language with active session → WORKOUT_LOG
  // 3. Otherwise → CHAT (program design is now in dedicated screen)
  const messageMode = workoutResult?.isWorkoutLogging
    ? CONVERSATION_MODES.WORKOUT_LOG
    : isInWorkoutFlow
      ? CONVERSATION_MODES.WORKOUT_LOG
      : CONVERSATION_MODES.CHAT; // Always use CHAT for regular conversations

  // Yield metadata event with mode information
  const metadataPayload: any = { mode: messageMode };
  yield formatMetadataEvent(metadataPayload);
  logger.info(
    `📋 Metadata event sent: mode=${messageMode}${isInWorkoutFlow ? " (continuing workout flow)" : ""}`,
  );

  // Calculate conversation context (user message already created earlier before redirects)
  const conversationContext = {
    sessionNumber:
      conversationData.existingConversation.messages.filter(
        (msg: any) => msg.role === "user",
      ).length + 1,
    userName: extractUserName(conversationData.userProfile),
  };

  // Step 6: Stream AI chunks in REAL-TIME
  let fullAiResponse = "";

  // CONTEXTUAL UPDATES ARE EPHEMERAL UX FEEDBACK ONLY
  // They are streamed to the user during processing but NOT saved in conversation history.
  // This matches the coach creator behavior and keeps the conversation clean.
  // The contextualUpdates array is built above but intentionally NOT added to fullAiResponse.
  logger.info(
    `📝 Contextual updates streamed but not saved (${contextualUpdates.length} updates, ephemeral UX only)`,
  );

  try {
    logger.info("🚀 Starting REAL-TIME AI streaming..");

    const streamResult = await generateAIResponseStream(
      conversationData.coachConfig,
      conversationData.context,
      workoutResult,
      memoryRetrieval,
      params.userResponse,
      conversationData.existingConversation.messages,
      conversationContext,
      params.userId,
      params.coachId,
      params.conversationId,
      conversationData.userProfile,
      params.imageS3Keys, // Pass imageS3Keys
      routerAnalysis.conversationComplexity.requiresDeepReasoning, // NEW: Smart model selection
      conversationData.existingConversation.mode || CONVERSATION_MODES.CHAT, // NEW: Conversation mode (defaults to CHAT - no specific artifact)
    );

    // Yield AI response chunks using optimized buffering strategy
    const aiStartTime = Date.now();
    const optimizedChunkStream = createOptimizedChunkStream(
      streamResult.responseStream,
    );

    // Buffer to handle partial triggers across chunk boundaries
    let triggerBuffer = "";

    for await (const optimizedChunk of optimizedChunkStream) {
      const chunkTime = Date.now() - aiStartTime;
      fullAiResponse += optimizedChunk;

      // Clean the chunk before yielding to prevent trigger from appearing in UI
      // Pass the buffer to handle partial triggers from previous chunks
      const { cleanedContent, buffer } = removeTriggerFromStream(
        optimizedChunk,
        triggerBuffer,
      );
      triggerBuffer = buffer; // Update buffer for next iteration

      // Only yield non-empty chunks after cleaning
      if (cleanedContent.trim()) {
        yield formatChunkEvent(cleanedContent);
        logger.info(
          `📡 [${chunkTime}ms] Optimized AI chunk yielded: "${cleanedContent.substring(0, 30)}..." (${cleanedContent.length} chars)`,
        );
      }
    }

    // After loop completes, yield any remaining buffered content (if it wasn't a complete trigger)
    if (triggerBuffer.trim()) {
      logger.info(`📤 Flushing remaining buffer: "${triggerBuffer}"`);
      yield formatChunkEvent(triggerBuffer);
    }

    logger.info("✅ Real-time AI streaming completed successfully");
  } catch (error) {
    logger.error("❌ Error in AI response generation, using fallback:", error);
    fullAiResponse += AI_ERROR_FALLBACK_MESSAGE;
  }

  // Memory saving happens fire-and-forget in background (Phase 2/3)
  // No explicit "I'll remember this" acknowledgment - let AI respond naturally
  // (User preference: don't force memory acknowledgments)

  // Create final AI message with complete response
  // Note: messageMode was already determined earlier (before AI streaming) and sent via metadata event
  const newAiMessage: CoachMessage = {
    id: `msg_${Date.now()}_assistant`,
    role: "assistant",
    content: fullAiResponse,
    timestamp: new Date(),
    metadata: {
      model: MODEL_IDS.PLANNER_MODEL_DISPLAY,
      mode: messageMode, // Use the mode we determined earlier (same as metadata event)
      // Note: Training program generation is now async, so programId not available here
    },
  };

  // Prepare final results
  const finalResults = {
    workoutResult,
    memoryResult,
    memoryRetrieval,
    newUserMessage,
    newAiMessage,
    conversationContext,
    promptMetadata: null,
  };

  // Step 7: Save to DB and yield completion event (with router analysis)
  const completeEvent = await saveConversationAndYieldComplete(
    finalResults,
    params,
    conversationData,
    routerAnalysis,
  );
  yield completeEvent;
}

// Helper function to save conversation and yield completion (separated for clarity)
async function saveConversationAndYieldComplete(
  results: BusinessResults,
  params: ValidationParams,
  conversationData: ConversationData,
  routerAnalysis: SmartRequestRouter,
): Promise<string> {
  const { userId, coachId, conversationId } = params;
  const { context } = conversationData;
  const { newUserMessage, newAiMessage } = results;

  // Save messages to DynamoDB - capture the save result for size tracking
  const saveResult = await sendCoachConversationMessage(
    userId,
    coachId,
    conversationId,
    [newUserMessage, newAiMessage],
  );

  // 📊 Diagnostic logging for message persistence
  logger.info("✅ Conversation messages saved:", {
    conversationId,
    userMessageId: newUserMessage?.id,
    aiMessageId: newAiMessage?.id,
    userMessageLength: newUserMessage?.content?.length || 0,
    aiMessageLength: newAiMessage?.content?.length || 0,
    saveSuccess: !!saveResult,
    previousMessageCount:
      conversationData.existingConversation.messages?.length || 0,
    newTotalMessages:
      (conversationData.existingConversation.messages?.length || 0) + 2,
  });

  // Extract size information from the save result
  const itemSizeKB = parseFloat(saveResult?.dynamodbResult?.itemSizeKB || "0");
  const sizePercentage = Math.min(Math.round((itemSizeKB / 400) * 100), 100);
  const isApproachingLimit = itemSizeKB > 350; // 87.5% threshold

  logger.info("📊 Conversation size:", {
    sizeKB: itemSizeKB,
    percentage: sizePercentage,
    isApproachingLimit,
    maxSizeKB: 400,
  });

  // OPTIMIZATION: Fire-and-forget conversation summary (don't block on it)
  if (FEATURE_FLAGS.ENABLE_CONVERSATION_SUMMARY) {
    // Don't await - let it run in background
    // We already have the message count from saveResult
    const currentMessageCount =
      newUserMessage && newAiMessage
        ? conversationData.existingConversation.messages.length + 2
        : conversationData.existingConversation.messages.length;

    // Truly fire-and-forget - no await, no promise chaining (prevents event loop hang)
    detectAndProcessConversationSummary(
      userId,
      coachId,
      conversationId,
      params.userResponse,
      currentMessageCount,
    );

    logger.info("🚀 Conversation summary triggered (fire-and-forget)");
  }

  // Prepare Pinecone context for response
  const pineconeMatches = context?.pineconeMatches || [];
  const pineconeContextText = context?.pineconeContext || "";

  // Return completion event with conversation size tracking
  const completeEvent = formatCompleteEvent({
    messageId: newAiMessage.id,
    userMessage: newUserMessage,
    aiMessage: newAiMessage,
    conversationId,
    pineconeContext: {
      used: pineconeMatches.length > 0,
      matches: pineconeMatches.length,
      contextLength: pineconeContextText.length,
    },
    conversationSize: {
      sizeKB: itemSizeKB,
      percentage: sizePercentage,
      maxSizeKB: 400,
      isApproachingLimit,
    },
  });

  logger.info(
    "✅ Proper pipeline streaming implementation completed successfully",
  );
  return completeEvent;
}

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

    // 3. Parallel data loading (DynamoDB only — no Smart Router!)
    const [
      userProfile,
      existingConversation,
      coachConfig,
      activeProgramResult,
    ] = await Promise.all([
      getUserProfile(userId),
      getCoachConversation(userId, coachId, conversationId),
      getCoachConfig(userId, coachId),
      queryPrograms(userId, { includeStatus: ["active"], limit: 1 }),
    ]);

    if (!existingConversation || !coachConfig) {
      throw new Error("Failed to load conversation or coach config");
    }

    logger.info("✅ V2: Data loaded:", {
      hasUserProfile: !!userProfile,
      existingMessageCount: existingConversation.messages.length,
      hasActiveProgram: activeProgramResult.length > 0,
    });

    // 4. Build agent context
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
    };

    // 5. Build system prompt
    const { staticPrompt, dynamicPrompt } = buildConversationAgentPrompt(
      coachConfig,
      {
        userProfile: userProfile || undefined,
        userTimezone,
        criticalTrainingDirective: criticalDirective,
        activeProgram: agentContext.activeProgram,
        coachCreatorSessionSummary:
          coachConfig.metadata?.coach_creator_session_summary,
      },
    );

    logger.info("✅ V2: System prompt built:", {
      staticLength: staticPrompt.length,
      dynamicLength: dynamicPrompt.length,
    });

    // 6. Build conversation history with caching
    const cachedMessages = buildMessagesWithHistoryCaching(
      existingConversation.messages,
    );

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

    let fullResponseText = "";
    let toolsUsed: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterationCount = 0;

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

    // 13. Fire-and-forget: conversation summary
    detectAndProcessConversationSummary(
      userId,
      coachId,
      conversationId,
      params.userResponse,
      existingConversation.messages.length + 2,
    );

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
