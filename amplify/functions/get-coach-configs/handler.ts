import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import {
  queryCoachConfigs,
} from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Get coach configs for the user
  const coachConfigs = await queryCoachConfigs(userId);

  return createOkResponse({
    userId,
    coaches: coachConfigs.map(item => item),
    count: coachConfigs.length
  });
};

export const handler = withAuth(baseHandler);
