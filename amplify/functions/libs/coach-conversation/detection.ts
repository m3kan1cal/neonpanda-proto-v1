/**
 * Coach Conversation Detection
 *
 * This module contains detection logic for coach conversation events and triggers,
 * including complexity detection for conversation summarization.
 */

import { invokeAsyncLambda, callBedrockApi, MODEL_IDS } from '../api-helpers';

/**
 * Detect if the user's message contains complexity triggers that warrant immediate conversation summarization
 * @param userMessage - The user's message to analyze
 * @param messageContext - Optional context from the conversation
 * @returns Promise<boolean> indicating if complexity triggers are present
 */
export async function detectConversationComplexity(
  userMessage: string,
  messageContext?: string
): Promise<boolean> {
  const systemPrompt = `You are an AI assistant that analyzes user messages in fitness coaching conversations to detect complexity that warrants immediate conversation summarization.

TASK: Determine if the user's message contains complexity triggers that indicate the conversation has reached a point where summarization would be valuable for maintaining context and coaching effectiveness.

COMPLEXITY INDICATORS:
- Goal-setting and planning language ("my goal", "working toward", "trying to achieve", "planning to")
- Strong emotional language (positive: "stoked", "crushed it", "breakthrough"; negative: "frustrated", "devastated", "struggling")
- Major changes or setbacks ("injury", "can't do", "switching to", "plateau", "not working")
- Significant achievements ("PR", "first time", "milestone", "breakthrough", "major improvement")
- Coaching relationship dynamics ("you understand", "your approach", "coaching style", "connection")
- Life/schedule changes ("busy", "new job", "time constraints", "life change", "priorities")
- Health/physical status changes ("pain", "recovery", "energy levels", "feeling strong/weak")
- Program/approach modifications ("different approach", "new program", "methodology change")
- Motivation/mindset shifts ("giving up", "losing motivation", "inspired", "committed")
- Social/support context changes ("family", "accountability", "support", "pressure")
- Learning breakthroughs ("clicked", "figured it out", "makes sense now", "epiphany")
- Competition/performance context ("competition", "event", "performance", "season")
- Nutrition/lifestyle factors ("diet", "lifestyle", "habits", "body composition")

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object:
{
  "hasComplexity": boolean,
  "confidence": number (0.0 to 1.0),
  "complexityTypes": ["emotional", "goal", "achievement", "setback", "relationship", "lifestyle", "learning", "health"],
  "reasoning": "brief explanation of complexity detected or why none found"
}

GUIDELINES:
- Look for emotional intensity, significant changes, achievements, or relationship dynamics
- Consider if the message indicates a meaningful shift in the user's journey
- Higher confidence for clear emotional language or major life/training changes
- Be generous - better to trigger summarization than miss important context shifts`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ""}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message for complexity triggers that would warrant conversation summarization.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.NOVA_MICRO
    );
    const result = JSON.parse(response);

    return result.hasComplexity || false;
  } catch (error) {
    console.error("Error in conversation complexity detection:", error);
    // Conservative fallback - assume no complexity to avoid unnecessary summaries
    return false;
  }
}



/**
 * Detect if conversation summary should be triggered and trigger it if needed
 * @param userId - User ID
 * @param coachId - Coach ID
 * @param conversationId - Conversation ID
 * @param userMessage - The user's message to analyze for complexity
 * @param currentMessageCount - Current total message count in conversation
 * @param messageContext - Optional context from the conversation
 * @returns Object indicating if summary was triggered and the reason
 */
export async function detectAndProcessConversationSummary(
  userId: string,
  coachId: string,
  conversationId: string,
  userMessage: string,
  currentMessageCount: number,
  messageContext?: string
): Promise<{
  triggered: boolean;
  triggerReason?: 'message_count' | 'complexity';
  complexityDetected: boolean;
}> {
  const hasComplexityTriggers = await detectConversationComplexity(userMessage, messageContext);
  const shouldTriggerSummary =
    currentMessageCount % 6 === 0 || hasComplexityTriggers;

  if (!shouldTriggerSummary) {
    return {
      triggered: false,
      complexityDetected: hasComplexityTriggers
    };
  }

  const triggerReason =
    currentMessageCount % 6 === 0 ? "message_count" : "complexity";

  console.info("🔄 Conversation summary trigger detected:", {
    conversationId,
    totalMessages: currentMessageCount,
    triggeredBy: triggerReason,
    complexityDetected: hasComplexityTriggers,
  });

  try {
    // Trigger async conversation summary generation
    const summaryFunction = process.env.BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME;
    if (!summaryFunction) {
      console.warn(
        "⚠️ BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME environment variable not set"
      );
      return {
        triggered: false,
        triggerReason,
        complexityDetected: hasComplexityTriggers
      };
    }

    await invokeAsyncLambda(
      summaryFunction,
      {
        userId,
        coachId,
        conversationId,
        triggerReason,
        messageCount: currentMessageCount,
        complexityIndicators: hasComplexityTriggers
          ? ["complexity_detected"]
          : undefined,
      },
      "conversation summary generation"
    );

    return {
      triggered: true,
      triggerReason,
      complexityDetected: hasComplexityTriggers
    };
  } catch (error) {
    console.error(
      "❌ Failed to trigger conversation summary generation:",
      error
    );
    return {
      triggered: false,
      triggerReason,
      complexityDetected: hasComplexityTriggers
    };
  }
}
