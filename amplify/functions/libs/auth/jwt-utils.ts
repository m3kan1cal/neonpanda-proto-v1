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

// NOTE: extractJWTClaims and getUserId functions have been removed
// All handlers now use the withAuth middleware which provides structured user data
// via event.user.{userId, username, email} in the AuthenticatedEvent interface

// NOTE: getUserEmail, getPreferredUsername, and authorizeUser functions have been removed
// All handlers now use the withAuth middleware which:
// - Provides structured user data via event.user.{userId, username, email}
// - Handles authorization automatically with proper HTTP status codes (403, not 500)
// - Eliminates the need for manual JWT extraction and validation
