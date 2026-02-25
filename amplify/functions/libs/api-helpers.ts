import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  OutputFormatType,
} from "@aws-sdk/client-bedrock-runtime";
import {
  LambdaClient,
  InvokeCommand,
  InvocationType,
} from "@aws-sdk/client-lambda";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEnhancedMethodologyContext } from "./pinecone-utils";
import { putObject } from "./s3-utils";
import { deepSanitizeNullish } from "./object-utils";
import { parseJsonWithFallbacks } from "./response-utils";
import { logger } from "./logger";
import { validateToolResponse } from "./tool-validation";

// Amazon Bedrock Converse API configuration
const CLAUDE_SONNET_4_MODEL_ID = "us.anthropic.claude-sonnet-4-6";
const CLAUDE_SONNET_4_DISPLAY = "claude-sonnet-4.6";

const CLAUDE_HAIKU_4_MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const CLAUDE_HAIKU_4_DISPLAY = "claude-4.5-haiku";

const NOVA_2_LITE_MODEL_ID = "us.amazon.nova-2-lite-v1:0";
const NOVA_2_LITE_DISPLAY = "nova-2-lite";

const NEMOTRON_NANO_12B_MODEL_ID = "nvidia.nemotron-nano-12b-v2";
const NEMOTRON_NANO_12B_DISPLAY = "nemotron-nano-12b";

// Increased for complex workout extractions with many rounds (Claude 4 supports much higher limits)
const MAX_TOKENS = 32768;

// Temperature presets for different AI task types
export const TEMPERATURE_PRESETS = {
  STRUCTURED: 0.2, // JSON extraction, data parsing, structured data generation
  BALANCED: 0.7, // Default for most tasks, general purpose
  CREATIVE: 1.0, // Brainstorming, varied content, creative generation
} as const;

/**
 * STANDARD PATTERN: Tool Result Extraction
 *
 * When using callBedrockApi() with tools (expectedToolName), the response structure is:
 * { toolName: string, input: YourSchema, stopReason: string }
 *
 * Standard extraction pattern:
 *
 * ```typescript
 * const result = await callBedrockApi(systemPrompt, userMessage, modelId, {
 *   tools: { name: "your_tool", inputSchema: YOUR_SCHEMA },
 *   expectedToolName: "your_tool",
 * });
 *
 * // Extract the tool result
 * if (result && typeof result === "object" && result.input) {
 *   const toolResult = result.input as YourSchemaType;
 *   // Use toolResult directly
 *   return toolResult;
 * }
 *
 * // Fallback for unexpected response format
 * logger.warn("⚠️ Tool response not in expected format");
 * return defaultValue;
 * ```
 *
 * Key points:
 * - Check: result exists, is object, and has input property
 * - Cast result.input to your expected type
 * - Always provide a fallback for unexpected formats
 * - The try-catch wrapper handles errors
 * - Don't over-validate - trust the schema and handle errors gracefully
 *
 * Examples:
 * - libs/program/duration-normalizer.ts
 * - libs/coach-creator/coach-generation.ts
 * - libs/agents/workout-logger/tools.ts
 * - libs/exercise/normalization.ts
 */

// Model constants for external use
// MODEL_IDS.PLANNER_MODEL_DISPLAY
export const MODEL_IDS = {
  // The Contextual Model. Used for contextual updates, intent classification, and simple
  // classification tasks. Output is streamed to or surfaced in the user's UI.
  // Must be streaming-capable.
  CONTEXTUAL_MODEL_FULL: CLAUDE_HAIKU_4_MODEL_ID,
  CONTEXTUAL_MODEL_DISPLAY: CLAUDE_HAIKU_4_DISPLAY,

  // The Executor. It is used as a sub-agent to carry out those discrete instructions in parallel,
  // benefiting from its speed and near-frontier coding accuracy.
  EXECUTOR_MODEL_FULL: CLAUDE_HAIKU_4_MODEL_ID,
  EXECUTOR_MODEL_DISPLAY: CLAUDE_HAIKU_4_DISPLAY,

  // The Planner. It is used for orchestration—breaking down complex, multi-file problems
  // into a set of discrete instructions.
  PLANNER_MODEL_FULL: CLAUDE_SONNET_4_MODEL_ID,
  PLANNER_MODEL_DISPLAY: CLAUDE_SONNET_4_DISPLAY,

  // The Utility Model. Used for non-streaming, behind-the-scenes classification,
  // detection, and simple structured extraction tasks. These calls are never surfaced
  // directly to the user as streaming output. Do NOT use with callBedrockApiStream
  // or any ConverseStream call path.
  // Backed by Amazon Nova 2 Lite — cost-optimized, supports tool calling.
  // Callers should use TEMPERATURE_PRESETS.STRUCTURED (0.2) for reliable tool use.
  UTILITY_MODEL_FULL: NOVA_2_LITE_MODEL_ID,
  UTILITY_MODEL_DISPLAY: NOVA_2_LITE_DISPLAY,
} as const;

// AI error fallback message for streaming handlers
export const AI_ERROR_FALLBACK_MESSAGE =
  "I apologize, but I'm having trouble generating a response right now. Your message has been saved and I'll be back to help you soon!";

// Create Bedrock Runtime client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-west-2",
});

// Create Lambda client for async invocations
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "us-west-2",
});

// S3 client for debugging logs is now provided by shared s3-utils module

// Pinecone configuration
const PINECONE_INDEX_NAME = "coach-creator-proto-v1-dev";
const PINECONE_API_KEY =
  process.env.PINECONE_API_KEY ||
  "pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC";

