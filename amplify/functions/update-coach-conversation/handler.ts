import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { updateCoachConversation } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { CONVERSATION_MODES } from '../libs/coach-conversation/types';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;
  const conversationId = event.pathParameters?.conversationId;

  if (!coachId) {
    return createErrorResponse(400, 'coachId is required');
  }

  if (!conversationId) {
    return createErrorResponse(400, 'conversationId is required');
  }

  if (!event.body) {
    return createErrorResponse(400, 'Request body is required');
  }

  const body = JSON.parse(event.body);
  const { title, tags, isActive, mode } = body;

  // Validate at least one field is provided
  if (title === undefined && tags === undefined && isActive === undefined && mode === undefined) {
    return createErrorResponse(400, 'At least one field (title, tags, isActive, or mode) must be provided');
  }

  // Validate field types if provided
  if (title !== undefined && typeof title !== 'string') {
    return createErrorResponse(400, 'title must be a string');
  }

  if (tags !== undefined && (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string'))) {
    return createErrorResponse(400, 'tags must be an array of strings');
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return createErrorResponse(400, 'isActive must be a boolean');
  }

  if (mode !== undefined && typeof mode !== 'string') {
    return createErrorResponse(400, 'mode must be a string');
  }

  if (mode !== undefined && mode !== CONVERSATION_MODES.CHAT && mode !== CONVERSATION_MODES.PROGRAM_DESIGN) {
    return createErrorResponse(400, 'mode must be either "chat" or "program_design"');
  }

  // Prepare update data
  const updateData: { title?: string; tags?: string[]; isActive?: boolean; mode?: string } = {};
  if (title !== undefined) {
    updateData.title = title.trim();
  }
  if (tags !== undefined) {
    updateData.tags = tags;
  }
  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }
  if (mode !== undefined) {
    updateData.mode = mode;
  }

  // Update conversation using the safe deep-merge function from operations
  const updatedConversation = await updateCoachConversation(
    userId,
    coachId,
    conversationId,
    updateData
  );

  logger.info('Conversation metadata updated successfully:', {
    conversationId,
    coachId,
    userId,
    updatedFields: Object.keys(updateData),
  });

  return createOkResponse(
    {
      conversation: updatedConversation,
    },
    'Conversation metadata updated successfully'
  );
};

export const handler = withAuth(baseHandler);