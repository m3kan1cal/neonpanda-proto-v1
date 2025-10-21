/**
 * Workout Template Utilities
 *
 * Helper functions for working with workout templates,
 * including conversion to Universal Workout Schema
 */

import { WorkoutTemplate } from './types';
import { UniversalWorkoutSchema } from '../workout/types';

/**
 * Convert a WorkoutTemplate to UniversalWorkoutSchema
 * This creates a basic workout structure from the template
 * that can be used when logging a workout
 *
 * @param template - The workout template to convert
 * @param userId - User ID for the workout
 * @param workoutId - Workout ID to assign
 * @returns UniversalWorkoutSchema object ready to be saved
 */
export function convertTemplateToUniversalSchema(
  template: WorkoutTemplate,
  userId: string,
  workoutId: string
): UniversalWorkoutSchema {
  return {
    workout_id: workoutId,
    user_id: userId,
    date: template.scheduledDate,
    discipline: 'CrossFit', // TODO: Make this dynamic based on template
    workout_name: template.name,
    workout_type: 'training_program',
    duration: template.estimatedDuration,
    performance_metrics: {
      intensity: undefined,
      perceived_exertion: undefined,
    },
    discipline_specific: {
      crossfit: {
        workout_format: 'custom',
        rx_status: 'rx',
        rounds: [
          {
            round_number: 1,
            exercises: template.prescribedExercises.map((exercise) => ({
              exercise_name: exercise.exerciseName,
              movement_type: exercise.movementType,
              variation: exercise.variation || undefined,
              assistance: exercise.assistance || undefined,
              weight: exercise.weight
                ? {
                    value: exercise.weight.value || undefined,
                    unit: exercise.weight.unit,
                    percentage_1rm: exercise.weight.percentage1RM,
                    rx_weight: exercise.weight.rxWeight,
                    scaled_weight: exercise.weight.scaledWeight,
                  }
                : undefined,
              reps: exercise.reps
                ? {
                    prescribed: typeof exercise.reps === 'number'
                      ? exercise.reps
                      : (exercise.reps.toLowerCase() === 'amrap' || exercise.reps.toLowerCase() === 'max')
                        ? 'max'
                        : parseInt(exercise.reps, 10) || 0,
                    completed: 0,
                  }
                : undefined,
              distance: exercise.distance?.value,
              calories: exercise.calories,
              time: exercise.time?.value,
              form_notes: exercise.formNotes,
            })),
          },
        ],
        performance_data: {
          rounds_completed: 0,
        },
      },
    },
    metadata: {
      logged_via: 'training_program',
      data_confidence: 1.0,
      ai_extracted: false,
      user_verified: true,
      version: '1.0',
      schema_version: '2.0',
      extraction_method: 'training_program_template',
    },
  };
}

