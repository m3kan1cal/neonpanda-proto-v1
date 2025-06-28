import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";
import {
  createSuccessResponse,
  createErrorResponse,
  getCurrentTimestamp,
  getRequestId,
  callBedrockApi,
} from "../libs/api-helpers";

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  console.info("event", event);

  try {
    // Test the Bedrock API with a simple prompt
    const systemPrompt =
      "You are a helpful assistant. Respond concisely and professionally.";
    const userMessage =
      "Hello! Please confirm that you're working correctly by saying 'Hello from Claude via Amazon Bedrock!'";

    const bedrockResponse = await callBedrockApi(systemPrompt, userMessage);

    return createSuccessResponse({
      message: "Hello World from Lambda!",
      timestamp: getCurrentTimestamp(),
      requestId: getRequestId(event),
      bedrockTest: {
        success: true,
        response: bedrockResponse,
      },
    });
  } catch (error) {
    console.error("Bedrock API test failed:", error);

    return createErrorResponse(500, "Bedrock API test failed", {
      message: "Hello World from Lambda (Bedrock test failed)",
      timestamp: getCurrentTimestamp(),
      requestId: getRequestId(event),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
