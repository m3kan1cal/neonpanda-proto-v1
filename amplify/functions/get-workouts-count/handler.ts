import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryWorkoutsCount } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

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

    logger.info('Counting workout sessions for user:', {
      userId,
      filters: options
    });

    // Get the workout count
    const totalCount = await queryWorkoutsCount(userId, options);

    return createOkResponse({
      totalCount: totalCount
    });

};

export const handler = withAuth(baseHandler);