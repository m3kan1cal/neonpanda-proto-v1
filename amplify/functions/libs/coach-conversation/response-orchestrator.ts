import {
  callBedrockApiMultimodal,
  callBedrockApiMultimodalStream,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
  storeDebugDataInS3,
} from "../api-helpers";
import {
  generateSystemPrompt,
  validateCoachConfig,
  generateSystemPromptPreview,
} from "./prompt-generation";
import { ConversationContextResult } from "./context";
import { WorkoutDetectionResult } from "./workout-detection";
import { MemoryRetrievalResult } from "./memory-processing";
import { buildMultimodalContent } from "../streaming";
import { formatLivingProfileForPrompt } from "../user/living-profile";
import { logger } from "../logger";
import {
  CoachMessage,
  ConversationMode,
  CONVERSATION_MODES,
  MESSAGE_TYPES,
} from "./types";
import {
  buildMessagesWithCaching,
  redactGuardrailMessages,
} from "../agents/shared/message-caching";

// Configuration constants
const ENABLE_S3_DEBUG_LOGGING = true; // Always log system prompts to S3 for debugging and monitoring

/**
 * Smart model selection based on router analysis
 * Uses Haiku 4.5 for standard conversations (faster + cheaper)
 * Uses Sonnet 4.6 for complex reasoning (better quality)
 *
 * @param requiresDeepReasoning - From smart router analysis
 * @returns Model ID to use for this conversation
 */
export function selectModelForConversation(
  requiresDeepReasoning: boolean,
): string {
  const modelToUse = requiresDeepReasoning
    ? MODEL_IDS.PLANNER_MODEL_FULL
    : MODEL_IDS.EXECUTOR_MODEL_FULL;

  const modelDisplay = requiresDeepReasoning
    ? MODEL_IDS.PLANNER_MODEL_DISPLAY
    : MODEL_IDS.EXECUTOR_MODEL_DISPLAY;

  logger.info(
    `🤖 Model selection: ${modelDisplay} (requiresDeepReasoning=${requiresDeepReasoning})`,
  );

  return modelToUse;
}

export interface ResponseGenerationResult {
  aiResponseContent: string;
  promptMetadata: any;
}

/**
 * Generates the AI response using coach configuration and all gathered context
 */
