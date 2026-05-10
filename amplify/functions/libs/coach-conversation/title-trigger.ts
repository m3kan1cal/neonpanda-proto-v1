/**
 * Coach conversation title trigger.
 *
 * Decides whether to fire-and-forget invoke build-conversation-title for a
 * coach conversation (which also covers the contextual chat drawers since
 * those reuse the same entity). Plugged into process-post-turn.
 *
 * Trigger conditions:
 *   - currentMessageCount === 2 (just completed the first user-AI exchange)
 *   - the conversation's title is still a default
 *
 * Surface context is derived from conversation tags so a contextual chat
 * (e.g., from the Program Dashboard inline drawer) gets a title that fits
 * the surface it was created on.
 */

import { getCoachConversation } from "../../../dynamodb/operations";
import { invokeAsyncLambda } from "../api-helpers";
import { isDefaultTitle } from "../title-generation/prompt";
import { logger } from "../logger";

interface MaybeTriggerTitleArgs {
  userId: string;
  coachId: string;
  conversationId: string;
  userMessage: string;
  aiResponse: string;
  currentMessageCount: number;
}

export async function maybeTriggerTitleGeneration(
  args: MaybeTriggerTitleArgs,
): Promise<{ triggered: boolean; reason?: string }> {
  if (args.currentMessageCount !== 2) {
    return { triggered: false, reason: "not_first_turn" };
  }

  const functionName = process.env.BUILD_CONVERSATION_TITLE_FUNCTION_NAME;
  if (!functionName) {
    logger.warn(
      "⚠️ BUILD_CONVERSATION_TITLE_FUNCTION_NAME not set — skipping title generation",
    );
    return { triggered: false, reason: "function_name_missing" };
  }

  // Load the conversation to read tags + current title.
  let conversation;
  try {
    conversation = await getCoachConversation(
      args.userId,
      args.coachId,
      args.conversationId,
    );
  } catch (error) {
    logger.error("⚠️ Failed to load conversation for title trigger:", error);
    return { triggered: false, reason: "load_failed" };
  }

  if (!conversation) {
    return { triggered: false, reason: "conversation_not_found" };
  }

  if (!isDefaultTitle(conversation.title)) {
    return { triggered: false, reason: "title_already_set" };
  }

  const tags: string[] = conversation.metadata?.tags ?? [];
  const surfaceContext = deriveSurfaceContext(tags);

  try {
    await invokeAsyncLambda(
      functionName,
      {
        entityType: "coachConversation",
        userId: args.userId,
        coachId: args.coachId,
        conversationId: args.conversationId,
        userMessage: args.userMessage,
        aiResponse: args.aiResponse,
        tags,
        surfaceContext,
      },
      `title generation for conversation ${args.conversationId}`,
    );
    return { triggered: true };
  } catch (error) {
    logger.error(
      "⚠️ Failed to invoke build-conversation-title (non-blocking):",
      error,
    );
    return { triggered: false, reason: "invoke_failed" };
  }
}

/**
 * Map known contextual chat tags to a human-readable surface label that the
 * title prompt can use to steer phrasing. Returns undefined for plain
 * (non-contextual) coach conversations.
 */
function deriveSurfaceContext(tags: string[]): string | undefined {
  for (const tag of tags) {
    if (tag === "training_grounds_inline") {
      return "Training Grounds inline chat";
    }
    if (tag === "training_pulse_inline") {
      return "Training Pulse inline chat";
    }
    if (tag === "view_reports_inline") {
      return "View Reports inline chat";
    }
    if (tag.startsWith("program_dashboard_inline:")) {
      return "Program Dashboard inline chat";
    }
    if (tag.startsWith("view_workouts_inline:")) {
      return "View Workouts inline chat";
    }
    if (tag.startsWith("weekly_report_inline:")) {
      return "Weekly Report inline chat";
    }
    if (tag.startsWith("monthly_report_inline:")) {
      return "Monthly Report inline chat";
    }
  }
  return undefined;
}
