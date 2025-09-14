import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import {
  containerPatterns,
  buttonPatterns,
  layoutPatterns,
} from "../utils/uiPatterns";
import { themeClasses } from "../utils/synthwaveThemeClasses";
import CoachHeader from "./shared/CoachHeader";
import { isNewWorkout } from "../utils/dateUtils";
import { NeonBorder, NewBadge } from "./themes/SynthwaveComponents";
import { AccessDenied, LoadingScreen } from "./shared/AccessDenied";
import { useToast } from "../contexts/ToastContext";
import { MemoryAgent } from "../utils/agents/MemoryAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { FloatingMenuManager } from "./shared/FloatingMenuManager";
import CommandPalette from "./shared/CommandPalette";
import {
  CloseIcon,
  ConversationIcon,
  WorkoutIcon,
  ReportIcon,
  LightningIcon,
  LightbulbIcon,
  GlobeIcon,
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

const MemoryIcon = () => (
  <svg
    className="w-8 h-8"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const TagIcon = () => (
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
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState("");

  // Coach data state (for FloatingMenuManager)
  const [coachData, setCoachData] = useState(null);

  const memoryAgentRef = useRef(null);
  const coachAgentRef = useRef(null);

  const { addToast, success, error, info } = useToast();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      // Cmd/Ctrl + K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setCommandPaletteCommand("");
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [isCommandPaletteOpen]);

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

  // Memory state
  const [memoryAgentState, setMemoryAgentState] = useState({
    allMemories: [],
    isLoadingAllItems: !!userId, // Start loading if we have userId
    isLoadingItem: false,
    error: null,
    totalCount: 0,
  });

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
    window.scrollTo(0, 0);
  }, []);

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

  const handleDeleteClick = (memory) => {
    setMemoryToDelete(memory);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memoryToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      const success = await memoryAgentRef.current.deleteMemory(
        memoryToDelete.memoryId
      );

      if (success) {
        addToast("Memory deleted successfully", "success");
        setShowDeleteModal(false);
        setMemoryToDelete(null);
      } else {
        addToast("Failed to delete memory", "error");
      }
    } catch (error) {
      console.error("Error deleting memory:", error);
      addToast("Failed to delete memory", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setMemoryToDelete(null);
  };

  // Render memory card (content-focused without header)
  const renderMemoryCard = (memory) => {
    const isNew = isNewWorkout(memory.metadata?.createdAt || memory.createdAt);
    return (
      <div
        key={memory.memoryId}
        data-memory-card
        className={`${containerPatterns.contentCard} group relative`}
      >
        {/* NEW badge for memories created within 24 hours */}
        {isNew && <NewBadge />}
        {/* Delete button - always visible at top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(memory);
          }}
          className="absolute top-4 right-4 p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50"
          title="Delete memory"
        >
          <TrashIcon />
        </button>

        {/* Memory content */}
        <div className="pr-12">
          {/* Memory card header with colored dot */}
          <div className="flex items-start space-x-3 mb-3">
            <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
            <div className="font-rajdhani text-synthwave-text-primary text-base leading-relaxed">
              {memory.content}
            </div>
          </div>

          {/* Memory tags - positioned higher for better scanning */}
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Memory type tag */}
            <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani flex items-center space-x-1">
              <TagIcon />
              <span>
                {memoryAgentRef.current?.formatMemoryType(memory.memoryType) ||
                  "Unknown"}
              </span>
            </div>

            {/* Importance tag */}
            <div
              className={`px-2 py-1 rounded text-xs font-rajdhani font-medium ${
                memory.metadata?.importance === "high"
                  ? "bg-synthwave-neon-pink/20 text-synthwave-neon-pink"
                  : memory.metadata?.importance === "medium"
                    ? "bg-synthwave-neon-purple/20 text-synthwave-neon-purple"
                    : memory.metadata?.importance === "low"
                      ? "bg-synthwave-text-secondary/20 text-synthwave-text-secondary"
                      : "bg-synthwave-text-secondary/20 text-synthwave-text-secondary"
              }`}
            >
              {memoryAgentRef.current?.formatMemoryImportance(
                memory.metadata?.importance
              ) || "Unknown"}{" "}
              Priority
            </div>

            {/* Coach scope tag */}
            {memory.coachId ? (
              <div className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani">
                <span>Coach Specific</span>
              </div>
            ) : (
              <div className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani">
                <span>Global</span>
              </div>
            )}

            {/* Usage count tag */}
            <div className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-1 rounded text-xs font-rajdhani">
              Used {memory.metadata?.usageCount || 0} time
              {(memory.metadata?.usageCount || 0) !== 1 ? "s" : ""}
            </div>

            {/* User tags - moved up with other tags */}
            {memory.metadata?.tags &&
              memory.metadata.tags
                .filter((tag) => {
                  // Filter out tags that duplicate scope information
                  const lowerTag = tag.toLowerCase();
                  return (
                    !lowerTag.includes("coach specific") &&
                    !lowerTag.includes("global") &&
                    !lowerTag.includes("coach-specific") &&
                    !lowerTag.includes("coach_specific")
                  );
                })
                .map((tag, index) => (
                  <span
                    key={index}
                    className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani"
                  >
                    {tag}
                  </span>
                ))}
          </div>

          {/* Memory metadata - moved below tags */}
          <div className="flex flex-wrap items-center gap-4 font-rajdhani text-synthwave-text-secondary text-sm">
            {/* Created date */}
            <div className="flex items-center space-x-1">
              <ClockIcon />
              <span>
                {memoryAgentRef.current?.formatMemoryDate(
                  memory.metadata?.createdAt || memory.createdAt
                ) || "Unknown"}
              </span>
            </div>

            {/* Last used - only show if usage count > 0 */}
            {memory.metadata?.lastUsed &&
              (memory.metadata?.usageCount || 0) > 0 && (
                <div className="flex items-center space-x-1">
                  <ClockIcon />
                  <span>
                    Last used{" "}
                    {memoryAgentRef.current?.formatMemoryDate(
                      memory.metadata.lastUsed
                    ) || "Unknown"}
                  </span>
                </div>
              )}
          </div>
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

    if (memoryAgentState.allMemories.length === 0) {
      return (
        <div className="text-center py-12">
          <NeonBorder color="cyan" className="max-w-md mx-auto p-8">
            <h3 className="text-synthwave-neon-cyan mb-4">No Memories Found</h3>
            <p className="text-synthwave-text-secondary mb-6">
              You haven't stored any memories yet. Memories will appear here
              when you ask your coach to remember something.
            </p>
            <button
              onClick={() => navigate(`/training-grounds?userId=${userId}`)}
              className={buttonPatterns.secondarySmall}
            >
              Start Training
            </button>
          </NeonBorder>
        </div>
      );
    }

    // Sort memories by createdAt in descending order (newest first)
    const sortedMemories = [...memoryAgentState.allMemories].sort((a, b) => {
      const dateA = new Date(a.metadata?.createdAt || a.createdAt || 0);
      const dateB = new Date(b.metadata?.createdAt || b.createdAt || 0);
      return dateB - dateA; // Descending order
    });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {sortedMemories.map(renderMemoryCard)}
      </div>
    );
  };

  // Show skeleton loading while validating userId or loading memories
  if (isValidatingUserId || memoryAgentState.isLoadingAllItems) {
    return (
      <div className={`${themeClasses.container} min-h-screen pb-8`}>
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
          {/* Header skeleton */}
          <div className="mb-8 text-center">
            <div className="h-12 bg-synthwave-text-muted/20 rounded animate-pulse w-64 mx-auto mb-6"></div>

            {/* Coach header skeleton */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
              <div className="text-left">
                <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mb-2"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
              </div>
            </div>

            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-96 mx-auto mb-4"></div>
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mx-auto mb-4"></div>
            <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-48 mx-auto"></div>
          </div>

          {/* Quick Stats skeleton */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-2xl">
              <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="p-2 bg-synthwave-text-muted/20 rounded-lg">
                        <div className="w-4 h-4 bg-synthwave-text-muted/30 rounded"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-8 mb-1"></div>
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Memory cards skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`${containerPatterns.contentCard} group relative`}>
                {/* Delete button skeleton */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>

                <div className="pr-12">
                  {/* Memory header with dot skeleton */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-3 h-3 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-5/6"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-4/5"></div>
                    </div>
                  </div>

                  {/* Tags skeleton */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-26"></div>
                  </div>

                  {/* Metadata skeleton */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                  </div>
                </div>
              </div>
            ))}
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
      <div className={`${themeClasses.container} min-h-screen pb-8`}>
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Your Memories
            </h1>

            {/* Coach Status */}
            {coachData && <CoachHeader coachData={coachData} />}

            <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
              Review and manage your stored memories and preferences. Track
              important information your coaches remember about your goals and
              fitness journey.
            </p>
            <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <div className="flex items-center space-x-1 bg-synthwave-bg-primary/30 px-2 py-1 rounded border border-synthwave-neon-pink/20">
                <span className="text-synthwave-neon-pink">⌘</span>
                <span>K</span>
              </div>
              <span>for Command Palette</span>
              <div className="flex items-center space-x-1">
                <span>(</span>
                <svg
                  className="w-4 h-4 text-synthwave-neon-cyan"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>Works on any page )</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-2xl">
              <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-4">
                <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                  {/* Total Memories - PINK */}
                  <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                    <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50">
                      <LightbulbIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {memoryAgentState.totalCount || 0}
                      </div>
                      <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                        Total
                      </div>
                    </div>
                  </div>

                  {/* High Priority - CYAN */}
                  <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                    <div className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50">
                      <LightningIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {memoryAgentState.allMemories.filter(
                          (m) => m.metadata?.importance === "high"
                        ).length || 0}
                      </div>
                      <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                        High
                      </div>
                    </div>
                  </div>

                  {/* Medium Priority - PURPLE */}
                  <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                    <div className="p-2 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 hover:text-synthwave-neon-purple rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50">
                      <ReportIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {memoryAgentState.allMemories.filter(
                          (m) => m.metadata?.importance === "medium"
                        ).length || 0}
                      </div>
                      <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                        Medium
                      </div>
                    </div>
                  </div>

                  {/* Global Memories - PINK */}
                  <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                    <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50">
                      <GlobeIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">
                        {memoryAgentState.allMemories.filter((m) => !m.coachId)
                          .length || 0}
                      </div>
                      <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">
                        Global
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand("");
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={null} // Will need to be provided if workout functionality is needed
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === "conversation-created") {
            navigate(
              `/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`
            );
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="manage-memories"
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
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.primarySmall} text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
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
    </>
  );
}

export default ManageMemories;
