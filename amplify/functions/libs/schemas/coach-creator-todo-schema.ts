/**
 * To-Do List Extraction Schema
 *
 * Defines the JSON schema for AI-powered extraction of fitness coach intake
 * information from conversational responses. This schema ensures structured
 * extraction with confidence tracking for each field.
 *
 * Related files:
 * - amplify/functions/libs/coach-creator/types.ts (TypeScript interfaces)
 * - amplify/functions/libs/coach-creator/todo-extraction.ts (Extraction logic)
 * - amplify/functions/libs/coach-creator/todo-list-utils.ts (To-do list utilities)
 */

/**
 * JSON Schema for To-Do List Extraction Tool
 * Used by Bedrock to enforce structured extraction from user responses
 */
export const COACH_CREATOR_TODO_SCHEMA = {
  type: 'object',
  properties: {
    coachGenderPreference: {
      type: 'object',
      properties: {
        value: { type: 'string', enum: ['male', 'female', 'neutral'] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    primaryGoals: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    goalTimeline: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    age: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    lifeStageContext: {
      type: 'object',
      properties: {
        value: { type: 'string' },
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
    trainingHistory: {
      type: 'object',
      properties: {
        value: { type: 'string' },
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
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    timeOfDayPreference: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    injuryConsiderations: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    movementLimitations: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    equipmentAccess: {
      type: 'object',
      properties: {
        value: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    trainingEnvironment: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    movementPreferences: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    movementDislikes: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    coachingStylePreference: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    motivationStyle: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    successMetrics: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    progressTrackingPreferences: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    competitionGoals: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    },
    competitionTimeline: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        notes: { type: 'string' }
      },
      required: ['value', 'confidence']
    }
  },
  // No required fields - only extract what's found
  additionalProperties: false
};