// Debug: Log Pinecone configuration at module load
logger.info("🔧 PINECONE_API_KEY validation:", {
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
  body: any,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

// Helper function to create error responses
// Always includes success: false for consistent response format across all endpoints
export function createErrorResponse(
  statusCode: number,
  error: string,
  details?: any,
): APIGatewayProxyResultV2 {
  const errorBody: any = { success: false, error };
  if (details) {
    errorBody.details = details;
  }
  return createResponse(statusCode, errorBody);
}

// Helper function to create OK responses (HTTP 200)
export function createOkResponse(
  data: any,
  message?: string,
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
  message?: string,
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
  event: APIGatewayProxyEventV2,
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
  context?: string,
): Promise<any> => {
  try {
    logger.info(
      `🚀 Triggering sync Lambda invocation${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadKeys: Object.keys(payload),
        context,
      },
    );

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: InvocationType.RequestResponse, // Sync invocation
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);

    logger.info(
      `✅ Successfully completed sync Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadSize: JSON.stringify(payload).length,
        statusCode: response.StatusCode,
      },
    );

    // Parse and return the response payload if it exists
    if (response.Payload) {
      const responsePayload = JSON.parse(
        new TextDecoder().decode(response.Payload),
      );
      return responsePayload;
    }

    return null;
  } catch (error) {
    logger.error(
      `❌ Failed to invoke sync Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        error: error instanceof Error ? error.message : "Unknown error",
        context,
      },
    );

    // Re-throw to allow caller to handle the error appropriately
    throw new Error(
      `Failed to invoke sync Lambda ${functionName}: ${error instanceof Error ? error.message : "Unknown error"}`,
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
  context?: string,
): Promise<void> => {
  try {
    logger.info(
      `🚀 Triggering async Lambda invocation${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadKeys: Object.keys(payload),
        context,
      },
    );

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: InvocationType.Event, // Async invocation
      Payload: JSON.stringify(payload),
    });

    await lambdaClient.send(command);

    logger.info(
      `✅ Successfully triggered async Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        payloadSize: JSON.stringify(payload).length,
      },
    );
  } catch (error) {
    logger.error(
      `❌ Failed to trigger async Lambda${context ? ` for ${context}` : ""}:`,
      {
        functionName,
        error: error instanceof Error ? error.message : "Unknown error",
        context,
      },
    );

    // Re-throw to allow caller to handle the error appropriately
    throw new Error(
      `Failed to invoke async Lambda ${functionName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Get model-specific token limits related to max output tokens.
const getMaxTokensForModel = (modelId: string): number => {
  if (modelId.includes("nova-micro")) {
    return 8000; // Conservative limit for Nova Micro (for short contextual updates)
  } else if (modelId.includes("haiku")) {
    return MAX_TOKENS; // Claude Haiku 4 supports same max tokens as Sonnet for complex tasks
  }
  return MAX_TOKENS; // Default for Claude Sonnet models
};

/**
 * Check if a model ID is an Amazon Nova model.
 * Nova models support tool calling but not strict tool use schema enforcement.
 */
export const isNovaModel = (modelId: string): boolean => {
  return modelId.includes("amazon.nova");
};

/**
 * Check if a Nova model supports native reasoning via reasoningConfig.
 * Only Nova 2 and Nova Pro support native reasoning; Nova Lite does not.
 */
const isNovaReasoningCapableModel = (modelId: string): boolean => {
  return modelId.includes("nova-2") || modelId.includes("nova-pro");
};

/**
 * Build additional model request fields for Nova native reasoning
 * Centralizes reasoning configuration for all Bedrock API functions
 */
const buildNativeReasoningFields = (
  useNativeReasoning: boolean,
): Record<string, any> | undefined => {
  if (!useNativeReasoning) return undefined;
  return {
    additionalModelRequestFields: {
      reasoningConfig: {
        type: "enabled",
        maxReasoningEffort: "medium", // "low" | "medium" | "high"
      },
    },
  };
};

/**
 * Log AWS-specific error details for Bedrock API failures
 * Centralizes error logging pattern across all Bedrock functions
 */
const logAwsError = (error: any, context: string): void => {
  logger.error(`=== ${context} FAILED ===`);
  logger.error("Error type:", typeof error);
  logger.error("Error constructor:", error.constructor?.name);
  logger.error("Error message:", error.message);
  logger.error("Error stack:", error.stack);

  if (error.$fault) logger.error("AWS Fault:", error.$fault);
  if (error.$service) logger.error("AWS Service:", error.$service);
  if (error.$metadata) logger.error("AWS Metadata:", error.$metadata);
  if (error.Code) logger.error("AWS Error Code:", error.Code);
};

/**
 * Log Bedrock API call start with common details
 * Centralizes start logging pattern across all Bedrock functions
 */
interface BedrockCallLogDetails {
  modelId: string;
  temperature: number;
  systemPromptLength: number;
  enableThinking: boolean;
  useNativeReasoning: boolean;
  userMessageLength?: number;
  messagesCount?: number;
  hasImages?: boolean;
  toolsCount?: number;
  schemaName?: string;
}

const logBedrockCallStart = (
  context: string,
  details: BedrockCallLogDetails,
): void => {
  logger.info(`=== ${context} START ===`);
  logger.info("AWS Region:", process.env.AWS_REGION || "us-west-2");
  logger.info("Model ID:", details.modelId);
  logger.info("Temperature:", details.temperature);
  logger.info("System prompt length:", details.systemPromptLength);

  if (details.userMessageLength !== undefined) {
    logger.info("User message length:", details.userMessageLength);
  }
  if (details.messagesCount !== undefined) {
    logger.info("Messages count:", details.messagesCount);
  }
  if (details.toolsCount !== undefined) {
    logger.info("Tools count:", details.toolsCount);
  }

  logger.info("Thinking enabled:", details.enableThinking);
  logger.info("Use native reasoning (Nova):", details.useNativeReasoning);

  if (details.hasImages !== undefined) {
    logger.info("Has images:", details.hasImages);
  }
};

/**
 * Log Nova reasoning content if present in the response
 * Nova models return reasoning in a separate content block with reasoningContent
 */
const logNativeReasoningContent = (
  response: any,
  useNativeReasoning: boolean,
): void => {
  if (!useNativeReasoning || !response.output?.message?.content) return;

  const reasoningBlock = response.output.message.content.find(
    (c: any) => c.reasoningContent,
  );

  if (reasoningBlock) {
    const reasoningText = reasoningBlock.reasoningContent?.reasoningText?.text;
    const reasoningLength = reasoningText?.length ?? 0;
    logger.info("🧠 Nova reasoning extracted:", {
      reasoningLength,
      reasoningPreview:
        reasoningText?.substring(0, 200) + (reasoningLength > 200 ? "..." : ""),
    });
  }
};

/**
 * Extract text content from Bedrock response, handling Nova reasoning blocks
 * For Nova models with native reasoning, finds the text block (not reasoning block)
 * @returns The content item containing text, or undefined if not found
 */
const findTextContentItem = (
  response: any,
  useNativeReasoning: boolean,
): any => {
  if (!response.output?.message?.content?.[0]) {
    return undefined;
  }

  if (useNativeReasoning && response.output?.message?.content) {
    // Nova: find the text content block, skip reasoning blocks
    const textBlock = response.output.message.content.find(
      (c: any) => c.text !== undefined,
    );
    if (textBlock) {
      return textBlock;
    }
  }

  // Default: return first content item
  return response.output.message.content[0];
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
1. The user is asking for..
2. I need to consider..
3. The key challenges are..
4. My approach should be..
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
    "",
  );

  // Clean up any extra whitespace that might be left
  return withoutThinking.trim();
};

/**
 * Options for Bedrock API calls with caching and thinking support
 */
// Tool configuration for Bedrock tool use (schema enforcement)
export interface BedrockToolConfig {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema object
}

// Result when tool is used by the model
export interface BedrockToolUseResult {
  toolName: string;
  input: any;
  stopReason: string;
}

// Union type for Bedrock API results (text or tool use)
export type BedrockApiResult = string | BedrockToolUseResult;

export interface BedrockApiOptions {
  /** Enable extended thinking for complex reasoning (adds thinking tags to prompt) */
  enableThinking?: boolean;

  /** Static (cacheable) portion of the prompt - gets 90% cost discount on cache hits */
  staticPrompt?: string;

  /** Dynamic (non-cacheable) portion of the prompt - changes per request */
  dynamicPrompt?: string;

  /**
   * Prefill the assistant's response with this text to enforce output format
   * For JSON responses, use "{" to force Claude to start with JSON
   */
  prefillResponse?: string;

  // Tool enforcement support for schema-based generation
  /** Single tool or array of tools for schema enforcement */
  tools?: BedrockToolConfig | BedrockToolConfig[];

  /** Optional: validate which tool was used (throws error if mismatch) */
  expectedToolName?: string;

  /** Temperature for response generation (defaults to TEMPERATURE constant if not provided) */
  temperature?: number;

  /**
   * Beta features to enable for advanced schema handling
   * Example: ['tool-use-examples-2025-10-29'] for improved complex nested object accuracy
   */
  anthropicBeta?: string[];

  /**
   * Skip client-side ajv schema validation for this call.
   *
   * Set to true for large, complex schemas (generate_workout, normalize_workout,
   * generate_program_phase, generate_coach_config, etc.) that were historically exempt
   * from strict enforcement. The schema is still sent to the model as guidance;
   * malformed output is handled downstream by evaluator-optimizer patterns.
   *
   * Default: false (validation is on by default)
   */
  skipValidation?: boolean;
}

/**
 * Helper to build toolConfig for Bedrock commands
 * Centralizes tool handling logic for all Bedrock functions
 *
 * @param tools - Single tool or array of tools
 * @param enforceToolUse - If true and single tool provided, enforce its use with toolChoice
 *
 * strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
 */
function buildToolConfig(
  tools: BedrockToolConfig | BedrockToolConfig[],
  enforceToolUse: boolean = true,
): any {
  const toolsArray = Array.isArray(tools) ? tools : [tools];

  const config: any = {
    tools: toolsArray.map((t) => ({
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: {
          json: t.inputSchema,
        },
      },
    })),
  };

  // If enforcing tool use and exactly one tool provided, add toolChoice to force its use
  if (enforceToolUse && toolsArray.length === 1) {
    config.toolChoice = {
      tool: {
        name: toolsArray[0].name,
      },
    };
    logger.info(`🔒 Enforcing tool use: ${toolsArray[0].name}`);
  }

  return config;
}

/**
 * Helper to build toolConfig for agent Bedrock commands
 *
 * Similar to buildToolConfig but for multi-tool agents:
 * - Never enforces single-tool use (no toolChoice)
 * - Supports optional cache point injection after tools
 *
 * Used by callBedrockApiForAgent and callBedrockApiStreamForAgent.
 *
 * strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
 */
function buildToolConfigForAgent(
  tools: BedrockToolConfig[],
  useCaching: boolean = false,
): any {
  const toolSpecs = tools.map((t) => ({
    toolSpec: {
      name: t.name,
      description: t.description,
      inputSchema: {
        json: t.inputSchema,
      },
    },
  }));

  return {
    tools: useCaching
      ? [...toolSpecs, { cachePoint: { type: "default" } } as any]
      : toolSpecs,
  };
}

/**
 * Helper to extract tool use result from Bedrock response
 * Returns BedrockToolUseResult or throws if tool wasn't used
 *
 * @param response - Full Bedrock converse response
 * @param expectedToolName - If provided, throws if a different tool was called
 * @param tools - Tool config(s) used for this call; when provided, the response is validated
 *                against the matching tool's inputSchema (client-side enforcement replacing strict mode)
 */
export function extractToolUseResult(
  response: any,
  expectedToolName?: string,
  tools?: BedrockToolConfig | BedrockToolConfig[],
  skipValidation?: boolean,
): BedrockToolUseResult {
  // Debug: Log the incoming response structure
  const content = response.output?.message?.content;
  logger.info("🔍 extractToolUseResult DEBUG:", {
    stopReason: response.stopReason,
    hasOutput: !!response.output,
    hasMessage: !!response.output?.message,
    hasContent: !!content,
    contentIsArray: Array.isArray(content),
    contentLength: Array.isArray(content) ? content.length : "N/A",
    contentTypes: Array.isArray(content)
      ? content.map((c: any) => Object.keys(c || {}).join(","))
      : "N/A",
    expectedToolName,
  });

  if (response.stopReason !== "tool_use") {
    throw new Error(
      `Model did not use tool (stopReason: ${response.stopReason})`,
    );
  }

  const toolUse = response.output?.message?.content?.find(
    (c: any) => c.toolUse,
  );

  if (!toolUse) {
    // Enhanced debug logging when tool use not found
    logger.error("🔍 extractToolUseResult FAILURE DEBUG:", {
      contentItems: Array.isArray(content)
        ? content.map((c: any, i: number) => ({
            index: i,
            keys: Object.keys(c || {}),
            hasToolUse: !!c?.toolUse,
            hasText: !!c?.text,
            textPreview: c?.text?.substring?.(0, 100),
          }))
        : "content is not an array",
      rawContent: JSON.stringify(content)?.substring(0, 500),
    });
    throw new Error("No tool use found in response");
  }

  const result: BedrockToolUseResult = {
    toolName: toolUse.toolUse.name,
    input: toolUse.toolUse.input,
    stopReason: response.stopReason,
  };

  // Detect double-encoding at the source (before any processing)
  // This helps identify if Bedrock is returning stringified objects
  const inputAnalysis = Object.entries(result.input || {}).reduce(
    (acc, [key, value]) => {
      if (
        typeof value === "string" &&
        (value.startsWith("{") || value.startsWith("["))
      ) {
        acc.stringifiedFields.push(key);
        if (!acc.sampleStringifiedValue && value.length > 0) {
          acc.sampleStringifiedValue = {
            key,
            preview: value.substring(0, 150),
          };
        }
      } else if (typeof value === "object" && value !== null) {
        acc.objectFields.push(key);
      }
      return acc;
    },
    {
      stringifiedFields: [] as string[],
      objectFields: [] as string[],
      sampleStringifiedValue: null as { key: string; preview: string } | null,
    },
  );

  if (inputAnalysis.stringifiedFields.length > 0) {
    logger.warn("⚠️ DOUBLE-ENCODING DETECTED IN BEDROCK RESPONSE:", {
      toolName: result.toolName,
      stringifiedFields: inputAnalysis.stringifiedFields,
      objectFields: inputAnalysis.objectFields,
      sampleStringifiedValue: inputAnalysis.sampleStringifiedValue,
      note: "These fields were returned as JSON strings instead of objects by Bedrock",
    });
  }

  logger.info("✅ extractToolUseResult SUCCESS:", {
    toolName: result.toolName,
    inputKeys: Object.keys(result.input || {}),
    inputTypes: Object.entries(result.input || {}).reduce(
      (acc, [k, v]) => {
        acc[k] = Array.isArray(v) ? "array" : typeof v;
        return acc;
      },
      {} as Record<string, string>,
    ),
  });

  // Optional validation
  if (expectedToolName && result.toolName !== expectedToolName) {
    throw new Error(
      `Expected tool "${expectedToolName}" but model used "${result.toolName}"`,
    );
  }

  // Client-side schema validation (replaces server-side strict mode)
  // skipValidation: true bypasses this for large-schema tools whose output is cleaned
  // downstream by evaluator-optimizer patterns (generate_workout, normalize_workout, etc.)
  if (tools && result.input && !skipValidation) {
    const toolsArray = Array.isArray(tools) ? tools : [tools];
    const matchingTool = toolsArray.find((t) => t.name === result.toolName);
    if (matchingTool?.inputSchema) {
      try {
        validateToolResponse(
          result.toolName,
          result.input,
          matchingTool.inputSchema,
        );
      } catch (validationError: any) {
        logger.warn("⚠️ Tool response schema validation failed:", {
          toolName: result.toolName,
          error: validationError.message,
        });
        throw validationError;
      }
    }
  } else if (skipValidation && tools) {
    logger.info("⏭️ Skipping schema validation (skipValidation: true):", {
      toolName: result.toolName,
    });
  }

  return result;
}

/**
 * Builds system parameters with cache control and optional thinking support
 * Centralizes the logic for all Bedrock API functions
 *
 * @param systemPrompt - Base system prompt
 * @param options - Optional BedrockApiOptions with caching and thinking flags
 * @param modelId - Optional model ID to determine thinking strategy (Nova uses native reasoning)
 * @returns Object with systemParams array, enableThinking flag, and useNativeReasoning flag
 */
function buildSystemParams(
  systemPrompt: string,
  options?: BedrockApiOptions,
  modelId?: string,
): {
  systemParams: any[];
  enableThinking: boolean;
  useNativeReasoning: boolean;
} {
  const enableThinking = options?.enableThinking || false;
  // Nova 2 / Nova Pro use native reasoningConfig instead of prompt-based thinking tags
  const useNativeReasoning =
    enableThinking && modelId ? isNovaReasoningCapableModel(modelId) : false;
  // Only apply prompt-based thinking for non-Nova models
  const applyPromptThinking = enableThinking && !useNativeReasoning;

  // Handle empty system prompt (Bedrock requires non-empty text)
  if (!systemPrompt || systemPrompt.trim() === "") {
    logger.info("ℹ️ No system prompt provided, skipping system parameter");
    return {
      systemParams: [],
      enableThinking: false, // No thinking without system context
      useNativeReasoning: false,
    };
  }

  // Build system parameter with cache control if static/dynamic prompts are provided
  if (options?.staticPrompt && options?.dynamicPrompt) {
    logger.info("🔥 CACHE OPTIMIZATION: Using static/dynamic prompt structure");
    logger.info(
      "Static prompt size:",
      (options.staticPrompt.length / 1024).toFixed(2),
      "KB",
    );
    logger.info(
      "Dynamic prompt size:",
      (options.dynamicPrompt.length / 1024).toFixed(2),
      "KB",
    );

    // Apply prompt-based thinking to static prompt only for non-Nova models
    const baseStaticPrompt = applyPromptThinking
      ? enhancePromptForThinking(options.staticPrompt)
      : options.staticPrompt;

    return {
      systemParams: [
        {
          text: baseStaticPrompt, // Static content (with thinking if enabled for Claude)
        },
        {
          cachePoint: { type: "default" }, // Cache marker (separate object)
        },
        {
          text: options.dynamicPrompt, // Dynamic content (not cached)
        },
      ],
      enableThinking,
      useNativeReasoning,
    };
  }

  // Fallback: Use single system prompt (no caching)
  return {
    systemParams: [
      {
        text: applyPromptThinking
          ? enhancePromptForThinking(systemPrompt)
          : systemPrompt,
      },
    ],
    enableThinking,
    useNativeReasoning,
  };
}

/**
 * Helper function to log cache performance metrics from Bedrock response
 */
function logCachePerformance(usage: any, context: string = "API call") {
  if (!usage) {
    logger.warn(`⚠️ No usage data available for ${context}`);
    return;
  }

  const inputTokens = usage.inputTokens || 0;
  const cacheReadTokens = usage.cacheReadInputTokens || 0;
  const cacheCreateTokens = usage.cacheCreationInputTokens || 0;
  const outputTokens = usage.outputTokens || 0;

  // Calculate cache hit rate
  const totalCacheableTokens = cacheReadTokens + cacheCreateTokens;
  const cacheHitRate =
    totalCacheableTokens > 0
      ? ((cacheReadTokens / totalCacheableTokens) * 100).toFixed(1)
      : "0.0";

  // Calculate cost savings (approximate)
  // Normal: $3/1M tokens, Cached read: $0.30/1M tokens (90% discount), Cache creation: $3.75/1M tokens (25% markup)
  const normalCost = inputTokens * 0.000003; // $3 per 1M tokens
  const cachedCost = cacheReadTokens * 0.0000003; // $0.30 per 1M tokens
  const creationCost = cacheCreateTokens * 0.00000375; // $3.75 per 1M tokens
  const actualCost =
    cachedCost +
    creationCost +
    (inputTokens - cacheReadTokens - cacheCreateTokens) * 0.000003;
  const savings = normalCost - actualCost;

  logger.info("💰 CACHE PERFORMANCE:", {
    context,
    inputTokens,
    outputTokens,
    cacheRead: cacheReadTokens,
    cacheCreated: cacheCreateTokens,
    cacheHitRate: `${cacheHitRate}%`,
    costs: {
      withoutCache: `$${normalCost.toFixed(6)}`,
      withCache: `$${actualCost.toFixed(6)}`,
      saved: `$${savings.toFixed(6)} (${savings > 0 ? ((savings / normalCost) * 100).toFixed(1) : 0}%)`,
    },
  });
}

// Amazon Bedrock Converse API call with optional thinking capabilities and tool support
export const callBedrockApi = async (
  systemPrompt: string,
  userMessage: string = "Please proceed.",
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options?: BedrockApiOptions,
): Promise<BedrockApiResult> => {
  try {
    // Build system parameters with cache control and thinking support
    const { systemParams, enableThinking, useNativeReasoning } =
      buildSystemParams(systemPrompt, options, modelId);

    // Use default message if empty string provided
    const effectiveUserMessage = userMessage.trim() || "Please proceed.";

    const finalTemperature =
      options?.temperature ?? TEMPERATURE_PRESETS.BALANCED;

    logBedrockCallStart("BEDROCK API CALL", {
      modelId,
      temperature: finalTemperature,
      systemPromptLength: systemPrompt.length,
      userMessageLength: effectiveUserMessage.length,
      enableThinking,
      useNativeReasoning,
    });

    // Build messages array with optional response prefilling
    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            text: effectiveUserMessage,
          },
        ],
      },
    ];

    // Add prefilled assistant response if specified (forces output format)
    if (options?.prefillResponse) {
      messages.push({
        role: "assistant",
        content: [
          {
            text: options.prefillResponse,
          },
        ],
      });
      logger.info("🎯 Response prefilling enabled:", options.prefillResponse);
    }

    const command = new ConverseCommand({
      modelId: modelId,
      messages: messages,
      ...(systemParams.length > 0 && { system: systemParams }), // Only include if not empty
      ...(options?.tools && {
        toolConfig: buildToolConfig(options.tools, true),
      }), // strict mode removed — schema enforced via additionalProperties, required, and enum constraints
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: finalTemperature,
      },
      ...buildNativeReasoningFields(useNativeReasoning),
      // Add beta headers for advanced schema features if specified
      ...(options?.anthropicBeta && {
        additionalModelRequestFields: {
          anthropic_beta: options.anthropicBeta,
        },
      }),
    });

    logger.info("Converse command created successfully..");
    logger.info("About to call bedrockClient.send()...");

    // Add heartbeat logging to track if Lambda is still running
    const heartbeatInterval = setInterval(() => {
      logger.info(
        "HEARTBEAT: Lambda still running, waiting for Bedrock response..",
      );
    }, 5000);

    // Add explicit error handling around the send call with timeout
    let response;

    try {
      logger.info("Starting Bedrock API call with 60s timeout..");

      // Simple approach: just make the API call and let AWS SDK handle timeouts
      response = await bedrockClient.send(command);

      clearInterval(heartbeatInterval);
      logger.info("bedrockClient.send() completed successfully");
    } catch (sendError: any) {
      clearInterval(heartbeatInterval);
      logger.error(
        "SEND ERROR - Error calling bedrockClient.send():",
        sendError,
      );
      logger.error("SEND ERROR - Error name:", sendError.name);
      logger.error("SEND ERROR - Error message:", sendError.message);
      logger.error("SEND ERROR - Error stack:", sendError.stack);
      if (sendError.$metadata) {
        logger.error("SEND ERROR - AWS metadata:", sendError.$metadata);
      }
      throw sendError;
    }

    logger.info("Response received from Bedrock");
    logger.info("Response metadata:", response.$metadata);

    // Log response structure without full content to avoid token waste
    logger.info("Response structure:", {
      hasOutput: !!response.output,
      hasMessage: !!response.output?.message,
      hasContent: !!response.output?.message?.content,
      contentLength: response.output?.message?.content?.length || 0,
      hasText: !!response.output?.message?.content?.[0]?.text,
      textType: typeof response.output?.message?.content?.[0]?.text,
      contentFirstItem: response.output?.message?.content?.[0], // Log full first item
    });

    // Log Nova reasoning content if present
    logNativeReasoningContent(response, useNativeReasoning);

    if (!response.output?.message?.content?.[0]) {
      logger.error(
        "Invalid response structure - no content[0]:",
        JSON.stringify(response, null, 2),
      );
      throw new Error("Invalid response format from Bedrock - no content");
    }

    // If tools were provided, extract tool use result FIRST (before trying to extract text)
    // Tool responses have a different structure than text responses
    if (options?.tools) {
      logger.info("🔧 Tool use requested, extracting tool result");

      // Try to extract tool use, but gracefully handle text responses
      if (response.stopReason === "tool_use") {
        return extractToolUseResult(
          response,
          options.expectedToolName,
          options.tools,
          options.skipValidation,
        );
      } else {
        // Model returned text instead of using tool - try to parse as JSON
        logger.warn(
          "⚠️ Tool was requested but model returned text response, attempting to parse as JSON",
        );
        const contentItem = response.output.message.content[0];
        const textContent =
          typeof contentItem === "string" ? contentItem : contentItem.text;

        if (textContent) {
          // Try to parse the text as JSON with graceful error handling
          try {
            const parsed = parseJsonWithFallbacks(textContent);
            if (parsed && typeof parsed === "object") {
              logger.info("✅ Successfully parsed text response as JSON");
              // Return in tool use format for consistency
              return {
                toolName: options.expectedToolName ?? "unknown",
                input: parsed,
                stopReason: response.stopReason ?? "end_turn",
              };
            }
          } catch (parseError) {
            // Parsing failed - this is expected for conversational text responses
            logger.info(
              "ℹ️ Text response is not JSON (likely conversational response), using empty object",
            );
          }
        }

        // If we can't parse as JSON, return empty object
        logger.info("ℹ️ Returning empty tool input (non-JSON text response)");
        return {
          toolName: options.expectedToolName ?? "unknown",
          input: {},
          stopReason: response.stopReason ?? "end_turn",
        };
      }
    }

    // Extract the raw response text - handle both direct text and nested structures
    // For Nova models with reasoning, find the text content block (not the reasoning block)
    const contentItem = findTextContentItem(response, useNativeReasoning);
    let rawResponseText: any;

    // Check if text is nested or direct
    if (typeof contentItem === "string") {
      rawResponseText = contentItem;
    } else if (contentItem?.text !== undefined) {
      rawResponseText = contentItem.text;

      // Verify contentItem.text is actually a string
      if (typeof rawResponseText !== "string") {
        logger.error("❌ contentItem.text exists but is not a string:", {
          textType: typeof rawResponseText,
          textValue: rawResponseText,
          textKeys:
            typeof rawResponseText === "object"
              ? Object.keys(rawResponseText)
              : "N/A",
          fullContentItem: contentItem,
          stringified: JSON.stringify(contentItem, null, 2),
        });
        throw new Error(
          `Invalid response format from Bedrock - contentItem.text is ${typeof rawResponseText}, not string`,
        );
      }
    } else if (typeof contentItem === "object") {
      // If it's an object but no .text property, log the structure
      logger.error("❌ Content item is an object without .text property:", {
        contentItem,
        keys: Object.keys(contentItem),
        stringified: JSON.stringify(contentItem, null, 2),
      });
      throw new Error(
        "Invalid response format from Bedrock - content item has no text property",
      );
    } else {
      logger.error("❌ Unexpected content item type:", {
        type: typeof contentItem,
        value: contentItem,
      });
      throw new Error(
        "Invalid response format from Bedrock - unexpected content type",
      );
    }

    // Final type check: ensure we have a string at this point
    if (typeof rawResponseText !== "string") {
      logger.error("❌ rawResponseText is not a string after extraction:", {
        type: typeof rawResponseText,
        value: rawResponseText,
        stringified: JSON.stringify(rawResponseText, null, 2),
      });
      throw new Error(
        `Invalid response type from Bedrock: expected string, got ${typeof rawResponseText}`,
      );
    }

    let responseText = rawResponseText;

    // If response was prefilled, prepend the prefill text back
    if (options?.prefillResponse) {
      responseText = options.prefillResponse + responseText;
      logger.info("🎯 Prepended prefill text to response:", {
        prefillText: options.prefillResponse,
        originalLength: rawResponseText.length,
        newLength: responseText.length,
      });
    }

    // If thinking was enabled, extract the final response (strip thinking tags)
    if (enableThinking) {
      responseText = stripThinkingTags(responseText);
    }

    logger.info(
      "Successfully extracted response text, length:",
      responseText.length,
    );

    // Check if response might be truncated due to token limits
    const maxTokensUsed = getMaxTokensForModel(modelId);
    if (responseText.length > maxTokensUsed * 3) {
      // Rough estimate: 1 token ≈ 3-4 chars
      logger.warn(
        "⚠️ Response length suggests possible token limit truncation:",
        {
          responseLength: responseText.length,
          maxTokens: maxTokensUsed,
          estimatedTokens: Math.round(responseText.length / 3.5),
        },
      );
    }

    logger.info("=== BEDROCK API CALL SUCCESS ===");

    // Return text response
    return responseText;
  } catch (error: any) {
    logAwsError(error, "BEDROCK API CALL");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Bedrock API failed: ${errorMessage}`);
  }
};

// Amazon Bedrock Converse Stream API call for real-time streaming responses
export const callBedrockApiStream = async (
  systemPrompt: string,
  userMessage: string,
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options?: BedrockApiOptions,
): Promise<AsyncGenerator<string, void, unknown>> => {
  try {
    // Build system parameters with cache control and thinking support
    const { systemParams, enableThinking, useNativeReasoning } =
      buildSystemParams(systemPrompt, options, modelId);

    const finalTemperature =
      options?.temperature ?? TEMPERATURE_PRESETS.BALANCED;

    logBedrockCallStart("BEDROCK STREAMING API CALL", {
      modelId,
      temperature: finalTemperature,
      systemPromptLength: systemPrompt.length,
      userMessageLength: userMessage.length,
      enableThinking,
      useNativeReasoning,
    });

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
      system: systemParams,
      ...(options?.tools && {
        toolConfig: buildToolConfig(options.tools, true),
      }), // strict mode removed — schema enforced via additionalProperties, required, and enum constraints
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: finalTemperature,
      },
      ...buildNativeReasoningFields(useNativeReasoning),
      // Add beta headers for advanced schema features if specified
      ...(options?.anthropicBeta && {
        additionalModelRequestFields: {
          anthropic_beta: options.anthropicBeta,
        },
      }),
    });

    logger.info("Converse stream command created successfully..");

    const response = await bedrockClient.send(command);

    if (!response.stream) {
      throw new Error("No stream received from Bedrock");
    }

    logger.info("Stream response received from Bedrock");

    // Return an async generator that yields chunks as they come in
    return (async function* streamGenerator() {
      try {
        let fullResponse = "";
        let reasoningLength = 0;

        for await (const chunk of response.stream!) {
          // Handle Nova reasoning content (log but don't yield to user)
          if (
            useNativeReasoning &&
            (chunk as any).contentBlockDelta?.delta?.reasoningContent
          ) {
            const reasoningText = (chunk as any).contentBlockDelta.delta
              .reasoningContent?.text;
            if (reasoningText) {
              reasoningLength += reasoningText.length;
            }
          }

          if (chunk.contentBlockDelta?.delta?.text) {
            const deltaText = chunk.contentBlockDelta.delta.text;
            fullResponse += deltaText;
            yield deltaText;
          }

          // Handle end of stream
          if (chunk.messageStop) {
            logger.info("=== BEDROCK STREAMING API CALL SUCCESS ===");
            logger.info(
              "Stream complete. Total response length:",
              fullResponse.length,
            );
            if (useNativeReasoning && reasoningLength > 0) {
              logger.info(
                "🧠 Nova reasoning received during stream, length:",
                reasoningLength,
              );
            }

            // If thinking was enabled, we need to handle the thinking tags in the full response
            // For streaming, we'll yield the raw content and let the client handle thinking tag removal if needed
            break;
          }
        }
      } catch (streamError: any) {
        logger.error("Error processing stream:", streamError);
        throw streamError;
      }
    })();
  } catch (error: any) {
    logAwsError(error, "BEDROCK STREAMING API CALL");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Bedrock Streaming API failed: ${errorMessage}`);
  }
};

