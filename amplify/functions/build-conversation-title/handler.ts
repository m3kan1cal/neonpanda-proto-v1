/**
 * Build Conversation Title Lambda
 *
 * Generates a short, descriptive AI title for a newly-created conversation
 * or session, then writes it back to the underlying entity. Triggered async
 * (fire-and-forget) after the first user-AI exchange completes.
 *
 * Handles four flows via a discriminated event type:
 *   - coachConversation       (also used for contextual chat drawers)
 *   - coachCreatorSession
 *   - programDesignerSession
 *
 * Failure mode: this Lambda must never throw to its caller. On any error
 * it logs and exits silently — the entity keeps its existing default title.
 */

import {
  callBedrockApi,
  createOkResponse,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
  type BedrockToolUseResult,
} from "../libs/api-helpers";
import {
  getCoachConversation,
  getCoachCreatorSession,
  getProgramDesignerSession,
  updateCoachConversation,
  updateCoachCreatorSession,
  updateProgramDesignerSession,
} from "../../dynamodb/operations";
import { CONVERSATION_TITLE_TOOL } from "../libs/schemas/conversation-title-schema";
import {
  buildConversationTitlePrompt,
  isDefaultTitle,
  normalizeAiTitle,
  type TitleEntityType,
} from "../libs/title-generation/prompt";
import { logger } from "../libs/logger";

interface CoachConversationTitleEvent {
  entityType: "coachConversation";
  userId: string;
  coachId: string;
  conversationId: string;
  userMessage: string;
  aiResponse: string;
  tags?: string[];
  surfaceContext?: string;
  // Set by title-trigger when the conversation originated from a contextual
  // chat drawer. Those conversations are created with non-default placeholder
  // titles (e.g., "Manage Workouts", "Day 5") that must still be overwritten
  // by AI title generation on the first user-AI exchange.
  allowPlaceholderOverwrite?: boolean;
}

interface CoachCreatorSessionTitleEvent {
  entityType: "coachCreatorSession";
  userId: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
}

interface ProgramDesignerSessionTitleEvent {
  entityType: "programDesignerSession";
  userId: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
}

export type BuildConversationTitleEvent =
  | CoachConversationTitleEvent
  | CoachCreatorSessionTitleEvent
  | ProgramDesignerSessionTitleEvent;

const MIN_USER_MESSAGE_LENGTH = 10;

