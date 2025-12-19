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
  saveCoachConversation,
  sendCoachConversationMessage,
  getCoachConfig,
  getUserProfile,
  getProgramDesignerSession,
  saveProgramDesignerSession,
} from "../../dynamodb/operations";
import {
  CoachMessage,
  MESSAGE_TYPES,
  CoachConversation,
} from "../libs/coach-conversation/types";
import { BuildProgramEvent } from "../libs/program/types";
import { CONVERSATION_MODES } from "../libs/coach-conversation/types";
import {
  handleProgramDesignerFlow,
  startProgramDesignCollection,
} from "../libs/program-designer/handler-helpers";
import { isProgramDesignCommand } from "../libs/program-designer";
import { parseSlashCommand } from "../libs/workout";

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

  console.info("✅ Path parameters validated:", {
    userId,
    sessionId,
  });

  // Parse and validate request body using shared utility
  const { userResponse, messageTimestamp, imageS3Keys } =
    validateStreamingRequestBody(event.body, userId as string, {
      requireUserResponse: true, // Program design requires text responses
      maxImages: 0, // No images in program design flow
    });

  console.info("✅ Request body validated:", {
    hasUserResponse: !!userResponse,
    hasMessageTimestamp: !!messageTimestamp,
    userResponseLength: userResponse?.length || 0,
  });

  return {
    userId: userId as string,
    sessionId: sessionId as string,
    userResponse,
    messageTimestamp,
    imageS3Keys: [], // No images in program design
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

  console.info("✅ Program designer session loaded:", {
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

/**
 * Generator function that yields SSE events for program designer flow
 * Pattern: Matches coach-creator-session exactly
 */
async function* createProgramDesignerEventStream(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context,
): AsyncGenerator<string, void, unknown> {
  // Yield start event IMMEDIATELY (this happens right away)
  yield formatStartEvent();
  console.info("📡 Yielded start event immediately");

  try {
    // Validate and extract parameters
    const params = await validateAndExtractParams(event);

    const { userId, sessionId, userResponse, messageTimestamp } = params;

    console.info("🚀 Starting program design business logic (Session-Based)", {
      userId,
      sessionId,
      userResponseLength: userResponse.length,
    });

    // Yield initial acknowledgment while processing starts
    const acknowledgment = getRandomCoachAcknowledgement();
    yield formatContextualEvent(acknowledgment);
    console.info(
      `📡 Yielded coach acknowledgment (contextual): "${acknowledgment}"`,
    );

    // Load session data (no conversation creation)
    console.info("🔄 Loading session data...");
    const { programSession, coachConfig, userProfile } = await loadSessionData(
      userId,
      sessionId,
    );

    console.info("✅ Session data loaded", {
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
    programSession.turnCount += 1;
    programSession.lastActivity = new Date();

    console.info("📝 User message added to session conversation history", {
      turnCount: programSession.turnCount,
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
      console.info("⚡ Restarting session due to slash command");
      programSession.isDeleted = true;
      programSession.completedAt = new Date();
      await saveProgramDesignerSession(programSession);
      // TODO: Create new session and redirect
      yield formatCompleteEvent({
        messageId: `restart_${Date.now()}`,
      });
      return;
    }

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
      context: {}, // Empty context for program design
    };

    // Continue the session flow
    // Note: Progress metadata will be sent by handleProgramDesignerFlow after processing
    const conversationData = {
      existingConversation: null as any,
      coachConfig,
      userProfile,
      context: {},
    };

    yield* handleProgramDesignerFlow(
      businessLogicParams,
      conversationData,
      programSession,
    );
  } catch (error) {
    console.error("❌ Error in program designer streaming:", error);
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error("Unknown error occurred"),
    );
    yield errorEvent;
  }
}

/**
 * Internal streaming handler with authentication
 * Pattern: Matches coach-creator-session exactly
 */
const internalStreamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => {
  console.info("🎬 Starting program designer session streaming handler");

  try {
    // Create SSE event stream
    const eventGenerator = createProgramDesignerEventStream(event, context);
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
      routePattern: PROGRAM_DESIGNER_SESSION_ROUTE,
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
