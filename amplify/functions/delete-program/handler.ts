import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { updateProgram } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;
  const programId = event.pathParameters?.programId;

  if (!coachId) {
    return createErrorResponse(400, 'coachId is required');
  }

  if (!programId) {
    return createErrorResponse(400, 'programId is required');
  }

  try {
    // Soft delete by setting status to 'archived'
    const updatedProgram = await updateProgram(userId, coachId, programId, {
      status: 'archived',
    });

    console.info('Training program deleted successfully:', {
      programId,
      coachId,
      userId,
    });

    return createOkResponse(
      {
        program: updatedProgram,
      },
      'Training program deleted successfully'
    );
  } catch (error) {
    console.error('Error deleting training program:', error);
    return createErrorResponse(500, 'Failed to delete training program', error);
  }
};

export const handler = withAuth(baseHandler);
