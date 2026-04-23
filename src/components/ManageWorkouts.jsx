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
  formPatterns,
  inputPatterns,
  typographyPatterns,
} from "../utils/ui/uiPatterns";
import { AccessDenied } from "./shared/AccessDenied";
import MarkdownRenderer from "./shared/MarkdownRenderer";
import { isNewWorkout } from "../utils/dateUtils";
import { NeonBorder, NewBadge } from "./themes/SynthwaveComponents";
import { useToast } from "../contexts/ToastContext";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import EmptyStateCard from "./shared/EmptyStateCard";
import { useNavigationContext } from "../contexts/NavigationContext";
import QuickStats from "./shared/QuickStats";
import AppFooter from "./shared/AppFooter";
import { logger } from "../utils/logger";
import {
  StackIcon,
  CalendarMonthIcon,
  CalendarIcon,
  ClockIcon,
  TargetIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  EditIcon,
  FireIcon,
  TrophyIcon,
} from "./themes/SynthwaveComponents";
import ShareWorkoutModal from "./workouts/ShareWorkoutModal";

// Icons
const ShareCardIcon = () => (
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
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
    />
  </svg>
);
const ClockIconSmall = () => (
  <svg
    className="w-3 h-3"
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

function ManageWorkouts() {
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
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Actions menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Share modal state
  const [shareWorkout, setShareWorkout] = useState(null);

  // Edit modal state
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCompletedAt, setEditCompletedAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Global Command Palette state
  const { setIsCommandPaletteOpen, onCommandPaletteToggle } =
    useNavigationContext();

  // Coach data state
  const [coachData, setCoachData] = useState(null);

  const workoutAgentRef = useRef(null);
  const coachAgentRef = useRef(null);

  const { addToast, success, error, info } = useToast();

  // Unified workout state
  const [workoutAgentState, setWorkoutAgentState] = useState({
    allWorkouts: [],
    recentWorkouts: [],
    isLoadingAllItems: !!userId,
    isLoadingRecentItems: false,
    isLoadingItem: false,
    isLoadingStats: !!userId,
    error: null,
    totalCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    trainingDaysCount: 0,
  });

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, navigate]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          allWorkouts:
            newState.allWorkouts !== undefined
              ? newState.allWorkouts
              : prevState.allWorkouts,
          recentWorkouts:
            newState.recentWorkouts !== undefined
              ? newState.recentWorkouts
              : prevState.recentWorkouts,
          isLoadingAllItems:
            newState.isLoadingAllItems !== undefined
              ? newState.isLoadingAllItems
              : prevState.isLoadingAllItems,
          isLoadingRecentItems:
            newState.isLoadingRecentItems !== undefined
              ? newState.isLoadingRecentItems
              : prevState.isLoadingRecentItems,
          isLoadingItem:
            newState.isLoadingItem !== undefined
              ? newState.isLoadingItem
              : prevState.isLoadingItem,
          isLoadingStats:
            newState.isLoadingCount !== undefined
              ? newState.isLoadingCount
              : prevState.isLoadingStats,
          error: newState.error !== undefined ? newState.error : null,
          totalCount:
            newState.totalWorkoutCount !== undefined
              ? newState.totalWorkoutCount
              : prevState.totalCount,
          currentStreak:
            newState.currentStreak !== undefined
              ? newState.currentStreak
              : prevState.currentStreak,
          bestStreak:
            newState.bestStreak !== undefined
              ? newState.bestStreak
              : prevState.bestStreak,
          trainingDaysCount:
            newState.trainingDaysCount !== undefined
              ? newState.trainingDaysCount
              : prevState.trainingDaysCount,
        }));
      });

      workoutAgentRef.current.onError = (error) => {
        logger.error("Workout agent error:", error);
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          error: error.message || "Failed to load workouts",
        }));
      };
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
        const coachData = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );
        setCoachData(coachData);
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

  // Load all workouts
  useEffect(() => {
    if (!userId || !workoutAgentRef.current) return;

    const loadWorkouts = async () => {
      try {
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          isLoadingAllItems: true,
          error: null,
        }));

        await workoutAgentRef.current.loadWorkoutStats();
      } catch (error) {
        logger.error("Error loading workout history:", error);
      }
    };

    loadWorkouts();
  }, [userId]);

  // Handle coach card click
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Handle delete click
  const handleDeleteClick = (workout) => {
    setWorkoutToDelete(workout);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!workoutToDelete || !workoutAgentRef.current || !userId) return;

    setIsDeleting(true);
    try {
      await workoutAgentRef.current.deleteWorkout(
        userId,
        workoutToDelete.workoutId,
      );
      await workoutAgentRef.current.loadTotalWorkoutCount();
      success("Workout deleted successfully");
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } catch (error) {
      logger.error("Error deleting workout:", error);
      error("Failed to delete workout");
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  // Handle edit click - open edit modal with pre-filled values
  const handleEditClick = (workout) => {
    setEditingWorkout(workout);
    setEditName(workout.workoutName || workout.workoutData?.workout_name || "");
    // Format completedAt as datetime-local value (YYYY-MM-DDTHH:MM)
    if (workout.completedAt) {
      const date = new Date(workout.completedAt);
      const localDatetime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
      setEditCompletedAt(localDatetime);
    } else {
      setEditCompletedAt("");
    }
  };

  // Handle share click - load full workout data then open share modal
  const handleShareClick = async (workout) => {
    try {
      if (workout.workoutData) {
        setShareWorkout(workout);
        return;
      }
      const fullWorkout = await workoutAgentRef.current?.getWorkout(
        workout.workoutId,
      );
      setShareWorkout(fullWorkout || workout);
    } catch (err) {
      logger.error("Error loading workout for share:", err);
      setShareWorkout(workout);
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingWorkout || !workoutAgentRef.current || !userId) return;

    setIsSaving(true);
    try {
      const updates = {
        workoutName: editName.trim(),
      };

      // Only include completedAt if it was actually changed
      if (editCompletedAt !== "") {
        const originalDate = new Date(editingWorkout.completedAt);
        const originalLocalDatetime = new Date(
          originalDate.getTime() - originalDate.getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16);

        if (editCompletedAt !== originalLocalDatetime) {
          updates.completedAt = new Date(editCompletedAt).toISOString();
        }
      }

      await workoutAgentRef.current.updateWorkout(
        userId,
        editingWorkout.workoutId,
        updates,
      );
      success("Workout updated successfully");
      setEditingWorkout(null);
      setEditName("");
      setEditCompletedAt("");
    } catch (err) {
      logger.error("Error updating workout:", err);
      error("Failed to update workout");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingWorkout(null);
    setEditName("");
    setEditCompletedAt("");
  };

  // Handle creating a new workout - opens command palette with /log-workout
  const handleLogNewWorkout = () => {
    onCommandPaletteToggle("/log-workout ");
  };

  // Format date for display
  const formatWorkoutDate = (dateString) => {
    const date = new Date(dateString);
    const isCurrentYear = date.getFullYear() === new Date().getFullYear();
    const datePart = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(!isCurrentYear && { year: "numeric" }),
    });
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { date: datePart, time: timePart };
  };

  // Collapsed workout summary sections - initialize with all workout IDs (collapsed by default)
  const [collapsedSummaries, setCollapsedSummaries] = useState(() => {
    return new Set(workoutAgentState.allWorkouts.map((w) => w.workoutId));
  });

  // Update collapsed summaries when workouts load
  useEffect(() => {
    if (workoutAgentState.allWorkouts.length > 0) {
      setCollapsedSummaries(
        new Set(workoutAgentState.allWorkouts.map((w) => w.workoutId)),
      );
    }
  }, [workoutAgentState.allWorkouts.length]);

  // Toggle workout summary collapse
  const toggleSummaryCollapse = (workoutId) => {
    setCollapsedSummaries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  };

  // Render the "Log New Workout" card
  const renderCreateWorkoutCard = () => {
    return (
      <div
        key="create-workout-card"
        onClick={handleLogNewWorkout}
        className={`${containerPatterns.dashedCard} mb-6 group cursor-pointer`}
      >
        <div className="text-center flex flex-col justify-center items-center h-full min-h-[220px]">
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
          <h3 className="font-header font-bold text-synthwave-neon-pink/60 group-hover:text-synthwave-neon-pink text-lg uppercase mb-2 transition-colors duration-300">
            Log New Workout
          </h3>

          {/* Description */}
          <p className="font-body text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-sm transition-colors duration-300 text-center max-w-xs mx-auto">
            Record your training session and track your progress
          </p>
        </div>
      </div>
    );
  };

  // Render workout card
  const renderWorkoutCard = (workout) => {
    const dateInfo = formatWorkoutDate(workout.completedAt || workout.date);
    const workoutName =
      workoutAgentRef.current?.formatWorkoutSummary(workout, true) ||
      workout.workoutName ||
      "Workout";

    const duration = workout.duration
      ? Math.round(workout.duration / 60)
      : null;
    const discipline = workout.discipline || "fitness";
    const intensity =
      workout.performanceMetrics?.intensity ||
      workout.workoutData?.performance_metrics?.intensity ||
      0;
    const rpe =
      workout.performanceMetrics?.perceived_exertion ||
      workout.workoutData?.performance_metrics?.perceived_exertion ||
      0;
    const confidence =
      workout.extractionMetadata?.confidence || workout.confidence || 0;
    const coachName = workout.coachNames?.[0]
      ? workout.coachNames[0].replace(/_/g, " ").split(" ")[0]
      : "AI Coach";

    const workoutDate = new Date(workout.completedAt);
    const now = new Date();
    const isNew = isNewWorkout(workout.completedAt) || workoutDate > now;

    const isSummaryCollapsed = collapsedSummaries.has(workout.workoutId);

    return (
      <div
        key={workout.workoutId}
        data-workout-card
        className={`${containerPatterns.cardMedium} p-6 relative cursor-pointer mb-6`}
        onClick={() =>
          navigate(
            `/training-grounds/workouts?workoutId=${workout.workoutId}&userId=${userId}&coachId=${workout.coachIds?.[0] || "default"}`,
          )
        }
      >
        {/* NEW badge */}
        {isNew && <NewBadge />}

        {/* Actions menu - top right */}
        <div className="absolute top-3 right-3 z-10 actions-menu-container">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(
                openMenuId === workout.workoutId ? null : workout.workoutId,
              );
            }}
            className={`p-2 rounded-md transition-colors duration-200 focus:outline-none active:outline-none focus:ring-1 focus:ring-synthwave-neon-cyan/50 cursor-pointer ${
              openMenuId === workout.workoutId
                ? "text-synthwave-neon-cyan bg-synthwave-bg-primary/50 ring-1 ring-synthwave-neon-cyan/50"
                : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-bg-primary/50"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label="More actions"
          >
            <EllipsisVerticalIcon />
          </button>

          {/* Dropdown Menu */}
          {openMenuId === workout.workoutId && (
            <div className="absolute right-0 mt-2 w-44 bg-synthwave-bg-card border border-synthwave-neon-cyan/20 rounded-md shadow-[4px_4px_16px_rgba(0,255,255,0.06)] overflow-hidden z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(workout);
                  setOpenMenuId(null);
                }}
                className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200 cursor-pointer"
              >
                <EditIcon />
                <span className="font-body font-medium text-sm">
                  Edit Workout
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareClick(workout);
                  setOpenMenuId(null);
                }}
                className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200 cursor-pointer"
              >
                <ShareCardIcon />
                <span className="font-body font-medium text-sm">
                  Share Workout
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(workout);
                  setOpenMenuId(null);
                }}
                className="w-full pl-4 pr-3 py-2 text-left flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-200 cursor-pointer"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <TrashIcon />
                </div>
                <span className="font-body font-medium text-sm">
                  Delete Workout
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Header with pink dot */}
        <div className="flex items-start gap-3 mb-2 pr-16">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
          <h3 className="font-header font-bold text-white text-lg uppercase">
            {workoutName}
          </h3>
        </div>

        {/* Metadata Rows - 3 items per line */}
        <div className="space-y-2 mb-4">
          {/* Row 1: Completed at, Duration, AI Score */}
          <div className="flex items-center flex-wrap gap-4">
            {/* Completed at */}
            <div className="flex items-center gap-1.5 font-body text-sm">
              <ClockIconSmall />
              <span className="text-synthwave-text-muted">Completed:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {dateInfo.date} · {dateInfo.time}
              </span>
            </div>
            {/* Duration */}
            {duration && (
              <div className="flex items-center gap-1.5 font-body text-sm">
                <span className="text-synthwave-text-muted">Duration:</span>
                <span className="text-synthwave-neon-cyan font-medium">
                  {duration}m
                </span>
              </div>
            )}
            {/* AI Score */}
            <div className="flex items-center gap-1.5 font-body text-sm">
              <span className="text-synthwave-text-muted">AI Score:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>
          {/* Row 2: Intensity, RPE (only if present) */}
          {(intensity > 0 || rpe > 0) && (
            <div className="flex items-center gap-4">
              {intensity > 0 && (
                <div className="flex items-center gap-1.5 font-body text-sm">
                  <span className="text-synthwave-text-muted">Intensity:</span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {intensity}/10
                  </span>
                </div>
              )}
              {rpe > 0 && (
                <div className="flex items-center gap-1.5 font-body text-sm">
                  <span className="text-synthwave-text-muted">RPE:</span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {rpe}/10
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Workout Summary Section */}
        {workout.summary && (
          <div onClick={(e) => e.stopPropagation()} className="cursor-pointer">
            <button
              onClick={() => toggleSummaryCollapse(workout.workoutId)}
              className={`${containerPatterns.collapsibleToggle} mb-2`}
            >
              <span>Workout Summary</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isSummaryCollapsed ? "rotate-180" : ""
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
            {!isSummaryCollapsed && (
              <div
                className={`${containerPatterns.coachNotesSection} animate-fadeIn`}
              >
                <MarkdownRenderer
                  content={workout.summary}
                  className="font-body text-sm text-synthwave-text-secondary mb-4"
                />

                {/* RPE and Intensity Spectrum Bars */}
                <div className="space-y-3 pt-2">
                  {/* RPE Bar */}
                  {rpe > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-body text-xs text-synthwave-text-muted uppercase font-semibold">
                          RPE (Perceived Exertion)
                        </span>
                        <span className="font-body text-xs text-synthwave-text-muted font-bold">
                          {rpe}/10
                        </span>
                      </div>
                      <div className="h-2 bg-synthwave-bg-primary/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-synthwave-neon-cyan via-synthwave-neon-pink to-synthwave-neon-purple transition-all duration-500"
                          style={{ width: `${(rpe / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Intensity Bar */}
                  {intensity > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-body text-xs text-synthwave-text-muted uppercase font-semibold">
                          Intensity
                        </span>
                        <span className="font-body text-xs text-synthwave-text-muted font-bold">
                          {intensity}/10
                        </span>
                      </div>
                      <div className="h-2 bg-synthwave-bg-primary/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-synthwave-neon-cyan via-synthwave-neon-pink to-synthwave-neon-purple transition-all duration-500"
                          style={{ width: `${(intensity / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badge Row - styled like equipment badges in ViewWorkouts.jsx */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={badgePatterns.workoutDetail}>{discipline}</span>
          {workout.location && (
            <span className={badgePatterns.workoutDetail}>
              {workout.location}
            </span>
          )}
          <span className={badgePatterns.workoutDetail}>{coachName}</span>
        </div>
      </div>
    );
  };

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
    if (!isValidatingUserId && !workoutAgentState.isLoadingAllItems) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, workoutAgentState.isLoadingAllItems]);

  // Close delete modal or edit modal when pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (editingWorkout) {
          handleCancelEdit();
          return;
        }
        if (showDeleteModal) {
          handleCancelDelete();
        }
      }
    };

    if (showDeleteModal || editingWorkout) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showDeleteModal, editingWorkout]);

  // Close actions menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest(".actions-menu-container")) {
        setOpenMenuId(null);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [openMenuId]);

  // Show loading while validating userId or loading workouts
  if (isValidatingUserId || workoutAgentState.isLoadingAllItems) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Compact Horizontal Header Skeleton */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              <div className="h-8 md:h-9 bg-synthwave-text-muted/20 animate-pulse w-72"></div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full">
                <div className="w-6 h-6 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
              </div>
            </div>
            <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-md animate-pulse"></div>
          </header>

          {/* Quick Stats skeleton */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 -mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-synthwave-text-muted/20 rounded-md animate-pulse"></div>
                <div className="h-6 w-8 bg-synthwave-text-muted/20 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Workout cards skeleton */}
          <div className="mb-8">
            {/* Mobile: Single column */}
            <div className="lg:hidden">
              {/* Create Card Skeleton */}
              <div
                className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center min-h-[220px]`}
              >
                <div className="text-center flex flex-col items-center">
                  <div className="w-10 h-10 bg-synthwave-neon-pink/20 animate-pulse mb-3"></div>
                  <div className="h-5 bg-synthwave-neon-pink/20 animate-pulse w-48 mb-2"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-56"></div>
                </div>
              </div>
              {/* Workout Card Skeletons */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.cardMedium} p-6 mb-6 min-h-[220px]`}
                >
                  {/* Header with pink dot */}
                  <div className="flex items-start space-x-3 mb-2">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                  </div>

                  {/* Collapsible Summary Section - Collapsed */}
                  <div className="mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-32"></div>
                  </div>

                  {/* Badge Row */}
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-12"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
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
                  className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center min-h-[220px]`}
                >
                  <div className="text-center flex flex-col items-center">
                    <div className="w-10 h-10 bg-synthwave-neon-pink/20 animate-pulse mb-3"></div>
                    <div className="h-5 bg-synthwave-neon-pink/20 animate-pulse w-48 mb-2"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-56"></div>
                  </div>
                </div>
                {/* Workout Card Skeletons */}
                {[1, 3].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6 min-h-[220px]`}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    </div>

                    {/* Collapsible Summary Section - Collapsed */}
                    <div className="mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-32"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-12"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Right Column */}
              <div>
                {/* Workout Card Skeletons */}
                {[2, 4].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6 min-h-[220px]`}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
                    </div>

                    {/* Collapsible Summary Section - Collapsed */}
                    <div className="mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 animate-pulse w-32"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-16"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-12"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-20"></div>
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
        message={userIdError || "You can only access your own workouts."}
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
            aria-label="Workouts Header"
          >
            {/* Left section: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              {/* Page Title with Hover Tooltip */}
              <h1
                className="font-header font-bold text-2xl md:text-3xl text-gradient-neon uppercase tracking-wider cursor-help"
                data-tooltip-id="workouts-info"
                data-tooltip-content="Review, organize, and analyze your complete workout history. Track your fitness journey and monitor your progress over time."
              >
                Your Workouts
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
                icon: StackIcon,
                value:
                  workoutAgentState.totalCount ||
                  workoutAgentState.allWorkouts.length ||
                  0,
                tooltip: {
                  title: "Total Workouts",
                  description: "All workouts logged in your training history",
                },
                color: "pink",
                isLoading: workoutAgentState.isLoadingAllItems,
                ariaLabel: `${workoutAgentState.totalCount || workoutAgentState.allWorkouts.length || 0} total workouts`,
              },
              {
                icon: FireIcon,
                value: workoutAgentState.currentStreak || 0,
                tooltip: {
                  title: "Current Streak",
                  description:
                    "Consecutive days with a logged workout (includes today or yesterday)",
                },
                color: "pink",
                isLoading: workoutAgentState.isLoadingStats,
                ariaLabel: `${workoutAgentState.currentStreak || 0} day current streak`,
              },
              {
                icon: TrophyIcon,
                value: workoutAgentState.bestStreak || 0,
                tooltip: {
                  title: "Best Streak",
                  description: "Longest consecutive-day streak in your history",
                },
                color: "purple",
                isLoading: workoutAgentState.isLoadingStats,
                ariaLabel: `${workoutAgentState.bestStreak || 0} day best streak`,
              },
              {
                icon: CalendarMonthIcon,
                value:
                  workoutAgentState.allWorkouts.filter((w) => {
                    const workoutDate = new Date(w.completedAt || w.date);
                    const now = new Date();
                    const thirtyDaysAgo = new Date(
                      now.getTime() - 30 * 24 * 60 * 60 * 1000,
                    );
                    return workoutDate >= thirtyDaysAgo;
                  }).length || 0,
                tooltip: {
                  title: "This Month",
                  description: "Workouts completed in the last 30 days",
                },
                color: "cyan",
                isLoading: workoutAgentState.isLoadingAllItems,
                ariaLabel: `${
                  workoutAgentState.allWorkouts.filter((w) => {
                    const workoutDate = new Date(w.completedAt || w.date);
                    const now = new Date();
                    const thirtyDaysAgo = new Date(
                      now.getTime() - 30 * 24 * 60 * 60 * 1000,
                    );
                    return workoutDate >= thirtyDaysAgo;
                  }).length || 0
                } workouts this month`,
              },
              {
                icon: ClockIcon,
                value:
                  workoutAgentState.allWorkouts.filter((w) => {
                    const workoutDate = new Date(w.completedAt || w.date);
                    const now = new Date();
                    const sevenDaysAgo = new Date(
                      now.getTime() - 7 * 24 * 60 * 60 * 1000,
                    );
                    return workoutDate >= sevenDaysAgo;
                  }).length || 0,
                tooltip: {
                  title: "This Week",
                  description: "Workouts completed in the last 7 days",
                },
                color: "purple",
                isLoading: workoutAgentState.isLoadingAllItems,
                ariaLabel: `${
                  workoutAgentState.allWorkouts.filter((w) => {
                    const workoutDate = new Date(w.completedAt || w.date);
                    const now = new Date();
                    const sevenDaysAgo = new Date(
                      now.getTime() - 7 * 24 * 60 * 60 * 1000,
                    );
                    return workoutDate >= sevenDaysAgo;
                  }).length || 0
                } workouts this week`,
              },
              {
                icon: CalendarIcon,
                value: workoutAgentState.trainingDaysCount || 0,
                tooltip: {
                  title: "Training Days",
                  description: "Unique calendar days you've trained",
                },
                color: "cyan",
                isLoading: workoutAgentState.isLoadingStats,
                ariaLabel: `${workoutAgentState.trainingDaysCount || 0} training days`,
              },
              {
                icon: TargetIcon,
                value:
                  workoutAgentState.allWorkouts.filter((w) =>
                    isNewWorkout(w.completedAt),
                  ).length || 0,
                tooltip: {
                  title: "Recent",
                  description: "Workouts completed in the last 24 hours",
                },
                color: "pink",
                isLoading: workoutAgentState.isLoadingAllItems,
                ariaLabel: `${workoutAgentState.allWorkouts.filter((w) => isNewWorkout(w.completedAt)).length || 0} recent workouts`,
              },
            ]}
          />

          {/* Error state */}
          {workoutAgentState.error && (
            <div className="text-center py-12">
              <NeonBorder color="pink" className="max-w-md mx-auto p-6">
                <p className="font-body text-synthwave-neon-pink text-xl font-bold mb-2">
                  Error Loading Workouts
                </p>
                <p className="font-body text-synthwave-text-secondary text-lg">
                  {workoutAgentState.error}
                </p>
              </NeonBorder>
            </div>
          )}

          {/* Workouts Masonry Layout */}
          {!workoutAgentState.isLoadingAllItems && !workoutAgentState.error && (
            <div className="mb-8">
              {(() => {
                // Create an array of all items (create card first, then workouts)
                const allItems = [
                  { type: "create", key: "create-card" },
                  ...workoutAgentState.allWorkouts.map((workout) => ({
                    type: "workout",
                    data: workout,
                  })),
                ];

                // Render item based on type
                const renderItem = (item) => {
                  if (item.type === "create") {
                    return renderCreateWorkoutCard();
                  }
                  return renderWorkoutCard(item.data);
                };

                return (
                  <>
                    {/* Mobile: Single column */}
                    <div className="lg:hidden">
                      {allItems.map((item, index) => (
                        <div
                          key={
                            item.type === "create"
                              ? "create-card"
                              : item.data.workoutId
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
                                  : item.data.workoutId
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
                                  : item.data.workoutId
                              }
                            >
                              {renderItem(item)}
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          {!workoutAgentState.isLoadingAllItems &&
            !workoutAgentState.error &&
            workoutAgentState.allWorkouts.length === 0 && (
              <div className="mb-8">
                <EmptyStateCard
                  icon="🏋️"
                  title="No Workouts Logged"
                  description="Log your first workout and start building your training history."
                  actionLabel="Log a Workout"
                  onAction={() => onCommandPaletteToggle("/log-workout ")}
                />
              </div>
            )}
          <AppFooter />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && workoutToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div
            className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-body text-xl font-bold mb-2">
                Delete Workout
              </h3>
              <p className="font-body text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete{" "}
                <strong className="text-white">
                  {workoutToDelete?.workoutName || "this workout"}
                </strong>
                ? This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={`${buttonPatterns.secondaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`${buttonPatterns.primaryMedium} disabled:opacity-50 disabled:cursor-not-allowed space-x-2`}
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

      {/* Edit Workout Modal */}
      {editingWorkout && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              e.target.tagName !== "TEXTAREA" &&
              !e.target.closest('[contenteditable="true"]') &&
              !isSaving &&
              editName.trim() &&
              editCompletedAt
            ) {
              e.preventDefault();
              handleSaveEdit();
            }
          }}
        >
          <div
            className={`${containerPatterns.successModal} p-6 max-w-md w-full mx-4`}
          >
            <div className="pb-4 mb-5 border-b border-synthwave-neon-cyan/20">
              <h3 className={typographyPatterns.cardTitle}>Edit Workout</h3>
            </div>

            {/* Workout Name */}
            <div className="mb-5">
              <label className={formPatterns.label}>Workout Name</label>
              <input
                type="text"
                className={`${inputPatterns.standard} text-base hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 disabled:cursor-not-allowed disabled:text-synthwave-text-muted disabled:border-synthwave-neon-pink/20 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0`}
                style={{ boxShadow: "none", outline: "none" }}
                onFocus={(e) => {
                  e.target.style.outline = "none";
                  e.target.style.boxShadow = "none";
                }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter workout name"
              />
            </div>

            {/* Completed At */}
            <div className="mb-5">
              <label className={formPatterns.label}>Completed At</label>
              <input
                type="datetime-local"
                className={`${inputPatterns.standard} text-base hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 disabled:cursor-not-allowed disabled:text-synthwave-text-muted disabled:border-synthwave-neon-pink/20 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0`}
                style={{ boxShadow: "none", outline: "none" }}
                onFocus={(e) => {
                  e.target.style.outline = "none";
                  e.target.style.boxShadow = "none";
                }}
                value={editCompletedAt}
                onChange={(e) => setEditCompletedAt(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className={`${buttonPatterns.secondaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editName.trim() || !editCompletedAt}
                className={`${buttonPatterns.primaryMedium} disabled:opacity-50 disabled:cursor-not-allowed space-x-2`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
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
                        d="M5 12h14M12 5l7 7-7 7"
                      />
                    </svg>
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Workout Modal */}
      {shareWorkout && (
        <ShareWorkoutModal
          workout={shareWorkout}
          coachData={coachData}
          onClose={() => setShareWorkout(null)}
        />
      )}

      {/* Tooltips */}
      <Tooltip
        id="workouts-info"
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

export default ManageWorkouts;
