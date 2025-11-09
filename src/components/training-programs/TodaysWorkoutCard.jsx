import React from 'react';
import { useNavigate } from 'react-router-dom';
import { containerPatterns } from '../../utils/ui/uiPatterns';
import { WorkoutIconSmall } from '../themes/SynthwaveComponents';
import { EmptyState, InlineError } from '../shared/ErrorStates';

/**
 * TodaysWorkoutCard - Displays today's workout from the active training program
 * Highest priority component for Training Grounds
 */
function TodaysWorkoutCard({
  todaysWorkout,
  program,
  isLoading,
  error,
  userId,
  coachId,
  onViewWorkout
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
          <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-synthwave-text-muted/20 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>
        <InlineError
          title="Error loading today's workout"
          message={error}
          variant="error"
          size="medium"
        />
      </div>
    );
  }

  // Show rest day card if no workout data
  if (!todaysWorkout || !program || !todaysWorkout.templates || todaysWorkout.templates.length === 0) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>

        {/* Program name */}
        {program && (
          <>
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-3">
              {program.name}
            </div>
          </>
        )}

        {/* Rest day message */}
        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="text-synthwave-neon-cyan opacity-50">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="font-russo text-white text-lg uppercase mb-2">
            Rest Day
          </div>
          <div className="font-rajdhani text-sm text-synthwave-text-secondary">
            No workout scheduled for today. Enjoy your recovery!
          </div>
        </div>

        {/* View program button */}
        {program && (
          <button
            onClick={() => navigate(`/training-grounds/programs/${program.programId}?userId=${userId}&coachId=${coachId}`)}
            className="w-full mt-4 bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-3 py-1.5 rounded-md font-rajdhani font-medium text-sm uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-md hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[32px] flex items-center justify-center"
          >
            View Training Program
          </button>
        )}
      </div>
    );
  }

  const { dayNumber, phaseName, templates } = todaysWorkout;
  // Sort templates by templateId to get the "primary" template consistently
  // (the first template sorted by ID is considered the main workout for the day)
  const sortedTemplates = [...templates].sort((a, b) => a.templateId.localeCompare(b.templateId));
  const primaryTemplate = sortedTemplates[0];

  if (!primaryTemplate) {
    // No primary template - show rest day
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>

        {/* Day info */}
        <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-3">
          Day {dayNumber} of {program.totalDays}
        </div>

        {/* Program name */}
        <div className="font-rajdhani text-sm text-synthwave-neon-cyan mb-1">
          {program.name}
        </div>

        {/* Phase name */}
        {phaseName && (
          <div className="font-rajdhani text-xs text-synthwave-text-secondary mb-4">
            {phaseName}
          </div>
        )}

        {/* Rest day message */}
        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="text-synthwave-neon-cyan opacity-50">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="font-russo text-white text-lg uppercase mb-2">
            Rest Day
          </div>
          <div className="font-rajdhani text-sm text-synthwave-text-secondary">
            No workout scheduled for today. Enjoy your recovery!
          </div>
        </div>

        {/* View program button */}
        <button
          onClick={() => navigate(`/training-grounds/programs/${program.programId}?userId=${userId}&coachId=${coachId}`)}
          className="w-full mt-4 bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-3 py-1.5 rounded-md font-rajdhani font-medium text-sm uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-md hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[32px] flex items-center justify-center"
        >
          View Training Program
        </button>
      </div>
    );
  }

  const handleViewWorkout = () => {
    if (onViewWorkout) {
      onViewWorkout(primaryTemplate);
    } else {
      // Navigate to today's workouts page
        navigate(`/training-grounds/training-programs/workouts?userId=${userId}&coachId=${coachId}&programId=${program.programId}`);
    }
  };

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-3 h-3 bg-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Today's Workout
        </h3>
      </div>

      {/* Program name - clickable */}
      <button
        onClick={handleViewWorkout}
        className="text-left mb-4 block w-full"
      >
        <div className="font-rajdhani text-lg text-white hover:text-synthwave-neon-cyan transition-colors mb-2 font-semibold">
          {program.name}
        </div>
        {phaseName && (
          <div className="font-rajdhani text-sm text-synthwave-text-secondary">
            {phaseName} <span className="text-synthwave-text-muted">(Day {dayNumber || program.currentDay || 1} of {program.totalDays})</span>
          </div>
        )}
      </button>

      {/* Workout details */}
      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-rajdhani font-semibold text-base text-white mb-1">
              {primaryTemplate.name}
            </h3>
            {primaryTemplate.estimatedDuration && (
              <div className="font-rajdhani text-xs text-synthwave-text-secondary">
                Estimated Duration: <span className="text-synthwave-neon-cyan">{primaryTemplate.estimatedDuration} minutes</span>
              </div>
            )}
          </div>
          <div className="text-synthwave-neon-cyan ml-2">
            <WorkoutIconSmall />
          </div>
        </div>

        {/* Description */}
        {primaryTemplate.description && (
          <div className="font-rajdhani text-sm text-synthwave-text-secondary mt-2">
            {primaryTemplate.description}
          </div>
        )}
      </div>

      {/* Multiple workouts indicator */}
      {templates.length > 1 && (
        <div className="flex items-center justify-center mb-4">
          <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani">
            +{templates.length - 1} more workout{templates.length > 2 ? 's' : ''} scheduled today
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleViewWorkout}
        className="w-full bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-4 py-2 rounded-lg font-rajdhani font-semibold text-base uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-md hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[40px] flex items-center justify-center"
      >
        {templates.length > 1 ? 'View Workouts' : 'View Workout'}
      </button>
    </div>
  );
}

export default TodaysWorkoutCard;

