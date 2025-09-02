import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../libs/api-helpers';
import {
  queryCoachConfigs,
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
