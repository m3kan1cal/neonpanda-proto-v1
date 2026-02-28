import React from 'react';
import {
  containerPatterns,
  typographyPatterns,
  messagePatterns
} from '../../utils/ui/uiPatterns';

export default function ProgressOverview({ program }) {
  const totalDays = program.totalDays || program.duration || 1;
  const progressPercentage = Math.round((program.currentDay / totalDays) * 100);
  const adherenceRate = Math.round(program.adherenceRate || 0);

  // Calculate days remaining
  const daysRemaining = Math.max(0, totalDays - program.currentDay);

  // Calculate workouts remaining
  const workoutsRemaining = Math.max(0, (program.totalWorkouts || 0) - (program.completedWorkouts || 0) - (program.skippedWorkouts || 0));

  // Format last activity
  const formatLastActivity = () => {
    if (!program.lastActivityAt) return 'Never';

    const lastActivity = new Date(program.lastActivityAt);
    const now = new Date();
    const diffInHours = Math.floor((now - lastActivity) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return 'Yesterday';
      return `${diffInDays}d ago`;
    }
  };

  // Calculate current streak (consecutive days trained)
  const calculateStreak = () => {
    // This would ideally check calendar data for consecutive completed days
    // For now, use a simple estimate based on adherence
    return program.completedWorkouts > 0 ? Math.min(program.completedWorkouts, 7) : 0;
  };

  const currentStreak = calculateStreak();

  // Get current phase
  const getCurrentPhase = () => {
    if (!program.phases || program.phases.length === 0) {
      return null;
    }

    // Find phase that contains current day
    return program.phases.find(phase =>
      program.currentDay >= phase.startDay && program.currentDay <= phase.endDay
    ) || program.phases[0];
  };

  const currentPhase = getCurrentPhase();

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      <div className="flex items-start space-x-3 mb-4">
        <div className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotCyan} shrink-0 mt-2`}></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Progress Overview
        </h3>
      </div>

      {/* Progress info */}
      <div className="font-rajdhani text-sm text-synthwave-text-secondary mb-2">
        Day {program.currentDay} of {totalDays} • {progressPercentage}% Complete
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2 bg-synthwave-bg-primary/50 rounded-full overflow-hidden mb-6">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-synthwave-neon-cyan to-synthwave-neon-purple rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Stats - 2-Column Table Layout */}
      <div>
        <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
          By The Numbers
        </h4>
        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Current Phase - Full Width */}
        {currentPhase && (
          <div className="col-span-2 flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-secondary">Current Phase:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {currentPhase.name || 'Phase 1'}
            </span>
          </div>
        )}

        {/* Completed Workouts */}
        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
          <span className="text-synthwave-text-secondary">Completed Workouts:</span>
          <span className="text-synthwave-neon-cyan font-medium">
            {program.completedWorkouts || 0} / {program.totalWorkouts || 0}
          </span>
        </div>

        {/* Workouts Remaining */}
        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
          <span className="text-synthwave-text-secondary">Workouts Remaining:</span>
          <span className="text-synthwave-neon-cyan font-medium">
            {workoutsRemaining}
          </span>
        </div>

        {/* Skipped Workouts */}
        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
          <span className="text-synthwave-text-secondary">Skipped Workouts:</span>
          <span className="text-synthwave-neon-cyan font-medium">
            {program.skippedWorkouts || 0}
          </span>
        </div>

        {/* Days Remaining */}
        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
          <span className="text-synthwave-text-secondary">Days Remaining:</span>
          <span className="text-synthwave-neon-cyan font-medium">
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Adherence Rate */}
        {adherenceRate > 0 && (
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-secondary">Adherence Rate:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {adherenceRate}%
            </span>
          </div>
        )}

        {/* Last Activity */}
        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
          <span className="text-synthwave-text-secondary">Last Activity:</span>
          <span className="text-synthwave-neon-cyan font-medium">
            {formatLastActivity()}
          </span>
        </div>

        {/* Current Streak */}
        {currentStreak > 0 && (
          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
            <span className="text-synthwave-text-secondary">Current Streak:</span>
            <span className="text-synthwave-neon-cyan font-medium">
              {currentStreak} day{currentStreak !== 1 ? 's' : ''}
            </span>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

