import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  containerPatterns,
  buttonPatterns,
  badgePatterns,
  typographyPatterns,
  messagePatterns
} from '../../utils/ui/uiPatterns';
import { ClockIcon } from '../themes/SynthwaveComponents';

export default function TodaysWorkoutSummary({ workout, program, userId, coachId, programId }) {
  const navigate = useNavigate();

  // Extract templates from workout data (handles both array and object with templates property)
  let workoutTemplates = [];

  if (!workout) {
    // No data at all
    workoutTemplates = [];
  } else if (Array.isArray(workout)) {
    // Already an array
    workoutTemplates = workout;
  } else if (workout.templates && Array.isArray(workout.templates)) {
    // Object with templates property (like from loadWorkoutTemplates)
    workoutTemplates = workout.templates;
  } else if (typeof workout === 'object') {
    // Single workout object
    workoutTemplates = [workout];
  }

  // Get status badge
  const getStatusBadge = (template) => {
    if (template.status === 'completed') {
      return (
        <span className={badgePatterns.logged}>
          ✓ Logged
        </span>
      );
    }
    if (template.status === 'skipped') {
      return (
        <span className={badgePatterns.skipped}>
          ✕ Skipped
        </span>
      );
    }
    return null;
  };

  // Check if entire day is complete
  const isDayComplete = workoutTemplates.every(
    t => t.status === 'completed' || t.status === 'skipped'
  );

  // Rest day or no workout scheduled
  if (workoutTemplates.length === 0) {
    return (
      <div className={`${containerPatterns.cardMedium} p-6`}>
        <div className="flex items-start space-x-3 mb-4">
          <div className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotPink} shrink-0 mt-2`}></div>
          <h3 className="font-russo font-bold text-white text-lg uppercase">
            Today's Workout
          </h3>
        </div>
        <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
          Your scheduled workout for today. Log your performance to track progress.
        </p>

        <div className="text-center py-8">
          <p className="text-synthwave-text-muted">
            Rest day - no workouts scheduled
          </p>
          <p className="text-sm text-synthwave-text-secondary mt-2">
            Recovery is just as important as training
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotPink} shrink-0 mt-2`}></div>
          <div>
            <h3 className="font-russo font-bold text-white text-lg uppercase">
              Today's Workout
            </h3>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mt-1">
              Your scheduled workout for today. Log your performance to track progress.
            </p>
          </div>
        </div>
        {isDayComplete && (
          <span className={badgePatterns.dayComplete}>
            🎉 Day Complete
          </span>
        )}
      </div>

      {/* Primary workout summary */}
      <div className="space-y-4">
        {workoutTemplates.map((template, index) => (
          <div
            key={template.templateId || index}
            className={`
              ${index > 0 ? 'mt-4 pt-4 border-t border-synthwave-neon-cyan/20' : ''}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-medium text-synthwave-text-primary">
                    {template.name || `Workout ${index + 1}`}
                  </h3>
                  {getStatusBadge(template)}
                </div>

                {template.description && (
                  <p className="text-sm text-synthwave-text-secondary line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-synthwave-text-secondary mb-3">
              {template.estimatedDuration && (
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{template.estimatedDuration} min</span>
                </div>
              )}

              {template.workoutType && (
                <span className="capitalize">
                  {template.workoutType.replace(/_/g, ' ')}
                </span>
              )}

              {template.difficulty && (
                <span className={badgePatterns.difficulty}>
                  {template.difficulty}
                </span>
              )}
            </div>

            {/* Equipment tags */}
            {template.equipment && template.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {template.equipment.slice(0, 5).map((item, idx) => (
                  <span key={idx} className={badgePatterns.workoutDetail}>
                    {item}
                  </span>
                ))}
                {template.equipment.length > 5 && (
                  <span className={badgePatterns.workoutDetail}>
                    +{template.equipment.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-synthwave-neon-cyan/20">
      <button
        onClick={() => navigate(`/training-grounds/programs/workouts?userId=${userId}&coachId=${coachId}&programId=${programId}`)}
        className={buttonPatterns.primary}
      >
        View Full Workout{workoutTemplates.length > 1 ? 's' : ''}
      </button>

          {!isDayComplete && workoutTemplates.some(t => t.status === 'pending') && (
            <button
              onClick={() => navigate(`/training-grounds/programs/workouts?userId=${userId}&coachId=${coachId}&programId=${programId}`)}
              className={buttonPatterns.secondary}
            >
              Log Workout
            </button>
          )}

          {workoutTemplates.length > 1 && (
            <p className="text-sm text-synthwave-text-muted flex items-center">
              {workoutTemplates.length} workouts scheduled today
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