export async function generateAIResponse(
  coachConfig: any,
  context: ConversationContextResult,
  workoutResult: WorkoutDetectionResult,
  memoryResult: MemoryRetrievalResult,
  userMessage: string,
  existingMessages: any[],
  conversationContext: any,
  userId: string,
  coachId: string,
  conversationId: string,
  userProfile?: any,
  imageS3Keys?: string[], // Image attachments
  requiresDeepReasoning?: boolean, // NEW: Smart model selection flag
  conversationMode?: ConversationMode, // NEW: Conversation mode for specialized prompts
  documentS3Keys?: string[], // Document attachments
): Promise<ResponseGenerationResult> {
  let aiResponseContent: string;
  let promptMetadata: any = null;

  try {
    // Validate coach config has all required prompts
    const validation = validateCoachConfig(coachConfig);
    if (!validation.isValid) {
      logger.error("Coach config validation failed:", {
        missingComponents: validation.missingComponents,
        coachId,
        userId,
      });
      // Still continue but with warnings
    }

    if (validation.warnings.length > 0) {
      logger.warn("Coach config validation warnings:", {
        warnings: validation.warnings,
        coachId,
        userId,
      });
    }

    // Extract user timezone from profile (fallback to Pacific Time if not set)
    const userTimezone = userProfile?.preferences?.timezone;

    // Generate comprehensive system prompt using coach conversation utilities
    // NEW: Enable caching by passing existingMessages and pineconeContext directly
    const promptOptions = {
      includeConversationGuidelines: true,
      includeUserContext: true, // Now enabled with real context
      includeDetailedBackground: true,
      conversationContext,
      additionalConstraints: workoutResult.workoutDetectionContext, // Add workout context if detected
      workoutContext: context.recentWorkouts, // Add recent workout summaries for context
      userMemories: memoryResult.memories, // Add memories for personalization
      criticalTrainingDirective: userProfile?.criticalTrainingDirective, // Add critical training directive if set
      userTimezone, // Pass user's timezone for temporal context
      existingMessages, // NEW: Pass messages for conversation history (now in prompt-generation)
      pineconeContext: context.pineconeContext, // NEW: Pass Pinecone context (now in prompt-generation)
      includeCacheControl: true, // NEW: Enable caching optimization
      mode: conversationMode || CONVERSATION_MODES.CHAT, // NEW: Conversation mode for specialized prompts
      prospectiveContext: memoryResult.prospectivePromptSection, // Prospective follow-up items
      livingProfileContext: userProfile?.livingProfile
        ? formatLivingProfileForPrompt(userProfile.livingProfile)
        : undefined,
      // emotionalContext: loaded from DynamoDB in handler, passed via memoryResult (future)
    };

    const { systemPrompt, metadata, staticPrompt, dynamicPrompt } =
      generateSystemPrompt(coachConfig, promptOptions);
    promptMetadata = metadata;

    // Log prompt preview for debugging (in development)
    if (process.env.NODE_ENV !== "production") {
      const preview = generateSystemPromptPreview(coachConfig);
      logger.info("Generated system prompt preview:", {
        ...preview,
        conversationContext,
        promptLength: metadata.promptLength,
        coachId: metadata.coachId,
        hasPineconeContext: context.pineconeContext.length > 0,
        pineconeMatches: context.pineconeMatches.length,
      });
    }

    // NEW: systemPrompt now includes conversation history and Pinecone context (handled in prompt-generation.ts)
    const systemPromptWithHistory = systemPrompt;

    // Store system prompt with history in S3 for debugging (always enabled)
    if (ENABLE_S3_DEBUG_LOGGING) {
      try {
        const promptSizeKB = (systemPromptWithHistory.length / 1024).toFixed(2);
        const baseSizeKB = (systemPrompt.length / 1024).toFixed(2);
        const pineconeContextSize = context.pineconeContext?.length || 0;
        const pineconeContextKB = (pineconeContextSize / 1024).toFixed(2);
        const historySize =
          systemPromptWithHistory.length -
          systemPrompt.length -
          pineconeContextSize;
        const historySizeKB = (historySize / 1024).toFixed(2);

        const s3Location = await storeDebugDataInS3(
          systemPromptWithHistory,
          {
            userId,
            coachId,
            conversationId,
            coachName: coachConfig.coach_name,
            userMessage:
              userMessage?.substring(0, 200) || "(no text, images only)",
            sessionNumber: conversationContext.sessionNumber,
            // Size breakdown
            totalPromptLength: systemPromptWithHistory.length,
            totalPromptSizeKB: promptSizeKB,
            basePromptLength: systemPrompt.length,
            basePromptSizeKB: baseSizeKB,
            conversationHistoryLength: historySize,
            conversationHistorySizeKB: historySizeKB,
            pineconeContextLength: pineconeContextSize,
            pineconeContextSizeKB: pineconeContextKB,
            // Context flags
            hasImages: imageS3Keys && imageS3Keys.length > 0,
            imageCount: imageS3Keys?.length || 0,
            hasDocuments: documentS3Keys && documentS3Keys.length > 0,
            documentCount: documentS3Keys?.length || 0,
            hasWorkoutContext: context.recentWorkouts.length > 0,
            recentWorkoutsCount: context.recentWorkouts.length,
            workoutDetected: workoutResult.isWorkoutLogging,
            hasPineconeContext: context.pineconeMatches.length > 0,
            pineconeMatches: context.pineconeMatches.length,
            hasMemories: memoryResult.memories?.length > 0,
            memoriesCount: memoryResult.memories?.length || 0,
            messageCount: existingMessages.length,
            hasCriticalDirective:
              !!userProfile?.criticalTrainingDirective?.enabled,
            userTimezone:
              userProfile?.preferences?.timezone || "America/Los_Angeles",
            type: "coach-conversation-prompt-non-stream",
          },
          "coach-conversation",
        );

        logger.info("✅ System prompt stored in S3 for debug/monitoring:", {
          location: s3Location,
          totalSizeKB: promptSizeKB,
          baseSizeKB: baseSizeKB,
          historySizeKB: historySizeKB,
          pineconeContextKB: pineconeContextKB,
          components: {
            base: `${baseSizeKB}KB`,
            history: `${historySizeKB}KB`,
            pinecone: `${pineconeContextKB}KB`,
            total: `${promptSizeKB}KB`,
          },
        });
      } catch (s3Error) {
        logger.warn(
          "⚠️ Failed to store system prompt in S3 (non-critical):",
          s3Error,
        );
      }
    }

    try {
      // Smart model selection based on router analysis
      const selectedModel = selectModelForConversation(
        requiresDeepReasoning || false,
      );

      // Check if this is a multimodal request (has attachments)
      const hasImages = imageS3Keys && imageS3Keys.length > 0;
      const hasDocuments = documentS3Keys && documentS3Keys.length > 0;
      const hasAttachments = hasImages || hasDocuments;

      if (hasAttachments) {
        // Build conversation with attachments using Converse API format
        const currentUserMessage: CoachMessage = {
          id: `msg_${Date.now()}_user`,
          role: "user",
          content: userMessage || "",
          timestamp: new Date(),
          messageType: MESSAGE_TYPES.TEXT_WITH_ATTACHMENTS,
          ...(hasImages ? { imageS3Keys } : {}),
          ...(hasDocuments ? { documentS3Keys } : {}),
        };

        const allMessages: CoachMessage[] = [
          ...redactGuardrailMessages(existingMessages),
          currentUserMessage,
        ];
        const converseMessages = await buildMultimodalContent(allMessages);

        logger.info("📎 Using multimodal Converse API with attachments", {
          messageCount: converseMessages.length,
          imagesCount: imageS3Keys?.length || 0,
          documentsCount: documentS3Keys?.length || 0,
          model: selectedModel,
        });

        // Use centralized multimodal helper from api-helpers
        // NEW: Pass static/dynamic prompts for caching optimization
        aiResponseContent = (await callBedrockApiMultimodal(
          systemPromptWithHistory,
          converseMessages,
          selectedModel,
          staticPrompt && dynamicPrompt
            ? {
                temperature: TEMPERATURE_PRESETS.BALANCED,
                staticPrompt,
                dynamicPrompt,
              }
            : { temperature: TEMPERATURE_PRESETS.BALANCED },
        )) as string; // No tools used, always returns string
      } else {
        // Text-only response with conversation history caching
        // Build messages array with history caching (if conversation is long enough)
        const messagesWithHistory = await buildMessagesWithCaching(
          existingMessages,
          "coach conversation",
        );

        // Add new user message
        messagesWithHistory.push({
          role: "user",
          content: [{ text: userMessage }],
        });

        logger.info("💬 Using text-only Converse API with history caching", {
          totalMessages: messagesWithHistory.length,
          existingMessages: existingMessages.length,
          model: selectedModel,
        });

        // Use multimodal API (works for text-only too) with messages array
        aiResponseContent = (await callBedrockApiMultimodal(
          systemPromptWithHistory,
          messagesWithHistory,
          selectedModel,
          staticPrompt && dynamicPrompt
            ? {
                temperature: TEMPERATURE_PRESETS.BALANCED,
                staticPrompt,
                dynamicPrompt,
              }
            : { temperature: TEMPERATURE_PRESETS.BALANCED },
        )) as string; // No tools used, always returns string
      }
    } catch (error) {
      logger.error("Claude API error:", error);
      throw new Error("Failed to process response with AI");
    }
  } catch (aiError) {
    logger.error("Error generating AI response:", aiError);
    throw new Error("Failed to generate coach response");
  }

  return {
    aiResponseContent,
    promptMetadata,
  };
}

