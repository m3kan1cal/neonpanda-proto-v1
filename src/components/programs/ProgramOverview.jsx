import React, { useState } from "react";
import {
  containerPatterns,
  messagePatterns,
  typographyPatterns,
  badgePatterns,
  buttonPatterns,
} from "../../utils/ui/uiPatterns";
import {
  PauseIcon,
  CheckIcon,
  ArrowRightIcon,
} from "../themes/SynthwaveComponents";
import { useToast } from "../../contexts/ToastContext";
import { PROGRAM_STATUS } from "../../constants/conversationModes";

export default function ProgramOverview({
  program,
  programAgentRef,
  onProgramUpdate,
  userId,
  onShareClick, // Callback to trigger share modal in parent (ProgramDashboard)
}) {
  const [isPausing, setIsPausing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isTrainingFocusExpanded, setIsTrainingFocusExpanded] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const toast = useToast();

  if (!program) return null;

  // Get status badge
  const getStatusBadge = () => {
    const statusConfig = {
      active: {
        text: "Active",
        className:
          "bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-rajdhani uppercase border border-green-500/40",
      },
      paused: {
        text: "Paused",
        className: `${badgePatterns.purpleBorder} uppercase`,
      },
      completed: {
        text: "Completed",
        className: `${badgePatterns.cyanBorder} uppercase`,
      },
      abandoned: {
        text: "Abandoned",
        className: `${badgePatterns.mutedBorder} uppercase`,
      },
    };

    const config = statusConfig[program.status] || statusConfig.abandoned;

    return <span className={config.className}>{config.text}</span>;
  };

  // Handle pause program
  const handlePause = async () => {
    if (!programAgentRef.current) return;

    setIsPausing(true);
    try {
      const response = await programAgentRef.current.updateProgramStatus(
        program.programId,
        "pause",
      );
      toast.success("Training program paused successfully");
      if (onProgramUpdate && response?.program) {
        onProgramUpdate(response.program);
      }
    } catch (error) {
      console.error("Error pausing program:", error);
      toast.error("Failed to pause training program");
    } finally {
      setIsPausing(false);
    }
  };

  // Handle resume program
  const handleResume = async () => {
    if (!programAgentRef.current) return;

    setIsResuming(true);
    try {
      const response = await programAgentRef.current.updateProgramStatus(
        program.programId,
        "resume",
      );
      toast.success("Training program resumed successfully");
      if (onProgramUpdate && response?.program) {
        onProgramUpdate(response.program);
      }
    } catch (error) {
      console.error("Error resuming program:", error);
      toast.error("Failed to resume training program");
    } finally {
      setIsResuming(false);
    }
  };

  // Handle complete program
  const handleComplete = async () => {
    if (!programAgentRef.current) return;

    setIsCompleting(true);
    try {
      const response = await programAgentRef.current.updateProgramStatus(
        program.programId,
        "complete",
      );
      toast.success("Training program completed! Great work!");
      if (onProgramUpdate && response?.program) {
        onProgramUpdate(response.program);
      }
    } catch (error) {
      console.error("Error completing program:", error);
      toast.error("Failed to complete training program");
    } finally {
      setIsCompleting(false);
    }
  };

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Unknown";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "Unknown";
    }
  };

  // Calculate expected completion date
  const calculateExpectedCompletion = () => {
    if (!program.startedAt || !program.totalDays) return null;

    try {
      const startDate = new Date(program.startedAt);
      const daysRemaining = program.totalDays - (program.currentDay || 1);
      const expectedDate = new Date(startDate);
      expectedDate.setDate(startDate.getDate() + program.totalDays);

      return formatDate(expectedDate.toISOString());
    } catch (error) {
      return null;
    }
  };

  const expectedCompletion = calculateExpectedCompletion();

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Section Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotPink} flex-shrink-0 mt-2`}
        ></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Program Overview
        </h3>
      </div>

      {/* Program Name with Status Badge */}
      <div className="mb-4 flex items-start gap-3">
        <div className="font-rajdhani text-lg text-white">{program.name}</div>
        {getStatusBadge()}
      </div>

      {/* Key Details */}
      <div className="space-y-4">
        {/* Program Intel */}
        <div className="mb-4">
          <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
            Program Intel
          </h4>
          <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* Coach - Full Width */}
              {program.coachNames && program.coachNames.length > 0 && (
                <div className="col-span-2 flex items-center gap-1.5 font-rajdhani text-sm">
                  <span className="text-synthwave-text-secondary">Coach:</span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {program.coachNames
                      .map((name) => name.replace(/_/g, " "))
                      .join(", ")}
                  </span>
                </div>
              )}

              {/* Duration */}
              {program.totalDays && (
                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                  <span className="text-synthwave-text-secondary">
                    Duration:
                  </span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {program.totalDays} days ({Math.ceil(program.totalDays / 7)}{" "}
                    weeks)
                  </span>
                </div>
              )}

              {/* Frequency */}
              {program.trainingFrequency && (
                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                  <span className="text-synthwave-text-secondary">
                    Frequency:
                  </span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {program.trainingFrequency}x per week
                  </span>
                </div>
              )}

              {/* Total Workouts */}
              {program.totalWorkouts && (
                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                  <span className="text-synthwave-text-secondary">
                    Total Workouts:
                  </span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {program.totalWorkouts}
                  </span>
                </div>
              )}

              {/* Phases */}
              {program.phases && program.phases.length > 0 && (
                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                  <span className="text-synthwave-text-secondary">Phases:</span>
                  <span className="text-synthwave-neon-cyan font-medium">
                    {program.phases.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Program Description */}
        {program.description && (
          <div className="mb-4">
            <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
              The Game Plan
            </h4>
            <div className={containerPatterns.coachNotesSection}>
              <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                {program.description}
              </div>
            </div>
          </div>
        )}

        {/* Program Goals */}
        {program.goals && (
          <div className="mb-4">
            <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
              Your Targets
            </h4>
            <div className={containerPatterns.coachNotesSection}>
              <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                {program.goals}
              </div>
            </div>
          </div>
        )}

        {/* Program Focus Areas - collected from all phases - Collapsible */}
        {(() => {
          // Collect all unique focus areas from all phases
          const allFocusAreas =
            program.phases?.reduce((acc, phase) => {
              if (phase.focusAreas && Array.isArray(phase.focusAreas)) {
                phase.focusAreas.forEach((area) => {
                  if (!acc.includes(area)) {
                    acc.push(area);
                  }
                });
              }
              return acc;
            }, []) || [];

          if (allFocusAreas.length === 0) return null;

          return (
            <div className="mb-4">
              <button
                onClick={() =>
                  setIsTrainingFocusExpanded(!isTrainingFocusExpanded)
                }
                className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
              >
                <span>Training Focus</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isTrainingFocusExpanded ? "rotate-180" : ""
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
              {isTrainingFocusExpanded && (
                <div
                  className={`${containerPatterns.coachNotesSection} animate-fadeIn`}
                >
                  <ul className="space-y-2">
                    {allFocusAreas.map((area, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 font-rajdhani text-sm text-synthwave-text-secondary"
                      >
                        <span className="text-synthwave-neon-cyan mt-0.5">
                          •
                        </span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}

        {/* Timeline - Collapsible */}
        <div className="mb-4">
          <button
            onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
            className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
          >
            <span>Timeline</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isTimelineExpanded ? "rotate-180" : ""
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
          {isTimelineExpanded && (
            <div
              className={`${containerPatterns.coachNotesSection} animate-fadeIn`}
            >
              <div className="space-y-1">
                {/* First row: Created and Started */}
                <div className="flex gap-x-4">
                  <div className="w-1/2 font-rajdhani text-sm text-synthwave-text-secondary">
                    Created:{" "}
                    {program.createdAt ? (
                      <span className="text-synthwave-neon-cyan">
                        {formatDate(program.createdAt)}
                      </span>
                    ) : (
                      <span className="text-synthwave-text-muted">Unknown</span>
                    )}
                  </div>
                  <div className="w-1/2 font-rajdhani text-sm text-synthwave-text-secondary">
                    Started:{" "}
                    {program.startedAt ? (
                      <span className="text-synthwave-neon-cyan">
                        {formatDate(program.startedAt)}
                      </span>
                    ) : (
                      <span className="text-synthwave-text-muted">
                        Not Started
                      </span>
                    )}
                  </div>
                </div>
                {/* Second row: Completed */}
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Completed:{" "}
                  {program.completedAt ? (
                    <span className="text-synthwave-neon-cyan">
                      {formatDate(program.completedAt)}
                    </span>
                  ) : (
                    <span className="text-synthwave-text-muted">
                      {program.status === "active" ||
                      program.status === "paused"
                        ? "In Progress"
                        : "Not Started"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Share and status actions */}
      <div className="mt-6 space-y-2">
        {/* Share Button - Available for active and completed programs */}
        {onShareClick &&
          (program.status === PROGRAM_STATUS.ACTIVE ||
            program.status === PROGRAM_STATUS.COMPLETED) && (
            <button
              onClick={onShareClick}
              className={`${buttonPatterns.secondaryMedium} w-full space-x-2`}
            >
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
              <span>Share This Program</span>
            </button>
          )}

        {/* Status Action Buttons - Only for active/paused */}
        {program.status === PROGRAM_STATUS.ACTIVE && (
          <div className="flex space-x-2">
            <button
              onClick={handlePause}
              disabled={isPausing || isCompleting}
              className={`flex-1 ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isPausing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PauseIcon />
              )}
              <span>Pause</span>
            </button>
            <button
              onClick={handleComplete}
              disabled={isPausing || isCompleting}
              className={`flex-1 ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isCompleting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckIcon />
              )}
              <span>Complete</span>
            </button>
          </div>
        )}

        {program.status === PROGRAM_STATUS.PAUSED && (
          <button
            onClick={handleResume}
            disabled={isResuming}
            className={`w-full ${buttonPatterns.primaryMedium} space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isResuming ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ArrowRightIcon />
            )}
            <span>Resume Program</span>
          </button>
        )}
      </div>
    </div>
  );
}
