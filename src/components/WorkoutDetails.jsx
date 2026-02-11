import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useAuthorizeUser } from "../auth/hooks/useAuthorizeUser";
import { useAuth } from "../auth/contexts/AuthContext";
import { AccessDenied } from "./shared/AccessDenied";
import {
  buttonPatterns,
  containerPatterns,
  layoutPatterns,
  tooltipPatterns,
  badgePatterns,
} from "../utils/ui/uiPatterns";
import CompactCoachCard from "./shared/CompactCoachCard";
import CommandPaletteButton from "./shared/CommandPaletteButton";
import QuickStats from "./shared/QuickStats";
import WorkoutAgent from "../utils/agents/WorkoutAgent";
import CoachAgent from "../utils/agents/CoachAgent";
import { useToast } from "../contexts/ToastContext";
import WorkoutViewer from "./WorkoutViewer";
import IconButton from "./shared/IconButton";
import { useNavigationContext } from "../contexts/NavigationContext";
import { CenteredErrorState, EmptyState } from "./shared/ErrorStates";
import AppFooter from "./shared/AppFooter";
import {
  ClockIcon,
  TargetIcon,
  LightningIcon,
  BarChartIcon,
  SparkleIcon,
} from "./themes/SynthwaveComponents";

const JsonIcon = () => (
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
      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
    />
  </svg>
);

