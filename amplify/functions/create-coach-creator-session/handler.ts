import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createCreatedResponse, createErrorResponse } from '../libs/api-helpers';
import {
  COACH_CREATOR_QUESTIONS,
} from '../libs/coach-creator/question-management';
import {
  createCoachCreatorSession,
} from '../libs/coach-creator/session-management';
import {
  saveCoachCreatorSession,
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

    // Create new session
    const session = createCoachCreatorSession(userId);
    const firstQuestion = COACH_CREATOR_QUESTIONS[0];

    if (!firstQuestion) {
      throw new Error('No questions configured');
    }

    // Build the initial message
    const initialMessage = `Hi! I'm here to help you create your perfect AI fitness coach. This will take about 15-20 minutes, and I'll adapt the questions based on your experience level.\n\n${firstQuestion.versions.UNKNOWN}`;

    // Store the initial message in questionHistory
    session.questionHistory.push({
      questionId: 0, // special ID 0 (pre-questions intro)
      userResponse: "", // Empty until user responds
      aiResponse: initialMessage,
      detectedSophistication: "UNKNOWN",
      timestamp: new Date()
    });

    // Save session to DynamoDB
    await saveCoachCreatorSession(session);

    return createCreatedResponse({
      sessionId: session.sessionId,
      progress: 0,
      estimatedDuration: '15-20 minutes',
      totalQuestions: COACH_CREATOR_QUESTIONS.filter(q => q.required).length,
      initialMessage: initialMessage
    });

  } catch (error) {
    console.error('Error starting coach creator session:', error);
    return createErrorResponse(500, 'Internal server error', 'Failed to start coach creator session');
  }
};
