import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import {
  containerPatterns,
  badgePatterns,
  buttonPatterns,
  layoutPatterns,
  tooltipPatterns,
} from "../utils/ui/uiPatterns";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import QuickStats from "./shared/QuickStats";
import { isNewWorkout } from "../utils/dateUtils";
import { NeonBorder, NewBadge } from "./themes/SynthwaveComponents";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import AppFooter from "./shared/AppFooter";
import { useToast } from "../contexts/ToastContext";
import { MemoryAgent } from "../utils/agents/MemoryAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import { logger } from "../utils/logger";
import {
  LightningIcon,
  ReportIcon,
  LightbulbIcon,
  GlobeIcon,
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

function ManageMemories() {
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
  const [memoryToDelete, setMemoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Command palette state
  const { setIsCommandPaletteOpen, onCommandPaletteToggle } =
    useNavigationContext();

  // Coach data state
  const [coachData, setCoachData] = useState(null);

  const memoryAgentRef = useRef(null);
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
        logger.error("Failed to load coach data:", error);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Memory state
  const [memoryAgentState, setMemoryAgentState] = useState({
    allMemories: [],
    isLoadingAllItems: !!userId,
    isLoadingItem: false,
    error: null,
    totalCount: 0,
  });

  // Collapsed memory descriptions - initialize with all memory IDs (collapsed by default)
  const [collapsedDescriptions, setCollapsedDescriptions] = useState(() => {
    return new Set(memoryAgentState.allMemories.map((m) => m.memoryId));
  });

  // Collapsed badges - initialize with all memory IDs (collapsed by default)
  const [collapsedBadges, setCollapsedBadges] = useState(() => {
    return new Set(memoryAgentState.allMemories.map((m) => m.memoryId));
  });

  // Update collapsed descriptions when memories load
  useEffect(() => {
    if (memoryAgentState.allMemories.length > 0) {
      setCollapsedDescriptions(
        new Set(memoryAgentState.allMemories.map((m) => m.memoryId)),
      );
      setCollapsedBadges(
        new Set(memoryAgentState.allMemories.map((m) => m.memoryId)),
      );
    }
  }, [memoryAgentState.allMemories.length]);

  // Toggle memory description collapse
  const toggleDescriptionCollapse = (memoryId) => {
    setCollapsedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId);
      } else {
        newSet.add(memoryId);
      }
      return newSet;
    });
  };

  // Toggle badge collapse
  const toggleBadgeCollapse = (memoryId) => {
    setCollapsedBadges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId);
      } else {
        newSet.add(memoryId);
      }
      return newSet;
    });
  };

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, navigate]);

  // Initialize memory agent
  useEffect(() => {
    if (!userId) return;

    if (!memoryAgentRef.current) {
      memoryAgentRef.current = new MemoryAgent(userId, (newState) => {
        setMemoryAgentState((prevState) => ({
          ...prevState,
          allMemories:
            newState.allMemories !== undefined
              ? newState.allMemories
              : prevState.allMemories,
          isLoadingAllItems:
            newState.isLoadingAllItems !== undefined
              ? newState.isLoadingAllItems
              : false,
          isLoadingItem:
            newState.isLoadingItem !== undefined
              ? newState.isLoadingItem
              : false,
          error: newState.error !== undefined ? newState.error : null,
          totalCount:
            newState.totalCount !== undefined ? newState.totalCount : 0,
        }));
      });

      // Load initial data
      memoryAgentRef.current.loadAllMemories();
    }

    return () => {
      if (memoryAgentRef.current) {
        memoryAgentRef.current.destroy();
        memoryAgentRef.current = null;
      }
    };
  }, [userId]);

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
    if (!isValidatingUserId && !memoryAgentState.isLoadingAllItems) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, memoryAgentState.isLoadingAllItems]);

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

  const handleDeleteClick = (memory) => {
    setMemoryToDelete(memory);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memoryToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      const success = await memoryAgentRef.current.deleteMemory(
        memoryToDelete.memoryId,
      );

      if (success) {
        addToast("Memory deleted successfully", "success");
        setShowDeleteModal(false);
        setMemoryToDelete(null);
      } else {
        addToast("Failed to delete memory", "error");
      }
    } catch (error) {
      logger.error("Error deleting memory:", error);
      addToast("Failed to delete memory", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setMemoryToDelete(null);
  };

  // Handle creating a new memory - opens command palette with /save-memory
  const handleSaveNewMemory = () => {
    onCommandPaletteToggle("/save-memory ");
  };

  // Render the "Save New Memory" card
  const renderCreateMemoryCard = () => {
    return (
      <div
        key="create-memory-card"
        onClick={handleSaveNewMemory}
        className={`${containerPatterns.dashedCard} mb-6 group cursor-pointer`}
      >
        <div className="text-center flex flex-col justify-center items-center h-full min-h-[188px]">
          {/* Plus Icon */}
          <div className="text-synthwave-neon-pink/40 group-hover:text-synthwave-neon-pink/80 transition-colors duration-300 mb-3">
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
          </div>

          {/* Title */}
          <h3 className="font-russo font-bold text-synthwave-neon-pink/60 group-hover:text-synthwave-neon-pink text-lg uppercase mb-2 transition-colors duration-300">
            Save New Memory
          </h3>

          {/* Description */}
          <p className="font-rajdhani text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-sm transition-colors duration-300 text-center max-w-xs mx-auto">
            Record important details for your coach to remember
          </p>
        </div>
      </div>
    );
  };

  // Render memory card with FULL content (no truncation)
  const renderMemoryCard = (memory) => {
    const isNew = isNewWorkout(memory.metadata?.createdAt || memory.createdAt);

    // Strip "tag: value" patterns from memory content for clean display
    const cleanContent = memory.content.replace(/tag:\s*[^,]+/g, "").trim();

    // Use first ~35 characters of memory description for header
    const headerText =
      cleanContent.length > 35
        ? cleanContent.substring(0, 35) + "..."
        : cleanContent;

    const isDescriptionCollapsed = collapsedDescriptions.has(memory.memoryId);
    const isBadgesCollapsed = collapsedBadges.has(memory.memoryId);

    // Calculate all badges
    const allBadges = [];

    // Memory type badge
    allBadges.push({
      key: "type",
      label:
        memoryAgentRef.current?.formatMemoryType(memory.memoryType) ||
        "Unknown",
    });

    // Importance badge
    allBadges.push({
      key: "importance",
      label: `${memoryAgentRef.current?.formatMemoryImportance(memory.metadata?.importance) || "Unknown"} Priority`,
    });

    // Scope badge
    allBadges.push({
      key: "scope",
      label: memory.coachId ? "Coach Specific" : "Global",
    });

    // Tags (filter out scope-related tags)
    if (memory.metadata?.tags) {
      memory.metadata.tags
        .filter((tag) => {
          const lowerTag = tag.toLowerCase();
          return (
            !lowerTag.includes("coach specific") &&
            !lowerTag.includes("global") &&
            !lowerTag.includes("coach-specific") &&
            !lowerTag.includes("coach_specific")
          );
        })
        .forEach((tag, index) => {
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
        key={memory.memoryId}
        data-memory-card
        className={`${containerPatterns.cardMedium} p-6 relative mb-6`}
      >
        {/* NEW badge for memories created within 24 hours */}
        {isNew && <NewBadge />}

        {/* Delete button - top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(memory);
          }}
          className="absolute top-4 right-4 p-2 rounded-md bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 cursor-pointer"
          title="Delete memory"
        >
          <TrashIcon />
        </button>

        {/* Header with pink dot - using first ~35 chars of description */}
        <div className="flex items-start gap-3 mb-2 pr-16">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            {headerText}
          </h3>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center flex-wrap gap-4 mb-4 pr-16">
          {/* Created Date */}
          <div className="flex items-center gap-1 text-synthwave-text-secondary font-rajdhani text-sm">
            <ClockIconSmall />
            <span>
              {memoryAgentRef.current?.formatMemoryDate(
                memory.metadata?.createdAt || memory.createdAt,
              ) || "Unknown"}
            </span>
          </div>
          {/* Usage count */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-muted">Used:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {memory.metadata?.usageCount || 0}x
            </span>
          </div>
          {/* Last used */}
          {memory.metadata?.lastUsed &&
            (memory.metadata?.usageCount || 0) > 0 && (
              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                <span className="text-synthwave-text-muted">Last Used:</span>
                <span className="text-synthwave-neon-cyan font-medium">
                  {(
                    memoryAgentRef.current?.formatMemoryDate(
                      memory.metadata.lastUsed,
                    ) || "Unknown"
                  ).replace(/^Created\s+/i, "")}
                </span>
              </div>
            )}
        </div>

        {/* Collapsible Memory Description Section */}
        <div onClick={(e) => e.stopPropagation()} className="cursor-pointer">
          <button
            onClick={() => toggleDescriptionCollapse(memory.memoryId)}
            className={`${containerPatterns.collapsibleToggle} mb-2`}
          >
            <span>Memory Details</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isDescriptionCollapsed ? "rotate-180" : ""
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
          {!isDescriptionCollapsed && (
            <div
              className={`${containerPatterns.coachNotesSection} animate-fadeIn mb-4`}
            >
              <p className="font-rajdhani text-sm text-synthwave-text-secondary whitespace-pre-wrap">
                {cleanContent}
              </p>
            </div>
          )}
        </div>

        {/* Badge Row - styled like workout badges with expandable "more/less" */}
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
                toggleBadgeCollapse(memory.memoryId);
              }}
              className="text-synthwave-neon-cyan hover:text-synthwave-neon-pink hover:bg-synthwave-neon-cyan/5 text-xs font-rajdhani font-semibold uppercase transition-all duration-200 px-1 py-0.5"
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

  const renderMemoryList = () => {
    if (memoryAgentState.error) {
      return (
        <div className="text-center py-12">
          <NeonBorder color="pink" className="max-w-md mx-auto p-6">
            <p className="font-rajdhani text-synthwave-neon-pink text-xl font-bold mb-2">
              Error Loading Memories
            </p>
            <p className="font-rajdhani text-synthwave-text-secondary text-lg mb-6">
              {memoryAgentState.error}
            </p>
            <button
              onClick={() => memoryAgentRef.current?.loadAllMemories()}
              className={`${buttonPatterns.primarySmall} text-sm px-6 py-3`}
            >
              Try Again
            </button>
          </NeonBorder>
        </div>
      );
    }

    // Sort memories by createdAt in descending order (newest first)
    const sortedMemories = [...memoryAgentState.allMemories].sort((a, b) => {
      const dateA = new Date(a.metadata?.createdAt || a.createdAt || 0);
      const dateB = new Date(b.metadata?.createdAt || b.createdAt || 0);
      return dateB - dateA;
    });

    // Create an array of all items (create card first, then memories)
    const allItems = [
      { type: "create", key: "create-card" },
      ...sortedMemories.map((memory) => ({
        type: "memory",
        data: memory,
      })),
    ];

    // Render item based on type
    const renderItem = (item) => {
      if (item.type === "create") {
        return renderCreateMemoryCard();
      }
      return renderMemoryCard(item.data);
    };

    return (
      <div className="mb-8">
        {/* Mobile: Single column */}
        <div className="lg:hidden">
          {allItems.map((item, index) => (
            <div
              key={item.type === "create" ? "create-card" : item.data.memoryId}
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
                    item.type === "create" ? "create-card" : item.data.memoryId
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
                    item.type === "create" ? "create-card" : item.data.memoryId
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

  // Show skeleton loading while validating userId or loading memories
  if (isValidatingUserId || memoryAgentState.isLoadingAllItems) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact horizontal header skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Left section: Title + Coach Card skeleton */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 animate-pulse w-64"></div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-md">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
              </div>
            </div>

            {/* Right section: Command Palette Button skeleton */}
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-none animate-pulse"></div>
          </header>

          {/* Quick Stats skeleton */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 -mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-synthwave-text-muted/20 rounded-none animate-pulse"></div>
                <div className="h-6 w-8 bg-synthwave-text-muted/20 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Memory cards skeleton */}
          <div className="mb-8">
            {/* Mobile: Single column */}
            <div className="lg:hidden">
              {/* Create Card Skeleton */}
              <div
                className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center min-h-[166px]`}
              >
                <div className="text-center flex flex-col items-center">
                  <div className="w-10 h-10 bg-synthwave-neon-pink/20 animate-pulse mb-3"></div>
                  <div className="h-5 bg-synthwave-neon-pink/20 animate-pulse w-48 mb-2"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-56"></div>
                </div>
              </div>
              {/* Memory Card Skeletons */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.cardMedium} p-6 mb-6`}
                >
                  {/* Header with pink dot */}
                  <div className="flex items-start space-x-3 mb-2">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                  </div>

                  {/* Collapsible Description Section - Collapsed */}
                  <div className="mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-32"></div>
                  </div>

                  {/* Badge Row */}
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
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
                  className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center min-h-[166px]`}
                >
                  <div className="text-center flex flex-col items-center">
                    <div className="w-10 h-10 bg-synthwave-neon-pink/20 animate-pulse mb-3"></div>
                    <div className="h-5 bg-synthwave-neon-pink/20 animate-pulse w-48 mb-2"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-56"></div>
                  </div>
                </div>
                {/* Memory Card Skeletons */}
                {[1, 3].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    </div>

                    {/* Collapsible Description Section - Collapsed */}
                    <div className="mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-32"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Right Column */}
              <div>
                {/* Memory Card Skeletons */}
                {[2, 4].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    </div>

                    {/* Collapsible Description Section - Collapsed */}
                    <div className="mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-32"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
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

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own memories."}
      />
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-synthwave-bg-tertiary">
        <div className="max-w-4xl mx-auto px-8 py-12 text-center">
          <h1 className="font-russo font-black text-3xl text-white mb-6 uppercase">
            Invalid Access
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary mb-8">
            User ID is required to access memories.
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

  return (
    <>
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header */}
          <header
            className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
            aria-label="Manage Memories Header"
          >
            {/* Left section: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              {/* Page Title with Hover Tooltip */}
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="manage-memories-info"
                data-tooltip-content="Review and manage your stored memories and preferences. Track important information your coaches remember about your goals and fitness journey."
              >
                Your Memories
              </h1>

              {/* Compact Coach Card */}
              {coachData && (
                <CompactCoachCard
                  coachData={coachData}
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
                icon: LightbulbIcon,
                value: memoryAgentState.totalCount || 0,
                tooltip: {
                  title: "Total Memories",
                  description:
                    "All stored memories and preferences tracked by your coaches",
                },
                color: "pink",
                isLoading: memoryAgentState.isLoading,
                ariaLabel: `${memoryAgentState.totalCount || 0} total memories`,
              },
              {
                icon: LightningIcon,
                value:
                  memoryAgentState.allMemories.filter(
                    (m) => m.metadata?.importance === "high",
                  ).length || 0,
                tooltip: {
                  title: "High Priority",
                  description:
                    "Critical memories that are frequently referenced by your coaches",
                },
                color: "cyan",
                isLoading: memoryAgentState.isLoading,
                ariaLabel: `${memoryAgentState.allMemories.filter((m) => m.metadata?.importance === "high").length || 0} high priority memories`,
              },
              {
                icon: ReportIcon,
                value:
                  memoryAgentState.allMemories.filter(
                    (m) => m.metadata?.importance === "medium",
                  ).length || 0,
                tooltip: {
                  title: "Medium Priority",
                  description:
                    "Important memories that provide context for your coaching sessions",
                },
                color: "purple",
                isLoading: memoryAgentState.isLoading,
                ariaLabel: `${memoryAgentState.allMemories.filter((m) => m.metadata?.importance === "medium").length || 0} medium priority memories`,
              },
              {
                icon: GlobeIcon,
                value:
                  memoryAgentState.allMemories.filter((m) => !m.coachId)
                    .length || 0,
                tooltip: {
                  title: "Global Memories",
                  description:
                    "Memories shared across all your coaches and training sessions",
                },
                color: "pink",
                isLoading: memoryAgentState.isLoading,
                ariaLabel: `${memoryAgentState.allMemories.filter((m) => !m.coachId).length || 0} global memories`,
              },
            ]}
          />

          {/* Error state */}
          {memoryAgentState.error && (
            <div className="text-center py-12">
              <NeonBorder color="pink" className="max-w-md mx-auto p-6">
                <p className="font-rajdhani text-synthwave-neon-pink text-xl font-bold mb-2">
                  Error Loading Memories
                </p>
                <p className="font-rajdhani text-synthwave-text-secondary text-lg">
                  {memoryAgentState.error}
                </p>
              </NeonBorder>
            </div>
          )}

          {/* Memory List */}
          {!memoryAgentState.error && (
            <div className="mb-8">{renderMemoryList()}</div>
          )}
          <AppFooter />
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
                Delete Memory
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this memory? This action cannot
                be undone.
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
        id="manage-memories-info"
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

export default ManageMemories;
