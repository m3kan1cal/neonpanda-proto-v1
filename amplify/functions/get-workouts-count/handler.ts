import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { queryWorkoutsCount } from '../../dynamodb/operations';
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

    // Parse query parameters for filtering (optional)
    const queryParams = event.queryStringParameters || {};
    const {
      fromDate,
      toDate,
      discipline,
      workoutType,
      location,
      coachId,
      minConfidence
    } = queryParams;

    // Build filtering options
    const options: any = {};

    if (fromDate) {
      options.fromDate = new Date(fromDate);
      if (isNaN(options.fromDate.getTime())) {
        return createErrorResponse(400, 'Invalid fromDate format. Use ISO 8601 format.');
      }
    }

    if (toDate) {
      options.toDate = new Date(toDate);
      if (isNaN(options.toDate.getTime())) {
        return createErrorResponse(400, 'Invalid toDate format. Use ISO 8601 format.');
      }
    }

    if (discipline) options.discipline = discipline;
    if (workoutType) options.workoutType = workoutType;
    if (location) options.location = location;
    if (coachId) options.coachId = coachId;

    if (minConfidence) {
      const confidence = parseFloat(minConfidence);
      if (isNaN(confidence) || confidence < 0 || confidence > 1) {
        return createErrorResponse(400, 'minConfidence must be a number between 0 and 1');
      }
      options.minConfidence = confidence;
    }

    console.info('Counting workout sessions for user:', {
      userId,
      filters: options
    });

    // Get the workout count
    const totalCount = await queryWorkoutsCount(userId, options);

    return createSuccessResponse({
      totalCount: totalCount
    });

  } catch (error) {
    console.error('Error getting workout count:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};