import React, { useState } from "react";
import { Tooltip } from "react-tooltip";
import { containerPatterns, badgePatterns } from "../utils/ui/uiPatterns";
import {
  ChevronDownIcon,
  MetricsIcon,
  NotesIcon,
  AIIcon,
  TrophyIcon,
  SummaryIcon,
  CyclesIcon,
  FeedbackIcon,
  CoachIcon,
  ProcessingIcon,
  DatabaseIcon,
} from "./themes/SynthwaveComponents";
import InlineEditField from "./shared/InlineEditField";
import { getDisciplineComponent } from "./workout-viewer/disciplines/DisciplineRegistry";

// Collapsible section component with numbered badge - ViewWorkouts style

// Value display component with data attributes for JSON reconstruction
const ValueDisplay = ({ label, value, dataPath, className = "" }) => {
  if (value === null || value === undefined) return null;

  return (
    <div
      className={`flex justify-between items-center py-1 ${className}`}
      data-json-path={dataPath}
    >
      <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
        {label}:
      </span>
      <span
        className="text-synthwave-text-primary font-rajdhani text-base"
        data-json-value={JSON.stringify(value)}
      >
        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </span>
    </div>
  );
};

// Exercise display component
const ExerciseDisplay = ({ exercise, roundNumber, exerciseIndex }) => {
  const dataPath = `workoutData.discipline_specific.crossfit.rounds[${roundNumber - 1}].exercises[${exerciseIndex}]`;

  return (
    <div
      className={`${containerPatterns.workoutDescriptionEditable} space-y-2`}
    >
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
        <div className={`mt-2 p-2 ${containerPatterns.coachNotesSection}`}>
          <span className="text-synthwave-neon-pink font-rajdhani text-sm font-medium">
            Notes:{" "}
          </span>
          <span
            className="text-synthwave-text-secondary font-rajdhani text-sm"
            data-json-path={`${dataPath}.form_notes`}
            data-json-value={JSON.stringify(exercise.form_notes)}
          >
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
        value={
          metrics.perceived_exertion ? `${metrics.perceived_exertion}/10` : null
        }
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
        value={
          metrics.energy_level_pre ? `${metrics.energy_level_pre}/10` : null
        }
        dataPath="workoutData.performance_metrics.energy_level_pre"
      />
      <ValueDisplay
        label="Post-Energy"
        value={
          metrics.energy_level_post ? `${metrics.energy_level_post}/10` : null
        }
        dataPath="workoutData.performance_metrics.energy_level_post"
      />
    </div>
  );
};