/**
 * Amazon Bedrock Converse API call with multimodal content support (text + images) and tool support
 * Use this when you need to pass a full messages array with image content blocks
 *
 * @param systemPrompt - System prompt to set AI behavior
 * @param messages - Full Converse API messages array (e.g., from buildMultimodalContent)
 * @param modelId - Model ID to use (defaults to Claude Sonnet 4)
 * @param options - Optional parameters including staticPrompt, dynamicPrompt for caching, and tools
 * @returns Promise with AI response text or BedrockToolUseResult if tools provided
 */
export const callBedrockApiMultimodal = async (
  systemPrompt: string,
  messages: any[], // Full Converse API messages array with images
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options?: BedrockApiOptions,
): Promise<BedrockApiResult> => {
  try {
    // Build system parameters with cache control and thinking support
    const { systemParams, enableThinking, useNativeReasoning } =
      buildSystemParams(systemPrompt, options, modelId);

    const finalTemperature =
      options?.temperature ?? TEMPERATURE_PRESETS.BALANCED;

    const hasImages = messages.some((m) =>
      m.content?.some((c: any) => c.image),
    );

    logBedrockCallStart("BEDROCK MULTIMODAL API CALL", {
      modelId,
      temperature: finalTemperature,
      systemPromptLength: systemPrompt.length,
      messagesCount: messages.length,
      enableThinking,
      useNativeReasoning,
      hasImages,
    });

    const command = new ConverseCommand({
      modelId: modelId,
      messages: messages,
      system: systemParams,
      ...(options?.tools && {
        toolConfig: buildToolConfig(options.tools, true),
      }), // strict mode removed — schema enforced via additionalProperties, required, and enum constraints
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: finalTemperature,
      },
      ...buildNativeReasoningFields(useNativeReasoning),
      // Add beta headers for advanced schema features if specified
      ...(options?.anthropicBeta && {
        additionalModelRequestFields: {
          anthropic_beta: options.anthropicBeta,
        },
      }),
    });

    logger.info("Multimodal converse command created successfully..");

    const response = await bedrockClient.send(command);

    logger.info("Response received from Bedrock");
    logger.info("Response metadata:", response.$metadata);

    // Log cache performance metrics if available
    if (response.usage) {
      logCachePerformance(response.usage, "Multimodal API");
    }

    // Log Nova reasoning content if present
    logNativeReasoningContent(response, useNativeReasoning);

    // If tools were provided, extract tool use result FIRST (before trying to extract text)
    // Tool responses have a different structure than text responses
    if (options?.tools) {
      logger.info("🔧 Tool use requested (multimodal), extracting tool result");

      // Try to extract tool use, but gracefully handle text responses
      if (response.stopReason === "tool_use") {
        return extractToolUseResult(
          response,
          options.expectedToolName,
          options.tools,
          options.skipValidation,
        );
      } else {
        // Model returned text instead of using tool - try to parse as JSON
        logger.warn(
          "⚠️ Tool was requested but model returned text response (multimodal), attempting to parse as JSON",
        );
        const contentItem = findTextContentItem(response, useNativeReasoning);
        const textContent =
          typeof contentItem === "string" ? contentItem : contentItem?.text;

        if (textContent) {
          // Try to parse the text as JSON with graceful error handling
          try {
            const parsed = parseJsonWithFallbacks(textContent);
            if (parsed && typeof parsed === "object") {
              logger.info(
                "✅ Successfully parsed text response as JSON (multimodal)",
              );
              // Return in tool use format for consistency
              return {
                toolName: options.expectedToolName ?? "unknown",
                input: parsed,
                stopReason: response.stopReason ?? "end_turn",
              };
            }
          } catch (parseError) {
            // Parsing failed - this is expected for conversational text responses
            logger.info(
              "ℹ️ Text response is not JSON (likely conversational response), using empty object",
            );
          }
        }

        // If we can't parse as JSON, return empty object
        logger.info(
          "ℹ️ Returning empty tool input (multimodal non-JSON text response)",
        );
        return {
          toolName: options.expectedToolName ?? "unknown",
          input: {},
          stopReason: response.stopReason ?? "end_turn",
        };
      }
    }

    // Otherwise extract text as usual (handling Nova reasoning blocks)
    const contentItem = findTextContentItem(response, useNativeReasoning);
    if (!contentItem) {
      logger.error(
        "Invalid response structure - no content found:",
        JSON.stringify(response, null, 2),
      );
      throw new Error("Invalid response format from Bedrock");
    }

    const responseText =
      typeof contentItem === "string" ? contentItem : contentItem.text;

    if (!responseText) {
      logger.error(
        "Invalid response structure - no text in content:",
        JSON.stringify(response, null, 2),
      );
      throw new Error("Invalid response format from Bedrock - no text");
    }

    logger.info(
      "Successfully extracted response text, length:",
      responseText.length,
    );
    logger.info("=== BEDROCK MULTIMODAL API CALL SUCCESS ===");

    return responseText;
  } catch (error: any) {
    logAwsError(error, "BEDROCK MULTIMODAL API CALL");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Bedrock Multimodal API failed: ${errorMessage}`);
  }
};

// ─── JSON Schema Output Format helpers ───────────────────────────────────────
//
// Use these for DATA EXTRACTION tasks (normalization, todo extraction, config
// generation). The `outputConfig.textFormat` approach is the architecturally
// correct choice for extraction pipelines: no grammar size limits, same 24-hour
// grammar cache as strict tool use, and the model returns JSON directly in the
// text content block.
//
// Use callBedrockApi with tools+strict for AGENTIC tool calls (validating
// function parameters before calling external systems).
// ─────────────────────────────────────────────────────────────────────────────

export interface JsonOutputOptions {
  /** Identifier used for logging and grammar cache keying */
  schemaName: string;
  /** JSON Schema definition object -- must satisfy Bedrock Draft 2020-12 subset */
  schema: Record<string, unknown>;
  temperature?: number;
  staticPrompt?: string;
  dynamicPrompt?: string;
  enableThinking?: boolean;
}

/**
 * Bedrock Converse API call using JSON Schema output format.
 *
 * Constructs the request with `outputConfig.textFormat` instead of `toolConfig`,
 * then parses the JSON text response. Use this for extraction and normalization
 * tasks whose schemas are too large for strict tool use grammar compilation.
 */
export const callBedrockApiWithJsonOutput = async (
  systemPrompt: string,
  userMessage: string,
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options: JsonOutputOptions,
): Promise<Record<string, unknown>> => {
  try {
    const { systemParams, enableThinking, useNativeReasoning } =
      buildSystemParams(systemPrompt, options as any, modelId);

    const finalTemperature =
      options.temperature ?? TEMPERATURE_PRESETS.STRUCTURED;

    logBedrockCallStart("BEDROCK JSON OUTPUT API CALL", {
      modelId,
      schemaName: options.schemaName,
      temperature: finalTemperature,
      systemPromptLength: systemPrompt.length,
      userMessageLength: userMessage.length,
      enableThinking,
      useNativeReasoning,
    });

    const effectiveUserMessage = userMessage.trim() || "Please proceed.";

    const command = new ConverseCommand({
      modelId,
      messages: [
        {
          role: "user",
          content: [{ text: effectiveUserMessage }],
        },
      ],
      ...(systemParams.length > 0 && { system: systemParams }),
      outputConfig: {
        textFormat: {
          type: OutputFormatType.JSON_SCHEMA,
          structure: {
            jsonSchema: {
              schema: JSON.stringify(options.schema),
              name: options.schemaName,
            },
          },
        },
      },
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: finalTemperature,
      },
      ...buildNativeReasoningFields(useNativeReasoning),
    });

    const heartbeatInterval = setInterval(() => {
      logger.info(
        "HEARTBEAT: JSON output call still running, waiting for Bedrock response..",
      );
    }, 5000);

    let response;
    try {
      response = await bedrockClient.send(command);
      clearInterval(heartbeatInterval);
    } catch (sendError) {
      clearInterval(heartbeatInterval);
      throw sendError;
    }

    if (response.usage) {
      logCachePerformance(response.usage, "JSON Output API");
    }

    const contentItem = response.output?.message?.content?.[0];
    if (!contentItem) {
      throw new Error(
        "Invalid response format from Bedrock JSON output -- no content",
      );
    }

    const rawText =
      typeof contentItem === "string" ? contentItem : (contentItem as any).text;
    if (!rawText) {
      throw new Error(
        "Invalid response format from Bedrock JSON output -- no text",
      );
    }

    logger.info("JSON output response received, parsing...", {
      schemaName: options.schemaName,
      textLength: rawText.length,
    });

    const parsed = parseJsonWithFallbacks(rawText);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        `Failed to parse JSON output response for schema: ${options.schemaName}`,
      );
    }

    logger.info("JSON output parsed successfully", {
      schemaName: options.schemaName,
    });
    return parsed as Record<string, unknown>;
  } catch (error: any) {
    logAwsError(error, "BEDROCK JSON OUTPUT API CALL");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Bedrock JSON Output API failed: ${errorMessage}`);
  }
};

