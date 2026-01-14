import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import {
  containerPatterns,
  badgePatterns,
  layoutPatterns,
  tooltipPatterns,
  typographyPatterns,
} from "../utils/ui/uiPatterns";
import { AccessDenied } from "./shared/AccessDenied";
import { NeonBorder } from "./themes/SynthwaveComponents";
import { useToast } from "../contexts/ToastContext";
import { ExerciseAgent } from "../utils/agents/ExerciseAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import QuickStats from "./shared/QuickStats";
import {
  StackIcon,
  CalendarMonthIcon,
  ClockIcon,
  TargetIcon,
} from "./themes/SynthwaveComponents";

// Icons
const ChevronDownIcon = () => (
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
      d="M19 9l-7 7-7-7"
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

function ManageExercises() {
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

  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // Coach data state
  const [coachData, setCoachData] = useState(null);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");

  const exerciseAgentRef = useRef(null);
  const coachAgentRef = useRef(null);

  const { addToast, success, error: errorToast, info } = useToast();

  // Unified exercise state
  const [exerciseAgentState, setExerciseAgentState] = useState({
    exerciseNames: [],
    exercises: {}, // Map: exerciseName -> { exercises, aggregations }
    totalExerciseCount: 0,
    isLoadingNames: !!userId,
    isLoadingExercises: false,
    error: null,
  });

  // Collapsed exercise cards - initialize with all exercise names (collapsed by default)
  const [collapsedExercises, setCollapsedExercises] = useState(() => {
    return new Set(exerciseAgentState.exerciseNames.map((e) => e.exerciseName));
  });

  // Update collapsed exercises when exercise names load
  useEffect(() => {
    if (exerciseAgentState.exerciseNames.length > 0) {
      setCollapsedExercises(
        new Set(exerciseAgentState.exerciseNames.map((e) => e.exerciseName)),
      );
    }
  }, [exerciseAgentState.exerciseNames.length]);

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, navigate]);

  // Initialize exercise agent
  useEffect(() => {
    if (!userId) return;

    if (!exerciseAgentRef.current) {
      exerciseAgentRef.current = new ExerciseAgent(userId, (newState) => {
        setExerciseAgentState((prevState) => {
          const updatedState = { ...prevState };

          if (newState.exerciseNames !== undefined) {
            updatedState.exerciseNames = newState.exerciseNames;
          }
          if (newState.totalExerciseCount !== undefined) {
            updatedState.totalExerciseCount = newState.totalExerciseCount;
          }
          if (newState.isLoadingNames !== undefined) {
            updatedState.isLoadingNames = newState.isLoadingNames;
          }
          if (newState.isLoadingExercises !== undefined) {
            updatedState.isLoadingExercises = newState.isLoadingExercises;
          }
          if (newState.error !== undefined) {
            updatedState.error = newState.error;
          }
          // Handle currentExercises update (from loadExercises)
          if (newState.currentExercises) {
            updatedState.exercises = {
              ...prevState.exercises,
              [newState.currentExercises.exerciseName]: {
                exercises: newState.currentExercises.exercises,
                aggregations: newState.currentExercises.aggregations,
              },
            };
          }

          return updatedState;
        });
      });

      exerciseAgentRef.current.onError = (err) => {
        console.error("Exercise agent error:", err);
        setExerciseAgentState((prevState) => ({
          ...prevState,
          error: err.message || "Failed to load exercises",
        }));
      };
    }

    return () => {
      if (exerciseAgentRef.current) {
        exerciseAgentRef.current.destroy();
        exerciseAgentRef.current = null;
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
        const data = await coachAgentRef.current.loadCoachDetails(
          userId,
          coachId,
        );
        setCoachData(data);
      } catch (err) {
        console.error("Failed to load coach data:", err);
      }
    };

    loadCoachData();

    return () => {
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, [userId, coachId]);

  // Load exercise names on mount
  useEffect(() => {
    if (!userId || !exerciseAgentRef.current) return;

    exerciseAgentRef.current.loadExerciseNames();
  }, [userId]);

  // Toggle exercise card collapse
  const toggleExerciseCollapse = async (exerciseName) => {
    const isCurrentlyCollapsed = collapsedExercises.has(exerciseName);

    setCollapsedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseName)) {
        newSet.delete(exerciseName);
      } else {
        newSet.add(exerciseName);
      }
      return newSet;
    });

    // Load exercises when expanding (if not already loaded)
    if (isCurrentlyCollapsed && !exerciseAgentState.exercises[exerciseName]) {
      try {
        await exerciseAgentRef.current?.loadExercises(exerciseName, {
          limit: 5,
        });
      } catch (err) {
        console.error("Failed to load exercises:", err);
      }
    }
  };

  // Navigate to coach conversation
  const handleCoachCardClick = () => {
    if (coachData && userId) {
      navigate(
        `/training-grounds/conversations?userId=${userId}&coachId=${coachData.coachId}`,
      );
    }
  };

  // Format relative time (e.g., "2 days ago")
  const formatRelativeTime = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  // Format date for session display
  const formatSessionDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Format metrics for display
  const formatMetrics = (metrics) => {
    if (!metrics) return "";
    const parts = [];

    if (metrics.sets && metrics.reps) {
      parts.push(`${metrics.sets}x${metrics.reps}`);
    } else if (metrics.reps) {
      parts.push(`${metrics.reps} reps`);
    }

    if (metrics.weight) {
      parts.push(`@ ${metrics.weight} lbs`);
    } else if (metrics.maxWeight) {
      parts.push(`@ ${metrics.maxWeight} lbs`);
    }

    if (metrics.distance) {
      const distanceStr =
        metrics.distance >= 1000
          ? `${(metrics.distance / 1000).toFixed(1)} km`
          : `${metrics.distance} m`;
      parts.push(distanceStr);
    }

    return parts.join(" ");
  };

  // Capitalize first letter of a string
  const capitalizeFirst = (str) => {
    if (!str || typeof str !== "string") return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Filter exercises by search query
  const filteredExercises = exerciseAgentState.exerciseNames.filter(
    (exercise) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        exercise.displayName?.toLowerCase().includes(query) ||
        exercise.exerciseName?.toLowerCase().includes(query)
      );
    },
  );

  // Calculate quick stats
  const exercisesThisMonth = exerciseAgentState.exerciseNames.filter((e) => {
    const lastPerformed = new Date(e.lastPerformed);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return lastPerformed >= thirtyDaysAgo;
  }).length;

  const exercisesThisWeek = exerciseAgentState.exerciseNames.filter((e) => {
    const lastPerformed = new Date(e.lastPerformed);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return lastPerformed >= sevenDaysAgo;
  }).length;

  // Render exercise card
  const renderExerciseCard = (exercise) => {
    const isCollapsed = collapsedExercises.has(exercise.exerciseName);
    const exerciseData = exerciseAgentState.exercises[exercise.exerciseName];
    const aggregations = exerciseData?.aggregations;
    const recentSessions = exerciseData?.exercises || [];

    return (
      <div
        key={exercise.exerciseName}
        className={`${containerPatterns.cardMedium} p-6 mb-6`}
      >
        {/* Header with pink dot */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
          <h3 className="font-russo font-bold text-white text-lg uppercase flex-1">
            {exercise.displayName || exercise.exerciseName}
          </h3>
        </div>

        {/* Metadata Row - consolidated on one line */}
        <div className="flex items-center flex-wrap gap-4 mb-4">
          {/* Last Performed */}
          <div className="flex items-center gap-1 text-synthwave-text-secondary font-rajdhani text-sm">
            <ClockIconSmall />
            <span>
              Last Performed: {formatRelativeTime(exercise.lastPerformed)}
            </span>
          </div>
          {/* Session Count */}
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-muted">Sessions:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {exercise.count}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => toggleExerciseCollapse(exercise.exerciseName)}
          className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
        >
          <span>{isCollapsed ? "View Sessions" : "Hide Sessions"}</span>
          <div
            className={`transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`}
          >
            <ChevronDownIcon />
          </div>
        </button>

        {/* Expanded Content */}
        {!isCollapsed && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            {/* Loading skeleton */}
            {exerciseAgentState.isLoadingExercises && !exerciseData && (
              <div className="space-y-4">
                {/* Personal Records skeleton */}
                <div className={containerPatterns.coachNotesSection}>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32 mb-3"></div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-12"></div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Recent Sessions skeleton */}
                <div className={containerPatterns.coachNotesSection}>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32 mb-3"></div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-synthwave-bg-primary/30 rounded-lg mb-2 animate-pulse"
                    ></div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Records Section */}
            {aggregations && (
              <div className={containerPatterns.coachNotesSection}>
                <h4 className="font-rajdhani text-xs text-synthwave-text-muted uppercase font-semibold mb-3">
                  Personal Records
                </h4>
                <div className="flex items-center gap-4 flex-wrap">
                  {aggregations.prWeight && (
                    <div className="flex items-center gap-2">
                      <span className="font-rajdhani text-xs text-synthwave-text-muted">
                        Max Weight:
                      </span>
                      <span className="font-rajdhani text-base text-synthwave-neon-cyan font-bold">
                        {aggregations.prWeight} lbs
                      </span>
                    </div>
                  )}
                  {aggregations.prReps && (
                    <div className="flex items-center gap-2">
                      <span className="font-rajdhani text-xs text-synthwave-text-muted">
                        Max Reps:
                      </span>
                      <span className="font-rajdhani text-base text-synthwave-neon-cyan font-bold">
                        {aggregations.prReps}
                      </span>
                    </div>
                  )}
                  {aggregations.averageWeight && (
                    <div className="flex items-center gap-2">
                      <span className="font-rajdhani text-xs text-synthwave-text-muted">
                        Avg Weight:
                      </span>
                      <span className="font-rajdhani text-base text-synthwave-neon-cyan font-bold">
                        {Math.round(aggregations.averageWeight)} lbs
                      </span>
                    </div>
                  )}
                  {aggregations.averageReps && (
                    <div className="flex items-center gap-2">
                      <span className="font-rajdhani text-xs text-synthwave-text-muted">
                        Avg Reps:
                      </span>
                      <span className="font-rajdhani text-base text-synthwave-neon-cyan font-bold">
                        {Math.round(aggregations.averageReps)}
                      </span>
                    </div>
                  )}
                </div>
                {aggregations.totalOccurrences && (
                  <div className="mt-3 pt-3 border-t border-synthwave-neon-cyan/10">
                    <span className="font-rajdhani text-sm text-synthwave-text-secondary">
                      Total Sessions:{" "}
                      <span className="text-base text-synthwave-neon-cyan font-bold">
                        {aggregations.totalOccurrences}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Recent Sessions Section */}
            {recentSessions.length > 0 && (
              <div className={containerPatterns.coachNotesSection}>
                <h4 className="font-rajdhani text-xs text-synthwave-text-muted uppercase font-semibold mb-3">
                  Recent Sessions
                </h4>
                <div className="space-y-2">
                  {recentSessions.slice(0, 5).map((session, index) => (
                    <div
                      key={session.exerciseId || index}
                      onClick={() =>
                        navigate(
                          `/training-grounds/workouts?workoutId=${session.workoutId}&userId=${userId}&coachId=${coachId || "default"}`,
                        )
                      }
                      className="flex items-center justify-between py-2 px-3 bg-synthwave-bg-primary/30 rounded-lg cursor-pointer hover:bg-synthwave-bg-primary/50 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-rajdhani text-sm text-synthwave-neon-cyan font-medium">
                          [{formatSessionDate(session.completedAt)}]
                        </span>
                        <span className="font-rajdhani text-sm text-synthwave-text-secondary">
                          {capitalizeFirst(
                            session.originalName || session.exerciseName,
                          )}
                          {(formatMetrics(session.metrics) || "No metrics") &&
                            ` - ${formatMetrics(session.metrics) || "No metrics"}`}
                        </span>
                      </div>
                      <svg
                        className="w-4 h-4 text-synthwave-text-muted flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for sessions */}
            {!exerciseAgentState.isLoadingExercises &&
              recentSessions.length === 0 &&
              exerciseData && (
                <div className="text-center py-4">
                  <p className="font-rajdhani text-sm text-synthwave-text-muted">
                    No session data available
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Discipline Badges - at bottom of card (always visible) */}
        {exercise.disciplines && exercise.disciplines.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {exercise.disciplines.map((discipline, index) => (
              <span key={index} className={badgePatterns.workoutDetail}>
                {discipline}
              </span>
            ))}
          </div>
        )}
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
    if (!isValidatingUserId && !exerciseAgentState.isLoadingNames) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, exerciseAgentState.isLoadingNames]);

  // Show loading while validating userId or loading exercises
  if (isValidatingUserId || exerciseAgentState.isLoadingNames) {
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

          {/* Search input skeleton */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="w-full h-12 bg-synthwave-text-muted/20 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Exercise cards skeleton */}
          <div className="mb-8">
            {/* Mobile: Single column */}
            <div className="lg:hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${containerPatterns.cardMedium} p-6 mb-6`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                    <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                  </div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                </div>
              ))}
            </div>
            {/* Desktop: Two columns */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
              <div>
                {[1, 3, 5].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                  </div>
                ))}
              </div>
              <div>
                {[2, 4].map((i) => (
                  <div
                    key={i}
                    className={`${containerPatterns.cardMedium} p-6 mb-6`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                      <div className="h-5 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                    </div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
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
        message={userIdError || "You can only access your own exercises."}
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
            aria-label="Exercises Header"
          >
            {/* Left section: Title + Coach Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
              {/* Page Title with Hover Tooltip */}
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="exercises-info"
                data-tooltip-content="Browse your exercise history and track your personal records. See progression over time for each movement."
              >
                Your Exercises
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
                value: exerciseAgentState.totalExerciseCount || 0,
                tooltip: {
                  title: "Total Exercises",
                  description:
                    "Unique exercises you've performed across all workouts",
                },
                color: "pink",
                isLoading: exerciseAgentState.isLoadingNames,
                ariaLabel: `${exerciseAgentState.totalExerciseCount || 0} total exercises`,
              },
              {
                icon: CalendarMonthIcon,
                value: exercisesThisMonth,
                tooltip: {
                  title: "Active This Month",
                  description: "Exercises performed in the last 30 days",
                },
                color: "cyan",
                isLoading: exerciseAgentState.isLoadingNames,
                ariaLabel: `${exercisesThisMonth} exercises this month`,
              },
              {
                icon: ClockIcon,
                value: exercisesThisWeek,
                tooltip: {
                  title: "Active This Week",
                  description: "Exercises performed in the last 7 days",
                },
                color: "purple",
                isLoading: exerciseAgentState.isLoadingNames,
                ariaLabel: `${exercisesThisWeek} exercises this week`,
              },
              {
                icon: TargetIcon,
                value: exerciseAgentState.exerciseNames.filter((e) => {
                  const lastPerformed = new Date(e.lastPerformed);
                  const now = new Date();
                  const oneDayAgo = new Date(
                    now.getTime() - 24 * 60 * 60 * 1000,
                  );
                  return lastPerformed >= oneDayAgo;
                }).length,
                tooltip: {
                  title: "Recent",
                  description: "Exercises performed in the last 24 hours",
                },
                color: "pink",
                isLoading: exerciseAgentState.isLoadingNames,
                ariaLabel: `${exerciseAgentState.exerciseNames.filter((e) => new Date(e.lastPerformed) >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length} recent exercises`,
              },
            ]}
          />

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 focus:outline-none focus:border-synthwave-neon-cyan focus:bg-synthwave-bg-primary/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ boxShadow: "none", outline: "none" }}
                onFocus={(e) => {
                  e.target.style.outline = "none";
                  e.target.style.boxShadow = "none";
                }}
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-synthwave-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors"
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
              )}
            </div>
          </div>

          {/* Error state */}
          {exerciseAgentState.error && (
            <div className="text-center py-12">
              <NeonBorder color="pink" className="max-w-md mx-auto p-6">
                <p className="font-rajdhani text-synthwave-neon-pink text-xl font-bold mb-2">
                  Error Loading Exercises
                </p>
                <p className="font-rajdhani text-synthwave-text-secondary text-lg">
                  {exerciseAgentState.error}
                </p>
              </NeonBorder>
            </div>
          )}

          {/* Empty state */}
          {!exerciseAgentState.isLoadingNames &&
            !exerciseAgentState.error &&
            filteredExercises.length === 0 && (
              <div className="text-center py-12">
                <div className="font-rajdhani text-synthwave-neon-cyan text-base">
                  {searchQuery ? "No Matching Exercises" : "No Exercises Yet"}
                </div>
                <div className="font-rajdhani text-synthwave-text-muted text-sm mt-2">
                  {searchQuery
                    ? `No exercises match "${searchQuery}". Try a different search term.`
                    : "Log some workouts to start tracking your exercise history and progression."}
                </div>
              </div>
            )}

          {/* Exercises Masonry Layout */}
          {!exerciseAgentState.isLoadingNames &&
            !exerciseAgentState.error &&
            filteredExercises.length > 0 && (
              <div className="mb-8">
                {/* Mobile: Single column */}
                <div className="lg:hidden">
                  {filteredExercises.map((exercise) => (
                    <div key={exercise.exerciseName}>
                      {renderExerciseCard(exercise)}
                    </div>
                  ))}
                </div>
                {/* Desktop: Two columns with alternating distribution */}
                <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
                  {/* Left Column - even indices (0, 2, 4, ...) */}
                  <div>
                    {filteredExercises
                      .filter((_, index) => index % 2 === 0)
                      .map((exercise) => (
                        <div key={exercise.exerciseName}>
                          {renderExerciseCard(exercise)}
                        </div>
                      ))}
                  </div>
                  {/* Right Column - odd indices (1, 3, 5, ...) */}
                  <div>
                    {filteredExercises
                      .filter((_, index) => index % 2 === 1)
                      .map((exercise) => (
                        <div key={exercise.exerciseName}>
                          {renderExerciseCard(exercise)}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Tooltips */}
      <Tooltip
        id="exercises-info"
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

export default ManageExercises;
