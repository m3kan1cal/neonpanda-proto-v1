import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getTrainingProgram } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
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

    // Get the training program
    const program = await getTrainingProgram(userId, coachId, programId);

    if (!program) {
      return createErrorResponse(404, 'Training program not found');
    }

    return createOkResponse({
      program: program
    });
  } catch (error) {
    console.error('Error getting training program:', error);
    return createErrorResponse(500, 'Failed to get training program', error);
  }
};

export const handler = withAuth(baseHandler);
