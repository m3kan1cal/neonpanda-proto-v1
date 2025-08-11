import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { getWeeklyAnalytics } from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const weekId = event.pathParameters?.weekId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    if (!weekId) {
      return createErrorResponse(400, 'weekId is required');
    }

    console.info('Getting weekly report:', {
      userId,
      weekId
    });

    // Get specific weekly analytics record
    const analytics = await getWeeklyAnalytics(userId, weekId);

    if (!analytics) {
      return createErrorResponse(404, 'Weekly report not found');
    }

    // Return the complete analytics object
    return createSuccessResponse({
      report: {
        ...analytics.attributes,
        // Include DynamoDB metadata
        createdAt: analytics.createdAt,
        updatedAt: analytics.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting weekly report:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
