import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  LambdaClient,
  InvokeCommand,
  InvocationType,
} from "@aws-sdk/client-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEnhancedMethodologyContext } from "./pinecone-utils";

// Amazon Bedrock Converse API configuration
// const CLAUDE_SONNET_4_MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0";
const CLAUDE_SONNET_4_MODEL_ID = "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
const CLAUDE_HAIKU_MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0"; // Updated to Claude 3.5 Haiku
const NOVA_MICRO_MODEL_ID = "us.amazon.nova-micro-v1:0";

// Increased for complex workout extractions with many rounds (Claude 4 supports much higher limits)
const MAX_TOKENS = 32768;
const TEMPERATURE = 0.7;

// Model constants for external use
export const MODEL_IDS = {
  CLAUDE_SONNET_4_FULL: CLAUDE_SONNET_4_MODEL_ID,
  CLAUDE_SONNET_4_DISPLAY: "claude-sonnet-4",
  CLAUDE_HAIKU_FULL: CLAUDE_HAIKU_MODEL_ID,
  CLAUDE_HAIKU_DISPLAY: "claude-3.5-haiku",
  NOVA_MICRO: NOVA_MICRO_MODEL_ID,
  NOVA_MICRO_DISPLAY: "nova-micro",
} as const;

// Create Bedrock Runtime client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-west-2",
});

// Create Lambda client for async invocations
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "us-west-2",
});

// Create S3 client for debugging logs
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-west-2",
});

// Pinecone configuration
const PINECONE_INDEX_NAME = "coach-creator-proto-v1-dev";
const PINECONE_API_KEY =
  process.env.PINECONE_API_KEY ||
  "pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC";

// Debug: Log Pinecone configuration at module load
console.info("🔧 PINECONE_API_KEY validation:", {
  exists: !!PINECONE_API_KEY,
  length: PINECONE_API_KEY?.length,
  isPlaceholder: PINECONE_API_KEY === "pcsk_replace_me",
  prefix: PINECONE_API_KEY?.substring(0, 12),
});

// Common CORS headers
export const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
} as const;

