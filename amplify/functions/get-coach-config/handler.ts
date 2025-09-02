import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import {
  getCoachConfig,
} from '../../dynamodb/operations';
import { getUserId, extractJWTClaims, authorizeUser } from '../libs/auth/jwt-utils';

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract userId from path parameters and validate against JWT claims
    const requestedUserId = event.pathParameters?.userId;
    if (!requestedUserId) {
      return createErrorResponse(400, 'Missing userId in path parameters.');
    }

    // Authorize that the requested userId matches the authenticated user
    authorizeUser(event, requestedUserId);

    // Use the validated userId
    const userId = requestedUserId;
    const claims = extractJWTClaims(event);

    const coachId = event.pathParameters?.coachId;
    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    // Get specific coach
    const coachConfig = await getCoachConfig(userId, coachId);

    if (!coachConfig) {
      return createErrorResponse(404, 'Coach not found');
    }

    return createSuccessResponse({
      coachConfig: coachConfig.attributes
    });

  } catch (error) {
    console.error('Error getting coach config:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
