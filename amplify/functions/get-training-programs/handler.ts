import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryTrainingProgramsByCoach, queryTrainingPrograms } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const coachId = event.pathParameters?.coachId;

    // Query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const { status, limit: limitParam } = queryParams;

    // Parse and validate limit
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limitParam && isNaN(limit!)) {
      return createErrorResponse(400, 'Invalid limit parameter. Must be a number.');
    }

    let programs;

    if (coachId) {
      // Get programs for specific coach
      programs = await queryTrainingProgramsByCoach(userId, coachId, {
        status: status as any,
        limit,
        sortOrder: 'desc' // Most recent first
      });
    } else {
      // Get all programs across all coaches
      programs = await queryTrainingPrograms(userId, {
        status: status as any,
        limit,
        sortOrder: 'desc'
      });
    }

    return createOkResponse({
      programs: programs.map(p => p.attributes),
      count: programs.length
    });
  } catch (error) {
    console.error('Error getting training programs:', error);
    return createErrorResponse(500, 'Failed to get training programs', error);
  }
};

export const handler = withAuth(baseHandler);
