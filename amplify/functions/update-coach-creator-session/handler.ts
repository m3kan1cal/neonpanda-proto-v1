import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
  callBedrockApiStream,
  callBedrockApiMultimodal,
  callBedrockApiMultimodalStream,
  invokeAsyncLambda,
  MODEL_IDS,
  queryPineconeContext,
} from "../libs/api-helpers";
import { buildMultimodalContent } from "../libs/streaming";
import { SophisticationLevel } from "../libs/coach-creator/types";
import { queryMemories } from "../libs/coach-conversation/memory-processing";
import { analyzeMemoryNeeds } from "../libs/memory/detection";
import {
  getProgress,
  storeUserResponse,
  addQuestionHistory,
  checkUserWantsToFinish,
  updateSessionContext,
  markSessionComplete,
} from "../libs/coach-creator/session-management";
import {
  buildQuestionPrompt,
  getCurrentQuestion,
  getNextQuestion,
  extractSophisticationLevel,
  cleanResponse,
} from "../libs/coach-creator/question-management";
import { extractSophisticationSignals } from "../libs/coach-creator/data-extraction";
import {
  saveCoachCreatorSession,
  saveCoachConfig,
  getCoachCreatorSession,
  getUserProfile,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  const sessionId = event.pathParameters?.sessionId;
  const { userResponse, messageTimestamp, imageS3Keys } = JSON.parse(
    event.body || "{}"
  );

  if (!sessionId || !userResponse) {
    return createErrorResponse(
      400,
      "Missing required fields: sessionId, userResponse"
    );
  }

  // Validate imageS3Keys if present
  if (imageS3Keys) {
    if (!Array.isArray(imageS3Keys)) {
      return createErrorResponse(400, "imageS3Keys must be an array");
    }
    if (imageS3Keys.length > 5) {
      return createErrorResponse(400, "Maximum 5 images allowed per message");
    }
    // Verify all keys belong to this user
    for (const key of imageS3Keys) {
      if (!key.startsWith(`user-uploads/${userId}/`)) {
        return createErrorResponse(403, "Invalid S3 key: access denied");
      }
    }
  }

  // Check if streaming is requested
  const isStreamingRequested = event.queryStringParameters?.stream === "true";
  console.info(
    "🔄 Streaming mode:",
    isStreamingRequested ? "ENABLED" : "DISABLED"
  );

  // Load session
  const session = await getCoachCreatorSession(userId, sessionId);
  if (!session) {
    return createErrorResponse(404, "Session not found or expired");
  }

  // Load user profile for critical training directive
  const userProfile = await getUserProfile(userId);

  // Get current question
  const currentQuestion = getCurrentQuestion(session.attributes.userContext);
  if (!currentQuestion) {
    return createErrorResponse(400, "No current question found");
  }

  // STEP 1: Query Pinecone for methodology context (always query)
  let methodologyContext = "";
  let pineconeMatches: any[] = [];

  try {
    // Get question text from current sophistication level
    const questionText =
      currentQuestion?.versions[
        session.attributes.userContext
          .sophisticationLevel as SophisticationLevel
      ] ||
      currentQuestion?.versions.UNKNOWN ||
      "";
    const searchQuery = `${userResponse} ${questionText}`;

    console.info("📚 Querying Pinecone for methodology context:", {
      queryLength: searchQuery.length,
    });

    const pineconeResults = await queryPineconeContext(userId, searchQuery, {
      topK: 5,
      includeMethodology: true,
      includeWorkouts: false,
      includeCoachCreator: false,
      includeConversationSummaries: false,
      enableReranking: true,
    });

    pineconeMatches = pineconeResults.matches || [];

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
      console.info("ℹ️  No Pinecone methodology matches found");
    }
  } catch (pineconeError) {
    console.warn("⚠️  Pinecone query failed (non-critical):", pineconeError);
    // Continue without methodology context
  }

  // STEP 2: Smart memory detection + retrieval (only query if needed)
  let userMemories: any[] = [];
  let memoryContext = "";

  try {
    const messageContext = session.attributes.questionHistory
      .slice(-3)
      .map((item: any) => `Q: ${item.question}\nA: ${item.userResponse}`)
      .join("\n");

    console.info("🧠 Analyzing memory needs...");

    // Detect if memory retrieval is needed (lightweight AI call with Haiku/Nova)
    const memoryAnalysis = await analyzeMemoryNeeds(
      userResponse,
      messageContext,
      "Coach Creator" // coachName
    );

    console.info("🧠 Memory analysis result:", {
      needsRetrieval: memoryAnalysis.needsRetrieval,
      reason: memoryAnalysis.retrievalContext?.reasoning,
    });

    // Only query memories if needed
    if (memoryAnalysis.needsRetrieval) {
      const memoryResults = await queryMemories(
        userId,
        null as any, // Query across ALL coaches (not scoped to specific coach)
        userResponse,
        messageContext
      );

      userMemories = memoryResults.memories || [];

      if (userMemories.length > 0) {
        memoryContext = userMemories
          .map((mem: any) => `- ${mem.memoryText || mem.content}`)
          .filter((text) => text.length > 2)
          .join("\n")
          .substring(0, 2000); // Limit to 2000 chars

        console.info("✅ User memories retrieved:", {
          count: userMemories.length,
          contextLength: memoryContext.length,
        });
      } else {
        console.info("📭 No relevant memories found");
      }
    } else {
      console.info("⏭️  Memory retrieval not needed for this response");
    }
  } catch (memoryError) {
    console.warn("⚠️  Memory processing failed (non-critical):", memoryError);
    // Continue without memories
  }

  // Build prompt with contexts
  const questionPromptResult = buildQuestionPrompt(
    currentQuestion,
    session.attributes.userContext,
    session.attributes.questionHistory,
    userProfile?.attributes?.criticalTrainingDirective,
    methodologyContext, // NEW: Methodology context from Pinecone
    memoryContext // NEW: User memory context
  );

  // Extract fullPrompt for backwards compatibility with non-streaming path
  const questionPrompt = questionPromptResult.fullPrompt;

  if (isStreamingRequested) {
    console.info("🔄 Processing streaming coach creator request");
    return await handleCoachCreatorStreamingResponse(
      userId,
      sessionId,
      userResponse,
      messageTimestamp,
      session,
      currentQuestion,
      questionPrompt, // Already contains methodologyContext and memoryContext
      imageS3Keys
    );
  }

  // Non-streaming path (existing logic)
  let rawAiResponse: string;

  try {
    // Check if images are present and use multimodal API
    if (imageS3Keys && imageS3Keys.length > 0) {
      console.info("🖼️ Processing coach creator request with images:", {
        imageCount: imageS3Keys.length,
      });

      // Build multimodal content for single message
      const messages: any[] = [
        {
          id: `msg_${Date.now()}_user`,
          role: "user" as const,
          content: userResponse || "",
          timestamp: new Date(messageTimestamp),
          messageType: "text_with_images" as const,
          imageS3Keys: imageS3Keys,
        },
      ];

      const converseMessages = await buildMultimodalContent(messages);
      rawAiResponse = await callBedrockApiMultimodal(
        questionPrompt,
        converseMessages,
        MODEL_IDS.CLAUDE_SONNET_4_FULL
      );
    } else {
      rawAiResponse = await callBedrockApi(questionPrompt, userResponse);
    }
  } catch (error) {
    console.error("Claude API error:", error);
    return createErrorResponse(500, "Failed to process response with AI");
  }

  // Extract sophistication and clean response
  const detectedLevel = extractSophisticationLevel(rawAiResponse);
  const cleanedResponse = cleanResponse(rawAiResponse);

  // Extract signals from user response
  const detectedSignals = extractSophisticationSignals(
    userResponse,
    currentQuestion
  );

  // Store the response (append to existing answer if question already answered)
  session.attributes.userContext = storeUserResponse(
    session.attributes.userContext,
    currentQuestion,
    userResponse
  );

  addQuestionHistory(
    session.attributes,
    currentQuestion,
    userResponse,
    cleanedResponse,
    detectedLevel || "UNKNOWN",
    imageS3Keys
  );

  // Check if complete BEFORE incrementing currentQuestion
  // Find the next question that should be asked
  const nextQuestion = getNextQuestion(session.attributes.userContext);
  const isOnFinalQuestion = nextQuestion === null;

  // If on final question, allow follow-up conversation until user signals completion
  const userWantsToFinish =
    isOnFinalQuestion && await checkUserWantsToFinish(userResponse);
  const isComplete = isOnFinalQuestion && userWantsToFinish;

  // Update session with proper string keys for DynamoDB
  session.attributes.userContext = updateSessionContext(
    session.attributes.userContext,
    detectedLevel,
    detectedSignals,
    isOnFinalQuestion
  );

  // Update root-level lastActivity timestamp
  session.attributes.lastActivity = new Date();

  if (isComplete) {
    markSessionComplete(session.attributes);
  }

  // Save updated session
  await saveCoachCreatorSession(session.attributes);

  // Trigger async coach config generation if complete
  if (isComplete) {
    try {
      const buildCoachConfigFunction =
        process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
      if (!buildCoachConfigFunction) {
        throw new Error(
          "BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set"
        );
      }

      await invokeAsyncLambda(
        buildCoachConfigFunction,
        {
          userId,
          sessionId,
        },
        "coach config generation"
      );

      console.info("Successfully triggered async coach config generation");
    } catch (error) {
      console.error("Failed to trigger coach config generation:", error);
      return createErrorResponse(
        500,
        "Failed to start coach configuration generation",
        {
          isComplete: true,
          aiResponse: cleanedResponse,
        }
      );
    }
  }

  // Get detailed progress information
  const progressDetails = getProgress(session.attributes.userContext);

  return createOkResponse({
    aiResponse: cleanedResponse,
    isComplete,
    progress: progressDetails.percentage,
    progressDetails: {
      questionsCompleted: progressDetails.questionsCompleted,
      totalQuestions: progressDetails.totalQuestions,
      percentage: progressDetails.percentage,
      sophisticationLevel: session.attributes.userContext.sophisticationLevel,
      currentQuestion: session.attributes.userContext.currentQuestion,
    },
    nextQuestion: nextQuestion
      ? nextQuestion.versions[
          session.attributes.userContext
            .sophisticationLevel as SophisticationLevel
        ] || nextQuestion.versions.UNKNOWN
      : null,
    coachConfigGenerating: isComplete, // Indicates config is being generated asynchronously
    onFinalQuestion: isOnFinalQuestion && !isComplete, // Let UI know user is on final question and can finish
  });
};

