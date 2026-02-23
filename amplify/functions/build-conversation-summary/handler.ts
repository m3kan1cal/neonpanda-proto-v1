import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
  storeDebugDataInS3,
  BedrockToolUseResult,
} from "../libs/api-helpers";
import {
  saveCoachConversationSummary,
  getCoachConversationSummary,
  getCoachConversation,
  getCoachConfig,
  getUserProfile,
} from "../../dynamodb/operations";
import {
  BuildCoachConversationSummaryEvent,
  buildCoachConversationSummaryPrompt,
  parseCoachConversationSummary,
  storeCoachConversationSummaryInPinecone,
  CoachMessage,
} from "../libs/coach-conversation";
import { updateCoachConversation } from "../../dynamodb/operations";
import { CONVERSATION_SUMMARY_TOOL } from "../libs/schemas/conversation-summary-schema";
import { logger } from "../libs/logger";

export const handler = async (event: BuildCoachConversationSummaryEvent) => {
  try {
    logger.info("💬 Starting conversation summary generation:", {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      triggerReason: event.triggerReason,
      messageCount: event.messageCount,
      complexityIndicators: event.complexityIndicators,
      timestamp: new Date().toISOString(),
    });

    // Load the conversation with full message history
    logger.info("📖 Loading conversation from DynamoDB..");
    const conversationItem = await getCoachConversation(
      event.userId,
      event.coachId,
      event.conversationId,
    );

    if (!conversationItem) {
      throw new Error(`Conversation not found: ${event.conversationId}`);
    }

    const conversation = conversationItem;

    logger.info("Conversation loaded:", {
      conversationId: conversation.conversationId,
      messageCount: conversation.messages.length,
      totalMessages: conversation.metadata.totalMessages,
      lastActivity: conversation.metadata.lastActivity,
    });

    // Load the coach config for context
    logger.info("👨‍🏫 Loading coach configuration..");
    const coachConfigItem = await getCoachConfig(event.userId, event.coachId);

    if (!coachConfigItem) {
      throw new Error(`Coach configuration not found: ${event.coachId}`);
    }

    const coachConfig = coachConfigItem;

    logger.info("Coach config loaded:", {
      coachName: coachConfig.coach_name,
      personality: coachConfig.selected_personality.primary_template,
      specializations: coachConfig.technical_config.specializations,
    });

    // Load user profile for critical training directive
    logger.info("📋 Loading user profile..");
    const userProfile = await getUserProfile(event.userId);

    // Check for existing conversation summary to build upon
    logger.info("🔍 Checking for existing conversation summary..");
    const existingSummaryItem = await getCoachConversationSummary(
      event.userId,
      event.conversationId,
    );
    const existingSummary = existingSummaryItem;

    if (existingSummary) {
      logger.info("Found existing summary to build upon:", {
        summaryId: existingSummary.summaryId,
        createdAt: existingSummary.metadata.createdAt,
        previousMessageCount:
          existingSummary.metadata.messageRange.totalMessages,
        confidence: existingSummary.metadata.confidence,
      });
    } else {
      logger.info(
        "No existing summary found - creating first summary for this conversation",
      );
    }

    // Build the summarization prompt
    logger.info("📝 Building conversation summary prompt..");
    const summaryPrompt = buildCoachConversationSummaryPrompt(
      conversation,
      coachConfig,
      existingSummary ?? undefined,
      userProfile?.criticalTrainingDirective,
    );

    logger.info("Generated summary prompt:", {
      promptLength: summaryPrompt.length,
      hasExistingSummary: !!existingSummary,
      messageCount: conversation.messages.length,
      promptPreview:
        summaryPrompt.substring(0, 1000) +
        (summaryPrompt.length > 1000 ? "..." : ""),
    });

    // Store prompt in S3 for debugging
    try {
      await storeDebugDataInS3(
        summaryPrompt,
        {
          type: "prompt",
          userId: event.userId,
          coachId: event.coachId,
          conversationId: event.conversationId,
          messageCount: conversation.messages.length,
          hasExistingSummary: !!existingSummary,
          promptLength: summaryPrompt.length,
        },
        "conversation-summary",
      );
      logger.info("✅ Stored conversation summary prompt in S3 for debugging");
    } catch (err) {
      logger.warn("⚠️ Failed to store prompt in S3 (non-critical):", err);
    }

    // Call Claude for conversation summarization using toolConfig
    logger.info(
      "🤖 Calling Claude for dual-format conversation summarization with toolConfig..",
    );
    const conversationContent = conversation.messages
      .map((msg: CoachMessage) => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    // Estimate token usage for monitoring
    const estimatedInputTokens = Math.ceil(
      (summaryPrompt.length + conversationContent.length) / 4,
    );
    logger.info("📊 Estimated token usage:", {
      promptChars: summaryPrompt.length,
      contentChars: conversationContent.length,
      totalChars: summaryPrompt.length + conversationContent.length,
      estimatedInputTokens,
      estimatedCost:
        "$" +
        ((estimatedInputTokens / 1000) * 0.003).toFixed(4) +
        " (input only)",
    });

    const startTime = Date.now();
    const toolResult = (await callBedrockApi(
      summaryPrompt,
      conversationContent,
      undefined, // Use default model
      {
        tools: [CONVERSATION_SUMMARY_TOOL],
        expectedToolName: "generate_conversation_summary",
      },
    )) as BedrockToolUseResult; // When using tools, always returns BedrockToolUseResult
    const endTime = Date.now();

    logger.info("⏱️ AI call completed:", {
      durationMs: endTime - startTime,
      durationSeconds: Math.round((endTime - startTime) / 1000),
      usedToolConfig: true,
      toolName: toolResult.toolName,
    });

    // Extract the structured summary data from tool result
    const summaryData = toolResult.input;
    logger.info("Claude summarization completed. Tool result:", {
      toolName: toolResult.toolName,
      narrativeLength: summaryData.narrative?.length || 0,
      hasGoals: Array.isArray(summaryData.current_goals),
      hasTrainingPreferences: Array.isArray(summaryData.training_preferences),
    });

    // Store tool result in S3 for debugging
    try {
      await storeDebugDataInS3(
        JSON.stringify(summaryData, null, 2),
        {
          type: "tool-result",
          userId: event.userId,
          coachId: event.coachId,
          conversationId: event.conversationId,
          toolName: toolResult.toolName,
          messageCount: conversation.messages.length,
        },
        "conversation-summary",
      );
      logger.info(
        "✅ Stored conversation summary tool result in S3 for debugging",
      );
    } catch (err) {
      logger.warn("⚠️ Failed to store tool result in S3 (non-critical):", err);
    }

    // Parse and validate the conversation summary from tool result
    logger.info("⚙️ Parsing conversation summary from tool result..");
    const summary = parseCoachConversationSummary(
      summaryData,
      event,
      conversation,
    );

    logger.info("Parsed conversation summary:", {
      summaryId: summary.summaryId,
      narrativeLength: summary.narrative.length,
      confidence: summary.metadata.confidence,
      goalCount: summary.structuredData.current_goals.length,
      progressCount: summary.structuredData.recent_progress.length,
      trainingPreferencesCount:
        summary.structuredData.training_preferences.length,
      insightCount: summary.structuredData.key_insights.length,
    });

    // Save the conversation summary to DynamoDB
    logger.info("💾 Saving conversation summary to DynamoDB..");
    await saveCoachConversationSummary(summary);

    // Update the conversation with generated tags if any were created
    if (
      summary.structuredData.conversation_tags &&
      summary.structuredData.conversation_tags.length > 0
    ) {
      logger.info(
        "🏷️ Updating conversation with generated tags:",
        summary.structuredData.conversation_tags,
      );
      try {
        await updateCoachConversation(
          event.userId,
          event.coachId,
          event.conversationId,
          {
            tags: summary.structuredData.conversation_tags,
          },
        );
        logger.info("✅ Conversation tags updated successfully");
      } catch (tagUpdateError) {
        logger.error(
          "⚠️ Failed to update conversation tags (non-critical):",
          tagUpdateError,
        );
        // Don't fail the summary generation for tag update errors
      }
    }

    // Store the summary in Pinecone for semantic search
    logger.info("🔍 Storing conversation summary in Pinecone..");
    const pineconeResult =
      await storeCoachConversationSummaryInPinecone(summary);

    logger.info("✅ Conversation summary generation completed successfully:", {
      summaryId: summary.summaryId,
      confidence: summary.metadata.confidence,
      triggerReason: summary.metadata.triggerReason,
      messageCount: summary.metadata.messageRange.totalMessages,
      pineconeStored: pineconeResult.success,
      pineconeRecordId:
        pineconeResult.success && "recordId" in pineconeResult
          ? pineconeResult.recordId
          : null,
    });

    return createOkResponse({
      success: true,
      summaryId: summary.summaryId,
      confidence: summary.metadata.confidence,
      triggerReason: summary.metadata.triggerReason,
      messageCount: summary.metadata.messageRange.totalMessages,
      narrativeLength: summary.narrative.length,
      structuredDataComplete: {
        goals: summary.structuredData.current_goals.length,
        progress: summary.structuredData.recent_progress.length,
        trainingPreferences: summary.structuredData.training_preferences.length,
        insights: summary.structuredData.key_insights.length,
      },
    });
  } catch (error) {
    logger.error("❌ Error generating conversation summary:", error);
    logger.error("Event data:", {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      triggerReason: event.triggerReason,
      messageCount: event.messageCount,
    });

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown summary generation error";
    return createErrorResponse(500, "Failed to generate conversation summary", {
      error: errorMessage,
      userId: event.userId,
      conversationId: event.conversationId,
      triggerReason: event.triggerReason,
    });
  }
};
