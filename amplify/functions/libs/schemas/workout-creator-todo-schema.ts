/**
 * Workout Creator To-Do List Extraction Schema
 *
 * Defines the JSON schema for AI-powered extraction of workout
 * information from conversational responses. This schema ensures
 * structured extraction with confidence tracking for each field.
 *
 * Pattern: Same structure as coach-creator-todo-schema.ts and program-creator-todo-schema.ts
 *
 * Related files:
 * - amplify/functions/libs/workout-creator/types.ts (TypeScript interfaces)
 * - amplify/functions/libs/workout-creator/todo-extraction.ts (Extraction logic)
 * - amplify/functions/libs/workout-creator/todo-list-utils.ts (To-do list utilities)
 */

/**
 * JSON Schema for Workout To-Do List Extraction Tool
 * Used by Bedrock to enforce structured extraction from user responses
 */
export const WORKOUT_CREATOR_TODO_SCHEMA = {
  type: 'object',
  properties: {
    exercises: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "Back squats, then bulgarian split squats"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    setsOrRounds: {
      type: 'object',
      properties: {
        value: {
          oneOf: [
            { type: 'number' }, // e.g., 3 (for 3 sets)
            { type: 'string' }  // e.g., "3 rounds" or "AMRAP"
          ]
        },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    repsOrTime: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "10 reps per set", "20 minutes", "1 mile"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    workoutDate: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // YYYY-MM-DD or relative (e.g., "today", "yesterday", "20 minutes ago")
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    discipline: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "crossfit", "functional_bodybuilding", "running"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    weights: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "185lbs", "45lb dumbbells", "bodyweight"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    restPeriods: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "90 seconds", "2 minutes", "minimal rest"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    workoutType: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "AMRAP", "For Time", "EMOM", "Strength Training"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    duration: {
      type: 'object',
      properties: {
        value: { type: 'number' }, // Actual working time in minutes
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    sessionDuration: {
      type: 'object',
      properties: {
        value: { type: 'number' }, // Total time including warmup/cooldown in minutes
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    location: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "home gym", "CrossFit box", "park"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    performanceNotes: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "Felt strong, hit a PR", "Struggled with fatigue"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    intensity: {
      type: 'object',
      properties: {
        value: { type: 'number', minimum: 1, maximum: 10 }, // Workout intensity 1-10
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    rpe: {
      type: 'object',
      properties: {
        value: { type: 'number', minimum: 1, maximum: 10 }, // Rate of Perceived Exertion 1-10
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    enjoyment: {
      type: 'object',
      properties: {
        value: { type: 'number', minimum: 1, maximum: 10 }, // How much they enjoyed it 1-10
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    difficulty: {
      type: 'object',
      properties: {
        value: { type: 'number', minimum: 1, maximum: 10 }, // How challenging it felt 1-10
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    heartRate: {
      type: 'object',
      properties: {
        value: { type: 'number' }, // Average heart rate in bpm
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    caloriesBurned: {
      type: 'object',
      properties: {
        value: { type: 'number' }, // Estimated calories burned
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    temperature: {
      type: 'object',
      properties: {
        value: { type: 'number' }, // Temperature in Fahrenheit
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    sleepHours: {
      type: 'object',
      properties: {
        value: { type: 'number' }, // Hours of sleep before workout
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    // Intent detection: Does the user want to skip remaining fields and finish?
    userWantsToFinish: {
      type: 'boolean',
      description: 'Set to true if the user indicates they want to skip remaining optional fields and finish logging. Detect phrases like: "skip", "that\'s all", "that\'s it", "log it now", "I\'m done", "done", "just log it", "no more", "nah", "nope", "nothing else", or short dismissive responses like ".", "n", "no". Also detect when the user is repeating the same information (indicates they want to finish). Consider context and conversational cues, not just exact keywords. If they\'re clearly trying to move on or show completion intent, set this to true.'
    },
    // Topic change detection: Has the user changed topics away from workout logging?
    userChangedTopic: {
      type: 'boolean',
      description: 'Set to true if the user has clearly changed topics and is no longer trying to log a workout. Detect when they ask about: programming questions, general training advice, unrelated topics, starting a new conversation, asking about other features. Examples: "what\'s a good leg workout?", "how should I structure my program?", "tell me about your coaching philosophy", "I want to build a program", "never mind", "forget it", "let\'s talk about something else". Do NOT set this to true if they\'re just providing more workout details or correcting previous information. Only set true when they\'ve clearly abandoned the current workout logging effort.'
    }
  },
  // No required fields - only extract what's found
  additionalProperties: false
};
