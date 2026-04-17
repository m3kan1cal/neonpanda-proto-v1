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
import ImageWithPresignedUrl from "./ImageWithPresignedUrl";
import DocumentThumbnail from "./DocumentThumbnail";
import { ContextualUpdateIndicator } from "../../utils/ui/streamingUiHelper.jsx";
import {
  contextualDrawerPatterns,
  avatarPatterns,
  badgePatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { CONVERSATION_MODES } from "../../constants/conversationModes";
import { CloseIcon } from "../themes/SynthwaveComponents";
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
  userInitial = "U",
}) {
  const { showToast } = useToast();
  const headingId = useId();

  const [agentState, setAgentState] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(
    () => localStorage.getItem("neonpanda-chat-drawer-expanded") === "true",
  );

  const agentRef = useRef(null);
  const desktopMessageAreaRef = useRef(null);
  const mobileMessageAreaRef = useRef(null);
  const desktopInputFocusRef = useRef(null);
  const mobileInputFocusRef = useRef(null);
  const closeTriggerRef = useRef(null);
  const lastEditMessageIdRef = useRef(null);
  const loadedEntityIdRef = useRef(null);

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

    // Skip re-init if we already loaded this entity (drawer was just closed and reopened).
    // Rebind onStateChange so the agent's updates aren't dropped by the previous effect's
    // stale `cancelled` flag, and resync the UI to the agent's current state.
    if (agentRef.current && loadedEntityIdRef.current === entityId) {
      agentRef.current.onStateChange = (state) => {
        if (!cancelled) setAgentState({ ...state });
      };
      if (agentRef.current.state) {
        setAgentState({ ...agentRef.current.state });
      }
      return () => {
        cancelled = true;
      };
    }

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
        // Resume an existing workout_edit conversation for this entity if one exists
        const existing = await agent.findWorkoutEditConversation(
          userId,
          coachId,
          entityId,
        );

        if (cancelled) return;

        if (existing) {
          await agent.loadExistingConversation(
            userId,
            coachId,
            existing.conversationId,
          );
        } else {
          const conversationTitle = `Edit: ${entityLabel || entityType}`;
          await agent.createConversation(
            userId,
            coachId,
            conversationTitle,
            null,
            CONVERSATION_MODES.WORKOUT_EDIT,
          );

          if (cancelled) return;

          await agent.sendMessageStream(INITIAL_PROMPT, [], editContext);
        }
      } catch (err) {
        if (!cancelled) {
          logger.error(
            "ContextualChatDrawer: failed to initialize conversation:",
            err,
          );
          showToast("Failed to open edit session. Please try again.", "error");
        }
        return;
      } finally {
        if (!cancelled) setIsInitializing(false);
      }

      // Mark this entity as loaded so re-opening the drawer skips re-init
      if (!cancelled) loadedEntityIdRef.current = entityId;
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
    async (messageContent, imageS3Keys = [], documentS3Keys = []) => {
      if (!agentRef.current) return;

      const hasImages = imageS3Keys && imageS3Keys.length > 0;
      const hasDocuments = documentS3Keys && documentS3Keys.length > 0;
      if (!messageContent?.trim() && !hasImages && !hasDocuments) return;
      setInputMessage("");

      try {
        await agentRef.current.sendMessageStream(
          messageContent.trim(),
          imageS3Keys,
          editContext,
          documentS3Keys,
        );
      } catch (err) {
        logger.error("ContextualChatDrawer: sendMessageStream failed:", err);
      }
    },
    [editContext],
  );

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("neonpanda-chat-drawer-expanded", String(next));
      return next;
    });
  }, []);

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
        style={{ width: isExpanded ? "620px" : "420px" }}
      >
        <PanelContent
          headingId={headingId}
          entityLabel={entityLabel}
          entityType={entityType}
          coachData={coachData}
          coachInitial={coachInitial}
          userInitial={userInitial}
          onClose={onClose}
          messageAreaRef={desktopMessageAreaRef}
          messages={messages}
          contextualUpdate={contextualUpdate}
          isStreaming={isStreaming}
          isInitializing={isInitializing}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSend={handleSend}
          inputFocusRef={desktopInputFocusRef}
          userId={userId}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
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
          userInitial={userInitial}
          onClose={onClose}
          messageAreaRef={mobileMessageAreaRef}
          messages={messages}
          contextualUpdate={contextualUpdate}
          isStreaming={isStreaming}
          isInitializing={isInitializing}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSend={handleSend}
          inputFocusRef={mobileInputFocusRef}
          userId={userId}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
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
  userInitial,
  onClose,
  messageAreaRef,
  messages,
  contextualUpdate,
  isStreaming,
  isInitializing,
  inputMessage,
  setInputMessage,
  handleSend,
  inputFocusRef,
  userId,
  isExpanded,
  onToggleExpand,
}) {
  return (
    <>
      {/* Header */}
      <div className={contextualDrawerPatterns.header}>
        {/* Expand/collapse button — desktop only (mobile is always full-screen) */}
        <button
          type="button"
          className={`${contextualDrawerPatterns.closeButton} hidden lg:flex shrink-0`}
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Collapse drawer" : "Expand drawer"}
        >
          <DrawerResizeIcon isExpanded={isExpanded} />
        </button>

        {/* Section header dot */}
        <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0" />

        {/* Entity label */}
        <div className="flex-1 min-w-0">
          <div id={headingId} className={contextualDrawerPatterns.headerLabel}>
            {entityLabel || `Editing ${entityType}`}
          </div>
        </div>

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
        {/* Skeleton during initialization before any messages arrive */}
        {isInitializing && messages.length === 0 && <DrawerSkeleton />}

        {/* Empty state — only if truly stuck (no init, no streaming, no messages) */}
        {messages.length === 0 && !isStreaming && !isInitializing && (
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
            userInitial={userInitial}
            userId={userId}
          />
        ))}

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
        <div className="contextual-drawer-input">
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
            enablePhotoAttachment={true}
            enableFileAttachment={true}
            enableQuickPrompts={false}
            showTipsButton={false}
            showDeleteButton={false}
            enableSlashCommands={false}
            textareaRef={inputFocusRef}
            editorMinHeight="44px"
            editorMaxHeight="120px"
            compact={true}
          />
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Expand/collapse icon — double right chevrons (>>) when narrow, double left (<<) when wide
// ──────────────────────────────────────────────────────────────────────────────
function DrawerResizeIcon({ isExpanded }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isExpanded ? (
        // Collapse: >> (two right-facing chevrons)
        <path d="M3 4L6 7L3 10M7 4L10 7L7 10" />
      ) : (
        // Expand: << (two left-facing chevrons)
        <path d="M7 4L4 7L7 10M11 4L8 7L11 10" />
      )}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Skeleton shown while the conversation initializes (before first messages arrive)
// ──────────────────────────────────────────────────────────────────────────────
function DrawerSkeleton() {
  return (
    <div className="space-y-6 pt-2">
      {/* User message skeleton — right-aligned pill */}
      <div className="flex flex-col items-end">
        <div className="h-8 w-[70%] rounded-md rounded-br-none bg-synthwave-text-muted/20 animate-pulse" />
        <div className="mt-1.5 w-6 h-6 rounded-full bg-synthwave-text-muted/20 animate-pulse" />
      </div>

      {/* AI message skeleton — left-aligned text lines */}
      <div className="flex flex-col items-start">
        <div className="space-y-1.5 w-full">
          <div className="h-3 bg-synthwave-text-muted/20 animate-pulse rounded w-full" />
          <div className="h-3 bg-synthwave-text-muted/20 animate-pulse rounded w-4/5" />
          <div className="h-3 bg-synthwave-text-muted/20 animate-pulse rounded w-3/5" />
        </div>
        <div className="mt-2 w-6 h-6 rounded-full bg-synthwave-text-muted/20 animate-pulse" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Timestamp formatter — same format as CoachConversations, scaled for the drawer
// ──────────────────────────────────────────────────────────────────────────────
function formatDrawerTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Individual message bubble
// ──────────────────────────────────────────────────────────────────────────────
function MessageBubble({ message, coachInitial, userInitial, userId }) {
  const isUser = message.type === "user" || message.role === "user";
  const content =
    message.content || message.displayContent || message.streamingContent || "";
  const hasImages = message.imageS3Keys && message.imageS3Keys.length > 0;
  const hasDocuments =
    message.documentS3Keys && message.documentS3Keys.length > 0;

  if (!content && !hasImages && !hasDocuments) return null;

  if (isUser) {
    return (
      <div className="flex flex-col items-end">
        <div className={contextualDrawerPatterns.userMessage}>
          {(hasImages || hasDocuments) && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {message.imageS3Keys?.map((s3Key, index) => (
                <ImageWithPresignedUrl
                  key={index}
                  s3Key={s3Key}
                  userId={userId}
                  index={index}
                  thumbnailSize="w-16 h-16"
                  variant="maroon"
                />
              ))}
              {message.documentS3Keys?.map((s3Key, index) => (
                <DocumentThumbnail
                  key={index}
                  s3Key={s3Key}
                  userId={userId}
                  thumbnailSize="w-16 h-16"
                  variant="purple"
                />
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1.5 justify-end">
          {message.timestamp && (
            <span className="text-[10px] text-synthwave-text-muted font-body">
              {formatDrawerTime(message.timestamp)}
            </span>
          )}
          <div className={`${avatarPatterns.userXSmall} shrink-0`}>
            {userInitial}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className={contextualDrawerPatterns.aiMessage}>
        <MarkdownRenderer content={content} />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className={`${avatarPatterns.aiXSmall} shrink-0`}>
          {coachInitial}
        </div>
        {message.timestamp && (
          <span className="text-[10px] text-synthwave-text-muted font-body">
            {formatDrawerTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
