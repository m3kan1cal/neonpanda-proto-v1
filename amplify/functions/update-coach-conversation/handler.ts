import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachConversation, saveToDynamoDB } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

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
    const { title, tags, isActive } = body;

    // Validate at least one field is provided
    if (title === undefined && tags === undefined && isActive === undefined) {
      return createErrorResponse(400, 'At least one field (title, tags, or isActive) must be provided');
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

    // Load existing conversation
    const existingConversation = await getCoachConversation(userId, coachId, conversationId);
    if (!existingConversation) {
      return createErrorResponse(404, 'Conversation not found');
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (tags !== undefined) {
      updateData.tags = tags;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update conversation metadata
    const updatedConversation = {
      ...existingConversation.attributes,
      ...updateData,
      metadata: {
        ...existingConversation.attributes.metadata,
        ...updateData,
        lastActivity: new Date()
      }
    };

    // Save updated conversation
    const updatedItem = {
      ...existingConversation,
      attributes: updatedConversation,
      updatedAt: new Date().toISOString()
    };

    await saveToDynamoDB(updatedItem);

    console.info('Conversation metadata updated successfully:', {
      conversationId,
      updatedFields: Object.keys(updateData),
      title: updateData.title,
      tags: updateData.tags,
      isActive: updateData.isActive
    });

    return createOkResponse({
      conversation: updatedConversation
    }, 'Conversation metadata updated successfully');

};

export const handler = withAuth(baseHandler);