// Helper function to create standardized API responses
export function createResponse(
  statusCode: number,
  body: any
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

// Helper function to create error responses
export function createErrorResponse(
  statusCode: number,
  error: string,
  details?: any
): APIGatewayProxyResultV2 {
  const errorBody: any = { error };
  if (details) {
    errorBody.details = details;
  }
  return createResponse(statusCode, errorBody);
}

// Helper function to create OK responses (HTTP 200)
export function createOkResponse(
  data: any,
  message?: string
): APIGatewayProxyResultV2 {
  const successBody: any = { success: true };
  if (message) {
    successBody.message = message;
  }
  return createResponse(200, { ...successBody, ...data });
}

// Helper function to create created responses (HTTP 201)
export function createCreatedResponse(
  data: any,
  message?: string
): APIGatewayProxyResultV2 {
  const successBody: any = { success: true };
  if (message) {
    successBody.message = message;
  }
  return createResponse(201, { ...successBody, ...data });
}

// Helper function to get HTTP method from API Gateway v2 event
export function getHttpMethod(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.http?.method || "";
}

// Helper function to get request ID from API Gateway event
export function getRequestId(
  event: APIGatewayProxyEventV2
): string | undefined {
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

// Re-export from response-utils for backward compatibility
export { fixMalformedJson } from "./response-utils";

/**
 * Triggers a synchronous Lambda function invocation
 * @param functionName - Name of the Lambda function to invoke
 * @param payload - Payload to send to the Lambda function
 * @param context - Optional context for logging (e.g., 'initial message processing')
 * @returns Promise that resolves when target Lambda completes with the response
 */
export const invokeLambda = async (
  functionName: string,
  payload: Record<string, any>,
  context?: string
): Promise<any> => {
  try {
    console.info(
      `🚀 Triggering sync Lambda invocation${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadKeys: Object.keys(payload),
        context,
      }
    );

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: InvocationType.RequestResponse, // Sync invocation
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);

    console.info(
      `✅ Successfully completed sync Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadSize: JSON.stringify(payload).length,
        statusCode: response.StatusCode,
      }
    );

    // Parse and return the response payload if it exists
    if (response.Payload) {
      const responsePayload = JSON.parse(
        new TextDecoder().decode(response.Payload)
      );
      return responsePayload;
    }

    return null;
  } catch (error) {
    console.error(
      `❌ Failed to invoke sync Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        error: error instanceof Error ? error.message : "Unknown error",
        context,
      }
    );

    // Re-throw to allow caller to handle the error appropriately
    throw new Error(
      `Failed to invoke sync Lambda ${functionName}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

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
    console.info(
      `🚀 Triggering async Lambda invocation${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadKeys: Object.keys(payload),
        context,
      }
    );

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: InvocationType.Event, // Async invocation
      Payload: JSON.stringify(payload),
    });

    await lambdaClient.send(command);

    console.info(
      `✅ Successfully triggered async Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadSize: JSON.stringify(payload).length,
      }
    );
  } catch (error) {
    console.error(
      `❌ Failed to trigger async Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        error: error instanceof Error ? error.message : "Unknown error",
        context,
      }
    );

    // Re-throw to allow caller to handle the error appropriately
    throw new Error(
      `Failed to invoke async Lambda ${functionName}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

// Get model-specific token limits
const getMaxTokensForModel = (modelId: string): number => {
  if (modelId.includes("nova-micro")) {
    return 8000; // Very conservative limit for Nova Micro (for short contextual updates)
  } else if (modelId.includes("haiku")) {
    return 6000; // Conservative limit for Haiku (for short contextual updates)
  }
  return MAX_TOKENS; // Default for Claude Sonnet models
};

/**
 * Enhances a prompt to enable Claude's thinking capabilities
 */
const enhancePromptForThinking = (systemPrompt: string): string => {
  const thinkingInstructions = `
THINKING INSTRUCTIONS:
Before providing your final response, use <thinking> tags to think through the problem step by step.

Within the thinking tags, you should:
- Analyze the complexity of the task
- Break down the problem into components
- Consider edge cases and potential issues
- Plan your approach methodically
- Reason through any ambiguities
- Validate your logic before responding

After your thinking, provide your final response outside the thinking tags.

Example format:
<thinking>
Let me analyze this step by step:
1. The user is asking for...
2. I need to consider...
3. The key challenges are...
4. My approach should be...
</thinking>

[Your final response here]

${systemPrompt}`;

  return thinkingInstructions;
};

/**
 * Strips thinking tags from Claude's response to return only the final answer
 */
const stripThinkingTags = (response: string): string => {
  // Remove everything between <thinking> and </thinking> tags (including the tags)
  const withoutThinking = response.replace(
    /<thinking>[\s\S]*?<\/thinking>/gi,
    ""
  );

  // Clean up any extra whitespace that might be left
  return withoutThinking.trim();
};

// Amazon Bedrock Converse API call with optional thinking capabilities
export const callBedrockApi = async (
  systemPrompt: string,
  userMessage: string,
  modelId: string = CLAUDE_SONNET_4_MODEL_ID,
  enableThinking: boolean = false
): Promise<string> => {
  try {
    console.info("=== BEDROCK API CALL START ===");
    console.info("AWS Region:", process.env.AWS_REGION || "us-west-2");
    console.info("Model ID:", modelId);
    console.info("System prompt length:", systemPrompt.length);
    console.info("User message length:", userMessage.length);
    console.info("Thinking enabled:", enableThinking);
    console.info("Bedrock client config:", {
      region: (await bedrockClient.config.region?.()) || "unknown",
    });
    console.info("Environment variables:", {
      AWS_REGION: process.env.AWS_REGION,
      AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
    });

    const command = new ConverseCommand({
      modelId: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              text: userMessage,
            },
          ],
        },
      ],
      system: [
        {
          text: enableThinking
            ? enhancePromptForThinking(systemPrompt)
            : systemPrompt,
        },
      ],
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: TEMPERATURE,
      },
    });

    console.info("Converse command created successfully...");
    console.info("About to call bedrockClient.send()...");

    // Add heartbeat logging to track if Lambda is still running
    const heartbeatInterval = setInterval(() => {
      console.info(
        "HEARTBEAT: Lambda still running, waiting for Bedrock response..."
      );
    }, 5000);

    // Add explicit error handling around the send call with timeout
    let response;

    try {
      console.info("Starting Bedrock API call with 60s timeout...");

      // Simple approach: just make the API call and let AWS SDK handle timeouts
      response = await bedrockClient.send(command);

      clearInterval(heartbeatInterval);
      console.info("bedrockClient.send() completed successfully");
    } catch (sendError: any) {
      clearInterval(heartbeatInterval);
      console.error(
        "SEND ERROR - Error calling bedrockClient.send():",
        sendError
      );
      console.error("SEND ERROR - Error name:", sendError.name);
      console.error("SEND ERROR - Error message:", sendError.message);
      console.error("SEND ERROR - Error stack:", sendError.stack);
      if (sendError.$metadata) {
        console.error("SEND ERROR - AWS metadata:", sendError.$metadata);
      }
      throw sendError;
    }

    console.info("Response received from Bedrock");
    console.info("Response metadata:", response.$metadata);

    // Log response structure without full content to avoid token waste
    console.info("Response structure:", {
      hasOutput: !!response.output,
      hasMessage: !!response.output?.message,
      hasContent: !!response.output?.message?.content,
      contentLength: response.output?.message?.content?.length || 0,
      hasText: !!response.output?.message?.content?.[0]?.text,
    });

    if (!response.output?.message?.content?.[0]?.text) {
      console.error(
        "Invalid response structure:",
        JSON.stringify(response, null, 2)
      );
      throw new Error("Invalid response format from Bedrock");
    }

    let responseText = response.output.message.content[0].text;

    // If thinking was enabled, extract the final response (strip thinking tags)
    if (enableThinking) {
      responseText = stripThinkingTags(responseText);
    }

    console.info(
      "Successfully extracted response text, length:",
      responseText.length
    );

    // Check if response might be truncated due to token limits
    const maxTokensUsed = getMaxTokensForModel(modelId);
    if (responseText.length > maxTokensUsed * 3) {
      // Rough estimate: 1 token ≈ 3-4 chars
      console.warn(
        "⚠️ Response length suggests possible token limit truncation:",
        {
          responseLength: responseText.length,
          maxTokens: maxTokensUsed,
          estimatedTokens: Math.round(responseText.length / 3.5),
        }
      );
    }

    console.info("=== BEDROCK API CALL SUCCESS ===");

    return responseText;
  } catch (error: any) {
    console.error("=== BEDROCK API CALL FAILED ===");
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error.constructor?.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Log additional AWS-specific error details
    if (error.$fault) {
      console.error("AWS Fault:", error.$fault);
    }
    if (error.$service) {
      console.error("AWS Service:", error.$service);
    }
    if (error.$metadata) {
      console.error("AWS Metadata:", error.$metadata);
    }
    if (error.Code) {
      console.error("AWS Error Code:", error.Code);
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Claude API failed: ${errorMessage}`);
  }
};

// Amazon Bedrock Converse Stream API call for real-time streaming responses
export const callBedrockApiStream = async (
  systemPrompt: string,
  userMessage: string,
  modelId: string = CLAUDE_SONNET_4_MODEL_ID,
  enableThinking: boolean = false
): Promise<AsyncGenerator<string, void, unknown>> => {
  try {
    console.info("=== BEDROCK STREAMING API CALL START ===");
    console.info("AWS Region:", process.env.AWS_REGION || "us-west-2");
    console.info("Model ID:", modelId);
    console.info("System prompt length:", systemPrompt.length);
    console.info("User message length:", userMessage.length);
    console.info("Thinking enabled:", enableThinking);

    const command = new ConverseStreamCommand({
      modelId: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              text: userMessage,
            },
          ],
        },
      ],
      system: [
        {
          text: enableThinking
            ? enhancePromptForThinking(systemPrompt)
            : systemPrompt,
        },
      ],
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: TEMPERATURE,
      },
    });

    console.info("Converse stream command created successfully...");

    const response = await bedrockClient.send(command);

    if (!response.stream) {
      throw new Error("No stream received from Bedrock");
    }

    console.info("Stream response received from Bedrock");

    // Return an async generator that yields chunks as they come in
    return async function* streamGenerator() {
      try {
        let fullResponse = "";

        for await (const chunk of response.stream!) {
          if (chunk.contentBlockDelta?.delta?.text) {
            const deltaText = chunk.contentBlockDelta.delta.text;
            fullResponse += deltaText;
            yield deltaText;
          }

          // Handle end of stream
          if (chunk.messageStop) {
            console.info("=== BEDROCK STREAMING API CALL SUCCESS ===");
            console.info("Stream complete. Total response length:", fullResponse.length);

            // If thinking was enabled, we need to handle the thinking tags in the full response
            // For streaming, we'll yield the raw content and let the client handle thinking tag removal if needed
            break;
          }
        }

      } catch (streamError: any) {
        console.error("Error processing stream:", streamError);
        throw streamError;
      }
    }();

  } catch (error: any) {
    console.error("=== BEDROCK STREAMING API CALL FAILED ===");
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error.constructor?.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Log additional AWS-specific error details
    if (error.$fault) {
      console.error("AWS Fault:", error.$fault);
    }
    if (error.$service) {
      console.error("AWS Service:", error.$service);
    }
    if (error.$metadata) {
      console.error("AWS Metadata:", error.$metadata);
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Claude Streaming API failed: ${errorMessage}`);
  }
};

