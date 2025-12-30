import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import {
  containerPatterns,
  badgePatterns,
  buttonPatterns,
  layoutPatterns,
  tooltipPatterns,
} from "../utils/ui/uiPatterns";
import { getCoachConversations } from "../utils/apis/coachConversationApi";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import { createCoachConversation } from "../utils/apis/coachConversationApi";
import QuickStats from "./shared/QuickStats";
import { isRecentConversation } from "../utils/dateUtils";
import { NeonBorder, NewBadge } from "./themes/SynthwaveComponents";
import { useToast } from "../contexts/ToastContext";
import { CoachConversationAgent } from "../utils/agents/CoachConversationAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import {
  ConversationIcon,
  LightningIcon,
  MessagesIcon,
  CalendarMonthIcon,
  TrashIcon,
} from "./themes/SynthwaveComponents";

// Icons
const ClockIconSmall = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function ManageCoachConversations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    error: userIdError,
  } = useAuthorizeUser(userId);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create conversation state
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Command palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Coach data state
  const [coachData, setCoachData] = useState(null);

  const conversationAgentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const workoutAgentRef = useRef(null);
  const { addToast, success, error, info } = useToast();

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId);
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId]);

  // Load coach data
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loadedCoachData = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );
        setCoachData(loadedCoachData);
      } catch (error) {
        console.error("Failed to load coach data:", error);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Conversation state - for specific coach conversations
  const [conversationAgentState, setConversationAgentState] = useState({
    allConversations: [],
    isLoadingAllItems: !!(userId && coachId),
    isLoadingItem: false,
    error: null,
    totalCount: 0,
    coaches: [],
  });

  // Collapsed badges - initialize with all conversation IDs (collapsed by default)
  const [collapsedBadges, setCollapsedBadges] = useState(() => {
    return new Set(
      conversationAgentState.allConversations.map((c) => c.conversationId),
    );
  });

  // Collapsed previews - initialize with all conversation IDs (collapsed by default)
  const [collapsedPreviews, setCollapsedPreviews] = useState(() => {
    return new Set(
      conversationAgentState.allConversations.map((c) => c.conversationId),
    );
  });

  // Update collapsed badges and previews when conversations load
  useEffect(() => {
    if (conversationAgentState.allConversations.length > 0) {
      setCollapsedBadges(
        new Set(
          conversationAgentState.allConversations.map((c) => c.conversationId),
        ),
      );
      setCollapsedPreviews(
        new Set(
          conversationAgentState.allConversations.map((c) => c.conversationId),
        ),
      );
    }
  }, [conversationAgentState.allConversations.length]);

  // Toggle badge collapse
  const toggleBadgeCollapse = (conversationId) => {
    setCollapsedBadges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  // Toggle preview collapse
  const togglePreviewCollapse = (conversationId) => {
    setCollapsedPreviews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !coachId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, coachId, navigate]);

  // Initialize conversation agent and load data for specific coach
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachConversations = async () => {
      try {
        setConversationAgentState((prev) => ({
          ...prev,
          isLoadingAllItems: true,
          error: null,
        }));

        // Get the specific coach details using CoachAgent
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const coachData = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );

        if (!coachData) {
          setConversationAgentState((prev) => ({
            ...prev,
            isLoadingAllItems: false,
            error: "Coach not found",
          }));
          return;
        }

        // Load conversations for this specific coach (include first messages for preview)
        const result = await getCoachConversations(userId, coachId, {
          includeFirstMessages: true,
        });
        const conversations = (result.conversations || []).map((conv) => ({
          ...conv,
          coachName: coachData.name,
          coachId: coachData.rawCoach?.coachConfig?.coach_id || coachId,
        }));

        setConversationAgentState((prev) => ({
          ...prev,
          isLoadingAllItems: false,
          allConversations: conversations,
          totalCount: conversations.length,
          coaches: [coachData],
        }));
      } catch (error) {
        console.error("Error loading conversations:", error);
        setConversationAgentState((prev) => ({
          ...prev,
          isLoadingAllItems: false,
          error: "Failed to load conversations",
        }));
      }
    };

    loadCoachConversations();
  }, [userId, coachId]);

  // Auto-scroll to top when page loads
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  // Scroll to top after loading completes
  useEffect(() => {
    if (!isValidatingUserId && !conversationAgentState.isLoadingAllItems) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, conversationAgentState.isLoadingAllItems]);

  // Close delete modal when pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (showDeleteModal) {
          handleDeleteCancel();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteModal]);

  // Handle coach card click
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  const handleDeleteClick = (conversation) => {
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      // Create a temporary agent for the delete operation
      if (!conversationAgentRef.current) {
        conversationAgentRef.current = new CoachConversationAgent({
          userId,
          onError: (error) => {
            console.error("Agent error:", error);
          },
        });
      }

      const success =
        await conversationAgentRef.current.deleteCoachConversation(
          userId,
          conversationToDelete.coachId,
          conversationToDelete.conversationId,
        );

      if (success) {
        addToast("Conversation deleted successfully", "success");
        setShowDeleteModal(false);
        setConversationToDelete(null);

        // Refresh the conversation list
        setConversationAgentState((prev) => ({
          ...prev,
          allConversations: prev.allConversations.filter(
            (conv) =>
              conv.conversationId !== conversationToDelete.conversationId,
          ),
          totalCount: prev.totalCount - 1,
        }));
      } else {
        addToast("Failed to delete conversation", "error");
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      addToast("Failed to delete conversation", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  // Handle creating a new conversation
  const handleCreateConversation = async () => {
    if (isCreatingConversation || !userId || !coachId) return;

    setIsCreatingConversation(true);

    try {
      // Create a new conversation via the API
      const result = await createCoachConversation(userId, coachId, null, null);

      if (result?.conversation?.conversationId) {
        // Navigate to the new conversation
        navigate(
          `/training-grounds/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${result.conversation.conversationId}`,
        );
      } else {
        addToast("Failed to create conversation", "error");
        setIsCreatingConversation(false);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      addToast("Failed to create conversation", "error");
      setIsCreatingConversation(false);
    }
  };

  const handleViewConversation = (conversation) => {
    navigate(
      `/training-grounds/coach-conversations?userId=${userId}&coachId=${conversation.coachId}&conversationId=${conversation.conversationId}`,
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Unknown";
    }
  };

  // Render conversation card
  const renderConversationCard = (conversation) => {
    const isRecent = isRecentConversation(
      conversation.metadata?.lastActivity,
      conversation.createdAt,
    );

    // Use first ~35 characters of conversation title for header
    const conversationTitle = conversation.title || "Untitled Conversation";
    const headerText =
      conversationTitle.length > 35
        ? conversationTitle.substring(0, 35) + "..."
        : conversationTitle;

    const isBadgesCollapsed = collapsedBadges.has(conversation.conversationId);
    const isPreviewCollapsed = collapsedPreviews.has(
      conversation.conversationId,
    );

    // Calculate all badges
    const allBadges = [];

    // Active status badge
    allBadges.push({
      key: "status",
      label: conversation.metadata?.isActive !== false ? "Active" : "Archived",
    });

    // Tags (if available)
    if (conversation.metadata?.tags && conversation.metadata.tags.length > 0) {
      conversation.metadata.tags.forEach((tag, index) => {
        allBadges.push({
          key: `tag-${index}`,
          label: tag,
        });
      });
    } else if (conversation.tags && conversation.tags.length > 0) {
      conversation.tags.forEach((tag, index) => {
        allBadges.push({
          key: `tag-${index}`,
          label: tag,
        });
      });
    }

    const badgeLimit = 4;
    const visibleBadges = isBadgesCollapsed
      ? allBadges.slice(0, badgeLimit)
      : allBadges;
    const hasMoreBadges = allBadges.length > badgeLimit;

    return (
      <div
        key={`${conversation.coachId}-${conversation.conversationId}`}
        data-conversation-card
        className={`${containerPatterns.cardMedium} p-6 relative cursor-pointer mb-6`}
        onClick={() => handleViewConversation(conversation)}
      >
        {/* NEW badge for conversations with recent activity */}
        {isRecent && <NewBadge />}

        {/* Delete button - top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(conversation);
          }}
          className="absolute top-4 right-4 p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50"
          title="Delete conversation"
        >
          <TrashIcon />
        </button>

        {/* Header with pink dot */}
        <div className="flex items-start gap-3 mb-2 pr-16">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            {headerText}
          </h3>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center flex-wrap gap-4 mb-4">
          {/* Started Date */}
          {conversation.metadata?.startedAt && (
            <div className="flex items-center gap-1 text-synthwave-text-secondary font-rajdhani text-sm">
              <ClockIconSmall />
              <span>{formatDate(conversation.metadata.startedAt)}</span>
            </div>
          )}
          {/* Last Activity */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-muted">Last Activity:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {formatDate(
                conversation.metadata?.lastActivity || conversation.createdAt,
              )}
            </span>
          </div>
          {/* Message Count */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-muted">Messages:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {conversation.metadata?.totalMessages || 0}
            </span>
          </div>
        </div>

        {/* Collapsible Conversation Preview Section */}
        {(conversation.firstUserMessage || conversation.firstAiMessage) && (
          <div onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => togglePreviewCollapse(conversation.conversationId)}
              className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
            >
              <span>Conversation Preview</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isPreviewCollapsed ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {!isPreviewCollapsed && (
              <div
                className={`${containerPatterns.coachNotesSection} animate-fadeIn mb-4 space-y-3`}
              >
                {conversation.firstUserMessage && (
                  <div>
                    <div className="text-synthwave-neon-pink font-rajdhani text-xs uppercase font-semibold mb-1">
                      You:
                    </div>
                    <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                      {conversation.firstUserMessage.length > 250
                        ? conversation.firstUserMessage.substring(0, 250) +
                          "..."
                        : conversation.firstUserMessage}
                    </p>
                  </div>
                )}
                {conversation.firstAiMessage && (
                  <div>
                    <div className="text-synthwave-neon-cyan font-rajdhani text-xs uppercase font-semibold mb-1">
                      Coach:
                    </div>
                    <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                      {conversation.firstAiMessage.length > 250
                        ? conversation.firstAiMessage.substring(0, 250) + "..."
                        : conversation.firstAiMessage}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Badge Row - collapsible like memory cards */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {visibleBadges.map((badge) => (
            <span key={badge.key} className={badgePatterns.workoutDetail}>
              {badge.label}
            </span>
          ))}

          {hasMoreBadges && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBadgeCollapse(conversation.conversationId);
              }}
              className="text-synthwave-neon-cyan hover:text-synthwave-neon-pink text-xs font-rajdhani font-semibold uppercase transition-colors duration-200"
            >
              {isBadgesCollapsed
                ? `+${allBadges.length - badgeLimit} more`
                : "less"}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render the "Start New Conversation" card
  const renderCreateConversationCard = () => {
    return (
      <div
        key="create-conversation-card"
        onClick={isCreatingConversation ? undefined : handleCreateConversation}
        className={`${containerPatterns.dashedCard} mb-6 group ${
          isCreatingConversation
            ? "opacity-75 cursor-not-allowed"
            : "cursor-pointer"
        }`}
      >
        <div className="text-center flex flex-col justify-center items-center h-full min-h-[188px]">
          {/* Plus Icon or Spinner */}
          <div className="text-synthwave-neon-pink/40 group-hover:text-synthwave-neon-pink/80 transition-colors duration-300 mb-3">
            {isCreatingConversation ? (
              <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            )}
          </div>

          {/* Title */}
          <h3 className="font-russo font-bold text-synthwave-neon-pink/60 group-hover:text-synthwave-neon-pink text-lg uppercase mb-2 transition-colors duration-300">
            {isCreatingConversation ? "Creating..." : "Start New Conversation"}
          </h3>

          {/* Description */}
          <p className="font-rajdhani text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-sm transition-colors duration-300 text-center max-w-xs mx-auto">
            {isCreatingConversation
              ? "Setting up your new conversation"
              : "Begin a fresh conversation with your coach"}
          </p>
        </div>
      </div>
    );
  };

  const renderConversationList = () => {
    if (conversationAgentState.error) {
      return (
        <div className="py-12 flex justify-center -mx-8">
          <div className={`${containerPatterns.errorState} w-full max-w-4xl`}>
            <div className="flex items-center space-x-3 mb-4">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h5 className="font-russo text-lg text-red-400 uppercase">
                Error Loading Conversations
              </h5>
            </div>
            <p className="text-red-300 font-rajdhani text-sm">
              {conversationAgentState.error}
            </p>
          </div>
        </div>
      );
    }

    // Sort conversations by last activity in descending order
    const sortedConversations = [
      ...conversationAgentState.allConversations,
    ].sort((a, b) => {
      const dateA = new Date(a.metadata?.lastActivity || a.createdAt || 0);
      const dateB = new Date(b.metadata?.lastActivity || b.createdAt || 0);
      return dateB - dateA;
    });

    // Create an array of all items (create card first, then conversations)
    const allItems = [
      { type: "create", key: "create-card" },
      ...sortedConversations.map((conv) => ({
        type: "conversation",
        data: conv,
      })),
    ];

    // Render item based on type
    const renderItem = (item) => {
      if (item.type === "create") {
        return renderCreateConversationCard();
      }
      return renderConversationCard(item.data);
    };

    return (
      <div className="mb-8">
        {/* Mobile: Single column */}
        <div className="lg:hidden">
          {allItems.map((item, index) => (
            <div
              key={
                item.type === "create"
                  ? "create-card"
                  : `${item.data.coachId}-${item.data.conversationId}`
              }
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
        {/* Desktop: Two columns with alternating distribution */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
          {/* Left Column - even indices (0, 2, 4, ...) */}
          <div>
            {allItems
              .filter((_, index) => index % 2 === 0)
              .map((item) => (
                <div
                  key={
                    item.type === "create"
                      ? "create-card"
                      : `${item.data.coachId}-${item.data.conversationId}`
                  }
                >
                  {renderItem(item)}
                </div>
              ))}
          </div>
          {/* Right Column - odd indices (1, 3, 5, ...) */}
          <div>
            {allItems
              .filter((_, index) => index % 2 === 1)
              .map((item) => (
                <div
                  key={
                    item.type === "create"
                      ? "create-card"
                      : `${item.data.coachId}-${item.data.conversationId}`
                  }
                >
                  {renderItem(item)}
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  // Show skeleton loading while validating userId or loading conversations
  if (isValidatingUserId || conversationAgentState.isLoadingAllItems) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-72"></div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
              </div>
            </div>
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Quick Stats skeleton */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 -mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                <div className="h-6 w-8 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Conversation cards skeleton */}
          <div className="mb-8">
            {/* Mobile: Single column */}
            <div className="lg:hidden">
              {/* Create Card Skeleton */}
              <div
                className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center`}
                style={{ minHeight: "188px" }}
              >
                <div className="text-center flex flex-col items-center">
                  <div className="w-10 h-10 bg-synthwave-neon-pink/20 rounded animate-pulse mb-3"></div>
                  <div className="h-5 bg-synthwave-neon-pink/20 rounded animate-pulse w-48 mb-2"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-56"></div>
                </div>
              </div>
              {/* Conversation Card Skeletons */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.cardMedium} p-6 mb-6`}
                  style={{ minHeight: "188px" }}
                >
                  {/* Header with pink dot */}
                  <div className="flex items-start space-x-3 mb-2">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                  </div>

                  {/* Collapsed Conversation Preview Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                    <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  </div>

                  {/* Badge Row */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Two columns with alternating distribution */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
              {/* Left Column */}
              <div>
                {/* Create Card Skeleton (first item, left column) */}
                <div
                  className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center`}
                  style={{ minHeight: "188px" }}
                >
                  <div className="text-center flex flex-col items-center">
                    <div className="w-10 h-10 bg-synthwave-neon-pink/20 rounded animate-pulse mb-3"></div>
                    <div className="h-5 bg-synthwave-neon-pink/20 rounded animate-pulse w-48 mb-2"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-56"></div>
                  </div>
                </div>
                {/* Conversation Card Skeletons (indices 2, 4) */}
                {[2, 4].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                    style={{ minHeight: "188px" }}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>

                    {/* Collapsed Conversation Preview Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                      <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Right Column */}
              <div>
                {/* Conversation Card Skeletons (indices 1, 3, 5) */}
                {[1, 3, 5].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                    style={{ minHeight: "188px" }}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>

                    {/* Collapsed Conversation Preview Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                      <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userId || !coachId) {
    return (
      <div className="min-h-screen bg-synthwave-bg-tertiary">
        <div className="max-w-4xl mx-auto px-8 py-12 text-center">
          <h1 className="font-russo font-black text-3xl text-white mb-6 uppercase">
            Invalid Access
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary mb-8">
            User ID and Coach ID are required to access conversations.
          </p>
          <button
            onClick={() => navigate("/training-grounds")}
            className={`${buttonPatterns.primary} text-lg px-8 py-3`}
          >
            Return to Training Grounds
          </button>
        </div>
      </div>
    );
  }

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own conversations."}
      />
    );
  }

  return (
    <>
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header */}
          <header
            className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
            aria-label="Conversations Header"
          >
            {/* Left section: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              {/* Page Title with Hover Tooltip */}
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="conversations-info"
                data-tooltip-content="Review, organize, and manage all your conversations with your coach. Access detailed conversation history and track your coaching progress."
              >
                Your Conversations
              </h1>

              {/* Compact Coach Card */}
              {conversationAgentState.coaches[0] && (
                <CompactCoachCard
                  coachData={conversationAgentState.coaches[0]}
                  isOnline={true}
                  onClick={handleCoachCardClick}
                />
              )}
            </div>

            {/* Right section: Command Palette Button */}
            <div className="flex items-center gap-3">
              <CommandPaletteButton
                onClick={() => setIsCommandPaletteOpen(true)}
              />
            </div>
          </header>

          {/* Quick Stats */}
          <QuickStats
            stats={[
              {
                icon: ConversationIcon,
                value: conversationAgentState.totalCount || 0,
                tooltip: {
                  title: `${conversationAgentState.totalCount || 0} Total`,
                  description: "Total conversations with this coach",
                },
                color: "pink",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${conversationAgentState.totalCount || 0} total conversations`,
                id: "manage-convos-stat-total",
              },
              {
                icon: LightningIcon,
                value:
                  conversationAgentState.allConversations.filter(
                    (c) => c.metadata?.isActive !== false,
                  ).length || 0,
                tooltip: {
                  title: `${conversationAgentState.allConversations.filter((c) => c.metadata?.isActive !== false).length || 0} Active`,
                  description: "Active conversations (not archived)",
                },
                color: "cyan",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${conversationAgentState.allConversations.filter((c) => c.metadata?.isActive !== false).length || 0} active conversations`,
                id: "manage-convos-stat-active",
              },
              {
                icon: MessagesIcon,
                value: conversationAgentState.allConversations.reduce(
                  (total, conv) => total + (conv.metadata?.totalMessages || 0),
                  0,
                ),
                tooltip: {
                  title: `${conversationAgentState.allConversations.reduce((total, conv) => total + (conv.metadata?.totalMessages || 0), 0)} Messages`,
                  description: "Total messages across all conversations",
                },
                color: "purple",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${conversationAgentState.allConversations.reduce((total, conv) => total + (conv.metadata?.totalMessages || 0), 0)} total messages`,
                id: "manage-convos-stat-messages",
              },
              {
                icon: CalendarMonthIcon,
                value: (() => {
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                  return conversationAgentState.allConversations.filter(
                    (conv) => {
                      const lastActivity = new Date(
                        conv.metadata?.lastActivity || conv.createdAt || 0,
                      );
                      return lastActivity >= oneWeekAgo;
                    },
                  ).length;
                })(),
                tooltip: {
                  title: `${(() => {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    return conversationAgentState.allConversations.filter(
                      (conv) => {
                        const lastActivity = new Date(
                          conv.metadata?.lastActivity || conv.createdAt || 0,
                        );
                        return lastActivity >= oneWeekAgo;
                      },
                    ).length;
                  })()} This Week`,
                  description: "Conversations active this week",
                },
                color: "pink",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${(() => {
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                  return conversationAgentState.allConversations.filter(
                    (conv) => {
                      const lastActivity = new Date(
                        conv.metadata?.lastActivity || conv.createdAt || 0,
                      );
                      return lastActivity >= oneWeekAgo;
                    },
                  ).length;
                })()} conversations this week`,
                id: "manage-convos-stat-this-week",
              },
            ]}
          />

          {/* Conversation List */}
          <div className="mb-8">{renderConversationList()}</div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Conversation
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this conversation? This action
                cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltips */}
      <Tooltip
        id="conversations-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="coach-card-tooltip"
        {...tooltipPatterns.standard}
        place="bottom"
      />
      <Tooltip
        id="command-palette-button"
        {...tooltipPatterns.standard}
        place="bottom"
      />
    </>
  );
}

export default ManageCoachConversations;
