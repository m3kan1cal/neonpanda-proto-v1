import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import {
  queryCoachConfigs,
} from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    // Get coach configs for the user
    const coachConfigs = await queryCoachConfigs(userId);

    return createSuccessResponse({
      userId,
      coaches: coachConfigs.map(item => item.attributes),
      count: coachConfigs.length
    });

  } catch (error) {
    console.error('Error getting coach configs:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
