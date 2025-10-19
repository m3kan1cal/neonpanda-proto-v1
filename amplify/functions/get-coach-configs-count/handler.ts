import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryCoachConfigsCount } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  console.info('Counting coach configs for user:', {
    userId
  });

  // Get the coach config count
  const { totalCount } = await queryCoachConfigsCount(userId);

  return createOkResponse({
    totalCount
  });

};

export const handler = withAuth(baseHandler);
