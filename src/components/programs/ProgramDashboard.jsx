import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProgramAgent } from "../../utils/agents/ProgramAgent";
import { CoachAgent } from "../../utils/agents/CoachAgent";
import CompactCoachCard from "../shared/CompactCoachCard";
import CommandPaletteButton from "../shared/CommandPaletteButton";
import QuickStats from "../shared/QuickStats";
import { CenteredErrorState } from "../shared/ErrorStates";
import AppFooter from "../shared/AppFooter";
import { useNavigationContext } from "../../contexts/NavigationContext";
import { Tooltip } from "react-tooltip";
import {
  containerPatterns,
  layoutPatterns,
  buttonPatterns,
  badgePatterns,
  typographyPatterns,
  tooltipPatterns,
} from "../../utils/ui/uiPatterns";
import {
  CalendarIcon,
  WorkoutIcon,
  CheckIcon,
  XIcon,
  LightningIcon,
  ProgramIcon,
} from "../themes/SynthwaveComponents";
import TodaysWorkoutCard from "./TodaysWorkoutCard";
import ProgramOverview from "./ProgramOverview";
import ProgressOverview from "./ProgressOverview";
import ProgramCalendar from "./ProgramCalendar";
import PhaseTimeline from "./PhaseTimeline";
import PhaseBreakdown from "./PhaseBreakdown";
import ShareProgramModal from "../shared-programs/ShareProgramModal";
import { useToast } from "../../contexts/ToastContext";
import { logger } from "../../utils/logger";