// Pinecone client initialization helper
export const getPineconeClient = async () => {
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });

  return {
    client: pc,
    index: pc.index(PINECONE_INDEX_NAME),
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
    const recordId = `${metadata.record_type || "context"}_${userId}_${Date.now()}`;

    // Prepare metadata for Pinecone storage (additional fields beyond the embedded text)
    const additionalFields = {
      // Core identification
      user_id: userId,
      timestamp: new Date().toISOString(),

      // Merge provided metadata
      ...metadata,
    };

    // Use upsertRecords for auto-embedding with llama-text-embed-v2
    await index.namespace(userNamespace).upsertRecords([
      {
        id: recordId,
        text: content, // This field gets auto-embedded by llama-text-embed-v2 (matches index field_map)
        ...additionalFields, // Additional metadata fields for filtering and retrieval
      },
    ]);

    console.info(`Successfully stored context in Pinecone:`, {
      indexName: PINECONE_INDEX_NAME,
      namespace: userNamespace,
      recordId,
      userId,
      contentLength: content.length,
    });

    return { success: true, recordId, namespace: userNamespace };
  } catch (error) {
    console.error("Failed to store Pinecone context:", error);
    throw error;
  }
};

// Store debugging data in S3 for analysis - with branch-aware subfolders
export const storeDebugDataInS3 = async (
  content: string,
  metadata: Record<string, any>,
  prefix: string = "debug"
): Promise<string> => {
  try {
    const bucketName = "midgard-sandbox-logs";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // Get branch information for subfolder structure
    const branchName = process.env.BRANCH_NAME || "main";
    const branchPrefix = `${branchName}/`;

    // Determine the folder structure based on the type of data
    let key: string;
    if (metadata.type === "weekly-analytics") {
      // Analytics goes in its own folder structure
      key = `${branchPrefix}analytics/weekly-analytics/${timestamp}_${metadata.userId || "unknown"}_${metadata.type || "raw-response"}.json`;
    } else {
      // Other debug data goes under the debug prefix
      const folder =
        metadata.type === "coach-conversation-prompt"
          ? "coach-conversation"
          : "workout-extraction";
      key = `${branchPrefix}${prefix}/${folder}/${timestamp}_${metadata.userId || "unknown"}_${metadata.type || "raw-response"}.json`;
    }

    const debugData = {
      timestamp: new Date().toISOString(),
      metadata,
      content,
    };

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(debugData, null, 2),
      ContentType: "application/json",
      ServerSideEncryption: "AES256",
    });

    await s3Client.send(command);

    console.info(`Successfully stored debug data in S3:`, {
      bucket: bucketName,
      key,
      contentLength: content.length,
      metadataKeys: Object.keys(metadata),
    });

    return `s3://${bucketName}/${key}`;
  } catch (error) {
    console.error("Failed to store debug data in S3:", error);
    throw error;
  }
};

