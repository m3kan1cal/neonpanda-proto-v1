import React, { useState } from 'react';
import { containerPatterns, messagePatterns, typographyPatterns, badgePatterns, buttonPatterns } from '../../utils/ui/uiPatterns';
import { PauseIcon, CheckIcon, ArrowRightIcon } from '../themes/SynthwaveComponents';
import { useToast } from '../../contexts/ToastContext';
import { PROGRAM_STATUS } from '../../constants/conversationModes';

export default function ProgramOverview({ program, programAgentRef, onProgramUpdate }) {
  const [isPausing, setIsPausing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const toast = useToast();

  if (!program) return null;

  // Get status badge
  const getStatusBadge = () => {
    const statusConfig = {
      active: {
        text: 'Active',
        className: 'bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-rajdhani uppercase border border-green-500/40'
      },
      paused: {
        text: 'Paused',
        className: `${badgePatterns.purpleBorder} uppercase`
      },
      completed: {
        text: 'Completed',
        className: `${badgePatterns.cyanBorder} uppercase`
      },
      abandoned: {
        text: 'Abandoned',
        className: `${badgePatterns.mutedBorder} uppercase`
      },
    };

    const config = statusConfig[program.status] || statusConfig.abandoned;

    return (
      <span className={config.className}>
        {config.text}
      </span>
    );
  };

  // Handle pause program
  const handlePause = async () => {
    if (!programAgentRef.current) return;

    setIsPausing(true);
    try {
      const response = await programAgentRef.current.updateProgramStatus(program.programId, 'pause');
      toast.success('Training program paused successfully');
      if (onProgramUpdate && response?.program) {
        onProgramUpdate(response.program);
      }
    } catch (error) {
      console.error('Error pausing program:', error);
      toast.error('Failed to pause training program');
    } finally {
      setIsPausing(false);
    }
  };

  // Handle resume program
  const handleResume = async () => {
    if (!programAgentRef.current) return;

    setIsResuming(true);
    try {
      const response = await programAgentRef.current.updateProgramStatus(program.programId, 'resume');
      toast.success('Training program resumed successfully');
      if (onProgramUpdate && response?.program) {
        onProgramUpdate(response.program);
      }
    } catch (error) {
      console.error('Error resuming program:', error);
      toast.error('Failed to resume training program');
    } finally {
      setIsResuming(false);
    }
  };

  // Handle complete program
  const handleComplete = async () => {
    if (!programAgentRef.current) return;

    setIsCompleting(true);
    try {
      const response = await programAgentRef.current.updateProgramStatus(program.programId, 'complete');
      toast.success('Training program completed! Great work!');
      if (onProgramUpdate && response?.program) {
        onProgramUpdate(response.program);
      }
    } catch (error) {
      console.error('Error completing program:', error);
      toast.error('Failed to complete training program');
    } finally {
      setIsCompleting(false);
    }
  };

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
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
      <div className="flex items-start space-x-3 mb-4">
        <div className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotPink} flex-shrink-0 mt-2`}></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Program Overview
        </h3>
      </div>

      {/* Program Name with Status Badge */}
      <div className="mb-4 flex items-start gap-3">
        <div className="font-rajdhani text-lg text-white">
          {program.name}
        </div>
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
                  {program.coachNames.map((name) => name.replace(/_/g, ' ')).join(', ')}
                </span>
              </div>
            )}

            {/* Duration */}
            {program.totalDays && (
              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                <span className="text-synthwave-text-secondary">Duration:</span>
                <span className="text-synthwave-neon-cyan font-medium">
                  {program.totalDays} days ({Math.ceil(program.totalDays / 7)} weeks)
                </span>
              </div>
            )}

            {/* Frequency */}
            {program.trainingFrequency && (
              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                <span className="text-synthwave-text-secondary">Frequency:</span>
                <span className="text-synthwave-neon-cyan font-medium">
                  {program.trainingFrequency}x per week
                </span>
              </div>
            )}

            {/* Total Workouts */}
            {program.totalWorkouts && (
              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                <span className="text-synthwave-text-secondary">Total Workouts:</span>
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

        {/* Program Focus Areas - collected from all phases */}
        {(() => {
          // Collect all unique focus areas from all phases
          const allFocusAreas = program.phases?.reduce((acc, phase) => {
            if (phase.focusAreas && Array.isArray(phase.focusAreas)) {
              phase.focusAreas.forEach(area => {
                if (!acc.includes(area)) {
                  acc.push(area);
                }
              });
            }
            return acc;
          }, []) || [];

          if (allFocusAreas.length === 0) return null;

          return (
            <div>
              <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                Training Focus
              </div>
              <div className="flex flex-wrap gap-2">
                {allFocusAreas.map((area, i) => (
                  <span key={i} className={badgePatterns.workoutDetail}>
                    {area}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Dates */}
        {(program.createdAt || program.startedAt || expectedCompletion || program.completedAt) && (
          <div>
            <div className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
              Dates
            </div>
            <div className="flex flex-wrap gap-2">
              {program.createdAt && (
                <span className={badgePatterns.workoutDetail}>
                  Created: {formatDate(program.createdAt)}
                </span>
              )}
              {program.startedAt && (
                <span className={badgePatterns.workoutDetail}>
                  Started: {formatDate(program.startedAt)}
                </span>
              )}
              {expectedCompletion && program.status === 'active' && (
                <span className={badgePatterns.workoutDetail}>
                  Expected: {expectedCompletion}
                </span>
              )}
              {program.completedAt && (
                <span className={badgePatterns.workoutDetail}>
                  Completed: {formatDate(program.completedAt)}
                </span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Action Buttons */}
      {(program.status === PROGRAM_STATUS.ACTIVE || program.status === PROGRAM_STATUS.PAUSED) && (
        <div className="mt-6 space-y-2">
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
      )}
    </div>
  );
}

