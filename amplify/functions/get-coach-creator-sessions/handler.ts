import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import {
  queryCoachCreatorSessions,
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

    // Parse query parameters for filtering and sorting
    const queryParams = event.queryStringParameters || {};

    const options = {
      // Filtering options
      isComplete: queryParams.isComplete ? queryParams.isComplete === 'true' : undefined,
      fromDate: queryParams.fromDate ? new Date(queryParams.fromDate) : undefined,
      toDate: queryParams.toDate ? new Date(queryParams.toDate) : undefined,

      // Pagination options
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,

      // Sorting options
      sortBy: queryParams.sortBy as 'startedAt' | 'lastActivity' | 'sessionId' | undefined,
      sortOrder: queryParams.sortOrder as 'asc' | 'desc' | undefined,
    };

    // Validate date parameters
    if (options.fromDate && isNaN(options.fromDate.getTime())) {
      return createErrorResponse(400, 'Invalid fromDate parameter. Use ISO 8601 format.');
    }
    if (options.toDate && isNaN(options.toDate.getTime())) {
      return createErrorResponse(400, 'Invalid toDate parameter. Use ISO 8601 format.');
    }

    // Validate pagination parameters
    if (options.limit && (options.limit < 1 || options.limit > 100)) {
      return createErrorResponse(400, 'Limit must be between 1 and 100.');
    }
    if (options.offset && options.offset < 0) {
      return createErrorResponse(400, 'Offset must be non-negative.');
    }

    // Get coach creator sessions for the user
    const sessions = await queryCoachCreatorSessions(userId, options);

    // Create summary data (excluding detailed conversation history)
    const sessionSummaries = sessions.map(item => {
      const { questionHistory, ...summaryAttributes } = item.attributes;
      return {
        ...summaryAttributes,
        // Include basic question stats without full history
        questionStats: {
          totalQuestions: questionHistory?.length || 0,
          hasQuestions: (questionHistory?.length || 0) > 0
        }
      };
    });

    return createOkResponse({
      userId,
      sessions: sessionSummaries,
      count: sessions.length
    });

  } catch (error) {
    console.error('Error getting coach creator sessions:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
