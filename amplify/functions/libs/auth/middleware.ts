import {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  LambdaFunctionURLEvent,
  Context,
} from "aws-lambda";
import { createErrorResponse } from "../api-helpers";
import { logger } from "../logger";
import { getSsmParameter } from "../ssm-utils";
import {
  decodeJwtToken,
  verifyJwtToken,
  extractUserId,
  parseAuthHeader,
  JWTClaims,
} from "./jwt-utils";

const DEV_BYPASS_SSM_PARAM = "/neonpanda/DEV_BYPASS_ENABLED";

/**
 * Check whether the dev bypass is permitted.
 * Requires BOTH NODE_ENV === 'development' AND the SSM flag to be 'true'.
 * Defaults to disabled if the parameter is missing or unreadable.
 */
async function isDevBypassAllowed(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  const ssmFlag = await getSsmParameter(DEV_BYPASS_SSM_PARAM, {
    defaultValue: "false",
    cacheTtlMs: 60000, // Re-check every 60 seconds
  });
  return ssmFlag === "true";
}

export interface AuthenticatedEvent extends APIGatewayProxyEventV2WithJWTAuthorizer {
  user: {
    userId: string;
    username: string;
    email: string;
  };
}

export type AuthenticatedHandler = (
  event: AuthenticatedEvent,
) => Promise<APIGatewayProxyResultV2>;

export const withAuth = (
  handler: AuthenticatedHandler,
  options: { allowInternalCalls?: boolean } = {},
) => {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyResultV2> => {
    // DEBUG: Log the raw event structure
    logger.info("🔍 withAuth received event:", {
      hasEvent: !!event,
      eventKeys: Object.keys(event || {}),
      hasRequestContext: !!event?.requestContext,
      requestContextKeys: event?.requestContext
        ? Object.keys(event.requestContext)
        : null,
      hasAuthorizer: !!event?.requestContext?.authorizer,
      authorizerKeys: event?.requestContext?.authorizer
        ? Object.keys(event.requestContext.authorizer)
        : null,
      rawEvent: JSON.stringify(event, null, 2),
    });

    // Dev mode bypass for testing — requires NODE_ENV=development AND SSM flag enabled
    if (event.headers?.["x-dev-bypass"] === "true") {
      const bypassAllowed = await isDevBypassAllowed();
      if (bypassAllowed) {
        const authenticatedEvent = event as AuthenticatedEvent;
        authenticatedEvent.user = {
          userId: "dev_user_" + Math.random().toString(36).substr(2, 9),
          username: "dev_user",
          email: "dev@test.com",
        };
        logger.warn(
          "🔓 Dev mode bypass activated for user:",
          authenticatedEvent.user.userId,
        );
        return handler(authenticatedEvent);
      }
      logger.warn("🚫 Dev bypass header present but bypass is not enabled — ignoring");
    }

    // Safe access to claims with detailed error logging
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    // Handle internal Lambda-to-Lambda calls (no JWT context)
    if (!claims && options.allowInternalCalls) {
      // Internal calls come from other Lambda functions (already authenticated)
      // Extract userId from pathParameters and trust it since the calling Lambda was authenticated
      const userId = event.pathParameters?.userId;

      if (!userId) {
        return createErrorResponse(400, "userId required for internal call");
      }

      // Log all available path parameters for debugging and future extensibility
      const availableParams = Object.keys(event.pathParameters || {});
      logger.info("🔗 Internal Lambda call detected:", {
        userId,
        availableParams,
        pathParameters: event.pathParameters,
        source: "lambda-to-lambda",
      });

      // Create authenticated event preserving ALL original pathParameters
      // This ensures extensibility for future Lambda-to-Lambda calls with different parameters
      const authenticatedEvent = event as AuthenticatedEvent;
      authenticatedEvent.user = {
        userId,
        username: `internal_${userId}`, // Synthetic username for internal calls
        email: `${userId}@internal.lambda`, // Synthetic email for internal calls
      };

      // Ensure all pathParameters are preserved in the event
      // This allows handlers to access conversationId, workoutId, or any future parameters
      authenticatedEvent.pathParameters = event.pathParameters;

      return handler(authenticatedEvent);
    }

    if (!claims) {
      return createErrorResponse(401, "Authentication required");
    }

    const userId = claims["custom:user_id"] as string;
    const requestedUserId = event.pathParameters?.userId;

    if (!userId) {
      return createErrorResponse(
        400,
        "Custom userId not found. Please contact support.",
      );
    }

    // Only validate userId match if there's a userId in the path parameters
    // Some endpoints (like /stripe/portal-session) don't have userId in path
    if (requestedUserId && userId !== requestedUserId) {
      logger.warn(
        `🚫 Access denied: ${userId} tried to access ${requestedUserId}`,
      );
      return createErrorResponse(
        403,
        "Access denied: can only access your own data",
      );
    }

    const authenticatedEvent = event as AuthenticatedEvent;
    authenticatedEvent.user = {
      userId,
      username: claims.preferred_username as string,
      email: claims.email as string,
    };

    logger.info("✅ Authenticated user:", authenticatedEvent.user.userId);
    return handler(authenticatedEvent);
  };
};

