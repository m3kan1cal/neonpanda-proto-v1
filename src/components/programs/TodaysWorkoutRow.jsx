import React from "react";
import { useNavigate } from "react-router-dom";
import {
  containerPatterns,
  badgePatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";

/**
 * TodaysWorkoutRow - Tier 1 hero component for TrainingGroundsV2
 *
 * Displays today's workouts across ALL active programs as "Neon Glass" cards
 * that wrap naturally left-to-right. Each active program gets a vivid gradient-
 * bordered card showing program label, hero workout name, progress, and a CTA.
 *
 * @param {Object} props
 * @param {Object} props.todaysWorkouts - Map of programId -> { program, todaysWorkout }
 * @param {Array} props.programs - All active/paused programs
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.userId
 * @param {string} props.coachId
 * @param {Function} props.onCompleteRestDay - Callback for completing a rest day
 * @param {boolean} props.isCompletingRestDay - Loading state for rest day completion
 */
function TodaysWorkoutRow({
  todaysWorkouts = {},
  programs = [],
  isLoading,
  userId,
  coachId,
  onCompleteRestDay,
  isCompletingRestDay = false,
}) {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Loading skeleton -- wrapping flex with gradient border placeholders
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2].map((i) => (
          <div key={i} className={containerPatterns.neonGlassSkeleton}>
            <div className={containerPatterns.neonGlassSkeletonInner}>
              <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-40"></div>
              <div className="h-6 bg-synthwave-text-muted/20 animate-pulse w-full"></div>
              <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-28"></div>
              <div className="h-[6px] bg-synthwave-text-muted/20 rounded-full animate-pulse w-full"></div>
              <div className="space-y-1.5 pt-1">
                {[1].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-5 h-5 min-w-[20px] rounded-md bg-synthwave-text-muted/20 animate-pulse shrink-0"></div>
                    <div className="h-3.5 flex-1 min-w-0 bg-synthwave-text-muted/20 animate-pulse"></div>
                    <div className="h-3 w-8 bg-synthwave-text-muted/20 animate-pulse shrink-0"></div>
                  </div>
                ))}
              </div>
              <div className="flex-1 min-h-[4px]"></div>
              <div className="h-12 bg-synthwave-text-muted/20 rounded-md animate-pulse w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state -- no active programs
  // ---------------------------------------------------------------------------
  const activePrograms = programs.filter((p) => p.status === "active");
  if (activePrograms.length === 0) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6 max-w-md w-fit`}>
        <div className="text-center pb-2">
          <div className="max-w-sm">
            <p className="font-rajdhani text-sm text-synthwave-text-muted mb-4 text-left">
              You don't have any active training programs yet. Design a
              structured program with your coach to see today's workouts here.
            </p>
            <div className="space-y-2 text-left">
              <div className="flex items-start gap-2">
                <span className={badgePatterns.numberedCircle}>
                  <span className={badgePatterns.numberedCircleText}>1</span>
                </span>
                <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                  Use Command Palette (⌘+K) and select "/design-program"
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className={badgePatterns.numberedCircle}>
                  <span className={badgePatterns.numberedCircleText}>2</span>
                </span>
                <p className="font-rajdhani text-sm text-synthwave-text-muted flex-1 pt-0.5">
                  OR go to "Programs" and click "Design New Program"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Build workout entries for each active program
  // ---------------------------------------------------------------------------
  const workoutEntries = activePrograms.map((program) => {
    const workoutData = todaysWorkouts[program.programId];
    const todaysWorkout = workoutData?.todaysWorkout;
    const hasWorkout =
      todaysWorkout &&
      todaysWorkout.templates &&
      todaysWorkout.templates.length > 0;

    return {
      program,
      todaysWorkout,
      hasWorkout,
    };
  });

  // ---------------------------------------------------------------------------
  // All-rest-day state
  // ---------------------------------------------------------------------------
  const allRestDays = workoutEntries.every((entry) => !entry.hasWorkout);

  if (allRestDays) {
    return (
      <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 p-6 text-center max-w-xl mx-auto">
        <div className="flex justify-center mb-3">
          <div className="text-synthwave-neon-cyan opacity-50">
            <svg
              className="w-10 h-10"
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
        <div className="font-rajdhani text-white text-lg uppercase mb-1">
          Rest Day
        </div>
        <div className="font-rajdhani text-sm text-synthwave-text-secondary mb-4">
          No workouts scheduled today across{" "}
          {activePrograms.length === 1
            ? "your program"
            : `your ${activePrograms.length} programs`}
          . Enjoy your recovery.
        </div>
        {onCompleteRestDay && (
          <div className="flex flex-wrap justify-center gap-2">
            {workoutEntries.map((entry) => (
              <button
                key={entry.program.programId}
                onClick={() => onCompleteRestDay(entry.program)}
                disabled={isCompletingRestDay}
                className="px-3 py-1.5 bg-transparent border border-synthwave-neon-cyan/30 text-synthwave-neon-cyan font-rajdhani text-xs uppercase tracking-wide transition-all duration-200 hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompletingRestDay
                  ? "Completing..."
                  : `Complete: ${entry.program.name}`}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Neon Glass cards -- wrapping flex layout
  // ---------------------------------------------------------------------------
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {workoutEntries.map((entry) => {
        const {
          program,
          todaysWorkout: workout,
          hasWorkout: hasTemplates,
        } = entry;

        // ----- Rest day card (muted border variant) -----
        if (!hasTemplates) {
          return (
            <div
              key={program.programId}
              className={containerPatterns.neonGlassMuted}
            >
              <div className={containerPatterns.neonGlassMutedInner}>
                {/* Program label */}
                <div className="flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 text-synthwave-text-muted/40 shrink-0"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M5.50093 6.50098H3.50047V9.50166H5.50093V6.50098Z" />
                    <path d="M3.50045 9.50195H1.5V15.5033H3.50045V9.50195Z" />
                    <path d="M5.50093 15.5029H3.50047V18.5036H5.50093V15.5029Z" />
                    <path d="M17.5036 18.5039V23.505H5.5009V18.5039H8.50158V20.5044H14.5029V18.5039H17.5036Z" />
                    <path d="M19.5041 15.5029H17.5036V18.5036H19.5041V15.5029Z" />
                    <path d="M23.505 11.5024V13.5029H21.5045V15.5033H19.5041V9.50195H21.5045V11.5024H23.505Z" />
                    <path d="M19.5041 6.50098H17.5036V9.50166H19.5041V6.50098Z" />
                    <path d="M17.5036 1.5V6.50114H14.5029V4.50068H12.5025V13.5027H10.502V4.50068H8.50158V6.50114H5.5009V1.5H17.5036Z" />
                  </svg>
                  <span className={typographyPatterns.programLabelMuted}>
                    {program.name}
                  </span>
                </div>

                {/* Rest day message */}
                <div className="font-russo font-bold text-white text-xl leading-tight uppercase">
                  Rest Day
                </div>

                {/* Meta row */}
                <div className="flex gap-3 font-rajdhani text-xs text-synthwave-text-secondary">
                  <span>
                    Day {program.currentDay || 1} of {program.totalDays}
                  </span>
                  <span>·</span>
                  <span>No workouts scheduled</span>
                </div>

                <div className="flex-1 min-h-[8px]"></div>

                {/* Complete Rest Day button */}
                {onCompleteRestDay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteRestDay(program);
                    }}
                    disabled={isCompletingRestDay}
                    className="w-full py-3.5 border border-synthwave-neon-cyan/30 rounded-md bg-transparent text-synthwave-neon-cyan font-rajdhani font-bold text-sm tracking-[1.5px] uppercase cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCompletingRestDay
                      ? "Completing..."
                      : "Complete Rest Day"}
                  </button>
                )}
              </div>
            </div>
          );
        }

        // ----- Active workout card (Neon Glass) -----
        const { templates, dayNumber, phaseName } = workout;
        const progressPercentage =
          program.totalDays > 0
            ? Math.round(((program.currentDay || 1) / program.totalDays) * 100)
            : 0;
        const workoutUrl = `/training-grounds/programs/workouts?userId=${userId}&coachId=${coachId}&programId=${program.programId}`;

        // Compute total estimated duration across all templates
        const totalDuration = templates.reduce((sum, t) => {
          const d = parseInt(t.estimatedDuration, 10);
          return sum + (isNaN(d) ? 0 : d);
        }, 0);

        return (
          <div
            key={program.programId}
            className={containerPatterns.neonGlassWrapper}
            onClick={() => navigate(workoutUrl)}
          >
            <div className={containerPatterns.neonGlassInner}>
              {/* Program label */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 text-synthwave-neon-cyan shrink-0 drop-shadow-[0_0_6px_#00ffff]"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M5.50093 6.50098H3.50047V9.50166H5.50093V6.50098Z" />
                  <path d="M3.50045 9.50195H1.5V15.5033H3.50045V9.50195Z" />
                  <path d="M5.50093 15.5029H3.50047V18.5036H5.50093V15.5029Z" />
                  <path d="M17.5036 18.5039V23.505H5.5009V18.5039H8.50158V20.5044H14.5029V18.5039H17.5036Z" />
                  <path d="M19.5041 15.5029H17.5036V18.5036H19.5041V15.5029Z" />
                  <path d="M23.505 11.5024V13.5029H21.5045V15.5033H19.5041V9.50195H21.5045V11.5024H23.505Z" />
                  <path d="M19.5041 6.50098H17.5036V9.50166H19.5041V6.50098Z" />
                  <path d="M17.5036 1.5V6.50114H14.5029V4.50068H12.5025V13.5027H10.502V4.50068H8.50158V6.50114H5.5009V1.5H17.5036Z" />
                </svg>
                <span className={typographyPatterns.programLabel}>
                  {program.name}
                </span>
              </div>

              {/* Hero workout name */}
              <div className="font-russo font-bold text-white text-lg leading-tight uppercase">
                {templates[0].name}
              </div>

              {/* Meta row */}
              <div className="flex gap-3 font-rajdhani text-xs text-white/50 mb-1.5">
                <span>
                  Day {dayNumber || program.currentDay || 1} of{" "}
                  {program.totalDays}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="h-[6px] bg-synthwave-bg-primary/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-synthwave-neon-cyan to-synthwave-neon-purple transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* All workout templates */}
              <div className="space-y-1.5 pt-1">
                {templates.map((template, index) => (
                  <div
                    key={template.templateId}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`${badgePatterns.countSmall} ${badgePatterns.countCyan}`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-rajdhani text-sm text-white/70 truncate flex-1 min-w-0">
                      {template.name}
                    </span>
                    {template.estimatedDuration && (
                      <span className="font-rajdhani text-xs text-white/30 shrink-0">
                        ~{template.estimatedDuration}min
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Spacer */}
              <div className="flex-1 min-h-[4px]"></div>

              {/* CTA button -- secondary cyan (matches Skip Workout style) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(workoutUrl);
                }}
                className={`${buttonPatterns.secondaryMedium} w-full space-x-2`}
              >
                <span>
                  {templates.length > 1 ? "Start Workouts" : "Start Workout"}
                </span>
                <span>→</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TodaysWorkoutRow;
