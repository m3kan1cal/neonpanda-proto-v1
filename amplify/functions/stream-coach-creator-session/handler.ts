import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";

const { Readable } = stream;
const pipeline = util.promisify(stream.pipeline);

// awslambda is a global object provided by Lambda's Node.js runtime environment
// No import or declaration is required - it's automatically available

// Import business logic utilities
import {
  invokeAsyncLambda,
  queryPineconeContext,
} from "../libs/api-helpers";
import {
  getCoachCreatorSession,
  getUserProfile,
  saveCoachCreatorSession,
} from "../../dynamodb/operations";
import { SophisticationLevel } from "../libs/coach-creator/types";
import { queryMemories } from "../libs/coach-conversation/memory-processing";
import { analyzeMemoryNeeds } from "../libs/memory/detection";
import { generateCoachCreatorContextualUpdate } from "../libs/coach-conversation/contextual-updates";
import {
  buildQuestionPrompt,
  getCurrentQuestion,
  getNextQuestion,
  extractSophisticationLevel,
  cleanResponse,
} from "../libs/coach-creator/question-management";
import {
  getProgress,
  storeUserResponse,
  addQuestionHistory,
  checkUserWantsToFinish,
  updateSessionContext,
  markSessionComplete,
} from "../libs/coach-creator/session-management";
import { extractSophisticationSignals } from "../libs/coach-creator/data-extraction";

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
  formatCompleteEvent,
  formatValidationErrorEvent,
  formatAuthErrorEvent,
  validateStreamingRequestBody,
  getRandomCoachCreatorAcknowledgement,
  getAIResponseStream,
  AI_ERROR_FALLBACK_MESSAGE,
  buildMessageContext,
  formatMemoryContext,
} from "../libs/streaming";

// Route pattern for coach creator sessions
const COACH_CREATOR_SESSION_ROUTE =
  STREAMING_ROUTE_PATTERNS.COACH_CREATOR_SESSION ||
  "/users/{userId}/coach-creator-sessions/{sessionId}/stream";

// Validation params interface
interface ValidationParams {
  userId: string;
  sessionId: string;
  userResponse: string;
  messageTimestamp: string;
  imageS3Keys?: string[];
}

// Session data interface
interface SessionData {
  session: any;
  userProfile: any;
}

/**
 * Extract and validate request parameters
 */
async function validateAndExtractParams(
  event: AuthenticatedLambdaFunctionURLEvent
): Promise<ValidationParams> {
  // Extract and validate path parameters
  const pathParams = extractPathParameters(
    event.rawPath,
    COACH_CREATOR_SESSION_ROUTE
  );
  const { userId, sessionId } = pathParams;

  // Validate required path parameters
  const validation = validateRequiredPathParams(pathParams, [
    "userId",
    "sessionId",
  ]);
  if (!validation.isValid) {
    throw new Error(
      `Missing required path parameters: ${validation.missing.join(", ")}. Expected: ${COACH_CREATOR_SESSION_ROUTE}`
    );
  }

  console.info("✅ Path parameters validated:", {
    userId,
    sessionId,
  });

  // Parse and validate request body using shared utility
  const { userResponse, messageTimestamp, imageS3Keys } =
    validateStreamingRequestBody(event.body, userId as string, {
      requireUserResponse: true,
      maxImages: 5,
    });

  console.info("✅ Request body validated:", {
    hasUserResponse: !!userResponse,
    hasMessageTimestamp: !!messageTimestamp,
    userResponseLength: userResponse.length,
    imageCount: imageS3Keys?.length || 0,
  });

  return {
    userId: userId as string,
    sessionId: sessionId as string,
    userResponse,
    messageTimestamp,
    imageS3Keys,
  };
}

/**
 * Load session data
 */
async function loadSessionData(
  userId: string,
  sessionId: string
): Promise<SessionData> {
  console.info("📂 Loading session data:", { userId, sessionId });

  const [session, userProfile] = await Promise.all([
    getCoachCreatorSession(userId, sessionId),
    getUserProfile(userId),
  ]);

  if (!session) {
    throw new Error("Session not found or expired");
  }

  console.info("✅ Session data loaded successfully");

  return {
    session,
    userProfile,
  };
}

/**
 * Process complete AI response and update session
 */
