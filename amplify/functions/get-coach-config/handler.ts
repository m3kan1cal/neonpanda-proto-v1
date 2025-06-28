import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import {
  loadCoachConfig,
} from '../../dynamodb/operations';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    // Get specific coach
    const coachConfig = await loadCoachConfig(userId, coachId);

    if (!coachConfig) {
      return createErrorResponse(404, 'Coach not found');
    }

    return createSuccessResponse(coachConfig);

  } catch (error) {
    console.error('Error getting coach config:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
