import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createSuccessResponse, getCurrentTimestamp, getRequestId } from '../libs/api-helpers';

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  console.log('event', event);

  return createSuccessResponse({
    message: 'Hello World from Lambda!',
    timestamp: getCurrentTimestamp(),
    requestId: getRequestId(event)
  });
};