/**
 * Multimodal variant of callBedrockApiWithJsonOutput.
 * Use when the extraction input includes images (e.g. workout photos).
 */
export const callBedrockApiMultimodalWithJsonOutput = async (
  systemPrompt: string,
  messages: any[],
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options: JsonOutputOptions,
): Promise<Record<string, unknown>> => {
  try {
    const { systemParams, enableThinking, useNativeReasoning } =
      buildSystemParams(systemPrompt, options as any, modelId);

    const finalTemperature =
      options.temperature ?? TEMPERATURE_PRESETS.STRUCTURED;

    const hasImages = messages.some((m) =>
      m.content?.some((c: any) => c.image),
    );

    logBedrockCallStart("BEDROCK MULTIMODAL JSON OUTPUT API CALL", {
      modelId,
      schemaName: options.schemaName,
      temperature: finalTemperature,
      systemPromptLength: systemPrompt.length,
      messagesCount: messages.length,
      enableThinking,
      useNativeReasoning,
      hasImages,
    });

    const command = new ConverseCommand({
      modelId,
      messages,
      system: systemParams,
      outputConfig: {
        textFormat: {
          type: OutputFormatType.JSON_SCHEMA,
          structure: {
            jsonSchema: {
              schema: JSON.stringify(options.schema),
              name: options.schemaName,
            },
          },
        },
      },
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: finalTemperature,
      },
      ...buildNativeReasoningFields(useNativeReasoning),
    });

    const response = await bedrockClient.send(command);

    if (response.usage) {
      logCachePerformance(response.usage, "Multimodal JSON Output API");
    }

    const contentItem = response.output?.message?.content?.[0];
    if (!contentItem) {
      throw new Error(
        "Invalid response format from Bedrock multimodal JSON output -- no content",
      );
    }

    const rawText =
      typeof contentItem === "string" ? contentItem : (contentItem as any).text;
    if (!rawText) {
      throw new Error(
        "Invalid response format from Bedrock multimodal JSON output -- no text",
      );
    }

    logger.info("Multimodal JSON output response received, parsing...", {
      schemaName: options.schemaName,
      textLength: rawText.length,
    });

    const parsed = parseJsonWithFallbacks(rawText);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        `Failed to parse multimodal JSON output response for schema: ${options.schemaName}`,
      );
    }

    logger.info("Multimodal JSON output parsed successfully", {
      schemaName: options.schemaName,
    });
    return parsed as Record<string, unknown>;
  } catch (error: any) {
    logAwsError(error, "BEDROCK MULTIMODAL JSON OUTPUT API CALL");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Bedrock Multimodal JSON Output API failed: ${errorMessage}`,
    );
  }
};

/**
 * Agent-optimized Bedrock call with full response and caching
 * Returns raw Bedrock response for conversation loop management
 *
 * Differences from callBedrockApiMultimodal:
 * - Returns full ConverseCommand response (not processed result)
 * - Designed for multi-turn agent conversations
 * - Supports static/dynamic prompt caching
 * - Adds cache point after tools
 *
 * @param systemPrompt - System prompt (or staticPrompt if using caching)
 * @param messages - Agent conversation history
 * @param tools - Array of tool configurations
 * @param modelId - Model ID to use (defaults to Claude Sonnet 4)
 * @param options - Optional caching and thinking configuration
 * @returns Promise with full Bedrock response for agent loop
 */
export const callBedrockApiForAgent = async (
  systemPrompt: string,
  messages: any[],
  tools: BedrockToolConfig[],
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options?: {
    staticPrompt?: string;
    dynamicPrompt?: string;
    enableThinking?: boolean;
    anthropicBeta?: string[];
  },
): Promise<any> => {
  const finalTemperature =
    (options as any)?.temperature ?? TEMPERATURE_PRESETS.BALANCED;

  // Build system parameters with caching support
  const { systemParams, useNativeReasoning } = buildSystemParams(
    systemPrompt,
    options,
    modelId,
  );

  logBedrockCallStart("BEDROCK AGENT API CALL", {
    modelId,
    temperature: finalTemperature,
    systemPromptLength: systemPrompt.length,
    messagesCount: messages.length,
    toolsCount: tools.length,
    enableThinking: options?.enableThinking ?? false,
    useNativeReasoning,
  });

  const useCaching = !!(options?.staticPrompt && options?.dynamicPrompt);
  logger.info("Caching enabled:", useCaching);

  if (useCaching) {
    logger.info("🔥 AGENT CACHE OPTIMIZATION: Adding cache point after tools");
  }

  // strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
  const toolConfig = buildToolConfigForAgent(tools, useCaching);

  const command = new ConverseCommand({
    modelId: modelId,
    messages: messages,
    system: systemParams,
    toolConfig: toolConfig as any, // Type assertion needed for cache point support
    inferenceConfig: {
      maxTokens: getMaxTokensForModel(modelId),
      temperature: finalTemperature,
      // Note: Claude uses prompt-based thinking via buildSystemParams/enhancePromptForThinking
    },
    ...buildNativeReasoningFields(useNativeReasoning),
    // Add beta headers for advanced schema features if specified
    ...(options?.anthropicBeta && {
      additionalModelRequestFields: {
        anthropic_beta: options.anthropicBeta,
      },
    }),
  });

  // Safety net: abort after 180s to prevent indefinite hangs that silently
  // consume the entire Lambda timeout. Normal agent iterations complete in ~18s;
  // the most complex tool-level calls take ~156s.
  const AGENT_CALL_TIMEOUT_MS = 180_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AGENT_CALL_TIMEOUT_MS);

  let response;
  try {
    response = await bedrockClient.send(command, {
      abortSignal: controller.signal,
    });
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(
        `Bedrock agent API call timed out after ${AGENT_CALL_TIMEOUT_MS / 1000}s. ` +
          `This may indicate excessive conversation context size. ` +
          `Messages: ${messages.length}, Model: ${modelId}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  // Log cache performance if usage data available
  if (response.usage) {
    logCachePerformance(response.usage, "Agent API");
  }

  // Log Nova reasoning content if present (for observability, caller handles extraction)
  logNativeReasoningContent(response, useNativeReasoning);

  logger.info("=== BEDROCK AGENT API CALL SUCCESS ===");
  logger.info("Stop reason:", response.stopReason);
  logger.info("Input tokens:", response.usage?.inputTokens);
  logger.info("Output tokens:", response.usage?.outputTokens);

  return response; // Return full response for agent loop
};

