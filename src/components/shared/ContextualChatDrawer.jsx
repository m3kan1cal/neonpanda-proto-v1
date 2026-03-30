/**
 * ContextualChatDrawer — reusable AI copilot-style chat panel for entity editing.
 *
 * Desktop (lg+): right-side slide-over, ~420px wide, overlays content with a semi-transparent backdrop.
 * Mobile (<lg): full-screen takeover, slides up from bottom.
 *
 * Pattern: matches standard AI-native editing interfaces (GitHub Copilot, Cursor, Notion AI).
 * The AI loads entity context automatically on first turn and proposes changes before applying them.
 *
 * Currently wired for entityType="workout". Extensible to "program" and other entity types.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
  useMemo,
} from "react";
import CoachConversationAgent from "../../utils/agents/CoachConversationAgent";
import ChatInput from "./ChatInput";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ContextualUpdateIndicator } from "../../utils/ui/streamingUiHelper.jsx";
import {
  contextualDrawerPatterns,
  avatarPatterns,
  badgePatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { CONVERSATION_MODES } from "../../constants/conversationModes";
import { CloseIcon, EditIcon } from "../themes/SynthwaveComponents";
import { useToast } from "../../contexts/ToastContext";
import { logger } from "../../utils/logger";

// Initial auto-prompt to trigger the AI to load workout context on first open
const INITIAL_PROMPT =
  "Please load my workout details so we can get started. I have some corrections to make.";

/**
 * ContextualChatDrawer
 *
 * @param {boolean} isOpen - Controls visibility
 * @param {Function} onClose - Called when the drawer is closed
 * @param {string} entityType - "workout" (extensible to "program", etc.)
 * @param {string} entityId - The entity ID being edited
 * @param {string} entityLabel - Display name for the entity (e.g., workout title)
 * @param {string} userId - The authenticated user's ID
 * @param {string} coachId - The coach ID for the conversation
 * @param {Object} coachData - Coach info ({ name, avatar, etc. })
 * @param {Function} onEntityUpdated - Callback to refresh parent after a successful edit
 */
