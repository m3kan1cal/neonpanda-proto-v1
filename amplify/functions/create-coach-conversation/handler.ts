import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import { saveCoachConversation, getCoachConfig, saveCoachConfig } from '../../dynamodb/operations';
import { CoachConversation } from '../libs/coach-conversation/types';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract path parameters
    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const body = JSON.parse(event.body);
    const { title } = body;

    // Generate unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new conversation
    const newConversation: CoachConversation = {
      conversationId,
      coachId,
      userId,
      title: title || 'New Conversation',
      messages: [],
      metadata: {
        startedAt: new Date(),
        lastActivity: new Date(),
        totalMessages: 0,
        isActive: true,
        tags: []
      }
    };

    await saveCoachConversation(newConversation);

    // Update coach config conversation count
    try {
      const coachConfig = await getCoachConfig(userId, coachId);
      if (coachConfig) {
        const updated = {
          ...coachConfig.attributes,
          metadata: {
            ...coachConfig.attributes.metadata,
            total_conversations: (coachConfig.attributes.metadata.total_conversations || 0) + 1
          }
        };
        await saveCoachConfig(userId, updated);
      }
    } catch (error) {
      console.error('Failed to update conversation count:', error);
      // Don't fail the request - conversation was created successfully
    }

    return createSuccessResponse({
      conversation: newConversation
    }, 'Coach conversation created successfully');

  } catch (error) {
    console.error('Error creating coach conversation:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
