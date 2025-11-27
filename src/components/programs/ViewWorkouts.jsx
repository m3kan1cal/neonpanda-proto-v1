import React, { useState, useEffect, useRef } from "react";
import {
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { useAuthorizeUser } from "../../auth/hooks/useAuthorizeUser";
import { AccessDenied } from "../shared/AccessDenied";
import {
  buttonPatterns,
  containerPatterns,
  layoutPatterns,
  tooltipPatterns,
  badgePatterns,
  formPatterns,
} from "../../utils/ui/uiPatterns";
import { Tooltip } from "react-tooltip";
import CompactCoachCard from "../shared/CompactCoachCard";
import CommandPaletteButton from "../shared/CommandPaletteButton";
import { useNavigationContext } from "../../contexts/NavigationContext";
import {
  WorkoutIconSmall,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  HomeIcon,
} from "../themes/SynthwaveComponents";
import { ProgramAgent } from "../../utils/agents/ProgramAgent";
import CoachAgent from "../../utils/agents/CoachAgent";
import { useToast } from "../../contexts/ToastContext";
import { CenteredErrorState } from "../shared/ErrorStates";

/**
 * ViewWorkouts - Shows workout templates for a specific day or today
 * Allows user to log or skip individual workouts
 *
 * Routes:
 * - /training-grounds/programs/workouts?userId=X&coachId=Y&programId=Z - Shows today's workouts
 * - /training-grounds/programs/workouts?userId=X&coachId=Y&programId=Z&day=N - Shows specific day's workouts
 */
function ViewWorkouts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const programId = searchParams.get("programId");
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");
  const dayParam = searchParams.get("day");

  // Determine if we're viewing today or a specific day
  const isViewingToday = !dayParam;
  const pageTitle = isViewingToday ? "Today's Workouts" : "View Workouts";
  const tooltipContent = isViewingToday
    ? "All workouts scheduled for today from your training program"
    : "View workouts for a specific day in your training program";

  // Authorize that URL userId matches authenticated user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    error: userIdError,
  } = useAuthorizeUser(userId);
  const { success: showSuccess, error: showError } = useToast();

  // Get global CommandPalette state from NavigationContext
  const { setIsCommandPaletteOpen } = useNavigationContext();

  // State
  const [program, setProgram] = useState(null);
  const [coachData, setCoachData] = useState(null);
  const [workoutData, setWorkoutData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingWorkoutId, setProcessingWorkoutId] = useState(null);

  // State for workout logging (replaces fragile refs approach)
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [editedPerformance, setEditedPerformance] = useState('');

  // State for collapsible workout cards
  const [collapsedCards, setCollapsedCards] = useState(new Set());

  // State for day completion celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('lasers'); // 'burst', 'lasers', 'lightning', 'warp'

  // Agent refs
  const programAgentRef = useRef(null);
  const coachAgentRef = useRef(null);

  // Load program and workout data
  const loadData = async () => {
    if (!userId || !coachId || !programId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Initialize coach agent if needed
      if (!coachAgentRef.current) {
        coachAgentRef.current = new CoachAgent({ userId });
      }
      const coach = await coachAgentRef.current.loadCoachDetails(userId, coachId);
      setCoachData(coach);

      // Initialize program agent if needed
      if (!programAgentRef.current) {
        programAgentRef.current = new ProgramAgent(
          userId,
          coachId,
          (newState) => {
            // Update local state when agent state changes
            if (newState.selectedProgram) {
              setProgram(newState.selectedProgram);
            }
            if (newState.todaysWorkout) {
              setWorkoutData(newState.todaysWorkout);
            }
          }
        );
      }

      // Load program
      const programData = await programAgentRef.current.loadProgram(programId);

      if (!programData || !programData.program) {
        throw new Error("Program not found");
      }

      setProgram(programData.program);

      // Load workouts based on query params
      if (isViewingToday) {
        // Load today's workout
        const todayData = await programAgentRef.current.loadWorkoutTemplates(programId, {
          today: true,
        });
        if (todayData) {
          setWorkoutData(todayData.todaysWorkoutTemplates || todayData);
        }
      } else if (dayParam) {
        // Load specific day's workout
        const dayData = await programAgentRef.current.loadWorkoutTemplates(programId, {
          day: parseInt(dayParam),
        });
        if (dayData) {
          setWorkoutData(dayData);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load workout data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, coachId, programId, dayParam]);

  // Cleanup agents on unmount
  useEffect(() => {
    return () => {
      if (programAgentRef.current) {
        programAgentRef.current.destroy();
        programAgentRef.current = null;
      }
      if (coachAgentRef.current) {
        coachAgentRef.current = null;
      }
    };
  }, []);

  // Toggle card collapse/expand
  const toggleCardCollapse = (templateId) => {
    setCollapsedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // Start logging - opens the editable form
  const handleLogWorkout = (template) => {
    // Copy prescribed description and append placeholders for performance data
    const prescribedWithPlaceholders = `${template.description}

--- Performance Data ---
RPE:
Intensity:
Duration:
Calories: `;

    setEditingWorkoutId(template.templateId);
    setEditedPerformance(prescribedWithPlaceholders);

    // Smooth scroll to the form that just appeared
    setTimeout(() => {
      document.getElementById(`workout-form-${template.templateId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }, 100);
  };

  // Cancel logging - closes the form
  const handleCancelLogging = () => {
    setEditingWorkoutId(null);
    setEditedPerformance('');
  };

  // Submit the workout - actually logs it
  const handleSubmitWorkout = async (template) => {
    if (processingWorkoutId || !programAgentRef.current) return;

    setProcessingWorkoutId(template.templateId);
    try {
      console.log('📝 Submitting workout:', {
        templateId: template.templateId,
        originalLength: template.description?.length,
        editedLength: editedPerformance?.length,
        editedPreview: editedPerformance?.substring(0, 100),
      });

      // Prepare workout data for logging
      const workoutData = {
        userPerformance: editedPerformance,
      };

      // Determine options for reload
      const options = {};
      if (isViewingToday) {
        options.today = true;
      } else if (dayParam) {
        options.day = parseInt(dayParam);
      }

      // Call agent method - it handles API call, state updates, and polling
      await programAgentRef.current.logWorkoutFromTemplate(
        programId,
        template.templateId,
        workoutData,
        options
      );

      // Show success message
      showSuccess("Workout logged successfully! We're processing your workout in the background.");

      // Close the form
      setEditingWorkoutId(null);
      setEditedPerformance('');

      // Update local state to mark template as completed
      setWorkoutData(prevData => {
        if (!prevData || !prevData.templates) return prevData;

        const updatedTemplates = prevData.templates.map(t =>
          t.templateId === template.templateId
            ? { ...t, status: 'completed', completedAt: new Date().toISOString() }
            : t
        );

        // Check if ALL workouts for the day are now complete
        const allComplete = updatedTemplates.every(
          t => t.status === 'completed' || t.status === 'skipped'
        );

        // Trigger celebration if this was the last workout
        if (allComplete) {
          setShowCelebration(true);
          showSuccess(`🎉 Day ${prevData.dayNumber} Complete! All ${updatedTemplates.length} workout${updatedTemplates.length > 1 ? 's' : ''} crushed!`);

          // Auto-hide celebration after animation (3 seconds)
          setTimeout(() => setShowCelebration(false), 3000);
        }

        return {
          ...prevData,
          templates: updatedTemplates
        };
      });
    } catch (err) {
      console.error("Error logging workout:", err);
      showError(err.message || "Failed to log workout");
    } finally {
      setProcessingWorkoutId(null);
    }
  };

  const handleSkipWorkout = async (template) => {
    if (processingWorkoutId || !programAgentRef.current) return;

    setProcessingWorkoutId(template.templateId);
    try {
      // Determine options for reload
      const options = {
        skipReason: 'Skipped by user'
      };
      if (isViewingToday) {
        options.today = true;
      } else if (dayParam) {
        options.day = parseInt(dayParam);
      }

      // Call agent method - it handles API call and state updates
      await programAgentRef.current.skipWorkoutTemplate(
        programId,
        template.templateId,
        options
      );

      // Show success message
      showSuccess("Workout skipped successfully");

      // Update local state to mark template as skipped
      setWorkoutData(prevData => {
        if (!prevData || !prevData.templates) return prevData;

        const updatedTemplates = prevData.templates.map(t =>
          t.templateId === template.templateId
            ? { ...t, status: 'skipped', completedAt: new Date().toISOString() }
            : t
        );

        // Check if ALL workouts for the day are now complete/skipped
        const allComplete = updatedTemplates.every(
          t => t.status === 'completed' || t.status === 'skipped'
        );

        // Trigger celebration if this was the last workout
        if (allComplete) {
          setShowCelebration(true);
          showSuccess(`🎉 Day ${prevData.dayNumber} Complete! All ${updatedTemplates.length} workout${updatedTemplates.length > 1 ? 's' : ''} accounted for!`);

          // Auto-hide celebration after animation (3 seconds)
          setTimeout(() => setShowCelebration(false), 3000);
        }

        return {
          ...prevData,
          templates: updatedTemplates
        };
      });
    } catch (err) {
      console.error("Error skipping workout:", err);
      showError(err.message || "Failed to skip workout");
    } finally {
      setProcessingWorkoutId(null);
    }
  };

  const handleUnskipWorkout = async (template) => {
    if (processingWorkoutId || !programAgentRef.current) return;

    setProcessingWorkoutId(template.templateId);
    try {
      // Determine options for reload
      const options = {};
      if (isViewingToday) {
        options.today = true;
      } else if (dayParam) {
        options.day = parseInt(dayParam);
      }

      // Call agent method - it handles API call and state updates
      await programAgentRef.current.unskipWorkoutTemplate(
        programId,
        template.templateId,
        options
      );

      // Show success message
      showSuccess("Workout unskipped - ready to log or skip again");

      // Update local state to revert template back to pending
      setWorkoutData(prevData => {
        if (!prevData || !prevData.templates) return prevData;

        const updatedTemplates = prevData.templates.map(t =>
          t.templateId === template.templateId
            ? { ...t, status: 'pending', completedAt: null }
            : t
        );

        return {
          ...prevData,
          templates: updatedTemplates
        };
      });
    } catch (err) {
      console.error("Error unskipping workout:", err);
      showError(err.message || "Failed to unskip workout");
    } finally {
      setProcessingWorkoutId(null);
    }
  };

  // Handle authorization silently - redirect if unauthorized
  useEffect(() => {
    if (!isValidatingUserId && (userIdError || !isValidUserId)) {
      navigate("/auth", { replace: true });
    }
  }, [isValidatingUserId, userIdError, isValidUserId, navigate]);

  // Show loading state with skeleton
  if (isValidatingUserId || isLoading) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className={layoutPatterns.contentWrapper}>
          {/* Header Skeleton */}
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

          {/* Program Context Skeleton */}
          <div className="mb-8">
            <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-80 mb-2"></div>
            <div className="flex items-center gap-4 text-sm">
              <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
              <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
              <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
            </div>
          </div>

          {/* Workout Cards Skeleton */}
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className={`${containerPatterns.cardMedium} p-6`}>
                {/* Workout Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {/* Name and Badge */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
                      <div className="h-5 w-24 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                    </div>
                    {/* Metadata Row */}
                    <div className="flex items-center flex-wrap gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-16"></div>
                      </div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-28"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-32"></div>
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                </div>

                {/* Description Textarea */}
                <div className="mb-4">
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg px-4 py-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-full"></div>
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-full"></div>
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-5/6"></div>
                      <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-4/6"></div>
                    </div>
                  </div>
                  {/* Helper text skeleton */}
                  <div className="mt-2 h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                </div>

                {/* Coach Notes Skeleton */}
                <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg px-4 py-4 mb-4">
                  <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-24 mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-4/5"></div>
                  </div>
                </div>

                {/* Equipment, Exercises, Focus Areas Skeleton */}
                <div className="space-y-4 mb-4">
                  {/* Equipment Needed */}
                  <div>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-32 mb-2"></div>
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 w-20 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                      <div className="h-6 w-24 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                      <div className="h-6 w-16 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  {/* Prescribed Exercises */}
                  <div>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-36 mb-2"></div>
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 w-28 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                      <div className="h-6 w-24 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  {/* Focus Areas */}
                  <div>
                    <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-24 mb-2"></div>
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 w-20 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                      <div className="h-6 w-16 bg-synthwave-text-muted/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <div className="flex-1 h-10 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
                  <div className="flex-1 h-10 bg-synthwave-text-muted/20 rounded-lg animate-pulse"></div>
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
        message={userIdError || "You can only access your own training data."}
      />
    );
  }

  if (!userId || !coachId || !programId) {
    return (
      <CenteredErrorState
        title="Missing Information"
        message="User ID, Coach ID, and Program ID are required."
        buttonText="Back to Training Grounds"
        onButtonClick={() =>
          navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`)
        }
        variant="error"
      />
    );
  }

  if (error) {
    return (
      <CenteredErrorState
        title="Error Loading Workouts"
        message={error}
        buttonText="Back to Training Grounds"
        onButtonClick={() =>
          navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`)
        }
        variant="error"
      />
    );
  }

  // Check if this is a rest day (no workouts scheduled)
  const isRestDay =
    !workoutData ||
    !workoutData.templates ||
    workoutData.templates.length === 0;

  const {
    dayNumber: workoutDayNumber,
    phaseName,
    phaseNumber,
    templates,
  } = workoutData || {
    dayNumber: dayParam ? parseInt(dayParam) : null,
    phaseName: "Rest Day",
    phaseNumber: null,
    templates: [],
  };

  // Format scoring type for display (remove snake_case)
  const formatScoringType = (scoringType) => {
    if (!scoringType) return "";
    return scoringType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Workouts Header"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            <h1
              className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
              data-tooltip-id="workouts-info"
              data-tooltip-content={tooltipContent}
            >
              {pageTitle}
            </h1>

            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={() =>
                  navigate(
                    `/training-grounds?userId=${userId}&coachId=${coachId}`
                  )
                }
                tooltipContent="Go to the Training Grounds"
              />
            )}
          </div>

          {/* Command Palette Button - triggers global CommandPalette from App.jsx */}
          <div className="flex items-center gap-3">
            <CommandPaletteButton
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>
        </header>

        {/* Program Context */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="font-rajdhani text-lg text-white">
              {program.name}
            </div>
            {/* Day Complete Badge - shown when all workouts are complete */}
            {!isRestDay && templates && templates.every(t => t.status === 'completed' || t.status === 'skipped') && (
              <span className={`${badgePatterns.cyan} uppercase flex items-center gap-1`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Day Complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm pb-1">
            <div className="font-rajdhani text-synthwave-text-secondary">
              {phaseNumber ? (
                <>
                  <span className="text-synthwave-text-muted">Phase {phaseNumber}:</span>{" "}
                  {phaseName}
                </>
              ) : (
                <>
                  <span className="text-synthwave-text-muted">Phase:</span>{" "}
                  {phaseName}
                </>
              )}
            </div>
            <div className="font-rajdhani text-synthwave-text-muted">
              Day {workoutDayNumber} of {program.totalDays}
            </div>
            {!isRestDay && (
              <span className="font-rajdhani text-synthwave-neon-cyan">
                {templates.length} Workout{templates.length > 1 ? "s" : ""}{" "}
                Scheduled
              </span>
            )}
            {isRestDay && (
              <div className="font-rajdhani text-synthwave-neon-cyan">
                Rest Day
              </div>
            )}
          </div>
        </div>

        {/* Workout Templates Grid */}
        <div className="space-y-6">
          {/* Rest Day Card */}
          {isRestDay && (
            <div className={`${containerPatterns.cardMedium} p-6`}>
              {/* Rest Day Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-russo text-white text-xl font-bold uppercase">
                      Rest & Recovery Day
                    </h3>
                    <span className={`${badgePatterns.cyan} uppercase`}>
                      Rest Day
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-4">
                    <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                      <span className="text-synthwave-text-muted">Type:</span>
                      <span className="text-synthwave-neon-cyan font-medium capitalize">
                        Recovery
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-synthwave-neon-cyan opacity-50">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Rest Day Description */}
              <div
                className={`${containerPatterns.workoutDescriptionEditable} mb-4`}
              >
                <p className="font-rajdhani text-base text-synthwave-text-secondary">
                  No workouts scheduled for{" "}
                  {isViewingToday ? "today" : `day ${dayParam}`}. Take this
                  time to focus on recovery, mobility work, light stretching, or
                  active rest. Your body needs rest days to adapt and grow
                  stronger.
                </p>
              </div>

              {/* Coach Notes - Enhanced Glassmorphism */}
              <div className={`${containerPatterns.coachNotesSection} mb-4`}>
                <div className="font-rajdhani text-base text-synthwave-neon-cyan uppercase font-semibold mb-2">
                  Recovery Tips
                </div>
                <div className="font-rajdhani text-base text-synthwave-text-secondary">
                  Consider foam rolling, stretching, a light walk, or yoga. Stay
                  hydrated and get quality sleep. Listen to your body and enjoy
                  the recovery!
                </div>
              </div>

              {/* Action Button */}
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    navigate(
                      `/training-grounds?userId=${userId}&coachId=${coachId}`
                    )
                  }
                  className={`flex-1 ${buttonPatterns.secondaryMedium} space-x-2`}
                >
                  <HomeIcon />
                  <span>Back to Training Grounds</span>
                </button>
              </div>
            </div>
          )}

          {/* Workout Templates */}
          {!isRestDay &&
            templates.map((template, index) => {
              const isCompleted = template.status === 'completed';
              const isSkipped = template.status === 'skipped';
              const isCollapsed = collapsedCards.has(template.templateId);

              return (
              <div
                key={template.templateId}
                className={`${containerPatterns.cardMedium} animate-fadeIn ${
                  isCompleted || isSkipped ? 'opacity-75' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Workout Header - Clickable for collapse/expand */}
                <div
                  className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
                    isCollapsed ? 'rounded-2xl' : 'rounded-t-2xl'
                  }`}
                  onClick={() => toggleCardCollapse(template.templateId)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-russo text-xl font-bold uppercase text-white">
                        {template.name}
                      </h3>
                      {/* Difficulty Badge - always show if available */}
                      {template.metadata?.difficulty && (
                        <span
                          className={`${
                            template.metadata.difficulty === "advanced"
                              ? badgePatterns.pink
                              : template.metadata.difficulty === "intermediate"
                                ? badgePatterns.purple
                                : badgePatterns.cyan
                          } uppercase`}
                        >
                          {template.metadata.difficulty}
                        </span>
                      )}
                      {/* Status Badge */}
                      {isCompleted && (
                        <span className={`${badgePatterns.cyan} uppercase`}>
                          ✓ Logged
                        </span>
                      )}
                      {isSkipped && (
                        <span className={`${badgePatterns.cyan} uppercase`}>
                          ✕ Skipped
                        </span>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-4">
                      {template.estimatedDuration && (
                        <div className="flex items-center gap-1 text-synthwave-text-secondary font-rajdhani text-sm">
                          <svg
                            className="w-4 h-4 flex-shrink-0"
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
                          <span>{template.estimatedDuration} min</span>
                        </div>
                      )}
                      {(template.timeCap || true) && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-muted">
                            Time Cap:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {template.timeCap
                              ? `${template.timeCap} min`
                              : "None"}
                          </span>
                        </div>
                      )}
                      {(template.restAfter ||
                        template.restAfter === 0 ||
                        true) && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-muted">
                            Rest After:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {template.restAfter
                              ? `${template.restAfter} min`
                              : "0 min"}
                          </span>
                        </div>
                      )}
                      {template.type && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-muted">
                            Type:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium capitalize">
                            {template.type}
                          </span>
                        </div>
                      )}
                      {template.scoringType && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-muted">
                            Scoring:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {formatScoringType(template.scoringType)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-synthwave-neon-cyan">
                      <WorkoutIconSmall />
                    </div>
                    {/* Collapse/Expand Icon */}
                    <svg
                      className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${
                        isCollapsed ? 'rotate-180' : ''
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
                  </div>
                </div>

                {/* Collapsible Card Content */}
                {!isCollapsed && (
                  <div className="px-6 pb-6">
                {/* Prescribed Workout - Read-only */}
                {template.description && (
                  <div className="mb-4">
                    <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                      Prescribed Workout
                    </h4>
                    <div className={containerPatterns.workoutDescriptionEditable}>
                      {template.description}
                    </div>
                  </div>
                )}

                {/* What You Did - Editable Form (only when logging) */}
                {editingWorkoutId === template.templateId && (
                  <div
                    id={`workout-form-${template.templateId}`}
                    className="mb-4 animate-slideDown"
                  >
                    <h4 className="font-rajdhani text-sm text-synthwave-neon-pink uppercase font-semibold mb-2">
                      What You Did
                    </h4>
                    <textarea
                      value={editedPerformance}
                      onChange={(e) => setEditedPerformance(e.target.value)}
                      className={containerPatterns.workoutDescriptionEditable}
                      placeholder="Edit to record what you actually did..."
                      rows={8}
                      style={{
                        resize: "none",
                        overflow: "hidden",
                      }}
                      ref={(el) => {
                        if (el) {
                          // Set initial height based on content when textarea first renders
                          el.style.height = "auto";
                          el.style.height = el.scrollHeight + "px";
                        }
                      }}
                      onInput={(e) => {
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                    />
                    <div className={`mt-2 pl-2 ${formPatterns.helperText}`}>
                      <span className="text-synthwave-neon-cyan">
                        Edit above to record actual performance
                      </span>{" "}
                      - weights used, reps completed, RPE, intensity, movement substitutions, etc.
                    </div>
                  </div>
                )}

                {/* Coach Notes */}
                {template.notes && (
                  <div className="mb-4">
                    <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                      Coach Notes
                    </h4>
                    <div className={containerPatterns.coachNotesSection}>
                      <div className="font-rajdhani text-base text-synthwave-text-secondary">
                        {template.notes}
                      </div>
                    </div>
                  </div>
                )}

                {/* Equipment, Exercises & Focus Areas */}
                <div className="space-y-4 mb-4">
                  {template.equipment && template.equipment.length > 0 && (
                    <div>
                      <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                        Equipment Needed
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {template.equipment.map((item, i) => (
                          <span key={i} className={badgePatterns.workoutDetail}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {template.prescribedExercises &&
                    template.prescribedExercises.length > 0 && (
                      <div>
                        <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                          Prescribed Exercises
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {template.prescribedExercises.map((exercise, i) => (
                            <span
                              key={i}
                              className={badgePatterns.workoutDetail}
                            >
                              {exercise}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {template.metadata?.focusAreas &&
                    template.metadata.focusAreas.length > 0 && (
                      <div>
                        <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                          Focus Areas
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {template.metadata.focusAreas.map((area, i) => (
                            <span
                              key={i}
                              className={badgePatterns.workoutDetail}
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                  {isCompleted ? (
                    template.linkedWorkoutId ? (
                      // Show "View Workout" button when linkedWorkoutId is available
                      <button
                        onClick={() => {
                          navigate(
                            `/training-grounds/workouts?workoutId=${template.linkedWorkoutId}&userId=${userId}&coachId=${coachId}`
                          );
                        }}
                        className={`flex-1 ${buttonPatterns.secondaryMedium} space-x-2`}
                      >
                        <CheckIcon />
                        <span>View Workout</span>
                      </button>
                    ) : (
                      // Show "Processing..." when workout is being built
                      <button
                        disabled
                        className={`flex-1 ${buttonPatterns.secondaryMedium} space-x-2 cursor-not-allowed`}
                      >
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing Workout...</span>
                      </button>
                    )
                  ) : isSkipped ? (
                    // Show unskip button for skipped templates (styled like View Workout)
                    <button
                      onClick={() => handleUnskipWorkout(template)}
                      disabled={processingWorkoutId === template.templateId}
                      className={`flex-1 ${buttonPatterns.secondaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {processingWorkoutId === template.templateId ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckIcon />
                      )}
                      <span>Unskip Workout</span>
                    </button>
                  ) : editingWorkoutId === template.templateId ? (
                    // Show Submit/Cancel buttons when editing
                    <>
                      <button
                        onClick={handleCancelLogging}
                        disabled={processingWorkoutId === template.templateId}
                        className={`flex-1 ${buttonPatterns.secondaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <XIcon />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => handleSubmitWorkout(template)}
                        disabled={processingWorkoutId === template.templateId}
                        className={`flex-1 ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {processingWorkoutId === template.templateId ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckIcon />
                        )}
                        <span>Submit Workout</span>
                      </button>
                    </>
                  ) : (
                    // Show Log/Skip buttons for scheduled templates
                    <>
                      <button
                        onClick={() => handleSkipWorkout(template)}
                        disabled={processingWorkoutId === template.templateId}
                        className={`flex-1 ${buttonPatterns.secondaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {processingWorkoutId === template.templateId ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <XIcon />
                        )}
                        <span>Skip Workout</span>
                      </button>
                      <button
                        onClick={() => handleLogWorkout(template)}
                        disabled={processingWorkoutId === template.templateId}
                        className={`flex-1 ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <CheckIcon />
                        <span>Log Workout</span>
                      </button>
                    </>
                  )}
                </div>
                  </div>
                )}
              </div>
              );
            })}
        </div>
      </div>

      {/* CommandPalette removed - using global CommandPalette from App.jsx */}

      {/* Synthwave Celebrations */}
      {showCelebration && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          {/* Celebration Type 1: Neon Burst (Original) */}
          {celebrationType === 'burst' && (
            <>
              {/* Neon Burst Animation */}
              <div className="absolute inset-0 animate-neonBurst opacity-0"
                style={{
                  background: 'radial-gradient(circle, rgba(255,20,147,0.8) 0%, rgba(0,255,255,0.6) 30%, rgba(138,43,226,0.4) 60%, transparent 100%)',
                  animation: 'neonBurst 3s ease-out forwards'
                }}
              />

              {/* Rotating Neon Rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-synthwave-neon-pink rounded-full animate-ping opacity-0"
                  style={{ animationDuration: '2s' }}
                />
                <div className="absolute w-96 h-96 border-4 border-synthwave-neon-cyan rounded-full animate-ping opacity-0"
                  style={{ animationDuration: '2.5s', animationDelay: '0.2s' }}
                />
                <div className="absolute w-[32rem] h-[32rem] border-4 border-synthwave-neon-purple rounded-full animate-ping opacity-0"
                  style={{ animationDuration: '3s', animationDelay: '0.4s' }}
                />
              </div>

              {/* Scan Lines Effect */}
              <div className="absolute inset-0 opacity-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,255,0.1) 0px, transparent 2px, transparent 4px, rgba(0,255,255,0.1) 4px)',
                  animation: 'scanLines 3s ease-out forwards'
                }}
              />
            </>
          )}

          {/* Celebration Type 2: Laser Grid (Tron-style) */}
          {celebrationType === 'lasers' && (
            <>
              {/* Horizontal Laser Beams */}
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-synthwave-neon-cyan to-transparent opacity-0"
                    style={{
                      top: `${12.5 * (i + 1)}%`,
                      animation: `laserBeamH 3s ease-out forwards`,
                      animationDelay: `${i * 0.1}s`,
                      boxShadow: '0 0 8px rgba(0,255,255,0.6), 0 0 16px rgba(0,255,255,0.4), 0 0 24px rgba(0,255,255,0.3)'
                    }}
                  />
                ))}
              </div>

              {/* Vertical Laser Beams */}
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-synthwave-neon-pink to-transparent opacity-0"
                    style={{
                      left: `${12.5 * (i + 1)}%`,
                      animation: `laserBeamV 3s ease-out forwards`,
                      animationDelay: `${i * 0.1 + 0.5}s`,
                      boxShadow: '0 0 8px rgba(255,20,147,0.6), 0 0 16px rgba(255,20,147,0.4), 0 0 24px rgba(255,20,147,0.3)'
                    }}
                  />
                ))}
              </div>

              {/* Grid Flash */}
              <div className="absolute inset-0 opacity-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,255,0.1) 0px, transparent 50px), repeating-linear-gradient(90deg, rgba(255,20,147,0.1) 0px, transparent 50px)',
                  animation: 'gridFlash 3s ease-out forwards'
                }}
              />

              {/* Additional Neon Glow Layer */}
              <div className="absolute inset-0 opacity-0"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.12) 0%, rgba(255,20,147,0.12) 50%, transparent 70%)',
                  animation: 'gridFlash 3s ease-out forwards'
                }}
              />
            </>
          )}

          {/* Celebration Type 3: Lightning Bolts */}
          {celebrationType === 'lightning' && (
            <>
              {/* Lightning Strikes */}
              <div className="absolute inset-0">
                {/* Left Lightning */}
                <div className="absolute left-1/4 top-0 w-1 h-full opacity-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(138,43,226,0.9) 20%, rgba(255,20,147,0.9) 40%, rgba(0,255,255,0.9) 60%, rgba(138,43,226,0.9) 80%, transparent 100%)',
                    animation: 'lightning 3s ease-out forwards',
                    boxShadow: '0 0 20px rgba(138,43,226,0.8), 0 0 40px rgba(255,20,147,0.6)',
                    transform: 'rotate(-15deg) scaleY(0)',
                    transformOrigin: 'top'
                  }}
                />

                {/* Center Lightning */}
                <div className="absolute left-1/2 top-0 w-2 h-full opacity-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(255,20,147,0.9) 20%, rgba(0,255,255,0.9) 50%, rgba(138,43,226,0.9) 80%, transparent 100%)',
                    animation: 'lightning 3s ease-out forwards',
                    animationDelay: '0.2s',
                    boxShadow: '0 0 30px rgba(255,20,147,0.8), 0 0 60px rgba(0,255,255,0.6)',
                    transform: 'scaleY(0)',
                    transformOrigin: 'top'
                  }}
                />

                {/* Right Lightning */}
                <div className="absolute left-3/4 top-0 w-1 h-full opacity-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,255,0.9) 20%, rgba(138,43,226,0.9) 40%, rgba(255,20,147,0.9) 60%, rgba(0,255,255,0.9) 80%, transparent 100%)',
                    animation: 'lightning 3s ease-out forwards',
                    animationDelay: '0.4s',
                    boxShadow: '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(138,43,226,0.6)',
                    transform: 'rotate(15deg) scaleY(0)',
                    transformOrigin: 'top'
                  }}
                />
              </div>

              {/* Electric Glow */}
              <div className="absolute inset-0 opacity-0"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(138,43,226,0.3) 0%, transparent 70%)',
                  animation: 'electricGlow 3s ease-out forwards'
                }}
              />
            </>
          )}

          {/* Celebration Type 4: Starfield Warp */}
          {celebrationType === 'warp' && (
            <>
              {/* Warp Stars */}
              <div className="absolute inset-0">
                {[...Array(50)].map((_, i) => {
                  const angle = (Math.random() * 360);
                  const distance = Math.random() * 50;
                  const size = Math.random() * 3 + 1;
                  const color = ['rgba(255,20,147,0.9)', 'rgba(0,255,255,0.9)', 'rgba(138,43,226,0.9)'][Math.floor(Math.random() * 3)];

                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: '50%',
                        top: '50%',
                        width: `${size}px`,
                        height: '2px',
                        background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
                        transformOrigin: 'left center',
                        transform: `translate(-50%, -50%) rotate(${angle}deg) scaleX(0)`,
                        animation: 'warpStar 2s ease-out forwards',
                        animationDelay: `${Math.random() * 1}s`,
                        boxShadow: `0 0 ${size * 2}px ${color}`
                      }}
                    />
                  );
                })}
              </div>

              {/* Warp Tunnel */}
              <div className="absolute inset-0 opacity-0"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 0%, rgba(255,20,147,0.2) 40%, rgba(0,255,255,0.3) 60%, rgba(138,43,226,0.4) 80%, #16213e 100%)',
                  animation: 'warpTunnel 3s ease-out forwards'
                }}
              />
            </>
          )}
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
    </div>
  );
}

export default ViewWorkouts;