/**
 * Amazon Bedrock Converse Stream API call for streaming agents with tool support
 *
 * Streams text deltas and parses tool_use blocks as they arrive, yielding StreamAgentEvent
 * discriminated unions. Used by StreamingConversationAgent to implement the streaming ReAct loop.
 *
 * Key differences from callBedrockApiMultimodalStream:
 * - Yields StreamAgentEvent discriminated unions (text_delta, tool_use_start/delta/stop, message_complete)
 * - Reconstructs full assistant content array (text blocks + toolUse blocks)
 * - Supports prompt caching with cache points after tools (like callBedrockApiForAgent)
 *
 * @param systemPrompt - Full system prompt (or use staticPrompt/dynamicPrompt for caching)
 * @param messages - Bedrock-format conversation history
 * @param tools - Tool definitions for the agent
 * @param modelId - Bedrock model ID
 * @param options - Caching, strict schema, and beta features
 * @returns AsyncGenerator yielding StreamAgentEvent discriminated unions
 */
export const callBedrockApiStreamForAgent = async function* (
  systemPrompt: string,
  messages: any[],
  tools: BedrockToolConfig[],
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options?: {
    staticPrompt?: string;
    dynamicPrompt?: string;
    anthropicBeta?: string[];
  },
): AsyncGenerator<any, void, unknown> {
  try {
    const finalTemperature = TEMPERATURE_PRESETS.BALANCED;

    // Build system parameters with caching support (same as callBedrockApiForAgent)
    const { systemParams, useNativeReasoning } = buildSystemParams(
      systemPrompt,
      options,
      modelId,
    );

    logBedrockCallStart("BEDROCK STREAMING AGENT API CALL", {
      modelId,
      temperature: finalTemperature,
      systemPromptLength: systemPrompt.length,
      messagesCount: messages.length,
      toolsCount: tools.length,
      enableThinking: false,
      useNativeReasoning,
    });

    const useCaching = !!(options?.staticPrompt && options?.dynamicPrompt);
    logger.info("Caching enabled:", useCaching);

    if (useCaching) {
      logger.info(
        "🔥 STREAMING AGENT CACHE OPTIMIZATION: Adding cache point after tools",
      );
    }

    // strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
    const toolConfig = buildToolConfigForAgent(tools, useCaching);

    const command = new ConverseStreamCommand({
      modelId: modelId,
      messages: messages,
      system: systemParams,
      toolConfig: toolConfig as any,
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: finalTemperature,
      },
      ...buildNativeReasoningFields(useNativeReasoning),
      ...(options?.anthropicBeta && {
        additionalModelRequestFields: {
          anthropic_beta: options.anthropicBeta,
        },
      }),
    });

    const response = await bedrockClient.send(command);

    if (!response.stream) {
      throw new Error("No stream received from Bedrock");
    }

    // Stream processing: yield StreamAgentEvent discriminated unions
    let fullTextResponse = "";
    let streamEnded = false;
    let reasoningLength = 0;
    let stopReason = "";
    let usage: { inputTokens: number; outputTokens: number } | null = null;

    // Track content blocks as they're built
    const contentBlocks: any[] = [];
    let currentBlockIndex = -1;
    const toolUseBlocks: Map<
      string,
      { toolUseId: string; name: string; input: string }
    > = new Map();

    for await (const chunk of response.stream!) {
      // Handle Nova reasoning content (log but don't yield)
      if (
        useNativeReasoning &&
        (chunk as any).contentBlockDelta?.delta?.reasoningContent
      ) {
        const reasoningText = (chunk as any).contentBlockDelta.delta
          .reasoningContent?.text;
        if (reasoningText) {
          reasoningLength += reasoningText.length;
        }
      }

      // Handle content block start (text or tool_use)
      if ((chunk as any).contentBlockStart) {
        currentBlockIndex++;
        const start = (chunk as any).contentBlockStart.start;

        if (start.toolUse) {
          // Tool use block starting
          const toolUseId = start.toolUse.toolUseId;
          const toolName = start.toolUse.name;

          toolUseBlocks.set(toolUseId, {
            toolUseId,
            name: toolName,
            input: "",
          });

          contentBlocks.push({
            toolUse: {
              toolUseId,
              name: toolName,
              input: {}, // Will be populated from deltas
            },
          });

          yield {
            type: "tool_use_start",
            toolUseId,
            toolName,
          };
        } else {
          // Text block starting
          contentBlocks.push({ text: "" });
        }
      }

      // Handle content block delta (text or tool input)
      if ((chunk as any).contentBlockDelta) {
        const delta = (chunk as any).contentBlockDelta.delta;

        if (delta.text) {
          // Text delta
          const textDelta = delta.text;
          fullTextResponse += textDelta;

          // Update the current text block
          if (
            contentBlocks[currentBlockIndex] &&
            contentBlocks[currentBlockIndex].text !== undefined
          ) {
            contentBlocks[currentBlockIndex].text += textDelta;
          }

          yield {
            type: "text_delta",
            text: textDelta,
          };
        }

        if (delta.toolUse) {
          // Tool input delta (JSON fragment)
          // Note: contentBlockDelta doesn't include toolUseId, so we need to look it up
          // using the currentBlockIndex from the contentBlocks array
          const inputFragment = delta.toolUse.input || "";

          // Find the toolUseId for the current block
          const currentBlock = contentBlocks[currentBlockIndex];
          const toolUseId = currentBlock?.toolUse?.toolUseId;

          if (toolUseId) {
            const toolUseData = toolUseBlocks.get(toolUseId);
            if (toolUseData) {
              toolUseData.input += inputFragment;
            }

            yield {
              type: "tool_use_delta",
              toolUseId,
              inputFragment,
            };
          } else {
            logger.warn(
              "⚠️ Received tool_use delta but couldn't find toolUseId for current block",
              {
                currentBlockIndex,
                totalBlocks: contentBlocks.length,
                hasCurrentBlock: !!currentBlock,
              },
            );
          }
        }
      }

      // Handle content block stop
      if ((chunk as any).contentBlockStop) {
        // Note: Bedrock's contentBlockIndex is an absolute index (0, 1, 2...) across all blocks in the message
        // But our contentBlocks array uses sequential indices as we build it
        // We need to use currentBlockIndex (our tracking) to find the right block
        const stoppedBlock = contentBlocks[currentBlockIndex];
        const toolUseId = stoppedBlock?.toolUse?.toolUseId;

        if (toolUseId) {
          // Tool use block complete - parse the accumulated JSON input
          const toolUseData = toolUseBlocks.get(toolUseId);
          if (toolUseData) {
            try {
              // Empty input is valid for tools with no required parameters (e.g., get_todays_workout,
              // query_programs). When the model calls such tools with no arguments, Bedrock's streaming
              // response produces an empty string rather than "{}". JSON.parse("") throws, so we
              // normalise empty/whitespace input to {} before parsing.
              const rawInput = toolUseData.input;
              const parsedInput =
                rawInput && rawInput.trim() ? JSON.parse(rawInput) : {};
              // Update the content block with the parsed input
              const block = contentBlocks.find(
                (b) => b.toolUse?.toolUseId === toolUseId,
              );
              if (block) {
                block.toolUse.input = parsedInput;
              }
            } catch (parseError) {
              logger.error("Failed to parse tool input JSON:", parseError);
              logger.error("Raw input:", toolUseData.input);
            }
          }

          yield {
            type: "tool_use_stop",
            toolUseId,
          };
        }
      }

      // Handle message stop
      if (chunk.messageStop) {
        stopReason = chunk.messageStop.stopReason || "end_turn";
        logger.info("=== BEDROCK STREAMING AGENT API CALL SUCCESS ===");
        logger.info("Stream complete. Stop reason:", stopReason);
        logger.info("Total text response length:", fullTextResponse.length);
        if (useNativeReasoning && reasoningLength > 0) {
          logger.info(
            "🧠 Nova reasoning received during stream, length:",
            reasoningLength,
          );
        }
        streamEnded = true;
      }

      // Capture metadata (comes after messageStop)
      if ((chunk as any).metadata) {
        const metadata = (chunk as any).metadata;

        if (metadata.usage) {
          usage = {
            inputTokens: metadata.usage.inputTokens || 0,
            outputTokens: metadata.usage.outputTokens || 0,
          };
          logCachePerformance(metadata.usage, "Streaming Agent API");
        }

        if (metadata.metrics) {
          logger.info("📊 Stream metrics:", metadata.metrics);
        }

        // Break after capturing metadata
        if (streamEnded) {
          break;
        }
      }
    }

    // Yield final message_complete event with reconstructed assistant content
    yield {
      type: "message_complete",
      stopReason,
      assistantContent: contentBlocks,
      usage: usage || { inputTokens: 0, outputTokens: 0 },
    };
  } catch (error: any) {
    logAwsError(error, "BEDROCK STREAMING AGENT API CALL");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Bedrock Streaming Agent API failed: ${errorMessage}`);
  }
};

/**
 * Amazon Bedrock Converse Stream API call with multimodal content support (text + images)
 * Use this when you need streaming responses with image support
 *
 * @param systemPrompt - System prompt to set AI behavior
 * @param messages - Full Converse API messages array (e.g., from buildMultimodalContent)
 * @param modelId - Model ID to use (defaults to Claude Sonnet 4)
 * @param options - Optional parameters including staticPrompt and dynamicPrompt for caching
 * @returns Promise with async generator that yields response chunks
 */
export const callBedrockApiMultimodalStream = async (
  systemPrompt: string,
  messages: any[], // Full Converse API messages array with images
  modelId: string = MODEL_IDS.EXECUTOR_MODEL_FULL,
  options?: BedrockApiOptions,
): Promise<AsyncGenerator<string, void, unknown>> => {
  try {
    // Build system parameters with cache control and thinking support
    const { systemParams, enableThinking, useNativeReasoning } =
      buildSystemParams(systemPrompt, options, modelId);

    const finalTemperature =
      options?.temperature ?? TEMPERATURE_PRESETS.BALANCED;

    const hasImages = messages.some((m) =>
      m.content?.some((c: any) => c.image),
    );

    logBedrockCallStart("BEDROCK MULTIMODAL STREAMING API CALL", {
      modelId,
      temperature: finalTemperature,
      systemPromptLength: systemPrompt.length,
      messagesCount: messages.length,
      enableThinking,
      useNativeReasoning,
      hasImages,
    });

    const command = new ConverseStreamCommand({
      modelId: modelId,
      messages: messages,
      system: systemParams,
      ...(options?.tools && {
        toolConfig: buildToolConfig(options.tools, true),
      }), // strict mode removed — schema enforced via additionalProperties, required, and enum constraints
      inferenceConfig: {
        maxTokens: getMaxTokensForModel(modelId),
        temperature: finalTemperature,
      },
      ...buildNativeReasoningFields(useNativeReasoning),
      // Add beta headers for advanced schema features if specified
      ...(options?.anthropicBeta && {
        additionalModelRequestFields: {
          anthropic_beta: options.anthropicBeta,
        },
      }),
    });

    logger.info("Multimodal converse stream command created successfully..");

    const response = await bedrockClient.send(command);

    if (!response.stream) {
      throw new Error("No stream received from Bedrock");
    }

    logger.info("Stream response received from Bedrock");

    // Return an async generator that yields chunks as they come in
    return (async function* streamGenerator() {
      try {
        let fullResponse = "";
        let streamEnded = false;
        let reasoningLength = 0;

        for await (const chunk of response.stream!) {
          // Handle Nova reasoning content (log but don't yield to user)
          if (
            useNativeReasoning &&
            (chunk as any).contentBlockDelta?.delta?.reasoningContent
          ) {
            const reasoningText = (chunk as any).contentBlockDelta.delta
              .reasoningContent?.text;
            if (reasoningText) {
              reasoningLength += reasoningText.length;
            }
          }

          if (chunk.contentBlockDelta?.delta?.text) {
            const deltaText = chunk.contentBlockDelta.delta.text;
            fullResponse += deltaText;
            yield deltaText;
          }

          // Mark stream as ended but continue to capture metadata
          if (chunk.messageStop) {
            logger.info(
              "=== BEDROCK MULTIMODAL STREAMING API CALL SUCCESS ===",
            );
            logger.info(
              "Stream complete. Total response length:",
              fullResponse.length,
            );
            if (useNativeReasoning && reasoningLength > 0) {
              logger.info(
                "🧠 Nova reasoning received during stream, length:",
                reasoningLength,
              );
            }
            streamEnded = true;
            // DON'T break yet - metadata event comes after messageStop
          }

          // Capture metadata event (comes after messageStop)
          if ((chunk as any).metadata) {
            const metadata = (chunk as any).metadata;
            logger.info("📊 Metadata event received after messageStop");

            if (metadata.usage) {
              logger.info("📊 Usage data found in metadata");
              logCachePerformance(metadata.usage, "Multimodal Streaming API");
            }

            if (metadata.metrics) {
              logger.info("📊 Stream metrics:", metadata.metrics);
            }

            // Now we can break after capturing metadata
            if (streamEnded) {
              break;
            }
          }
        }
      } catch (streamError: any) {
        logger.error("Error processing multimodal stream:", streamError);
        throw streamError;
      }
    })();
  } catch (error: any) {
    logAwsError(error, "BEDROCK MULTIMODAL STREAMING API CALL");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Bedrock Multimodal Streaming API failed: ${errorMessage}`);
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
  metadata: Record<string, any>,
) => {
  try {
    const { index } = await getPineconeClient();
    const userNamespace = getUserNamespace(userId);

    // Use metadata ID directly as Pinecone ID for stable, consistent upserting
    // This ensures the same record always maps to the same Pinecone ID
    let recordId: string;

    if (metadata.memoryId) {
      // User memory records
      recordId = metadata.memoryId; // e.g., "user_memory_userId_1759850315502_5cqgsat0i"
    } else if (metadata.workoutId) {
      // Workout records
      recordId = metadata.workoutId; // e.g., "workout_userId_1759837953791_shortId"
    } else if (metadata.programId) {
      // Training program records
      recordId = metadata.programId; // e.g., "program_userId_1761313084956_1f7lhmftx"
    } else if (metadata.summaryId) {
      // Conversation summary or coach creator summary records
      recordId = metadata.summaryId; // e.g., "conversation_summary_.." or "coach_creator_summary_.."
    } else {
      // No ID field found - this is an error
      logger.error("❌ No ID field found in metadata for Pinecone record", {
        userId,
        metadata,
        availableFields: Object.keys(metadata),
      });
      throw new Error(
        `Cannot store Pinecone record without ID field (memoryId, workoutId, programId, or summaryId)`,
      );
    }

    // Prepare metadata for Pinecone storage (additional fields beyond the embedded text)
    const additionalFields = {
      // Core identification
      userId: userId, // Using camelCase for consistency
      timestamp: new Date().toISOString(),

      // Merge provided metadata
      ...metadata,
    };

    // Sanitize metadata to remove all null/undefined values (Pinecone doesn't accept them)
    // This handles nested objects and arrays at any depth
    const sanitizedFields = deepSanitizeNullish(additionalFields);

    logger.info("🧹 Sanitized Pinecone metadata:", {
      originalKeys: Object.keys(additionalFields).length,
      sanitizedKeys: Object.keys(sanitizedFields).length,
      recordId,
    });

    // Use upsertRecords for auto-embedding with llama-text-embed-v2
    await index.namespace(userNamespace).upsertRecords({
      records: [
        {
          id: recordId,
          text: content, // This field gets auto-embedded by llama-text-embed-v2 (matches index field_map)
          ...sanitizedFields, // Additional metadata fields for filtering and retrieval (sanitized)
        },
      ],
    });

    logger.info(`Successfully stored context in Pinecone:`, {
      indexName: PINECONE_INDEX_NAME,
      namespace: userNamespace,
      recordId,
      userId,
      contentLength: content.length,
    });

    return { success: true, recordId, namespace: userNamespace };
  } catch (error) {
    logger.error("Failed to store Pinecone context:", error);
    throw error;
  }
};

