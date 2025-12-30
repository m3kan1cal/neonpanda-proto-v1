import {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  LambdaFunctionURLEvent,
  Context,
} from "aws-lambda";
import { createErrorResponse } from "../api-helpers";
import {
  decodeJwtToken,
  extractUserId,
  parseAuthHeader,
  JWTClaims,
} from "./jwt-utils";

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
    console.info("🔍 withAuth received event:", {
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

    // Dev mode bypass for testing
    if (
      process.env.NODE_ENV === "development" &&
      event.headers?.["x-dev-bypass"] === "true"
    ) {
      const authenticatedEvent = event as AuthenticatedEvent;
      authenticatedEvent.user = {
        userId: "dev_user_" + Math.random().toString(36).substr(2, 9),
        username: "dev_user",
        email: "dev@test.com",
      };
      console.info(
        "🔓 Dev mode bypass activated for user:",
        authenticatedEvent.user.userId,
      );
      return handler(authenticatedEvent);
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
      console.info("🔗 Internal Lambda call detected:", {
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
      console.warn(
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

    console.info("✅ Authenticated user:", authenticatedEvent.user.userId);
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
    console.info("🔍 withStreamingAuth received event:", {
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

      // Dev mode bypass for testing
      if (
        process.env.NODE_ENV === "development" &&
        event.headers?.["x-dev-bypass"] === "true"
      ) {
        const authenticatedEvent = event as AuthenticatedLambdaFunctionURLEvent;
        authenticatedEvent.user = {
          userId:
            pathUserId || "dev_user_" + Math.random().toString(36).substr(2, 9),
          username: "dev_user",
          email: "dev@test.com",
        };

        console.info(
          "🔓 Dev mode bypass activated for streaming user:",
          authenticatedEvent.user.userId,
        );
        return handler(authenticatedEvent, responseStream, context);
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

          console.info("🔗 Internal Lambda streaming call detected:", {
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

      // Use shared JWT utilities
      const token = parseAuthHeader(authHeader);
      const claims = decodeJwtToken(token);
      const authenticatedUserId = extractUserId(claims);

      // Validate that authenticated user matches path user (if required)
      if (
        options.validateUserIdMatch !== false &&
        pathUserId &&
        authenticatedUserId !== pathUserId
      ) {
        console.warn(
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

      console.info("✅ Streaming authentication successful:", {
        userId: authenticatedEvent.user.userId,
        pathUserId,
        username: authenticatedEvent.user.username,
      });

      // Call the actual handler
      return handler(authenticatedEvent, responseStream, context);
    } catch (error) {
      console.error("❌ Streaming authentication error:", error);
      // Re-throw the error so the pipeline can handle it
      throw error;
    }
  };
}
