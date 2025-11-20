import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getUserProfile } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  console.info('Getting user profile for userId:', userId);

  // Get user profile from DynamoDB
  const userProfile = await getUserProfile(userId);

  if (!userProfile) {
    return createErrorResponse(404, 'User profile not found');
  }

  return createOkResponse({
    profile: userProfile
  });
};

export const handler = withAuth(baseHandler);
