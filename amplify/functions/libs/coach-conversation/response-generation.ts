import {
  callBedrockApi,
  callBedrockApiStream,
  callBedrockApiMultimodal,
  callBedrockApiMultimodalStream,
  MODEL_IDS,
  storeDebugDataInS3
} from "../api-helpers";
import { generateSystemPrompt, validateCoachConfig, generateSystemPromptPreview } from "./prompt-generation";
import { ConversationContextResult } from "./context";
import { WorkoutDetectionResult } from "./workout-detection";
import { MemoryRetrievalResult } from "./memory-processing";
import { buildMultimodalContent } from "../streaming";
import { CoachMessage } from "./types";

// Configuration constants
const ENABLE_S3_DEBUG_LOGGING = true; // Always log system prompts to S3 for debugging and monitoring

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
  imageS3Keys?: string[] // NEW: Add imageS3Keys parameter
): Promise<ResponseGenerationResult> {
  let aiResponseContent: string;
  let promptMetadata: any = null;

  try {
    // Validate coach config has all required prompts
    const validation = validateCoachConfig(coachConfig);
    if (!validation.isValid) {
      console.error("Coach config validation failed:", {
        missingComponents: validation.missingComponents,
        coachId,
        userId,
      });
      // Still continue but with warnings
    }

    if (validation.warnings.length > 0) {
      console.warn("Coach config validation warnings:", {
        warnings: validation.warnings,
        coachId,
        userId,
      });
    }

    // Extract user timezone from profile (fallback to Pacific Time if not set)
    const userTimezone = userProfile?.attributes?.preferences?.timezone;

    // Generate comprehensive system prompt using coach conversation utilities
    const promptOptions = {
      includeConversationGuidelines: true,
      includeUserContext: true, // Now enabled with real context
      includeDetailedBackground: true,
      conversationContext,
      additionalConstraints: workoutResult.workoutDetectionContext, // Add workout context if detected
      workoutContext: context.recentWorkouts, // Add recent workout summaries for context
      userMemories: memoryResult.memories, // Add memories for personalization
      criticalTrainingDirective: userProfile?.attributes?.criticalTrainingDirective, // Add critical training directive if set
      userTimezone, // Pass user's timezone for temporal context
    };

    const { systemPrompt, metadata } = generateSystemPrompt(
      coachConfig,
      promptOptions
    );
    promptMetadata = metadata;

    // Log prompt preview for debugging (in development)
    if (process.env.NODE_ENV !== "production") {
      const preview = generateSystemPromptPreview(coachConfig);
      console.info("Generated system prompt preview:", {
        ...preview,
        conversationContext,
        promptLength: metadata.promptLength,
        coachId: metadata.coachId,
        hasPineconeContext: context.pineconeContext.length > 0,
        pineconeMatches: context.pineconeMatches.length,
      });
    }

    // Build conversation history into system prompt (following coach creator pattern exactly)
    let systemPromptWithHistory = systemPrompt;

    // Add Pinecone context to system prompt if available
    if (context.pineconeContext) {
      systemPromptWithHistory += `\n\nSEMANTIC CONTEXT:${context.pineconeContext}

IMPORTANT: Use the semantic context above to provide more informed and contextual responses. Reference relevant past workouts or patterns when appropriate, but don't explicitly mention that you're using stored context.`;
    }

    if (existingMessages.length > 0) {
      // Format conversation history like coach creator does
      const conversationHistoryText = existingMessages
        .map((msg, index) => {
          const messageNumber = Math.floor(index / 2) + 1;
          return msg.role === "user"
            ? `Exchange ${messageNumber}:\nUser: ${msg.content}`
            : `Coach: ${msg.content}`;
        })
        .join("\n\n");

      systemPromptWithHistory = `${systemPrompt}

CONVERSATION HISTORY:
${conversationHistoryText}

CRITICAL:
Review the conversation history above. Build naturally on what you already know about this athlete.
USE THIS CONTEXT SILENTLY - don't explicitly reference previous exchanges unless directly relevant to the current topic.
Provide contextually relevant responses that demonstrate continuity with the ongoing coaching relationship.`;
    }

    // Store system prompt with history in S3 for debugging (always enabled)
    if (ENABLE_S3_DEBUG_LOGGING) {
      try {
        const promptSizeKB = (systemPromptWithHistory.length / 1024).toFixed(2);
        const baseSizeKB = (systemPrompt.length / 1024).toFixed(2);
        const pineconeContextSize = context.pineconeContext?.length || 0;
        const pineconeContextKB = (pineconeContextSize / 1024).toFixed(2);
        const historySize = systemPromptWithHistory.length - systemPrompt.length - pineconeContextSize;
        const historySizeKB = (historySize / 1024).toFixed(2);

        const s3Location = await storeDebugDataInS3(
          systemPromptWithHistory,
          {
            userId,
            coachId,
            conversationId,
            coachName: coachConfig.attributes.coach_name,
            userMessage: userMessage?.substring(0, 200) || '(no text, images only)',
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
            hasWorkoutContext: context.recentWorkouts.length > 0,
            recentWorkoutsCount: context.recentWorkouts.length,
            workoutDetected: workoutResult.isWorkoutLogging,
            hasPineconeContext: context.pineconeMatches.length > 0,
            pineconeMatches: context.pineconeMatches.length,
            hasMemories: memoryResult.memories?.length > 0,
            memoriesCount: memoryResult.memories?.length || 0,
            messageCount: existingMessages.length,
            hasCriticalDirective: !!userProfile?.attributes?.criticalTrainingDirective?.enabled,
            userTimezone: userProfile?.attributes?.preferences?.timezone || 'America/Los_Angeles',
            type: "coach-conversation-prompt-non-stream",
          },
          "coach-conversation"
        );

        console.info("✅ System prompt stored in S3 for debug/monitoring:", {
          location: s3Location,
          totalSizeKB: promptSizeKB,
          baseSizeKB: baseSizeKB,
          historySizeKB: historySizeKB,
          pineconeContextKB: pineconeContextKB,
          components: {
            base: `${baseSizeKB}KB`,
            history: `${historySizeKB}KB`,
            pinecone: `${pineconeContextKB}KB`,
            total: `${promptSizeKB}KB`
          }
        });
      } catch (s3Error) {
        console.warn(
          "⚠️ Failed to store system prompt in S3 (non-critical):",
          s3Error
        );
      }
    }

    try {
      // Check if this is a multimodal request (has images)
      const hasImages = imageS3Keys && imageS3Keys.length > 0;

      if (hasImages) {
        // Build conversation with images using Converse API format
        const currentUserMessage: CoachMessage = {
          id: `msg_${Date.now()}_user`,
          role: 'user',
          content: userMessage || '',
          timestamp: new Date(),
          messageType: 'text_with_images',
          imageS3Keys: imageS3Keys,
        };

        const allMessages: CoachMessage[] = [...existingMessages, currentUserMessage];
        const converseMessages = await buildMultimodalContent(allMessages);

        console.info('🖼️ Using multimodal Converse API with images', {
          messageCount: converseMessages.length,
          imagesCount: imageS3Keys.length,
        });

        // Use centralized multimodal helper from api-helpers
        aiResponseContent = await callBedrockApiMultimodal(
          systemPromptWithHistory,
          converseMessages,
          MODEL_IDS.CLAUDE_SONNET_4_FULL
        );
      } else {
        // Standard text-only response
        aiResponseContent = await callBedrockApi(
          systemPromptWithHistory,
          userMessage
        );
      }
    } catch (error) {
      console.error("Claude API error:", error);
      throw new Error("Failed to process response with AI");
    }
  } catch (aiError) {
    console.error("Error generating AI response:", aiError);
    throw new Error("Failed to generate coach response");
  }

  return {
    aiResponseContent,
    promptMetadata
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
  imageS3Keys?: string[] // NEW: Add imageS3Keys parameter
): Promise<ResponseGenerationStreamResult> {
  let promptMetadata: any = null;

  try {
    // Validate coach config has all required prompts
    const validation = validateCoachConfig(coachConfig);
    if (!validation.isValid) {
      console.error("Coach config validation failed:", {
        missingComponents: validation.missingComponents,
        coachId,
        userId,
      });
      // Still continue but with warnings
    }

    if (validation.warnings.length > 0) {
      console.warn("Coach config validation warnings:", {
        warnings: validation.warnings,
        coachId,
        userId,
      });
    }

    // Extract user timezone from profile (fallback to Pacific Time if not set)
    const userTimezone = userProfile?.attributes?.preferences?.timezone;

    // Generate comprehensive system prompt using coach conversation utilities
    const promptOptions = {
      includeConversationGuidelines: true,
      includeUserContext: true, // Now enabled with real context
      includeDetailedBackground: true,
      conversationContext,
      additionalConstraints: workoutResult.workoutDetectionContext, // Add workout context if detected
      workoutContext: context.recentWorkouts, // Add recent workout summaries for context
      userMemories: memoryResult.memories, // Add memories for personalization
      criticalTrainingDirective: userProfile?.attributes?.criticalTrainingDirective, // Add critical training directive if set
      userTimezone, // Pass user's timezone for temporal context
    };

    const { systemPrompt, metadata } = generateSystemPrompt(
      coachConfig,
      promptOptions
    );
    promptMetadata = metadata;

    // Log prompt preview for debugging (in development)
    if (process.env.NODE_ENV !== "production") {
      const preview = generateSystemPromptPreview(coachConfig);
      console.info("Generated system prompt preview for streaming:", {
        ...preview,
        conversationContext,
        promptLength: metadata.promptLength,
        coachId: metadata.coachId,
        hasPineconeContext: context.pineconeContext.length > 0,
        pineconeMatches: context.pineconeMatches.length,
      });
    }

    // Build conversation history into system prompt (following coach creator pattern exactly)
    let systemPromptWithHistory = systemPrompt;

    // Add Pinecone context to system prompt if available
    if (context.pineconeContext) {
      systemPromptWithHistory += `\n\nSEMANTIC CONTEXT:${context.pineconeContext}

IMPORTANT: Use the semantic context above to provide more informed and contextual responses. Reference relevant past workouts or patterns when appropriate, but don't explicitly mention that you're using stored context.`;
    }

    if (existingMessages.length > 0) {
      // Format conversation history like coach creator does
      const conversationHistoryText = existingMessages
        .map((msg, index) => {
          const messageNumber = Math.floor(index / 2) + 1;
          return msg.role === "user"
            ? `Exchange ${messageNumber}:\nUser: ${msg.content}`
            : `Coach: ${msg.content}`;
        })
        .join("\n\n");

      systemPromptWithHistory = `${systemPrompt}

CONVERSATION HISTORY:
${conversationHistoryText}

CRITICAL:
Review the conversation history above. Build naturally on what you already know about this athlete.
USE THIS CONTEXT SILENTLY - don't explicitly reference previous exchanges unless directly relevant to the current topic.
Provide contextually relevant responses that demonstrate continuity with the ongoing coaching relationship.`;
    }

    // Store system prompt with history in S3 for debugging (always enabled)
    if (ENABLE_S3_DEBUG_LOGGING) {
      try {
        const promptSizeKB = (systemPromptWithHistory.length / 1024).toFixed(2);
        const baseSizeKB = (systemPrompt.length / 1024).toFixed(2);
        const pineconeContextSize = context.pineconeContext?.length || 0;
        const pineconeContextKB = (pineconeContextSize / 1024).toFixed(2);
        const historySize = systemPromptWithHistory.length - systemPrompt.length - pineconeContextSize;
        const historySizeKB = (historySize / 1024).toFixed(2);

        const s3Location = await storeDebugDataInS3(
          systemPromptWithHistory,
          {
            userId,
            coachId,
            conversationId,
            coachName: coachConfig.attributes.coach_name,
            userMessage: userMessage?.substring(0, 200) || '(no text, images only)',
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
            hasWorkoutContext: context.recentWorkouts.length > 0,
            recentWorkoutsCount: context.recentWorkouts.length,
            workoutDetected: workoutResult.isWorkoutLogging,
            hasPineconeContext: context.pineconeMatches.length > 0,
            pineconeMatches: context.pineconeMatches.length,
            hasMemories: memoryResult.memories?.length > 0,
            memoriesCount: memoryResult.memories?.length || 0,
            messageCount: existingMessages.length,
            hasCriticalDirective: !!userProfile?.attributes?.criticalTrainingDirective?.enabled,
            userTimezone: userTimezone || 'America/Los_Angeles',
            type: "coach-conversation-prompt-stream",
          },
          "coach-conversation"
        );

        console.info("✅ System prompt stored in S3 for debug/monitoring:", {
          location: s3Location,
          totalSizeKB: promptSizeKB,
          baseSizeKB: baseSizeKB,
          historySizeKB: historySizeKB,
          pineconeContextKB: pineconeContextKB,
          components: {
            base: `${baseSizeKB}KB`,
            history: `${historySizeKB}KB`,
            pinecone: `${pineconeContextKB}KB`,
            total: `${promptSizeKB}KB`
          }
        });
      } catch (s3Error) {
        console.warn(
          "⚠️ Failed to store system prompt in S3 (non-critical):",
          s3Error
        );
      }
    }

    try {
      // Check if this is a multimodal request (has images)
      const hasImages = imageS3Keys && imageS3Keys.length > 0;

      if (hasImages) {
        // Build conversation with images using Converse API format
        const currentUserMessage: CoachMessage = {
          id: `msg_${Date.now()}_user`,
          role: 'user',
          content: userMessage || '',
          timestamp: new Date(),
          messageType: 'text_with_images',
          imageS3Keys: imageS3Keys,
        };

        const allMessages: CoachMessage[] = [...existingMessages, currentUserMessage];
        const converseMessages = await buildMultimodalContent(allMessages);

        console.info('🖼️ Using multimodal Converse Stream API with images', {
          messageCount: converseMessages.length,
          imagesCount: imageS3Keys.length,
        });

        // Use centralized multimodal streaming helper from api-helpers
        const responseStream = await callBedrockApiMultimodalStream(
          systemPromptWithHistory,
          converseMessages,
          MODEL_IDS.CLAUDE_SONNET_4_FULL
        );

        return {
          responseStream,
          promptMetadata
        };
      } else {
        // Standard text-only streaming response
        const responseStream = await callBedrockApiStream(
          systemPromptWithHistory,
          userMessage
        );

        return {
          responseStream,
          promptMetadata
        };
      }
    } catch (error) {
      console.error("Claude Streaming API error:", error);
      throw new Error("Failed to process response with AI streaming");
    }
  } catch (aiError) {
    console.error("Error generating AI streaming response:", aiError);
    throw new Error("Failed to generate coach streaming response");
  }
}