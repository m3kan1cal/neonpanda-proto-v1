/**
 * Exercise Extraction Module
 *
 * Extracts individual exercise records from workout data across all disciplines.
 * Each extractor handles discipline-specific data structures and flattens them
 * into the common ExtractedExercise format.
 */

import type {
  UniversalWorkoutSchema,
  CrossFitWorkout,
  CrossFitExercise,
  PowerliftingWorkout,
  BodybuildingWorkout,
  BodybuildingExercise,
  RunningWorkout,
  HyroxWorkout,
  OlympicWeightliftingWorkout,
  OlympicLift,
  FunctionalBodybuildingWorkout,
  FunctionalBodybuildingExercise,
  CalisthenicsWorkout,
  CalisthenicsExercise,
} from "../workout/types";
import type {
  ExtractedExercise,
  ExerciseExtractionResult,
  ExerciseDiscipline,
  ExerciseMetrics,
} from "./types";

/**
 * Main extraction function - routes to discipline-specific extractors
 */
export function extractExercisesFromWorkout(
  workoutData: UniversalWorkoutSchema,
): ExerciseExtractionResult {
  const discipline =
    workoutData.discipline?.toLowerCase() as ExerciseDiscipline;
  const disciplineSpecific = workoutData.discipline_specific;

  if (!disciplineSpecific) {
    console.warn("No discipline_specific data found in workout");
    return {
      exercises: [],
      discipline: discipline || "crossfit",
      extractionMethod: "none",
    };
  }

  switch (discipline) {
    case "crossfit":
      return extractCrossFitExercises(disciplineSpecific.crossfit, discipline);

    case "powerlifting":
      return extractPowerliftingExercises(
        disciplineSpecific.powerlifting,
        discipline,
      );

    case "bodybuilding":
      return extractBodybuildingExercises(
        disciplineSpecific.bodybuilding,
        discipline,
      );

    case "running":
      return extractRunningExercises(disciplineSpecific.running, discipline);

    case "hyrox":
      return extractHyroxExercises(disciplineSpecific.hyrox, discipline);

    case "olympic_weightlifting":
      return extractOlympicWeightliftingExercises(
        disciplineSpecific.olympic_weightlifting,
        discipline,
      );

    case "functional_bodybuilding":
      return extractFunctionalBodybuildingExercises(
        disciplineSpecific.functional_bodybuilding,
        discipline,
      );

    case "calisthenics":
      return extractCalisthenicsExercises(
        disciplineSpecific.calisthenics,
        discipline,
      );

    default:
      console.warn(
        `Unknown discipline: ${discipline}, attempting generic extraction`,
      );
      return extractGenericExercises(
        disciplineSpecific,
        discipline || "crossfit",
      );
  }
}

/**
 * CrossFit exercise extraction
 * Extracts exercises from rounds structure
 */
function extractCrossFitExercises(
  crossfit: CrossFitWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!crossfit?.rounds) {
    return { exercises: [], discipline, extractionMethod: "crossfit_empty" };
  }

  const exercises: ExtractedExercise[] = [];

  for (const round of crossfit.rounds) {
    for (const exercise of round.exercises || []) {
      // Skip exercises without names
      if (!exercise.exercise_name) {
        console.warn(
          "⚠️ Skipping CrossFit exercise without name in round",
          round.round_number,
        );
        continue;
      }

      const metrics = extractCrossFitMetrics(exercise);

      exercises.push({
        originalName: exercise.exercise_name,
        discipline,
        metrics,
        sourceRound: round.round_number,
        notes: exercise.form_notes,
      });
    }
  }

  return { exercises, discipline, extractionMethod: "crossfit_rounds" };
}

function extractCrossFitMetrics(exercise: CrossFitExercise): ExerciseMetrics {
  const metrics: ExerciseMetrics = {
    movementType: exercise.movement_type,
    variation: exercise.variation,
  };

  // Weight
  if (exercise.weight) {
    metrics.weight = exercise.weight.value;
    metrics.weightUnit = exercise.weight.unit;
    metrics.percentage1rm = exercise.weight.percentage_1rm;
  }

  // Reps
  if (exercise.reps) {
    metrics.reps =
      typeof exercise.reps.completed === "number"
        ? exercise.reps.completed
        : undefined;
  }

  // Distance/time/calories for cardio movements
  if (exercise.distance) metrics.distance = exercise.distance;
  if (exercise.time) metrics.time = exercise.time;
  if (exercise.calories) metrics.calories = exercise.calories;

  // RX status from parent
  metrics.rxStatus = undefined; // Set at workout level, not exercise

  return metrics;
}

/**
 * Powerlifting exercise extraction
 * Extracts exercises with sets and attempt tracking
 */
