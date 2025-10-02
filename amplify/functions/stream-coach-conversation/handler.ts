import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";

const { Readable } = stream;
const pipeline = util.promisify(stream.pipeline);

// awslambda is a global object provided by Lambda's Node.js runtime environment
// No import or declaration is required - it's automatically available

// Import business logic utilities
import { MODEL_IDS } from "../libs/api-helpers";
import {
  getCoachConversation,
  sendCoachConversationMessage,
  getCoachConfig,
  getUserProfile,
} from "../../dynamodb/operations";
import { CoachMessage } from "../libs/coach-conversation/types";
import { gatherConversationContext } from "../libs/coach-conversation/context";
import { detectAndProcessWorkout } from "../libs/coach-conversation/workout-detection";
import {
  queryMemories,
  detectAndProcessMemory,
} from "../libs/coach-conversation/memory-processing";
import { detectAndProcessConversationSummary, analyzeRequestCapabilities } from "../libs/coach-conversation/detection";
import { generateAIResponseStream } from "../libs/coach-conversation/response-generation";
import { generateContextualUpdate, categorizeUserMessage } from "../libs/coach-conversation/contextual-updates";
import { analyzeMemoryNeeds } from "../libs/memory/detection";

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
  formatCompleteEvent,
  formatAuthErrorEvent,
  formatValidationErrorEvent,
  createOptimizedChunkStream,
  type ValidationParams,
  type ConversationData,
  type BusinessLogicParams,
  type BusinessResults,
  type StreamingFeatureFlags,
  type SmartRequestRouter,
} from "../libs/streaming";

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
  params: BusinessLogicParams
): Promise<any> {
  const {
    userId,
    coachId,
    conversationId,
    userResponse,
    messageTimestamp,
    existingConversation,
    coachConfig,
  } = params;

  const conversationContext = {
    sessionNumber:
      existingConversation.attributes.messages.filter(
        (msg: any) => msg.role === "user"
      ).length + 1,
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
        messageTimestamp
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
  event: AuthenticatedLambdaFunctionURLEvent
): Promise<ValidationParams> {
  // Extract and validate path parameters
  const pathParams = extractPathParameters(
    event.rawPath,
    COACH_CONVERSATION_ROUTE
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
      `Missing required path parameters: ${validation.missing.join(", ")}. Expected: ${COACH_CONVERSATION_ROUTE}`
    );
  }

  console.info("✅ Path parameters validated:", {
    userId,
    coachId,
    conversationId,
  });

  // Parse and validate request body
  if (!event.body) {
    throw new Error("Request body is required");
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    throw new Error("Invalid JSON in request body");
  }

  const { userResponse, messageTimestamp, imageS3Keys } = body;

  // Validation: Either text or images required
  if (!userResponse && (!imageS3Keys || imageS3Keys.length === 0)) {
    throw new Error("Either text or images required");
  }

  if (imageS3Keys && imageS3Keys.length > 5) {
    throw new Error("Maximum 5 images per message");
  }

  // Verify S3 keys belong to this user
  if (imageS3Keys) {
    for (const key of imageS3Keys) {
      if (!key.startsWith(`user-uploads/${userId}/`)) {
        throw new Error(`Invalid image key: ${key}`);
      }
    }
  }

  if (!messageTimestamp) {
    throw new Error(
      "Message timestamp is required for accurate workout logging"
    );
  }

  console.info("✅ Request body validated:", {
    hasUserResponse: !!userResponse,
    hasMessageTimestamp: !!messageTimestamp,
    userResponseLength: userResponse.length,
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
  userProfile?: any // Optional: if already loaded, we can reuse it
): Promise<ConversationData> {
  const existingConversation = await getCoachConversation(
    userId,
    coachId,
    conversationId
  );
  if (!existingConversation) {
    throw new Error("Conversation not found");
  }

  const coachConfig = await getCoachConfig(userId, coachId);
  if (!coachConfig) {
    throw new Error("Coach configuration not found");
  }

  // Use provided user profile or load it (for backward compatibility with other callers)
  const profile = userProfile || await getUserProfile(userId);

  console.info("✅ Conversation, coach config, and user profile loaded successfully", {
    hasUserProfile: !!profile,
    userTimezone: profile?.attributes?.preferences?.timezone,
    profileWasReused: !!userProfile,
  });

  // Gather all conversation context (workouts + Pinecone)
  // Pass through the shouldQueryPinecone flag from smart router (if provided)
  const context = await gatherConversationContext(userId, userResponse, shouldQueryPinecone);

  return {
    existingConversation,
    coachConfig,
    context,
    userProfile: profile,
  };
}

// Main streaming handler using PROPER pipeline approach with on-demand generation
const streamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context
) => {
  console.info(
    "🚀 Starting stream-coach-conversation handler (Proper Pipeline Mode)"
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
};

// Generator function that yields SSE events with TRUE real-time streaming
async function* createCoachConversationEventStream(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context
): AsyncGenerator<string, void, unknown> {
  // Yield start event IMMEDIATELY (this happens right away)
  yield formatStartEvent();
  console.info("📡 Yielded start event immediately");

  try {
    // Start async processing but yield progress events as we go
    const processingPromise = processCoachConversationAsync(event, context);

    // Yield coach-like acknowledgment immediately while processing starts
    const coachAcknowledgments = [
      "Alright, let's work.",
      "I hear you.",
      "Let's figure this out.",
      "Got it, let's go.",
      "Right on.",
      "Let's dive in.",
      "I'm on it.",
      "Let's tackle this.",
      "Copy that."
    ];

    const randomAcknowledgment = coachAcknowledgments[Math.floor(Math.random() * coachAcknowledgments.length)];
    yield formatChunkEvent(randomAcknowledgment + "\n");
    console.info(`📡 Yielded coach acknowledgment: "${randomAcknowledgment}"`);

    // Now yield events as they become available from the async processing
    for await (const event of processingPromise) {
      yield event;
    }
  } catch (error) {
    console.error("❌ Processing error:", error);

    // Yield error event
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error("Unknown error occurred")
    );
    yield errorEvent;
  }
}

// Smart Router-based processing with optimized AI calls
async function* processCoachConversationAsync(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context
): AsyncGenerator<string, void, unknown> {
  // Step 1: Validate parameters (fast)
  const params = await validateAndExtractParams(event);

  // Step 2: Load user profile FIRST (needed for smart router temporal context)
  const userProfile = await getUserProfile(params.userId);
  const userTimezone = userProfile?.attributes?.preferences?.timezone;
  const criticalTrainingDirective = userProfile?.attributes?.criticalTrainingDirective;

  console.info("✅ User profile loaded for smart router:", {
    hasProfile: !!userProfile,
    timezone: userTimezone || 'America/Los_Angeles (default)',
    hasCriticalDirective: criticalTrainingDirective?.enabled || false,
  });

  // Step 3: SMART ROUTER - Single AI call with temporal context to determine ALL processing needs
  const routerAnalysis = await analyzeRequestCapabilities(
    params.userResponse,
    undefined, // messageContext - could be added later
    0, // conversationLength - could be calculated later
    userTimezone,
    criticalTrainingDirective
  );

  // Step 4: Load conversation data using smart router's Pinecone decision
  // Pass userProfile to avoid reloading it
  const conversationData = await loadConversationData(
    params.userId,
    params.coachId,
    params.conversationId,
    params.userResponse,
    routerAnalysis.contextNeeds.needsPineconeSearch, // Use smart router flag
    userProfile // Reuse already-loaded profile
  );

  console.info(`🧠 Smart Router Analysis:`, {
    userIntent: routerAnalysis.userIntent,
    showContextualUpdates: routerAnalysis.showContextualUpdates,
    isWorkoutLog: routerAnalysis.workoutDetection.isWorkoutLog,
    needsMemoryRetrieval: routerAnalysis.memoryProcessing.needsRetrieval,
    needsPineconeSearch: routerAnalysis.contextNeeds.needsPineconeSearch,
    pineconeSearchUsed: routerAnalysis.contextNeeds.needsPineconeSearch,  // Will control actual query
    hasComplexity: routerAnalysis.conversationComplexity.hasComplexity,
    processingTime: routerAnalysis.routerMetadata.processingTime,
    fallbackUsed: routerAnalysis.routerMetadata.fallbackUsed
  });

  // Step 4: Generate initial acknowledgment ONLY if router determines it's appropriate
  let contextualUpdates: string[] = [];

  if (routerAnalysis.showContextualUpdates) {
    try {
      console.info("🚀 Generating initial acknowledgment (router-approved)...");
      const initialAcknowledgment = await generateContextualUpdate(
        conversationData.coachConfig,
        params.userResponse,
        "initial_greeting",
        { stage: "starting" }
      );
      console.info(
        `📡 Initial acknowledgment ready: "${initialAcknowledgment.substring(0, 50)}..."`
      );
      contextualUpdates.push(initialAcknowledgment);
      // Add line breaks for proper streaming display
      const acknowledgmentEvent = formatChunkEvent(initialAcknowledgment + '\n\n');
      yield acknowledgmentEvent;
    } catch (error) {
      console.error("⚠️ Initial acknowledgment failed:", error);
    }
  }

  // Step 5: Process business logic based on router decisions
  const businessLogicParams = { ...params, ...conversationData };
  let workoutResult: any = null;
  let memoryResult: any = null;
  let memoryRetrieval: any = null;

  // OPTIMIZED: Only process workouts if router detected workout logging
  if (routerAnalysis.workoutDetection.isWorkoutLog) {
    console.info("🏋️ Router detected workout - processing workout detection");

    if (routerAnalysis.showContextualUpdates) {
      const workoutUpdate = await generateContextualUpdate(
        conversationData.coachConfig,
        params.userResponse,
        "workout_analysis",
        { stage: "analyzing_workouts" }
      );
      contextualUpdates.push(workoutUpdate);
      // Add line breaks for proper streaming display
      yield formatChunkEvent(workoutUpdate + '\n\n');
    }

    workoutResult = await processWorkoutDetection(businessLogicParams);
  } else {
    console.info("⏭️ Router determined no workout - skipping workout detection");
    // Provide fallback workout result
    workoutResult = {
      isWorkoutLogging: false,
      workoutContent: params.userResponse,
      workoutDetectionContext: [],
      slashCommand: { isSlashCommand: false },
      isSlashCommandWorkout: false,
      isNaturalLanguageWorkout: false,
    };
  }

  // OPTIMIZED: Only process memory if router determined it's needed
  if (routerAnalysis.memoryProcessing.needsRetrieval || routerAnalysis.memoryProcessing.isMemoryRequest) {
    console.info("🧠 Router detected memory needs - processing memory");

    if (routerAnalysis.showContextualUpdates) {
      const memoryUpdate = await generateContextualUpdate(
        conversationData.coachConfig,
        params.userResponse,
        "memory_analysis",
        {
          stage: "checking_memories",
          workoutDetected: workoutResult.isWorkoutLogging,
          recentWorkouts: conversationData.context?.workoutContext?.length || 0,
        }
      );
      contextualUpdates.push(memoryUpdate);
      // Add line breaks for proper streaming display
      yield formatChunkEvent(memoryUpdate + '\n\n');
    }

    // Use consolidated memory analysis instead of separate calls
    const consolidatedMemoryAnalysis = await analyzeMemoryNeeds(
      params.userResponse,
      conversationData.existingConversation.attributes.messages
        .slice(-3)
        .map((msg: any) => `${msg.role}: ${msg.content}`)
        .join("\n"),
      conversationData.coachConfig.attributes.coach_name
    );

    // Process memory retrieval if needed
    if (consolidatedMemoryAnalysis.needsRetrieval) {
      memoryRetrieval = await queryMemories(
        params.userId,
        params.coachId,
        params.userResponse,
        conversationData.existingConversation.attributes.messages
          .slice(-3)
          .map((msg: any) => `${msg.role}: ${msg.content}`)
          .join("\n")
      );
    } else {
      memoryRetrieval = { memories: [] };
    }

    // Process memory saving if needed
    if (consolidatedMemoryAnalysis.isMemoryRequest) {
      memoryResult = await detectAndProcessMemory(
        params.userResponse,
        params.userId,
        params.coachId,
        params.conversationId,
        conversationData.existingConversation.attributes.messages,
        conversationData.coachConfig.attributes.coach_name
      );
    } else {
      memoryResult = { memoryFeedback: null };
    }
  } else {
    console.info("⏭️ Router determined no memory processing needed - skipping");
    memoryResult = { memoryFeedback: null };
    memoryRetrieval = { memories: [] };
  }

  // Yield pattern analysis update ONLY if appropriate
  if (routerAnalysis.showContextualUpdates) {
    const patternUpdate = await generateContextualUpdate(
      conversationData.coachConfig,
      params.userResponse,
      "pattern_analysis",
      {
        stage: "analyzing_patterns",
        memoriesFound: memoryRetrieval.memories?.length || 0,
        conversationLength:
          conversationData.existingConversation.attributes.messages.length,
      }
    );
    contextualUpdates.push(patternUpdate);
    // Add line breaks for proper streaming display
    yield formatChunkEvent(patternUpdate + '\n\n');

    // Yield pre-AI insights tease
    const insightsUpdate = await generateContextualUpdate(
      conversationData.coachConfig,
      params.userResponse,
      "insights_brewing",
      {
        stage: "preparing_insights",
        hasWorkoutData: workoutResult.isWorkoutLogging,
        hasMemories: memoryRetrieval.memories?.length > 0,
        userMessageType: categorizeUserMessage(params.userResponse),
      }
    );
    contextualUpdates.push(insightsUpdate);
    // Add line breaks for proper streaming display
    yield formatChunkEvent(insightsUpdate + '\n\n');
  }

  // Create user message and conversation context
  const newUserMessage: CoachMessage = {
    id: `msg_${Date.now()}_user`,
    role: "user",
    content: params.userResponse || '',
    timestamp: new Date(params.messageTimestamp),
    messageType: params.imageS3Keys && params.imageS3Keys.length > 0 ? 'text_with_images' : 'text',
    imageS3Keys: params.imageS3Keys || undefined,
  };

  const conversationContext = {
    sessionNumber:
      conversationData.existingConversation.attributes.messages.filter(
        (msg: any) => msg.role === "user"
      ).length + 1,
  };

  // Step 6: Stream AI chunks in REAL-TIME
  let fullAIResponse = "";

  // IMPORTANT: Accumulate contextual updates into the final response
  if (routerAnalysis.showContextualUpdates && contextualUpdates.length > 0) {
    // Add contextual updates to the final response with proper formatting
    const contextualUpdatesText = contextualUpdates
      .filter(update => update && update.trim())
      .join('\n\n');

    if (contextualUpdatesText) {
      fullAIResponse += `${contextualUpdatesText}\n\n`;
      console.info(`📝 Added ${contextualUpdates.length} contextual updates to final response (${contextualUpdatesText.length} chars)`);
    }
  }

  try {
    console.info("🚀 Starting REAL-TIME AI streaming...");

    const streamResult = await generateAIResponseStream(
      conversationData.coachConfig,
      conversationData.context,
      workoutResult,
      memoryRetrieval,
      params.userResponse,
      conversationData.existingConversation.attributes.messages,
      conversationContext,
      params.userId,
      params.coachId,
      params.conversationId,
      conversationData.userProfile,
      params.imageS3Keys // NEW: Pass imageS3Keys
    );

    // Yield AI response chunks using optimized buffering strategy
    const aiStartTime = Date.now();
    const optimizedChunkStream = createOptimizedChunkStream(streamResult.responseStream);

    for await (const optimizedChunk of optimizedChunkStream) {
      const chunkTime = Date.now() - aiStartTime;
      fullAIResponse += optimizedChunk;

      yield formatChunkEvent(optimizedChunk);
      console.info(
        `📡 [${chunkTime}ms] Optimized AI chunk yielded: "${optimizedChunk.substring(0, 30)}..." (${optimizedChunk.length} chars)`
      );
    }

    console.info("✅ Real-time AI streaming completed successfully");
  } catch (error) {
    console.error("❌ Error in AI response generation, using fallback:", error);
    fullAIResponse +=
      "I apologize, but I'm having trouble generating a response right now. Your message has been saved and I'll be back to help you soon!";
  }

  // Add memory feedback if any memory was processed
  if (FEATURE_FLAGS.ENABLE_MEMORY_PROCESSING && memoryResult.memoryFeedback) {
    fullAIResponse = `${memoryResult.memoryFeedback}\n\n${fullAIResponse}`;
  }

  // Create final AI message with complete response
  const newAiMessage: CoachMessage = {
    id: `msg_${Date.now()}_assistant`,
    role: "assistant",
    content: fullAIResponse,
    timestamp: new Date(),
    metadata: {
      model: MODEL_IDS.CLAUDE_SONNET_4_DISPLAY,
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
    routerAnalysis
  );
  yield completeEvent;
}

// Helper function to save conversation and yield completion (separated for clarity)
async function saveConversationAndYieldComplete(
  results: BusinessResults,
  params: ValidationParams,
  conversationData: ConversationData,
  routerAnalysis: SmartRequestRouter
): Promise<string> {
  const { userId, coachId, conversationId } = params;
  const { context } = conversationData;
  const { newUserMessage, newAiMessage } = results;

  // Save messages to DynamoDB - capture the save result for size tracking
  const saveResult = await sendCoachConversationMessage(userId, coachId, conversationId, [
    newUserMessage,
    newAiMessage,
  ]);

  console.info("✅ Conversation updated successfully");

  // Extract size information from the save result
  const itemSizeKB = parseFloat(saveResult?.dynamodbResult?.itemSizeKB || '0');
  const sizePercentage = Math.min(Math.round((itemSizeKB / 400) * 100), 100);
  const isApproachingLimit = itemSizeKB > 350; // 87.5% threshold

  console.info('📊 Conversation size:', {
    sizeKB: itemSizeKB,
    percentage: sizePercentage,
    isApproachingLimit,
    maxSizeKB: 400
  });

  // Trigger async conversation summary if enabled
  if (FEATURE_FLAGS.ENABLE_CONVERSATION_SUMMARY) {
    try {
      // Get the updated conversation to check the current message count (same as original handler)
      const updatedConversation = await getCoachConversation(
        userId,
        coachId,
        conversationId
      );
      if (updatedConversation) {
        const currentMessageCount =
          updatedConversation.attributes.metadata.totalMessages;

        await detectAndProcessConversationSummary(
          userId,
          coachId,
          conversationId,
          params.userResponse,
          currentMessageCount
        );

        console.info("✅ Conversation summary processing completed");
      }
    } catch (summaryError) {
      console.warn(
        "⚠️ Conversation summary processing failed (non-critical):",
        summaryError
      );
    }
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
      isApproachingLimit
    }
  });

  console.info(
    "✅ Proper pipeline streaming implementation completed successfully"
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
  context: Context
) => {
  // Set streaming headers (CORS headers are handled by Lambda Function URL CORS config)
  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: STREAMING_HEADERS,
  });

  try {
    // OPTIONS requests are handled automatically by Lambda Function URL CORS config
    console.info("🚀 Processing streaming request:", {
      method: event.requestContext?.http?.method,
      path: event.rawPath,
    });

    // Call the authenticated handler
    return await withStreamingAuth(streamingHandler, {
      allowInternalCalls: false,
      requireUserId: true,
      validateUserIdMatch: true,
      routePattern: COACH_CONVERSATION_ROUTE,
    })(event, responseStream, context);
  } catch (error) {
    console.error("❌ Authentication error:", error);

    // Create error stream using pipeline approach
    const errorEvent = formatAuthErrorEvent(
      error instanceof Error ? error : new Error("Authentication failed")
    );

    const errorStream = Readable.from([errorEvent]);
    await pipeline(errorStream, responseStream);
  }
};

// Use awslambda.streamifyResponse to enable streaming responses
// awslambda is a global object provided by Lambda's Node.js runtime
console.info(
  "🔧 awslambda global available:",
  typeof (globalThis as any).awslambda !== "undefined"
);
console.info(
  "🔧 streamifyResponse available:",
  typeof (globalThis as any).awslambda?.streamifyResponse === "function"
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
      "Ensure the function is deployed with RESPONSE_STREAM invoke mode."
  );
}

console.info("✅ Using awslambda.streamifyResponse for streaming mode");
handler = awslambda.streamifyResponse(authenticatedStreamingHandler);

export { handler };
