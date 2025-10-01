import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
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
} from "../libs/coach-conversation";
import { updateCoachConversation } from "../../dynamodb/operations";

export const handler = async (event: BuildCoachConversationSummaryEvent) => {
  try {
    console.info("💬 Starting conversation summary generation:", {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      triggerReason: event.triggerReason,
      messageCount: event.messageCount,
      complexityIndicators: event.complexityIndicators,
      timestamp: new Date().toISOString(),
    });

    // Load the conversation with full message history
    console.info("📖 Loading conversation from DynamoDB...");
    const conversationItem = await getCoachConversation(
      event.userId,
      event.coachId,
      event.conversationId
    );

    if (!conversationItem) {
      throw new Error(`Conversation not found: ${event.conversationId}`);
    }

    const conversation = conversationItem.attributes;

    console.info("Conversation loaded:", {
      conversationId: conversation.conversationId,
      messageCount: conversation.messages.length,
      totalMessages: conversation.metadata.totalMessages,
      lastActivity: conversation.metadata.lastActivity,
    });

    // Load the coach config for context
    console.info("👨‍🏫 Loading coach configuration...");
    const coachConfigItem = await getCoachConfig(event.userId, event.coachId);

    if (!coachConfigItem) {
      throw new Error(`Coach configuration not found: ${event.coachId}`);
    }

    const coachConfig = coachConfigItem.attributes;

    console.info("Coach config loaded:", {
      coachName: coachConfig.coach_name,
      personality: coachConfig.selected_personality.primary_template,
      specializations: coachConfig.technical_config.specializations,
    });

    // Load user profile for critical training directive
    console.info("📋 Loading user profile...");
    const userProfile = await getUserProfile(event.userId);

    // Check for existing conversation summary to build upon
    console.info("🔍 Checking for existing conversation summary...");
    const existingSummaryItem = await getCoachConversationSummary(
      event.userId,
      event.conversationId
    );
    const existingSummary = existingSummaryItem?.attributes;

    if (existingSummary) {
      console.info("Found existing summary to build upon:", {
        summaryId: existingSummary.summaryId,
        createdAt: existingSummary.metadata.createdAt,
        previousMessageCount:
          existingSummary.metadata.messageRange.totalMessages,
        confidence: existingSummary.metadata.confidence,
      });
    } else {
      console.info(
        "No existing summary found - creating first summary for this conversation"
      );
    }

    // Build the summarization prompt
    console.info("📝 Building conversation summary prompt...");
    const summaryPrompt = buildCoachConversationSummaryPrompt(
      conversation,
      coachConfig,
      existingSummary,
      userProfile?.attributes?.criticalTrainingDirective
    );

    console.info("Generated summary prompt:", {
      promptLength: summaryPrompt.length,
      hasExistingSummary: !!existingSummary,
      messageCount: conversation.messages.length,
      promptPreview:
        summaryPrompt.substring(0, 1000) +
        (summaryPrompt.length > 1000 ? "..." : ""),
    });

    // Call Claude for conversation summarization
    console.info("🤖 Calling Claude for conversation summarization...");
    const conversationContent = conversation.messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    const aiResponse = await callBedrockApi(summaryPrompt, conversationContent);

    console.info("Claude summarization completed. Raw response:", {
      responseLength: aiResponse.length,
      responsePreview:
        aiResponse.substring(0, 500) + (aiResponse.length > 500 ? "..." : ""),
    });

    // Parse and validate the conversation summary
    console.info("⚙️ Parsing conversation summary...");
    const summary = parseCoachConversationSummary(
      aiResponse,
      event,
      conversation
    );

    console.info("Parsed conversation summary:", {
      summaryId: summary.summaryId,
      narrativeLength: summary.narrative.length,
      confidence: summary.metadata.confidence,
      goalCount: summary.structuredData.current_goals.length,
      progressCount: summary.structuredData.recent_progress.length,
      hasEmotionalState: !!summary.structuredData.emotional_state.current_mood,
      insightCount: summary.structuredData.key_insights.length,
    });

    // Save the conversation summary to DynamoDB
    console.info("💾 Saving conversation summary to DynamoDB...");
    await saveCoachConversationSummary(summary);

    // Update the conversation with generated tags if any were created
    if (
      summary.structuredData.conversation_tags &&
      summary.structuredData.conversation_tags.length > 0
    ) {
      console.info(
        "🏷️ Updating conversation with generated tags:",
        summary.structuredData.conversation_tags
      );
      try {
        await updateCoachConversation(
          event.userId,
          event.coachId,
          event.conversationId,
          {
            tags: summary.structuredData.conversation_tags,
          }
        );
        console.info("✅ Conversation tags updated successfully");
      } catch (tagUpdateError) {
        console.error(
          "⚠️ Failed to update conversation tags (non-critical):",
          tagUpdateError
        );
        // Don't fail the summary generation for tag update errors
      }
    }

    // Store the summary in Pinecone for semantic search
    console.info("🔍 Storing conversation summary in Pinecone...");
    const pineconeResult =
      await storeCoachConversationSummaryInPinecone(summary);

    console.info("✅ Conversation summary generation completed successfully:", {
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
        insights: summary.structuredData.key_insights.length,
        hasEmotionalState:
          !!summary.structuredData.emotional_state.current_mood,
      },
    });
  } catch (error) {
    console.error("❌ Error generating conversation summary:", error);
    console.error("Event data:", {
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