export default function ProgramDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const programId = searchParams.get("programId");
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");

  const [program, setProgram] = useState(null);
  const [programDetails, setProgramDetails] = useState(null);
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [coachData, setCoachData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompletingRestDay, setIsCompletingRestDay] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const programAgentRef = useRef(null);
  const coachAgentRef = useRef(null);
  const { setIsCommandPaletteOpen } = useNavigationContext();
  const toast = useToast();

  // Load program data
  useEffect(() => {
    loadData();

    // Cleanup
    return () => {
      if (programAgentRef.current) {
        programAgentRef.current.destroy();
      }
    };
  }, [userId, coachId, programId]);

  const loadData = async () => {
    if (!userId || !coachId || !programId) {
      setError("Missing required parameters");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Initialize agents
      if (!coachAgentRef.current) {
        coachAgentRef.current = new CoachAgent({ userId });
      }

      if (!programAgentRef.current) {
        programAgentRef.current = new ProgramAgent(
          userId,
          coachId,
          (newState) => {
            if (newState.selectedProgram) {
              setProgram(newState.selectedProgram);
            }
            if (newState.todaysWorkout) {
              setTodaysWorkout(newState.todaysWorkout);
            }
          },
        );
      }

      // Load coach data
      const coach = await coachAgentRef.current.loadCoachDetails(
        userId,
        coachId,
      );
      setCoachData(coach);

      // Load program with full details
      const programData = await programAgentRef.current.loadProgram(programId);

      if (!programData || !programData.program) {
        throw new Error("Program not found");
      }

      setProgram(programData.program);

      // Load ALL workout templates for the calendar
      const allTemplatesData =
        await programAgentRef.current.loadWorkoutTemplates(programId, {});

      if (allTemplatesData) {
        setProgramDetails(allTemplatesData);
      }

      // Load today's workout (only for active/paused programs)
      // Note: Completed programs don't have "today's workout"
      if (
        programData.program.status === "active" ||
        programData.program.status === "paused"
      ) {
        try {
          const todayData = await programAgentRef.current.loadWorkoutTemplates(
            programId,
            {
              today: true,
            },
          );

          if (todayData) {
            setTodaysWorkout(todayData.todaysWorkoutTemplates || todayData);
          } else {
            // null response means rest day
            setTodaysWorkout(null);
          }
        } catch (todayError) {
          // If loading today's workout fails, just set it to null
          // (e.g., program is complete, no more scheduled workouts)
          logger.warn("Could not load today's workout:", todayError);
          setTodaysWorkout(null);
        }
      } else {
        // Completed or archived programs don't have "today's workout"
        setTodaysWorkout(null);
      }
    } catch (err) {
      logger.error("Error loading program dashboard:", err);
      setError(err.message || "Failed to load program data");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle program status changes (pause/resume/complete)
  const handleProgramUpdate = (updatedProgram) => {
    // Just update the program state without reloading everything
    setProgram(updatedProgram);
  };

  const handleCompleteRestDay = async (program) => {
    if (!programAgentRef.current || !program) {
      return;
    }

    try {
      setIsCompletingRestDay(true);

      // ProgramAgent.completeRestDay already reloads programs and today's workout internally
      await programAgentRef.current.completeRestDay(program.programId, {
        notes: "Rest day completed from Program Dashboard",
      });

      // Note: completeRestDay() calls loadPrograms() which updates activeProgram but not selectedProgram
      // ProgramDashboard needs selectedProgram, so we explicitly reload it here
      const updatedProgram =
        await programAgentRef.current.loadProgram(programId);
      if (updatedProgram && updatedProgram.program) {
        setProgram(updatedProgram.program);
      }

      // todaysWorkout is already updated via the agent callback (completeRestDay calls loadWorkoutTemplates internally)
    } catch (error) {
      logger.error("Error completing rest day:", error);
      // Error is already shown by ProgramAgent
    } finally {
      setIsCompletingRestDay(false);
    }
  };

  // Handle share modal (rendered at top level to avoid CSS stacking context issues)
  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleShareSuccess = () => {
    toast.success("Share link created successfully!");
  };

  const handleShareClose = () => {
    setShowShareModal(false);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <CenteredErrorState
        title="Error Loading Program"
        message={error}
        buttonText="Back to Programs"
        onButtonClick={() =>
          navigate(
            `/training-grounds/programs?userId=${userId}&coachId=${coachId}`,
          )
        }
        variant="error"
      />
    );
  }

  if (!program) {
    return (
      <CenteredErrorState
        title="Program Not Found"
        message="The training program you're looking for doesn't exist or has been removed."
        buttonText="Back to Programs"
        onButtonClick={() =>
          navigate(
            `/training-grounds/programs?userId=${userId}&coachId=${coachId}`,
          )
        }
        variant="error"
      />
    );
  }

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Compact Horizontal Header */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6"
          aria-label="Training Program Dashboard Header"
        >
          {/* Left section: Title + Coach Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <h1
                className="font-russo font-bold text-2xl md:text-3xl text-white uppercase tracking-wider cursor-help"
                data-tooltip-id="program-dashboard-info"
                data-tooltip-content={`${program.name} - Day ${program.currentDay} of ${program.totalDays || program.duration}`}
              >
                Program Dashboard
              </h1>
              <div
                className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded text-synthwave-neon-purple font-rajdhani text-xs font-bold uppercase tracking-wider cursor-help"
                data-tooltip-id="beta-badge"
                data-tooltip-content="Training programs are in beta. You may experience pre-release behavior. We appreciate your feedback!"
              >
                Beta
              </div>
            </div>

            {/* Compact Coach Card */}
            {coachData && (
              <CompactCoachCard
                coachData={coachData}
                isOnline={true}
                onClick={() =>
                  navigate(
                    `/training-grounds?userId=${userId}&coachId=${coachId}`,
                  )
                }
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
        <QuickStats
          stats={[
            {
              icon: CalendarIcon,
              value: program.currentDay || 0,
              tooltip: {
                title: `Day ${program.currentDay || 0}`,
                description: "Current day in your training program",
              },
              color: "pink",
              isLoading: false,
              ariaLabel: `Day ${program.currentDay || 0} of program`,
              id: "program-stat-current-day",
            },
            {
              icon: CalendarIcon,
              value: program.totalDays || program.duration || 0,
              tooltip: {
                title: `${program.totalDays || program.duration || 0} Days Total`,
                description: "Total duration of this training program",
              },
              color: "cyan",
              isLoading: false,
              ariaLabel: `${program.totalDays || program.duration || 0} total days`,
              id: "program-stat-total-days",
            },
            {
              icon: ProgramIcon,
              value: `${Math.round(((program.currentDay || 0) / (program.totalDays || program.duration || 1)) * 100)}%`,
              tooltip: {
                title: `${Math.round(((program.currentDay || 0) / (program.totalDays || program.duration || 1)) * 100)}% Complete`,
                description: "Progress through the training program",
              },
              color: "purple",
              isLoading: false,
              ariaLabel: `${Math.round(((program.currentDay || 0) / (program.totalDays || program.duration || 1)) * 100)}% complete`,
              id: "program-stat-progress",
            },
            {
              icon: CheckIcon,
              value: program.completedWorkouts || 0,
              tooltip: {
                title: `${program.completedWorkouts || 0} Completed`,
                description: "Workouts you've completed in this program",
              },
              color: "cyan",
              isLoading: false,
              ariaLabel: `${program.completedWorkouts || 0} completed workouts`,
              id: "program-stat-completed",
            },
            {
              icon: XIcon,
              value: program.skippedWorkouts || 0,
              tooltip: {
                title: `${program.skippedWorkouts || 0} Skipped`,
                description: "Workouts you've skipped in this program",
              },
              color: "pink",
              isLoading: false,
              ariaLabel: `${program.skippedWorkouts || 0} skipped workouts`,
              id: "program-stat-skipped",
            },
            {
              icon: CalendarIcon,
              value: program.completedRestDays || 0,
              tooltip: {
                title: `${program.completedRestDays || 0} Rest Days`,
                description: "Rest days you've completed in this program",
              },
              color: "purple",
              isLoading: false,
              ariaLabel: `${program.completedRestDays || 0} completed rest days`,
              id: "program-stat-rest-days",
            },
            {
              icon: WorkoutIcon,
              value: program.totalWorkouts || 0,
              tooltip: {
                title: `${program.totalWorkouts || 0} Total Workouts`,
                description: "Total workouts scheduled in this program",
              },
              color: "purple",
              isLoading: false,
              ariaLabel: `${program.totalWorkouts || 0} total workouts`,
              id: "program-stat-total",
            },
            {
              icon: LightningIcon,
              value: program.phases?.length || 0,
              tooltip: {
                title: `${program.phases?.length || 0} Phases`,
                description: "Training phases in this program",
              },
              color: "cyan",
              isLoading: false,
              ariaLabel: `${program.phases?.length || 0} phases`,
              id: "program-stat-phases",
            },
          ]}
        />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main content - 60% (3 of 5 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Today's Workout - Only show for active/paused programs */}
            {(program.status === "active" || program.status === "paused") && (
              <TodaysWorkoutCard
                todaysWorkout={todaysWorkout}
                program={program}
                isLoading={false}
                error={null}
                userId={userId}
                coachId={coachId}
                onCompleteRestDay={handleCompleteRestDay}
                isCompletingRestDay={isCompletingRestDay}
                showViewProgramButton={false} // Hide button since user is already on program dashboard
              />
            )}

            {/* Calendar */}
            <ProgramCalendar
              program={program}
              programDetails={programDetails}
              userId={userId}
              coachId={coachId}
              programId={programId}
            />

            {/* Phase Timeline */}
            <PhaseTimeline program={program} />
          </div>

          {/* Sidebar - 40% (2 of 5 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Program Overview */}
            <ProgramOverview
              program={program}
              programAgentRef={programAgentRef}
              onProgramUpdate={handleProgramUpdate}
              userId={userId}
              onShareClick={handleShareClick}
            />

            {/* Progress Overview */}
            <ProgressOverview program={program} />

            {/* Phase Breakdown */}
            <PhaseBreakdown program={program} />
          </div>
        </div>
        <AppFooter />
      </div>

      {/* Tooltips */}
      <Tooltip
        id="program-dashboard-info"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="beta-badge"
        {...tooltipPatterns.standard}
        place="bottom"
        className="max-w-xs"
      />
      <Tooltip
        id="beta-badge-todays-workout"
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

      {/* Share Program Modal - rendered at top level to avoid CSS stacking context issues */}
      {showShareModal && program && (
        <ShareProgramModal
          program={program}
          userId={userId}
          onClose={handleShareClose}
          onSuccess={handleShareSuccess}
        />
      )}
    </div>
  );
}

// Skeleton loading component
function DashboardSkeleton() {
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
          <div className="h-10 w-20 bg-synthwave-text-muted/20 rounded-none animate-pulse"></div>
        </header>

        {/* Quick Stats skeleton */}
        <QuickStats
          stats={[1, 2, 3, 4, 5, 6, 7].map((i) => ({
            icon: null,
            value: 0,
            tooltip: { title: "", description: "" },
            color: "cyan",
            isLoading: true,
            id: `skeleton-stat-${i}`,
          }))}
        />

        {/* Two-column layout skeleton - matching WorkoutViewerV2 structure */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main content - 60% */}
          <div className="lg:col-span-3 space-y-6">
            {/* Program Overview Section Skeleton */}
            <div className={`${containerPatterns.cardMedium}`}>
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 bg-synthwave-neon-cyan/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
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

            {/* Training Phases Section Skeleton */}
            <div className={`${containerPatterns.cardMedium}`}>
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-synthwave-neon-cyan/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
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

            {/* Progress Tracking Section Skeleton */}
            <div className={`${containerPatterns.cardMedium}`}>
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-synthwave-neon-cyan/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
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
          </div>

          {/* Sidebar - 40% */}
          <div className="lg:col-span-2 space-y-6">
            {/* Program Goals Section Skeleton */}
            <div className={`${containerPatterns.cardMedium}`}>
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-synthwave-neon-cyan/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-36"></div>
                </div>
                <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
              <div className="px-6 pb-6">
                <div className="h-16 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Coach Insights Section Skeleton */}
            <div className={`${containerPatterns.cardMedium}`}>
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-synthwave-neon-cyan/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-40"></div>
                </div>
                <div className="w-5 h-5 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
              </div>
              <div className="px-6 pb-6 space-y-2">
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-5/6"></div>
              </div>
            </div>

            {/* Upcoming Workouts Section Skeleton */}
            <div className={`${containerPatterns.cardMedium}`}>
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-synthwave-neon-cyan/30 rounded-full animate-pulse shrink-0 mt-0.5"></div>
                  <div className="h-6 bg-synthwave-text-muted/20 rounded animate-pulse w-48"></div>
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
  );
}
