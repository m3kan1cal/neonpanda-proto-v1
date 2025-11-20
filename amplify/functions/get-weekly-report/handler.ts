import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getWeeklyAnalytics } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const weekId = event.pathParameters?.weekId;

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
    return createOkResponse({
      report: {
        ...analytics,
        // Include DynamoDB metadata
      }
    });

};

export const handler = withAuth(baseHandler);
