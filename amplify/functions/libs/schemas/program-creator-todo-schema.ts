/**
 * Program Creator To-Do List Extraction Schema
 *
 * Defines the JSON schema for AI-powered extraction of program
 * creator information from conversational responses. This schema ensures
 * structured extraction with confidence tracking for each field.
 *
 * Pattern: Same structure as coach-creator-todo-schema.ts
 *
 * Related files:
 * - amplify/functions/libs/program-creator/types.ts (TypeScript interfaces)
 * - amplify/functions/libs/program-creator/todo-extraction.ts (Extraction logic)
 * - amplify/functions/libs/program-creator/todo-list-utils.ts (To-do list utilities)
 */

/**
 * JSON Schema for Program To-Do List Extraction Tool
 * Used by Bedrock to enforce structured extraction from user responses
 */
export const PROGRAM_TODO_SCHEMA = {
  type: 'object',
  properties: {
    trainingGoals: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    targetEvent: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    programDuration: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "8 weeks", "12 weeks", "6 months"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    trainingFrequency: {
      type: 'object',
      properties: {
        value: { type: 'number', minimum: 1, maximum: 7 },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    sessionDuration: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "45 minutes", "1 hour", "90 minutes"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    startDate: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // YYYY-MM-DD or relative (e.g., "next Monday", "ASAP")
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    restDaysPreference: {
      type: 'object',
      properties: {
        value: { type: 'array', items: { type: 'string' } }, // e.g., ["Saturday", "Sunday"] or ["flexible"]
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    equipmentAccess: {
      type: 'object',
      properties: {
        value: { type: 'array', items: { type: 'string' } }, // e.g., ["barbell", "squat rack", "pull-up bar"]
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    trainingEnvironment: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "home gym", "CrossFit box", "commercial gym"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    experienceLevel: {
      type: 'object',
      properties: {
        value: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    currentFitnessBaseline: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "can do 5 pull-ups", "back squat 225lbs"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    injuryConsiderations: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // Description of injuries or "none"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    movementPreferences: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // Movements they enjoy
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    movementDislikes: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // Movements they dislike
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    programFocus: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "strength", "conditioning", "mixed", "Olympic lifting"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    intensityPreference: {
      type: 'object',
      properties: {
        value: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    volumeTolerance: {
      type: 'object',
      properties: {
        value: { type: 'string', enum: ['low', 'moderate', 'high'] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    deloadPreference: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "every 4 weeks", "no deload", "as needed"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    progressionStyle: {
      type: 'object',
      properties: {
        value: { type: 'string' }, // e.g., "linear", "undulating", "block periodization"
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    }
  },
  // No required fields - only extract what's found
  additionalProperties: false
};
