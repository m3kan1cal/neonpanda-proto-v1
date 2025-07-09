import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { getCoachConversation, saveToDynamoDB } from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;
    const conversationId = event.pathParameters?.conversationId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

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

    return createSuccessResponse({
      conversation: updatedConversation
    }, 'Conversation metadata updated successfully');

  } catch (error) {
    console.error('Error updating coach conversation metadata:', error);
    if (error instanceof Error && error.message === 'Conversation not found') {
      return createErrorResponse(404, 'Conversation not found');
    }
    return createErrorResponse(500, 'Internal server error');
  }
};