import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { logger } from "../logger";

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
}

// Module-level JWKS client — cached across warm Lambda invocations
let jwksClient: jwksRsa.JwksClient | null = null;

function getJwksClient(): jwksRsa.JwksClient {
  if (!jwksClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    const userPoolId = process.env.USER_POOL_ID;

    if (!userPoolId) {
      throw new Error('USER_POOL_ID environment variable is not set');
    }

    jwksClient = jwksRsa({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }
  return jwksClient;
}

/**
 * Fetch the signing key for a given JWT kid from Cognito JWKS endpoint.
 */
async function getSigningKey(kid: string): Promise<string> {
  const client = getJwksClient();
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

/**
 * Verify and decode a Cognito JWT token, checking signature, expiry, issuer, and audience.
 * Requires APP_CLIENT_ID environment variable to be set for audience validation.
 */
export async function verifyJwtToken(token: string): Promise<JWTClaims> {
  // Decode header to get kid — do not trust claims yet
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid JWT token format');
  }

  const kid = decoded.header.kid;
  if (!kid) {
    throw new Error('JWT is missing kid header — cannot verify signature');
  }

  const region = process.env.AWS_REGION || 'us-east-1';
  const userPoolId = process.env.USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('USER_POOL_ID environment variable is not set');
  }

  const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const appClientId = process.env.APP_CLIENT_ID;

  if (!appClientId) {
    throw new Error('APP_CLIENT_ID environment variable is not set');
  }

  const publicKey = await getSigningKey(kid);

  const claims = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: expectedIssuer,
    audience: appClientId,
  }) as JWTClaims;

  // Explicit claim checks
  if (!claims.sub) {
    throw new Error('JWT missing sub claim');
  }
  if (claims.token_use !== 'id' && claims.token_use !== 'access') {
    throw new Error(`Unexpected token_use: ${claims.token_use}`);
  }

  return claims;
}

/**
 * Decode a JWT without signature verification.
 * ONLY use this for the API Gateway path where the JWT authorizer has
 * already validated the token before the Lambda is invoked.
 * Do NOT use this on the streaming (Lambda Function URL) path.
 */
export function decodeJwtToken(token: string): JWTClaims {
  try {
    const claims = jwt.decode(token) as JWTClaims;

    if (!claims) {
      throw new Error('Invalid JWT token format');
    }

    return claims;
  } catch (jwtError) {
    logger.error('❌ JWT decode error:', jwtError);
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

  return authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
}