// Streaming response handler for coach creator
async function handleCoachCreatorStreamingResponse(
  userId: string,
  sessionId: string,
  userResponse: string,
  messageTimestamp: string,
  session: any,
  currentQuestion: any,
  questionPrompt: string, // Already contains contexts (methodologyContext + memoryContext)
  imageS3Keys?: string[]
) {
  try {
    console.info("🔄 Starting streaming coach creator response generation");

    // Start streaming AI response - check for images
    let responseStream: AsyncGenerator<string, void, unknown>;

    if (imageS3Keys && imageS3Keys.length > 0) {
      console.info(
        "🖼️ Processing streaming coach creator request with images:",
        { imageCount: imageS3Keys.length }
      );

      // Build multimodal content for single message
      const messages: any[] = [
        {
          id: `msg_${Date.now()}_user`,
          role: "user" as const,
          content: userResponse || "",
          timestamp: new Date(messageTimestamp),
          messageType: "text_with_images" as const,
          imageS3Keys: imageS3Keys,
        },
      ];

      const converseMessages = await buildMultimodalContent(messages);
      responseStream = await callBedrockApiMultimodalStream(
        questionPrompt,
        converseMessages,
        MODEL_IDS.CLAUDE_SONNET_4_FULL
      );
    } else {
      responseStream = await callBedrockApiStream(questionPrompt, userResponse);
    }

    // Return streaming response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: await generateCoachCreatorSSEStream(
        responseStream,
        userId,
        sessionId,
        userResponse,
        messageTimestamp,
        session,
        currentQuestion,
        imageS3Keys
      ),
      isBase64Encoded: false,
    };
  } catch (error) {
    console.error("❌ Error in streaming coach creator response:", error);

    // Fallback to non-streaming on error
    console.info("🔄 Falling back to non-streaming response");
    try {
      const rawAiResponse = await callBedrockApi(questionPrompt, userResponse);
      const cleanedResponse = cleanResponse(rawAiResponse);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        body: JSON.stringify({
          type: "fallback",
          aiResponse: cleanedResponse,
          sessionId,
        }),
      };
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      return createErrorResponse(500, "Failed to generate response");
    }
  }
}

