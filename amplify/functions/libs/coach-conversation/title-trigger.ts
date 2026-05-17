/**
 * Coach conversation title trigger.
 *
 * Decides whether to fire-and-forget invoke build-conversation-title for a
 * coach conversation (which also covers the contextual chat drawers since
 * those reuse the same entity). Plugged into process-post-turn.
 *
 * Trigger conditions:
 *   - currentMessageCount === 2 (just completed the first user-AI exchange)
 *   - the conversation's title is still a default, OR the conversation
 *     originated from a contextual chat drawer (whose placeholder titles
 *     like "Manage Workouts" / "Day 5" / "Weekly Report — 2026-01-01" are
 *     system-assigned, not user-authored).
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

/**
 * Tag-shape predicate for inline-drawer conversation tags. Matches both
 * flat tags (e.g. "training_grounds_inline", "manage_workouts_inline")
 * and scoped tags (e.g. "program_dashboard_inline:p_123"). Used as the
 * signal that a conversation's current title is a system-assigned
 * placeholder and is eligible to be overwritten by AI title generation.
 */
export function isInlineDrawerTag(tag: string): boolean {
  return tag.endsWith("_inline") || tag.includes("_inline:");
}

export function hasInlineDrawerTag(tags: readonly string[]): boolean {
  return tags.some(isInlineDrawerTag);
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

  const tags: string[] = conversation.metadata?.tags ?? [];
  const fromInlineDrawer = hasInlineDrawerTag(tags);

  // Inline-drawer conversations are created with non-default placeholder
  // titles ("Manage Workouts", "Day 5", etc.). Treat those as overwritable
  // on the first AI exchange; the currentMessageCount === 2 outer gate
  // ensures we can never clobber a later manual rename.
  if (!fromInlineDrawer && !isDefaultTitle(conversation.title)) {
    return { triggered: false, reason: "title_already_set" };
  }

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
        allowPlaceholderOverwrite: fromInlineDrawer,
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
export function deriveSurfaceContext(tags: string[]): string | undefined {
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
    if (tag === "manage_workouts_inline") {
      return "Manage Workouts inline chat";
    }
    if (tag === "manage_exercises_inline") {
      return "Manage Exercises inline chat";
    }
    if (tag === "manage_memories_inline") {
      return "Manage Memories inline chat";
    }
    if (tag === "manage_conversations_inline") {
      return "Manage Conversations inline chat";
    }
    if (tag === "manage_shared_programs_inline") {
      return "Manage Shared Programs inline chat";
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
