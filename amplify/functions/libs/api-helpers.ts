import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Pinecone } from '@pinecone-database/pinecone';


// Amazon Bedrock Converse API configuration
const CLAUDE_SONNET_4_MODEL_ID = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
const NOVA_MICRO_MODEL_ID = 'us.amazon.nova-micro-v1:0';
const MAX_TOKENS = 16384; // Increased for complex workout extractions (Claude 4 supports much higher limits)
const TEMPERATURE = 0.7;

// Model constants for external use
export const MODEL_IDS = {
  CLAUDE_SONNET_4_FULL: CLAUDE_SONNET_4_MODEL_ID,
  CLAUDE_SONNET_4_DISPLAY: 'claude-sonnet-4',
  NOVA_MICRO: NOVA_MICRO_MODEL_ID,
  NOVA_MICRO_DISPLAY: 'nova-micro'
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
  userMessage: string,
  modelId: string = CLAUDE_SONNET_4_MODEL_ID
): Promise<string> => {
  try {
    console.info('=== BEDROCK API CALL START ===');
    console.info('AWS Region:', process.env.AWS_REGION || 'us-west-2');
    console.info('Model ID:', modelId);
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
      modelId: modelId,
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

    // Determine the folder based on the type of debug data
    const folder = metadata.type === 'coach-conversation-prompt' ? 'coach-conversation' : 'workout-extraction';
    const key = `${prefix}/${folder}/${timestamp}_${metadata.userId || 'unknown'}_${metadata.type || 'raw-response'}.json`;

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

/**
 * Query Pinecone for semantic context relevant to user message
 *
 * @param userId - The user ID for namespace targeting
 * @param userMessage - The user's message to find relevant context for
 * @param options - Query options for filtering and limiting results
 * @returns Promise with relevant context matches
 */
export const queryPineconeContext = async (
  userId: string,
  userMessage: string,
  options: {
    topK?: number;
    includeWorkouts?: boolean;
    includeCoachCreator?: boolean;
    includeConversationSummaries?: boolean;
    includeMethodology?: boolean;
    minScore?: number;
  } = {}
) => {
  try {
    const {
      topK = 5,
      includeWorkouts = true,
      includeCoachCreator = true,
      includeConversationSummaries = true,
      includeMethodology = true,
      minScore = 0.7
    } = options;

    console.info('🔧 DEBUG: Pinecone configuration:', {
      indexName: PINECONE_INDEX_NAME,
      apiKeySet: !!PINECONE_API_KEY,
      apiKeyLength: PINECONE_API_KEY?.length,
      apiKeyPrefix: PINECONE_API_KEY?.substring(0, 12), // Show more for debugging
      apiKeyIsPlaceholder: PINECONE_API_KEY === 'pcsk_replace_me',
      environment: process.env.NODE_ENV || 'unknown',
      envPineconeKey: process.env.PINECONE_API_KEY ? 'SET' : 'NOT_SET',
      envPineconeKeyLength: process.env.PINECONE_API_KEY?.length || 0
    });

    // Validate API key before proceeding
    if (!PINECONE_API_KEY || PINECONE_API_KEY === 'pcsk_replace_me') {
      throw new Error('Pinecone API key is not properly configured');
    }

    const { client, index } = await getPineconeClient();

    // Debug: Check if index exists and list available indexes
    // try {
    //   console.info('🔧 Testing Pinecone client connection...');
    //   const indexList = await client.listIndexes();
    //   console.info('Available indexes:', indexList.indexes?.map(idx => idx.name) || []);

    //   console.info('🔧 Testing specific index access...');
    //   const indexStats = await index.describeIndexStats();
    //   console.info('✅ Index access successful:', {
    //     dimension: indexStats.dimension,
    //     totalRecordCount: indexStats.totalRecordCount
    //   });
    // } catch (indexError) {
    //   console.error('❌ Index access failed:', indexError);
    //   console.error('This suggests either the index name is wrong or API key lacks permission');
    //   throw indexError;
    // }

    const userNamespace = getUserNamespace(userId);

    console.info('🔧 About to query user namespace:', {
      namespace: userNamespace,
      userId: userId,
      indexName: PINECONE_INDEX_NAME
    });

    // Build filter for record types in user namespace
    const userRecordTypeFilters = [];
    if (includeWorkouts) userRecordTypeFilters.push('workout_summary');
    if (includeCoachCreator) userRecordTypeFilters.push('coach_creator_summary');
    if (includeConversationSummaries) userRecordTypeFilters.push('conversation_summary');

    let allMatches: any[] = [];

    // Query user namespace if any user record types are requested
    if (userRecordTypeFilters.length > 0) {
      try {
        const userSearchQuery = {
          query: {
            inputs: { text: userMessage },
            topK: topK,
          },
          filter: {
            record_type: { $in: userRecordTypeFilters }
          }
        };

        console.info('Querying user namespace:', {
          indexName: PINECONE_INDEX_NAME,
          namespace: userNamespace,
          userId,
          userMessageLength: userMessage.length,
          topK,
          recordTypes: userRecordTypeFilters
        });

        const userResponse = await index.namespace(userNamespace).searchRecords(userSearchQuery);
        allMatches.push(...userResponse.result.hits);

        console.info('✅ User namespace query successful:', {
          matches: userResponse.result.hits.length
        });

      } catch (error) {
        console.error('❌ Failed to query user namespace:', error);
        // Continue without user context
      }
    }

    // Query methodology namespace if methodology is requested
    if (includeMethodology) {
      try {
        const methodologySearchQuery = {
          query: {
            inputs: { text: userMessage },
            topK: Math.ceil(topK / 2), // Use half topK for methodology to balance results
          }
          // No filter needed for methodology namespace - all records are methodology documents
        };

        console.info('Querying methodology namespace:', {
          indexName: PINECONE_INDEX_NAME,
          namespace: 'methodology',
          userMessageLength: userMessage.length,
          topK: Math.ceil(topK / 2)
        });

        const methodologyResponse = await index.namespace('methodology').searchRecords(methodologySearchQuery);

        // Add record_type to methodology matches and add to allMatches
        const methodologyMatches = methodologyResponse.result.hits.map((match: any) => ({
          ...match,
          metadata: {
            ...match.metadata,
            record_type: 'methodology' // Ensure methodology records have proper record_type
          }
        }));

        allMatches.push(...methodologyMatches);

        console.info('✅ Methodology namespace query successful:', {
          matches: methodologyMatches.length
        });

      } catch (error) {
        console.error('❌ Failed to query methodology namespace:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
        });
        // Continue without methodology context - this allows the conversation to proceed
      }
    }

    // Sort by score descending and take top results
    allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));
    allMatches = allMatches.slice(0, topK);

    // Filter results by minimum score and format for consumption
    const relevantMatches = allMatches
      .filter((match: any) => match.score && match.score >= minScore)
      .map((match: any) => ({
        id: match.id,
        score: match.score,
        content: match.text || match.metadata?.text || '', // Check root text first, then metadata for methodology vs user docs
        recordType: match.metadata?.record_type || 'methodology',
        metadata: match.metadata,
        namespace: match.metadata?.record_type === 'methodology' ? 'methodology' : userNamespace
      }));

    console.info('Successfully queried Pinecone for context:', {
      indexName: PINECONE_INDEX_NAME,
      userId,
      userMessageLength: userMessage.length,
      totalMatches: allMatches.length,
      relevantMatches: relevantMatches.length,
      minScore,
      userRecordTypes: userRecordTypeFilters,
      includeMethodology,
      methodologyMatches: relevantMatches.filter(m => m.recordType === 'methodology').length,
      userMatches: relevantMatches.filter(m => m.recordType !== 'methodology').length
    });

    return {
      matches: relevantMatches,
      success: true,
      totalMatches: allMatches.length,
      relevantMatches: relevantMatches.length
    };

  } catch (error) {
    console.error('Failed to query Pinecone context:', error);

    // Return empty results instead of throwing - allows graceful degradation
    return {
      matches: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalMatches: 0,
      relevantMatches: 0
    };
  }
};