export interface ResponseGenerationStreamResult {
  responseStream: AsyncGenerator<string, void, unknown>;
  promptMetadata: any;
}

/**
 * Generates a streaming AI response using coach configuration and all gathered context
 * Returns an async generator that yields response chunks in real-time
 */
export async function generateAIResponseStream(
  coachConfig: any,
  context: ConversationContextResult,
  workoutResult: WorkoutDetectionResult,
  memoryResult: MemoryRetrievalResult,
  userMessage: string,
  existingMessages: any[],
  conversationContext: any,
  userId: string,
  coachId: string,
  conversationId: string,
  userProfile?: any,
  imageS3Keys?: string[], // Image attachments
  requiresDeepReasoning?: boolean, // NEW: Smart model selection flag
  conversationMode?: ConversationMode, // NEW: Conversation mode for specialized prompts
  documentS3Keys?: string[], // Document attachments
): Promise<ResponseGenerationStreamResult> {
  let promptMetadata: any = null;

  try {
    // Validate coach config has all required prompts
    const validation = validateCoachConfig(coachConfig);
    if (!validation.isValid) {
      logger.error("Coach config validation failed:", {
        missingComponents: validation.missingComponents,
        coachId,
        userId,
      });
      // Still continue but with warnings
    }

    if (validation.warnings.length > 0) {
      logger.warn("Coach config validation warnings:", {
        warnings: validation.warnings,
        coachId,
        userId,
      });
    }

    // Extract user timezone from profile (fallback to Pacific Time if not set)
    const userTimezone = userProfile?.preferences?.timezone;

    // Generate comprehensive system prompt using coach conversation utilities
    // NEW: Enable caching by passing existingMessages and pineconeContext directly
    const promptOptions = {
      includeConversationGuidelines: true,
      includeUserContext: true, // Now enabled with real context
      includeDetailedBackground: true,
      conversationContext,
      additionalConstraints: workoutResult.workoutDetectionContext, // Add workout context if detected
      workoutContext: context.recentWorkouts, // Add recent workout summaries for context
      userMemories: memoryResult.memories, // Add memories for personalization
      criticalTrainingDirective: userProfile?.criticalTrainingDirective, // Add critical training directive if set
      userTimezone, // Pass user's timezone for temporal context
      existingMessages, // NEW: Pass messages for conversation history (now in prompt-generation)
      pineconeContext: context.pineconeContext, // NEW: Pass Pinecone context (now in prompt-generation)
      includeCacheControl: true, // NEW: Enable caching optimization
      mode: conversationMode || CONVERSATION_MODES.CHAT, // NEW: Conversation mode for specialized prompts
      prospectiveContext: memoryResult.prospectivePromptSection, // Prospective follow-up items
      livingProfileContext: userProfile?.livingProfile
        ? formatLivingProfileForPrompt(userProfile.livingProfile)
        : undefined,
      // emotionalContext: loaded from DynamoDB in handler, passed via memoryResult (future)
    };

    const { systemPrompt, metadata, staticPrompt, dynamicPrompt } =
      generateSystemPrompt(coachConfig, promptOptions);
    promptMetadata = metadata;

    // Log prompt preview for debugging (in development)
    if (process.env.NODE_ENV !== "production") {
      const preview = generateSystemPromptPreview(coachConfig);
      logger.info("Generated system prompt preview for streaming:", {
        ...preview,
        conversationContext,
        promptLength: metadata.promptLength,
        coachId: metadata.coachId,
        hasPineconeContext: context.pineconeContext.length > 0,
        pineconeMatches: context.pineconeMatches.length,
      });
    }

    // NEW: systemPrompt now includes conversation history and Pinecone context (handled in prompt-generation.ts)
    const systemPromptWithHistory = systemPrompt;

    // Store system prompt with history in S3 for debugging (always enabled)
    if (ENABLE_S3_DEBUG_LOGGING) {
      try {
        const promptSizeKB = (systemPromptWithHistory.length / 1024).toFixed(2);
        const baseSizeKB = (systemPrompt.length / 1024).toFixed(2);
        const pineconeContextSize = context.pineconeContext?.length || 0;
        const pineconeContextKB = (pineconeContextSize / 1024).toFixed(2);
        const historySize =
          systemPromptWithHistory.length -
          systemPrompt.length -
          pineconeContextSize;
        const historySizeKB = (historySize / 1024).toFixed(2);

        const s3Location = await storeDebugDataInS3(
          systemPromptWithHistory,
          {
            userId,
            coachId,
            conversationId,
            coachName: coachConfig.coach_name,
            userMessage:
              userMessage?.substring(0, 200) || "(no text, images only)",
            sessionNumber: conversationContext.sessionNumber,
            // Size breakdown
            totalPromptLength: systemPromptWithHistory.length,
            totalPromptSizeKB: promptSizeKB,
            basePromptLength: systemPrompt.length,
            basePromptSizeKB: baseSizeKB,
            conversationHistoryLength: historySize,
            conversationHistorySizeKB: historySizeKB,
            pineconeContextLength: pineconeContextSize,
            pineconeContextSizeKB: pineconeContextKB,
            // Context flags
            hasImages: imageS3Keys && imageS3Keys.length > 0,
            imageCount: imageS3Keys?.length || 0,
            hasDocuments: documentS3Keys && documentS3Keys.length > 0,
            documentCount: documentS3Keys?.length || 0,
            hasWorkoutContext: context.recentWorkouts.length > 0,
            recentWorkoutsCount: context.recentWorkouts.length,
            workoutDetected: workoutResult.isWorkoutLogging,
            hasPineconeContext: context.pineconeMatches.length > 0,
            pineconeMatches: context.pineconeMatches.length,
            hasMemories: memoryResult.memories?.length > 0,
            memoriesCount: memoryResult.memories?.length || 0,
            messageCount: existingMessages.length,
            hasCriticalDirective:
              !!userProfile?.criticalTrainingDirective?.enabled,
            userTimezone: userTimezone || "America/Los_Angeles",
            type: "coach-conversation-prompt-stream",
          },
          "coach-conversation",
        );

        logger.info("✅ System prompt stored in S3 for debug/monitoring:", {
          location: s3Location,
          totalSizeKB: promptSizeKB,
          baseSizeKB: baseSizeKB,
          historySizeKB: historySizeKB,
          pineconeContextKB: pineconeContextKB,
          components: {
            base: `${baseSizeKB}KB`,
            history: `${historySizeKB}KB`,
            pinecone: `${pineconeContextKB}KB`,
            total: `${promptSizeKB}KB`,
          },
        });
      } catch (s3Error) {
        logger.warn(
          "⚠️ Failed to store system prompt in S3 (non-critical):",
          s3Error,
        );
      }
    }

    try {
      // Smart model selection based on router analysis
      const selectedModel = selectModelForConversation(
        requiresDeepReasoning || false,
      );

      // Check if this is a multimodal request (has attachments)
      const hasImages = imageS3Keys && imageS3Keys.length > 0;
      const hasDocuments = documentS3Keys && documentS3Keys.length > 0;
      const hasAttachments = hasImages || hasDocuments;

      if (hasAttachments) {
        // Build conversation with attachments using Converse API format
        const currentUserMessage: CoachMessage = {
          id: `msg_${Date.now()}_user`,
          role: "user",
          content: userMessage || "",
          timestamp: new Date(),
          messageType: MESSAGE_TYPES.TEXT_WITH_ATTACHMENTS,
          ...(hasImages ? { imageS3Keys } : {}),
          ...(hasDocuments ? { documentS3Keys } : {}),
        };

        const allMessages: CoachMessage[] = [
          ...redactGuardrailMessages(existingMessages),
          currentUserMessage,
        ];
        const converseMessages = await buildMultimodalContent(allMessages);

        logger.info(
          "📎 Using multimodal Converse Stream API with attachments",
          {
            messageCount: converseMessages.length,
            imagesCount: imageS3Keys?.length || 0,
            documentsCount: documentS3Keys?.length || 0,
            model: selectedModel,
          },
        );

        // Use centralized multimodal streaming helper from api-helpers
        // NEW: Pass static/dynamic prompts for caching optimization
        const responseStream = await callBedrockApiMultimodalStream(
          systemPromptWithHistory,
          converseMessages,
          selectedModel,
          staticPrompt && dynamicPrompt
            ? {
                temperature: TEMPERATURE_PRESETS.BALANCED,
                staticPrompt,
                dynamicPrompt,
              }
            : { temperature: TEMPERATURE_PRESETS.BALANCED },
        );

        return {
          responseStream,
          promptMetadata,
        };
      } else {
        // Text-only streaming response with conversation history caching
        // Build messages array with history caching (if conversation is long enough)
        const messagesWithHistory = await buildMessagesWithCaching(
          existingMessages,
          "coach conversation",
        );

        // Add new user message
        messagesWithHistory.push({
          role: "user",
          content: [{ text: userMessage }],
        });

        logger.info(
          "💬 Using text-only Converse Stream API with history caching",
          {
            totalMessages: messagesWithHistory.length,
            existingMessages: existingMessages.length,
            model: selectedModel,
          },
        );

        // Use multimodal streaming API (works for text-only too) with messages array
        const responseStream = await callBedrockApiMultimodalStream(
          systemPromptWithHistory,
          messagesWithHistory,
          selectedModel,
          staticPrompt && dynamicPrompt
            ? {
                temperature: TEMPERATURE_PRESETS.BALANCED,
                staticPrompt,
                dynamicPrompt,
              }
            : { temperature: TEMPERATURE_PRESETS.BALANCED },
        );

        return {
          responseStream,
          promptMetadata,
        };
      }
    } catch (error) {
      logger.error("Claude Streaming API error:", error);
      throw new Error("Failed to process response with AI streaming");
    }
  } catch (aiError) {
    logger.error("Error generating AI streaming response:", aiError);
    throw new Error("Failed to generate coach streaming response");
  }
}
