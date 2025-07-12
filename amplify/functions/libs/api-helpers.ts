import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Pinecone } from '@pinecone-database/pinecone';


// Amazon Bedrock Converse API configuration
const CLAUDE_SONNET_4_MODEL_ID = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
const MAX_TOKENS = 16384; // Increased for complex workout extractions (Claude 4 supports much higher limits)
const TEMPERATURE = 0.7;

// Model constants for external use
export const MODEL_IDS = {
  CLAUDE_SONNET_4_FULL: CLAUDE_SONNET_4_MODEL_ID,
  CLAUDE_SONNET_4_DISPLAY: 'claude-sonnet-4'
} as const;

// Create Bedrock Runtime client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2'
});

// Create Lambda client for async invocations
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'us-west-2'
});

// Create S3 client for debugging logs
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2'
});

// Pinecone configuration
const PINECONE_INDEX_NAME = 'coach-creator-proto-v1-dev';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_replace_me';

// Common CORS headers
export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
} as const;

// Helper function to create standardized API responses
export function createResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

// Helper function to create error responses
export function createErrorResponse(statusCode: number, error: string, details?: any): APIGatewayProxyResultV2 {
  const errorBody: any = { error };
  if (details) {
    errorBody.details = details;
  }
  return createResponse(statusCode, errorBody);
}

// Helper function to create success responses
export function createSuccessResponse(data: any, message?: string): APIGatewayProxyResultV2 {
  const successBody: any = { success: true };
  if (message) {
    successBody.message = message;
  }
  return createResponse(200, { ...successBody, ...data });
}

// Helper function to get HTTP method from API Gateway v2 event
export function getHttpMethod(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.http?.method || '';
}

// Helper function to get request ID from API Gateway event
export function getRequestId(event: APIGatewayProxyEventV2): string | undefined {
  return event.requestContext?.requestId;
}

// Helper function to get source IP from API Gateway event
export function getSourceIp(event: APIGatewayProxyEventV2): string | undefined {
  return event.requestContext?.http?.sourceIp;
}

// Helper function to get current timestamp
export function getCurrentTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Triggers an async Lambda function invocation
 * @param functionName - Name of the Lambda function to invoke
 * @param payload - Payload to send to the Lambda function
 * @param context - Optional context for logging (e.g., 'workout extraction', 'coach config generation')
 * @returns Promise that resolves when invocation is triggered (not when target Lambda completes)
 */
export const invokeAsyncLambda = async (
  functionName: string,
  payload: Record<string, any>,
  context?: string
): Promise<void> => {
  try {
    console.info(`🚀 Triggering async Lambda invocation${context ? ` for ${context}` : ''}:`, {
      functionName,
      payloadKeys: Object.keys(payload),
      context
    });

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: InvocationType.Event, // Async invocation
      Payload: JSON.stringify(payload)
    });

    await lambdaClient.send(command);

    console.info(`✅ Successfully triggered async Lambda${context ? ` for ${context}` : ''}:`, {
      functionName,
      payloadSize: JSON.stringify(payload).length
    });
  } catch (error) {
    console.error(`❌ Failed to trigger async Lambda${context ? ` for ${context}` : ''}:`, {
      functionName,
      error: error instanceof Error ? error.message : 'Unknown error',
      context
    });

    // Re-throw to allow caller to handle the error appropriately
    throw new Error(`Failed to invoke async Lambda ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Amazon Bedrock Converse API call
export const callBedrockApi = async (
  systemPrompt: string,
  userMessage: string
): Promise<string> => {
  try {
        console.info('=== BEDROCK API CALL START ===');
    console.info('AWS Region:', process.env.AWS_REGION || 'us-west-2');
    console.info('Model ID:', CLAUDE_SONNET_4_MODEL_ID);
    console.info('System prompt length:', systemPrompt.length);
    console.info('User message length:', userMessage.length);
    console.info('Bedrock client config:', {
      region: await bedrockClient.config.region?.() || 'unknown'
    });
    console.info('Environment variables:', {
      AWS_REGION: process.env.AWS_REGION,
      AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME
    });

    const command = new ConverseCommand({
      modelId: CLAUDE_SONNET_4_MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [
            {
              text: userMessage
            }
          ]
        }
      ],
      system: [
        {
          text: systemPrompt
        }
      ],
      inferenceConfig: {
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      },
    });

    console.info('Converse command created successfully...');
    console.info('About to call bedrockClient.send()...');

    // Add heartbeat logging to track if Lambda is still running
    const heartbeatInterval = setInterval(() => {
      console.info('HEARTBEAT: Lambda still running, waiting for Bedrock response...');
    }, 5000);

                    // Add explicit error handling around the send call with timeout
    let response;

    try {
      console.info('Starting Bedrock API call with 60s timeout...');

      // Simple approach: just make the API call and let AWS SDK handle timeouts
      response = await bedrockClient.send(command);

      clearInterval(heartbeatInterval);
      console.info('bedrockClient.send() completed successfully');
    } catch (sendError: any) {
      clearInterval(heartbeatInterval);
      console.error('SEND ERROR - Error calling bedrockClient.send():', sendError);
      console.error('SEND ERROR - Error name:', sendError.name);
      console.error('SEND ERROR - Error message:', sendError.message);
      console.error('SEND ERROR - Error stack:', sendError.stack);
      if (sendError.$metadata) {
        console.error('SEND ERROR - AWS metadata:', sendError.$metadata);
      }
      throw sendError;
    }

    console.info('Response received from Bedrock');
    console.info('Response metadata:', response.$metadata);

    // Log response structure without full content to avoid token waste
    console.info('Response structure:', {
      hasOutput: !!response.output,
      hasMessage: !!response.output?.message,
      hasContent: !!response.output?.message?.content,
      contentLength: response.output?.message?.content?.length || 0,
      hasText: !!response.output?.message?.content?.[0]?.text
    });

    if (!response.output?.message?.content?.[0]?.text) {
      console.error('Invalid response structure:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response format from Bedrock');
    }

    const responseText = response.output.message.content[0].text;
    console.info('Successfully extracted response text, length:', responseText.length);
    console.info('=== BEDROCK API CALL SUCCESS ===');

    return responseText;
  } catch (error: any) {
    console.error('=== BEDROCK API CALL FAILED ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor?.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Log additional AWS-specific error details
    if (error.$fault) {
      console.error('AWS Fault:', error.$fault);
    }
    if (error.$service) {
      console.error('AWS Service:', error.$service);
    }
    if (error.$metadata) {
      console.error('AWS Metadata:', error.$metadata);
    }
    if (error.Code) {
      console.error('AWS Error Code:', error.Code);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Claude API failed: ${errorMessage}`);
  }
};

