import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

/**
 * JWT Claims interface for Cognito ID tokens
 */
export interface JWTClaims {
  'custom:user_id': string;
  email: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  sub: string; // Cognito user ID
  aud: string; // Client ID
  iss: string; // Issuer
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  token_use: 'id' | 'access';
  auth_time: number;
  // Add other common claims as needed
}

/**
 * Extracts JWT claims from API Gateway event
 * @param event - API Gateway event with JWT authorizer
 * @returns Typed JWT claims object
 */
export const extractJWTClaims = (event: APIGatewayProxyEventV2WithJWTAuthorizer): JWTClaims => {
  return event.requestContext.authorizer.jwt.claims as unknown as JWTClaims;
};

/**
 * Extracts the custom user ID from JWT claims
 * @param event - API Gateway event with JWT authorizer
 * @returns Custom user ID
 * @throws Error if custom:user_id is not found
 */
export const getUserId = (event: APIGatewayProxyEventV2WithJWTAuthorizer): string => {
  const claims = extractJWTClaims(event);
  const userId = claims['custom:user_id'];

  if (!userId) {
    throw new Error('Custom userId not found. Please contact support.');
  }

  return userId;
};

/**
 * Extracts the user's email from JWT claims
 * @param event - API Gateway event with JWT authorizer
 * @returns User email
 * @throws Error if email is not found
 */
export const getUserEmail = (event: APIGatewayProxyEventV2WithJWTAuthorizer): string => {
  const claims = extractJWTClaims(event);
  const email = claims.email;

  if (!email) {
    throw new Error('User email not found in JWT claims.');
  }

  return email;
};

/**
 * Extracts the user's preferred username from JWT claims
 * @param event - API Gateway event with JWT authorizer
 * @returns Preferred username
 * @throws Error if preferred_username is not found
 */
export const getPreferredUsername = (event: APIGatewayProxyEventV2WithJWTAuthorizer): string => {
  const claims = extractJWTClaims(event);
  const username = claims.preferred_username;

  if (!username) {
    throw new Error('Preferred username not found in JWT claims.');
  }

  return username;
};

/**
 * Authorizes that the requested userId matches the authenticated user
 * @param event - API Gateway event with JWT authorizer
 * @param requestedUserId - The userId from the API path/parameters
 * @throws Error if userId doesn't match the authenticated user
 */
export const authorizeUser = (event: APIGatewayProxyEventV2WithJWTAuthorizer, requestedUserId: string): void => {
  const authenticatedUserId = getUserId(event);

  if (authenticatedUserId !== requestedUserId) {
    throw new Error('Access denied: You can only access your own data.');
  }
};