// Store debugging data in S3 for analysis - with branch-aware subfolders
export const storeDebugDataInS3 = async (
  content: string,
  metadata: Record<string, any>,
  prefix: string = "debug",
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
      key = `${branchPrefix}analytics/weekly-analytics/${timestamp}_${metadata.userId || "unknown"}_${metadata.type || "raw-response"}.txt`;
    } else {
      // Other debug data uses the prefix parameter as the folder name
      key = `${branchPrefix}${prefix}/${timestamp}_${metadata.userId || "unknown"}_${metadata.type || "raw-response"}.txt`;
    }

    const debugData = {
      timestamp: new Date().toISOString(),
      metadata,
      content,
    };

    await putObject(key, JSON.stringify(debugData, null, 2), {
      bucketName,
      contentType: "application/json",
      serverSideEncryption: "AES256",
    });

    logger.info(`Successfully stored debug data in S3:`, {
      bucket: bucketName,
      key,
      contentLength: content.length,
      metadataKeys: Object.keys(metadata),
    });

    return `s3://${bucketName}/${key}`;
  } catch (error) {
    logger.error("Failed to store debug data in S3:", error);
    throw error;
  }
};

// Helper function to validate Pinecone configuration
const validatePineconeConfig = () => {
  logger.info("🔧 DEBUG: Pinecone configuration:", {
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

/**
 * Per-type topK budgets for user namespace queries.
 * Each record type gets its own query with its own topK budget,
 * preventing high-volume types (e.g., workouts) from crowding out
 * low-volume types (e.g., programs, conversations) in the initial results.
 */
export interface UserNamespaceQueryOptions {
  workoutTopK?: number; // default: 8, set 0 to skip
  conversationTopK?: number; // default: 5, set 0 to skip
  programTopK?: number; // default: 3, set 0 to skip
  coachCreatorTopK?: number; // default: 2, set 0 to skip
  programDesignerTopK?: number; // default: 0 (opt-in), set >0 to include program designer session summaries
  userMemoryTopK?: number; // default: 0 (opt-in), set >0 to include user memories
}

/**
 * Query a single record type from the user namespace.
 * Returns normalized results with id, score, text, and metadata.
 */
const querySingleRecordType = async (
  index: any,
  userId: string,
  userMessage: string,
  recordType: string,
  topK: number,
): Promise<any[]> => {
  if (topK <= 0) return [];

  try {
    const userNamespace = getUserNamespace(userId);
    const searchQuery = {
      query: {
        inputs: { text: userMessage },
        topK,
      },
      filter: {
        recordType: recordType,
      },
    };

    const response = await index
      .namespace(userNamespace)
      .searchRecords(searchQuery);

    return response.result.hits.map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      text: hit.fields?.text || "",
      metadata: hit.fields || {},
    }));
  } catch (error) {
    logger.error(`❌ Failed to query user namespace for ${recordType}:`, error);
    return [];
  }
};