async function processSessionUpdate(
  params: ValidationParams,
  fullAIResponse: string,
  sessionData: SessionData,
  currentQuestion: any
): Promise<{
  cleanedResponse: string;
  detectedLevel: SophisticationLevel | null;
  isComplete: boolean;
  progressDetails: any;
  nextQuestion: any;
  isOnFinalQuestion: boolean;
}> {
  console.info("⚙️ Processing session update");

  // Extract sophistication and clean response
  const detectedLevel = extractSophisticationLevel(fullAIResponse);
  const cleanedResponse = cleanResponse(fullAIResponse);

  // Extract signals from user response
  const detectedSignals = extractSophisticationSignals(
    params.userResponse,
    currentQuestion
  );

  // Store the response
  sessionData.session.attributes.userContext = storeUserResponse(
    sessionData.session.attributes.userContext,
    currentQuestion,
    params.userResponse
  );

  addQuestionHistory(
    sessionData.session.attributes,
    currentQuestion,
    params.userResponse,
    cleanedResponse,
    detectedLevel || "UNKNOWN",
    params.imageS3Keys
  );

  // Check if complete
  const nextQuestion = getNextQuestion(
    sessionData.session.attributes.userContext
  );
  const isOnFinalQuestion = nextQuestion === null;
  const userWantsToFinish =
    isOnFinalQuestion && await checkUserWantsToFinish(params.userResponse);
  const isComplete = isOnFinalQuestion && userWantsToFinish;

  // Update session context
  sessionData.session.attributes.userContext = updateSessionContext(
    sessionData.session.attributes.userContext,
    detectedLevel,
    detectedSignals,
    isOnFinalQuestion
  );

  // Update root-level lastActivity timestamp
  sessionData.session.attributes.lastActivity = new Date();

  if (isComplete) {
    markSessionComplete(sessionData.session.attributes);
  }

  // Get progress details
  const progressDetails = getProgress(
    sessionData.session.attributes.userContext
  );

  console.info("✅ Session update processed:", {
    isComplete,
    isOnFinalQuestion,
    sophisticationLevel: detectedLevel,
    progress: progressDetails.percentage,
  });

  return {
    cleanedResponse,
    detectedLevel,
    isComplete,
    progressDetails,
    nextQuestion,
    isOnFinalQuestion,
  };
}

/**
 * Save session and yield complete event
 */
async function saveSessionAndYieldComplete(
  params: ValidationParams,
  processedResponse: any,
  sessionData: SessionData
): Promise<string> {
  console.info("💾 Saving session...");

  // Save updated session
  await saveCoachCreatorSession(sessionData.session.attributes);

  console.info("✅ Session saved successfully");

  // Trigger async coach config generation if complete
  if (processedResponse.isComplete) {
    try {
      const buildCoachConfigFunction =
        process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
      if (!buildCoachConfigFunction) {
        console.warn(
          "⚠️ BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set"
        );
      } else {
        await invokeAsyncLambda(
          buildCoachConfigFunction,
          {
            userId: params.userId,
            sessionId: params.sessionId,
          },
          "coach config generation"
        );

        console.info("✅ Triggered async coach config generation");
      }
    } catch (error) {
      console.error("❌ Failed to trigger coach config generation:", error);
      // Don't fail the request if coach config trigger fails
    }
  }

  // Format complete event
  const sophisticationLevel =
    sessionData.session.attributes.userContext.sophisticationLevel;

  return formatCompleteEvent({
    messageId: `response_${Date.now()}`, // Generate unique response ID
    type: "complete",
    fullMessage: processedResponse.cleanedResponse,
    aiResponse: processedResponse.cleanedResponse,
    isComplete: processedResponse.isComplete,
    sessionId: params.sessionId,
    progressDetails: {
      questionsCompleted: processedResponse.progressDetails.questionsCompleted,
      totalQuestions: processedResponse.progressDetails.totalQuestions,
      percentage: processedResponse.progressDetails.percentage,
      sophisticationLevel: sophisticationLevel,
      currentQuestion:
        sessionData.session.attributes.userContext.currentQuestion,
    },
    nextQuestion: processedResponse.nextQuestion
      ? processedResponse.nextQuestion.versions[
          sophisticationLevel as SophisticationLevel
        ] || processedResponse.nextQuestion.versions.UNKNOWN
      : null,
    coachConfigGenerating: processedResponse.isComplete,
    onFinalQuestion:
      processedResponse.isOnFinalQuestion && !processedResponse.isComplete,
  });
}

