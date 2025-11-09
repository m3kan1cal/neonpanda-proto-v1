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

  // Prepare updates object - only safe fields allowed
  const allowedFields = ['coach_name', 'coach_description'];
  const updates: any = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  // Validate at least one field is being updated
  if (Object.keys(updates).length === 0) {
    return createErrorResponse(400, 'At least one valid field must be provided for update');
  }

  // Validate coach_name if provided
  if (updates.coach_name !== undefined) {
    if (typeof updates.coach_name !== 'string') {
      return createErrorResponse(400, 'coach_name must be a string');
    }
    if (!updates.coach_name.trim()) {
      return createErrorResponse(400, 'coach_name cannot be empty');
    }
    if (updates.coach_name.trim().length > 50) {
      return createErrorResponse(400, 'coach_name cannot exceed 50 characters');
    }
    updates.coach_name = updates.coach_name.trim();
  }

  // Update coach config
  const updatedCoachConfig = await updateCoachConfig(userId, coachId, updates);

  console.info('Coach config updated successfully:', {
    coachId,
    userId,
    updates,
  });

  return createOkResponse(
    {
      coachConfig: updatedCoachConfig,
    },
    'Coach config updated successfully'
  );
};

export const handler = withAuth(baseHandler);
