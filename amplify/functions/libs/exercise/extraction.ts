/**
 * Exercise Extraction Module
 *
 * Extracts individual exercise records from workout data across all disciplines.
 * Each extractor handles discipline-specific data structures and flattens them
 * into the common ExtractedExercise format.
 */

/**
 * Calculate estimated 1-rep max using Epley formula
 * Formula: weight × (1 + reps/30)
 * Returns 0 for invalid inputs (0 weight or 0 reps)
 */
function calculateEstimated1RM(reps: number, weight: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

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
  CircuitTrainingWorkout,
  HybridWorkout,
  HybridExercise,
} from "../workout/types";
import { logger } from "../logger";
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
    logger.warn("No discipline_specific data found in workout");
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

    case "circuit_training":
      return extractCircuitTrainingExercises(
        disciplineSpecific.circuit_training,
        discipline,
      );

    case "hybrid":
      return extractHybridExercises(disciplineSpecific.hybrid, discipline);

    default:
      logger.warn(
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
        logger.warn(
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
      logger.warn("⚠️ Skipping Powerlifting exercise without name");
      continue;
    }

    const sets = exercise.sets || [];
    let totalReps = 0;
    let maxWeight = 0;
    let totalVolume = 0;
    let totalWeightForAvg = 0;
    let weightCount = 0;
    const repsPerSet: number[] = [];
    const weightsPerSet: number[] = [];
    const volumePerSet: number[] = [];

    let bestSetVolume = 0;
    let bestSetIndex = -1;

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const reps = set.reps || 0;
      const weight = set.weight || 0;
      const volume = reps * weight;

      totalReps += reps;
      totalVolume += volume;
      if (weight > maxWeight) maxWeight = weight;

      if (reps > 0) {
        repsPerSet.push(reps);
        weightsPerSet.push(weight);
        volumePerSet.push(volume);

        if (weight > 0) {
          totalWeightForAvg += weight;
          weightCount++;
        }

        // Track best set by volume
        if (volume > bestSetVolume) {
          bestSetVolume = volume;
          bestSetIndex = i;
        }
      }
    }

    // Calculate average reps per set for consistent display
    const avgRepsPerSet =
      sets.length > 0 ? Math.round(totalReps / sets.length) : 0;

    // Build best set data
    let bestSet;
    if (bestSetIndex >= 0) {
      const bestSetData = sets[bestSetIndex];
      const bestReps = bestSetData.reps || 0;
      const bestWeight = bestSetData.weight || 0;
      bestSet = {
        setNumber: bestSetIndex + 1,
        reps: bestReps,
        weight: bestWeight,
        volume: bestSetVolume,
        estimated1rm: calculateEstimated1RM(bestReps, bestWeight),
      };
    }

    // Calculate intensity metrics
    let intensityMetrics;
    if (maxWeight > 0 && weightCount > 0) {
      const avgWeight = totalWeightForAvg / weightCount;
      intensityMetrics = {
        averageIntensity: avgWeight / maxWeight,
        volumeLoad: totalVolume,
      };
    }

    // Build attempts object only if present and has data
    let attempts;
    if (exercise.attempts) {
      attempts = {
        ...(exercise.attempts.opener && { opener: exercise.attempts.opener }),
        ...(exercise.attempts.second_attempt && {
          second: exercise.attempts.second_attempt,
        }),
        ...(exercise.attempts.third_attempt && {
          third: exercise.attempts.third_attempt,
        }),
        ...(exercise.attempts.successful_attempts && {
          successful: exercise.attempts.successful_attempts,
        }),
        ...(exercise.attempts.missed_attempts && {
          missed: exercise.attempts.missed_attempts,
        }),
      };
      // Only include attempts if it has at least one property
      if (Object.keys(attempts).length === 0) {
        attempts = undefined;
      }
    }

    const metrics: ExerciseMetrics = {
      weight: maxWeight,
      weightUnit: sets[0]?.weight_unit || "lbs",
      reps: avgRepsPerSet, // Average reps per set for display (e.g., 4x10 not 4x40)
      totalReps, // Total reps across all sets (for aggregations)
      sets: sets.length,
      // Use conditional spread for optional fields to avoid undefined values in DynamoDB
      ...(repsPerSet.length > 0 && { repsPerSet }),
      ...(weightsPerSet.length > 0 && { weightsPerSet }),
      ...(volumePerSet.length > 0 && { volumePerSet }),
      ...(totalVolume > 0 && { totalVolume }),
      ...(maxWeight > 0 && { maxWeight }),
      ...(bestSet && { bestSet, estimated1RM: bestSet.estimated1rm }),
      ...(intensityMetrics && { intensityMetrics }),
      ...(exercise.rpe && { rpe: exercise.rpe }),
      movementCategory: exercise.movement_category || "main_lift",
      ...(exercise.equipment && { equipment: exercise.equipment }),
      ...(attempts && { attempts }),
    };

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
      logger.warn("⚠️ Skipping Bodybuilding exercise without name");
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
  let totalWeightForAvg = 0;
  let weightCount = 0;
  const repsPerSet: number[] = [];
  const weightsPerSet: number[] = [];
  const volumePerSet: number[] = [];

  let bestSetVolume = 0;
  let bestSetIndex = -1;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const reps = set.reps || 0;
    const weight = set.weight || 0;
    const volume = reps * weight;

    totalReps += reps;
    totalVolume += volume;
    if (weight > maxWeight) maxWeight = weight;
    if (set.time_under_tension) totalTut += set.time_under_tension;
    if (set.failure) hadFailure = true;

    if (reps > 0) {
      repsPerSet.push(reps);
      weightsPerSet.push(weight);
      volumePerSet.push(volume);

      if (weight > 0) {
        totalWeightForAvg += weight;
        weightCount++;
      }

      // Track best set by volume
      if (volume > bestSetVolume) {
        bestSetVolume = volume;
        bestSetIndex = i;
      }
    }
  }

  // Calculate average reps per set for consistent display
  const avgRepsPerSet =
    sets.length > 0 ? Math.round(totalReps / sets.length) : 0;

  // Build best set data
  let bestSet;
  if (bestSetIndex >= 0) {
    const bestSetData = sets[bestSetIndex];
    const bestReps = bestSetData.reps || 0;
    const bestWeight = bestSetData.weight || 0;
    bestSet = {
      setNumber: bestSetIndex + 1,
      reps: bestReps,
      weight: bestWeight,
      volume: bestSetVolume,
      estimated1rm: calculateEstimated1RM(bestReps, bestWeight),
    };
  }

  // Calculate intensity metrics
  let intensityMetrics;
  if (maxWeight > 0 && weightCount > 0) {
    const avgWeight = totalWeightForAvg / weightCount;
    intensityMetrics = {
      averageIntensity: avgWeight / maxWeight,
      volumeLoad: totalVolume,
    };
  }

  const metrics: ExerciseMetrics = {
    weight: maxWeight,
    weightUnit: sets[0]?.weight_unit || "lbs",
    reps: avgRepsPerSet, // Average reps per set for display (e.g., 4x10 not 4x40)
    totalReps, // Total reps across all sets (for aggregations)
    sets: sets.length,
    // Use conditional spread for optional fields to avoid undefined values in DynamoDB
    ...(repsPerSet.length > 0 && { repsPerSet }),
    ...(weightsPerSet.length > 0 && { weightsPerSet }),
    ...(volumePerSet.length > 0 && { volumePerSet }),
    ...(totalVolume > 0 && { totalVolume }),
    ...(maxWeight > 0 && { maxWeight }),
    ...(bestSet && { bestSet, estimated1RM: bestSet.estimated1rm }),
    ...(intensityMetrics && { intensityMetrics }),
    movementCategory: exercise.movement_category,
    targetMuscles: exercise.target_muscles,
    ...(exercise.superset_with && { supersetWith: exercise.superset_with }),
    ...(hadFailure && { failure: hadFailure }),
    ...(sets[0]?.tempo && { tempo: sets[0].tempo }),
    ...(totalTut > 0 && { timeUnderTension: totalTut }),
  };

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
    logger.warn("⚠️ Skipping Running exercise without run_type");
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
      logger.warn("⚠️ Skipping Hyrox station without station_name");
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
      logger.warn("⚠️ Skipping Hyrox run without run_number");
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
      logger.warn("⚠️ Skipping Olympic Weightlifting lift without name");
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
  let totalVolume = 0;
  let totalWeightForAvg = 0;
  let weightCount = 0;
  const repsPerSet: number[] = [];
  const weightsPerSet: number[] = [];
  const volumePerSet: number[] = [];

  let bestSetVolume = 0;
  let bestSetIndex = -1;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const reps = set.reps || 0;
    const weight = set.weight || 0;
    const volume = reps * weight;

    totalReps += reps;
    totalVolume += volume;
    if (weight > maxWeight) maxWeight = weight;

    if (reps > 0) {
      repsPerSet.push(reps);
      weightsPerSet.push(weight);
      volumePerSet.push(volume);

      if (weight > 0) {
        totalWeightForAvg += weight;
        weightCount++;
      }

      // Track best set by volume
      if (volume > bestSetVolume) {
        bestSetVolume = volume;
        bestSetIndex = i;
      }
    }
  }

  // Calculate average reps per set for consistent display
  const avgRepsPerSet =
    sets.length > 0 ? Math.round(totalReps / sets.length) : 0;

  // Build best set data
  let bestSet;
  if (bestSetIndex >= 0) {
    const bestSetData = sets[bestSetIndex];
    const bestReps = bestSetData.reps || 0;
    const bestWeight = bestSetData.weight || 0;
    bestSet = {
      setNumber: bestSetIndex + 1,
      reps: bestReps,
      weight: bestWeight,
      volume: bestSetVolume,
      estimated1rm: calculateEstimated1RM(bestReps, bestWeight),
    };
  }

  // Calculate intensity metrics
  let intensityMetrics;
  if (maxWeight > 0 && weightCount > 0) {
    const avgWeight = totalWeightForAvg / weightCount;
    intensityMetrics = {
      averageIntensity: avgWeight / maxWeight,
      volumeLoad: totalVolume,
    };
  }

  // Build attempts object only if present and has data
  let attempts;
  if (lift.attempts) {
    attempts = {
      ...(lift.attempts.opener && { opener: lift.attempts.opener }),
      ...(lift.attempts.second_attempt && {
        second: lift.attempts.second_attempt,
      }),
      ...(lift.attempts.third_attempt && {
        third: lift.attempts.third_attempt,
      }),
      ...(lift.attempts.successful_attempts && {
        successful: lift.attempts.successful_attempts,
      }),
      ...(lift.attempts.missed_attempts && {
        missed: lift.attempts.missed_attempts,
      }),
    };
    // Only include attempts if it has at least one property
    if (Object.keys(attempts).length === 0) {
      attempts = undefined;
    }
  }

  const metrics: ExerciseMetrics = {
    weight: maxWeight,
    weightUnit: sets[0]?.weight_unit || "kg",
    reps: avgRepsPerSet, // Average reps per set for display (e.g., 4x10 not 4x40)
    totalReps, // Total reps across all sets (for aggregations)
    sets: sets.length,
    // Use conditional spread for optional fields to avoid undefined values in DynamoDB
    ...(repsPerSet.length > 0 && { repsPerSet }),
    ...(weightsPerSet.length > 0 && { weightsPerSet }),
    ...(volumePerSet.length > 0 && { volumePerSet }),
    ...(totalVolume > 0 && { totalVolume }),
    ...(maxWeight > 0 && { maxWeight }),
    ...(bestSet && { bestSet, estimated1RM: bestSet.estimated1rm }),
    ...(intensityMetrics && { intensityMetrics }),
    movementCategory: lift.lift_category,
    ...(lift.variation && { variation: lift.variation }),
    ...(attempts && { attempts }),
  };

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
      logger.warn("⚠️ Skipping Functional Bodybuilding exercise without name");
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
  let totalWeightForAvg = 0;
  let weightCount = 0;
  const repsPerSet: number[] = [];
  const weightsPerSet: number[] = [];
  const volumePerSet: number[] = [];

  let bestSetVolume = 0;
  let bestSetIndex = -1;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const reps = set.reps || 0;
    const weight = set.weight || 0;
    const volume = reps * weight;

    totalReps += reps;
    totalVolume += volume;
    if (weight > maxWeight) maxWeight = weight;

    if (reps > 0) {
      repsPerSet.push(reps);
      weightsPerSet.push(weight);
      volumePerSet.push(volume);

      if (weight > 0) {
        totalWeightForAvg += weight;
        weightCount++;
      }

      // Track best set by volume
      if (volume > bestSetVolume) {
        bestSetVolume = volume;
        bestSetIndex = i;
      }
    }
  }

  // Calculate average reps per set for consistent display
  const avgRepsPerSet =
    sets.length > 0 ? Math.round(totalReps / sets.length) : 0;

  // Build best set data
  let bestSet;
  if (bestSetIndex >= 0) {
    const bestSetData = sets[bestSetIndex];
    const bestReps = bestSetData.reps || 0;
    const bestWeight = bestSetData.weight || 0;
    bestSet = {
      setNumber: bestSetIndex + 1,
      reps: bestReps,
      weight: bestWeight,
      volume: bestSetVolume,
      estimated1rm: calculateEstimated1RM(bestReps, bestWeight),
    };
  }

  // Calculate intensity metrics
  let intensityMetrics;
  if (maxWeight > 0 && weightCount > 0) {
    const avgWeight = totalWeightForAvg / weightCount;
    intensityMetrics = {
      averageIntensity: avgWeight / maxWeight,
      volumeLoad: totalVolume,
    };
  }

  const metrics: ExerciseMetrics = {
    weight: maxWeight,
    weightUnit: sets[0]?.weight_unit || "lbs",
    reps: avgRepsPerSet, // Average reps per set for display (e.g., 4x10 not 4x40)
    totalReps, // Total reps across all sets (for aggregations)
    sets: sets.length,
    // Use conditional spread for optional fields to avoid undefined values in DynamoDB
    ...(repsPerSet.length > 0 && { repsPerSet }),
    ...(weightsPerSet.length > 0 && { weightsPerSet }),
    ...(volumePerSet.length > 0 && { volumePerSet }),
    ...(totalVolume > 0 && { totalVolume }),
    ...(maxWeight > 0 && { maxWeight }),
    ...(bestSet && { bestSet, estimated1RM: bestSet.estimated1rm }),
    ...(intensityMetrics && { intensityMetrics }),
    movementType: exercise.movement_pattern,
    targetMuscles: exercise.target_muscles,
    ...(exercise.superset_with && { supersetWith: exercise.superset_with }),
    ...(sets[0]?.tempo && { tempo: sets[0].tempo }),
    ...(sets[0]?.quality_focus && { variation: sets[0].quality_focus }),
  };

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
      logger.warn("⚠️ Skipping Calisthenics exercise without name");
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
  const repsPerSet: number[] = [];

  let bestSetReps = 0;
  let bestSetIndex = -1;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const reps = set.reps || 0;

    if (reps > 0) {
      totalReps += reps;
      repsPerSet.push(reps);

      // Track best set by reps (for bodyweight exercises)
      if (reps > bestSetReps) {
        bestSetReps = reps;
        bestSetIndex = i;
      }
    }

    if (set.hold_time) totalHoldTime += set.hold_time;
    if (set.quality_rating) {
      avgQuality += set.quality_rating;
      qualityCount++;
    }
  }

  // Calculate average reps per set for consistent display
  const avgRepsPerSet =
    sets.length > 0 ? Math.round(totalReps / sets.length) : 0;

  // Build best set data (for calisthenics, best = most reps)
  let bestSet;
  if (bestSetIndex >= 0 && bestSetReps > 0) {
    bestSet = {
      setNumber: bestSetIndex + 1,
      reps: bestSetReps,
      weight: 0, // bodyweight
      volume: 0, // not applicable for bodyweight
      estimated1rm: 0, // not applicable for bodyweight
    };
  }

  const metrics: ExerciseMetrics = {
    reps: avgRepsPerSet, // Average reps per set for display (e.g., 4x10 not 4x40)
    sets: sets.length,
    // Use conditional spread for optional fields to avoid undefined values in DynamoDB
    ...(totalReps > 0 && { totalReps }),
    ...(repsPerSet.length > 0 && { repsPerSet }),
    ...(bestSet && { bestSet }),
    ...(totalHoldTime > 0 && { holdTime: totalHoldTime }),
    ...(qualityCount > 0 && { qualityRating: avgQuality / qualityCount }),
    ...(exercise.progression_level && {
      progressionLevel: exercise.progression_level,
    }),
    ...(exercise.assistance_method && {
      assistanceMethod: exercise.assistance_method,
    }),
    movementCategory: exercise.skill_category,
  };

  return metrics;
}