export default function ContextualChatDrawer({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityLabel,
  userId,
  coachId,
  coachData,
  onEntityUpdated,
}) {
  const { showToast } = useToast();
  const headingId = useId();

  const [agentState, setAgentState] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);

  const agentRef = useRef(null);
  const desktopMessageAreaRef = useRef(null);
  const mobileMessageAreaRef = useRef(null);
  const desktopInputFocusRef = useRef(null);
  const mobileInputFocusRef = useRef(null);
  const closeTriggerRef = useRef(null);
  const lastEditMessageIdRef = useRef(null);

  const coachInitial = coachData?.name?.[0]?.toUpperCase() || "C";
  const editContext = useMemo(
    () => (entityType && entityId ? { entityType, entityId } : null),
    [entityType, entityId],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Agent lifecycle — create a fresh conversation each time the drawer opens
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !userId || !coachId || !entityId) return;

    let cancelled = false;

    async function initConversation() {
      setIsInitializing(true);
      lastEditMessageIdRef.current = null;

      const agent = new CoachConversationAgent({
        userId,
        coachId,
        onStateChange: (state) => {
          if (!cancelled) setAgentState({ ...state });
        },
        onError: (err) => {
          logger.error("ContextualChatDrawer agent error:", err);
        },
      });

      agentRef.current = agent;

      try {
        const conversationTitle = `Edit: ${entityLabel || entityType}`;
        await agent.createConversation(
          userId,
          coachId,
          conversationTitle,
          null,
          CONVERSATION_MODES.WORKOUT_EDIT,
        );

        if (cancelled) return;

        // Auto-send the initial prompt so the AI loads context immediately
        await agent.sendMessageStream(INITIAL_PROMPT, [], editContext);
      } catch (err) {
        if (!cancelled) {
          logger.error(
            "ContextualChatDrawer: failed to initialize conversation:",
            err,
          );
          showToast("Failed to open edit session. Please try again.", "error");
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    initConversation();

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, coachId, entityId]); // intentionally excludes entityLabel to avoid re-init on title change

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-scroll message area to bottom on new messages (target visible panel)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!agentState?.messages) return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const ref = isDesktop ? desktopMessageAreaRef : mobileMessageAreaRef;
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [
    agentState?.messages,
    agentState?.streamingMessage,
    agentState?.contextualUpdate,
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // Focus management — move focus to input on open, back to trigger on close
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        const ref = isDesktop ? desktopInputFocusRef : mobileInputFocusRef;
        ref.current?.focus();
      }, 320);
      return () => clearTimeout(timer);
    } else {
      closeTriggerRef.current?.focus();
    }
  }, [isOpen]);

  // ──────────────────────────────────────────────────────────────────────────
  // Detect when apply_workout_edits tool was used and trigger parent refresh.
  // Tracks the last processed message ID so every new edit fires the callback.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!agentState?.messages) return;

    const lastAssistant = [...agentState.messages]
      .reverse()
      .find((m) => m.type === "assistant" || m.role === "assistant");

    const messageId = lastAssistant?.id || lastAssistant?.messageId;

    if (
      lastAssistant &&
      messageId !== lastEditMessageIdRef.current &&
      lastAssistant.metadata?.agent?.toolsUsed?.includes("apply_workout_edits")
    ) {
      lastEditMessageIdRef.current = messageId;
      if (typeof onEntityUpdated === "function") {
        onEntityUpdated();
      }
    }
  }, [agentState?.messages, onEntityUpdated]);

  // ──────────────────────────────────────────────────────────────────────────
  // Escape key to close
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ──────────────────────────────────────────────────────────────────────────
  // Message send handler
  // ──────────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (messageContent, imageS3Keys = []) => {
      if (!agentRef.current || !messageContent.trim()) return;
      setInputMessage("");

      try {
        await agentRef.current.sendMessageStream(
          messageContent.trim(),
          imageS3Keys,
          editContext,
        );
      } catch (err) {
        logger.error("ContextualChatDrawer: sendMessageStream failed:", err);
      }
    },
    [editContext],
  );

  const isStreaming =
    agentState?.isStreaming || agentState?.isTyping || isInitializing;
  const messages = agentState?.messages || [];
  const contextualUpdate = agentState?.contextualUpdate;
  const streamingMessage = agentState?.streamingMessage;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — click to close (desktop/tablet only) */}
      <div
        className={`${contextualDrawerPatterns.backdrop} lg:block hidden`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-label={`Edit ${entityLabel || entityType} with AI coach`}
        className={[
          // Desktop: right slide-over
          `hidden lg:flex ${contextualDrawerPatterns.panelDesktop}`,
          // Slide-in animation
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <PanelContent
          headingId={headingId}
          entityLabel={entityLabel}
          entityType={entityType}
          coachData={coachData}
          coachInitial={coachInitial}
          onClose={onClose}
          messageAreaRef={desktopMessageAreaRef}
          messages={messages}
          contextualUpdate={contextualUpdate}
          streamingMessage={streamingMessage}
          isStreaming={isStreaming}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSend={handleSend}
          inputFocusRef={desktopInputFocusRef}
          userId={userId}
        />
      </div>

      {/* Mobile: full-screen takeover */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${headingId}-mobile`}
        aria-label={`Edit ${entityLabel || entityType} with AI coach`}
        className={[
          `flex lg:hidden ${contextualDrawerPatterns.panelMobile}`,
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <PanelContent
          headingId={`${headingId}-mobile`}
          entityLabel={entityLabel}
          entityType={entityType}
          coachData={coachData}
          coachInitial={coachInitial}
          onClose={onClose}
          messageAreaRef={mobileMessageAreaRef}
          messages={messages}
          contextualUpdate={contextualUpdate}
          streamingMessage={streamingMessage}
          isStreaming={isStreaming}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSend={handleSend}
          inputFocusRef={mobileInputFocusRef}
          userId={userId}
        />
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Inner panel content (shared between desktop/mobile renders)
// ──────────────────────────────────────────────────────────────────────────────
function PanelContent({
  headingId,
  entityLabel,
  entityType,
  coachData,
  coachInitial,
  onClose,
  messageAreaRef,
  messages,
  contextualUpdate,
  streamingMessage,
  isStreaming,
  inputMessage,
  setInputMessage,
  handleSend,
  inputFocusRef,
  userId,
}) {
  return (
    <>
      {/* Header */}
      <div className={contextualDrawerPatterns.header}>
        {/* Coach avatar */}
        <div className={`${avatarPatterns.coachSmall} shrink-0`}>
          {coachInitial}
        </div>

        {/* Entity label */}
        <div className="flex-1 min-w-0">
          <div id={headingId} className={contextualDrawerPatterns.headerLabel}>
            {entityLabel || `Editing ${entityType}`}
          </div>
        </div>

        {/* "Editing" badge */}
        <span className={contextualDrawerPatterns.headerBadge}>
          <EditIcon />
          <span className="ml-1">Editing</span>
        </span>

        {/* Beta badge */}
        <span className="shrink-0 px-1.5 py-0.5 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded-md text-synthwave-neon-purple font-body text-[10px] font-bold uppercase tracking-wider">
          Beta
        </span>

        {/* Close button */}
        <button
          type="button"
          className={contextualDrawerPatterns.closeButton}
          onClick={onClose}
          aria-label="Close edit session"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Message area */}
      <div
        ref={messageAreaRef}
        className={contextualDrawerPatterns.messageArea}
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <p className={`${typographyPatterns.bodySmall} text-center`}>
              Starting edit session…
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id || message.messageId}
            message={message}
            coachInitial={coachInitial}
          />
        ))}

        {/* Live streaming response */}
        {streamingMessage && (
          <div className="flex gap-2">
            <div className={`${avatarPatterns.coachSmall} shrink-0 mt-0.5`}>
              {coachInitial}
            </div>
            <div className={contextualDrawerPatterns.aiMessage}>
              <MarkdownRenderer content={streamingMessage} />
            </div>
          </div>
        )}

        {/* Contextual update indicator (tool-use feedback) */}
        {contextualUpdate && (
          <ContextualUpdateIndicator
            content={contextualUpdate.content}
            avatarLabel={coachInitial}
            compact={true}
          />
        )}
      </div>

      {/* Pinned input area */}
      <div className={contextualDrawerPatterns.inputArea}>
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSubmit={handleSend}
          isTyping={isStreaming}
          placeholder="Describe what you'd like to correct…"
          userId={userId}
          coachName={coachData?.name || "Coach"}
          context="coaching"
          enableRecording={false}
          enablePhotoAttachment={false}
          enableFileAttachment={false}
          showTipsButton={false}
          showDeleteButton={false}
          enableSlashCommands={false}
          textareaRef={inputFocusRef}
        />
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Individual message bubble
// ──────────────────────────────────────────────────────────────────────────────
function MessageBubble({ message, coachInitial }) {
  const isUser = message.type === "user" || message.role === "user";
  const content =
    message.content || message.displayContent || message.streamingContent || "";

  if (!content) return null;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className={contextualDrawerPatterns.userMessage}>
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className={`${avatarPatterns.coachSmall} shrink-0 mt-0.5`}>
        {coachInitial}
      </div>
      <div className={contextualDrawerPatterns.aiMessage}>
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}