// Helper function to validate Pinecone configuration
const validatePineconeConfig = () => {
  console.info("🔧 DEBUG: Pinecone configuration:", {
    indexName: PINECONE_INDEX_NAME,
    apiKeySet: !!PINECONE_API_KEY,
    apiKeyLength: PINECONE_API_KEY?.length,
    apiKeyPrefix: PINECONE_API_KEY?.substring(0, 12),
    apiKeyIsPlaceholder: PINECONE_API_KEY === "pcsk_replace_me",
    environment: process.env.NODE_ENV || "unknown",
    envPineconeKey: process.env.PINECONE_API_KEY ? "SET" : "NOT_SET",
    envPineconeKeyLength: process.env.PINECONE_API_KEY?.length || 0,
  });

  if (!PINECONE_API_KEY || PINECONE_API_KEY === "pcsk_replace_me") {
    throw new Error("Pinecone API key is not properly configured");
  }
};

// Helper function to query user namespace
const queryUserNamespace = async (
  index: any,
  userId: string,
  userMessage: string,
  options: {
    topK: number;
    includeWorkouts: boolean;
    includeCoachCreator: boolean;
    includeConversationSummaries: boolean;
  }
): Promise<any[]> => {
  const {
    topK,
    includeWorkouts,
    includeCoachCreator,
    includeConversationSummaries,
  } = options;

  // Build filter for record types in user namespace
  const userRecordTypeFilters = [];
  if (includeWorkouts) userRecordTypeFilters.push("workout_summary");
  if (includeCoachCreator) userRecordTypeFilters.push("coach_creator_summary");
  if (includeConversationSummaries)
    userRecordTypeFilters.push("conversation_summary");

  if (userRecordTypeFilters.length === 0) return [];

  try {
    const userNamespace = getUserNamespace(userId);
    const userSearchQuery = {
      query: {
        inputs: { text: userMessage },
        topK: topK,
      },
      filter: {
        record_type: { $in: userRecordTypeFilters },
      },
    };

    console.info("Querying user namespace:", {
      indexName: PINECONE_INDEX_NAME,
      namespace: userNamespace,
      userId,
      userMessageLength: userMessage.length,
      topK,
      recordTypes: userRecordTypeFilters,
    });

    const userResponse = await index
      .namespace(userNamespace)
      .searchRecords(userSearchQuery);

    console.info("✅ User namespace query successful:", {
      matches: userResponse.result.hits.length,
    });

    // Extract record data and combine with score before returning
    return userResponse.result.hits.map((hit: any) => {
      // Handle the actual Pinecone response structure
      return {
        id: hit._id,
        score: hit._score,
        text: hit.fields?.text || "",
        metadata: hit.fields || {},
      };
    });
  } catch (error) {
    console.error("❌ Failed to query user namespace:", error);
    return [];
  }
};

