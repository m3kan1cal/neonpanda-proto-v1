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
import { AccessDenied } from "./shared/AccessDenied";
import { isNewWorkout } from "../utils/dateUtils";
import { NeonBorder, NewBadge } from "./themes/SynthwaveComponents";
import { useToast } from "../contexts/ToastContext";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import QuickStats from "./shared/QuickStats";
import AppFooter from "./shared/AppFooter";
import { logger } from "../utils/logger";
import {
  StackIcon,
  CalendarMonthIcon,
  ClockIcon,
  TargetIcon,
  TrashIcon,
} from "./themes/SynthwaveComponents";

// Icons
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
              : false,
          isLoadingRecentItems:
            newState.isLoadingRecentItems !== undefined
              ? newState.isLoadingRecentItems
              : false,
          isLoadingItem:
            newState.isLoadingItem !== undefined
              ? newState.isLoadingItem
              : false,
          error: newState.error !== undefined ? newState.error : null,
          totalCount:
            newState.totalWorkoutCount !== undefined
              ? newState.totalWorkoutCount
              : 0,
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

        await workoutAgentRef.current.loadAllWorkouts({
          sortBy: "completedAt",
          sortOrder: "desc",
          limit: 100,
        });

        await workoutAgentRef.current.loadTotalWorkoutCount();
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

  // Handle creating a new workout - opens command palette with /log-workout
  const handleLogNewWorkout = () => {
    onCommandPaletteToggle("/log-workout ");
  };

  // Format date for display
  const formatWorkoutDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
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
            Log New Workout
          </h3>

          {/* Description */}
          <p className="font-rajdhani text-synthwave-text-secondary/60 group-hover:text-synthwave-text-secondary text-sm transition-colors duration-300 text-center max-w-xs mx-auto">
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

        {/* Delete button - top right */}
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(workout);
            }}
            className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 cursor-pointer"
            title="Delete workout"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Header with pink dot */}
        <div className="flex items-start gap-3 mb-2 pr-16">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink shrink-0 mt-2" />
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            {workoutName}
          </h3>
        </div>

        {/* Metadata Row - styled like ViewWorkouts.jsx */}
        <div className="flex items-center flex-wrap gap-4 mb-4">
          {/* Completed Date */}
          <div className="flex items-center gap-1 text-synthwave-text-secondary font-rajdhani text-sm">
            <ClockIconSmall />
            <span>
              {dateInfo.date} at {dateInfo.time}
            </span>
          </div>
          {/* Duration */}
          {duration && (
            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
              <span className="text-synthwave-text-muted">Duration:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {duration}m
              </span>
            </div>
          )}
          {/* AI Score */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-muted">AI Score:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          {/* Intensity */}
          {intensity > 0 && (
            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
              <span className="text-synthwave-text-muted">Intensity:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {intensity}/10
              </span>
            </div>
          )}
          {/* RPE */}
          {rpe > 0 && (
            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
              <span className="text-synthwave-text-muted">RPE:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {rpe}/10
              </span>
            </div>
          )}
        </div>

        {/* Collapsible Workout Summary Section */}
        {workout.summary && (
          <div onClick={(e) => e.stopPropagation()} className="cursor-pointer">
            <button
              onClick={() => toggleSummaryCollapse(workout.workoutId)}
              className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/5 transition-all duration-200 cursor-pointer px-2 py-1 -mx-2 rounded"
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
                <p className="font-rajdhani text-sm text-synthwave-text-secondary mb-4">
                  {workout.summary}
                </p>

                {/* RPE and Intensity Spectrum Bars */}
                <div className="space-y-3 pt-2">
                  {/* RPE Bar */}
                  {rpe > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-rajdhani text-xs text-synthwave-text-muted uppercase font-semibold">
                          RPE (Perceived Exertion)
                        </span>
                        <span className="font-rajdhani text-xs text-synthwave-text-muted font-bold">
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
                        <span className="font-rajdhani text-xs text-synthwave-text-muted uppercase font-semibold">
                          Intensity
                        </span>
                        <span className="font-rajdhani text-xs text-synthwave-text-muted font-bold">
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

  // Close delete modal when pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && showDeleteModal) {
        handleCancelDelete();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteModal]);

  // Show loading while validating userId or loading workouts
  if (isValidatingUserId || workoutAgentState.isLoadingAllItems) {
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

          {/* Workout cards skeleton */}
          <div className="mb-8">
            {/* Mobile: Single column */}
            <div className="lg:hidden">
              {/* Create Card Skeleton */}
              <div
                className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center min-h-[166px]`}
              >
                <div className="text-center flex flex-col items-center">
                  <div className="w-10 h-10 bg-synthwave-neon-pink/20 rounded animate-pulse mb-3"></div>
                  <div className="h-5 bg-synthwave-neon-pink/20 rounded animate-pulse w-48 mb-2"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-56"></div>
                </div>
              </div>
              {/* Workout Card Skeletons */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.cardMedium} p-6 mb-6 min-h-[166px]`}
                >
                  {/* Header with pink dot */}
                  <div className="flex items-start space-x-3 mb-2">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                  </div>

                  {/* Collapsible Summary Section - Collapsed */}
                  <div className="mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                  </div>

                  {/* Badge Row */}
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
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
                  className={`${containerPatterns.dashedCard} p-6 mb-6 opacity-60 flex flex-col justify-center min-h-[166px]`}
                >
                  <div className="text-center flex flex-col items-center">
                    <div className="w-10 h-10 bg-synthwave-neon-pink/20 rounded animate-pulse mb-3"></div>
                    <div className="h-5 bg-synthwave-neon-pink/20 rounded animate-pulse w-48 mb-2"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-56"></div>
                  </div>
                </div>
                {/* Workout Card Skeletons */}
                {[1, 3].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6 min-h-[166px]`}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>

                    {/* Collapsible Summary Section - Collapsed */}
                    <div className="mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
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
                    className={`${containerPatterns.cardMedium} p-6 mb-6 min-h-[166px]`}
                  >
                    {/* Header with pink dot */}
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>

                    {/* Collapsible Summary Section - Collapsed */}
                    <div className="mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
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
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
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
                <p className="font-rajdhani text-synthwave-neon-pink text-xl font-bold mb-2">
                  Error Loading Workouts
                </p>
                <p className="font-rajdhani text-synthwave-text-secondary text-lg">
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
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Workout
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete "
                {workoutToDelete?.workoutName || "this workout"}
                "? This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={`flex-1 ${buttonPatterns.secondarySmall} text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
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
