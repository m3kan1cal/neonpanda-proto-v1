import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { updateCoachConfig } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

  if (!coachId) {
    return createErrorResponse(400, 'coachId is required');
  }

  try {
    // Soft delete by setting status to 'archived'
    const updatedCoachConfig = await updateCoachConfig(userId, coachId, {
      status: 'archived',
    });

    console.info('Coach deleted successfully:', {
      coachId,
      userId,
    });

    return createOkResponse(
      {
        coachConfig: updatedCoachConfig,
      },
      'Coach deleted successfully'
    );
  } catch (error) {
    console.error('Error deleting coach:', error);
    return createErrorResponse(500, 'Failed to delete coach', error);
  }
};

export const handler = withAuth(baseHandler);
