import { createOkResponse, createErrorResponse, callBedrockApi, callBedrockApiStream, invokeAsyncLambda } from '../libs/api-helpers';
import { SophisticationLevel } from '../libs/coach-creator/types';
import {
  getProgress,
  storeUserResponse,
  addQuestionHistory,
  checkUserWantsToFinish,
  updateSessionContext,
  markSessionComplete
} from '../libs/coach-creator/session-management';
import {
  buildQuestionPrompt,
  getCurrentQuestion,
  getNextQuestion,
  extractSophisticationLevel,
  cleanResponse
} from '../libs/coach-creator/question-management';
import {
  extractSophisticationSignals
} from '../libs/coach-creator/data-extraction';
import {
  saveCoachCreatorSession,
  saveCoachConfig,
  getCoachCreatorSession,
} from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    const sessionId = event.pathParameters?.sessionId;
    const { userResponse, messageTimestamp } = JSON.parse(event.body || '{}');

    if (!sessionId || !userResponse) {
      return createErrorResponse(400, 'Missing required fields: sessionId, userResponse');
    }

    // Check if streaming is requested
    const isStreamingRequested = event.queryStringParameters?.stream === 'true';
    console.info('🔄 Streaming mode:', isStreamingRequested ? 'ENABLED' : 'DISABLED');

    // Load session
    const session = await getCoachCreatorSession(userId, sessionId);
    if (!session) {
      return createErrorResponse(404, 'Session not found or expired');
    }

    // Get current question
    const currentQuestion = getCurrentQuestion(session.attributes.userContext);
    if (!currentQuestion) {
      return createErrorResponse(400, 'No current question found');
    }

    // Build prompt and get AI response - handle streaming vs non-streaming
    const questionPrompt = buildQuestionPrompt(
      currentQuestion,
      session.attributes.userContext,
      session.attributes.questionHistory
    );

    if (isStreamingRequested) {
      console.info('🔄 Processing streaming coach creator request');
      return await handleCoachCreatorStreamingResponse(
        userId, sessionId, userResponse, messageTimestamp,
        session, currentQuestion, questionPrompt
      );
    }

    // Non-streaming path (existing logic)
    let rawAiResponse: string;

    try {
      rawAiResponse = await callBedrockApi(questionPrompt, userResponse);
    } catch (error) {
      console.error('Claude API error:', error);
      return createErrorResponse(500, 'Failed to process response with AI');
    }

        // Extract sophistication and clean response
    const detectedLevel = extractSophisticationLevel(rawAiResponse);
    const cleanedResponse = cleanResponse(rawAiResponse);

    // Extract signals from user response
    const detectedSignals = extractSophisticationSignals(userResponse, currentQuestion);

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
      detectedLevel || 'UNKNOWN'
    );

    // Check if complete BEFORE incrementing currentQuestion
    // Find the next question that should be asked
    const nextQuestion = getNextQuestion(session.attributes.userContext);
    const isOnFinalQuestion = nextQuestion === null;

    // If on final question, allow follow-up conversation until user signals completion
    const userWantsToFinish = isOnFinalQuestion && checkUserWantsToFinish(userResponse);
    const isComplete = isOnFinalQuestion && userWantsToFinish;

    // Update session with proper string keys for DynamoDB
    session.attributes.userContext = updateSessionContext(
      session.attributes.userContext,
      detectedLevel,
      detectedSignals,
      isOnFinalQuestion
    );

    if (isComplete) {
      markSessionComplete(session.attributes);
    }

    // Save updated session
    await saveCoachCreatorSession(session.attributes);

    // Trigger async coach config generation if complete
    if (isComplete) {
      try {
            const buildCoachConfigFunction = process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
    if (!buildCoachConfigFunction) {
      throw new Error('BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set');
        }

        await invokeAsyncLambda(
          buildCoachConfigFunction,
          {
            userId,
            sessionId
          },
          'coach config generation'
        );

        console.info('Successfully triggered async coach config generation');
      } catch (error) {
        console.error('Failed to trigger coach config generation:', error);
        return createErrorResponse(500, 'Failed to start coach configuration generation', {
          isComplete: true,
          aiResponse: cleanedResponse
        });
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
        currentQuestion: session.attributes.userContext.currentQuestion
      },
      nextQuestion: nextQuestion ?
        nextQuestion.versions[session.attributes.userContext.sophisticationLevel as SophisticationLevel] ||
        nextQuestion.versions.UNKNOWN : null,
      coachConfigGenerating: isComplete, // Indicates config is being generated asynchronously
      onFinalQuestion: isOnFinalQuestion && !isComplete // Let UI know user is on final question and can finish
    });

};

