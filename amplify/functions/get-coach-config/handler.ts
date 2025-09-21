import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import {
  getCoachConfig,
} from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    const coachId = event.pathParameters?.coachId;
    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    // Get specific coach
    const coachConfig = await getCoachConfig(userId, coachId);

    if (!coachConfig) {
      return createErrorResponse(404, 'Coach not found');
    }

    return createOkResponse({
      coachConfig: coachConfig.attributes
    });

};

export const handler = withAuth(baseHandler);