/**
 * Query user namespace with per-type parallel queries.
 *
 * Each record type gets its own Pinecone query with its own topK budget,
 * running in parallel. This eliminates the crowding problem where high-volume
 * types (e.g., 80+ workout summaries) push out low-volume types (e.g., 3 program
 * summaries) before the reranker ever sees them.
 *
 * Results are combined into a single array for downstream reranking.
 */
const queryUserNamespace = async (
  index: any,
  userId: string,
  userMessage: string,
  options: UserNamespaceQueryOptions,
): Promise<any[]> => {
  const {
    workoutTopK = 8,
    conversationTopK = 5,
    programTopK = 3,
    coachCreatorTopK = 2,
    programDesignerTopK = 0,
    userMemoryTopK = 0,
  } = options;

  // Build list of queries to execute
  const queries: Array<{ recordType: string; topK: number }> = [];
  if (workoutTopK > 0)
    queries.push({ recordType: "workout_summary", topK: workoutTopK });
  if (conversationTopK > 0)
    queries.push({
      recordType: "conversation_summary",
      topK: conversationTopK,
    });
  if (programTopK > 0)
    queries.push({ recordType: "program_summary", topK: programTopK });
  if (coachCreatorTopK > 0)
    queries.push({
      recordType: "coach_creator_summary",
      topK: coachCreatorTopK,
    });
  if (programDesignerTopK > 0)
    queries.push({
      recordType: "program_designer_summary",
      topK: programDesignerTopK,
    });
  if (userMemoryTopK > 0)
    queries.push({ recordType: "user_memory", topK: userMemoryTopK });

  if (queries.length === 0) return [];

  logger.info("Querying user namespace (per-type parallel):", {
    indexName: PINECONE_INDEX_NAME,
    userId,
    userMessageLength: userMessage.length,
    queries: queries.map((q) => `${q.recordType}:${q.topK}`),
  });

  // Execute all type queries in parallel
  const results = await Promise.all(
    queries.map((q) =>
      querySingleRecordType(index, userId, userMessage, q.recordType, q.topK),
    ),
  );

  // Flatten results from all types
  const allMatches = results.flat();

  logger.info("✅ User namespace queries successful:", {
    totalMatches: allMatches.length,
    perType: queries.map((q, i) => `${q.recordType}: ${results[i].length}`),
  });

  return allMatches;
};

/**
 * Standardized methodology query function
 * Returns raw Pinecone results - reranking happens in processAndFilterResults
 */
