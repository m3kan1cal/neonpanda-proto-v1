/**
 * Workout Creator To-Do List Extraction Schema
 *
 * Defines the JSON schema for AI-powered extraction of workout
 * information from conversational responses. This schema ensures
 * structured extraction with confidence tracking for each field.
 *
 * Pattern: Same structure as coach-creator-todo-schema.ts and program-designer-todo-schema.ts
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
  type: "object",
  properties: {
    exercises: {
      type: "object",
      description:
        'List of exercises or movements performed in the workout. Examples: "back squats and bulgarian split squats", "Fran: thrusters and pull-ups", "deadlifts", "5k run", "21-15-9 thrusters and pull-ups"',
      properties: {
        value: { type: "string" }, // e.g., "Back squats, then bulgarian split squats"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    setsOrRounds: {
      type: "object",
      description:
        'Number of sets or rounds completed. Can be a number (e.g., 3, 5) or text description. Examples: 3, 5, "3 rounds", "AMRAP", "as many rounds as possible", "4 sets"',
      properties: {
        value: {
          oneOf: [
            { type: "number" }, // e.g., 3 (for 3 sets)
            { type: "string" }, // e.g., "3 rounds" or "AMRAP"
          ],
        },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    repsOrTime: {
      type: "object",
      description:
        'Reps per set, total time, or distance completed. Examples: "10 reps per set", "20 minutes", "8:57 (Fran time)", "1 mile", "15-12-9 reps", "30 seconds on / 30 seconds off"',
      properties: {
        value: { type: "string" }, // e.g., "10 reps per set", "20 minutes", "1 mile"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    workoutDate: {
      type: "object",
      description:
        'When the workout was completed. Can be YYYY-MM-DD format or relative time. Examples: "2024-01-15", "today", "yesterday", "this morning", "20 minutes ago", "Monday"',
      properties: {
        value: { type: "string" }, // YYYY-MM-DD or relative (e.g., "today", "yesterday", "20 minutes ago")
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    discipline: {
      type: "object",
      description:
        'Training discipline or style. Examples: "crossfit", "functional_bodybuilding", "running", "weightlifting", "powerlifting", "strongman", "endurance", "calisthenics"',
      properties: {
        value: { type: "string" }, // e.g., "crossfit", "functional_bodybuilding", "running"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    weights: {
      type: "object",
      description:
        'Weights or loads used in the workout. Examples: "185lbs", "45lb dumbbells", "bodyweight", "135# barbell", "50kg", "225x5", "315 for singles"',
      properties: {
        value: { type: "string" }, // e.g., "185lbs", "45lb dumbbells", "bodyweight"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    restPeriods: {
      type: "object",
      description:
        'Rest time between sets or rounds. Examples: "90 seconds", "2 minutes between sets", "minimal rest", "3 minutes", "as needed", "no rest"',
      properties: {
        value: { type: "string" }, // e.g., "90 seconds", "2 minutes", "minimal rest"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    workoutType: {
      type: "object",
      description:
        'Type or format of the workout. Examples: "AMRAP", "For Time", "EMOM", "Strength Training", "Interval", "Chipper", "Tabata", "Ladder", "21-15-9"',
      properties: {
        value: { type: "string" }, // e.g., "AMRAP", "For Time", "EMOM", "Strength Training"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    duration: {
      type: "object",
      description:
        'Actual working time for the workout in minutes (not including warmup/cooldown). Examples: 20, 30, 45, 8.95 (for "8:57"), 12',
      properties: {
        value: { type: "number" }, // Actual working time in minutes
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    sessionDuration: {
      type: "object",
      description:
        "Total time spent in the gym including warmup, workout, and cooldown in minutes. Examples: 60, 75, 90, 120",
      properties: {
        value: { type: "number" }, // Total time including warmup/cooldown in minutes
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    location: {
      type: "object",
      description:
        'Where the workout took place. Examples: "home gym", "CrossFit box", "commercial gym", "park", "garage", "outside", "LA Fitness"',
      properties: {
        value: { type: "string" }, // e.g., "home gym", "CrossFit box", "park"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    performanceNotes: {
      type: "object",
      description:
        'How the workout felt, performance notes, or subjective feedback. Examples: "felt strong, hit a PR", "struggled with fatigue", "legs were sore from yesterday", "unbroken pull-ups!", "easy"',
      properties: {
        value: { type: "string" }, // e.g., "Felt strong, hit a PR", "Struggled with fatigue"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    intensity: {
      type: "object",
      description:
        "Overall workout intensity on a scale of 1-10. 1 = very light/easy, 5 = moderate, 10 = maximum effort/all-out. Examples: 7, 8, 9, 5",
      properties: {
        value: { type: "number", minimum: 1, maximum: 10 }, // Workout intensity 1-10
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    rpe: {
      type: "object",
      description:
        "Rate of Perceived Exertion (RPE) on a scale of 1-10. How hard the workout felt. 1 = minimal effort, 10 = maximal effort. Examples: 7, 8, 9",
      properties: {
        value: { type: "number", minimum: 1, maximum: 10 }, // Rate of Perceived Exertion 1-10
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    enjoyment: {
      type: "object",
      description:
        "How much the user enjoyed the workout on a scale of 1-10. 1 = hated it, 5 = neutral, 10 = loved it. Examples: 8, 9, 5, 3",
      properties: {
        value: { type: "number", minimum: 1, maximum: 10 }, // How much they enjoyed it 1-10
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    difficulty: {
      type: "object",
      description:
        "How challenging the workout felt on a scale of 1-10. 1 = very easy, 5 = moderate challenge, 10 = extremely challenging. Examples: 7, 8, 6",
      properties: {
        value: { type: "number", minimum: 1, maximum: 10 }, // How challenging it felt 1-10
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    heartRate: {
      type: "object",
      description:
        "Average heart rate during the workout in beats per minute (bpm). Examples: 145, 160, 172, 138",
      properties: {
        value: { type: "number" }, // Average heart rate in bpm
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    caloriesBurned: {
      type: "object",
      description:
        "Estimated or measured calories burned during the workout. Examples: 450, 600, 320, 800",
      properties: {
        value: { type: "number" }, // Estimated calories burned
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    temperature: {
      type: "object",
      description:
        "Environmental temperature during the workout in Fahrenheit. Examples: 72, 85, 65, 90, 40",
      properties: {
        value: { type: "number" }, // Temperature in Fahrenheit
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    sleepHours: {
      type: "object",
      description:
        "Hours of sleep the night before the workout. Examples: 7, 8.5, 6, 5, 9",
      properties: {
        value: { type: "number" }, // Hours of sleep before workout
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    // Intent detection: Does the user want to skip remaining fields and finish?
    userWantsToFinish: {
      type: "boolean",
      description:
        'Set to true if the user indicates they want to skip remaining optional fields and finish logging. Detect phrases like: "skip", "that\'s all", "that\'s it", "log it now", "I\'m done", "done", "just log it", "no more", "nah", "nope", "nothing else", or short dismissive responses like ".", "n", "no". Also detect when the user is repeating the same information (indicates they want to finish). Consider context and conversational cues, not just exact keywords. If they\'re clearly trying to move on or show completion intent, set this to true.',
    },
    // Topic change detection: Has the user changed topics away from workout logging?
    userChangedTopic: {
      type: "boolean",
      description:
        'Set to true if the user has clearly changed topics and is no longer trying to log a workout. Detect when they ask about: programming questions, general training advice, unrelated topics, starting a new conversation, asking about other features. Examples: "what\'s a good leg workout?", "how should I structure my program?", "tell me about your coaching philosophy", "I want to build a program", "never mind", "forget it", "let\'s talk about something else". Do NOT set this to true if they\'re just providing more workout details or correcting previous information. Only set true when they\'ve clearly abandoned the current workout logging effort.',
    },
  },
  // No required fields - only extract what's found
  additionalProperties: false,
};