function extractPowerliftingExercises(
  powerlifting: PowerliftingWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!powerlifting) {
    return {
      exercises: [],
      discipline,
      extractionMethod: "powerlifting_empty",
    };
  }

  const exercises: ExtractedExercise[] = [];

  // Powerlifting structure varies - handle common patterns
  const exerciseList = (powerlifting as any).exercises || [];
  for (const exercise of exerciseList) {
    // Skip exercises without names
    if (!exercise.exercise_name) {
      console.warn("⚠️ Skipping Powerlifting exercise without name");
      continue;
    }

    const sets = exercise.sets || [];
    let totalReps = 0;
    let maxWeight = 0;
    let totalVolume = 0;

    for (const set of sets) {
      const reps = set.reps || 0;
      const weight = set.weight || 0;
      totalReps += reps;
      totalVolume += reps * weight;
      if (weight > maxWeight) maxWeight = weight;
    }

    const metrics: ExerciseMetrics = {
      weight: maxWeight,
      weightUnit: sets[0]?.weight_unit || "lbs",
      reps: totalReps,
      sets: sets.length,
      totalVolume,
      maxWeight,
      rpe: exercise.rpe,
      movementCategory: exercise.movement_category || "main_lift",
      equipment: exercise.equipment,
    };

    // Handle attempts if present (competition format)
    if (exercise.attempts) {
      metrics.attempts = {
        opener: exercise.attempts.opener,
        second: exercise.attempts.second_attempt,
        third: exercise.attempts.third_attempt,
        successful: exercise.attempts.successful_attempts,
        missed: exercise.attempts.missed_attempts,
      };
    }

    exercises.push({
      originalName: exercise.exercise_name,
      discipline,
      metrics,
      notes: exercise.technique_notes,
    });
  }

  return { exercises, discipline, extractionMethod: "powerlifting_exercises" };
}

/**
 * Bodybuilding exercise extraction
 * Extracts exercises with sets, tempo, and TUT tracking
 */
function extractBodybuildingExercises(
  bodybuilding: BodybuildingWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!bodybuilding?.exercises) {
    return {
      exercises: [],
      discipline,
      extractionMethod: "bodybuilding_empty",
    };
  }

  const exercises: ExtractedExercise[] = [];

  for (const exercise of bodybuilding.exercises) {
    // Skip exercises without names
    if (!exercise.exercise_name) {
      console.warn("⚠️ Skipping Bodybuilding exercise without name");
      continue;
    }

    const metrics = extractBodybuildingMetrics(exercise);

    exercises.push({
      originalName: exercise.exercise_name,
      discipline,
      metrics,
      notes: undefined,
    });
  }

  return { exercises, discipline, extractionMethod: "bodybuilding_exercises" };
}

function extractBodybuildingMetrics(
  exercise: BodybuildingExercise,
): ExerciseMetrics {
  const sets = exercise.sets || [];
  let totalReps = 0;
  let maxWeight = 0;
  let totalVolume = 0;
  let totalTut = 0;
  let hadFailure = false;

  for (const set of sets) {
    totalReps += set.reps || 0;
    const weight = set.weight || 0;
    totalVolume += (set.reps || 0) * weight;
    if (weight > maxWeight) maxWeight = weight;
    if (set.time_under_tension) totalTut += set.time_under_tension;
    if (set.failure) hadFailure = true;
  }

  const metrics: ExerciseMetrics = {
    weight: maxWeight,
    weightUnit: sets[0]?.weight_unit || "lbs",
    reps: totalReps,
    sets: sets.length,
    totalVolume,
    maxWeight,
    movementCategory: exercise.movement_category,
    targetMuscles: exercise.target_muscles,
    supersetWith: exercise.superset_with || undefined,
    failure: hadFailure || undefined,
  };

  // Get tempo and TUT from first set if available
  if (sets[0]?.tempo) metrics.tempo = sets[0].tempo;
  if (totalTut > 0) metrics.timeUnderTension = totalTut;

  return metrics;
}

/**
 * Running exercise extraction
 * Treats run type as the exercise name with distance/pace metrics
 */