// Powerlifting set display component
const PowerliftingSetDisplay = ({ set, setIndex, dataPath }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-synthwave-neon-cyan/20 border border-synthwave-neon-cyan rounded-full flex items-center justify-center">
          <span className="text-synthwave-neon-cyan font-rajdhani font-bold text-sm">
            {setIndex + 1}
          </span>
        </div>
        <h3 className="font-rajdhani font-bold text-white text-lg">
          Set {setIndex + 1}
        </h3>
        <span
          className={`${badgePatterns.workoutBadgeBase} ml-auto ${
            set.set_type === "working"
              ? badgePatterns.workoutBadgePink
              : set.set_type === "warmup"
                ? badgePatterns.workoutBadgePurple
                : set.set_type === "accessory"
                  ? badgePatterns.workoutBadgeCyan
                  : badgePatterns.workoutBadgeMuted
          }`}
        >
          {set.set_type || "working"}
        </span>
      </div>

      <div className={`ml-4 ${containerPatterns.workoutDescriptionEditable}`}>
        <div className="grid grid-cols-2 gap-2">
          <ValueDisplay
            label="Weight"
            value={set.weight ? `${set.weight}lbs` : null}
            dataPath={`${dataPath}.weight`}
          />
          <ValueDisplay
            label="Reps"
            value={set.reps}
            dataPath={`${dataPath}.reps`}
          />
          {set.rpe && (
            <ValueDisplay
              label="RPE"
              value={set.rpe}
              dataPath={`${dataPath}.rpe`}
            />
          )}
          {set.percentage_1rm && (
            <ValueDisplay
              label="% 1RM"
              value={`${set.percentage_1rm}%`}
              dataPath={`${dataPath}.percentage_1rm`}
            />
          )}
          {set.rest_time && (
            <ValueDisplay
              label="Rest"
              value={`${Math.floor(set.rest_time / 60)}:${String(set.rest_time % 60).padStart(2, "0")}`}
              dataPath={`${dataPath}.rest_time`}
            />
          )}
          {set.bar_speed && (
            <ValueDisplay
              label="Bar Speed"
              value={set.bar_speed}
              dataPath={`${dataPath}.bar_speed`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Powerlifting exercise display component
const PowerliftingExerciseDisplay = ({ exercise, exerciseIndex }) => {
  const dataPath = `workoutData.discipline_specific.powerlifting.exercises[${exerciseIndex}]`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-rajdhani font-bold text-synthwave-neon-cyan text-xl capitalize">
            {exercise.exercise_name?.replace(/_/g, " ")}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`${badgePatterns.workoutBadgeBase} ${
                exercise.movement_category === "main_lift"
                  ? badgePatterns.workoutBadgePink
                  : exercise.movement_category === "accessory"
                    ? badgePatterns.workoutBadgeCyan
                    : badgePatterns.workoutBadgeMuted
              }`}
            >
              {exercise.movement_category?.replace(/_/g, " ") || "main lift"}
            </span>
            {exercise.equipment && exercise.equipment.length > 0 && (
              <span className="text-synthwave-text-muted font-rajdhani text-sm">
                {exercise.equipment.join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {exercise.sets && exercise.sets.length > 0 && (
        <div className="space-y-6">
          {exercise.sets.map((set, setIndex) => (
            <PowerliftingSetDisplay
              key={setIndex}
              set={set}
              setIndex={setIndex}
              dataPath={`${dataPath}.sets[${setIndex}]`}
            />
          ))}
        </div>
      )}

      {exercise.attempts && (
        <div className={containerPatterns.workoutDescriptionEditable}>
          <h5 className="font-rajdhani font-bold text-synthwave-neon-cyan text-base uppercase mb-2">
            Attempts
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {exercise.attempts.opener && (
              <ValueDisplay
                label="Opener"
                value={`${exercise.attempts.opener}lbs`}
                dataPath={`${dataPath}.attempts.opener`}
              />
            )}
            {exercise.attempts.second_attempt && (
              <ValueDisplay
                label="2nd Attempt"
                value={`${exercise.attempts.second_attempt}lbs`}
                dataPath={`${dataPath}.attempts.second_attempt`}
              />
            )}
            {exercise.attempts.third_attempt && (
              <ValueDisplay
                label="3rd Attempt"
                value={`${exercise.attempts.third_attempt}lbs`}
                dataPath={`${dataPath}.attempts.third_attempt`}
              />
            )}
          </div>
          {exercise.attempts.successful_attempts &&
            exercise.attempts.successful_attempts.length > 0 && (
              <div className="mt-2">
                <span className="text-synthwave-neon-cyan font-rajdhani text-sm font-medium">
                  Successful:{" "}
                </span>
                <span className="text-synthwave-text-primary font-rajdhani text-sm">
                  {exercise.attempts.successful_attempts.join("lbs, ")}lbs
                </span>
              </div>
            )}
          {exercise.attempts.missed_attempts &&
            exercise.attempts.missed_attempts.length > 0 && (
              <div className="mt-1">
                <span className="text-synthwave-neon-pink font-rajdhani text-sm font-medium">
                  Missed:{" "}
                </span>
                <span className="text-synthwave-text-primary font-rajdhani text-sm">
                  {exercise.attempts.missed_attempts.join("lbs, ")}lbs
                </span>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

// Workout summary display
const WorkoutSummary = ({ workoutData }) => {
  const crossfitData = workoutData.discipline_specific?.crossfit;
  const runningData = workoutData.discipline_specific?.running;
  const powerliftingData = workoutData.discipline_specific?.powerlifting;

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
        value={
          workoutData.duration
            ? `${Math.round(workoutData.duration / 60)} min`
            : null
        }
        dataPath="workoutData.duration"
      />
      <ValueDisplay
        label="Session Duration"
        value={
          workoutData.session_duration
            ? `${Math.round(workoutData.session_duration / 60)} min`
            : null
        }
        dataPath="workoutData.session_duration"
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
            value={
              crossfitData.performance_data?.total_time
                ? `${Math.floor(crossfitData.performance_data.total_time / 60)}:${String(crossfitData.performance_data.total_time % 60).padStart(2, "0")}`
                : null
            }
            dataPath="workoutData.discipline_specific.crossfit.performance_data.total_time"
          />
          <ValueDisplay
            label="Time Cap"
            value={
              crossfitData.time_cap
                ? `${Math.floor(crossfitData.time_cap / 60)}:${String(crossfitData.time_cap % 60).padStart(2, "0")}`
                : null
            }
            dataPath="workoutData.discipline_specific.crossfit.time_cap"
          />
          {crossfitData.performance_data?.score && (
            <ValueDisplay
              label="Score"
              value={(() => {
                const score = crossfitData.performance_data.score;
                if (score.type === "time" && typeof score.value === "number") {
                  return `${Math.floor(score.value / 60)}:${String(score.value % 60).padStart(2, "0")}`;
                }
                return score.unit
                  ? `${score.value} ${score.unit}`
                  : score.value;
              })()}
              dataPath="workoutData.discipline_specific.crossfit.performance_data.score"
            />
          )}
        </>
      )}

      {runningData && (
        <>
          <ValueDisplay
            label="Run Type"
            value={runningData.run_type}
            dataPath="workoutData.discipline_specific.running.run_type"
          />
          <ValueDisplay
            label="Distance"
            value={`${runningData.total_distance} ${runningData.distance_unit}`}
            dataPath="workoutData.discipline_specific.running.total_distance"
          />
          <ValueDisplay
            label="Total Time"
            value={
              runningData.total_time
                ? `${Math.floor(runningData.total_time / 60)}:${String(runningData.total_time % 60).padStart(2, "0")}`
                : null
            }
            dataPath="workoutData.discipline_specific.running.total_time"
          />
          <ValueDisplay
            label="Avg Pace"
            value={runningData.average_pace}
            dataPath="workoutData.discipline_specific.running.average_pace"
          />
          <ValueDisplay
            label="Surface"
            value={runningData.surface}
            dataPath="workoutData.discipline_specific.running.surface"
          />
          {runningData.elevation_gain && (
            <ValueDisplay
              label="Elevation Gain"
              value={`${runningData.elevation_gain}ft`}
              dataPath="workoutData.discipline_specific.running.elevation_gain"
            />
          )}
          {runningData.elevation_loss && (
            <ValueDisplay
              label="Elevation Loss"
              value={`${runningData.elevation_loss}ft`}
              dataPath="workoutData.discipline_specific.running.elevation_loss"
            />
          )}
          {runningData.route?.name && (
            <ValueDisplay
              label="Route"
              value={runningData.route.name}
              dataPath="workoutData.discipline_specific.running.route.name"
            />
          )}
        </>
      )}

      {powerliftingData && (
        <>
          <ValueDisplay
            label="Session Type"
            value={powerliftingData.session_type}
            dataPath="workoutData.discipline_specific.powerlifting.session_type"
          />
          <ValueDisplay
            label="Exercises"
            value={powerliftingData.exercises?.length}
            dataPath="workoutData.discipline_specific.powerlifting.exercises"
          />
          <ValueDisplay
            label="Competition Prep"
            value={powerliftingData.competition_prep ? "Yes" : "No"}
            dataPath="workoutData.discipline_specific.powerlifting.competition_prep"
          />
          {powerliftingData.exercises &&
            powerliftingData.exercises.length > 0 && (
              <ValueDisplay
                label="Total Sets"
                value={powerliftingData.exercises.reduce(
                  (sum, ex) => sum + (ex.sets?.length || 0),
                  0,
                )}
                dataPath="workoutData.discipline_specific.powerlifting.exercises"
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
        <div className={containerPatterns.coachNotesSection}>
          <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
            Notes:{" "}
          </span>
          <span
            className="text-synthwave-text-secondary font-rajdhani text-base"
            data-json-path="workoutData.subjective_feedback.notes"
            data-json-value={JSON.stringify(feedback.notes)}
          >
            {feedback.notes}
          </span>
        </div>
      )}

      {(feedback.soreness_pre || feedback.soreness_post) && (
        <div className="grid grid-cols-2 gap-4">
          {feedback.soreness_pre && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
                Pre-Workout Soreness
              </h4>
              <div className="space-y-1">
                <ValueDisplay
                  label="Overall"
                  value={
                    feedback.soreness_pre.overall
                      ? `${feedback.soreness_pre.overall}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_pre.overall"
                />
                <ValueDisplay
                  label="Legs"
                  value={
                    feedback.soreness_pre.legs
                      ? `${feedback.soreness_pre.legs}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_pre.legs"
                />
                <ValueDisplay
                  label="Arms"
                  value={
                    feedback.soreness_pre.arms
                      ? `${feedback.soreness_pre.arms}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_pre.arms"
                />
                <ValueDisplay
                  label="Back"
                  value={
                    feedback.soreness_pre.back
                      ? `${feedback.soreness_pre.back}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_pre.back"
                />
              </div>
            </div>
          )}

          {feedback.soreness_post && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
                Post-Workout Soreness
              </h4>
              <div className="space-y-1">
                <ValueDisplay
                  label="Overall"
                  value={
                    feedback.soreness_post.overall
                      ? `${feedback.soreness_post.overall}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_post.overall"
                />
                <ValueDisplay
                  label="Legs"
                  value={
                    feedback.soreness_post.legs
                      ? `${feedback.soreness_post.legs}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_post.legs"
                />
                <ValueDisplay
                  label="Arms"
                  value={
                    feedback.soreness_post.arms
                      ? `${feedback.soreness_post.arms}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_post.arms"
                />
                <ValueDisplay
                  label="Back"
                  value={
                    feedback.soreness_post.back
                      ? `${feedback.soreness_post.back}/10`
                      : null
                  }
                  dataPath="workoutData.subjective_feedback.soreness_post.back"
                />
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
        <div className={containerPatterns.workoutDescriptionEditable}>
          <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">
            Programming Intent:{" "}
          </span>
          <span
            className="text-synthwave-text-secondary font-rajdhani text-base"
            data-json-path="workoutData.coach_notes.programming_intent"
            data-json-value={JSON.stringify(notes.programming_intent)}
          >
            {notes.programming_intent}
          </span>
        </div>
      )}

      {notes.positive_observations &&
        notes.positive_observations.length > 0 && (
          <div>
            <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
              Positive Observations
            </h4>
            <ul className="space-y-1">
              {notes.positive_observations.map((observation, index) => (
                <li
                  key={index}
                  className="text-synthwave-text-secondary font-rajdhani text-base flex items-start space-x-2"
                  data-json-path={`workoutData.coach_notes.positive_observations[${index}]`}
                  data-json-value={JSON.stringify(observation)}
                >
                  <span className="text-synthwave-neon-cyan mt-1">•</span>
                  <span>{observation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {notes.areas_for_improvement &&
        notes.areas_for_improvement.length > 0 && (
          <div>
            <h4 className="text-synthwave-neon-pink font-rajdhani font-bold text-base mb-2">
              Areas for Improvement
            </h4>
            <ul className="space-y-1">
              {notes.areas_for_improvement.map((area, index) => (
                <li
                  key={index}
                  className="text-synthwave-text-secondary font-rajdhani text-base flex items-start space-x-2"
                  data-json-path={`workoutData.coach_notes.areas_for_improvement[${index}]`}
                  data-json-value={JSON.stringify(area)}
                >
                  <span className="text-synthwave-neon-pink mt-1">•</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {notes.next_session_focus && (
        <div className={containerPatterns.coachNotesSection}>
          <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
            Next Session Focus:{" "}
          </span>
          <span
            className="text-synthwave-text-secondary font-rajdhani text-base"
            data-json-path="workoutData.coach_notes.next_session_focus"
            data-json-value={JSON.stringify(notes.next_session_focus)}
          >
            {notes.next_session_focus}
          </span>
        </div>
      )}
    </div>
  );
};

// Running segment display component
const RunningSegmentDisplay = ({ segment, segmentIndex }) => {
  return (
    <div className="py-2">
      {/* Segment Name and All Details on One Line */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs font-rajdhani">
        <span className="font-bold text-synthwave-neon-cyan text-sm capitalize">
          Segment {segment.segment_number}: {segment.segment_type}
        </span>

        {segment.distance && (
          <span className="text-synthwave-text-secondary">
            {segment.distance}
          </span>
        )}

        {segment.time && (
          <span className="text-synthwave-text-secondary">
            {Math.floor(segment.time / 60)}:
            {String(segment.time % 60).padStart(2, "0")}
          </span>
        )}

        {segment.pace && (
          <span className="text-synthwave-text-secondary">{segment.pace}</span>
        )}

        {segment.heart_rate_avg && (
          <span className="text-synthwave-text-secondary">
            Avg HR: {segment.heart_rate_avg} bpm
          </span>
        )}

        {segment.heart_rate_max && (
          <span className="text-synthwave-text-secondary">
            Max HR: {segment.heart_rate_max} bpm
          </span>
        )}

        {segment.cadence && (
          <span className="text-synthwave-text-secondary">
            Cadence: {segment.cadence} spm
          </span>
        )}

        {segment.elevation_change && (
          <span className="text-synthwave-text-secondary">
            {segment.elevation_change > 0 ? "+" : ""}
            {segment.elevation_change}ft
          </span>
        )}

        {segment.terrain && (
          <span className="text-synthwave-text-muted uppercase ml-auto">
            {segment.terrain}
          </span>
        )}

        {segment.effort_level && (
          <span
            className={`${badgePatterns.workoutBadgeBase} ml-auto ${
              segment.effort_level === "max"
                ? badgePatterns.workoutBadgePink
                : segment.effort_level === "hard"
                  ? badgePatterns.workoutBadgeCyan
                  : segment.effort_level === "moderate"
                    ? badgePatterns.workoutBadgePurple
                    : badgePatterns.workoutBadgeMuted
            }`}
          >
            {segment.effort_level}
          </span>
        )}
      </div>

      {/* Notes on Second Line if Present */}
      {segment.notes && (
        <div className="mt-1 text-xs font-rajdhani text-synthwave-text-secondary italic">
          {segment.notes}
        </div>
      )}
    </div>
  );
};

// Running details display
const RunningDetails = ({ runningData }) => {
  if (!runningData) return null;

  return (
    <div className="space-y-4">
      {runningData.weather && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
            Weather Conditions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {runningData.weather.temperature && (
              <ValueDisplay
                label="Temperature"
                value={`${runningData.weather.temperature}°${runningData.weather.temperature_unit || "F"}`}
                dataPath="workoutData.discipline_specific.running.weather.temperature"
              />
            )}
            {runningData.weather.conditions && (
              <ValueDisplay
                label="Conditions"
                value={runningData.weather.conditions}
                dataPath="workoutData.discipline_specific.running.weather.conditions"
              />
            )}
            {runningData.weather.wind_speed && (
              <ValueDisplay
                label="Wind Speed"
                value={`${runningData.weather.wind_speed} mph`}
                dataPath="workoutData.discipline_specific.running.weather.wind_speed"
              />
            )}
            {runningData.weather.humidity && (
              <ValueDisplay
                label="Humidity"
                value={`${runningData.weather.humidity}%`}
                dataPath="workoutData.discipline_specific.running.weather.humidity"
              />
            )}
          </div>
        </div>
      )}

      {runningData.equipment && (
        <div>
          <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
            Equipment
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {runningData.equipment.shoes && (
              <ValueDisplay
                label="Shoes"
                value={runningData.equipment.shoes}
                dataPath="workoutData.discipline_specific.running.equipment.shoes"
              />
            )}
            {runningData.equipment.wearable && (
              <ValueDisplay
                label="Wearable"
                value={runningData.equipment.wearable}
                dataPath="workoutData.discipline_specific.running.equipment.wearable"
              />
            )}
            {runningData.equipment.other_gear &&
              runningData.equipment.other_gear.length > 0 && (
                <div className="col-span-2">
                  <span className="text-synthwave-neon-pink font-rajdhani text-base font-medium">
                    Other Gear:{" "}
                  </span>
                  <span className="text-synthwave-text-primary font-rajdhani text-base">
                    {runningData.equipment.other_gear.join(", ")}
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      {runningData.route &&
        (runningData.route.name || runningData.route.description) && (
          <div className={containerPatterns.workoutDescriptionEditable}>
            {runningData.route.name && (
              <>
                <span className="text-synthwave-neon-cyan font-rajdhani text-base font-medium">
                  Route:{" "}
                </span>
                <span
                  className="text-synthwave-text-primary font-rajdhani text-base"
                  data-json-path="workoutData.discipline_specific.running.route.name"
                  data-json-value={JSON.stringify(runningData.route.name)}
                >
                  {runningData.route.name}
                </span>
                {runningData.route.type && (
                  <span className="text-synthwave-text-secondary font-rajdhani text-sm ml-2">
                    ({runningData.route.type.replace(/_/g, " ")})
                  </span>
                )}
              </>
            )}
            {runningData.route.description && (
              <div className="mt-1">
                <span
                  className="text-synthwave-text-secondary font-rajdhani text-base"
                  data-json-path="workoutData.discipline_specific.running.route.description"
                  data-json-value={JSON.stringify(
                    runningData.route.description,
                  )}
                >
                  {runningData.route.description}
                </span>
              </div>
            )}
          </div>
        )}

      {(runningData.warmup || runningData.cooldown) && (
        <div className="grid grid-cols-2 gap-4">
          {runningData.warmup && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
                Warmup
              </h4>
              <div className="space-y-1">
                {runningData.warmup.distance && (
                  <ValueDisplay
                    label="Distance"
                    value={`${runningData.warmup.distance} ${runningData.distance_unit}`}
                    dataPath="workoutData.discipline_specific.running.warmup.distance"
                  />
                )}
                {runningData.warmup.time && (
                  <ValueDisplay
                    label="Time"
                    value={`${Math.floor(runningData.warmup.time / 60)}:${String(runningData.warmup.time % 60).padStart(2, "0")}`}
                    dataPath="workoutData.discipline_specific.running.warmup.time"
                  />
                )}
                {runningData.warmup.description && (
                  <div
                    className="text-synthwave-text-secondary font-rajdhani text-sm"
                    data-json-path="workoutData.discipline_specific.running.warmup.description"
                    data-json-value={JSON.stringify(
                      runningData.warmup.description,
                    )}
                  >
                    {runningData.warmup.description}
                  </div>
                )}
              </div>
            </div>
          )}

          {runningData.cooldown && (
            <div>
              <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
                Cooldown
              </h4>
              <div className="space-y-1">
                {runningData.cooldown.distance && (
                  <ValueDisplay
                    label="Distance"
                    value={`${runningData.cooldown.distance} ${runningData.distance_unit}`}
                    dataPath="workoutData.discipline_specific.running.cooldown.distance"
                  />
                )}
                {runningData.cooldown.time && (
                  <ValueDisplay
                    label="Time"
                    value={`${Math.floor(runningData.cooldown.time / 60)}:${String(runningData.cooldown.time % 60).padStart(2, "0")}`}
                    dataPath="workoutData.discipline_specific.running.cooldown.time"
                  />
                )}
                {runningData.cooldown.description && (
                  <div
                    className="text-synthwave-text-secondary font-rajdhani text-sm"
                    data-json-path="workoutData.discipline_specific.running.cooldown.description"
                    data-json-value={JSON.stringify(
                      runningData.cooldown.description,
                    )}
                  >
                    {runningData.cooldown.description}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {runningData.fueling &&
        (runningData.fueling.pre_run ||
          runningData.fueling.during_run ||
          runningData.fueling.hydration_oz) && (
          <div>
            <h4 className="text-synthwave-neon-cyan font-rajdhani font-bold text-base mb-2">
              Nutrition & Hydration
            </h4>
            <div className="space-y-2">
              {runningData.fueling.pre_run && (
                <div
                  className={`p-2 ${containerPatterns.workoutDescriptionEditable}`}
                >
                  <span className="text-synthwave-neon-cyan font-rajdhani text-sm font-medium">
                    Pre-Run:{" "}
                  </span>
                  <span
                    className="text-synthwave-text-secondary font-rajdhani text-sm"
                    data-json-path="workoutData.discipline_specific.running.fueling.pre_run"
                    data-json-value={JSON.stringify(
                      runningData.fueling.pre_run,
                    )}
                  >
                    {runningData.fueling.pre_run}
                  </span>
                </div>
              )}
              {runningData.fueling.during_run &&
                runningData.fueling.during_run.length > 0 && (
                  <div
                    className={`p-2 ${containerPatterns.workoutDescriptionEditable}`}
                  >
                    <span className="text-synthwave-neon-cyan font-rajdhani text-sm font-medium">
                      During Run:{" "}
                    </span>
                    <span className="text-synthwave-text-secondary font-rajdhani text-sm">
                      {runningData.fueling.during_run.join(", ")}
                    </span>
                  </div>
                )}
              {runningData.fueling.hydration_oz && (
                <ValueDisplay
                  label="Total Hydration"
                  value={`${runningData.fueling.hydration_oz} oz`}
                  dataPath="workoutData.discipline_specific.running.fueling.hydration_oz"
                />
              )}
            </div>
          </div>
        )}
    </div>
  );
};

// Main WorkoutViewer component
const WorkoutViewer = ({
  workout,
  onToggleView,
  onDeleteWorkout,
  viewMode = "formatted",
  onSaveWorkoutTitle,
  formatDate,
}) => {
  // Collapse state management - default: all sections expanded
  const [collapsedSections, setCollapsedSections] = useState(new Set([]));
  const [collapsedSubsections, setCollapsedSubsections] = useState(
    new Set([
      "the-breakdown",
      "quality-metrics",
      "extraction-tips",
      "physical-notes",
    ]),
  );

  const toggleCollapse = (sectionId) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleSubsection = (subsectionId) => {
    setCollapsedSubsections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subsectionId)) {
        newSet.delete(subsectionId);
      } else {
        newSet.add(subsectionId);
      }
      return newSet;
    });
  };

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
  const discipline = workoutData.discipline; // e.g., "crossfit", "running", "powerlifting"

  // Map legacy disciplines to their data location
  const getDisciplineDataPath = (disciplineName) => {
    // Only functional_fitness needs mapping - hybrid now has its own schema
    if (disciplineName === "functional_fitness") {
      return "crossfit";
    }
    return disciplineName;
  };

  const disciplineDataPath = getDisciplineDataPath(discipline);
  const disciplineData = workoutData.discipline_specific?.[disciplineDataPath];
  const DisciplineComponent = getDisciplineComponent(discipline);

  // Extract all discipline-specific data for Performance Metrics section
  const crossfitData = workoutData.discipline_specific?.crossfit;
  const runningData = workoutData.discipline_specific?.running;
  const powerliftingData = workoutData.discipline_specific?.powerlifting;
  const bodybuildingData = workoutData.discipline_specific?.bodybuilding;
  const hyroxData = workoutData.discipline_specific?.hyrox;
  const olympicWeightliftingData =
    workoutData.discipline_specific?.olympic_weightlifting;
  const functionalBodybuildingData =
    workoutData.discipline_specific?.functional_bodybuilding;
  const calisthenicsData = workoutData.discipline_specific?.calisthenics;
  const hybridData = workoutData.discipline_specific?.hybrid;

  return (
    <div className="space-y-6" data-workout-viewer>
      {/* Two-column layout: 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column - 60% (3 of 5 columns) */}
        <div className="lg:col-span-3">
          {/* Section 1: Session Stats */}
          <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
            {/* Section Header - Collapsible */}
            <div
              className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
                collapsedSections.has(1) ? "rounded-2xl" : "rounded-t-2xl"
              }`}
              onClick={() => toggleCollapse(1)}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsedSections.has(1)}
              aria-controls="session-stats-content"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCollapse(1);
                }
              }}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
                <InlineEditField
                  value={`${workout.workoutData?.workout_name || "Unnamed Workout"} (${workoutData.discipline || "fitness"})`}
                  onSave={onSaveWorkoutTitle}
                  placeholder="Enter workout name..."
                  size="large"
                  displayClassName="font-russo font-bold text-white text-lg uppercase"
                  containerClassName="flex items-center gap-2 group"
                  buttonClassName="px-2 py-0 text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
                />
              </div>
              <svg
                className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(1) ? "rotate-180" : ""}`}
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

            {/* Content */}
            {!collapsedSections.has(1) && (
              <div id="session-stats-content" className="px-6 pb-6 space-y-3">
                {/* Subsection 1: Session Details */}
                <div>
                  <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                    Session Details
                  </h4>
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {/* Completed Date - Full Width */}
                      <div className="col-span-2 flex items-center gap-1.5 font-rajdhani text-sm">
                        <span className="text-synthwave-text-secondary">
                          Completed:
                        </span>
                        <span className="text-synthwave-neon-cyan font-medium">
                          {(() => {
                            if (!workout.completedAt) return "Unknown";
                            const date = new Date(workout.completedAt);
                            return (
                              date.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }) +
                              " at " +
                              date.toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            );
                          })()}
                        </span>
                      </div>

                      {/* Discipline */}
                      {workoutData.discipline && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-secondary">
                            Discipline:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {workoutData.discipline}
                          </span>
                        </div>
                      )}

                      {/* Type */}
                      {workoutData.workout_type && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-secondary">
                            Type:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {workoutData.workout_type}
                          </span>
                        </div>
                      )}

                      {/* Location */}
                      {workoutData.location && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-secondary">
                            Location:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {workoutData.location}
                          </span>
                        </div>
                      )}

                      {/* Methodology */}
                      {workoutData.methodology && (
                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                          <span className="text-synthwave-text-secondary">
                            Methodology:
                          </span>
                          <span className="text-synthwave-neon-cyan font-medium">
                            {workoutData.methodology}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subsection 2: Workout Metrics - Collapsible */}
                <div>
                  <button
                    onClick={() => toggleSubsection("workout-metrics")}
                    className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                  >
                    <span>Workout Metrics</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        collapsedSubsections.has("workout-metrics")
                          ? "rotate-180"
                          : ""
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
                  {!collapsedSubsections.has("workout-metrics") && (
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {/* Duration */}
                        {workoutData.duration && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Duration:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {Math.round(workoutData.duration / 60)} min
                            </span>
                          </div>
                        )}

                        {/* Session Duration */}
                        {workoutData.session_duration && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Session Duration:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {Math.round(workoutData.session_duration / 60)}{" "}
                              min
                            </span>
                          </div>
                        )}

                        {/* Calories */}
                        {workoutData.performance_metrics?.calories_burned && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Calories:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.performance_metrics.calories_burned}
                            </span>
                          </div>
                        )}

                        {/* CrossFit specific fields */}
                        {crossfitData && (
                          <>
                            {crossfitData.workout_format && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Format:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {crossfitData.workout_format}
                                </span>
                              </div>
                            )}
                            {crossfitData.rx_status && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  RX Status:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {crossfitData.rx_status}
                                </span>
                              </div>
                            )}
                            {crossfitData.performance_data
                              ?.rounds_completed && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Rounds:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {
                                    crossfitData.performance_data
                                      .rounds_completed
                                  }
                                </span>
                              </div>
                            )}
                            {crossfitData.performance_data?.total_reps && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Total Reps:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {crossfitData.performance_data.total_reps}
                                </span>
                              </div>
                            )}
                            {crossfitData.performance_data?.total_time && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Total Time:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {Math.floor(
                                    crossfitData.performance_data.total_time /
                                      60,
                                  )}
                                  :
                                  {String(
                                    crossfitData.performance_data.total_time %
                                      60,
                                  ).padStart(2, "0")}
                                </span>
                              </div>
                            )}
                            {crossfitData.time_cap && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Time Cap:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {Math.floor(crossfitData.time_cap / 60)}:
                                  {String(crossfitData.time_cap % 60).padStart(
                                    2,
                                    "0",
                                  )}
                                </span>
                              </div>
                            )}
                            {crossfitData.performance_data?.score && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Score:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {(() => {
                                    const score =
                                      crossfitData.performance_data.score;
                                    if (
                                      score.type === "time" &&
                                      typeof score.value === "number"
                                    ) {
                                      return `${Math.floor(score.value / 60)}:${String(score.value % 60).padStart(2, "0")}`;
                                    }
                                    return score.unit
                                      ? `${score.value} ${score.unit}`
                                      : score.value;
                                  })()}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Running specific fields */}
                        {runningData && (
                          <>
                            {runningData.run_type && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Run Type:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {runningData.run_type}
                                </span>
                              </div>
                            )}
                            {runningData.total_distance && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Distance:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {runningData.total_distance}{" "}
                                  {runningData.distance_unit}
                                </span>
                              </div>
                            )}
                            {runningData.total_time && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Total Time:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {Math.floor(runningData.total_time / 60)}:
                                  {String(runningData.total_time % 60).padStart(
                                    2,
                                    "0",
                                  )}
                                </span>
                              </div>
                            )}
                            {runningData.average_pace && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Avg Pace:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {runningData.average_pace}
                                </span>
                              </div>
                            )}
                            {runningData.surface && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Surface:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {runningData.surface}
                                </span>
                              </div>
                            )}
                            {runningData.elevation_gain && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Elevation Gain:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {runningData.elevation_gain}ft
                                </span>
                              </div>
                            )}
                            {runningData.elevation_loss && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Elevation Loss:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {runningData.elevation_loss}ft
                                </span>
                              </div>
                            )}
                            {runningData.route?.name && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Route:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {runningData.route.name}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Powerlifting specific fields */}
                        {powerliftingData && (
                          <>
                            {powerliftingData.session_type && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Session Type:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {powerliftingData.session_type}
                                </span>
                              </div>
                            )}
                            {powerliftingData.exercises?.length && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Exercises:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {powerliftingData.exercises.length}
                                </span>
                              </div>
                            )}
                            {powerliftingData.competition_prep !==
                              undefined && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Competition Prep:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {powerliftingData.competition_prep
                                    ? "Yes"
                                    : "No"}
                                </span>
                              </div>
                            )}
                            {powerliftingData.exercises &&
                              powerliftingData.exercises.length > 0 && (
                                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                  <span className="text-synthwave-text-secondary">
                                    Total Sets:
                                  </span>
                                  <span className="text-synthwave-neon-cyan font-medium">
                                    {powerliftingData.exercises.reduce(
                                      (sum, ex) => sum + (ex.sets?.length || 0),
                                      0,
                                    )}
                                  </span>
                                </div>
                              )}
                          </>
                        )}

                        {/* Bodybuilding specific fields */}
                        {bodybuildingData && (
                          <>
                            {bodybuildingData.split_type && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Split Type:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {bodybuildingData.split_type.replace(
                                    /_/g,
                                    " ",
                                  )}
                                </span>
                              </div>
                            )}
                            {bodybuildingData.target_muscle_groups &&
                              bodybuildingData.target_muscle_groups.length >
                                0 && (
                                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                  <span className="text-synthwave-text-secondary">
                                    Target Muscles:
                                  </span>
                                  <span className="text-synthwave-neon-cyan font-medium">
                                    {bodybuildingData.target_muscle_groups.join(
                                      ", ",
                                    )}
                                  </span>
                                </div>
                              )}
                            {bodybuildingData.exercises?.length && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Exercises:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {bodybuildingData.exercises.length}
                                </span>
                              </div>
                            )}
                            {bodybuildingData.exercises &&
                              bodybuildingData.exercises.length > 0 && (
                                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                  <span className="text-synthwave-text-secondary">
                                    Total Sets:
                                  </span>
                                  <span className="text-synthwave-neon-cyan font-medium">
                                    {bodybuildingData.exercises.reduce(
                                      (sum, ex) => sum + (ex.sets?.length || 0),
                                      0,
                                    )}
                                  </span>
                                </div>
                              )}
                          </>
                        )}

                        {/* Hyrox specific fields */}
                        {hyroxData && (
                          <>
                            {hyroxData.race_or_training && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Type:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {hyroxData.race_or_training}
                                </span>
                              </div>
                            )}
                            {hyroxData.division && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Division:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {hyroxData.division}
                                </span>
                              </div>
                            )}
                            {hyroxData.total_time && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Total Time:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {Math.floor(hyroxData.total_time / 60)}:
                                  {String(hyroxData.total_time % 60).padStart(
                                    2,
                                    "0",
                                  )}
                                </span>
                              </div>
                            )}
                            {hyroxData.stations?.length && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Stations:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {hyroxData.stations.length}
                                </span>
                              </div>
                            )}
                            {hyroxData.runs?.length && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Runs:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {hyroxData.runs.length}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Olympic Weightlifting specific fields */}
                        {olympicWeightliftingData && (
                          <>
                            {olympicWeightliftingData.session_type && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Session Type:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {olympicWeightliftingData.session_type.replace(
                                    /_/g,
                                    " ",
                                  )}
                                </span>
                              </div>
                            )}
                            {olympicWeightliftingData.competition_prep !==
                              undefined && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Competition Prep:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {olympicWeightliftingData.competition_prep
                                    ? "Yes"
                                    : "No"}
                                </span>
                              </div>
                            )}
                            {olympicWeightliftingData.lifts?.length && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Lifts:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {olympicWeightliftingData.lifts.length}
                                </span>
                              </div>
                            )}
                            {olympicWeightliftingData.lifts &&
                              olympicWeightliftingData.lifts.length > 0 && (
                                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                  <span className="text-synthwave-text-secondary">
                                    Total Sets:
                                  </span>
                                  <span className="text-synthwave-neon-cyan font-medium">
                                    {olympicWeightliftingData.lifts.reduce(
                                      (sum, lift) =>
                                        sum + (lift.sets?.length || 0),
                                      0,
                                    )}
                                  </span>
                                </div>
                              )}
                          </>
                        )}

                        {/* Functional Bodybuilding specific fields */}
                        {functionalBodybuildingData && (
                          <>
                            {functionalBodybuildingData.session_focus && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Session Focus:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {functionalBodybuildingData.session_focus.replace(
                                    /_/g,
                                    " ",
                                  )}
                                </span>
                              </div>
                            )}
                            {functionalBodybuildingData.methodology && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Methodology:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {functionalBodybuildingData.methodology.replace(
                                    /_/g,
                                    " ",
                                  )}
                                </span>
                              </div>
                            )}
                            {functionalBodybuildingData.exercises?.length && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Exercises:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {functionalBodybuildingData.exercises.length}
                                </span>
                              </div>
                            )}
                            {functionalBodybuildingData.exercises &&
                              functionalBodybuildingData.exercises.length >
                                0 && (
                                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                  <span className="text-synthwave-text-secondary">
                                    Total Sets:
                                  </span>
                                  <span className="text-synthwave-neon-cyan font-medium">
                                    {functionalBodybuildingData.exercises.reduce(
                                      (sum, ex) => sum + (ex.sets?.length || 0),
                                      0,
                                    )}
                                  </span>
                                </div>
                              )}
                          </>
                        )}

                        {/* Calisthenics specific fields */}
                        {calisthenicsData && (
                          <>
                            {calisthenicsData.session_focus && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Session Focus:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {calisthenicsData.session_focus}
                                </span>
                              </div>
                            )}
                            {calisthenicsData.exercises?.length && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Exercises:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {calisthenicsData.exercises.length}
                                </span>
                              </div>
                            )}
                            {calisthenicsData.exercises &&
                              calisthenicsData.exercises.length > 0 && (
                                <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                  <span className="text-synthwave-text-secondary">
                                    Total Sets:
                                  </span>
                                  <span className="text-synthwave-neon-cyan font-medium">
                                    {calisthenicsData.exercises.reduce(
                                      (sum, ex) => sum + (ex.sets?.length || 0),
                                      0,
                                    )}
                                  </span>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 8: Subjective Feedback */}
          <div
            className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}
          >
            {/* Section Header - Collapsible */}
            <div
              className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
                collapsedSections.has(8) ? "rounded-2xl" : "rounded-t-2xl"
              }`}
              onClick={() => toggleCollapse(8)}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsedSections.has(8)}
              aria-controls="subjective-feedback-content"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCollapse(8);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Subjective Feedback
                </h3>
              </div>
              <svg
                className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(8) ? "rotate-180" : ""}`}
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

            {/* Content */}
            {!collapsedSections.has(8) && (
              <div
                id="subjective-feedback-content"
                className="px-6 pb-6 space-y-4"
              >
                {workoutData.subjective_feedback ? (
                  <>
                    {/* Subsection 1: Feedback Scores */}
                    {(workoutData.subjective_feedback.enjoyment ||
                      workoutData.subjective_feedback.difficulty ||
                      workoutData.subjective_feedback.form_quality ||
                      workoutData.subjective_feedback.motivation ||
                      workoutData.subjective_feedback.confidence ||
                      workoutData.subjective_feedback.mental_state) && (
                      <div>
                        <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                          Feedback Scores
                        </h4>
                        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                            {workoutData.subjective_feedback.enjoyment && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Enjoyment:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {workoutData.subjective_feedback.enjoyment}/10
                                </span>
                              </div>
                            )}
                            {workoutData.subjective_feedback.difficulty && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Difficulty:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {workoutData.subjective_feedback.difficulty}
                                  /10
                                </span>
                              </div>
                            )}
                            {workoutData.subjective_feedback.form_quality && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Form Quality:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {workoutData.subjective_feedback.form_quality}
                                  /10
                                </span>
                              </div>
                            )}
                            {workoutData.subjective_feedback.motivation && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Motivation:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {workoutData.subjective_feedback.motivation}
                                  /10
                                </span>
                              </div>
                            )}
                            {workoutData.subjective_feedback.confidence && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Confidence:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {workoutData.subjective_feedback.confidence}
                                  /10
                                </span>
                              </div>
                            )}
                            {workoutData.subjective_feedback.mental_state && (
                              <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                <span className="text-synthwave-text-secondary">
                                  Mental State:
                                </span>
                                <span className="text-synthwave-neon-cyan font-medium">
                                  {workoutData.subjective_feedback.mental_state}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subsection 2: Notes and Soreness */}
                    {(workoutData.subjective_feedback.notes ||
                      workoutData.subjective_feedback.soreness_pre ||
                      workoutData.subjective_feedback.soreness_post) && (
                      <div>
                        <button
                          onClick={() => toggleSubsection("physical-notes")}
                          className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                        >
                          <span>Physical Notes</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              collapsedSubsections.has("physical-notes")
                                ? "rotate-180"
                                : ""
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
                        {!collapsedSubsections.has("physical-notes") && (
                          <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 space-y-3 animate-fadeIn">
                            {workoutData.subjective_feedback.notes && (
                              <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                                {workoutData.subjective_feedback.notes}
                              </div>
                            )}

                            {(workoutData.subjective_feedback.soreness_pre ||
                              workoutData.subjective_feedback
                                .soreness_post) && (
                              <div className="grid grid-cols-2 gap-4">
                                {workoutData.subjective_feedback
                                  .soreness_pre && (
                                  <div>
                                    <div className="text-synthwave-neon-cyan font-rajdhani text-xs uppercase font-semibold mb-1">
                                      Pre-Workout Soreness
                                    </div>
                                    <div className="space-y-1">
                                      {workoutData.subjective_feedback
                                        .soreness_pre.overall && (
                                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                          <span className="text-synthwave-text-secondary">
                                            Overall:
                                          </span>
                                          <span className="text-synthwave-neon-cyan font-medium">
                                            {
                                              workoutData.subjective_feedback
                                                .soreness_pre.overall
                                            }
                                            /10
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {workoutData.subjective_feedback
                                  .soreness_post && (
                                  <div>
                                    <div className="text-synthwave-neon-cyan font-rajdhani text-xs uppercase font-semibold mb-1">
                                      Post-Workout Soreness
                                    </div>
                                    <div className="space-y-1">
                                      {workoutData.subjective_feedback
                                        .soreness_post.overall && (
                                        <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                                          <span className="text-synthwave-text-secondary">
                                            Overall:
                                          </span>
                                          <span className="text-synthwave-neon-cyan font-medium">
                                            {
                                              workoutData.subjective_feedback
                                                .soreness_post.overall
                                            }
                                            /10
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={containerPatterns.coachNotesSection}>
                    <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                      No subjective feedback recorded for this workout.{" "}
                      <span className="text-synthwave-neon-cyan">
                        When logging workouts, mention how you felt
                      </span>{" "}
                      (e.g., "enjoyed it 8/10, felt challenging at 7/10, form
                      quality was good") and the AI will automatically extract
                      this feedback.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discipline-Specific Section (Conditionally Rendered) */}
          {DisciplineComponent &&
            (() => {
              // Map discipline names to correct prop names and configurations
              const disciplineProps = {
                crossfit: {
                  crossfitData: disciplineData,
                  sectionId: 4,
                  toggleSubsection,
                  collapsedSubsections,
                },
                powerlifting: {
                  powerliftingData: disciplineData,
                  sectionId: 5,
                  toggleSubsection,
                  collapsedSubsections,
                },
                running: {
                  runningData: disciplineData,
                  sectionIds: [6, 7], // Special case: Running uses array
                },
                bodybuilding: {
                  bodybuildingData: disciplineData,
                  sectionId: "bodybuilding",
                  toggleSubsection,
                  collapsedSubsections,
                },
                hyrox: {
                  hyroxData: disciplineData,
                  sectionId: "hyrox",
                },
                olympic_weightlifting: {
                  olympicWeightliftingData: disciplineData,
                  sectionId: "olympic",
                  toggleSubsection,
                  collapsedSubsections,
                },
                functional_bodybuilding: {
                  functionalBodybuildingData: disciplineData,
                  sectionId: "funcbb",
                  toggleSubsection,
                  collapsedSubsections,
                },
                calisthenics: {
                  calisthenicsData: disciplineData,
                  sectionId: "calisthenics",
                  toggleSubsection,
                  collapsedSubsections,
                },
                hybrid: {
                  hybridData: disciplineData,
                  sectionId: "hybrid",
                  toggleSubsection,
                  collapsedSubsections,
                },
                functional_fitness: {
                  crossfitData: disciplineData,
                  sectionId: 4,
                  toggleSubsection,
                  collapsedSubsections,
                },
              };

              const specificProps = disciplineProps[discipline] || {};

              return (
                <DisciplineComponent
                  {...specificProps}
                  collapsedSections={collapsedSections}
                  toggleCollapse={toggleCollapse}
                  containerPatterns={containerPatterns}
                />
              );
            })()}
        </div>

        {/* Right column - 40% (2 of 5 columns) */}
        <div className="lg:col-span-2">
          {/* Section 2: Personal Insights */}
          <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
            {/* Section Header - Collapsible */}
            <div
              className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
                collapsedSections.has(2) ? "rounded-2xl" : "rounded-t-2xl"
              }`}
              onClick={() => toggleCollapse(2)}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsedSections.has(2)}
              aria-controls="personal-insights-content"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCollapse(2);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Personal Insights
                </h3>
              </div>
              <svg
                className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(2) ? "rotate-180" : ""}`}
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

            {/* Content */}
            {!collapsedSections.has(2) && (
              <div
                id="personal-insights-content"
                className="px-6 pb-6 space-y-4"
              >
                {/* Subsection: Personal Feedback */}
                {(workoutData.performance_metrics?.intensity ||
                  workoutData.performance_metrics?.perceived_exertion ||
                  workoutData.performance_metrics?.mood_pre ||
                  workoutData.performance_metrics?.mood_post ||
                  workoutData.performance_metrics?.energy_level_pre ||
                  workoutData.performance_metrics?.energy_level_post) && (
                  <div>
                    <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                      Personal Feedback
                    </h4>
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {/* Intensity */}
                        {workoutData.performance_metrics?.intensity && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Intensity:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.performance_metrics.intensity}/10
                            </span>
                          </div>
                        )}

                        {/* RPE */}
                        {workoutData.performance_metrics
                          ?.perceived_exertion && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              RPE:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {
                                workoutData.performance_metrics
                                  .perceived_exertion
                              }
                              /10
                            </span>
                          </div>
                        )}

                        {/* Pre-Mood */}
                        {workoutData.performance_metrics?.mood_pre && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Pre-Mood:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.performance_metrics.mood_pre}/10
                            </span>
                          </div>
                        )}

                        {/* Post-Mood */}
                        {workoutData.performance_metrics?.mood_post && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Post-Mood:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.performance_metrics.mood_post}/10
                            </span>
                          </div>
                        )}

                        {/* Pre-Energy */}
                        {workoutData.performance_metrics?.energy_level_pre && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Pre-Energy:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.performance_metrics.energy_level_pre}
                              /10
                            </span>
                          </div>
                        )}

                        {/* Post-Energy */}
                        {workoutData.performance_metrics?.energy_level_post && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Post-Energy:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {
                                workoutData.performance_metrics
                                  .energy_level_post
                              }
                              /10
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subsection: The Breakdown - Collapsible */}
                {workout.summary && (
                  <div>
                    <button
                      onClick={() => toggleSubsection("the-breakdown")}
                      className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                    >
                      <span>The Breakdown</span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          collapsedSubsections.has("the-breakdown")
                            ? "rotate-180"
                            : ""
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
                    {!collapsedSubsections.has("the-breakdown") && (
                      <div
                        className={`${containerPatterns.coachNotesSection} animate-fadeIn`}
                      >
                        <div className="text-synthwave-text-secondary font-rajdhani text-sm leading-relaxed">
                          {workout.summary}
                        </div>
                        <div className="mt-3 p-3 bg-synthwave-bg-primary/30 rounded border border-synthwave-neon-cyan/20">
                          <span className="text-synthwave-neon-cyan font-rajdhani text-sm font-medium">
                            Generated by AI
                          </span>
                          <span className="text-synthwave-text-secondary font-rajdhani text-sm">
                            {" "}
                            • Provides contextual overview of workout
                            performance and key highlights
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: PR Achievements */}
          <div
            className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}
          >
            {/* Section Header - Collapsible */}
            <div
              className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
                collapsedSections.has(3) ? "rounded-2xl" : "rounded-t-2xl"
              }`}
              onClick={() => toggleCollapse(3)}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsedSections.has(3)}
              aria-controls="pr-achievements-content"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCollapse(3);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  PR Achievements
                  {workoutData.pr_achievements &&
                    workoutData.pr_achievements.length > 0 &&
                    ` (${workoutData.pr_achievements.length})`}
                </h3>
              </div>
              <svg
                className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(3) ? "rotate-180" : ""}`}
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

            {/* Content */}
            {!collapsedSections.has(3) && (
              <div id="pr-achievements-content" className="px-6 pb-6">
                {workoutData.pr_achievements &&
                workoutData.pr_achievements.length > 0 ? (
                  <div className="space-y-3">
                    {workoutData.pr_achievements.map((pr, index) => (
                      <div
                        key={index}
                        className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-rajdhani font-bold text-synthwave-neon-pink text-base capitalize">
                            {pr.exercise}{" "}
                            {pr.pr_type && `(${pr.pr_type.replace(/_/g, " ")})`}
                          </h4>
                          <span
                            className={`${badgePatterns.workoutBadgeBase} ${
                              pr.significance === "major"
                                ? badgePatterns.workoutBadgePink
                                : pr.significance === "moderate"
                                  ? badgePatterns.workoutBadgeCyan
                                  : badgePatterns.workoutBadgeMuted
                            }`}
                          >
                            {pr.significance}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {pr.previous_best && (
                            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                              <span className="text-synthwave-text-secondary">
                                Previous:
                              </span>
                              <span className="text-synthwave-neon-cyan font-medium">
                                {pr.previous_best}
                              </span>
                            </div>
                          )}
                          {pr.new_best && (
                            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                              <span className="text-synthwave-text-secondary">
                                New:
                              </span>
                              <span className="text-synthwave-neon-cyan font-medium">
                                {pr.new_best}
                              </span>
                            </div>
                          )}
                          {pr.improvement && (
                            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                              <span className="text-synthwave-text-secondary">
                                Improvement:
                              </span>
                              <span className="text-synthwave-neon-cyan font-medium">
                                {pr.improvement}
                              </span>
                            </div>
                          )}
                          {pr.improvement_percentage && (
                            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                              <span className="text-synthwave-text-secondary">
                                %:
                              </span>
                              <span className="text-synthwave-neon-cyan font-medium">
                                {pr.improvement_percentage}%
                              </span>
                            </div>
                          )}
                        </div>

                        {pr.context && (
                          <div className="mt-2 text-synthwave-text-secondary font-rajdhani text-sm">
                            {pr.context}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={containerPatterns.coachNotesSection}>
                    <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                      No PR achievements recorded for this workout.{" "}
                      <span className="text-synthwave-neon-cyan">
                        When you log workouts and mention hitting new personal
                        records
                      </span>{" "}
                      (e.g., "hit a new 1RM on back squat at 315lbs"), the AI
                      will automatically detect and track them here.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 9: Coach Notes */}
          <div
            className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}
          >
            <div
              className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
                collapsedSections.has(9) ? "rounded-2xl" : "rounded-t-2xl"
              }`}
              onClick={() => toggleCollapse(9)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Coach Notes
                </h3>
              </div>
              <svg
                className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(9) ? "rotate-180" : ""}`}
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
            {!collapsedSections.has(9) && (
              <div className="px-6 pb-6 space-y-4">
                {workoutData.coach_notes ? (
                  <>
                    {/* Subsection 1: Programming Intent - Collapsible */}
                    {workoutData.coach_notes.programming_intent && (
                      <div>
                        <button
                          onClick={() => toggleSubsection("programming-intent")}
                          className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                        >
                          <span>Programming Intent</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              collapsedSubsections.has("programming-intent")
                                ? "rotate-180"
                                : ""
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
                        {!collapsedSubsections.has("programming-intent") && (
                          <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                            <div className="text-synthwave-text-secondary font-rajdhani text-sm leading-relaxed">
                              {workoutData.coach_notes.programming_intent}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subsection 2: Positive Observations - Collapsible */}
                    {workoutData.coach_notes.positive_observations &&
                      workoutData.coach_notes.positive_observations.length >
                        0 && (
                        <div>
                          <button
                            onClick={() =>
                              toggleSubsection("positive-observations")
                            }
                            className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                          >
                            <span>Positive Observations</span>
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${
                                collapsedSubsections.has(
                                  "positive-observations",
                                )
                                  ? "rotate-180"
                                  : ""
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
                          {!collapsedSubsections.has(
                            "positive-observations",
                          ) && (
                            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                              <ul className="space-y-2">
                                {workoutData.coach_notes.positive_observations.map(
                                  (observation, index) => (
                                    <li
                                      key={index}
                                      className="text-synthwave-text-secondary font-rajdhani text-sm flex items-start gap-2"
                                    >
                                      <span className="text-synthwave-neon-cyan mt-0.5">
                                        •
                                      </span>
                                      <span className="flex-1">
                                        {observation}
                                      </span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Subsection 3: Areas for Improvement - Collapsible */}
                    {workoutData.coach_notes.areas_for_improvement &&
                      workoutData.coach_notes.areas_for_improvement.length >
                        0 && (
                        <div>
                          <button
                            onClick={() =>
                              toggleSubsection("areas-for-improvement")
                            }
                            className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                          >
                            <span>Areas for Improvement</span>
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${
                                collapsedSubsections.has(
                                  "areas-for-improvement",
                                )
                                  ? "rotate-180"
                                  : ""
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
                          {!collapsedSubsections.has(
                            "areas-for-improvement",
                          ) && (
                            <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                              <ul className="space-y-2">
                                {workoutData.coach_notes.areas_for_improvement.map(
                                  (area, index) => (
                                    <li
                                      key={index}
                                      className="text-synthwave-text-secondary font-rajdhani text-sm flex items-start gap-2"
                                    >
                                      <span className="text-synthwave-neon-cyan mt-0.5">
                                        •
                                      </span>
                                      <span className="flex-1">{area}</span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Subsection 4: Next Session Focus - Collapsible */}
                    {workoutData.coach_notes.next_session_focus && (
                      <div>
                        <button
                          onClick={() => toggleSubsection("next-session-focus")}
                          className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                        >
                          <span>Next Session Focus</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              collapsedSubsections.has("next-session-focus")
                                ? "rotate-180"
                                : ""
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
                        {!collapsedSubsections.has("next-session-focus") && (
                          <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                            <div className="text-synthwave-text-secondary font-rajdhani text-sm leading-relaxed">
                              {workoutData.coach_notes.next_session_focus}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={containerPatterns.coachNotesSection}>
                    <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                      No coach notes available for this workout.{" "}
                      <span className="text-synthwave-neon-cyan">
                        Coach notes are typically added to workout templates
                      </span>{" "}
                      in training programs and provide guidance on technique,
                      pacing, and strategy.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 10: Extraction Notes */}
          <div
            className={`${containerPatterns.cardMedium} overflow-hidden mt-6`}
          >
            <div
              className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
                collapsedSections.has(10) ? "rounded-2xl" : "rounded-t-2xl"
              }`}
              onClick={() => toggleCollapse(10)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 rounded-full bg-synthwave-neon-pink flex-shrink-0 mt-2" />
                <h3 className="font-russo font-bold text-white text-lg uppercase">
                  Extraction Notes
                </h3>
              </div>
              <svg
                className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(10) ? "rotate-180" : ""}`}
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
            {!collapsedSections.has(10) && (
              <div className="px-6 pb-6 space-y-4">
                {/* Subsection 1: Extraction Summary */}
                <div>
                  <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
                    Extraction Summary
                  </h4>
                  <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                    <div className="text-synthwave-text-secondary font-rajdhani text-sm">
                      {workoutData.metadata?.extraction_notes || (
                        <>
                          No extraction notes available.{" "}
                          <span className="text-synthwave-neon-cyan">
                            Extraction notes contain details about how the AI
                            processed your workout log
                          </span>{" "}
                          and are automatically generated when you log workouts
                          through conversation with your coach.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subsection 2: Quality Metrics - Collapsible */}
                <div>
                  <button
                    onClick={() => toggleSubsection("quality-metrics")}
                    className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                  >
                    <span>Quality Metrics</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        collapsedSubsections.has("quality-metrics")
                          ? "rotate-180"
                          : ""
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
                  {!collapsedSubsections.has("quality-metrics") && (
                    <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                        {/* Confidence */}
                        {workoutData.metadata?.data_confidence !==
                          undefined && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Confidence:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {Math.round(
                                workoutData.metadata.data_confidence * 100,
                              )}
                              %
                            </span>
                          </div>
                        )}

                        {/* Completeness */}
                        {workoutData.metadata?.data_completeness !==
                          undefined && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Completeness:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {Math.round(
                                workoutData.metadata.data_completeness * 100,
                              )}
                              %
                            </span>
                          </div>
                        )}

                        {/* Schema Version */}
                        {workoutData.metadata?.schema_version && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Schema:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.metadata.schema_version}
                            </span>
                          </div>
                        )}

                        {/* AI Extracted */}
                        {workoutData.metadata?.ai_extracted !== undefined && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              AI Extracted:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.metadata.ai_extracted ? "Yes" : "No"}
                            </span>
                          </div>
                        )}

                        {/* User Verified */}
                        {workoutData.metadata?.user_verified !== undefined && (
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Verified:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.metadata.user_verified
                                ? "Yes"
                                : "No"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Extraction Method - On its own line */}
                      {workoutData.metadata?.extraction_method && (
                        <div className="mt-3">
                          <div className="flex items-center gap-1.5 font-rajdhani text-sm">
                            <span className="text-synthwave-text-secondary">
                              Method:
                            </span>
                            <span className="text-synthwave-neon-cyan font-medium">
                              {workoutData.metadata.extraction_method}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Validation Flags */}
                      {workoutData.metadata?.validation_flags &&
                        workoutData.metadata.validation_flags.length > 0 && (
                          <div className="mt-3">
                            <div className="text-synthwave-neon-cyan font-rajdhani font-semibold text-xs uppercase mb-2">
                              Validation Flags
                            </div>
                            <ul className="space-y-1">
                              {workoutData.metadata.validation_flags.map(
                                (flag, index) => (
                                  <li
                                    key={index}
                                    className="text-synthwave-text-muted font-rajdhani text-sm flex items-start space-x-2"
                                  >
                                    <span className="text-synthwave-neon-cyan">
                                      •
                                    </span>
                                    <span>{flag.replace(/_/g, " ")}</span>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Subsection 3: Extraction Tips - Collapsible */}
                {workoutData.metadata?.data_completeness !== undefined &&
                  workoutData.metadata.data_completeness < 0.8 && (
                    <div>
                      <button
                        onClick={() => toggleSubsection("extraction-tips")}
                        className="w-full flex items-center justify-between font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2 hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer"
                      >
                        <span>Extraction Tips</span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            collapsedSubsections.has("extraction-tips")
                              ? "rotate-180"
                              : ""
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
                      {!collapsedSubsections.has("extraction-tips") && (
                        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4 animate-fadeIn">
                          <div className="flex items-start space-x-2">
                            <div className="flex-1">
                              <h5 className="text-synthwave-neon-cyan font-rajdhani font-bold text-sm mb-2">
                                Improve Your Data Completeness (Currently{" "}
                                {Math.round(
                                  workoutData.metadata.data_completeness * 100,
                                )}
                                %)
                              </h5>
                              <p className="text-synthwave-text-secondary font-rajdhani text-xs mb-2">
                                To get a more complete workout record, try
                                including these details in your next workout
                                log:
                              </p>
                              <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-xs">
                                {!workoutData.subjective_feedback
                                  ?.enjoyment && (
                                  <li className="flex items-start space-x-2">
                                    <span className="text-synthwave-neon-cyan">
                                      •
                                    </span>
                                    <span>
                                      <span className="text-white">
                                        Enjoyment:
                                      </span>{" "}
                                      How much you enjoyed the workout (1-10)
                                    </span>
                                  </li>
                                )}
                                {!workoutData.subjective_feedback
                                  ?.difficulty && (
                                  <li className="flex items-start space-x-2">
                                    <span className="text-synthwave-neon-cyan">
                                      •
                                    </span>
                                    <span>
                                      <span className="text-white">
                                        Difficulty:
                                      </span>{" "}
                                      How challenging it felt (1-10)
                                    </span>
                                  </li>
                                )}
                                {!workoutData.subjective_feedback?.notes && (
                                  <li className="flex items-start space-x-2">
                                    <span className="text-synthwave-neon-cyan">
                                      •
                                    </span>
                                    <span>
                                      <span className="text-white">
                                        Personal Notes:
                                      </span>{" "}
                                      How you felt, what went well, areas to
                                      improve
                                    </span>
                                  </li>
                                )}
                                {!workoutData.performance_metrics
                                  ?.perceived_exertion && (
                                  <li className="flex items-start space-x-2">
                                    <span className="text-synthwave-neon-cyan">
                                      •
                                    </span>
                                    <span>
                                      <span className="text-white">RPE:</span>{" "}
                                      Rate of Perceived Exertion (1-10)
                                    </span>
                                  </li>
                                )}
                              </ul>
                              <p className="text-synthwave-neon-cyan font-rajdhani text-xs mt-2 italic">
                                Just tell your coach naturally - e.g., "I
                                enjoyed it 8/10, felt challenging at 7/10, and I
                                got about 7 hours of sleep last night"
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 11: Raw JSON Section */}
      {viewMode === "raw" && (
        <div className={`${containerPatterns.cardMedium} overflow-hidden`}>
          <div
            className={`flex items-start justify-between p-6 cursor-pointer hover:bg-synthwave-bg-card/40 transition-all duration-300 ${
              collapsedSections.has(11) ? "rounded-2xl" : "rounded-t-2xl"
            }`}
            onClick={() => toggleCollapse(11)}
          >
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-synthwave-neon-cyan flex-shrink-0 mt-2" />
              <h3 className="font-russo font-bold text-white text-lg uppercase">
                Raw Workout Data
              </h3>
            </div>
            <svg
              className={`w-5 h-5 text-synthwave-neon-cyan transition-transform duration-200 ${collapsedSections.has(11) ? "rotate-180" : ""}`}
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
          {!collapsedSections.has(11) && (
            <div className="px-6 pb-6">
              <pre className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded-lg p-4 text-synthwave-text-primary font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(workout, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkoutViewer;
