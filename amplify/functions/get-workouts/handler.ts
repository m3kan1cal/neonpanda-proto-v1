import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryWorkouts } from '../../dynamodb/operations';
import { getUserId, extractJWTClaims, authorizeUser } from '../libs/auth/jwt-utils';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

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

    // Parse query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const {
      fromDate,
      toDate,
      discipline,
      workoutType,
      location,
      coachId,
      minConfidence,
      limit,
      offset,
      sortBy,
      sortOrder
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

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return createErrorResponse(400, 'limit must be a number between 1 and 100');
      }
      options.limit = limitNum;
    }

    if (offset) {
      const offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        return createErrorResponse(400, 'offset must be a non-negative number');
      }
      options.offset = offsetNum;
    }

    if (sortBy) {
      const validSortFields = ['completedAt', 'confidence', 'workoutName'];
      if (!validSortFields.includes(sortBy)) {
        return createErrorResponse(400, `sortBy must be one of: ${validSortFields.join(', ')}`);
      }
      options.sortBy = sortBy;
    }

    if (sortOrder) {
      if (!['asc', 'desc'].includes(sortOrder)) {
        return createErrorResponse(400, 'sortOrder must be either "asc" or "desc"');
      }
      options.sortOrder = sortOrder;
    }

    console.info('Querying workout sessions for user:', {
      userId,
      filters: options
    });

    // Query workout sessions
    const workouts = await queryWorkouts(userId, options);

    // Transform the response to include summary information
    const workoutSummaries = workouts.map(session => ({
      workoutId: session.attributes.workoutId,
      completedAt: session.attributes.completedAt,
      discipline: session.attributes.workoutData.discipline,
      workoutName: session.attributes.workoutData.workout_name,
      workoutType: session.attributes.workoutData.workout_type,
      duration: session.attributes.workoutData.duration,
      location: session.attributes.workoutData.location,
      coachIds: session.attributes.coachIds,
      coachNames: session.attributes.coachNames,
      conversationId: session.attributes.conversationId,
      confidence: session.attributes.extractionMetadata.confidence,
      extractedAt: session.attributes.extractionMetadata.extractedAt,
      // NEW: AI-generated summary for display and coach context
      summary: session.attributes.summary,
      // Include key performance metrics for quick overview
      performanceMetrics: {
        intensity: session.attributes.workoutData.performance_metrics?.intensity,
        perceived_exertion: session.attributes.workoutData.performance_metrics?.perceived_exertion,
        calories_burned: session.attributes.workoutData.performance_metrics?.calories_burned
      },
      // Include CrossFit specific summary if applicable
      crossfitSummary: session.attributes.workoutData.discipline === 'crossfit' ? {
        workout_format: session.attributes.workoutData.discipline_specific?.crossfit?.workout_format,
        rx_status: session.attributes.workoutData.discipline_specific?.crossfit?.rx_status,
        total_time: session.attributes.workoutData.discipline_specific?.crossfit?.performance_data?.total_time,
        rounds_completed: session.attributes.workoutData.discipline_specific?.crossfit?.performance_data?.rounds_completed
      } : undefined
    }));

    return createOkResponse({
      workouts: workoutSummaries,
      totalCount: workoutSummaries.length
    });

  } catch (error) {
    console.error('Error getting workout sessions:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
