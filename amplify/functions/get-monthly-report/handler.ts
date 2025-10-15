import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getMonthlyAnalytics } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const monthId = event.pathParameters?.monthId;

    if (!monthId) {
      return createErrorResponse(400, 'monthId is required');
    }

    console.info('Getting monthly report:', {
      userId,
      monthId
    });

    // Get specific monthly analytics record
    const analytics = await getMonthlyAnalytics(userId, monthId);

    if (!analytics) {
      return createErrorResponse(404, 'Monthly report not found');
    }

    // Return the complete analytics object
    return createOkResponse({
      report: {
        ...analytics.attributes,
        // Include DynamoDB metadata
        createdAt: analytics.createdAt,
        updatedAt: analytics.updatedAt
      }
    });

};

export const handler = withAuth(baseHandler);