/**
 * Standardized methodology query function with reranking support
 * Replaces the complex getEnhancedMethodologyContext approach
 */
const queryMethodologyNamespace = async (
  userMessage: string,
  userId: string,
  options: { topK: number; enableReranking?: boolean }
): Promise<any[]> => {
  try {
    const { topK, enableReranking = RERANKING_CONFIG.enabled } = options;
    const { index } = await getPineconeClient();

    console.info("🔍 Querying methodology namespace:", {
      userMessage: userMessage.substring(0, 100),
      topK,
      rerankingEnabled: enableReranking,
      namespace: "methodology",
    });

    // Use higher topK if reranking is enabled
    const queryTopK = enableReranking ? Math.max(topK * 2, 20) : topK;

    const searchQuery = {
      query: {
        inputs: { text: userMessage },
        topK: queryTopK,
      },
    };

    const response = await index
      .namespace("methodology")
      .searchRecords(searchQuery);

    if (!response.result.hits || response.result.hits.length === 0) {
      console.info("📭 No methodology matches found");
      return [];
    }

    // Normalize all methodology matches - extract record data and combine with score
    let matches = response.result.hits
      .map((hit: any) => {
        // Handle the actual Pinecone response structure
        return {
          id: hit._id,
          score: hit._score,
          text: hit.fields?.text || "",
          metadata: hit.fields || {},
        };
      })
      .map((match) => normalizeMatch(match, "methodology"));

    // Apply reranking if enabled and we have sufficient results
    if (enableReranking && matches.length > 1) {
      try {
        console.info("🔄 Applying reranking to methodology results:", {
          originalCount: matches.length,
          targetCount: topK,
        });

        matches = await rerankPineconeResults(userMessage, matches, {
          topN: topK,
        });
      } catch (error) {
        console.error(
          "❌ Methodology reranking failed, using original results:",
          error
        );
        matches = matches.slice(0, topK);
      }
    } else {
      matches = matches.slice(0, topK);
    }

    console.info("✅ Standardized methodology query successful:", {
      originalHits: response.result.hits.length,
      finalMatches: matches.length,
      wasReranked: enableReranking && response.result.hits.length > 1,
    });

    return matches;
  } catch (error) {
    console.error("❌ Failed to query methodology namespace:", error);
    return [];
  }
};

// Configuration for reranking
const RERANKING_CONFIG = {
  enabled: true, // Enable/disable reranking
  model: "pinecone-rerank-v0", // Reranking model to use
  initialTopK: 30, // Higher initial query results for reranking
  finalTopN: 8, // Final number of reranked results
  truncate: "END", // How to handle long documents
  minScore: 0.5, // Lower threshold since reranking improves relevance
  fallbackMinScore: 0.7, // Fallback minScore when reranking is disabled
};

/**
 * Rerank search results using Pinecone's standalone rerank API
 * @param query - Original user query
 * @param matches - Search results to rerank
 * @param options - Reranking options
 * @returns Promise with reranked results maintaining original match structure
 */
