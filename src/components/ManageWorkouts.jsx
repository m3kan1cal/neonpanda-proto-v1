import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from 'react-tooltip';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { containerPatterns, buttonPatterns, layoutPatterns, tooltipPatterns } from "../utils/uiPatterns";
import { AccessDenied } from './shared/AccessDenied';
import { isNewWorkout } from "../utils/dateUtils";
import { NeonBorder, NewBadge } from "./themes/SynthwaveComponents";
import { useToast } from "../contexts/ToastContext";
import { WorkoutAgent } from "../utils/agents/WorkoutAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { FloatingMenuManager } from "./shared/FloatingMenuManager";
import CommandPalette from './shared/CommandPalette';
import CoachHeader from './shared/CoachHeader';
import CompactCoachCard from './shared/CompactCoachCard';
import CommandPaletteButton from './shared/CommandPaletteButton';
import QuickStats from './shared/QuickStats';
import {
  WorkoutIcon,
  WorkoutIconSmall,
  CloseIcon,
  ConversationIcon,
  ReportIcon,
  LightningIcon,
  StackIcon,
  CalendarMonthIcon,
  ClockIcon,
  TargetIcon,
} from "./themes/SynthwaveComponents";

// Icons
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


const PreviewIcon = () => (
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

// Small clock icon for metadata
const ClockIconSmall = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);


