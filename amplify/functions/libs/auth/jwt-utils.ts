import jwt from 'jsonwebtoken';
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
 * Shared JWT decoding logic for both API Gateway and Lambda Function URL auth
 */
export function decodeJwtToken(token: string): JWTClaims {
  try {
    // Note: In production, you'd verify the token signature with the proper secret/key
    // For now, we'll decode without verification (matches development needs)
    const claims = jwt.decode(token) as JWTClaims;

    if (!claims) {
      throw new Error('Invalid JWT token format');
    }

    return claims;
  } catch (jwtError) {
    console.error('❌ JWT decode error:', jwtError);
    throw new Error('Failed to decode JWT token');
  }
}

/**
 * Extracts and validates user ID from JWT claims
 */
export function extractUserId(claims: JWTClaims): string {
  const userId = claims['custom:user_id'];

  if (!userId) {
    throw new Error('Custom userId not found in token. Please contact support.');
  }

  return userId;
}

/**
 * Parses Authorization header and extracts JWT token
 */
export function parseAuthHeader(authHeader: string): string {
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  // Parse JWT token (Bearer token expected)
  return authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
}