const rerankPineconeResults = async (
  query: string,
  matches: any[],
  options: {
    topN?: number;
    model?: string;
    truncate?: string;
  } = {}
): Promise<any[]> => {
  if (!RERANKING_CONFIG.enabled || matches.length === 0) {
    return matches;
  }

  try {
    const {
      topN = RERANKING_CONFIG.finalTopN,
      model = RERANKING_CONFIG.model,
      truncate = RERANKING_CONFIG.truncate,
    } = options;

    // Validate Pinecone configuration for reranking
    validatePineconeConfig();
    const { client } = await getPineconeClient();


    // Extract documents for reranking (use text content from matches)
    const documents = matches.map((match, index) => {
      // Get the best available text content - try all possible field locations
      const text =
        match.text ||
        match.content ||
        match.metadata?.text ||
        match.metadata?.content ||
        "";

      const finalText = text.trim();

      if (!finalText) {
        console.warn(`⚠️ No text content found for match ${index}:`, {
          id: match.id,
          hasText: !!match.text,
          hasContent: !!match.content,
          hasMetadataText: !!match.metadata?.text,
          hasMetadataContent: !!match.metadata?.content,
          metadata: Object.keys(match.metadata || {}),
        });
        return `Record ID: ${match.id}`; // Fallback to ID if no text
      }

      return finalText;
    });

    console.info("🔄 Starting reranking process:", {
      originalMatches: matches.length,
      documentsExtracted: documents.length,
      queryLength: query.length,
      targetTopN: topN,
      model,
      // Debug: Show what fields were found in first few matches
      firstMatchFields: matches.slice(0, 2).map((match, i) => ({
        index: i,
        id: match.id,
        hasText: !!match.text,
        hasContent: !!match.content,
        hasMetadataText: !!match.metadata?.text,
        hasMetadataContent: !!match.metadata?.content,
        textLength: (match.text || "").length,
        contentLength: (match.content || "").length,
        metadataTextLength: (match.metadata?.text || "").length,
        documentLength: documents[i]?.length || 0,
      })),
    });

    // Call Pinecone rerank API
    const rerankResponse = await client.inference.rerank(
      model,
      query,
      documents,
      {
        topN: Math.min(topN, matches.length), // Don't request more than we have
        returnDocuments: true, // Get the documents back with scores
        parameters: {
          truncate,
        },
      }
    );

    if (!rerankResponse.data || rerankResponse.data.length === 0) {
      console.warn(
        "⚠️ Reranking returned no results, falling back to original matches"
      );
      return matches.slice(0, topN);
    }

    // Map reranked results back to original match structure
    const rerankedMatches = rerankResponse.data.map((rerankResult: any) => {
      // Find the original match by index (rerank preserves document order)
      const originalMatch = matches[rerankResult.index];

      return {
        ...originalMatch,
        // Update with reranking score
        score: rerankResult.score,
        // Add reranking metadata
        metadata: {
          ...originalMatch.metadata,
          originalScore: originalMatch.score,
          rerankScore: rerankResult.score,
          isReranked: true,
        },
      };
    });

    console.info("✅ Reranking successful:", {
      originalCount: matches.length,
      rerankedCount: rerankedMatches.length,
      avgOriginalScore:
        matches
          .slice(0, rerankedMatches.length)
          .reduce((sum: number, m: any) => sum + (m.score || 0), 0) /
        rerankedMatches.length,
      avgRerankScore:
        rerankedMatches.reduce(
          (sum: number, m: any) => sum + (m.score || 0),
          0
        ) / rerankedMatches.length,
    });

    return rerankedMatches;
  } catch (error) {
    console.error(
      "❌ Reranking failed, falling back to original results:",
      error
    );
    // Graceful degradation - return original matches
    return matches.slice(0, options.topN || RERANKING_CONFIG.finalTopN);
  }
};

/**
 * Standardized function to extract text content from Pinecone match results
 * Handles all possible field locations consistently across the codebase
 */
const extractTextContent = (match: any): string => {
  // Standard priority order for text content extraction
  const text =
    match.text ||
    match.content ||
    match.metadata?.text ||
    match.metadata?.content ||
    "";

  return text.trim();
};

/**
 * Standardized function to normalize Pinecone match results
 * Ensures consistent structure across all query types
 */
const normalizeMatch = (match: any, namespace?: string): any => {
  const textContent = extractTextContent(match);

  return {
    ...match,
    // Ensure text content is available in standard location
    text: textContent,
    content: textContent, // Backward compatibility
    // Normalize metadata
    metadata: {
      ...match.metadata,
      // Ensure record_type is set
      record_type:
        match.metadata?.record_type ||
        (namespace === "methodology" ? "methodology" : "unknown"),
    },
  };
};

