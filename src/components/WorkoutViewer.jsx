import React, { useState } from 'react';
import { themeClasses } from '../utils/synthwaveThemeClasses';

// Icons
const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const WorkoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const MetricsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const NotesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const JsonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const AIIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
  </svg>
);

// Collapsible section component
const CollapsibleSection = ({ title, icon, children, defaultOpen = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-synthwave-neon-pink/30 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-synthwave-bg-primary/30 hover:bg-synthwave-bg-primary/50 transition-colors duration-200 flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="text-synthwave-neon-pink">
            {icon}
          </div>
          <h3 className="font-russo font-bold text-white text-sm uppercase">
            {title}
          </h3>
        </div>
        <div className={`text-synthwave-neon-pink transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-synthwave-bg-card/20">
          {children}
        </div>
      )}
    </div>
  );
};

// Value display component with data attributes for JSON reconstruction
const ValueDisplay = ({ label, value, dataPath, className = "" }) => {
  if (value === null || value === undefined) return null;

  return (
    <div className={`flex justify-between items-center py-1 ${className}`} data-json-path={dataPath}>
      <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
        {label}:
      </span>
      <span className="text-synthwave-text-primary font-rajdhani text-base" data-json-value={JSON.stringify(value)}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
      </span>
    </div>
  );
};

// Exercise display component
const ExerciseDisplay = ({ exercise, roundNumber, exerciseIndex }) => {
  const dataPath = `workoutData.discipline_specific.crossfit.rounds[${roundNumber - 1}].exercises[${exerciseIndex}]`;

  return (
    <div className="bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-rajdhani font-bold text-synthwave-neon-cyan text-lg capitalize">
          {exercise.exercise_name}
          {exercise.variation && ` (${exercise.variation})`}
        </h4>
        <span className="text-synthwave-text-secondary text-sm font-rajdhani uppercase">
          {exercise.movement_type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ValueDisplay
          label="Prescribed"
          value={exercise.reps?.prescribed}
          dataPath={`${dataPath}.reps.prescribed`}
        />
        <ValueDisplay
          label="Completed"
          value={exercise.reps?.completed}
          dataPath={`${dataPath}.reps.completed`}
        />

        {exercise.weight?.value && (
          <>
            <ValueDisplay
              label="Weight"
              value={`${exercise.weight.value} ${exercise.weight.unit}`}
              dataPath={`${dataPath}.weight.value`}
            />
            {exercise.weight.percentage_1rm && (
              <ValueDisplay
                label="% 1RM"
                value={`${exercise.weight.percentage_1rm}%`}
                dataPath={`${dataPath}.weight.percentage_1rm`}
              />
            )}
          </>
        )}

        {exercise.distance && (
          <ValueDisplay
            label="Distance"
            value={`${exercise.distance}m`}
            dataPath={`${dataPath}.distance`}
          />
        )}

        {exercise.time && (
          <ValueDisplay
            label="Time"
            value={`${exercise.time}s`}
            dataPath={`${dataPath}.time`}
          />
        )}
      </div>

      {exercise.form_notes && (
        <div className="mt-2 p-2 bg-synthwave-bg-primary/30 rounded border border-synthwave-neon-pink/20">
          <span className="text-synthwave-neon-pink font-rajdhani text-sm font-medium">Notes: </span>
          <span className="text-synthwave-text-secondary font-rajdhani text-sm" data-json-path={`${dataPath}.form_notes`} data-json-value={JSON.stringify(exercise.form_notes)}>
            {exercise.form_notes}
          </span>
        </div>
      )}
    </div>
  );
};

// Round display component
const RoundDisplay = ({ round, roundIndex }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-synthwave-neon-pink/20 border border-synthwave-neon-pink rounded-full flex items-center justify-center">
          <span className="text-synthwave-neon-pink font-rajdhani font-bold text-sm">
            {round.round_number}
          </span>
        </div>
        <h3 className="font-rajdhani font-bold text-white text-lg">
          Round {round.round_number}
        </h3>
      </div>

      <div className="space-y-2 ml-4">
        {round.exercises.map((exercise, exerciseIndex) => (
          <ExerciseDisplay
            key={exerciseIndex}
            exercise={exercise}
            roundNumber={round.round_number}
            exerciseIndex={exerciseIndex}
          />
        ))}
      </div>
    </div>
  );
};

// Performance metrics display
const PerformanceMetrics = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <ValueDisplay
        label="Intensity"
        value={metrics.intensity ? `${metrics.intensity}/10` : null}
        dataPath="workoutData.performance_metrics.intensity"
      />
      <ValueDisplay
        label="RPE"
        value={metrics.perceived_exertion ? `${metrics.perceived_exertion}/10` : null}
        dataPath="workoutData.performance_metrics.perceived_exertion"
      />
      <ValueDisplay
        label="Calories"
        value={metrics.calories_burned}
        dataPath="workoutData.performance_metrics.calories_burned"
      />
      <ValueDisplay
        label="Pre-Mood"
        value={metrics.mood_pre ? `${metrics.mood_pre}/10` : null}
        dataPath="workoutData.performance_metrics.mood_pre"
      />
      <ValueDisplay
        label="Post-Mood"
        value={metrics.mood_post ? `${metrics.mood_post}/10` : null}
        dataPath="workoutData.performance_metrics.mood_post"
      />
      <ValueDisplay
        label="Pre-Energy"
        value={metrics.energy_level_pre ? `${metrics.energy_level_pre}/10` : null}
        dataPath="workoutData.performance_metrics.energy_level_pre"
      />
      <ValueDisplay
        label="Post-Energy"
        value={metrics.energy_level_post ? `${metrics.energy_level_post}/10` : null}
        dataPath="workoutData.performance_metrics.energy_level_post"
      />
    </div>
  );
};

// Workout summary display
const WorkoutSummary = ({ workoutData }) => {
  const crossfitData = workoutData.discipline_specific?.crossfit;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <ValueDisplay
        label="Discipline"
        value={workoutData.discipline}
        dataPath="workoutData.discipline"
      />
      <ValueDisplay
        label="Type"
        value={workoutData.workout_type}
        dataPath="workoutData.workout_type"
      />
      <ValueDisplay
        label="Duration"
        value={workoutData.duration ? `${workoutData.duration} min` : null}
        dataPath="workoutData.duration"
      />
      <ValueDisplay
        label="Location"
        value={workoutData.location}
        dataPath="workoutData.location"
      />
      <ValueDisplay
        label="Methodology"
        value={workoutData.methodology}
        dataPath="workoutData.methodology"
      />

      {crossfitData && (
        <>
          <ValueDisplay
            label="Format"
            value={crossfitData.workout_format}
            dataPath="workoutData.discipline_specific.crossfit.workout_format"
          />
          <ValueDisplay
            label="RX Status"
            value={crossfitData.rx_status}
            dataPath="workoutData.discipline_specific.crossfit.rx_status"
          />
          <ValueDisplay
            label="Rounds"
            value={crossfitData.performance_data?.rounds_completed}
            dataPath="workoutData.discipline_specific.crossfit.performance_data.rounds_completed"
          />
          <ValueDisplay
            label="Total Reps"
            value={crossfitData.performance_data?.total_reps}
            dataPath="workoutData.discipline_specific.crossfit.performance_data.total_reps"
          />
          <ValueDisplay
            label="Total Time"
            value={crossfitData.performance_data?.total_time ? `${Math.floor(crossfitData.performance_data.total_time / 60)}:${String(crossfitData.performance_data.total_time % 60).padStart(2, '0')}` : null}
            dataPath="workoutData.discipline_specific.crossfit.performance_data.total_time"
          />
          <ValueDisplay
            label="Time Cap"
            value={crossfitData.time_cap ? `${Math.floor(crossfitData.time_cap / 60)}:${String(crossfitData.time_cap % 60).padStart(2, '0')}` : null}
            dataPath="workoutData.discipline_specific.crossfit.time_cap"
          />
          {crossfitData.performance_data?.score && (
            <ValueDisplay
              label="Score"
              value={(() => {
                const score = crossfitData.performance_data.score;
                if (score.type === 'time' && typeof score.value === 'number') {
                  return `${Math.floor(score.value / 60)}:${String(score.value % 60).padStart(2, '0')}`;
                }
                return score.unit ? `${score.value} ${score.unit}` : score.value;
              })()}
              dataPath="workoutData.discipline_specific.crossfit.performance_data.score"
            />
          )}
        </>
      )}
    </div>
  );
};

// Subjective feedback display
const SubjectiveFeedback = ({ feedback }) => {
  if (!feedback) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ValueDisplay
          label="Enjoyment"
          value={feedback.enjoyment ? `${feedback.enjoyment}/10` : null}
          dataPath="workoutData.subjective_feedback.enjoyment"
        />
        <ValueDisplay
          label="Difficulty"
          value={feedback.difficulty ? `${feedback.difficulty}/10` : null}
          dataPath="workoutData.subjective_feedback.difficulty"
        />
        <ValueDisplay
          label="Form Quality"
          value={feedback.form_quality ? `${feedback.form_quality}/10` : null}
          dataPath="workoutData.subjective_feedback.form_quality"
        />
        <ValueDisplay
          label="Motivation"
          value={feedback.motivation ? `${feedback.motivation}/10` : null}
          dataPath="workoutData.subjective_feedback.motivation"
        />
        <ValueDisplay
          label="Confidence"
          value={feedback.confidence ? `${feedback.confidence}/10` : null}
          dataPath="workoutData.subjective_feedback.confidence"
        />
        <ValueDisplay
          label="Mental State"
          value={feedback.mental_state}
          dataPath="workoutData.subjective_feedback.mental_state"
        />
      </div>

      {feedback.notes && (
        <div className="p-3 bg-synthwave-bg-primary/30 rounded border border-synthwave-neon-pink/20">
          <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Notes: </span>
          <span className="text-synthwave-text-secondary font-rajdhani text-base" data-json-path="workoutData.subjective_feedback.notes" data-json-value={JSON.stringify(feedback.notes)}>
            {feedback.notes}
          </span>
        </div>
      )}

      {(feedback.soreness_pre || feedback.soreness_post) && (
        <div className="grid grid-cols-2 gap-4">
          {feedback.soreness_pre && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">Pre-Workout Soreness</h4>
              <div className="space-y-1">
                <ValueDisplay label="Overall" value={feedback.soreness_pre.overall ? `${feedback.soreness_pre.overall}/10` : null} dataPath="workoutData.subjective_feedback.soreness_pre.overall" />
                <ValueDisplay label="Legs" value={feedback.soreness_pre.legs ? `${feedback.soreness_pre.legs}/10` : null} dataPath="workoutData.subjective_feedback.soreness_pre.legs" />
                <ValueDisplay label="Arms" value={feedback.soreness_pre.arms ? `${feedback.soreness_pre.arms}/10` : null} dataPath="workoutData.subjective_feedback.soreness_pre.arms" />
                <ValueDisplay label="Back" value={feedback.soreness_pre.back ? `${feedback.soreness_pre.back}/10` : null} dataPath="workoutData.subjective_feedback.soreness_pre.back" />
              </div>
            </div>
          )}

          {feedback.soreness_post && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">Post-Workout Soreness</h4>
              <div className="space-y-1">
                <ValueDisplay label="Overall" value={feedback.soreness_post.overall ? `${feedback.soreness_post.overall}/10` : null} dataPath="workoutData.subjective_feedback.soreness_post.overall" />
                <ValueDisplay label="Legs" value={feedback.soreness_post.legs ? `${feedback.soreness_post.legs}/10` : null} dataPath="workoutData.subjective_feedback.soreness_post.legs" />
                <ValueDisplay label="Arms" value={feedback.soreness_post.arms ? `${feedback.soreness_post.arms}/10` : null} dataPath="workoutData.subjective_feedback.soreness_post.arms" />
                <ValueDisplay label="Back" value={feedback.soreness_post.back ? `${feedback.soreness_post.back}/10` : null} dataPath="workoutData.subjective_feedback.soreness_post.back" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Coach notes display
const CoachNotes = ({ notes }) => {
  if (!notes) return null;

  return (
    <div className="space-y-4">
      {notes.programming_intent && (
        <div className="p-3 bg-synthwave-bg-primary/30 rounded border border-synthwave-neon-cyan/20">
          <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">Programming Intent: </span>
          <span className="text-synthwave-text-secondary font-rajdhani text-base" data-json-path="workoutData.coach_notes.programming_intent" data-json-value={JSON.stringify(notes.programming_intent)}>
            {notes.programming_intent}
          </span>
        </div>
      )}

      {notes.positive_observations && notes.positive_observations.length > 0 && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">Positive Observations</h4>
          <ul className="space-y-1">
            {notes.positive_observations.map((observation, index) => (
              <li key={index} className="text-synthwave-text-secondary font-rajdhani text-base flex items-start space-x-2" data-json-path={`workoutData.coach_notes.positive_observations[${index}]`} data-json-value={JSON.stringify(observation)}>
                <span className="text-synthwave-neon-cyan mt-1">•</span>
                <span>{observation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.areas_for_improvement && notes.areas_for_improvement.length > 0 && (
        <div>
          <h4 className="text-synthwave-neon-pink font-rajdhani font-bold text-base mb-2">Areas for Improvement</h4>
          <ul className="space-y-1">
            {notes.areas_for_improvement.map((area, index) => (
              <li key={index} className="text-synthwave-text-secondary font-rajdhani text-base flex items-start space-x-2" data-json-path={`workoutData.coach_notes.areas_for_improvement[${index}]`} data-json-value={JSON.stringify(area)}>
                <span className="text-synthwave-neon-pink mt-1">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.next_session_focus && (
        <div className="p-3 bg-synthwave-bg-primary/30 rounded border border-synthwave-neon-pink/20">
          <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">Next Session Focus: </span>
          <span className="text-synthwave-text-secondary font-rajdhani text-base" data-json-path="workoutData.coach_notes.next_session_focus" data-json-value={JSON.stringify(notes.next_session_focus)}>
            {notes.next_session_focus}
          </span>
        </div>
      )}
    </div>
  );
};

// Main WorkoutViewer component
const WorkoutViewer = ({ workout, onToggleView, onDeleteWorkout }) => {
  if (!workout || !workout.workoutData) {
    return (
      <div className="text-center py-8">
        <div className="text-synthwave-text-secondary font-rajdhani text-lg">
          No workout data available
        </div>
      </div>
    );
  }

  const { workoutData } = workout;
  const crossfitData = workoutData.discipline_specific?.crossfit;

  // Function to reconstruct JSON from the rendered HTML
  const reconstructJSON = () => {
    const container = document.querySelector('[data-workout-viewer]');
    if (!container) return null;

    const result = {};
    const elements = container.querySelectorAll('[data-json-path]');

    elements.forEach(element => {
      const path = element.getAttribute('data-json-path');
      const value = element.getAttribute('data-json-value');

      if (path && value) {
        try {
          const parsedValue = JSON.parse(value);
          setNestedValue(result, path, parsedValue);
        } catch (e) {
          console.warn('Failed to parse JSON value:', value);
        }
      }
    });

    return result;
  };

  // Helper function to set nested object values
  const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];

      // Handle array indices
      if (nextKey && nextKey.includes('[') && nextKey.includes(']')) {
        const arrayKey = nextKey.split('[')[0];
        const index = parseInt(nextKey.split('[')[1].split(']')[0]);

        if (!current[key]) current[key] = {};
        if (!current[key][arrayKey]) current[key][arrayKey] = [];

        current = current[key];
        i++; // Skip the next iteration since we handled it
      } else {
        if (!current[key]) current[key] = {};
        current = current[key];
      }
    }

    const finalKey = keys[keys.length - 1];
    if (finalKey.includes('[') && finalKey.includes(']')) {
      const arrayKey = finalKey.split('[')[0];
      const index = parseInt(finalKey.split('[')[1].split(']')[0]);

      if (!current[arrayKey]) current[arrayKey] = [];
      current[arrayKey][index] = value;
    } else {
      current[finalKey] = value;
    }
  };

  return (
    <div className="space-y-6" data-workout-viewer>
      {/* Toggle View, Manage Workouts, and Delete Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            const searchParams = new URLSearchParams(window.location.search);
            const userId = searchParams.get('userId');
            const coachId = searchParams.get('coachId');
            if (userId && coachId) {
              window.location.href = `/training-grounds/manage-workouts?userId=${userId}&coachId=${coachId}`;
            }
          }}
          className={`${themeClasses.cyanButton} text-sm px-4 py-2 flex items-center space-x-2`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Manage Workouts</span>
        </button>
        <button
          onClick={() => onDeleteWorkout && onDeleteWorkout(workout)}
          className={`${themeClasses.neonButton} text-sm px-4 py-2 flex items-center space-x-2`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete Workout</span>
        </button>
        <button
          onClick={onToggleView}
          className={`${themeClasses.neonButton} text-sm px-4 py-2 flex items-center space-x-2`}
        >
          <JsonIcon />
          <span>View Raw JSON</span>
        </button>
      </div>

      {/* Workout Summary */}
      <CollapsibleSection
        title="Workout Summary"
        icon={<WorkoutIcon />}
        defaultOpen={true}
      >
        <WorkoutSummary workoutData={workoutData} />
      </CollapsibleSection>

      {/* Performance Metrics */}
      <CollapsibleSection
        title="Performance Metrics"
        icon={<MetricsIcon />}
        defaultOpen={true}
      >
        <PerformanceMetrics metrics={workoutData.performance_metrics} />
      </CollapsibleSection>

      {/* AI-Generated Summary */}
      {workout.summary && (
        <CollapsibleSection
          title="AI Summary"
          icon={<AIIcon />}
          defaultOpen={true}
        >
          <div className="p-4 bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg">
            <div className="text-synthwave-text-primary font-rajdhani text-base leading-relaxed">
              {workout.summary}
            </div>
            <div className="mt-3 text-synthwave-text-secondary font-rajdhani text-sm">
              <span className="text-synthwave-neon-cyan">Generated by AI</span> •
              Provides contextual overview of workout performance and key highlights
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Workout Rounds */}
      {crossfitData && crossfitData.rounds && (
        <CollapsibleSection
          title={`Workout Rounds (${crossfitData.rounds.length})`}
          icon={<WorkoutIcon />}
          defaultOpen={true}
        >
          <div className="space-y-6">
            {crossfitData.rounds.map((round, index) => (
              <RoundDisplay key={index} round={round} roundIndex={index} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Subjective Feedback */}
      {workoutData.subjective_feedback && (
        <CollapsibleSection
          title="Subjective Feedback"
          icon={<NotesIcon />}
          defaultOpen={false}
        >
          <SubjectiveFeedback feedback={workoutData.subjective_feedback} />
        </CollapsibleSection>
      )}

      {/* Coach Notes */}
      {workoutData.coach_notes && (
        <CollapsibleSection
          title="Coach Notes"
          icon={<NotesIcon />}
          defaultOpen={false}
        >
          <CoachNotes notes={workoutData.coach_notes} />
        </CollapsibleSection>
      )}

      {/* Extraction Notes */}
      {workoutData.metadata?.extraction_notes && (
        <CollapsibleSection
          title="Extraction Notes"
          icon={<NotesIcon />}
          defaultOpen={false}
        >
          <div className="p-3 bg-synthwave-bg-primary/30 rounded border border-synthwave-neon-cyan/20">
            <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">AI Extraction Notes: </span>
            <span className="text-synthwave-text-secondary font-rajdhani text-base" data-json-path="workoutData.metadata.extraction_notes" data-json-value={JSON.stringify(workoutData.metadata.extraction_notes)}>
              {workoutData.metadata.extraction_notes}
            </span>
          </div>

          {/* Additional metadata info */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <ValueDisplay
              label="Confidence"
              value={workoutData.metadata.data_confidence ? `${Math.round(workoutData.metadata.data_confidence * 100)}%` : null}
              dataPath="workoutData.metadata.data_confidence"
            />
            <ValueDisplay
              label="Completeness"
              value={workoutData.metadata.data_completeness ? `${Math.round(workoutData.metadata.data_completeness * 100)}%` : null}
              dataPath="workoutData.metadata.data_completeness"
            />
            <ValueDisplay
              label="Schema Version"
              value={workoutData.metadata.schema_version}
              dataPath="workoutData.metadata.schema_version"
            />
            <ValueDisplay
              label="Extraction Method"
              value={workoutData.metadata.extraction_method}
              dataPath="workoutData.metadata.extraction_method"
            />
            <ValueDisplay
              label="AI Extracted"
              value={workoutData.metadata.ai_extracted}
              dataPath="workoutData.metadata.ai_extracted"
            />
            <ValueDisplay
              label="User Verified"
              value={workoutData.metadata.user_verified}
              dataPath="workoutData.metadata.user_verified"
            />
          </div>

          {/* Validation flags */}
          {workoutData.metadata.validation_flags && workoutData.metadata.validation_flags.length > 0 && (
            <div className="mt-4">
              <h4 className="text-synthwave-neon-pink font-rajdhani font-bold text-base mb-2">Validation Flags</h4>
              <ul className="space-y-1">
                {workoutData.metadata.validation_flags.map((flag, index) => (
                  <li key={index} className="text-synthwave-text-secondary font-rajdhani text-base flex items-start space-x-2" data-json-path={`workoutData.metadata.validation_flags[${index}]`} data-json-value={JSON.stringify(flag)}>
                    <span className="text-synthwave-neon-pink mt-1">•</span>
                    <span>{flag.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Debug: JSON Reconstruction */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-synthwave-bg-primary/20 rounded border border-synthwave-neon-cyan/20">
          <button
            onClick={() => {
              const reconstructed = reconstructJSON();
              console.info('Reconstructed JSON:', reconstructed);
            }}
            className="text-synthwave-neon-cyan font-rajdhani text-sm hover:underline"
          >
            [Debug] Reconstruct JSON (check console)
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkoutViewer;