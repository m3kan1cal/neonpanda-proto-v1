import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from 'react-tooltip';
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import {
  containerPatterns,
  buttonPatterns,
  layoutPatterns,
  tooltipPatterns,
} from "../utils/ui/uiPatterns";
import { themeClasses } from "../utils/synthwaveThemeClasses";
import { getCoachConversations } from "../utils/apis/coachConversationApi";
import CoachHeader from "./shared/CoachHeader";
import CompactCoachCard from './shared/CompactCoachCard';
import CommandPaletteButton from './shared/CommandPaletteButton';
import { useNavigationContext } from '../contexts/NavigationContext';
import QuickStats from './shared/QuickStats';
import { isRecentConversation } from "../utils/dateUtils";
import { NeonBorder, NewBadge } from "./themes/SynthwaveComponents";
import { useToast } from "../contexts/ToastContext";
import { CoachConversationAgent } from "../utils/agents/CoachConversationAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import { FloatingMenuManager } from "./shared/FloatingMenuManager";
import {
  CloseIcon,
  ChatIconSmall,
  ConversationIcon,
  WorkoutIcon,
  ReportIcon,
  LightningIcon,
  MessagesIcon,
  CalendarMonthIcon,
} from "./themes/SynthwaveComponents";

// Icons
const TrashIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

// ProgramIcon component (matching TrainingGrounds.jsx)
const ProgramIcon = () => (
  <svg
    className="w-8 h-8"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const EyeIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const ClockIcon = () => (
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

const MessageIcon = () => (
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
      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
    />
  </svg>
);

const UserIcon = () => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
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

  // Command palette state
  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Coach data state (for FloatingMenuManager)
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

  // Load coach data for FloatingMenuManager
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const loadedCoachData = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId
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
    isLoadingAllItems: !!(userId && coachId), // Start loading if we have both userId and coachId
    isLoadingItem: false,
    error: null,
    totalCount: 0,
    coaches: [], // Store coach data for display
  });

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

        // Get the specific coach details using CoachAgent (same as TrainingGrounds.jsx)
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const coachData = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId
        );

        if (!coachData) {
          setConversationAgentState((prev) => ({
            ...prev,
            isLoadingAllItems: false,
            error: "Coach not found",
          }));
          return;
        }

        // Load conversations for this specific coach
        const result = await getCoachConversations(userId, coachId);
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

  // Auto-scroll to top when page loads (with scroll restoration disabled)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
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

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Create coach name handler using the agent's helper method
  const handleSaveCoachName = coachAgentRef.current?.createCoachNameHandler(
    userId,
    coachId,
    (newName) => setConversationAgentState((prevState) => ({
      ...prevState,
      coaches: prevState.coaches.map((coach) =>
        coach.coachId === coachId ? { ...coach, name: newName } : coach
      ),
    })),
    { success, error }
  );

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
          conversationToDelete.conversationId
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
              conv.conversationId !== conversationToDelete.conversationId
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

  const handleViewConversation = (conversation) => {
    navigate(
      `/training-grounds/coach-conversations?userId=${userId}&coachId=${conversation.coachId}&conversationId=${conversation.conversationId}`
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
      conversation.createdAt
    );
    return (
      <div
        key={`${conversation.coachId}-${conversation.conversationId}`}
        data-conversation-card
        className={`${containerPatterns.cardMedium} p-6 group transition-all duration-300 hover:border-synthwave-neon-cyan/40 hover:bg-synthwave-bg-card/40 relative cursor-pointer`}
        onClick={() => handleViewConversation(conversation)}
      >
        {/* NEW badge for conversations with recent activity */}
        {isRecent && <NewBadge />}
        {/* Action buttons - always visible at top right */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewConversation(conversation);
            }}
            className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
            title="View conversation"
          >
            <EyeIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(conversation);
            }}
            className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50"
            title="Delete conversation"
          >
            <TrashIcon />
          </button>
        </div>

        {/* Conversation content */}
        <div className="pr-16">
          <div className="flex items-start space-x-3 mb-4">
            <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
            <h3 className="font-russo font-bold text-white text-lg uppercase">
              {conversation.title || "Untitled Conversation"}
            </h3>
          </div>

          {/* Conversation metadata */}
          <div className="flex flex-wrap items-center gap-4 font-rajdhani text-synthwave-text-primary text-sm">
            {/* Message count */}
            <div className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-1 rounded text-xs font-rajdhani flex items-center space-x-1">
              <MessageIcon />
              <span>{conversation.metadata?.totalMessages || 0} messages</span>
            </div>

            {/* Active status */}
            <div
              className={`px-2 py-1 rounded text-xs font-rajdhani font-medium ${
                conversation.metadata?.isActive !== false
                  ? "bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan"
                  : "bg-synthwave-text-secondary/20 text-synthwave-text-secondary"
              }`}
            >
              {conversation.metadata?.isActive !== false
                ? "Active"
                : "Archived"}
            </div>

            {/* Started date */}
            {conversation.metadata?.startedAt && (
              <div className="flex items-center space-x-1 text-synthwave-text-secondary">
                <ClockIcon />
                <span>
                  Started: {formatDate(conversation.metadata.startedAt)}
                </span>
              </div>
            )}

            {/* Last activity */}
            <div className="flex items-center space-x-1 text-synthwave-text-secondary">
              <ClockIcon />
              <span>
                Last:{" "}
                {formatDate(
                  conversation.metadata?.lastActivity || conversation.createdAt
                )}
              </span>
            </div>
          </div>

          {/* Tags if available */}
          {((conversation.metadata?.tags &&
            conversation.metadata.tags.length > 0) ||
            (conversation.tags && conversation.tags.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(conversation.metadata?.tags || conversation.tags || []).map(
                (tag, index) => (
                  <span
                    key={index}
                    className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          )}
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

    if (conversationAgentState.allConversations.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="font-rajdhani text-synthwave-neon-cyan text-base">
            No Conversations Found
          </div>
          <div className="font-rajdhani text-synthwave-text-muted text-sm mt-2">
            You haven't started any conversations yet. Create a coach and start your first conversation to see it here.
          </div>
        </div>
      );
    }

    // Sort conversations by last activity in descending order (most recent first)
    const sortedConversations = [
      ...conversationAgentState.allConversations,
    ].sort((a, b) => {
      const dateA = new Date(a.metadata?.lastActivity || a.createdAt || 0);
      const dateB = new Date(b.metadata?.lastActivity || b.createdAt || 0);
      return dateB - dateA; // Descending order
    });

    return (
      <div className="space-y-4">
        {sortedConversations.map(renderConversationCard)}
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
            {/* Left: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              {/* Title skeleton - compact size */}
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 rounded animate-pulse w-72"></div>

              {/* Compact coach card skeleton - horizontal pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right: Command button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Quick Stats skeleton */}
          <QuickStats
            stats={[1, 2, 3, 4].map((i) => ({
              icon: null,
              value: 0,
              tooltip: { title: '', description: '' },
              color: 'cyan',
              isLoading: true,
              id: `skeleton-stat-${i}`
            }))}
          />

          {/* Conversation cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-2"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                  </div>
                </div>
              </div>
            ))}
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
              <CommandPaletteButton onClick={() => setIsCommandPaletteOpen(true)} />
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
                  description: "Total conversations with this coach"
                },
                color: "pink",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${conversationAgentState.totalCount || 0} total conversations`,
                id: "manage-convos-stat-total"
              },
              {
                icon: LightningIcon,
                value: conversationAgentState.allConversations.filter(c => c.metadata?.isActive !== false).length || 0,
                tooltip: {
                  title: `${conversationAgentState.allConversations.filter(c => c.metadata?.isActive !== false).length || 0} Active`,
                  description: "Active conversations (not archived)"
                },
                color: "cyan",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${conversationAgentState.allConversations.filter(c => c.metadata?.isActive !== false).length || 0} active conversations`,
                id: "manage-convos-stat-active"
              },
              {
                icon: MessagesIcon,
                value: conversationAgentState.allConversations.reduce((total, conv) => total + (conv.metadata?.totalMessages || 0), 0),
                tooltip: {
                  title: `${conversationAgentState.allConversations.reduce((total, conv) => total + (conv.metadata?.totalMessages || 0), 0)} Messages`,
                  description: "Total messages across all conversations"
                },
                color: "purple",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${conversationAgentState.allConversations.reduce((total, conv) => total + (conv.metadata?.totalMessages || 0), 0)} total messages`,
                id: "manage-convos-stat-messages"
              },
              {
                icon: CalendarMonthIcon,
                value: (() => {
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                  return conversationAgentState.allConversations.filter(conv => {
                    const lastActivity = new Date(conv.metadata?.lastActivity || conv.createdAt || 0);
                    return lastActivity >= oneWeekAgo;
                  }).length;
                })(),
                tooltip: {
                  title: `${(() => {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    return conversationAgentState.allConversations.filter(conv => {
                      const lastActivity = new Date(conv.metadata?.lastActivity || conv.createdAt || 0);
                      return lastActivity >= oneWeekAgo;
                    }).length;
                  })()} This Week`,
                  description: "Conversations active this week"
                },
                color: "pink",
                isLoading: conversationAgentState.isLoadingAllItems,
                ariaLabel: `${(() => {
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                  return conversationAgentState.allConversations.filter(conv => {
                    const lastActivity = new Date(conv.metadata?.lastActivity || conv.createdAt || 0);
                    return lastActivity >= oneWeekAgo;
                  }).length;
                })()} conversations this week`,
                id: "manage-convos-stat-this-week"
              }
            ]}
          />

          {/* Conversation List */}
          <div className="mb-8">{renderConversationList()}</div>
        </div>
      </div>

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="manage-conversations"
        coachData={coachData}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}>
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
