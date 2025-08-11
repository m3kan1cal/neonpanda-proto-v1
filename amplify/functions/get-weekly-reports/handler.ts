import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { queryWeeklyAnalytics } from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    // Parse query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const {
      fromDate,
      toDate,
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

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return createErrorResponse(400, 'Invalid limit. Must be between 1 and 100.');
      }
      options.limit = limitNum;
    }

    if (offset) {
      const offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        return createErrorResponse(400, 'Invalid offset. Must be 0 or greater.');
      }
      options.offset = offsetNum;
    }

    if (sortBy && !['weekStart', 'weekEnd', 'workoutCount'].includes(sortBy)) {
      return createErrorResponse(400, 'Invalid sortBy. Must be weekStart, weekEnd, or workoutCount.');
    }
    if (sortBy) options.sortBy = sortBy;

    if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
      return createErrorResponse(400, 'Invalid sortOrder. Must be asc or desc.');
    }
    if (sortOrder) options.sortOrder = sortOrder;

    console.info('Querying weekly reports:', {
      userId,
      options
    });

    // Query weekly analytics
    const analytics = await queryWeeklyAnalytics(userId, options);

    // Map to API response format
    const analyticsResponse = analytics.map(analyticsRecord => ({
      ...analyticsRecord.attributes,
      // Include DynamoDB metadata
      createdAt: analyticsRecord.createdAt,
      updatedAt: analyticsRecord.updatedAt
    }));

    return createSuccessResponse({
      reports: analyticsResponse,
      count: analyticsResponse.length,
      userId,
      filters: options
    });

  } catch (error) {
    console.error('Error querying weekly reports:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