// ============================================================================
// STREAMING AUTHENTICATION (Lambda Function URLs)
// ============================================================================

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
}

export interface AuthenticatedLambdaFunctionURLEvent extends LambdaFunctionURLEvent {
  user: AuthenticatedUser;
}

export type StreamingHandler = (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => Promise<void>;

export interface StreamingAuthOptions {
  allowInternalCalls?: boolean;
  requireUserId?: boolean;
  validateUserIdMatch?: boolean;
  routePattern?: string;
}

/**
 * Streaming Authentication Middleware for Lambda Function URLs
 * Handles authentication for streaming responses with SSE
 */
export function withStreamingAuth(
  handler: StreamingHandler,
  options: StreamingAuthOptions = {},
): (
  event: LambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => Promise<void> {
  return async (
    event: LambdaFunctionURLEvent,
    responseStream: any,
    context: Context,
  ) => {
    logger.info("🔍 withStreamingAuth received event:", {
      rawPath: event.rawPath,
      method: event.requestContext?.http?.method,
      hasHeaders: !!event.headers,
      headerKeys: Object.keys(event.headers || {}),
    });

    try {
      // Extract path parameters (requires streaming-specific path utils)
      const { extractPathParameters } = await import("../streaming/path-utils");
      const pathParams = extractPathParameters(
        event.rawPath,
        options.routePattern,
      );
      const { userId: pathUserId } = pathParams;

      // Dev mode bypass for testing — requires NODE_ENV=development AND SSM flag enabled
      if (event.headers?.["x-dev-bypass"] === "true") {
        const bypassAllowed = await isDevBypassAllowed();
        if (bypassAllowed) {
          const authenticatedEvent = event as AuthenticatedLambdaFunctionURLEvent;
          authenticatedEvent.user = {
            userId:
              pathUserId || "dev_user_" + Math.random().toString(36).substr(2, 9),
            username: "dev_user",
            email: "dev@test.com",
          };
          logger.warn(
            "🔓 Dev mode bypass activated for streaming user:",
            authenticatedEvent.user.userId,
          );
          return handler(authenticatedEvent, responseStream, context);
        }
        logger.warn("🚫 Dev bypass header present but bypass is not enabled — ignoring");
      }

      // Handle internal Lambda-to-Lambda calls (no JWT context)
      if (options.allowInternalCalls) {
        if (!pathUserId && options.requireUserId) {
          throw new Error("userId required for internal call");
        }

        if (pathUserId) {
          const authenticatedEvent =
            event as AuthenticatedLambdaFunctionURLEvent;
          authenticatedEvent.user = {
            userId: pathUserId,
            username: `internal_${pathUserId}`,
            email: `${pathUserId}@internal.lambda`,
          };

          logger.info("🔗 Internal Lambda streaming call detected:", {
            userId: pathUserId,
            pathParams,
            source: "lambda-to-lambda",
          });

          return handler(authenticatedEvent, responseStream, context);
        }
      }

      // Extract JWT token from Authorization header
      const authHeader =
        event.headers?.authorization || event.headers?.Authorization;

      if (!authHeader) {
        throw new Error("Authorization header required");
      }

      // Verify JWT signature against Cognito JWKS (streaming path — not covered by API Gateway authorizer)
      const token = parseAuthHeader(authHeader);
      const claims = await verifyJwtToken(token);
      const authenticatedUserId = extractUserId(claims);

      // Validate that authenticated user matches path user (if required)
      if (
        options.validateUserIdMatch !== false &&
        pathUserId &&
        authenticatedUserId !== pathUserId
      ) {
        logger.warn(
          `🚫 Streaming access denied: ${authenticatedUserId} tried to access ${pathUserId}`,
        );
        throw new Error("Access denied: can only access your own data");
      }

      // Create authenticated event
      const authenticatedEvent = event as AuthenticatedLambdaFunctionURLEvent;
      authenticatedEvent.user = {
        userId: authenticatedUserId,
        username: claims.preferred_username || `user_${authenticatedUserId}`,
        email: claims.email || `${authenticatedUserId}@unknown.com`,
      };

      logger.info("✅ Streaming authentication successful:", {
        userId: authenticatedEvent.user.userId,
        pathUserId,
        username: authenticatedEvent.user.username,
      });

      // Call the actual handler
      return handler(authenticatedEvent, responseStream, context);
    } catch (error) {
      logger.error("❌ Streaming authentication error:", error);
      // Re-throw the error so the pipeline can handle it
      throw error;
    }
  };
}
