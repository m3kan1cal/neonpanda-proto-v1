import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import {
  loadCoachConfigs,
} from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    // Get coach configs for the user
    const coachConfigs = await loadCoachConfigs(userId);

    return createSuccessResponse({
      userId,
      coaches: coachConfigs,
      count: coachConfigs.length
    });

  } catch (error) {
    console.error('Error getting coach configs:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
