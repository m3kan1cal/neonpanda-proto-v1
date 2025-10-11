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

  if (!event.body) {
    return createErrorResponse(400, 'Request body is required');
  }

  const body = JSON.parse(event.body);
  const { coach_name } = body;

  // Validate coach_name is provided
  if (coach_name === undefined) {
    return createErrorResponse(400, 'coach_name field is required');
  }

  // Validate coach_name type and content
  if (typeof coach_name !== 'string') {
    return createErrorResponse(400, 'coach_name must be a string');
  }

  if (!coach_name.trim()) {
    return createErrorResponse(400, 'coach_name cannot be empty');
  }

  // Length validation
  if (coach_name.trim().length > 50) {
    return createErrorResponse(400, 'coach_name cannot exceed 50 characters');
  }

  // Update coach config
  const updatedCoachConfig = await updateCoachConfig(userId, coachId, {
    coach_name: coach_name.trim(),
  });

  console.info('Coach name updated successfully:', {
    coachId,
    userId,
    newName: updatedCoachConfig.coach_name,
  });

  return createOkResponse(
    {
      coachConfig: updatedCoachConfig,
    },
    'Coach name updated successfully'
  );
};

export const handler = withAuth(baseHandler);
