import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse, callBedrockApi, invokeAsyncLambda } from '../libs/api-helpers';
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
import { getUserId, extractJWTClaims, authorizeUser } from '../libs/auth/jwt-utils';

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract userId from path parameters and validate against JWT claims
    const requestedUserId = event.pathParameters?.userId;
    if (!requestedUserId) {
      return createErrorResponse(400, 'Missing userId in path parameters.');
    }

    // Authorize that the requested userId matches the authenticated user
    authorizeUser(event, requestedUserId);

    // Use the validated userId
    const userId = requestedUserId;
    const claims = extractJWTClaims(event);

    const sessionId = event.pathParameters?.sessionId;
    const { userResponse } = JSON.parse(event.body || '{}');

    if (!sessionId || !userResponse) {
      return createErrorResponse(400, 'Missing required fields: sessionId, userResponse');
    }

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

    // Build prompt and get AI response
    const questionPrompt = buildQuestionPrompt(
      currentQuestion,
      session.attributes.userContext,
      session.attributes.questionHistory
    );
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

    return createOkResponse({
      aiResponse: cleanedResponse,
      isComplete,
      progress: getProgress(session.attributes.userContext),
      nextQuestion: nextQuestion ?
        nextQuestion.versions[session.attributes.userContext.sophisticationLevel as SophisticationLevel] ||
        nextQuestion.versions.UNKNOWN : null,
      coachConfigGenerating: isComplete, // Indicates config is being generated asynchronously
      onFinalQuestion: isOnFinalQuestion && !isComplete // Let UI know user is on final question and can finish
    });

  } catch (error) {
    console.error('Error processing response:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