// Helper function to process and filter results
const processAndFilterResults = async (
  allMatches: any[],
  options: { topK: number; minScore: number; enableReranking?: boolean },
  userId: string,
  originalQuery?: string
) => {
  const {
    topK,
    minScore,
    enableReranking = RERANKING_CONFIG.enabled,
  } = options;
  const userNamespace = getUserNamespace(userId);

  console.info("Processing Pinecone results:", {
    totalMatches: allMatches.length,
    targetTopK: topK,
    minScore,
    rerankingEnabled: enableReranking && !!originalQuery,
    hasQuery: !!originalQuery,
  });

  // Normalize all matches first for consistent structure
  const normalizedMatches = allMatches.map((match) => normalizeMatch(match));

  // Sort by score descending
  normalizedMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

  let processedMatches = normalizedMatches;

  // Apply reranking if enabled and we have a query
  if (enableReranking && originalQuery && normalizedMatches.length > 1) {
    try {
      // Use more matches for reranking to improve quality
      const matchesForReranking = normalizedMatches.slice(
        0,
        Math.min(RERANKING_CONFIG.initialTopK, normalizedMatches.length)
      );

      console.info("🔄 Applying reranking:", {
        originalCount: normalizedMatches.length,
        rerankingCount: matchesForReranking.length,
        targetFinalCount: RERANKING_CONFIG.finalTopN,
      });

      processedMatches = await rerankPineconeResults(
        originalQuery,
        matchesForReranking,
        {
          topN: RERANKING_CONFIG.finalTopN,
        }
      );
    } catch (error) {
      console.error(
        "❌ Reranking failed in processing, using original results:",
        error
      );
      processedMatches = normalizedMatches.slice(0, topK);
    }
  } else {
    // No reranking - use traditional topK filtering
    processedMatches = normalizedMatches.slice(0, topK);
  }

  // Determine appropriate minimum score based on whether reranking was used
  const effectiveMinScore =
    enableReranking && originalQuery
      ? RERANKING_CONFIG.minScore
      : RERANKING_CONFIG.fallbackMinScore;
  const finalMinScore = minScore || effectiveMinScore;

  // Filter results by minimum score and format for consumption
  const relevantMatches = processedMatches
    .filter((match: any) => match.score && match.score >= finalMinScore)
    .map((match: any) => ({
      id: match.id,
      score: match.score,
      content: extractTextContent(match), // Use standardized extraction
      recordType: match.metadata?.record_type || "methodology",
      metadata: match.metadata,
      namespace:
        match.metadata?.record_type === "methodology"
          ? "methodology"
          : userNamespace,
    }));

  const wasReranked =
    enableReranking && originalQuery && normalizedMatches.length > 1;

  console.info("✅ Successfully processed Pinecone results:", {
    indexName: PINECONE_INDEX_NAME,
    userId,
    totalMatches: normalizedMatches.length,
    processedMatches: processedMatches.length,
    relevantMatches: relevantMatches.length,
    finalMinScore,
    wasReranked,
    wasNormalized: true, // Indicate normalization was applied
    methodologyMatches: relevantMatches.filter(
      (m) => m.recordType === "methodology"
    ).length,
    userMatches: relevantMatches.filter((m) => m.recordType !== "methodology")
      .length,
  });

  return {
    matches: relevantMatches,
    success: true,
    totalMatches: normalizedMatches.length,
    relevantMatches: relevantMatches.length,
    wasReranked,
    wasNormalized: true,
  };
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
    enableReranking?: boolean;
  } = {}
) => {
  try {
    const {
      topK = 5,
      includeWorkouts = true,
      includeCoachCreator = true,
      includeConversationSummaries = true,
      includeMethodology = true,
      minScore = 0.7,
      enableReranking = RERANKING_CONFIG.enabled,
    } = options;

    // Validate configuration
    validatePineconeConfig();

    const { index } = await getPineconeClient();

    console.info("🔧 About to query Pinecone:", {
      namespace: getUserNamespace(userId),
      userId,
      indexName: PINECONE_INDEX_NAME,
      rerankingEnabled: enableReranking,
      finalTopK: topK,
    });

    // Determine query sizes based on reranking
    const queryTopK = enableReranking ? RERANKING_CONFIG.initialTopK : topK;

    // Execute queries in parallel with reranking support
    const [userMatches, methodologyMatches] = await Promise.all([
      queryUserNamespace(index, userId, userMessage, {
        topK: queryTopK,
        includeWorkouts,
        includeCoachCreator,
        includeConversationSummaries,
      }),
      includeMethodology
        ? queryMethodologyNamespace(userMessage, userId, {
            topK: queryTopK,
            enableReranking,
          })
        : Promise.resolve([]),
    ]);

    // Combine all matches
    const allMatches = [...userMatches, ...methodologyMatches];

    console.info("🔍 Retrieved initial Pinecone matches:", {
      userMatches: userMatches.length,
      methodologyMatches: methodologyMatches.length,
      totalMatches: allMatches.length,
      queryTopK,
      willRerank: enableReranking && allMatches.length > 1,
    });

    // Process and return results (with reranking if enabled)
    return await processAndFilterResults(
      allMatches,
      { topK, minScore, enableReranking },
      userId,
      userMessage // Pass original query for reranking
    );
  } catch (error) {
    console.error("Failed to query Pinecone context:", error);

    // Return empty results instead of throwing - allows graceful degradation
    return {
      matches: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      totalMatches: 0,
      relevantMatches: 0,
      wasReranked: false,
    };
  }
};

/**
 * Delete records from Pinecone by metadata filter
 *
 * @param userId - The user ID for namespace targeting
 * @param filter - Metadata filter to find records to delete
 * @returns Promise with deletion result
 */
