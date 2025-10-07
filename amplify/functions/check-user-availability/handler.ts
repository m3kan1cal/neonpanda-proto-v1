import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  createErrorResponse,
  createOkResponse,
  getHttpMethod,
} from '../libs/api-helpers';
import { getUserProfileByEmail, getUserProfileByUsername } from '../../dynamodb/operations';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

const USER_POOL_ID = process.env.USER_POOL_ID;

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.info('Check availability event:', JSON.stringify(event, null, 2));

  try {
    // Only allow GET requests
    if (getHttpMethod(event) !== 'GET') {
      return createErrorResponse(
        405,
        'Method not allowed. Only GET requests are supported.'
      );
    }

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const type = queryParams.type; // 'username' or 'email'
    const value = queryParams.value;

    // Validate parameters
    if (!type || !value) {
      return createErrorResponse(
        400,
        'Missing required query parameters: type and value'
      );
    }

    if (type !== 'username' && type !== 'email') {
      return createErrorResponse(
        400,
        'Invalid type parameter. Must be "username" or "email"'
      );
    }

    console.info(`Checking availability for ${type}: ${value}`);

    let isAvailable = true;
    let existsInCognito = false;
    let existsInDynamoDB = false;

    // Check Cognito
    if (!USER_POOL_ID) {
      console.error('USER_POOL_ID environment variable not set');
      return createErrorResponse(500, 'Server configuration error');
    }

    try {
      const listUsersCommand = new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: type === 'email'
          ? `email = "${value}"`
          : `preferred_username = "${value}"`,
        Limit: 1
      });

      const cognitoResult = await cognitoClient.send(listUsersCommand);
      existsInCognito = !!(cognitoResult.Users && cognitoResult.Users.length > 0);

      if (existsInCognito) {
        console.info(`${type} exists in Cognito: ${value}`);
        isAvailable = false;
      }
    } catch (cognitoError) {
      console.error('Error checking Cognito:', cognitoError);
      // Continue checking DynamoDB even if Cognito fails
    }

    // Check DynamoDB
    try {
      if (type === 'email') {
        const profile = await getUserProfileByEmail(value);
        existsInDynamoDB = profile !== null;
      } else {
        const profile = await getUserProfileByUsername(value);
        existsInDynamoDB = profile !== null;
      }

      if (existsInDynamoDB) {
        console.info(`${type} exists in DynamoDB: ${value}`);
        isAvailable = false;
      }
    } catch (dbError) {
      console.error('Error checking DynamoDB:', dbError);
      // If we already found it in Cognito, that's enough
      if (!existsInCognito) {
        // If DynamoDB fails and Cognito check passed, we can't confirm availability
        return createErrorResponse(
          500,
          'Error checking availability. Please try again.'
        );
      }
    }

    // Return result
    return createOkResponse({
      available: isAvailable,
      type: type,
      value: value,
      existsInCognito: existsInCognito,
      existsInDynamoDB: existsInDynamoDB,
      message: isAvailable
        ? `${type === 'email' ? 'Email' : 'Username'} is available`
        : `${type === 'email' ? 'Email' : 'Username'} is already taken`
    });

  } catch (error) {
    console.error('Unexpected error checking availability:', error);
    return createErrorResponse(
      500,
      'Internal server error',
      'An unexpected error occurred while checking availability'
    );
  }
};

