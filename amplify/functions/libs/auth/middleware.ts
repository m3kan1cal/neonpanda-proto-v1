import { APIGatewayProxyResultV2, APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { createErrorResponse } from '../api-helpers'

export interface AuthenticatedEvent extends APIGatewayProxyEventV2WithJWTAuthorizer {
  user: {
    userId: string
    username: string
    email: string
  }
}

export type AuthenticatedHandler = (event: AuthenticatedEvent) => Promise<APIGatewayProxyResultV2>

export const withAuth = (handler: AuthenticatedHandler, options: { allowInternalCalls?: boolean } = {}) => {
  return async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    // Dev mode bypass for testing
    if (process.env.NODE_ENV === 'development' && event.headers['x-dev-bypass'] === 'true') {
      const authenticatedEvent = event as AuthenticatedEvent
      authenticatedEvent.user = {
        userId: 'dev_user_' + Math.random().toString(36).substr(2, 9),
        username: 'dev_user',
        email: 'dev@test.com'
      }
      console.info('🔓 Dev mode bypass activated for user:', authenticatedEvent.user.userId)
      return handler(authenticatedEvent)
    }

    const claims = event.requestContext.authorizer?.jwt?.claims

    // Handle internal Lambda-to-Lambda calls (no JWT context)
    if (!claims && options.allowInternalCalls) {
      // Internal calls come from other Lambda functions (already authenticated)
      // Extract userId from pathParameters and trust it since the calling Lambda was authenticated
      const userId = event.pathParameters?.userId

      if (!userId) {
        return createErrorResponse(400, 'userId required for internal call')
      }

      // Log all available path parameters for debugging and future extensibility
      const availableParams = Object.keys(event.pathParameters || {})
      console.info('🔗 Internal Lambda call detected:', {
        userId,
        availableParams,
        pathParameters: event.pathParameters,
        source: 'lambda-to-lambda'
      })

      // Create authenticated event preserving ALL original pathParameters
      // This ensures extensibility for future Lambda-to-Lambda calls with different parameters
      const authenticatedEvent = event as AuthenticatedEvent
      authenticatedEvent.user = {
        userId,
        username: `internal_${userId}`, // Synthetic username for internal calls
        email: `${userId}@internal.lambda` // Synthetic email for internal calls
      }

      // Ensure all pathParameters are preserved in the event
      // This allows handlers to access conversationId, workoutId, or any future parameters
      authenticatedEvent.pathParameters = event.pathParameters

      return handler(authenticatedEvent)
    }

    if (!claims) {
      return createErrorResponse(401, 'Authentication required')
    }

    const userId = claims['custom:user_id'] as string
    const requestedUserId = event.pathParameters?.userId

    if (!userId) {
      return createErrorResponse(400, 'Custom userId not found. Please contact support.')
    }

    if (userId !== requestedUserId) {
      console.warn(`🚫 Access denied: ${userId} tried to access ${requestedUserId}`)
      return createErrorResponse(403, 'Access denied: can only access your own data')
    }

    const authenticatedEvent = event as AuthenticatedEvent
    authenticatedEvent.user = {
      userId,
      username: claims.preferred_username as string,
      email: claims.email as string
    }

    console.info('✅ Authenticated user:', authenticatedEvent.user.userId)
    return handler(authenticatedEvent)
  }
}
