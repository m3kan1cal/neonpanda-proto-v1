/**
 * Program Designer To-Do List Extraction Schema
 *
 * Defines the JSON schema for AI-powered extraction of program
 * creator information from conversational responses. This schema ensures
 * structured extraction with confidence tracking for each field.
 *
 * Pattern: Same structure as coach-creator-todo-schema.ts
 *
 * Related files:
 * - amplify/functions/libs/program-designer/types.ts (TypeScript interfaces)
 * - amplify/functions/libs/program-designer/todo-extraction.ts (Extraction logic)
 * - amplify/functions/libs/program-designer/todo-list-utils.ts (To-do list utilities)
 */

/**
 * JSON Schema for Program To-Do List Extraction Tool
 * Used by Bedrock to enforce structured extraction from user responses
 */
export const PROGRAM_TODO_SCHEMA = {
  type: "object",
  properties: {
    trainingGoals: {
      type: "object",
      description:
        'Primary training objectives or goals for the training program. Examples: "improve Olympic lifts and pull-ups", "build strength and conditioning", "prepare for CrossFit competition"',
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    targetEvent: {
      type: "object",
      description:
        'Specific event, competition, or milestone the program is preparing for. Examples: "local CrossFit competition", "marathon in April", "strength testing", "null" or "none" if no specific event',
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    programDuration: {
      type: "object",
      description:
        'Total length of the training program in weeks or months. Examples: "8 weeks", "12 weeks", "3 months", "6 months"',
      properties: {
        value: { type: "string" }, // e.g., "8 weeks", "12 weeks", "6 months"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    trainingFrequency: {
      type: "object",
      description:
        "Number of training days per week. Must be a number between 1 and 7. Examples: 3, 4, 5, 6",
      properties: {
        value: { type: "number", minimum: 1, maximum: 7 },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    sessionDuration: {
      type: "object",
      description:
        'Typical length of each training session. Examples: "45 minutes", "1 hour", "60-90 minutes", "90 minutes"',
      properties: {
        value: { type: "string" }, // e.g., "45 minutes", "1 hour", "90 minutes"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    startDate: {
      type: "object",
      description:
        'When the training program should begin. Can be YYYY-MM-DD format or relative dates. Examples: "2024-01-15", "next Monday", "this week", "ASAP", "as soon as possible"',
      properties: {
        value: { type: "string" }, // YYYY-MM-DD or relative (e.g., "next Monday", "ASAP")
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    restDaysPreference: {
      type: "object",
      description:
        'Preferred days off from training each week. Can be specific days or flexible. Examples: ["Saturday", "Sunday"], ["weekends"], ["flexible"], ["Monday", "Thursday"]',
      properties: {
        value: { type: "array", items: { type: "string" } }, // e.g., ["Saturday", "Sunday"] or ["flexible"]
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    equipmentAccess: {
      type: "object",
      description:
        'Available training equipment. List all equipment the user has access to. Examples: ["barbell", "squat rack", "pull-up bar", "dumbbells"], ["full CrossFit gym"], ["bodyweight only"], ["barbell", "plates", "bench"]',
      properties: {
        value: { type: "array", items: { type: "string" } }, // e.g., ["barbell", "squat rack", "pull-up bar"]
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    trainingEnvironment: {
      type: "object",
      description:
        'Where the user trains. Examples: "home gym", "CrossFit box", "commercial gym", "garage gym", "gym and home", "outdoor space"',
      properties: {
        value: { type: "string" }, // e.g., "home gym", "CrossFit box", "commercial gym"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    experienceLevel: {
      type: "object",
      description:
        'Training experience level. Must be one of: "beginner" (less than 1 year consistent training), "intermediate" (1-3 years consistent training), or "advanced" (3+ years consistent training)',
      properties: {
        value: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
        },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    currentFitnessBaseline: {
      type: "object",
      description:
        'Current fitness capabilities and performance indicators. Examples: "can do 5 strict pull-ups", "back squat 225lbs for 5 reps", "run 5k in 25 minutes", "Fran in 8 minutes", "deadlift 315lbs"',
      properties: {
        value: { type: "string" }, // e.g., "can do 5 pull-ups", "back squat 225lbs"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    injuryConsiderations: {
      type: "object",
      description:
        'Current injuries, limitations, or movement restrictions. If no injuries, use "none" or "no injuries". Examples: "left shoulder sensitivity to overhead", "lower back tweaky with deadlifts", "knee pain with running", "none"',
      properties: {
        value: { type: "string" }, // Description of injuries or "none"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    movementPreferences: {
      type: "object",
      description:
        'Movements, exercises, or training styles the user enjoys and wants to include. Examples: "Olympic lifts", "squatting", "gymnastics", "running", "heavy barbell work", "pull-ups and dips"',
      properties: {
        value: { type: "string" }, // Movements they enjoy
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    movementDislikes: {
      type: "object",
      description:
        'Movements, exercises, or training styles the user dislikes or wants to minimize. Examples: "running", "overhead movements", "high rep squats", "burpees", "rowing machine"',
      properties: {
        value: { type: "string" }, // Movements they dislike
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    trainingMethodology: {
      type: "object",
      description:
        'Preferred training methodology, style, or discipline. This is a REQUIRED field - extract it even from indirect mentions. Examples: "CrossFit", "Powerlifting", "Bodybuilding", "Strongman", "Olympic Weightlifting", "hybrid functional strength", "functional fitness", "hybrid training", "blend of powerlifting and functional fitness", "strength training principles with functional fitness elements". Be AGGRESSIVE about extracting this - if they describe HOW they train or what STYLE they prefer, extract it.',
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    programFocus: {
      type: "object",
      description:
        'Primary training focus or emphasis area. Examples: "strength", "conditioning", "Olympic lifting", "powerlifting", "mixed/hybrid", "gymnastics", "endurance"',
      properties: {
        value: { type: "string" }, // e.g., "strength", "conditioning", "mixed", "Olympic lifting"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    intensityPreference: {
      type: "object",
      description:
        'Preferred training intensity and progression rate. Must be one of: "conservative" (slow, cautious progression), "moderate" (balanced progression), or "aggressive" (fast, challenging progression)',
      properties: {
        value: {
          type: "string",
          enum: ["conservative", "moderate", "aggressive"],
        },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    volumeTolerance: {
      type: "object",
      description:
        'How much training volume the user can handle. Must be one of: "low" (limited work capacity, needs less volume), "moderate" (average work capacity), or "high" (can handle high volume and frequency)',
      properties: {
        value: { type: "string", enum: ["low", "moderate", "high"] },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    deloadPreference: {
      type: "object",
      description:
        'Preference for scheduled recovery/deload weeks. Examples: "every 4 weeks", "every 3rd week", "no deload", "as needed", "built-in recovery weeks", "none"',
      properties: {
        value: { type: "string" }, // e.g., "every 4 weeks", "no deload", "as needed"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    progressionStyle: {
      type: "object",
      description:
        'Preferred progression or periodization style. Examples: "linear" (steady weight increases), "undulating" (daily variation), "block periodization" (distinct training blocks), "auto-regulated" (listen to body), "wave loading"',
      properties: {
        value: { type: "string" }, // e.g., "linear", "undulating", "block periodization"
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "string" },
      },
      required: ["value", "confidence"],
    },
    // Intent detection: Does the user want to skip remaining fields and finish?
    userWantsToFinish: {
      type: "boolean",
      description:
        'Set to true if the user indicates they want to skip remaining optional fields and finish designing. Detect phrases like: "skip", "that\'s all", "that\'s it", "design it now", "I\'m done", "done", "just create it", "no more", "nah", "nope", "nothing else". Consider context and conversational cues. If they\'re clearly trying to move on or show completion intent, set this to true.',
    },
    // Topic change detection: Has the user changed topics away from program design?
    userChangedTopic: {
      type: "boolean",
      description:
        'Set to true if the user has clearly changed topics and is no longer trying to design a training program. Detect when they ask about: workout logging, general training advice, unrelated topics, different features. Examples: "log this workout", "what\'s a good leg workout?", "tell me about your coaching", "never mind", "forget it", "let\'s talk about something else". Do NOT set this to true if they\'re just providing more program requirements or correcting previous information. Only set true when they\'ve clearly abandoned the current program design effort.',
    },
  },
  // No required fields - only extract what's found
  additionalProperties: false,
};