export const handler = async (event: BuildConversationTitleEvent) => {
  const startedAt = Date.now();

  try {
    logger.info("🏷️ build-conversation-title invoked:", {
      entityType: event.entityType,
      userId: event.userId,
      userMessageLength: event.userMessage?.length ?? 0,
      aiResponseLength: event.aiResponse?.length ?? 0,
    });

    // Skip if first message is too short to title meaningfully (e.g., "hi").
    if (
      !event.userMessage ||
      event.userMessage.trim().length < MIN_USER_MESSAGE_LENGTH
    ) {
      logger.info(
        "⏭️ Skipping title generation — user message too short",
        { entityType: event.entityType, length: event.userMessage?.length },
      );
      return createOkResponse({ success: false, reason: "message_too_short" });
    }

    if (!event.aiResponse || event.aiResponse.trim().length === 0) {
      logger.info("⏭️ Skipping title generation — AI response empty");
      return createOkResponse({ success: false, reason: "empty_ai_response" });
    }

    // Idempotency: skip if the entity already has a non-default title
    // (user already renamed it manually). Distinguish "entity not found"
    // from "entity has no title" — sessions are created without a title,
    // so an undefined title is normal and should NOT short-circuit.
    const before = await loadCurrentTitle(event);
    if (!before.found) {
      logger.warn("⚠️ Entity not found — skipping title generation", {
        entityType: event.entityType,
      });
      return createOkResponse({ success: false, reason: "entity_not_found" });
    }

    // Inline-drawer conversations are created with non-default placeholder
    // titles ("Manage Workouts", "Day 5", etc.). The trigger sets
    // allowPlaceholderOverwrite when those tags are present so we bypass
    // the default-title guard for the initial AI title write.
    const allowPlaceholderOverwrite =
      event.entityType === "coachConversation" &&
      event.allowPlaceholderOverwrite === true;

    if (!allowPlaceholderOverwrite && !isDefaultTitle(before.title)) {
      logger.info("⏭️ Skipping title generation — non-default title already set", {
        entityType: event.entityType,
        currentTitle: before.title,
      });
      return createOkResponse({
        success: false,
        reason: "title_already_set",
      });
    }

    // Build prompt and call Bedrock (Nova Lite, structured tool use)
    const { systemPrompt, userMessage } = buildConversationTitlePrompt({
      entityType: event.entityType as TitleEntityType,
      userMessage: event.userMessage,
      aiResponse: event.aiResponse,
      surfaceContext:
        "surfaceContext" in event ? event.surfaceContext : undefined,
      tags: "tags" in event ? event.tags : undefined,
    });

    const modelId = MODEL_IDS.UTILITY_MODEL_FULL;

    const aiStartedAt = Date.now();
    const toolResult = (await callBedrockApi(systemPrompt, userMessage, modelId, {
      tools: [CONVERSATION_TITLE_TOOL],
      expectedToolName: "generate_conversation_title",
      temperature: TEMPERATURE_PRESETS.STRUCTURED,
    })) as BedrockToolUseResult;
    const aiElapsedMs = Date.now() - aiStartedAt;

    if (!toolResult || typeof toolResult !== "object" || !toolResult.input) {
      logger.warn("⚠️ Tool result missing — aborting title update", {
        entityType: event.entityType,
        aiElapsedMs,
      });
      return createOkResponse({ success: false, reason: "no_tool_result" });
    }

    const rawTitle = toolResult.input.title;
    const title = normalizeAiTitle(rawTitle);

    if (!title) {
      logger.warn("⚠️ Generated title failed validation — aborting", {
        entityType: event.entityType,
        rawTitle,
      });
      return createOkResponse({
        success: false,
        reason: "invalid_generated_title",
      });
    }

    // Final guard: don't overwrite an entity that was renamed during the
    // ~1-2 second AI call window. Disabled for inline-drawer conversations
    // where the placeholder title is system-assigned; the outer
    // currentMessageCount === 2 gate at the trigger ensures this can only
    // fire once per conversation, so a later manual rename can't be clobbered.
    const after = await loadCurrentTitle(event);
    if (
      after.found &&
      !allowPlaceholderOverwrite &&
      !isDefaultTitle(after.title)
    ) {
      logger.info(
        "⏭️ Skipping write — title was set by another writer during AI call",
        { entityType: event.entityType, titleAfterAi: after.title },
      );
      return createOkResponse({
        success: false,
        reason: "title_set_during_generation",
      });
    }

    await applyTitleUpdate(event, title);

    logger.info("✅ Title generated and saved:", {
      entityType: event.entityType,
      title,
      aiElapsedMs,
      totalElapsedMs: Date.now() - startedAt,
    });

    return createOkResponse({ success: true, title });
  } catch (error) {
    // Never throw — this Lambda is fire-and-forget and must not affect
    // the user-facing flow.
    logger.error("⚠️ build-conversation-title failed (non-blocking):", {
      entityType: event?.entityType,
      error: error instanceof Error ? error.message : String(error),
    });
    return createOkResponse({
      success: false,
      reason: "exception",
      error: error instanceof Error ? error.message : "unknown",
    });
  }
};

interface LoadedTitle {
  found: boolean;
  title: string | undefined;
}

async function loadCurrentTitle(
  event: BuildConversationTitleEvent,
): Promise<LoadedTitle> {
  switch (event.entityType) {
    case "coachConversation": {
      const conv = await getCoachConversation(
        event.userId,
        event.coachId,
        event.conversationId,
      );
      if (!conv) return { found: false, title: undefined };
      return { found: true, title: conv.title };
    }
    case "coachCreatorSession": {
      const session = await getCoachCreatorSession(
        event.userId,
        event.sessionId,
      );
      if (!session) return { found: false, title: undefined };
      return { found: true, title: session.title };
    }
    case "programDesignerSession": {
      const session = await getProgramDesignerSession(
        event.userId,
        event.sessionId,
      );
      if (!session) return { found: false, title: undefined };
      return { found: true, title: session.title };
    }
  }
}

async function applyTitleUpdate(
  event: BuildConversationTitleEvent,
  title: string,
): Promise<void> {
  switch (event.entityType) {
    case "coachConversation":
      await updateCoachConversation(
        event.userId,
        event.coachId,
        event.conversationId,
        { title },
      );
      return;
    case "coachCreatorSession":
      await updateCoachCreatorSession(event.userId, event.sessionId, { title });
      return;
    case "programDesignerSession":
      await updateProgramDesignerSession(event.userId, event.sessionId, {
        title,
      });
      return;
  }
}