export const deletePineconeContext = async (
  userId: string,
  filter: Record<string, any>
): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    const { index } = await getPineconeClient();
    const userNamespace = getUserNamespace(userId);

    console.info("🗑️ Deleting records from Pinecone by metadata filter:", {
      userId,
      namespace: userNamespace,
      filter,
    });

    // Delete directly by metadata filter - much simpler approach
    await index.namespace(userNamespace).deleteMany(filter);

    console.info(
      "✅ Successfully deleted records from Pinecone by metadata filter:",
      {
        userId,
        namespace: userNamespace,
        filter,
      }
    );

    // Note: Pinecone deleteMany by filter doesn't return count, so we return success without count
    return { success: true, deletedCount: 1 }; // Assume at least 1 record was deleted
  } catch (error) {
    console.error("❌ Failed to delete records from Pinecone:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Query memories from Pinecone based on semantic relevance
 * Follows the same pattern as other Pinecone query functions
 */
export const querySemanticMemories = async (
  userId: string,
  userMessage: string,
  options: {
    topK?: number;
    minScore?: number;
    contextTypes?: string[];
    enableReranking?: boolean;
  } = {}
): Promise<any[]> => {
  const {
    topK = 6,
    minScore = 0.7,
    contextTypes = [],
    enableReranking = RERANKING_CONFIG.enabled,
  } = options;

  try {
    const { index } = await getPineconeClient();
    const userNamespace = getUserNamespace(userId);

    console.info("🔍 Querying semantic memories from Pinecone:", {
      userId,
      userMessageLength: userMessage.length,
      topK,
      minScore,
      contextTypes,
      namespace: userNamespace,
      rerankingEnabled: enableReranking,
    });

    // Determine query size based on reranking
    const queryTopK = enableReranking
      ? Math.max(topK * 3, RERANKING_CONFIG.initialTopK)
      : topK;

    // Build filter for memory records
    let filter: Record<string, any> = {
      record_type: "user_memory",
    };

    // Add context type filtering if specified
    if (contextTypes.length > 0) {
      filter = {
        ...filter,
        $or: contextTypes.map((type) => ({ memory_type: type })),
      };
    }

    const searchQuery = {
      query: {
        inputs: { text: userMessage },
        topK: queryTopK,
      },
      filter,
    };

    const response = await index
      .namespace(userNamespace)
      .searchRecords(searchQuery);

    if (!response.result.hits || response.result.hits.length === 0) {
      console.info("📭 No semantic memories found in Pinecone:", {
        userId,
        contextTypes,
        queryLength: userMessage.length,
      });
      return [];
    }

    // Normalize all memory matches - extract record data and combine with score
    let normalizedHits = response.result.hits
      .map((hit: any) => {
        // Handle the actual Pinecone response structure
        return {
          id: hit._id,
          score: hit._score,
          text: hit.fields?.text || "",
          metadata: hit.fields || {},
        };
      })
      .map((hit) => normalizeMatch(hit));

    // Apply reranking if enabled and we have sufficient results
    if (enableReranking && normalizedHits.length > 1) {
      try {
        console.info("🔄 Applying reranking to memory results:", {
          originalCount: normalizedHits.length,
          targetCount: topK,
        });

        normalizedHits = await rerankPineconeResults(
          userMessage,
          normalizedHits,
          {
            topN: topK,
          }
        );
      } catch (error) {
        console.error(
          "❌ Memory reranking failed, using original results:",
          error
        );
        normalizedHits = normalizedHits.slice(0, topK);
      }
    } else {
      normalizedHits = normalizedHits.slice(0, topK);
    }

    // Determine effective minimum score based on reranking
    const effectiveMinScore =
      enableReranking && normalizedHits.length > 1
        ? RERANKING_CONFIG.minScore
        : minScore;

    // Filter by minimum score and convert to memory objects
    const relevantMemories = normalizedHits
      .filter((hit: any) => hit.score >= effectiveMinScore)
      .map((hit: any) => {
        // Convert Pinecone result back to UserMemory-like object
        return {
          memoryId: hit.metadata.memory_id,
          userId: hit.metadata.user_id || userId,
          coachId: hit.metadata.coach_id,
          content: extractTextContent(hit), // Use standardized extraction
          memoryType: hit.metadata.memory_type,
          metadata: {
            importance: hit.metadata.importance,
            createdAt: new Date(hit.metadata.created_at),
            usageCount: hit.metadata.usage_count || 0,
            lastUsed: hit.metadata.last_used
              ? new Date(hit.metadata.last_used)
              : undefined,
            tags: hit.metadata.tags || [],
            // Add reranking metadata
            originalScore: hit.metadata.originalScore,
            rerankScore: hit.metadata.rerankScore,
            wasReranked: !!hit.metadata.isReranked,
          },
          // Add Pinecone-specific metadata
          pineconeScore: hit.score,
          pineconeId: hit.id,
        };
      });

    console.info("✅ Successfully retrieved semantic memories:", {
      userId,
      totalHits: response.result.hits.length,
      relevantMemories: relevantMemories.length,
      effectiveMinScore,
      wasReranked: enableReranking && normalizedHits.length > 1,
      wasNormalized: true, // Indicate normalization was applied
      averageScore:
        relevantMemories.length > 0
          ? (
              relevantMemories.reduce((sum, m) => sum + m.pineconeScore, 0) /
              relevantMemories.length
            ).toFixed(3)
          : 0,
    });

    return relevantMemories;
  } catch (error) {
    console.error("❌ Failed to query semantic memories from Pinecone:", error);
    // Return empty array to allow graceful fallback
    return [];
  }
};