// Generate Server-Sent Events stream for coach creator
async function generateCoachCreatorSSEStream(
  responseStream: AsyncGenerator<string, void, unknown>,
  userId: string,
  sessionId: string,
  userResponse: string,
  messageTimestamp: string,
  session: any,
  currentQuestion: any,
  imageS3Keys?: string[]
): Promise<string> {
  let fullAiResponse = "";
  let sseOutput = "";

  try {
    // Stream the AI response chunks
    for await (const chunk of responseStream) {
      fullAiResponse += chunk;
      const chunkData = {
        type: "chunk",
        content: chunk,
      };
      sseOutput += `data: ${JSON.stringify(chunkData)}\n\n`;
    }

    // Process the complete response (following existing logic)
    const detectedLevel = extractSophisticationLevel(fullAiResponse);
    const cleanedResponse = cleanResponse(fullAiResponse);

    // Extract signals from user response
    const detectedSignals = extractSophisticationSignals(
      userResponse,
      currentQuestion
    );

    // Store the response (append to existing answer if question already answered)
    session.attributes.userContext = storeUserResponse(
      session.attributes.userContext,
      currentQuestion,
      userResponse
    );

    addQuestionHistory(
      session.attributes,
      currentQuestion,
      userResponse,
      cleanedResponse,
      detectedLevel || "UNKNOWN",
      imageS3Keys
    );

    // Check if complete BEFORE incrementing currentQuestion
    const nextQuestion = getNextQuestion(session.attributes.userContext);
    const isOnFinalQuestion = nextQuestion === null;
    const userWantsToFinish =
      isOnFinalQuestion && await checkUserWantsToFinish(userResponse);
    const isComplete = isOnFinalQuestion && userWantsToFinish;

    // Update session with proper string keys for DynamoDB
    session.attributes.userContext = updateSessionContext(
      session.attributes.userContext,
      detectedLevel,
      detectedSignals,
      isOnFinalQuestion
    );

    // Update root-level lastActivity timestamp
    session.attributes.lastActivity = new Date();

    if (isComplete) {
      markSessionComplete(session.attributes);
    }

    // Save updated session
    await saveCoachCreatorSession(session.attributes);

    // Trigger async coach config generation if complete
    if (isComplete) {
      try {
        const buildCoachConfigFunction =
          process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
        if (!buildCoachConfigFunction) {
          throw new Error(
            "BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set"
          );
        }

        await invokeAsyncLambda(
          buildCoachConfigFunction,
          {
            userId,
            sessionId,
          },
          "coach config generation"
        );

        console.info("Successfully triggered async coach config generation");
      } catch (error) {
        console.error("Failed to trigger coach config generation:", error);
      }
    }

    // Get detailed progress information
    const progressDetails = getProgress(session.attributes.userContext);

    // Send completion message with coach creator specific data
    const completeData = {
      type: "complete",
      fullMessage: cleanedResponse,
      aiResponse: cleanedResponse,
      isComplete,
      sessionId,
      progressDetails: {
        questionsCompleted: progressDetails.questionsCompleted,
        totalQuestions: progressDetails.totalQuestions,
        percentage: progressDetails.percentage,
        sophisticationLevel: session.attributes.userContext.sophisticationLevel,
        currentQuestion: session.attributes.userContext.currentQuestion,
      },
      nextQuestion: nextQuestion
        ? nextQuestion.versions[
            session.attributes.userContext
              .sophisticationLevel as SophisticationLevel
          ] || nextQuestion.versions.UNKNOWN
        : null,
      coachConfigGenerating: isComplete,
      onFinalQuestion: isOnFinalQuestion && !isComplete,
    };
    sseOutput += `data: ${JSON.stringify(completeData)}\n\n`;

    console.info("✅ Streaming coach creator response completed successfully");
    return sseOutput;
  } catch (streamError) {
    console.error("❌ Error during coach creator streaming:", streamError);

    // Send error message in stream format
    const errorData = {
      type: "error",
      message: "An error occurred during streaming",
    };
    sseOutput += `data: ${JSON.stringify(errorData)}\n\n`;
    return sseOutput;
  }
}

export const handler = withAuth(baseHandler);