const TrashIcon = () => (
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
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

function WorkoutDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workoutId = searchParams.get("workoutId");
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    error: userIdError,
  } = useAuthorizeUser(userId);
  const { userProfile } = useAuth();

  // Derive unit system from user profile preferences (default: imperial)
  const unitSystem = userProfile?.preferences?.unitSystem || "imperial";

  // View state
  const [viewMode, setViewMode] = useState("formatted"); // 'formatted' or 'raw'

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Global Command Palette state
  const { setIsCommandPaletteOpen } = useNavigationContext();

  const workoutAgentRef = useRef(null);
  const coachAgentRef = useRef(null);

  const { addToast, success, error, info } = useToast();

  // Workout state
  const [workoutAgentState, setWorkoutAgentState] = useState({
    currentWorkout: null,
    recentWorkouts: [],
    isLoadingRecentItems: false,
    isLoadingItem: !!(userId && workoutId && coachId),
    error: null,
  });

  // Coach data state
  const [coachData, setCoachData] = useState(null);

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !workoutId || !coachId) {
      navigate("/training-grounds", { replace: true });
      return;
    }
  }, [userId, workoutId, coachId, navigate]);

  // Initialize workout agent
  useEffect(() => {
    if (!userId) return;

    if (!workoutAgentRef.current) {
      workoutAgentRef.current = new WorkoutAgent(userId, (newState) => {
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          isLoadingRecentItems: newState.isLoadingRecentItems || false,
          isLoadingItem: newState.isLoadingItem || false,
          recentWorkouts: newState.recentWorkouts || [],
          error: newState.error || null,
          currentWorkout: prevState.currentWorkout,
        }));
      });

      workoutAgentRef.current.onError = (error) => {
        console.error("Workout agent error:", error);
      };

      workoutAgentRef.current.onNewWorkout = (workout) => {
        const title = workoutAgentRef.current.formatWorkoutSummary(
          workout,
          true,
        );
        success(`Workout logged: ${title}`);
      };
    }

    return () => {
      if (workoutAgentRef.current) {
        workoutAgentRef.current.destroy();
        workoutAgentRef.current = null;
      }
    };
  }, [userId, success]);

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
    if (!isValidatingUserId && !workoutAgentState.isLoadingItem) {
      window.scrollTo(0, 0);
    }
  }, [isValidatingUserId, workoutAgentState.isLoadingItem]);

  // Load specific workout
  useEffect(() => {
    if (!userId || !workoutId || !workoutAgentRef.current) return;

    const loadWorkout = async () => {
      try {
        setWorkoutAgentState((prevState) => ({
          ...prevState,
          currentWorkout: null,
          isLoadingItem: true,
          error: null,
        }));

        const workout = await workoutAgentRef.current.getWorkout(workoutId);

        setWorkoutAgentState((prevState) => ({
          ...prevState,
          currentWorkout: workout,
        }));
      } catch (error) {
        console.error("Error loading workout:", error);
      }
    };

    loadWorkout();
  }, [userId, workoutId]);

  const handleToggleView = () => {
    setViewMode(viewMode === "formatted" ? "raw" : "formatted");
  };

  // Handle coach card click - navigate to training grounds
  const handleCoachCardClick = () => {
    navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Workout title editing handler
  const handleSaveWorkoutTitle = async (newTitle) => {
    if (
      !newTitle.trim() ||
      !workoutAgentRef.current ||
      !workoutAgentState.currentWorkout
    ) {
      return false;
    }

    try {
      await workoutAgentRef.current.updateWorkout(
        userId,
        workoutAgentState.currentWorkout.workoutId,
        {
          workoutData: {
            workout_name: newTitle.trim(),
          },
        },
      );

      setWorkoutAgentState((prevState) => ({
        ...prevState,
        currentWorkout: {
          ...prevState.currentWorkout,
          workoutData: {
            ...prevState.currentWorkout.workoutData,
            workout_name: newTitle.trim(),
          },
        },
      }));

      success("Workout title updated successfully");
      return true;
    } catch (err) {
      console.error("Error updating workout title:", err);
      error("Failed to update workout title");
      return false;
    }
  };

  // Delete workout handlers
  const handleDeleteClick = (workout) => {
    setWorkoutToDelete(workout);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete || !workoutAgentRef.current || !userId) return;

    setIsDeleting(true);
    try {
      await workoutAgentRef.current.deleteWorkout(
        userId,
        workoutToDelete.workoutId,
      );
      success("Workout deleted successfully");
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
      navigate(
        `/training-grounds/manage-workouts?userId=${userId}&coachId=${coachId}`,
      );
    } catch (error) {
      console.error("Error deleting workout:", error);
      error("Failed to delete workout");
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

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

  // Show skeleton loading while validating userId or loading workout
  if (
    isValidatingUserId ||
    (workoutAgentState.isLoadingItem &&
      (!workoutAgentState.currentWorkout ||
        workoutAgentState.currentWorkout.workoutId !== workoutId))
  ) {
    return <WorkoutDetailsSkeleton />;
  }

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own workouts."}
      />
    );
  }

  // Show error state
  if (workoutAgentState.error) {
    return (
      <CenteredErrorState
        title="Training Grounds Error"
        message={workoutAgentState.error}
        buttonText="Back to Training Grounds"
        onButtonClick={() =>
          navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`)
        }
        variant="error"
      />
    );
  }

  const workout = workoutAgentState.currentWorkout;

  // Extract workout metrics for QuickStats
  const workoutMetrics = workout
    ? {
        intensity: workout.workoutData?.performance_metrics?.intensity || 0,
        rpe: workout.workoutData?.performance_metrics?.perceived_exertion || 0,
        duration: workout.workoutData?.duration
          ? Math.round(workout.workoutData.duration / 60)
          : 0,
        calories:
          workout.workoutData?.performance_metrics?.calories_burned || 0,
        confidence:
          workout.extractionMetadata?.confidence ||
          workout.workoutData?.metadata?.data_confidence ||
          0,
        discipline: workout.workoutData?.discipline || "fitness",
      }
    : null;

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Workout Details Header"
        >
          {/* Left section: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title */}
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="workout-details-info"
              data-tooltip-content="View detailed breakdown of your completed workout including exercises, sets, reps, and performance metrics."
            >
              Workout Details
            </h1>

            {/* Compact Coach Card */}
            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={handleCoachCardClick}
                tooltipContent="Go to the Training Grounds"
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
        {workoutMetrics && (
          <QuickStats
            stats={[
              {
                icon: LightningIcon,
                value: workoutMetrics.intensity || "--",
                tooltip: {
                  title: "Intensity",
                  description: "Overall workout intensity (1-10 scale)",
                },
                color: "pink",
                isLoading: false,
                ariaLabel: `Intensity ${workoutMetrics.intensity} out of 10`,
                id: "workout-stat-intensity",
              },
              {
                icon: TargetIcon,
                value: workoutMetrics.rpe || "--",
                tooltip: {
                  title: "RPE",
                  description: "Rate of Perceived Exertion (1-10 scale)",
                },
                color: "cyan",
                isLoading: false,
                ariaLabel: `RPE ${workoutMetrics.rpe} out of 10`,
                id: "workout-stat-rpe",
              },
              {
                icon: ClockIcon,
                value: workoutMetrics.duration || "--",
                tooltip: {
                  title: "Duration",
                  description: "Total workout duration in minutes",
                },
                color: "purple",
                isLoading: false,
                ariaLabel: `${workoutMetrics.duration} minutes`,
                id: "workout-stat-duration",
              },
              {
                icon: BarChartIcon,
                value: workoutMetrics.calories || "--",
                tooltip: {
                  title: "Calories",
                  description: "Estimated calories burned",
                },
                color: "cyan",
                isLoading: false,
                ariaLabel: `${workoutMetrics.calories} calories`,
                id: "workout-stat-calories",
              },
              {
                icon: SparkleIcon,
                value: `${Math.round(workoutMetrics.confidence * 100)}%`,
                tooltip: {
                  title: "AI Confidence",
                  description: "AI extraction confidence score",
                },
                color: "pink",
                isLoading: false,
                ariaLabel: `${Math.round(workoutMetrics.confidence * 100)}% confidence`,
                id: "workout-stat-confidence",
              },
            ]}
          />
        )}

        {/* Main Content Area */}
        {workout ? (
          <WorkoutViewer
            workout={workout}
            onToggleView={handleToggleView}
            onDeleteWorkout={handleDeleteClick}
            viewMode={viewMode}
            onSaveWorkoutTitle={handleSaveWorkoutTitle}
            formatDate={formatDate}
            unitSystem={unitSystem}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="No workout data available" size="large" />
          </div>
        )}
        <AppFooter />
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
                {workoutAgentRef.current?.formatWorkoutSummary(
                  workoutToDelete,
                  true,
                ) || "this workout"}
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
        id="workout-details-info"
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
    </div>
  );
}

// Skeleton loading component matching ProgramDashboard pattern
function WorkoutDetailsSkeleton() {
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header Skeleton */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
          {/* Left: Title + Coach Card */}
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
        <QuickStats
          stats={[1, 2, 3, 4, 5].map((i) => ({
            icon: null,
            value: 0,
            tooltip: { title: "", description: "" },
            color: "cyan",
            isLoading: true,
            id: `skeleton-stat-${i}`,
          }))}
        />

        {/* Main Content Area skeleton - Two-column layout matching V2 */}
        <div className="space-y-6">
          {/* Two-column layout: 60/40 split */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column - 60% (3 of 5 columns) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Session Stats skeleton */}
              <div className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse flex-shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Subjective Feedback skeleton */}
              <div className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse flex-shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-56"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Discipline-specific skeleton */}
              <div className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse flex-shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
                <div className="px-6 pb-6 space-y-4">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            </div>

            {/* Right column - 40% (2 of 5 columns) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Insights skeleton */}
              <div className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse flex-shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-44"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* PR Achievements skeleton */}
              <div className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse flex-shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
                <div className="px-6 pb-6">
                  <div className="h-16 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Coach Notes skeleton */}
              <div className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse flex-shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
                <div className="px-6 pb-6 space-y-2">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-5/6"></div>
                </div>
              </div>

              {/* Extraction Notes skeleton */}
              <div className={`${containerPatterns.cardMedium}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-synthwave-neon-pink/30 rounded-full animate-pulse flex-shrink-0 mt-0.5"></div>
                    <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-44"></div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>
                <div className="px-6 pb-6 space-y-2">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkoutDetails;