/**
 * Circuit Training exercise extraction
 * Extracts exercises from station-based circuit workouts
 */
function extractCircuitTrainingExercises(
  circuitData: CircuitTrainingWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!circuitData?.stations) {
    return { exercises: [], discipline, extractionMethod: "circuit_empty" };
  }

  const exercises: ExtractedExercise[] = [];

  for (const station of circuitData.stations) {
    if (!station.exercise_name) {
      logger.warn("⚠️ Skipping Circuit Training station without exercise_name");
      continue;
    }

    const metrics: ExerciseMetrics = {
      stationNumber: station.station_number,
      ...(station.work_time && { time: station.work_time }),
      ...(station.reps && { reps: station.reps }),
      ...(station.weight && { weight: station.weight }),
      ...(station.weight_unit && { weightUnit: station.weight_unit }),
      ...(station.equipment && { equipment: [station.equipment] }),
    };

    exercises.push({
      originalName: station.exercise_name,
      discipline,
      metrics,
      notes: station.notes,
    });
  }

  return { exercises, discipline, extractionMethod: "circuit_stations" };
}

/**
 * Hybrid exercise extraction
 * Extracts exercises from phase-based or flat exercise structure
 * Handles mixed-modality workouts that don't fit a single discipline
 */
function extractHybridExercises(
  hybrid: HybridWorkout | undefined,
  discipline: ExerciseDiscipline,
): ExerciseExtractionResult {
  if (!hybrid) {
    return { exercises: [], discipline, extractionMethod: "hybrid_empty" };
  }

  const exercises: ExtractedExercise[] = [];

  // Prefer phase-based extraction if phases exist
  if (hybrid.phases && hybrid.phases.length > 0) {
    for (const phase of hybrid.phases) {
      if (!phase.exercises) continue;

      for (const exercise of phase.exercises) {
        if (!exercise.exercise_name) {
          logger.warn(
            `⚠️ Skipping Hybrid exercise without name in phase: ${phase.phase_name}`,
          );
          continue;
        }

        const metrics = extractHybridMetrics(exercise, phase.phase_type);

        exercises.push({
          originalName: exercise.exercise_name,
          discipline,
          metrics,
          notes: exercise.equipment
            ? `Equipment: ${exercise.equipment}`
            : undefined,
          sourcePhase: phase.phase_name || phase.phase_type || undefined,
        });
      }
    }
    return { exercises, discipline, extractionMethod: "hybrid_phases" };
  }

  // Fallback to flat exercise list
  if (hybrid.exercises && hybrid.exercises.length > 0) {
    for (const exercise of hybrid.exercises) {
      if (!exercise.exercise_name) {
        logger.warn("⚠️ Skipping Hybrid exercise without name");
        continue;
      }

      const metrics = extractHybridMetrics(exercise);

      exercises.push({
        originalName: exercise.exercise_name,
        discipline,
        metrics,
        notes: exercise.equipment
          ? `Equipment: ${exercise.equipment}`
          : undefined,
      });
    }
    return { exercises, discipline, extractionMethod: "hybrid_flat" };
  }

  return { exercises: [], discipline, extractionMethod: "hybrid_no_structure" };
}