function extractRunningExercises(
  running: RunningWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!running) {
    return { exercises: [], discipline, extractionMethod: "running_empty" };
  }

  const exercises: ExtractedExercise[] = [];

  // Main run as an exercise - validate run_type exists
  if (running.run_type) {
    const runTypeName = `${running.run_type}_run`;
    const mainMetrics: ExerciseMetrics = {
      distance: running.total_distance,
      distanceUnit: running.distance_unit,
      time: running.total_time,
      pace: running.average_pace,
      elevationGain: running.elevation_gain,
      surface: running.surface,
    };

    exercises.push({
      originalName: runTypeName,
      discipline,
      metrics: mainMetrics,
    });
  } else {
    console.warn("⚠️ Skipping Running exercise without run_type");
  }

  // Also extract individual segments if they have different types
  if (running.segments) {
    for (const segment of running.segments) {
      // Skip segments without type or main/working segments
      if (
        !segment.segment_type ||
        segment.segment_type === "main" ||
        segment.segment_type === "working"
      ) {
        continue;
      }

      const segmentMetrics: ExerciseMetrics = {
        distance: segment.distance,
        distanceUnit: running.distance_unit,
        time: segment.time,
        pace: segment.pace,
      };

      exercises.push({
        originalName: `${segment.segment_type}_segment`,
        discipline,
        metrics: segmentMetrics,
        sourceSegment: segment.segment_number,
      });
    }
  }

  return { exercises, discipline, extractionMethod: "running_segments" };
}

/**
 * Hyrox exercise extraction
 * Extracts stations and runs as separate exercises
 */
function extractHyroxExercises(
  hyrox: HyroxWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!hyrox) {
    return { exercises: [], discipline, extractionMethod: "hyrox_empty" };
  }

  const exercises: ExtractedExercise[] = [];

  // Extract stations
  for (const station of hyrox.stations || []) {
    // Skip stations without names
    if (!station.station_name) {
      console.warn("⚠️ Skipping Hyrox station without station_name");
      continue;
    }

    const metrics: ExerciseMetrics = {
      stationNumber: station.station_number,
      distance: station.distance || undefined,
      reps: station.reps || undefined,
      weight: station.weight || undefined,
      weightUnit: station.weight_unit || undefined,
      time: station.time || undefined,
    };

    exercises.push({
      originalName: station.station_name,
      discipline,
      metrics,
      notes: station.notes || undefined,
    });
  }

  // Extract runs
  for (const run of hyrox.runs || []) {
    // Skip runs without run_number (use != null to allow 0)
    if (run.run_number == null) {
      console.warn("⚠️ Skipping Hyrox run without run_number");
      continue;
    }

    const metrics: ExerciseMetrics = {
      distance: run.distance,
      distanceUnit: "m",
      time: run.time || undefined,
      pace: run.pace || undefined,
    };

    exercises.push({
      originalName: `hyrox_run_${run.run_number}`,
      discipline,
      metrics,
      notes: run.notes || undefined,
    });
  }

  return { exercises, discipline, extractionMethod: "hyrox_stations_runs" };
}

/**
 * Olympic Weightlifting exercise extraction
 * Extracts lifts with sets and attempt tracking
 */
function extractOlympicWeightliftingExercises(
  oly: OlympicWeightliftingWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!oly?.lifts) {
    return { exercises: [], discipline, extractionMethod: "olympic_empty" };
  }

  const exercises: ExtractedExercise[] = [];

  for (const lift of oly.lifts) {
    // Skip lifts without names
    if (!lift.lift_name) {
      console.warn("⚠️ Skipping Olympic Weightlifting lift without name");
      continue;
    }

    const metrics = extractOlympicLiftMetrics(lift);

    exercises.push({
      originalName: lift.lift_name,
      discipline,
      metrics,
      notes: lift.complex_structure || undefined,
    });
  }

  return { exercises, discipline, extractionMethod: "olympic_lifts" };
}

function extractOlympicLiftMetrics(lift: OlympicLift): ExerciseMetrics {
  const sets = lift.sets || [];
  let totalReps = 0;
  let maxWeight = 0;

  for (const set of sets) {
    totalReps += set.reps || 0;
    if (set.weight > maxWeight) maxWeight = set.weight;
  }

  const metrics: ExerciseMetrics = {
    weight: maxWeight,
    weightUnit: sets[0]?.weight_unit || "kg",
    reps: totalReps,
    sets: sets.length,
    maxWeight,
    movementCategory: lift.lift_category,
    variation: lift.variation || undefined,
  };

  // Handle competition attempts
  if (lift.attempts) {
    metrics.attempts = {
      opener: lift.attempts.opener || undefined,
      second: lift.attempts.second_attempt || undefined,
      third: lift.attempts.third_attempt || undefined,
      successful: lift.attempts.successful_attempts,
      missed: lift.attempts.missed_attempts,
    };
  }

  return metrics;
}

/**
 * Functional Bodybuilding exercise extraction
 * Extracts exercises with quality focus and tempo tracking
 */