// Streaming response handler for coach creator
async function handleCoachCreatorStreamingResponse(
  userId: string, sessionId: string, userResponse: string, messageTimestamp: string,
  session: any, currentQuestion: any, questionPrompt: string
) {
  try {
    console.info('🔄 Starting streaming coach creator response generation');

    // Start streaming AI response
    const responseStream = await callBedrockApiStream(questionPrompt, userResponse);

    // Return streaming response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: await generateCoachCreatorSSEStream(
        responseStream,
        userId, sessionId, userResponse, messageTimestamp,
        session, currentQuestion
      ),
      isBase64Encoded: false,
    };

  } catch (error) {
    console.error('❌ Error in streaming coach creator response:', error);

    // Fallback to non-streaming on error
    console.info('🔄 Falling back to non-streaming response');
    try {
      const rawAiResponse = await callBedrockApi(questionPrompt, userResponse);
      const cleanedResponse = cleanResponse(rawAiResponse);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
          type: 'fallback',
          aiResponse: cleanedResponse,
          sessionId,
        }),
      };
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      return createErrorResponse(500, 'Failed to generate response');
    }
  }
}

// Generate Server-Sent Events stream for coach creator
async function generateCoachCreatorSSEStream(
  responseStream: AsyncGenerator<string, void, unknown>,
  userId: string, sessionId: string, userResponse: string, messageTimestamp: string,
  session: any, currentQuestion: any
): Promise<string> {
  let fullAIResponse = '';
  let sseOutput = '';

  try {
    // Stream the AI response chunks
    for await (const chunk of responseStream) {
      fullAIResponse += chunk;
      const chunkData = {
        type: 'chunk',
        content: chunk
      };
      sseOutput += `data: ${JSON.stringify(chunkData)}\n\n`;
    }

    // Process the complete response (following existing logic)
    const detectedLevel = extractSophisticationLevel(fullAIResponse);
    const cleanedResponse = cleanResponse(fullAIResponse);

    // Extract signals from user response
    const detectedSignals = extractSophisticationSignals(userResponse, currentQuestion);

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
      detectedLevel || 'UNKNOWN'
    );

    // Check if complete BEFORE incrementing currentQuestion
    const nextQuestion = getNextQuestion(session.attributes.userContext);
    const isOnFinalQuestion = nextQuestion === null;
    const userWantsToFinish = isOnFinalQuestion && checkUserWantsToFinish(userResponse);
    const isComplete = isOnFinalQuestion && userWantsToFinish;

    // Update session with proper string keys for DynamoDB
    session.attributes.userContext = updateSessionContext(
      session.attributes.userContext,
      detectedLevel,
      detectedSignals,
      isOnFinalQuestion
    );

    if (isComplete) {
      markSessionComplete(session.attributes);
    }

    // Save updated session
    await saveCoachCreatorSession(session.attributes);

    // Trigger async coach config generation if complete
    if (isComplete) {
      try {
        const buildCoachConfigFunction = process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
        if (!buildCoachConfigFunction) {
          throw new Error('BUILD_COACH_CONFIG_FUNCTION_NAME environment variable not set');
        }

        await invokeAsyncLambda(
          buildCoachConfigFunction,
          {
            userId,
            sessionId
          },
          'coach config generation'
        );

        console.info('Successfully triggered async coach config generation');
      } catch (error) {
        console.error('Failed to trigger coach config generation:', error);
      }
    }

    // Get detailed progress information
    const progressDetails = getProgress(session.attributes.userContext);

    // Send completion message with coach creator specific data
    const completeData = {
      type: 'complete',
      fullMessage: cleanedResponse,
      aiResponse: cleanedResponse,
      isComplete,
      sessionId,
      progressDetails: {
        questionsCompleted: progressDetails.questionsCompleted,
        totalQuestions: progressDetails.totalQuestions,
        percentage: progressDetails.percentage,
        sophisticationLevel: session.attributes.userContext.sophisticationLevel,
        currentQuestion: session.attributes.userContext.currentQuestion
      },
      nextQuestion: nextQuestion ?
        nextQuestion.versions[session.attributes.userContext.sophisticationLevel as SophisticationLevel] ||
        nextQuestion.versions.UNKNOWN : null,
      coachConfigGenerating: isComplete,
      onFinalQuestion: isOnFinalQuestion && !isComplete
    };
    sseOutput += `data: ${JSON.stringify(completeData)}\n\n`;

    console.info('✅ Streaming coach creator response completed successfully');
    return sseOutput;

  } catch (streamError) {
    console.error('❌ Error during coach creator streaming:', streamError);

    // Send error message in stream format
    const errorData = {
      type: 'error',
      message: 'An error occurred during streaming'
    };
    sseOutput += `data: ${JSON.stringify(errorData)}\n\n`;
    return sseOutput;
  }
}

export const handler = withAuth(baseHandler);
