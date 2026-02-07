import type { Context } from "aws-lambda";
import util from "util";
import stream from "stream";

const { Readable } = stream;
const pipeline = util.promisify(stream.pipeline);

// awslambda is a global object provided by Lambda's Node.js runtime environment
// No import or declaration is required - it's automatically available

// Import business logic utilities
import { generateCoachCreatorContextualUpdate } from "../libs/coach-conversation/contextual-updates";
import {
  loadSessionData,
  saveSessionAndTriggerCoachConfig,
  SessionData,
} from "../libs/coach-creator/session-management";
import { handleTodoListConversation } from "../libs/coach-creator/conversation-handler";
import { queryPineconeContext } from "../libs/api-helpers";
import { formatPineconeContext } from "../libs/pinecone-utils";

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

/**
 * Extract and validate request parameters
 */
async function validateAndExtractParams(
  event: AuthenticatedLambdaFunctionURLEvent,
): Promise<ValidationParams> {
  // Extract and validate path parameters
  const pathParams = extractPathParameters(
    event.rawPath,
    COACH_CREATOR_SESSION_ROUTE,
  );
  const { userId, sessionId } = pathParams;

  // Validate required path parameters
  const validation = validateRequiredPathParams(pathParams, [
    "userId",
    "sessionId",
  ]);
  if (!validation.isValid) {
    throw new Error(
      `Missing required path parameters: ${validation.missing.join(", ")}. Expected: ${COACH_CREATOR_SESSION_ROUTE}`,
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
 * Main event stream generator for coach creator sessions
 */
async function* createCoachCreatorEventStream(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context,
): AsyncGenerator<string, void, unknown> {
  // Immediately yield start event
  yield formatStartEvent();
  console.info("📡 Yielded start event immediately");

  // Yield coach creator acknowledgment immediately while processing starts (as contextual update)
  const randomAcknowledgment = getRandomCoachCreatorAcknowledgement();
  yield formatContextualEvent(randomAcknowledgment, "session_review");
  console.info(
    `📡 Yielded coach creator acknowledgment (contextual): "${randomAcknowledgment}"`,
  );

  try {
    // Step 1: Validate and extract parameters
    console.info("🔍 Step 1: Validating parameters");
    const params = await validateAndExtractParams(event);

    // Step 2: Load session data + Pinecone context + contextual update (ALL PARALLELIZED)
    console.info(
      "📂 Step 2: Loading session data + Pinecone context + generating contextual update",
    );
    const phase1StartTime = Date.now();

    // Parallel execution: session loading + contextual update + Pinecone context query
    const [startingUpdate, sessionData, pineconeResult] = await Promise.all([
      generateCoachCreatorContextualUpdate(
        params.userResponse,
        "session_review",
        {},
      ),
      loadSessionData(params.userId, params.sessionId),
      queryPineconeContext(
        params.userId,
        `User fitness background, training history, goals, and preferences for coach creation: ${params.userResponse}`,
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
        console.warn(
          "⚠️ Pinecone query failed, continuing without context:",
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

    const phase1Time = Date.now() - phase1StartTime;
    console.info(`✅ Phase 1 parallel loading completed in ${phase1Time}ms`);

    // Format Pinecone context for prompt injection
    let userHistoryContext = "";
    if (pineconeResult.success && pineconeResult.matches.length > 0) {
      userHistoryContext = formatPineconeContext(pineconeResult.matches);
      console.info("✅ Pinecone context retrieved for coach creator:", {
        totalMatches: pineconeResult.totalMatches,
        relevantMatches: pineconeResult.relevantMatches,
        contextLength: userHistoryContext.length,
      });
    } else {
      console.info("📭 No Pinecone context available for coach creator");
    }

    yield formatContextualEvent(startingUpdate, "session_review");
    console.info("💬 Yielded starting update (Vesper):", startingUpdate);

    // Step 3: Use the AI-driven to-do list conversation flow
    console.info("✨ Using to-do list based conversational flow");

    // Use generator to stream conversation chunks and get processed response
    const conversationGenerator = handleTodoListConversation(
      params.userResponse,
      sessionData.session,
      userHistoryContext,
    );

    // Manually iterate to capture both yielded values and return value
    let processedResponse: any = null;
    let result = await conversationGenerator.next();

    while (!result.done) {
      yield result.value;
      result = await conversationGenerator.next();
    }

    // The return value is in result.value after done === true
    processedResponse = result.value;

    if (processedResponse) {
      // Step 4: Save session and trigger coach config if complete
      const saveResult = await saveSessionAndTriggerCoachConfig(
        params.userId,
        params.sessionId,
        sessionData.session,
        processedResponse.isComplete,
      );

      // Step 5: Yield complete event
      yield formatCompleteEvent({
        messageId: `response_${Date.now()}`,
        type: "complete",
        fullMessage: processedResponse.cleanedResponse,
        aiResponse: processedResponse.cleanedResponse,
        isComplete: processedResponse.isComplete,
        sessionId: params.sessionId,
        progressDetails: processedResponse.progressDetails,
        nextQuestion: null, // No hardcoded questions in to-do list approach
        coachConfigGenerating:
          processedResponse.isComplete && !saveResult.coachConfigId,
        coachConfigId: saveResult.coachConfigId,
        onFinalQuestion: processedResponse.isOnFinalQuestion,
      });
    }
  } catch (error) {
    console.error("❌ Error in coach creator streaming:", error);
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error("Unknown error occurred"),
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
  context: Context,
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