/**
 * Main event stream generator for coach creator sessions
 */
async function* createCoachCreatorEventStream(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context
): AsyncGenerator<string, void, unknown> {
  // Immediately yield start event
  yield formatStartEvent();
  console.info("📡 Yielded start event immediately");

  // Yield coach creator acknowledgment immediately while processing starts (as contextual update)
  const randomAcknowledgment = getRandomCoachCreatorAcknowledgement();
  yield formatContextualEvent(randomAcknowledgment, 'session_review');
  console.info(`📡 Yielded coach creator acknowledgment (contextual): "${randomAcknowledgment}"`);

  try {
    // Step 1: Validate and extract parameters
    console.info("🔍 Step 1: Validating parameters");
    const params = await validateAndExtractParams(event);

    // Step 2: Load session data
    console.info("📂 Step 2: Loading session data");

    // Contextual update: Starting processing (Vesper's voice)
    const startingUpdate = await generateCoachCreatorContextualUpdate(
      params.userResponse,
      "session_review",
      {}
    );
    yield formatContextualEvent(startingUpdate, 'session_review');
    console.info("💬 Yielded starting update (Vesper):", startingUpdate);

    const sessionData = await loadSessionData(params.userId, params.sessionId);

    // Step 3: Get current question
    console.info("❓ Step 3: Getting current question");
    const currentQuestion = getCurrentQuestion(
      sessionData.session.attributes.userContext
    );
    if (!currentQuestion) {
      throw new Error("No current question found");
    }

    // Step 4: Query Pinecone for methodology context
    console.info("📚 Step 4: Querying Pinecone for methodology context");

    // Contextual update: Gathering methodology context (Vesper's voice)
    const contextUpdate = await generateCoachCreatorContextualUpdate(
      params.userResponse,
      "methodology_search",
      {}
    );
    yield formatContextualEvent(contextUpdate, 'methodology_search');
    console.info("💬 Yielded context update (Vesper):", contextUpdate);

    let methodologyContext = "";

    try {
      // Get question text from current sophistication level
      const questionText =
        currentQuestion?.versions[
          sessionData.session.attributes.userContext
            .sophisticationLevel as SophisticationLevel
        ] ||
        currentQuestion?.versions.UNKNOWN ||
        "";
      const searchQuery = `${params.userResponse} ${questionText}`;

      const pineconeStartTime = Date.now();
      const pineconeResults = await queryPineconeContext(
        params.userId,
        searchQuery,
        {
          topK: 5,
          includeMethodology: true,
          includeWorkouts: false,
          includeCoachCreator: false,
          includeConversationSummaries: false,
          enableReranking: false, // Disabled for performance - coach creator queries are specific enough
          minScore: 0.25, // Lower threshold - semantic scores are typically 0.22-0.30 range
        }
      );
      const pineconeElapsedMs = Date.now() - pineconeStartTime;
      console.info(`⏱️ Pinecone methodology query completed in ${pineconeElapsedMs}ms`);

      const pineconeMatches = pineconeResults.matches || [];

      if (pineconeMatches.length > 0) {
        methodologyContext = pineconeMatches
          .map((match: any) => match.content || "")
          .filter((text) => text.length > 0)
          .join("\n\n")
          .substring(0, 2000); // Limit to 2000 chars

        console.info("✅ Pinecone methodology context retrieved:", {
          matches: pineconeMatches.length,
          contextLength: methodologyContext.length,
        });
      } else {
        console.info("ℹ️ No Pinecone methodology matches found");
      }
    } catch (pineconeError) {
      console.warn("⚠️ Pinecone query failed (non-critical):", pineconeError);
      // Continue without methodology context
    }

    // Step 5: Smart memory detection + retrieval
    console.info("🧠 Step 5: Analyzing memory needs");

    // Contextual update: Checking memories (Vesper's voice)
    const memoryUpdate = await generateCoachCreatorContextualUpdate(
      params.userResponse,
      "memory_check",
      {}
    );
    yield formatContextualEvent(memoryUpdate, 'memory_check');
    console.info("💬 Yielded memory update (Vesper):", memoryUpdate);

    let memoryContext = "";

    try {
      // Build message context using shared utility
      const messageContext = buildMessageContext(
        sessionData.session.attributes.questionHistory,
        5  // Increased for better conversational context
      );

      // Detect if memory retrieval is needed
      const memoryAnalysis = await analyzeMemoryNeeds(
        params.userResponse,
        messageContext,
        "Coach Creator"
      );

      console.info("🧠 Memory analysis result:", {
        needsRetrieval: memoryAnalysis.needsRetrieval,
        reason: memoryAnalysis.retrievalContext?.reasoning,
      });

      // Only query memories if needed
      if (memoryAnalysis.needsRetrieval) {
        const memoryResults = await queryMemories(
          params.userId,
          null as any, // Query across ALL coaches
          params.userResponse,
          messageContext,
          {
            enableReranking: false, // Disabled for performance - coach creator queries are specific
            minScore: 0.25, // Lower threshold - semantic scores are typically 0.22-0.30 range
          }
        );

        const userMemories = memoryResults.memories || [];

        if (userMemories.length > 0) {
          // Format memory context using shared utility
          memoryContext = formatMemoryContext(userMemories, 2000);

          console.info("✅ User memories retrieved:", {
            count: userMemories.length,
            contextLength: memoryContext.length,
          });
        } else {
          console.info("📭 No relevant memories found");
        }
      } else {
        console.info("⏭️ Memory retrieval not needed for this response");
      }
    } catch (memoryError) {
      console.warn("⚠️ Memory processing failed (non-critical):", memoryError);
      // Continue without memories
    }

    // Step 6: Build question prompt with contexts
    console.info("📝 Step 6: Building question prompt with contexts");
    const questionPrompt = buildQuestionPrompt(
      currentQuestion,
      sessionData.session.attributes.userContext,
      sessionData.session.attributes.questionHistory,
      sessionData.userProfile?.attributes?.criticalTrainingDirective,
      methodologyContext,
      memoryContext
    );

    // Step 7: Contextual update before AI response (Vesper's voice)
    const craftingUpdate = await generateCoachCreatorContextualUpdate(
      params.userResponse,
      "response_crafting",
      {}
    );
    yield formatContextualEvent(craftingUpdate, 'response_crafting');
    console.info("💬 Yielded crafting update (Vesper):", craftingUpdate);

    // Step 8: Stream AI response (single call)
    console.info("🚀 Step 8: Starting AI response streaming");
    let fullAIResponse = "";

    try {
      // Get AI response stream using shared utility (handles both text-only and multimodal)
      const responseStream = await getAIResponseStream(questionPrompt, {
        userResponse: params.userResponse,
        messageTimestamp: params.messageTimestamp,
        imageS3Keys: params.imageS3Keys,
      });

      // Stream AI response chunks
      for await (const chunk of responseStream) {
        fullAIResponse += chunk;
        yield formatChunkEvent(chunk);
      }

      console.info("✅ AI response streaming completed:", {
        responseLength: fullAIResponse.length,
      });
    } catch (aiError) {
      console.error("❌ Error in AI response generation:", aiError);
      fullAIResponse = AI_ERROR_FALLBACK_MESSAGE;
    }

    // Step 9: Process and save session
    console.info("⚙️ Step 9: Processing session update");
    const processedResponse = await processSessionUpdate(
      params,
      fullAIResponse,
      sessionData,
      currentQuestion
    );

    // Step 10: Save and yield complete
    console.info("💾 Step 10: Saving session and yielding complete event");
    const completeEvent = await saveSessionAndYieldComplete(
      params,
      processedResponse,
      sessionData
    );
    yield completeEvent;

    console.info("✅ Streaming completed successfully");
  } catch (error) {
    console.error("❌ Error in coach creator streaming:", error);
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error("Unknown error occurred")
    );
    yield errorEvent;
  }
}

/**
 * Internal streaming handler with authentication
 */
const internalStreamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context
) => {
  console.info("🎬 Starting coach creator session streaming handler");

  try {
    // Create SSE event stream
    const eventGenerator = createCoachCreatorEventStream(event, context);
    const sseEventStream = Readable.from(eventGenerator);

    // Pipeline the SSE stream to response stream
    await pipeline(sseEventStream, responseStream);

    console.info("✅ Streaming pipeline completed successfully");
  } catch (error) {
    console.error("❌ Fatal error in streaming handler:", error);
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

    // Apply authentication middleware
    return await withStreamingAuth(internalStreamingHandler, {
      allowInternalCalls: false,
      requireUserId: true,
      validateUserIdMatch: true,
      routePattern: STREAMING_ROUTE_PATTERNS.COACH_CREATOR_SESSION,
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

