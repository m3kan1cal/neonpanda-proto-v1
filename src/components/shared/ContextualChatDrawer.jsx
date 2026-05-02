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
import { Tooltip } from "react-tooltip";
import {
  contextualDrawerPatterns,
  avatarPatterns,
  typographyPatterns,
  iconButtonPatterns,
  tooltipPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";
import CoachConversationEmptyTips from "./CoachConversationEmptyTips";
import UserAvatar from "./UserAvatar";
import { CONVERSATION_MODES } from "../../constants/conversationModes";
import {
  INLINE_TRAINING_GROUNDS_TAG,
  getTrainingGroundsInlineSessionKey,
  TRAINING_GROUNDS_INLINE_PICKER_LIMIT,
} from "../../constants/contextualChat";
import {
  CloseIcon,
  PlusIcon,
  ChatIconSmall,
  ChevronLeftIcon,
} from "../themes/SynthwaveComponents";
import { useToast } from "../../contexts/ToastContext";
import { logger } from "../../utils/logger";

// Initial auto-prompt to trigger the AI to load workout context on first open
const INITIAL_PROMPT =
  "Please load my workout details so we can get started. I have some corrections to make.";

// Fallbacks used when a caller forgets to pass the inline tag/session key
// props. Kept in sync with the Training Grounds constants so existing
// wiring keeps working, but new inline surfaces (e.g. Program Dashboard)
// MUST pass their own scoped values — see the `inlineConversationTag`
// and `inlineSessionKey` props below.
const DEFAULT_INLINE_CONVERSATION_TAG = INLINE_TRAINING_GROUNDS_TAG;
const defaultInlineSessionKey = (userId, coachId) =>
  getTrainingGroundsInlineSessionKey(userId, coachId);

/** @typedef {"workoutEdit" | "trainingGroundsInlineChat"} ContextualChatDrawerVariant */

function OpenFullPageIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

/**
 * Conversation picker — ExerciseSelector-style trigger and panel, compact for the drawer.
 */
function TrainingGroundsConversationPicker({
  options,
  value,
  onSelect,
  disabled,
  isLoading,
  labelledBy,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef(null);
  const listboxId = useId();

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [menuOpen]);

  const selected = useMemo(
    () => options.find((o) => o.conversationId === value),
    [options, value],
  );

  const displayLabel = (() => {
    if (selected?.title?.trim()) return selected.title.trim();
    if (value) return `${value.slice(0, 14)}…`;
    if (isLoading) return "Loading…";
    return "Select conversation…";
  })();

  const toggleDisabled = disabled || isLoading || !onSelect;

  return (
    <div ref={wrapperRef} className="relative w-full min-w-0">
      <div
        role="combobox"
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-labelledby={labelledBy}
        aria-controls={listboxId}
        className={`relative flex items-center w-full rounded-xl transition-all duration-300 cursor-pointer min-h-9 ${
          toggleDisabled
            ? "opacity-50 cursor-not-allowed border border-synthwave-neon-cyan/15 bg-synthwave-bg-primary/20"
            : menuOpen
              ? "border border-synthwave-neon-cyan bg-synthwave-bg-primary/50"
              : "border border-synthwave-neon-cyan/20 bg-synthwave-bg-primary/30 hover:border-synthwave-neon-cyan/40"
        }`}
        onClick={() => {
          if (toggleDisabled) return;
          setMenuOpen((o) => !o);
        }}
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-synthwave-text-muted pointer-events-none shrink-0">
          <span className="inline-flex w-4 h-4 items-center justify-center [&_svg]:!w-4 [&_svg]:!h-4">
            <ChatIconSmall />
          </span>
        </div>
        <div className="flex-1 min-w-0 pl-8 pr-9 py-2.5 min-h-10 flex items-center">
          <span className="font-body text-sm text-white truncate w-full">
            {displayLabel}
          </span>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className={`w-3.5 h-3.5 text-synthwave-text-muted shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {menuOpen && !toggleDisabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-synthwave-bg-card/95 border border-synthwave-neon-cyan/20 shadow-lg backdrop-blur-sm synthwave-scrollbar-cyan"
        >
          {options.length === 0 ? (
            <div className="px-3 py-3 text-center font-body text-sm text-synthwave-text-muted">
              No conversations yet.
            </div>
          ) : (
            options.map((c) => {
              const isSelected = c.conversationId === value;
              const rowLabel =
                c.title?.trim() ||
                (c.conversationId
                  ? `${c.conversationId.slice(0, 14)}…`
                  : "Chat");
              return (
                <button
                  key={c.conversationId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(c.conversationId);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 font-body text-sm transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-synthwave-neon-pink/10 text-synthwave-neon-pink"
                      : "text-white hover:bg-synthwave-neon-cyan/10"
                  }`}
                >
                  <span className="truncate block">{rowLabel}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

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
 * @param {string} [newConversationTitle] - Required for `trainingGroundsInlineChat` (caller-owned title for new threads). If omitted, falls back to "New Chat" with a dev warning.
 * @param {{ surface: "program_dashboard", programId: string }
 *        | { surface: "training_grounds" }
 *        | null} [streamClientContext] - Optional per-turn API context (telemetry / priming)
 * @param {string} [inlineConversationTag] - Metadata tag applied to the inline "home" conversation. Required for any inline surface other than Training Grounds; each surface MUST pass its own tag so conversations don't cross-wire between surfaces (e.g. TG vs. Program Dashboard). Defaults to the Training Grounds tag for back-compat.
 * @param {string} [inlineSessionKey] - sessionStorage key used to remember the most recently opened inline conversation. Must be unique per logical surface (and scope — e.g. per `programId` for the Program Dashboard) to prevent cross-surface hijacking of the stored conversationId. Defaults to the Training Grounds key for back-compat.
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
  userEmail,
  userDisplayName,
  newConversationTitle,
  streamClientContext = null,
  inlineConversationTag,
  inlineSessionKey,
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
  const mobileSheetRef = useRef(null);
  const desktopInputFocusRef = useRef(null);
  const mobileInputFocusRef = useRef(null);
  const closeTriggerRef = useRef(null);
  const lastEditMessageIdRef = useRef(null);
  const loadedEntityIdRef = useRef(null);

  const [trainingPickerOptions, setTrainingPickerOptions] = useState([]);
  const [isLoadingTrainingPicker, setIsLoadingTrainingPicker] = useState(false);

  const coachInitial = coachData?.name?.[0]?.toUpperCase() || "C";

  const isTrainingInlineChat = variant === "trainingGroundsInlineChat";

  // Effective inline tag + session key. Each inline surface (Training Grounds,
  // Program Dashboard, etc.) MUST pass its own scoped values — sharing these
  // between surfaces causes conversations to cross-wire (the "home" chat on
  // one surface silently becomes the home chat on the other). Defaults are
  // the Training Grounds constants so legacy callers still work.
  const effectiveInlineTag =
    inlineConversationTag || DEFAULT_INLINE_CONVERSATION_TAG;
  const effectiveInlineSessionKey = useMemo(() => {
    if (!userId || !coachId) return null;
    return inlineSessionKey || defaultInlineSessionKey(userId, coachId);
  }, [inlineSessionKey, userId, coachId]);

  const inlineNewConversationTitle = useMemo(() => {
    if (!isTrainingInlineChat) {
      return newConversationTitle;
    }
    if (
      typeof newConversationTitle === "string" &&
      newConversationTitle.trim()
    ) {
      return newConversationTitle.trim();
    }
    logger.warn(
      "ContextualChatDrawer: newConversationTitle is required for trainingGroundsInlineChat; using neutral fallback",
    );
    return "New Chat";
  }, [isTrainingInlineChat, newConversationTitle]);

  /** Keeps the latest onClose without re-subscribing history effects when parents pass inline arrows. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (
      isTrainingInlineChat &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches &&
      window.history.state?.npeInlineCoachChat
    ) {
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }, [isTrainingInlineChat]);

  const editContext = useMemo(
    () =>
      variant === "workoutEdit" && entityType && entityId
        ? { entityType, entityId }
        : null,
    [variant, entityType, entityId],
  );

  const refreshTrainingPicker = useCallback(async () => {
    if (!userId || !coachId || !isTrainingInlineChat) return;
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
  }, [userId, coachId, isTrainingInlineChat]);

  // ──────────────────────────────────────────────────────────────────────────
  // Training Grounds: conversation picker list
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isTrainingInlineChat || !userId || !coachId) return;
    refreshTrainingPicker();
  }, [isOpen, userId, coachId, isTrainingInlineChat, refreshTrainingPicker]);

  // Mobile Training Grounds: history entry so Android back closes the drawer first.
  // Do not depend on `onClose` identity (use onCloseRef) or each parent re-render re-pushes state.
  const mobileHistoryActiveRef = useRef(false);
  useEffect(() => {
    if (!isOpen || !isTrainingInlineChat) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;

    window.history.pushState({ npeInlineCoachChat: true }, "");
    mobileHistoryActiveRef.current = true;

    const onPop = () => {
      mobileHistoryActiveRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (
        mobileHistoryActiveRef.current &&
        window.history.state?.npeInlineCoachChat
      ) {
        mobileHistoryActiveRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, isTrainingInlineChat]);

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

          await agent.sendMessageStream(
            INITIAL_PROMPT,
            [],
            editContext,
            [],
            null,
          );
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
    if (!isTrainingInlineChat) return;
    if (!isOpen || !userId || !coachId) return;

    let cancelled = false;
    const sessionKey = effectiveInlineSessionKey;
    const inlineTag = effectiveInlineTag;

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
          try {
            sessionStorage.removeItem(sessionKey);
          } catch {
            /* ignore */
          }
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
        inlineTag,
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
            inlineNewConversationTitle,
            null,
            CONVERSATION_MODES.CHAT,
          );
          if (cancelled) return;
          await agent.addTagToConversation(
            userId,
            coachId,
            agent.conversationId,
            inlineTag,
          );
        }
        if (!cancelled && sessionKey) {
          try {
            const id = agent.conversationId;
            if (id) sessionStorage.setItem(sessionKey, id);
          } catch {
            /* ignore */
          }
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
  }, [
    isOpen,
    userId,
    coachId,
    isTrainingInlineChat,
    inlineNewConversationTitle,
    effectiveInlineTag,
    effectiveInlineSessionKey,
    showToast,
  ]);

  const handleTrainingPickerChange = useCallback(
    async (conversationId) => {
      const agent = agentRef.current;
      if (!agent || !conversationId || !userId || !coachId) return;
      const sessionKey = effectiveInlineSessionKey;
      setIsInitializing(true);
      try {
        await agent.loadExistingConversation(userId, coachId, conversationId);
        if (sessionKey) {
          try {
            sessionStorage.setItem(sessionKey, conversationId);
          } catch {
            /* ignore */
          }
        }
        await refreshTrainingPicker();
      } catch (err) {
        logger.error("ContextualChatDrawer: picker load failed:", err);
        showToast("Could not open that conversation.", "error");
        if (sessionKey) {
          try {
            sessionStorage.removeItem(sessionKey);
          } catch {
            /* ignore */
          }
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [
      userId,
      coachId,
      showToast,
      refreshTrainingPicker,
      effectiveInlineSessionKey,
    ],
  );

  const handleTrainingNewConversation = useCallback(async () => {
    const agent = agentRef.current;
    if (!agent || !userId || !coachId) return;
    if (agent.state?.isStreaming || agent.state?.isTyping) return;

    const sessionKey = effectiveInlineSessionKey;
    const inlineTag = effectiveInlineTag;
    setIsInitializing(true);
    try {
      const oldTagged = await agent.findChatConversationByTag(
        userId,
        coachId,
        inlineTag,
      );
      await agent.createConversation(
        userId,
        coachId,
        inlineNewConversationTitle,
        null,
        CONVERSATION_MODES.CHAT,
      );
      const newId = agent.conversationId;
      await agent.migrateInlineHomeTag(
        userId,
        coachId,
        oldTagged?.conversationId || null,
        newId,
        inlineTag,
      );
      if (sessionKey) {
        try {
          sessionStorage.setItem(sessionKey, newId);
        } catch {
          /* ignore */
        }
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
  }, [
    userId,
    coachId,
    showToast,
    refreshTrainingPicker,
    inlineNewConversationTitle,
    effectiveInlineTag,
    effectiveInlineSessionKey,
  ]);

  const handleOpenFullPageChat = useCallback(() => {
    const id = agentRef.current?.conversationId;
    if (!userId || !coachId || !id) return;
    const url = `/training-grounds/coach-conversations?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(coachId)}&conversationId=${encodeURIComponent(id)}`;
    const mobileWithSyntheticHistory =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches &&
      window.history.state?.npeInlineCoachChat;

    if (mobileWithSyntheticHistory) {
      const afterPop = () => {
        window.removeEventListener("popstate", afterPop);
        navigate(url);
      };
      window.addEventListener("popstate", afterPop);
      window.history.back();
    } else {
      navigate(url);
      onCloseRef.current();
    }
  }, [userId, coachId, navigate]);

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-scroll message area to bottom on new messages (target visible panel)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!agentState?.messages) return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const ref = isDesktop ? desktopMessageAreaRef : mobileMessageAreaRef;
    const el = ref.current;
    if (!el) return;

    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };

    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
    const t = window.setTimeout(scrollToBottom, 80);
    return () => window.clearTimeout(t);
  }, [
    agentState?.messages,
    agentState?.streamingMessage,
    agentState?.contextualUpdate,
    agentState?.conversation?.conversationId,
    isInitializing,
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
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, requestClose]);

  // ──────────────────────────────────────────────────────────────────────────
  // Message send handler
  // ──────────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (messageContent, imageS3Keys = [], documentS3Keys = []) => {
      if (!agentRef.current) return;

      // Normalize up-front so the guard and the send call agree on the
      // nullable contract. Callers today always pass a string, but the
      // "attachments without text" path intentionally tolerates empty/null
      // text — don't let a future caller passing null crash the send.
      const text = messageContent?.trim() ?? "";
      const hasImages = imageS3Keys && imageS3Keys.length > 0;
      const hasDocuments = documentS3Keys && documentS3Keys.length > 0;
      if (!text && !hasImages && !hasDocuments) return;
      setInputMessage("");

      try {
        await agentRef.current.sendMessageStream(
          text,
          imageS3Keys,
          editContext,
          documentS3Keys,
          isTrainingInlineChat ? streamClientContext : null,
        );
      } catch (err) {
        logger.error("ContextualChatDrawer: sendMessageStream failed:", err);
      }
    },
    [editContext, isTrainingInlineChat, streamClientContext],
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
    if (!isTrainingInlineChat) return [];
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
    isTrainingInlineChat,
    trainingPickerOptions,
    currentConversationId,
    agentState?.conversation?.title,
  ]);

  const dialogAriaLabel = isTrainingInlineChat
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
          userEmail={userEmail}
          userDisplayName={userDisplayName}
          onClose={onClose}
          requestClose={requestClose}
          mobileTrainingSheetChrome={false}
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
        ref={mobileSheetRef}
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
          userEmail={userEmail}
          userDisplayName={userDisplayName}
          onClose={onClose}
          requestClose={requestClose}
          mobileTrainingSheetChrome={isTrainingInlineChat}
          mobileSheetRef={mobileSheetRef}
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
// Mobile sheet drag handle — swipe down to close when the message list is at top.
// Drag-to-follow: we mutate the sheet's transform directly on touchmove so the
// panel tracks the finger; on touchend we snap back or dismiss at a 64px threshold.
// ──────────────────────────────────────────────────────────────────────────────
function MobileTrainingDragHandle({ messageAreaRef, sheetRef, requestClose }) {
  const touchStartY = useRef(null);
  const activeRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const resetSheet = () => {
    const el = sheetRef?.current;
    if (!el) return;
    el.style.transform = "";
    el.style.transition = "";
  };

  const onTouchStart = (e) => {
    // Only start a pull when the list is basically at the top (small fudge).
    const scrollTop = messageAreaRef.current?.scrollTop ?? 0;
    if (scrollTop > 4) return;
    touchStartY.current = e.touches[0].clientY;
    activeRef.current = true;
    setDragging(true);
    const el = sheetRef?.current;
    if (el) {
      // Disable transition so the sheet tracks the finger 1:1.
      el.style.transition = "none";
    }
  };

  const onTouchMove = (e) => {
    if (!activeRef.current || touchStartY.current == null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    const el = sheetRef?.current;
    if (!el) return;
    if (delta <= 0) {
      el.style.transform = "";
      return;
    }
    el.style.transform = `translateY(${delta}px)`;
  };

  const finishDrag = (delta) => {
    const el = sheetRef?.current;
    const scrollTop = messageAreaRef.current?.scrollTop ?? 0;
    activeRef.current = false;
    touchStartY.current = null;
    setDragging(false);

    if (delta > 64 && scrollTop <= 4) {
      // Let the class-based translate-y-full animation finish the exit.
      if (el) {
        el.style.transform = "";
        el.style.transition = "";
      }
      requestClose();
      return;
    }

    if (el) {
      // Snap back with a short ease-out so the panel feels springy.
      el.style.transition = "transform 200ms ease-out";
      el.style.transform = "";
      const clear = () => {
        el.style.transition = "";
        el.removeEventListener("transitionend", clear);
      };
      el.addEventListener("transitionend", clear);
    }
  };

  const onTouchEnd = (e) => {
    if (!activeRef.current || touchStartY.current == null) {
      resetSheet();
      return;
    }
    const endY = e.changedTouches[0].clientY;
    finishDrag(endY - touchStartY.current);
  };

  const onTouchCancel = () => {
    if (!activeRef.current) return;
    finishDrag(0);
  };

  return (
    <div
      role="button"
      aria-label="Drag down to close"
      tabIndex={0}
      className="flex justify-center pt-3 pb-2 shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <div
        className={`w-12 h-1.5 rounded-full transition-colors duration-150 ${
          dragging ? "bg-synthwave-neon-cyan/70" : "bg-synthwave-text-muted/60"
        }`}
        aria-hidden
      />
    </div>
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
  userEmail,
  userDisplayName,
  onClose,
  requestClose,
  mobileTrainingSheetChrome = false,
  mobileSheetRef,
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
  const tipNewChatId = useId();
  const tipOpenFullId = useId();
  const tipViewAllId = useId();
  const isTraining = variant === "trainingGroundsInlineChat";
  const exit = requestClose ?? onClose;
  const viewAllUrl =
    userId && coachId
      ? `/training-grounds/coach-conversations?userId=${encodeURIComponent(userId)}&coachId=${encodeURIComponent(coachId)}`
      : "#";

  const inputPlaceholder = isTraining
    ? "Message your coach…"
    : "Describe what you'd like to correct…";
  const emptySessionMessage = "Starting edit session…";

  const showMessageList = !(isTraining && isInitializing);
  const suppressTrainingOverlay = isTraining && isInitializing;

  return (
    <>
      {mobileTrainingSheetChrome && (
        <MobileTrainingDragHandle
          messageAreaRef={messageAreaRef}
          sheetRef={mobileSheetRef}
          requestClose={exit}
        />
      )}

      {/* Header */}
      <div className={contextualDrawerPatterns.header}>
        {mobileTrainingSheetChrome ? (
          <>
            <button
              type="button"
              className={`${contextualDrawerPatterns.closeButton} shrink-0 -ml-1`}
              onClick={exit}
              aria-label="Back"
            >
              <span className="inline-flex w-5 h-5 items-center justify-center [&_svg]:!w-5 [&_svg]:!h-5">
                <ChevronLeftIcon />
              </span>
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div
                id={headingId}
                className={`${contextualDrawerPatterns.headerLabel} text-base min-w-0 truncate`}
              >
                {entityLabel ||
                  (isTraining ? "Training Grounds" : `Editing ${entityType}`)}
              </div>
              <span className={`${badgePatterns.betaSmall} text-xs shrink-0`}>
                Beta
              </span>
            </div>
            <button
              type="button"
              onClick={exit}
              className="shrink-0 px-2 py-1.5 rounded-full font-body font-semibold text-base text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 cursor-pointer"
            >
              Done
            </button>
          </>
        ) : (
          <>
            {/* Expand/collapse button — desktop only (mobile is always full-screen) */}
            <button
              type="button"
              className={`${contextualDrawerPatterns.closeButton} hidden lg:flex shrink-0`}
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Collapse drawer" : "Expand drawer"}
            >
              <DrawerResizeIcon isExpanded={isExpanded} />
            </button>

            {/* Section header icon */}
            <span className="shrink-0 text-synthwave-neon-pink">
              <ChatIconSmall className="w-4 h-4" />
            </span>

            {/* Entity label */}
            <div className="flex-1 min-w-0">
              <div
                id={headingId}
                className={`${contextualDrawerPatterns.headerLabel} text-base`}
              >
                {entityLabel ||
                  (isTraining ? "Training Grounds" : `Editing ${entityType}`)}
              </div>
            </div>

            {/* Beta badge */}
            <span className={`${badgePatterns.betaSmall} text-[10px] shrink-0`}>
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
          </>
        )}
      </div>

      {isTraining && (
        <div className="flex flex-row gap-2 items-center px-3 py-2.5 border-b border-synthwave-neon-cyan/15 shrink-0 bg-synthwave-bg-primary/40">
          <span id={trainingSelectId} className="sr-only">
            Conversation
          </span>
          <div className="flex-1 min-w-0">
            <TrainingGroundsConversationPicker
              options={trainingPickerOptions}
              value={currentConversationId}
              onSelect={onTrainingPickerChange}
              disabled={
                isLoadingTrainingPicker ||
                isInitializing ||
                !onTrainingPickerChange
              }
              isLoading={isLoadingTrainingPicker}
              labelledBy={trainingSelectId}
            />
          </div>
          <div className="flex shrink-0 gap-1 items-center">
            <button
              type="button"
              onClick={() => onTrainingNewConversation?.()}
              disabled={
                streamBusy || isInitializing || !onTrainingNewConversation
              }
              data-tooltip-id={tipNewChatId}
              data-tooltip-content="New chat"
              data-tooltip-place="bottom"
              aria-label="New chat"
              className={`${iconButtonPatterns.minimal} !p-1.5 !min-h-0 !min-w-0 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              onClick={() => onOpenFullPageChat?.()}
              disabled={!currentConversationId || !onOpenFullPageChat}
              data-tooltip-id={tipOpenFullId}
              data-tooltip-content="Open in full page"
              data-tooltip-place="bottom"
              aria-label="Open in full page"
              className={`${iconButtonPatterns.minimal} !p-1.5 !min-h-0 !min-w-0 shrink-0 !text-synthwave-neon-cyan hover:!text-synthwave-neon-cyan hover:!bg-synthwave-neon-cyan/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <OpenFullPageIcon />
            </button>
            <Link
              to={viewAllUrl}
              data-tooltip-id={tipViewAllId}
              data-tooltip-content="View all"
              data-tooltip-place="bottom"
              aria-label="View all conversations"
              className={`${iconButtonPatterns.minimal} !p-1.5 !min-h-0 !min-w-0 shrink-0 !text-synthwave-neon-purple hover:!text-synthwave-neon-purple hover:!bg-synthwave-neon-purple/10 inline-flex items-center justify-center cursor-pointer`}
            >
              <span className="inline-flex w-4 h-4 items-center justify-center [&_svg]:!w-4 [&_svg]:!h-4">
                <ChatIconSmall />
              </span>
            </Link>
          </div>
          <Tooltip
            id={tipNewChatId}
            {...tooltipPatterns.standard}
            anchorSelect={`[data-tooltip-id="${tipNewChatId}"]`}
          />
          <Tooltip
            id={tipOpenFullId}
            {...tooltipPatterns.standard}
            anchorSelect={`[data-tooltip-id="${tipOpenFullId}"]`}
          />
          <Tooltip
            id={tipViewAllId}
            {...tooltipPatterns.standard}
            anchorSelect={`[data-tooltip-id="${tipViewAllId}"]`}
          />
        </div>
      )}

      {/* Message area */}
      <div
        ref={messageAreaRef}
        className={contextualDrawerPatterns.messageArea}
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {/* Skeleton: training whenever loading; workout edit on first load with no messages yet */}
        {isInitializing && (isTraining || messages.length === 0) && (
          <DrawerSkeleton />
        )}

        {/* Empty state — workout edit */}
        {!isTraining &&
          messages.length === 0 &&
          !isStreaming &&
          !isInitializing && (
            <div className="flex items-center justify-center h-full">
              <p className={`${typographyPatterns.bodySmall} text-center px-4`}>
                {emptySessionMessage}
              </p>
            </div>
          )}

        {/* Empty state — training drawer: curated tips */}
        {isTraining &&
          messages.length === 0 &&
          !isStreaming &&
          !isInitializing && (
            <div className="flex flex-1 min-h-0 items-stretch justify-center w-full">
              <CoachConversationEmptyTips variant="drawer" />
            </div>
          )}

        {showMessageList &&
          messages.map((message) => (
            <MessageBubble
              key={message.id || message.messageId}
              message={message}
              coachInitial={coachInitial}
              userInitial={userInitial}
              userEmail={userEmail}
              userDisplayName={userDisplayName}
              userId={userId}
            />
          ))}

        {/* Contextual update indicator (tool-use feedback) */}
        {contextualUpdate && !suppressTrainingOverlay && (
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
        <div className="h-8 w-[70%] rounded-xl rounded-br-none bg-synthwave-text-muted/20 animate-pulse" />
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
function MessageBubble({
  message,
  coachInitial,
  userInitial,
  userEmail,
  userDisplayName,
  userId,
}) {
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
          <div className="shrink-0">
            <UserAvatar
              email={userEmail}
              username={userDisplayName || userInitial}
              size={24}
            />
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