const queryMethodologyNamespace = async (
  userMessage: string,
  userId: string,
  options: { topK: number },
): Promise<any[]> => {
  try {
    const { topK } = options;
    const { index } = await getPineconeClient();

    logger.info("🔍 Querying methodology namespace:", {
      userMessage: userMessage.substring(0, 100),
      topK,
      namespace: "methodology",
    });

    const searchQuery = {
      query: {
        inputs: { text: userMessage },
        topK: topK,
      },
    };

    const response = await index
      .namespace("methodology")
      .searchRecords(searchQuery);

    if (!response.result.hits || response.result.hits.length === 0) {
      logger.info("📭 No methodology matches found");
      return [];
    }

    // Normalize all methodology matches - extract record data and combine with score
    const matches = response.result.hits
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

    logger.info("✅ Methodology query successful:", {
      originalHits: response.result.hits.length,
      matches: matches.length,
    });

    return matches;
  } catch (error) {
    logger.error("❌ Failed to query methodology namespace:", error);
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
  minScore: 0.3, // Lower threshold since reranking improves relevance
  fallbackMinScore: 0.5, // Fallback minScore when reranking is disabled
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
  } = {},
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
        logger.warn(`⚠️ No text content found for match ${index}:`, {
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

    logger.info("🔄 Starting reranking process:", {
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
    const rerankResponse = await client.inference.rerank({
      model,
      query,
      documents,
      topN: Math.min(topN, matches.length), // Don't request more than we have
      returnDocuments: true, // Get the documents back with scores
      parameters: {
        truncate,
      },
    });

    if (!rerankResponse.data || rerankResponse.data.length === 0) {
      logger.warn(
        "⚠️ Reranking returned no results, falling back to original matches",
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

    logger.info("✅ Reranking successful:", {
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
          0,
        ) / rerankedMatches.length,
    });

    return rerankedMatches;
  } catch (error) {
    logger.error(
      "❌ Reranking failed, falling back to original results:",
      error,
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
      // Ensure recordType is set
      recordType:
        match.metadata?.recordType ||
        (namespace === "methodology" ? "methodology" : "unknown"),
    },
  };
};

// Helper function to process and filter results
const processAndFilterResults = async (
  allMatches: any[],
  options: { topK: number; minScore: number; enableReranking?: boolean },
  userId: string,
  originalQuery?: string,
) => {
  const {
    topK,
    minScore,
    enableReranking = RERANKING_CONFIG.enabled,
  } = options;
  const userNamespace = getUserNamespace(userId);

  logger.info("Processing Pinecone results:", {
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
        Math.min(RERANKING_CONFIG.initialTopK, normalizedMatches.length),
      );

      logger.info("🔄 Applying reranking:", {
        originalCount: normalizedMatches.length,
        rerankingCount: matchesForReranking.length,
        targetFinalCount: RERANKING_CONFIG.finalTopN,
      });

      processedMatches = await rerankPineconeResults(
        originalQuery,
        matchesForReranking,
        {
          topN: RERANKING_CONFIG.finalTopN,
        },
      );
    } catch (error) {
      logger.error(
        "❌ Reranking failed in processing, using original results:",
        error,
      );
      processedMatches = normalizedMatches.slice(0, topK);
    }
  } else {
    // No reranking - use traditional topK filtering
    processedMatches = normalizedMatches.slice(0, topK);
  }

  // When reranking is enabled, use reranking minScore (different scale: 0.3)
  // Otherwise, use passed minScore or fallback minScore (0.5)
  const finalMinScore =
    enableReranking && originalQuery
      ? RERANKING_CONFIG.minScore
      : minScore || RERANKING_CONFIG.fallbackMinScore;

  // Filter results by minimum score and format for consumption
  const relevantMatches = processedMatches
    .filter((match: any) => match.score && match.score >= finalMinScore)
    .map((match: any) => ({
      id: match.id,
      score: match.score,
      content: extractTextContent(match), // Use standardized extraction
      recordType: match.metadata?.recordType || "methodology",
      metadata: match.metadata,
      namespace:
        match.metadata?.recordType === "methodology"
          ? "methodology"
          : userNamespace,
    }));

  const wasReranked =
    enableReranking && originalQuery && normalizedMatches.length > 1;

  logger.info("✅ Successfully processed Pinecone results:", {
    indexName: PINECONE_INDEX_NAME,
    userId,
    totalMatches: normalizedMatches.length,
    processedMatches: processedMatches.length,
    relevantMatches: relevantMatches.length,
    finalMinScore,
    wasReranked,
    wasNormalized: true, // Indicate normalization was applied
    methodologyMatches: relevantMatches.filter(
      (m) => m.recordType === "methodology",
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
    // Per-type topK budgets (0 = skip that type)
    workoutTopK?: number;
    conversationTopK?: number;
    programTopK?: number;
    coachCreatorTopK?: number;
    programDesignerTopK?: number;
    userMemoryTopK?: number;
    // Methodology (separate namespace)
    includeMethodology?: boolean;
    // Reranking and filtering
    minScore?: number;
    enableReranking?: boolean;
    finalTopN?: number;
  } = {},
) => {
  try {
    const {
      workoutTopK = 8,
      conversationTopK = 5,
      programTopK = 3,
      coachCreatorTopK = 2,
      programDesignerTopK = 0,
      userMemoryTopK = 0,
      includeMethodology = true,
      minScore = 0.7,
      enableReranking = RERANKING_CONFIG.enabled,
      finalTopN = RERANKING_CONFIG.finalTopN,
    } = options;

    // Validate configuration
    validatePineconeConfig();

    const { index } = await getPineconeClient();

    logger.info("🔧 About to query Pinecone:", {
      namespace: getUserNamespace(userId),
      userId,
      indexName: PINECONE_INDEX_NAME,
      rerankingEnabled: enableReranking,
      perTypeBudgets: {
        workoutTopK,
        conversationTopK,
        programTopK,
        coachCreatorTopK,
        programDesignerTopK,
        userMemoryTopK,
      },
    });

    // Execute queries in parallel (user per-type queries + methodology)
    const [userMatches, methodologyMatches] = await Promise.all([
      queryUserNamespace(index, userId, userMessage, {
        workoutTopK,
        conversationTopK,
        programTopK,
        coachCreatorTopK,
        programDesignerTopK,
        userMemoryTopK,
      }),
      includeMethodology
        ? queryMethodologyNamespace(userMessage, userId, {
            topK: enableReranking ? RERANKING_CONFIG.initialTopK : 5,
          })
        : Promise.resolve([]),
    ]);

    // Combine all matches
    const allMatches = [...userMatches, ...methodologyMatches];

    logger.info("🔍 Retrieved initial Pinecone matches:", {
      userMatches: userMatches.length,
      methodologyMatches: methodologyMatches.length,
      totalMatches: allMatches.length,
      willRerank: enableReranking && allMatches.length > 1,
    });

    // Process and return results (with reranking if enabled)
    // Use finalTopN as the target number of results after reranking
    return await processAndFilterResults(
      allMatches,
      { topK: finalTopN, minScore, enableReranking },
      userId,
      userMessage, // Pass original query for reranking
    );
  } catch (error) {
    logger.error("Failed to query Pinecone context:", error);

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
  filter: Record<string, any>,
): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    const { index } = await getPineconeClient();
    const userNamespace = getUserNamespace(userId);

    // Convert simple filter to Pinecone query format with $eq operators
    // Pinecone requires filters like: {field: {$eq: value}} not {field: value}
    const pineconeFilter: Record<string, any> = {};
    for (const [key, value] of Object.entries(filter)) {
      pineconeFilter[key] = { $eq: value };
    }

    logger.info("🗑️ Deleting records from Pinecone by metadata filter:", {
      userId,
      namespace: userNamespace,
      inputFilter: filter,
      pineconeFilter,
    });

    // Delete directly by metadata filter using proper Pinecone query syntax
    // Note: deleteMany expects an object with a 'filter' property when using metadata filters
    await index.namespace(userNamespace).deleteMany({ filter: pineconeFilter });

    logger.info(
      "✅ Successfully deleted records from Pinecone by metadata filter:",
      {
        userId,
        namespace: userNamespace,
        filter: pineconeFilter,
      },
    );

    // Note: Pinecone deleteMany by filter doesn't return count, so we return success without count
    return { success: true, deletedCount: 1 }; // Assume at least 1 record was deleted
  } catch (error) {
    logger.error("❌ Failed to delete records from Pinecone:", error);
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
  } = {},
): Promise<any[]> => {
  const {
    topK = 6,
    // Lower default minScore from 0.7 to 0.5 to allow more memories through
    // This fixes issue where semantic retrieval was returning 0 results
    minScore = 0.5,
    contextTypes = [],
    enableReranking = RERANKING_CONFIG.enabled,
  } = options;

  try {
    const { index } = await getPineconeClient();
    const userNamespace = getUserNamespace(userId);

    logger.info("🔍 Querying semantic memories from Pinecone:", {
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
      recordType: "user_memory",
    };

    // Add context type filtering if specified
    if (contextTypes.length > 0) {
      filter = {
        ...filter,
        $or: contextTypes.map((type) => ({ memoryType: type })),
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
      logger.info("📭 No semantic memories found in Pinecone:", {
        userId,
        contextTypes,
        queryLength: userMessage.length,
        namespace: userNamespace,
        filter: JSON.stringify(filter),
      });
      return [];
    }

    // Log raw scores for diagnostics (before any filtering)
    logger.info("📊 Raw Pinecone memory scores (before filtering):", {
      userId,
      totalHits: response.result.hits.length,
      scores: response.result.hits.slice(0, 10).map((hit: any) => ({
        id: hit._id?.substring(0, 20),
        score: hit._score?.toFixed(4),
        memoryType: hit.fields?.memoryType,
        hasMemoryId: !!hit.fields?.memoryId,
      })),
      minScore,
      effectiveMinScoreWillBe: enableReranking
        ? RERANKING_CONFIG.minScore
        : minScore,
    });

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
        logger.info("🔄 Applying reranking to memory results:", {
          originalCount: normalizedHits.length,
          targetCount: topK,
        });

        normalizedHits = await rerankPineconeResults(
          userMessage,
          normalizedHits,
          {
            topN: topK,
          },
        );
      } catch (error) {
        logger.error(
          "❌ Memory reranking failed, using original results:",
          error,
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

    // Count filtered results for diagnostics
    let filteredByScore = 0;
    let filteredByMissingId = 0;

    // Filter by minimum score and convert to memory objects
    const relevantMemories = normalizedHits.filter((hit: any) => {
      // Must meet score threshold
      if (hit.score < effectiveMinScore) {
        filteredByScore++;
        return false;
      }

      // Must have memoryId (skip old context records without proper IDs)
      if (!hit.metadata.memoryId) {
        filteredByMissingId++;
        logger.info(
          "ℹ️ Skipping non-memory Pinecone record (expected behavior):",
          {
            pineconeId: hit.id,
            recordType: hit.metadata.recordType,
            contentPreview: extractTextContent(hit)?.substring(0, 100),
          },
        );
        return false;
      }

      return true;
    });

    // Log filtering diagnostics
    if (filteredByScore > 0 || filteredByMissingId > 0) {
      logger.info("📉 Semantic memory filtering diagnostics:", {
        filteredByScore,
        filteredByMissingId,
        effectiveMinScore,
        remainingAfterFilter: relevantMemories.length,
        hint:
          filteredByScore > 0 && relevantMemories.length === 0
            ? "All results filtered by score threshold. Consider lowering minScore if memories exist but aren't being retrieved."
            : undefined,
      });
    }

    const finalMemories = relevantMemories.map((hit: any) => {
      // Convert Pinecone result back to UserMemory-like object
      return {
        memoryId: hit.metadata.memoryId,
        userId: hit.metadata.userId || userId,
        coachId: hit.metadata.coachId,
        content: extractTextContent(hit), // Use standardized extraction
        memoryType: hit.metadata.memoryType,
        metadata: {
          importance: hit.metadata.importance,
          createdAt: new Date(hit.metadata.createdAt),
          usageCount: hit.metadata.usageCount || 0,
          lastUsed: hit.metadata.lastUsed
            ? new Date(hit.metadata.lastUsed)
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

    logger.info("✅ Successfully retrieved semantic memories:", {
      userId,
      totalHits: response.result.hits.length,
      relevantMemories: finalMemories.length,
      effectiveMinScore,
      wasReranked: enableReranking && normalizedHits.length > 1,
      wasNormalized: true, // Indicate normalization was applied
      averageScore:
        finalMemories.length > 0
          ? (
              finalMemories.reduce(
                (sum: number, m: any) => sum + m.pineconeScore,
                0,
              ) / finalMemories.length
            ).toFixed(3)
          : 0,
    });

    return finalMemories;
  } catch (error) {
    logger.error("❌ Failed to query semantic memories from Pinecone:", error);
    // Return empty array to allow graceful fallback
    return [];
  }
};