function extractFunctionalBodybuildingExercises(
  fb: FunctionalBodybuildingWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!fb?.exercises) {
    return {
      exercises: [],
      discipline,
      extractionMethod: "functional_bb_empty",
    };
  }

  const exercises: ExtractedExercise[] = [];

  for (const exercise of fb.exercises) {
    // Skip exercises without names
    if (!exercise.exercise_name) {
      console.warn("⚠️ Skipping Functional Bodybuilding exercise without name");
      continue;
    }

    const metrics = extractFunctionalBodybuildingMetrics(exercise);

    exercises.push({
      originalName: exercise.exercise_name,
      discipline,
      metrics,
    });
  }

  return { exercises, discipline, extractionMethod: "functional_bb_exercises" };
}

function extractFunctionalBodybuildingMetrics(
  exercise: FunctionalBodybuildingExercise,
): ExerciseMetrics {
  const sets = exercise.sets || [];
  let totalReps = 0;
  let maxWeight = 0;
  let totalVolume = 0;

  for (const set of sets) {
    totalReps += set.reps || 0;
    const weight = set.weight || 0;
    totalVolume += (set.reps || 0) * weight;
    if (weight > maxWeight) maxWeight = weight;
  }

  const metrics: ExerciseMetrics = {
    weight: maxWeight,
    weightUnit: sets[0]?.weight_unit || "lbs",
    reps: totalReps,
    sets: sets.length,
    totalVolume,
    maxWeight,
    movementType: exercise.movement_pattern,
    targetMuscles: exercise.target_muscles,
    supersetWith: exercise.superset_with || undefined,
  };

  // Get tempo and quality focus from first set
  if (sets[0]?.tempo) metrics.tempo = sets[0].tempo;
  if (sets[0]?.quality_focus) {
    metrics.variation = sets[0].quality_focus; // Store quality focus in variation field
  }

  return metrics;
}

/**
 * Calisthenics exercise extraction
 * Extracts exercises with holds and progression tracking
 */
function extractCalisthenicsExercises(
  calisthenics: CalisthenicsWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!calisthenics?.exercises) {
    return {
      exercises: [],
      discipline,
      extractionMethod: "calisthenics_empty",
    };
  }

  const exercises: ExtractedExercise[] = [];

  for (const exercise of calisthenics.exercises) {
    // Skip exercises without names
    if (!exercise.exercise_name) {
      console.warn("⚠️ Skipping Calisthenics exercise without name");
      continue;
    }

    const metrics = extractCalisthenicsMetrics(exercise);

    exercises.push({
      originalName: exercise.exercise_name,
      discipline,
      metrics,
    });
  }

  return { exercises, discipline, extractionMethod: "calisthenics_exercises" };
}

function extractCalisthenicsMetrics(
  exercise: CalisthenicsExercise,
): ExerciseMetrics {
  const sets = exercise.sets || [];
  let totalReps = 0;
  let totalHoldTime = 0;
  let avgQuality = 0;
  let qualityCount = 0;

  for (const set of sets) {
    if (set.reps) totalReps += set.reps;
    if (set.hold_time) totalHoldTime += set.hold_time;
    if (set.quality_rating) {
      avgQuality += set.quality_rating;
      qualityCount++;
    }
  }

  const metrics: ExerciseMetrics = {
    reps: totalReps || undefined,
    sets: sets.length,
    holdTime: totalHoldTime || undefined,
    qualityRating: qualityCount > 0 ? avgQuality / qualityCount : undefined,
    progressionLevel: exercise.progression_level || undefined,
    assistanceMethod: exercise.assistance_method || undefined,
    movementCategory: exercise.skill_category,
  };

  return metrics;
}

/**
 * Generic extraction for unknown disciplines
 * Attempts to find exercise-like structures
 */
function extractGenericExercises(
  disciplineSpecific: any,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  const exercises: ExtractedExercise[] = [];

  // Try to find any array of exercises
  for (const key of Object.keys(disciplineSpecific)) {
    const value = disciplineSpecific[key];
    if (value && typeof value === "object") {
      // Check for exercises array
      if (Array.isArray(value.exercises)) {
        for (const ex of value.exercises) {
          if (ex.exercise_name) {
            exercises.push({
              originalName: ex.exercise_name,
              discipline,
              metrics: {},
            });
          }
        }
      }
      // Check for rounds array
      if (Array.isArray(value.rounds)) {
        for (const round of value.rounds) {
          if (Array.isArray(round.exercises)) {
            for (const ex of round.exercises) {
              if (ex.exercise_name) {
                exercises.push({
                  originalName: ex.exercise_name,
                  discipline,
                  metrics: {},
                  sourceRound: round.round_number,
                });
              }
            }
          }
        }
      }
    }
  }

  return { exercises, discipline, extractionMethod: "generic_scan" };
}
