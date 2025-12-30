import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";

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
  };

  if (FEATURE_FLAGS.ENABLE_WORKOUT_DETECTION) {
    console.info("🔍 Starting workout detection for message");
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
      console.error("❌ Error in workout detection, using fallback:", error);
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

  console.info("✅ Path parameters validated:", {
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

  console.info("✅ Request body validated:", {
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

  console.info(
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
const internalStreamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => {
  console.info(
    "🚀 Starting stream-coach-conversation handler (Proper Pipeline Mode)",
  );

  console.info("📥 Event details:", {
    rawPath: event.rawPath,
    method: event.requestContext.http.method,
    hasBody: !!event.body,
    authenticatedUser: event.user.userId,
  });

  // Create a generator-based readable stream that produces events on-demand
  const eventGenerator = createCoachConversationEventStream(event, context);
  const sseEventStream = Readable.from(eventGenerator);

  // Use pipeline to stream events as they're generated (proper real-time streaming)
  await pipeline(sseEventStream, responseStream);

  console.info("✅ Streaming pipeline completed successfully");

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
  console.info("📡 Yielded start event immediately");

  try {
    // Start async processing but yield progress events as we go
    const processingPromise = processCoachConversationAsync(event, context);

    // Yield coach-like acknowledgment immediately while processing starts (as contextual update)
    const randomAcknowledgment = getRandomCoachAcknowledgement();
    yield formatContextualEvent(randomAcknowledgment, "initial_greeting");
    console.info(
      `📡 Yielded coach acknowledgment (contextual): "${randomAcknowledgment}"`,
    );

    // Now yield events as they become available from the async processing
    for await (const event of processingPromise) {
      yield event;
    }
  } catch (error) {
    console.error("❌ Processing error:", error);

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

  console.info("✅ User profile loaded for smart router:", {
    hasProfile: !!userProfile,
    timezone: userTimezone || "America/Los_Angeles (default)",
    hasCriticalDirective: criticalTrainingDirective?.enabled || false,
  });

  // Step 3: PARALLEL BURST - Router analysis + DynamoDB calls
  // These operations are independent and can run simultaneously
  console.info(
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
  console.info(`✅ Parallel data loading completed in ${parallelLoadTime}ms`);

  // Validate loaded data
  if (!existingConversation) {
    throw new Error("Conversation not found");
  }
  if (!coachConfig) {
    throw new Error("Coach configuration not found");
  }

  // Extract router decision flags for cleaner code
  const shouldShowUpdates = routerAnalysis.showContextualUpdates;

  // Step 4: CONDITIONAL Pinecone context loading based on router decision
  // Only query Pinecone if router determines it's necessary
  let gatheredContext;
  if (routerAnalysis.contextNeeds.needsPineconeSearch) {
    console.info(
      "🔍 Router approved Pinecone search - loading conversation context",
    );
    const contextStartTime = Date.now();
    gatheredContext = await gatherConversationContext(
      params.userId,
      params.userResponse,
      true,
    );
    console.info(
      `✅ Pinecone context loaded in ${Date.now() - contextStartTime}ms`,
    );
  } else {
    console.info("⏭️ Router skipped Pinecone - loading basic context only");
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

  console.info(`🧠 Smart Router Analysis:`, {
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
    console.info(
      "⚡ Slash command detected during multi-turn session - clearing session and logging directly",
    );
    console.info(
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
    console.info(
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
      console.info(
        "🔀 Workout session was cancelled - re-processing message as normal conversation",
      );
      // Don't return - fall through to normal conversation processing below
    } else {
      return; // Exit early - handled the workout collection flow normally (completed or in-progress)
    }
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
    console.info("🚀 Generating initial acknowledgment (router-approved)...");
    const formattedUpdate = await generateAndFormatUpdate(
      conversationData.coachConfig,
      params.userResponse,
      "initial_greeting",
      { stage: "starting" },
    );
    if (formattedUpdate) {
      console.info("📡 Initial acknowledgment ready");
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
  const needsWorkout =
    routerAnalysis.workoutDetection.isWorkoutLog ||
    routerAnalysis.userIntent === "workout_logging";
  const needsMemory =
    routerAnalysis.memoryProcessing.needsRetrieval ||
    routerAnalysis.memoryProcessing.isMemoryRequest;

  console.info(
    `📊 Processing plan: workout=${needsWorkout}, memory=${needsMemory}, workoutIntent=${routerAnalysis.userIntent === "workout_logging"}`,
  );

  // CASE 1: Both workout and memory needed - PARALLELIZE
  if (needsWorkout && needsMemory) {
    console.info("⚡ Parallelizing workout + memory + contextual updates");
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
            console.error("⚠️ Memory saving failed (non-blocking):", err);
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
    console.info(
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
      console.error("⚠️ Memory processing failed:", results[1].reason);
      memoryRetrieval = getFallbackMemory();
    }

    // Yield contextual updates if they were generated
    if (shouldShowUpdates) {
      if (results[2]?.status === "fulfilled") {
        contextualUpdates.push(results[2].value);
        yield formatContextualEvent(results[2].value, "workout_analysis");
      } else if (results[2]?.status === "rejected") {
        console.warn("⚠️ Workout update failed:", results[2].reason);
      }

      if (results[3]?.status === "fulfilled") {
        contextualUpdates.push(results[3].value);
        yield formatContextualEvent(results[3].value, "memory_analysis");
      } else if (results[3]?.status === "rejected") {
        console.warn("⚠️ Memory update failed:", results[3].reason);
      }
    }

    // Don't await memory saving yet - we'll do it after AI streaming
    // Store promise for later to avoid blocking Phase 4 and AI generation
  }
  // CASE 2: Only workout needed
  else if (needsWorkout) {
    console.info("🏋️ Processing workout only");

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
    console.info("🧠 Processing memory only");

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
        console.error("⚠️ Memory saving failed (non-blocking):", err);
      });
      console.info("🔥 Memory saving started (fire-and-forget)");
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
    console.info("⏭️ Router determined no workout or memory processing needed");
    workoutResult = getFallbackWorkout();
    memoryRetrieval = getFallbackMemory();
    memoryResult = { memoryFeedback: null };
  }

  // ============================================================================
  // MULTI-TURN WORKOUT LOGGING: Natural language workout detection
  // ============================================================================
  // Natural language workouts ALWAYS trigger multi-turn session (slash commands bypass this)
  // Check if: 1) workout intent exists, 2) not a slash command (isWorkoutLogging=false), 3) router confirms workout
  if (
    workoutResult &&
    !workoutResult.isWorkoutLogging &&
    (routerAnalysis.workoutDetection.isWorkoutLog ||
      routerAnalysis.userIntent === "workout_logging")
  ) {
    console.info(
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
  console.info(
    `📋 Metadata event sent: mode=${messageMode}${isInWorkoutFlow ? " (continuing workout flow)" : ""}`,
  );

  // Calculate conversation context (user message already created earlier before redirects)
  const conversationContext = {
    sessionNumber:
      conversationData.existingConversation.messages.filter(
        (msg: any) => msg.role === "user",
      ).length + 1,
  };

  // Step 6: Stream AI chunks in REAL-TIME
  let fullAiResponse = "";

  // CONTEXTUAL UPDATES ARE EPHEMERAL UX FEEDBACK ONLY
  // They are streamed to the user during processing but NOT saved in conversation history.
  // This matches the coach creator behavior and keeps the conversation clean.
  // The contextualUpdates array is built above but intentionally NOT added to fullAiResponse.
  console.info(
    `📝 Contextual updates streamed but not saved (${contextualUpdates.length} updates, ephemeral UX only)`,
  );

  try {
    console.info("🚀 Starting REAL-TIME AI streaming..");

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
        console.info(
          `📡 [${chunkTime}ms] Optimized AI chunk yielded: "${cleanedContent.substring(0, 30)}..." (${cleanedContent.length} chars)`,
        );
      }
    }

    // After loop completes, yield any remaining buffered content (if it wasn't a complete trigger)
    if (triggerBuffer.trim()) {
      console.info(`📤 Flushing remaining buffer: "${triggerBuffer}"`);
      yield formatChunkEvent(triggerBuffer);
    }

    console.info("✅ Real-time AI streaming completed successfully");
  } catch (error) {
    console.error("❌ Error in AI response generation, using fallback:", error);
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

  console.info("✅ Conversation updated successfully");

  // Extract size information from the save result
  const itemSizeKB = parseFloat(saveResult?.dynamodbResult?.itemSizeKB || "0");
  const sizePercentage = Math.min(Math.round((itemSizeKB / 400) * 100), 100);
  const isApproachingLimit = itemSizeKB > 350; // 87.5% threshold

  console.info("📊 Conversation size:", {
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

    console.info("🚀 Conversation summary triggered (fire-and-forget)");
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

  console.info(
    "✅ Proper pipeline streaming implementation completed successfully",
  );
  return completeEvent;
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
      console.info("⚠️ Ignoring health check or OPTIONS request:", {
        method,
        path,
      });
      // Just close the stream for these requests
      responseStream.end();
      return;
    }

    // OPTIONS requests are handled automatically by Lambda Function URL CORS config
    console.info("🚀 Processing streaming request:", {
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
    console.error("❌ Authentication error:", error);

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
console.info(
  "🔧 awslambda global available:",
  typeof (globalThis as any).awslambda !== "undefined",
);
console.info(
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

console.info("✅ Using awslambda.streamifyResponse for streaming mode");
handler = awslambda.streamifyResponse(authenticatedStreamingHandler);

export { handler };