function extractHybridMetrics(
  exercise: HybridExercise,
  phaseType?: string | null,
): ExerciseMetrics {
  const sets = exercise.sets || [];
  let totalReps = 0;
  let maxWeight = 0;
  let totalVolume = 0;
  let totalDuration = 0;
  let totalWeightForAvg = 0;
  let weightCount = 0;
  const repsPerSet: number[] = [];
  const weightsPerSet: number[] = [];
  const volumePerSet: number[] = [];

  let bestSetVolume = 0;
  let bestSetIndex = -1;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const reps = typeof set.reps === "number" ? set.reps : 0;
    const weight = set.weight?.value || 0;
    const volume = reps * weight;

    if (reps > 0) {
      totalReps += reps;
      repsPerSet.push(reps);
    }

    if (weight > 0) {
      if (weight > maxWeight) maxWeight = weight;
      weightsPerSet.push(weight);
      totalWeightForAvg += weight;
      weightCount++;
    }

    if (volume > 0) {
      totalVolume += volume;
      volumePerSet.push(volume);

      if (volume > bestSetVolume) {
        bestSetVolume = volume;
        bestSetIndex = i;
      }
    }

    if (set.duration) {
      totalDuration += set.duration;
    }
  }

  // Calculate average reps per set for consistent display
  const avgRepsPerSet =
    sets.length > 0 && totalReps > 0 ? Math.round(totalReps / sets.length) : 0;

  // Build best set data
  let bestSet;
  if (bestSetIndex >= 0) {
    const bestSetData = sets[bestSetIndex];
    const bestReps =
      typeof bestSetData.reps === "number" ? bestSetData.reps : 0;
    const bestWeight = bestSetData.weight?.value || 0;
    bestSet = {
      setNumber: bestSetIndex + 1,
      reps: bestReps,
      weight: bestWeight,
      volume: bestSetVolume,
      estimated1rm: calculateEstimated1RM(bestReps, bestWeight),
    };
  }

  // Calculate intensity metrics
  let intensityMetrics;
  if (maxWeight > 0 && weightCount > 0) {
    const avgWeight = totalWeightForAvg / weightCount;
    intensityMetrics = {
      averageIntensity: avgWeight / maxWeight,
      volumeLoad: totalVolume,
    };
  }

  const metrics: ExerciseMetrics = {
    ...(avgRepsPerSet > 0 && { reps: avgRepsPerSet }),
    ...(totalReps > 0 && { totalReps }),
    ...(sets.length > 0 && { sets: sets.length }),
    ...(maxWeight > 0 && {
      weight: maxWeight,
      weightUnit: sets[0]?.weight?.unit || "lbs",
      maxWeight,
    }),
    ...(repsPerSet.length > 0 && { repsPerSet }),
    ...(weightsPerSet.length > 0 && { weightsPerSet }),
    ...(volumePerSet.length > 0 && { volumePerSet }),
    ...(totalVolume > 0 && { totalVolume }),
    ...(bestSet && { bestSet, estimated1RM: bestSet.estimated1rm }),
    ...(intensityMetrics && { intensityMetrics }),
    ...(totalDuration > 0 && { time: totalDuration }),
    ...(exercise.movement_pattern && {
      movementType: exercise.movement_pattern,
    }),
    ...(exercise.equipment && { equipment: [exercise.equipment] }),
    ...(phaseType && { phaseType }),
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