function ManageWorkouts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState('');

  // Coach data state (for FloatingMenuManager)
  const [coachData, setCoachData] = useState(null);

  const workoutAgentRef = useRef(null);
  const coachAgentRef = useRef(null);

  const { addToast, success, error, info } = useToast();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      // Cmd/Ctrl + K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteCommand('');
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [isCommandPaletteOpen]);

  // Unified workout state (like Workouts.jsx)
  const [workoutAgentState, setWorkoutAgentState] = useState({
    allWorkouts: [], // For main page grid
    recentWorkouts: [], // For popover
    isLoadingAllItems: !!userId, // Start loading if we have userId
    isLoadingRecentItems: false, // For popover loading
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
          // Map agent state to component state with separate loading flags
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

      // Set up error callback
      workoutAgentRef.current.onError = (error) => {
        console.error("Workout agent error:", error);
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

  // Load coach data for FloatingMenuManager
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachData = async () => {
      try {
        if (!coachAgentRef.current) {
          coachAgentRef.current = new CoachAgent();
        }
        const coachData = await coachAgentRef.current.loadCoachDetails(userId, coachId);
        setCoachData(coachData);
      } catch (error) {
        console.error('Failed to load coach data:', error);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Load all workouts (no date filtering)
  useEffect(() => {
    if (!userId || !workoutAgentRef.current) return;

    const loadWorkouts = async () => {
      try {
        // Ensure loading state is active
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          isLoadingAllItems: true,
          error: null,
        }));

        // Load all workouts without date filtering (this should also update totalCount)
        await workoutAgentRef.current.loadAllWorkouts({
          sortBy: "completedAt",
          sortOrder: "desc",
          limit: 100, // Get up to 100 workouts (increased from 50)
        });

        // Also load the total workout count for accurate stats
        await workoutAgentRef.current.loadTotalWorkoutCount();
      } catch (error) {
        console.error("Error loading workout history:", error);
        // Error handling is done by the agent callback
      }
    };

    loadWorkouts();
  }, [userId]);

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  // Create coach name handler using the agent's helper method
  const handleSaveCoachName = coachAgentRef.current?.createCoachNameHandler(
    userId,
    coachId,
    setCoachData,
    { success, error }
  );

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
        workoutToDelete.workoutId
      );
      success("Workout deleted successfully");
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } catch (error) {
      console.error("Error deleting workout:", error);
      error("Failed to delete workout");
      // Close modal even on error so user can try again
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

  // Render workout card
  const renderWorkoutCard = (workout) => {
    const dateInfo = formatWorkoutDate(workout.completedAt || workout.date);
    const workoutName = workoutAgentRef.current?.formatWorkoutSummary(workout, true) || workout.workoutName || "Workout";

    const duration = workout.duration ? Math.round(workout.duration / 60) : null;
    const discipline = workout.discipline || "fitness";
    const intensity = workout.performanceMetrics?.intensity || workout.workoutData?.performance_metrics?.intensity || 0;
    const rpe = workout.performanceMetrics?.perceived_exertion || workout.workoutData?.performance_metrics?.perceived_exertion || 0;
    const calories = workout.workoutData?.performance_metrics?.calories_burned || workout.performanceMetrics?.calories_burned;
    const confidence = workout.extractionMetadata?.confidence || workout.confidence || 0;
    const extractedAt = workout.extractionMetadata?.extractedAt || workout.extractedAt;
    const coachName = workout.coachNames?.[0]?.replace(/_/g, ' ') || 'AI Coach';
    const isNew = isNewWorkout(workout.completedAt);

    // Helper function to get consistent color spectrum (all start with same "easy" green, progress to purple at 10)
    const getGaugeColor = (value) => {
      if (value >= 8) return 'from-green-400 via-synthwave-neon-pink to-synthwave-neon-purple'; // Hard (8-10)
      if (value >= 6) return 'from-green-400 via-orange-400 to-synthwave-neon-pink'; // Moderate-Hard (6-7)
      if (value >= 4) return 'from-green-400 to-synthwave-neon-cyan'; // Moderate (4-5)
      if (value >= 2) return 'from-green-400 to-green-300'; // Easy-Moderate (2-3)
      return 'from-green-400 to-green-400'; // Very Easy (0-1)
    };

    return (
      <div
        key={workout.workoutId}
        data-workout-card
        className={`${containerPatterns.cardMedium} p-5 group transition-all duration-300 hover:border-synthwave-neon-cyan/40 hover:bg-synthwave-bg-card/40 relative cursor-pointer flex flex-col h-full`}
        onClick={() =>
          navigate(
            `/training-grounds/workouts?userId=${userId}&workoutId=${workout.workoutId}&coachId=${workout.coachIds?.[0] || "default"}`
          )
        }
      >
        {/* NEW badge for workouts within 24 hours */}
        {isNew && <NewBadge />}

          {/* Action buttons - always visible */}
          <div className="absolute top-4 right-4 flex space-x-2">
            {/* Preview button */}
            {workout.summary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();

                  if (activeTooltip === workout.workoutId) {
                    setActiveTooltip(null);
                  } else {
                    // Get the workout card element (the parent with relative positioning)
                    const workoutCard = e.target.closest("[data-workout-card]");
                    if (workoutCard) {
                      const rect = workoutCard.getBoundingClientRect();
                      setTooltipPosition({
                        x: rect.left + rect.width / 2, // Center horizontally on the card
                        y: rect.bottom + 10, // Position below the card with some spacing
                      });
                    }
                    setActiveTooltip(workout.workoutId);
                  }
                }}
                className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
                title="Preview workout summary"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            )}

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(workout);
              }}
              className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50"
              title="Delete workout"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>

        {/* Card header with colored dot */}
        <div className="flex items-start space-x-3 mb-4 pr-16">
          <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
          <h3 className="font-russo text-lg text-white uppercase">
            {workoutName}
          </h3>
        </div>

        {/* Tags Section - Moved above sub-containers */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Discipline Tag */}
          <div className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-0.5 rounded text-xs font-rajdhani font-medium">
            {discipline}
          </div>

          {/* Location Tag with Pin Icon - Cyan */}
          {workout.location && (
            <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-0.5 rounded text-xs font-rajdhani font-medium flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{workout.location}</span>
            </div>
          )}

          {/* Coach Name Tag - Purple */}
          <div className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-0.5 rounded text-xs font-rajdhani font-medium flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{coachName}</span>
          </div>
        </div>

        {/* Performance Stats Grid - 3 Center Sections */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Duration */}
          <div className="text-center p-2 bg-synthwave-bg-primary/30 rounded-lg">
            <div className="text-lg font-russo font-bold text-white mb-1">
              {duration ? `${duration}m` : '--'}
            </div>
            <div className="text-xs text-synthwave-text-muted font-rajdhani flex items-center justify-center gap-1">
              <ClockIconSmall />
              Duration
            </div>
          </div>

          {/* Calories */}
          <div className="text-center p-2 bg-synthwave-bg-primary/30 rounded-lg">
            <div className="text-lg font-russo font-bold text-white mb-1">
              {calories || '--'}
            </div>
            <div className="text-xs text-synthwave-text-muted font-rajdhani flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
              Calories
            </div>
          </div>

          {/* AI Confidence */}
          <div className="text-center p-2 bg-synthwave-bg-primary/30 rounded-lg">
            <div className="text-lg font-russo font-bold text-white mb-1">
              {Math.round(confidence * 100)}%
            </div>
            <div className="text-xs text-synthwave-text-muted font-rajdhani flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Score
            </div>
          </div>
        </div>

        {/* Dual Horizontal Gauge Bars - Side by Side */}
        {(intensity > 0 || rpe > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Intensity Gauge */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-synthwave-text-secondary font-rajdhani">Intensity</span>
                <span className="font-medium text-white font-rajdhani">{intensity || 0}/10</span>
              </div>
              <div className="w-full bg-gradient-to-r from-synthwave-neon-pink via-pink-800 to-purple-800 rounded-full h-2 relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 h-2 bg-synthwave-bg-primary/90 rounded-r-full"
                  style={{ width: `${100 - ((intensity || 0) / 10) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* RPE Gauge */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-synthwave-text-secondary font-rajdhani">RPE</span>
                <span className="font-medium text-white font-rajdhani">{rpe || 0}/10</span>
              </div>
              <div className="w-full bg-gradient-to-r from-synthwave-neon-pink via-pink-800 to-purple-800 rounded-full h-2 relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 h-2 bg-synthwave-bg-primary/90 rounded-r-full"
                  style={{ width: `${100 - ((rpe || 0) / 10) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Workout summary - Flexible content area in sub-container */}
        <div className="flex-1 mb-3">
          {workout.summary && (
            <div className="p-3 bg-synthwave-bg-primary/30 rounded-lg">
              <p className="font-rajdhani text-synthwave-text-secondary text-sm leading-relaxed line-clamp-3">
                {(() => {
                  const words = workout.summary.split(' ');
                  if (words.length > 20) {
                    return words.slice(0, 20).join(' ') + '...';
                  }
                  return workout.summary;
                })()}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Metadata Section - Dates Only */}
        <div className="mt-auto">
          {/* Dates Line */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Completion Date */}
            <div className="flex items-center space-x-1 text-xs text-synthwave-text-secondary font-rajdhani">
              <ClockIconSmall />
              <span>{dateInfo.date} at {dateInfo.time}</span>
            </div>

            {/* Extraction Date */}
            {extractedAt && (
              <div className="flex items-center space-x-1 text-xs text-synthwave-text-secondary font-rajdhani">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Extracted {new Date(extractedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
    if (!isValidatingUserId && !workoutAgentState.isLoadingAllItems) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, workoutAgentState.isLoadingAllItems]);

  // Close tooltip when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTooltip && !event.target.closest("[data-tooltip-content]")) {
        setActiveTooltip(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (activeTooltip) {
          setActiveTooltip(null);
        }
        if (showDeleteModal) {
          handleCancelDelete();
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTooltip, showDeleteModal]);

  // Show loading while validating userId or loading workouts
  if (isValidatingUserId || workoutAgentState.isLoadingAllItems) {
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
            <div className="h-10 w-16 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
          </header>

          {/* Quick Stats skeleton */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-3 -mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                <div className="h-6 w-8 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Workout cards skeleton */}
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`${containerPatterns.cardMedium} p-5 flex flex-col h-80`}>
                  <div className="flex items-start space-x-2 mb-3">
                    <div className="w-2.5 h-2.5 bg-synthwave-text-muted/20 rounded-full flex-shrink-0 mt-1.5 animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                  </div>
                  <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-24 mb-3"></div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-14"></div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-4/5"></div>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/5"></div>
                  </div>
                  <div className="pt-2 border-t border-synthwave-text-muted/20 mt-auto">
                    <div className="flex justify-between">
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
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

  // Find the active workout for tooltip display
  const activeWorkout = workoutAgentState.allWorkouts.find(
    (w) => w.workoutId === activeTooltip
  );

  return (
    <>
      {/* Global tooltip - rendered outside all containers */}
      {activeTooltip && activeWorkout && activeWorkout.summary && (
        <div
          className="fixed w-[32rem] max-w-screen-md opacity-100 transition-opacity duration-300 z-[9999] transform -translate-x-1/2"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <div
            className="bg-synthwave-bg-card/95 backdrop-blur-md border-2 border-synthwave-neon-cyan/30 rounded-lg shadow-2xl shadow-synthwave-neon-cyan/20 p-4"
            data-tooltip-content
          >
            <div className="flex justify-between items-center mb-2">
              <div className="text-synthwave-neon-cyan font-rajdhani font-bold text-sm uppercase">
                Workout Summary
              </div>
              <button
                onClick={() => setActiveTooltip(null)}
                className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="text-synthwave-text-primary font-rajdhani text-sm leading-relaxed">
              {activeWorkout.summary}
            </div>
          </div>
        </div>
      )}

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
              <CommandPaletteButton onClick={() => setIsCommandPaletteOpen(true)} />
            </div>
          </header>

          {/* Quick Stats */}
          <QuickStats
            stats={[
              {
                icon: StackIcon,
                value: workoutAgentState.totalCount || workoutAgentState.allWorkouts.length || 0,
                tooltip: {
                  title: 'Total Workouts',
                  description: 'All workouts logged in your training history'
                },
                color: 'pink',
                isLoading: workoutAgentState.isLoading,
                ariaLabel: `${workoutAgentState.totalCount || workoutAgentState.allWorkouts.length || 0} total workouts`
              },
              {
                icon: CalendarMonthIcon,
                value: workoutAgentState.allWorkouts.filter((w) => {
                  const workoutDate = new Date(w.completedAt || w.date);
                  const now = new Date();
                  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  return workoutDate >= thirtyDaysAgo;
                }).length || 0,
                tooltip: {
                  title: 'This Month',
                  description: 'Workouts completed in the last 30 days'
                },
                color: 'cyan',
                isLoading: workoutAgentState.isLoading,
                ariaLabel: `${workoutAgentState.allWorkouts.filter((w) => {
                  const workoutDate = new Date(w.completedAt || w.date);
                  const now = new Date();
                  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  return workoutDate >= thirtyDaysAgo;
                }).length || 0} workouts this month`
              },
              {
                icon: ClockIcon,
                value: workoutAgentState.allWorkouts.filter((w) => {
                  const workoutDate = new Date(w.completedAt || w.date);
                  const now = new Date();
                  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  return workoutDate >= sevenDaysAgo;
                }).length || 0,
                tooltip: {
                  title: 'This Week',
                  description: 'Workouts completed in the last 7 days'
                },
                color: 'purple',
                isLoading: workoutAgentState.isLoading,
                ariaLabel: `${workoutAgentState.allWorkouts.filter((w) => {
                  const workoutDate = new Date(w.completedAt || w.date);
                  const now = new Date();
                  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  return workoutDate >= sevenDaysAgo;
                }).length || 0} workouts this week`
              },
              {
                icon: TargetIcon,
                value: workoutAgentState.allWorkouts.filter((w) => isNewWorkout(w.completedAt)).length || 0,
                tooltip: {
                  title: 'Recent',
                  description: 'Workouts completed in the last 24 hours'
                },
                color: 'pink',
                isLoading: workoutAgentState.isLoading,
                ariaLabel: `${workoutAgentState.allWorkouts.filter((w) => isNewWorkout(w.completedAt)).length || 0} recent workouts`
              }
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

          {/* Empty state */}
          {!workoutAgentState.isLoadingAllItems &&
            !workoutAgentState.error &&
            workoutAgentState.allWorkouts.length === 0 && (
              <div className="text-center py-12">
                <NeonBorder color="cyan" className="max-w-md mx-auto p-8">
                  <h3 className="text-synthwave-neon-cyan mb-4">
                    No Workouts Found
                  </h3>
                  <p className="text-synthwave-text-secondary mb-6">
                    You haven't logged any workouts yet.
                  </p>
                  <button
                    onClick={() =>
                      navigate(`/training-grounds?userId=${userId}`)
                    }
                    className={buttonPatterns.secondary}
                  >
                    Start Training
                  </button>
                </NeonBorder>
              </div>
            )}

          {/* Workouts Grid */}
          {!workoutAgentState.isLoadingAllItems &&
            !workoutAgentState.error &&
            workoutAgentState.allWorkouts.length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                  {workoutAgentState.allWorkouts.map(renderWorkoutCard)}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setCommandPaletteCommand('');
        }}
        prefilledCommand={commandPaletteCommand}
        workoutAgent={workoutAgentRef.current}
        userId={userId}
        coachId={coachId}
        onNavigation={(type, data) => {
          if (type === 'conversation-created') {
            navigate(`/training-grounds/coach-conversations?userId=${data.userId}&coachId=${data.coachId}&conversationId=${data.conversationId}`);
          }
        }}
      />

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="manage-workouts"
        coachData={coachData}
        onCommandPaletteToggle={(command) => {
          setCommandPaletteCommand(command);
          setIsCommandPaletteOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && workoutToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className={`${containerPatterns.deleteModal} p-6 max-w-md w-full mx-4`}>
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

