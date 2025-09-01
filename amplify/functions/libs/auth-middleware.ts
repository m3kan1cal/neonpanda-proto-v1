import { APIGatewayProxyResultV2, APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { createErrorResponse } from './api-helpers'

export interface AuthenticatedEvent extends APIGatewayProxyEventV2WithJWTAuthorizer {
  user: {
    userId: string
    username: string
    email: string
  }
}

export type AuthenticatedHandler = (event: AuthenticatedEvent) => Promise<APIGatewayProxyResultV2>

export const withAuth = (handler: AuthenticatedHandler, options = {}) => {
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
