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
import { useNavigate, Link } from "react-router-dom";
import CoachConversationAgent from "../../utils/agents/CoachConversationAgent";
import {
  getCoachConversation,
  getCoachConversations,
} from "../../utils/apis/coachConversationApi";
import ChatInput from "./ChatInput";
import { MarkdownRenderer } from "./MarkdownRenderer";
import ImageWithPresignedUrl from "./ImageWithPresignedUrl";
import DocumentThumbnail from "./DocumentThumbnail";
import { ContextualUpdateIndicator } from "../../utils/ui/streamingUiHelper.jsx";
import {
  contextualDrawerPatterns,
  avatarPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { CONVERSATION_MODES } from "../../constants/conversationModes";
import {
  INLINE_TRAINING_GROUNDS_TAG,
  getTrainingGroundsInlineSessionKey,
  TRAINING_GROUNDS_INLINE_PICKER_LIMIT,
} from "../../constants/contextualChat";
import { CloseIcon } from "../themes/SynthwaveComponents";
import { useToast } from "../../contexts/ToastContext";
import { logger } from "../../utils/logger";

// Initial auto-prompt to trigger the AI to load workout context on first open
const INITIAL_PROMPT =
  "Please load my workout details so we can get started. I have some corrections to make.";

/** @typedef {"workoutEdit" | "trainingGroundsInlineChat"} ContextualChatDrawerVariant */

/**
 * ContextualChatDrawer
 *
 * @param {boolean} isOpen - Controls visibility
 * @param {Function} onClose - Called when the drawer is closed
 * @param {ContextualChatDrawerVariant} [variant="workoutEdit"]
 * @param {string} entityType - "workout" (extensible to "program", etc.)
 * @param {string} entityId - The entity ID being edited (workout variant)
 * @param {string} entityLabel - Display name for the entity (e.g., workout title)
 * @param {string} userId - The authenticated user's ID
 * @param {string} coachId - The coach ID for the conversation
 * @param {Object} coachData - Coach info ({ name, avatar, etc. })
 * @param {Function} onEntityUpdated - Callback to refresh parent after a successful edit
 */
export default function ContextualChatDrawer({
  isOpen,
  onClose,
  variant = "workoutEdit",
  entityType,
  entityId,
  entityLabel,
  userId,
  coachId,
  coachData,
  onEntityUpdated,
  userInitial = "U",
}) {
  const navigate = useNavigate();
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

  const [trainingPickerOptions, setTrainingPickerOptions] = useState([]);
  const [isLoadingTrainingPicker, setIsLoadingTrainingPicker] = useState(false);

  const coachInitial = coachData?.name?.[0]?.toUpperCase() || "C";
  const editContext = useMemo(
    () =>
      variant === "workoutEdit" && entityType && entityId
        ? { entityType, entityId }
        : null,
    [variant, entityType, entityId],
  );

  const refreshTrainingPicker = useCallback(async () => {
    if (!userId || !coachId || variant !== "trainingGroundsInlineChat") return;
    setIsLoadingTrainingPicker(true);
    try {
      const { conversations = [] } = await getCoachConversations(
        userId,
        coachId,
      );
      const chats = conversations.filter(
        (c) => c.mode === CONVERSATION_MODES.CHAT,
      );
      chats.sort((a, b) => {
        const dateA = new Date(
          a.metadata?.lastActivity || a.updatedAt || a.createdAt || 0,
        );
        const dateB = new Date(
          b.metadata?.lastActivity || b.updatedAt || b.createdAt || 0,
        );
        return dateB - dateA;
      });
      setTrainingPickerOptions(
        chats.slice(0, TRAINING_GROUNDS_INLINE_PICKER_LIMIT),
      );
    } catch (err) {
      logger.error("ContextualChatDrawer: training picker load failed:", err);
    } finally {
      setIsLoadingTrainingPicker(false);
    }
  }, [userId, coachId, variant]);

  // ──────────────────────────────────────────────────────────────────────────
  // Training Grounds: conversation picker list
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !isOpen ||
      variant !== "trainingGroundsInlineChat" ||
      !userId ||
      !coachId
    )
      return;
    refreshTrainingPicker();
  }, [isOpen, userId, coachId, variant, refreshTrainingPicker]);

  // ──────────────────────────────────────────────────────────────────────────
  // Agent lifecycle — workout edit variant
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (variant !== "workoutEdit") return;
    if (!isOpen || !userId || !coachId || !entityId) return;

    let cancelled = false;

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

      if (!cancelled) loadedEntityIdRef.current = entityId;
    }

    initConversation();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entityLabel/editContext churn should not reset workout edit session
  }, [isOpen, userId, coachId, entityId, variant, showToast]);

  // ──────────────────────────────────────────────────────────────────────────
  // Agent lifecycle — Training Grounds inline chat variant
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (variant !== "trainingGroundsInlineChat") return;
    if (!isOpen || !userId || !coachId) return;

    let cancelled = false;
    const sessionKey = getTrainingGroundsInlineSessionKey(userId, coachId);

    async function resolveTrainingTargetId(agent) {
      let sessionId = null;
      try {
        sessionId = sessionStorage.getItem(sessionKey);
      } catch {
        /* ignore */
      }

      if (sessionId) {
        try {
          const data = await getCoachConversation(userId, coachId, sessionId);
          const conv = data.conversation || data;
          if (conv.mode === CONVERSATION_MODES.CHAT) return sessionId;
        } catch {
          try {
            sessionStorage.removeItem(sessionKey);
          } catch {
            /* ignore */
          }
        }
      }

      const home = await agent.findChatConversationByTag(
        userId,
        coachId,
        INLINE_TRAINING_GROUNDS_TAG,
      );
      if (home) return home.conversationId;
      return "__create__";
    }

    async function initTrainingConversation() {
      setIsInitializing(true);
      lastEditMessageIdRef.current = null;

      const agent =
        agentRef.current ||
        new CoachConversationAgent({
          userId,
          coachId,
        });
      agentRef.current = agent;
      // Must rebind whenever this effect runs: a reused agent still holds the
      // previous effect's onStateChange closure (with cancelled === true).
      agent.onStateChange = (state) => {
        if (!cancelled) setAgentState({ ...state });
      };
      agent.onError = (err) => {
        logger.error("ContextualChatDrawer agent error:", err);
      };

      try {
        const target = await resolveTrainingTargetId(agent);
        if (cancelled) return;

        if (target !== "__create__") {
          if (agent.conversationId === target && agent.state?.conversation) {
            if (agent.state) setAgentState({ ...agent.state });
          } else {
            await agent.loadExistingConversation(userId, coachId, target);
          }
        } else {
          await agent.createConversation(
            userId,
            coachId,
            "Training Grounds",
            null,
            CONVERSATION_MODES.CHAT,
          );
          if (cancelled) return;
          await agent.addTagToConversation(
            userId,
            coachId,
            agent.conversationId,
            INLINE_TRAINING_GROUNDS_TAG,
          );
        }
      } catch (err) {
        if (!cancelled) {
          logger.error(
            "ContextualChatDrawer: failed to initialize training chat:",
            err,
          );
          showToast("Failed to open chat. Please try again.", "error");
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    initTrainingConversation();

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, coachId, variant, showToast]);

  const handleTrainingPickerChange = useCallback(
    async (conversationId) => {
      const agent = agentRef.current;
      if (!agent || !conversationId || !userId || !coachId) return;
      const sessionKey = getTrainingGroundsInlineSessionKey(userId, coachId);
      setIsInitializing(true);
      try {
        await agent.loadExistingConversation(userId, coachId, conversationId);
        try {
          sessionStorage.setItem(sessionKey, conversationId);
        } catch {
          /* ignore */
        }
        await refreshTrainingPicker();
      } catch (err) {
        logger.error("ContextualChatDrawer: picker load failed:", err);
        showToast("Could not open that conversation.", "error");
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {
          /* ignore */
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [userId, coachId, showToast, refreshTrainingPicker],
  );

  const handleTrainingNewConversation = useCallback(async () => {
    const agent = agentRef.current;
    if (!agent || !userId || !coachId) return;
    if (agent.state?.isStreaming || agent.state?.isTyping) return;

    const sessionKey = getTrainingGroundsInlineSessionKey(userId, coachId);
    setIsInitializing(true);
    try {
      const oldTagged = await agent.findChatConversationByTag(
        userId,
        coachId,
        INLINE_TRAINING_GROUNDS_TAG,
      );
      await agent.createConversation(
        userId,
        coachId,
        "Training Grounds",
        null,
        CONVERSATION_MODES.CHAT,
      );
      const newId = agent.conversationId;
      await agent.migrateInlineHomeTag(
        userId,
        coachId,
        oldTagged?.conversationId || null,
        newId,
        INLINE_TRAINING_GROUNDS_TAG,
      );
      try {
        sessionStorage.setItem(sessionKey, newId);
      } catch {
        /* ignore */
      }
      await refreshTrainingPicker();
    } catch (err) {
      logger.error(
        "ContextualChatDrawer: new training conversation failed:",
        err,
      );
      showToast("Could not start a new conversation.", "error");
    } finally {
      setIsInitializing(false);
    }
  }, [userId, coachId, showToast, refreshTrainingPicker]);

  const handleOpenFullPageChat = useCallback(() => {
    const id = agentRef.current?.conversationId;
    if (!userId || !coachId || !id) return;
    navigate(
      `/training-grounds/coach-conversations?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(coachId)}&conversationId=${encodeURIComponent(id)}`,
    );
    onClose();
  }, [userId, coachId, navigate, onClose]);

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
    if (variant !== "workoutEdit") return;
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
  }, [variant, agentState?.messages, onEntityUpdated]);

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
  const streamBusy = !!(agentState?.isStreaming || agentState?.isTyping);
  const messages = agentState?.messages || [];
  const contextualUpdate = agentState?.contextualUpdate;

  const currentConversationId = agentState?.conversation?.conversationId || "";
  const trainingPickerEffective = useMemo(() => {
    if (variant !== "trainingGroundsInlineChat") return [];
    const ids = new Set(
      trainingPickerOptions.map((o) => o.conversationId).filter(Boolean),
    );
    const out = [...trainingPickerOptions];
    if (currentConversationId && !ids.has(currentConversationId)) {
      out.unshift({
        conversationId: currentConversationId,
        title: agentState?.conversation?.title || "Current conversation",
      });
    }
    return out;
  }, [
    variant,
    trainingPickerOptions,
    currentConversationId,
    agentState?.conversation?.title,
  ]);

  const dialogAriaLabel =
    variant === "trainingGroundsInlineChat"
      ? `Chat with ${entityLabel || "coach"}`
      : `Edit ${entityLabel || entityType} with AI coach`;

  if (!isOpen) return null;

  const panelExtras = {
    variant,
    trainingPickerOptions: trainingPickerEffective,
    isLoadingTrainingPicker,
    currentConversationId,
    onTrainingPickerChange: handleTrainingPickerChange,
    onTrainingNewConversation: handleTrainingNewConversation,
    onOpenFullPageChat: handleOpenFullPageChat,
    userId,
    coachId,
    streamBusy,
  };

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
        aria-label={dialogAriaLabel}
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
          {...panelExtras}
        />
      </div>

      {/* Mobile: full-screen takeover */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${headingId}-mobile`}
        aria-label={dialogAriaLabel}
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
          {...panelExtras}
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
  variant = "workoutEdit",
  trainingPickerOptions = [],
  isLoadingTrainingPicker = false,
  currentConversationId = "",
  onTrainingPickerChange,
  onTrainingNewConversation,
  onOpenFullPageChat,
  coachId,
  streamBusy = false,
}) {
  const trainingSelectId = useId();
  const isTraining = variant === "trainingGroundsInlineChat";
  const viewAllUrl =
    userId && coachId
      ? `/training-grounds/coach-conversations?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(coachId)}`
      : "#";

  const inputPlaceholder = isTraining
    ? "Message your coach…"
    : "Describe what you'd like to correct…";
  const emptySessionMessage = isTraining
    ? "Send a message to start."
    : "Starting edit session…";

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
            {entityLabel ||
              (isTraining ? "Training Grounds" : `Editing ${entityType}`)}
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
          aria-label={isTraining ? "Close chat" : "Close edit session"}
        >
          <CloseIcon />
        </button>
      </div>

      {isTraining && (
        <div className="flex flex-col gap-2 px-3 py-2.5 border-b border-synthwave-neon-cyan/15 shrink-0 bg-synthwave-bg-primary/40">
          <label
            htmlFor={trainingSelectId}
            className={`${typographyPatterns.bodySmall} text-synthwave-text-muted sr-only`}
          >
            Conversation
          </label>
          <select
            id={trainingSelectId}
            className="w-full min-w-0 rounded-md border border-synthwave-neon-cyan/25 bg-synthwave-bg-secondary px-2 py-1.5 font-body text-xs text-synthwave-text-primary focus:outline-none focus:ring-1 focus:ring-synthwave-neon-cyan/50"
            value={currentConversationId}
            onChange={(e) => onTrainingPickerChange?.(e.target.value)}
            disabled={
              isLoadingTrainingPicker ||
              isInitializing ||
              !onTrainingPickerChange
            }
          >
            {trainingPickerOptions.length === 0 && !currentConversationId ? (
              <option value="">Loading…</option>
            ) : null}
            {trainingPickerOptions.map((c) => (
              <option key={c.conversationId} value={c.conversationId}>
                {c.title?.trim() ||
                  (c.conversationId
                    ? `${c.conversationId.slice(0, 14)}…`
                    : "Chat")}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => onTrainingNewConversation?.()}
              disabled={
                streamBusy || isInitializing || !onTrainingNewConversation
              }
              className="px-2 py-1 rounded-md border border-synthwave-neon-pink/35 text-synthwave-neon-pink text-[10px] font-semibold uppercase tracking-wide hover:bg-synthwave-neon-pink/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              New conversation
            </button>
            <button
              type="button"
              onClick={() => onOpenFullPageChat?.()}
              disabled={!currentConversationId || !onOpenFullPageChat}
              className="px-2 py-1 rounded-md border border-synthwave-neon-cyan/35 text-synthwave-neon-cyan text-[10px] font-semibold uppercase tracking-wide hover:bg-synthwave-neon-cyan/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Open full page
            </button>
            <Link
              to={viewAllUrl}
              className="text-[10px] font-semibold uppercase tracking-wide text-synthwave-neon-purple hover:underline ml-auto"
            >
              View all
            </Link>
          </div>
        </div>
      )}

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
            <p className={`${typographyPatterns.bodySmall} text-center px-4`}>
              {emptySessionMessage}
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
            placeholder={inputPlaceholder}
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
