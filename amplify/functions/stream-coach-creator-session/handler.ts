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
  callBedrockApiMultimodalStream,
  MODEL_IDS,
  AI_ERROR_FALLBACK_MESSAGE,
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
  buildCoachCreatorMessagesWithCaching,
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
  fullAiResponse: string,
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
  const detectedLevel = extractSophisticationLevel(fullAiResponse);
  const cleanedResponse = cleanResponse(fullAiResponse);

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

    // Step 2: Load session data (PARALLELIZED with contextual update)
    console.info("📂 Step 2: Loading session data + generating contextual update");
    const phase1StartTime = Date.now();

    // Parallel execution: session loading + contextual update generation
    const [startingUpdate, sessionData] = await Promise.all([
      generateCoachCreatorContextualUpdate(
        params.userResponse,
        "session_review",
        {}
      ),
      loadSessionData(params.userId, params.sessionId)
    ]);

    const phase1Time = Date.now() - phase1StartTime;
    console.info(`✅ Phase 1 parallel loading completed in ${phase1Time}ms`);

    yield formatContextualEvent(startingUpdate, 'session_review');
    console.info("💬 Yielded starting update (Vesper):", startingUpdate);

    // Step 3: Get current question
    console.info("❓ Step 3: Getting current question");
    const currentQuestion = getCurrentQuestion(
      sessionData.session.attributes.userContext
    );
    if (!currentQuestion) {
      throw new Error("No current question found");
    }

    // Step 4-5: PARALLELIZED context gathering (methodology + memory)
    console.info("⚡ Step 4-5: Parallel context gathering (methodology + memory + contextual updates)");
    const phase2StartTime = Date.now();

    // Get question text for Pinecone search query
    const questionText =
      currentQuestion?.versions[
        sessionData.session.attributes.userContext
          .sophisticationLevel as SophisticationLevel
      ] ||
      currentQuestion?.versions.UNKNOWN ||
      "";
    const searchQuery = `${params.userResponse} ${questionText}`;

    // Build message context for memory analysis
    const messageContext = buildMessageContext(
      sessionData.session.attributes.questionHistory,
      5  // Increased for better conversational context
    );

    // Parallel execution: methodology + memory + contextual updates
    const [
      { methodologyContext, contextUpdate },
      { memoryContext, memoryUpdate }
    ] = await Promise.all([
      // Parallel operation 1: Methodology context + contextual update
      (async () => {
        let methodologyContext = "";
        let contextUpdate = "";

        try {
          // Parallel: generate contextual update + query Pinecone
          const [update, pineconeResults] = await Promise.all([
            generateCoachCreatorContextualUpdate(
              params.userResponse,
              "methodology_search",
              {}
            ),
            queryPineconeContext(
              params.userId,
              searchQuery,
              {
                topK: 5,
                includeMethodology: true,
                includeWorkouts: false,
                includeCoachCreator: false,
                includeConversationSummaries: false,
                enableReranking: false, // Disabled for performance
                minScore: 0.25,
              }
            )
          ]);

          contextUpdate = update;
          const pineconeMatches = pineconeResults.matches || [];

          if (pineconeMatches.length > 0) {
            methodologyContext = pineconeMatches
              .map((match: any) => match.content || "")
              .filter((text) => text.length > 0)
              .join("\n\n")
              .substring(0, 2000);

            console.info("✅ Pinecone methodology context retrieved:", {
              matches: pineconeMatches.length,
              contextLength: methodologyContext.length,
            });
          } else {
            console.info("ℹ️ No Pinecone methodology matches found");
          }
        } catch (error) {
          console.warn("⚠️ Methodology context failed (non-critical):", error);
          // Generate fallback contextual update
          contextUpdate = "Gathering methodology context...";
        }

        return { methodologyContext, contextUpdate };
      })(),

      // Parallel operation 2: Memory context + contextual update
      (async () => {
        let memoryContext = "";
        let memoryUpdate = "";

        try {
          // Parallel: generate contextual update + analyze memory needs
          const [update, memoryAnalysis] = await Promise.all([
            generateCoachCreatorContextualUpdate(
              params.userResponse,
              "memory_check",
              {}
            ),
            analyzeMemoryNeeds(
              params.userResponse,
              messageContext,
              "Coach Creator"
            )
          ]);

          memoryUpdate = update;

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
                enableReranking: false, // Disabled for performance
                minScore: 0.25,
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
        } catch (error) {
          console.warn("⚠️ Memory processing failed (non-critical):", error);
          // Generate fallback contextual update
          memoryUpdate = "Checking your memories...";
        }

        return { memoryContext, memoryUpdate };
      })()
    ]);

    const phase2Time = Date.now() - phase2StartTime;
    console.info(`✅ Phase 2 parallel context gathering completed in ${phase2Time}ms`);

    // Yield contextual updates immediately after parallel completion
    yield formatContextualEvent(contextUpdate, 'methodology_search');
    console.info("💬 Yielded context update (Vesper):", contextUpdate);
    yield formatContextualEvent(memoryUpdate, 'memory_check');
    console.info("💬 Yielded memory update (Vesper):", memoryUpdate);

    // Step 6: Build question prompt with contexts (separated for caching)
    console.info("📝 Step 6: Building question prompt with contexts");
    const promptResult = buildQuestionPrompt(
      currentQuestion,
      sessionData.session.attributes.userContext,
      sessionData.session.attributes.questionHistory,
      sessionData.userProfile?.attributes?.criticalTrainingDirective,
      methodologyContext,
      memoryContext
    );

    const { staticPrompt, dynamicPrompt, conversationHistory } = promptResult;

    // Step 7: Contextual update before AI response (Vesper's voice)
    const craftingUpdate = await generateCoachCreatorContextualUpdate(
      params.userResponse,
      "response_crafting",
      {}
    );
    yield formatContextualEvent(craftingUpdate, 'response_crafting');
    console.info("💬 Yielded crafting update (Vesper):", craftingUpdate);

    // Step 8: Stream AI response with caching support
    console.info("🚀 Step 8: Starting AI response streaming with cache optimization");
    let fullAiResponse = "";

    try {
      // Check if we should use conversation history caching
      const shouldUseHistoryCaching = conversationHistory && conversationHistory.length >= 8;

      let responseStream: AsyncGenerator<string, void, unknown>;

      if (shouldUseHistoryCaching) {
        // Use multimodal API with conversation history caching
        const messagesWithCaching = buildCoachCreatorMessagesWithCaching(
          conversationHistory,
          params.userResponse
        );

        console.info('💰 Using conversation history caching for coach creator', {
          totalHistory: conversationHistory.length,
          messagesCount: messagesWithCaching.length,
        });

        // Use multimodal stream API (supports text-only with caching)
        responseStream = await callBedrockApiMultimodalStream(
          staticPrompt + dynamicPrompt, // System prompt with cache points
          messagesWithCaching,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          { staticPrompt, dynamicPrompt } // Enable prompt caching
        );
      } else {
        // Short sessions: use standard streaming with basic prompt caching
        console.info('📝 Using standard streaming (session too short for history caching)', {
          historyLength: conversationHistory?.length || 0,
        });

        responseStream = await getAIResponseStream(
          promptResult.fullPrompt, // Use full prompt for backwards compatibility
          {
            userResponse: params.userResponse,
            messageTimestamp: params.messageTimestamp,
            imageS3Keys: params.imageS3Keys,
          },
          { staticPrompt, dynamicPrompt } // Enable basic prompt caching
        );
      }

      // Stream AI response chunks
      for await (const chunk of responseStream) {
        fullAiResponse += chunk;
        yield formatChunkEvent(chunk);
      }

      console.info("✅ AI response streaming completed:", {
        responseLength: fullAiResponse.length,
      });
    } catch (error) {
      console.error("❌ Error in AI response generation, using fallback:", error);
      fullAiResponse += AI_ERROR_FALLBACK_MESSAGE;
    }

    // Step 9: Process and save session
    console.info("⚙️ Step 9: Processing session update");
    const processedResponse = await processSessionUpdate(
      params,
      fullAiResponse,
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

    // FIX: Prevent Lambda from hanging - all streaming is complete, don't wait for event loop
    context.callbackWaitsForEmptyEventLoop = false;
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
    // Check if this is a health check or OPTIONS request (these don't have proper paths/auth)
    const method = event.requestContext?.http?.method;
    const path = event.rawPath || '';
    
    if (!path || path === '/' || method === 'OPTIONS') {
      console.info("⚠️ Ignoring health check or OPTIONS request:", { method, path });
      // Just close the stream for these requests
      responseStream.end();
      return;
    }

    // OPTIONS requests are handled automatically by Lambda Function URL CORS config
    console.info("🚀 Processing streaming request:", {
      method,
      path,
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