// Pinecone client initialization helper
export const getPineconeClient = async () => {
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY
  });

  return {
    client: pc,
    index: pc.index(PINECONE_INDEX_NAME)
  };
};

// Helper function to get user namespace
export const getUserNamespace = (userId: string): string => {
  return `user_${userId}`;
};

// Store context in Pinecone with proper namespace strategy
export const storePineconeContext = async (
  userId: string,
  content: string,
  metadata: Record<string, any>
) => {
  try {
    const { index } = await getPineconeClient();
    const userNamespace = getUserNamespace(userId);
    const recordId = `${metadata.record_type || 'context'}_${userId}_${Date.now()}`;

    // Prepare metadata for Pinecone storage (additional fields beyond the embedded text)
    const additionalFields = {
      // Core identification
      user_id: userId,
      timestamp: new Date().toISOString(),

      // Merge provided metadata
      ...metadata
    };

    // Use upsertRecords for auto-embedding with llama-text-embed-v2
    await index.namespace(userNamespace).upsertRecords([{
      id: recordId,
      text: content, // This field gets auto-embedded by llama-text-embed-v2 (matches index field_map)
      ...additionalFields // Additional metadata fields for filtering and retrieval
    }]);

    console.info(`Successfully stored context in Pinecone:`, {
      indexName: PINECONE_INDEX_NAME,
      namespace: userNamespace,
      recordId,
      userId,
      contentLength: content.length
    });

    return { success: true, recordId, namespace: userNamespace };

  } catch (error) {
    console.error('Failed to store Pinecone context:', error);
    throw error;
  }
};

// Store debugging data in S3 for analysis
export const storeDebugDataInS3 = async (
  content: string,
  metadata: Record<string, any>,
  prefix: string = 'debug'
): Promise<string> => {
  try {
    const bucketName = 'midgard-sandbox-logs';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `${prefix}/workout-extraction/${timestamp}_${metadata.userId || 'unknown'}_${metadata.type || 'raw-response'}.json`;

    const debugData = {
      timestamp: new Date().toISOString(),
      metadata,
      content
    };

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(debugData, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    });

    await s3Client.send(command);

    console.info(`Successfully stored debug data in S3:`, {
      bucket: bucketName,
      key,
      contentLength: content.length,
      metadataKeys: Object.keys(metadata)
    });

    return `s3://${bucketName}/${key}`;

  } catch (error) {
    console.error('Failed to store debug data in S3:', error);
    throw error;
  }
};
