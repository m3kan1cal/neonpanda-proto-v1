/**
 * Program Schema - JSON Schema Definition
 *
 * This module contains JSON Schema definitions for AI-powered program generation
 * via Bedrock toolConfig. These schemas are used for structured output from Claude.
 *
 * Pattern: Follows universal-workout-schema.ts and coach-config-schema.ts conventions
 * Tool names: snake_case (generate_phase_structure, generate_program_phase, normalize_program)
 *
 * Related files:
 * - amplify/functions/libs/program/types.ts (TypeScript interfaces)
 * - amplify/functions/build-program/handler.ts (Program generation handler)
 * - amplify/functions/libs/program/phase-generator.ts (Phase generation logic)
 */

import { composeStorageSchema } from "./schema-composer";

// Re-export types from program module for convenience
export type {
  Program,
  ProgramPhase,
  WorkoutTemplate,
  TemplateType,
  ScoringType,
} from "../program/types";

/**
 * JSON Schema for Workout Template
 * Used within program phases for Bedrock toolConfig
 */
const WORKOUT_TEMPLATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "templateId",
    "groupId",
    "dayNumber",
    "name",
    "type",
    "description",
    "scoringType",
    "estimatedDuration",
    "restAfter",
  ],
  properties: {
    templateId: {
      type: "string",
      description:
        "Unique template identifier: template_{userId}_{timestamp}_{shortId}",
    },
    groupId: {
      type: "string",
      description:
        "Groups templates for same day: group_{userId}_{timestamp}_{shortId}",
    },
    dayNumber: {
      type: "number",
      description: "Day number in program (1-indexed)",
    },
    phaseId: {
      type: ["string", "null"],
      description: "Optional reference to phase",
    },
    name: {
      type: "string",
      description:
        'User-facing workout name (e.g., "Strength Block", "Lower Body Burn")',
    },
    type: {
      type: "string",
      enum: [
        "strength",
        "accessory",
        "conditioning",
        "skill",
        "mobility",
        "warmup",
        "cooldown",
        "recovery",
        "power",
        "olympic",
        "endurance",
        "flexibility",
        "balance",
        "core",
        "stability",
        "mixed",
      ],
      description: "Template type/category",
    },
    description: {
      type: "string",
      description:
        "Natural language workout description (coach-like, prescriptive)",
    },
    prescribedExercises: {
      type: "array",
      items: { type: "string" },
      description: "List of exercises in this workout (for AI context)",
    },
    scoringType: {
      type: "string",
      enum: [
        "load",
        "time",
        "amrap",
        "reps",
        "rounds",
        "distance",
        "quality",
        "completion",
        "none",
      ],
      description: "How workout performance is tracked",
    },
    timeCap: {
      type: ["number", "null"],
      description: "Time cap in minutes (for timed workouts)",
    },
    estimatedDuration: {
      type: "number",
      description: "Expected duration in minutes",
    },
    restAfter: {
      type: "number",
      description: "Rest after this workout in minutes",
    },
    equipment: {
      type: "array",
      items: { type: "string" },
      description: "Equipment needed for this workout",
    },
    notes: {
      type: ["string", "null"],
      description: "Coach notes for this specific workout",
    },
    metadata: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
        },
        focusAreas: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
};

/**
 * JSON Schema for Program Phase (with workouts)
 * Used for parallel phase generation via Bedrock toolConfig
 * Tool name: generate_program_phase
 */
export const PHASE_SCHEMA = {
  type: "object",
  required: [
    "phaseId",
    "name",
    "description",
    "startDay",
    "endDay",
    "durationDays",
    "focusAreas",
    "workouts",
  ],
  additionalProperties: false,
  properties: {
    phaseId: {
      type: "string",
      description:
        "Unique phase identifier: phase_{userId}_{timestamp}_{shortId}",
    },
    name: {
      type: "string",
      description: 'Phase name (e.g., "Phase 1: Foundation Building")',
    },
    description: {
      type: "string",
      description: "Detailed phase description and objectives",
    },
    startDay: {
      type: "number",
      description: "First day of phase (1-indexed)",
    },
    endDay: {
      type: "number",
      description: "Last day of phase (1-indexed)",
    },
    durationDays: {
      type: "number",
      description: "Total days in phase (endDay - startDay + 1)",
    },
    focusAreas: {
      type: "array",
      items: { type: "string" },
      description: "Primary training focuses for this phase",
    },
    expectedWorkoutCount: {
      type: "number",
      description:
        "Your estimated number of workout templates this phase needs, " +
        "based on the phase duration and training frequency. " +
        "A good guideline: floor(durationDays / 7) * trainingFrequency. " +
        "Adjust if the phase purpose warrants it (e.g., deload phases may have fewer).",
    },
    workouts: {
      type: "array",
      items: WORKOUT_TEMPLATE_SCHEMA,
      description:
        "All workout templates for this phase — one template per training day across the full phase duration. " +
        "Example: a 21-day phase at 3x/week needs approximately 9 workout templates. " +
        "Generate templates for every training day in the phase, not just a representative sample.",
    },
  },
};

/**
 * JSON Schema for Phase Structure (without workouts)
 * Used for initial phase breakdown before parallel generation
 * Tool name: generate_phase_structure
 */
export const PHASE_STRUCTURE_SCHEMA = {
  type: "object",
  required: ["phases"],
  additionalProperties: false,
  properties: {
    phases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "phaseId",
          "name",
          "description",
          "startDay",
          "endDay",
          "durationDays",
          "focusAreas",
          "expectedWorkoutCount",
        ],
        properties: {
          phaseId: {
            type: "string",
            description:
              "Unique phase identifier: phase_{userId}_{timestamp}_{shortId}",
          },
          name: {
            type: "string",
            description: 'Phase name (e.g., "Phase 1: Foundation Building")',
          },
          description: {
            type: "string",
            description: "Detailed phase description and objectives",
          },
          startDay: {
            type: "number",
            description: "First day of phase (1-indexed)",
          },
          endDay: {
            type: "number",
            description: "Last day of phase (1-indexed)",
          },
          durationDays: {
            type: "number",
            description: "Total days in phase (endDay - startDay + 1)",
          },
          focusAreas: {
            type: "array",
            items: { type: "string" },
            description: "Primary training focuses for this phase",
          },
          expectedWorkoutCount: {
            type: "number",
            description:
              "Your estimated number of workout templates this phase needs, " +
              "based on the phase duration and training frequency. " +
              "A good guideline: floor(durationDays / 7) * trainingFrequency. " +
              "Adjust if the phase purpose warrants it (e.g., deload phases may have fewer).",
          },
          workoutCount: {
            type: "number",
            description: "Number of workout templates in this phase",
          },
        },
      },
      description: "Chronological list of phases (without workouts)",
    },
  },
};

/**
 * JSON Schema for Complete Program
 * Used for full program generation and normalization via Bedrock toolConfig
 * Tool names: generate_program, normalize_program
 */
export const PROGRAM_SCHEMA = {
  type: "object",
  required: [
    "programId",
    "userId",
    "name",
    "description",
    "status",
    "startDate",
    "endDate",
    "totalDays",
    "phases",
    "equipmentConstraints",
    "trainingGoals",
    "trainingFrequency",
  ],
  additionalProperties: false,
  properties: {
    programId: {
      type: "string",
      description:
        "Unique program identifier: program_{userId}_{timestamp}_{shortId}",
    },
    userId: {
      type: "string",
      description: "User identifier (raw user ID)",
    },
    coachIds: {
      type: "array",
      items: { type: "string" },
      description:
        "IDs of coaches involved in programming (format: user_{userId}_coach_{timestamp})",
    },
    coachNames: {
      type: "array",
      items: { type: "string" },
      description: "Names of coaches (for display)",
    },
    creationConversationId: {
      type: "string",
      description: "ID of conversation that created this program",
    },
    name: {
      type: "string",
      description:
        'Program name - MUST be concise and memorable (50-60 characters max). Examples: "42-Day Strength Builder", "6-Week Powerlifting Prep", "12-Week CrossFit Competition". Do NOT include full training goals or long descriptions in the name - keep it short and punchy.',
    },
    description: {
      type: "string",
      description: "Comprehensive program description",
    },
    status: {
      type: "string",
      enum: ["active", "paused", "completed", "archived"],
      description: "Current program status",
    },
    startDate: {
      type: "string",
      description: "Program start date (YYYY-MM-DD)",
    },
    endDate: {
      type: "string",
      description: "Program end date (YYYY-MM-DD)",
    },
    totalDays: {
      type: "number",
      description: "Total program length in days",
    },
    currentDay: {
      type: "number",
      description: "User current position (1-indexed)",
    },
    phases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "phaseId",
          "name",
          "description",
          "startDay",
          "endDay",
          "durationDays",
          "focusAreas",
        ],
        properties: {
          phaseId: {
            type: "string",
            description:
              "Unique phase identifier: phase_{userId}_{timestamp}_{shortId}",
          },
          name: { type: "string", description: "Phase name" },
          description: { type: "string", description: "Phase description" },
          startDay: {
            type: "number",
            description: "First day of phase (1-indexed)",
          },
          endDay: {
            type: "number",
            description: "Last day of phase (1-indexed)",
          },
          durationDays: { type: "number", description: "Total days in phase" },
          focusAreas: {
            type: "array",
            items: { type: "string" },
            description: "Primary training focuses for this phase (at least 1)",
          },
          workoutCount: {
            type: "number",
            description: "Number of workout templates in this phase",
          },
        },
      },
      description: "Training phases in chronological order",
    },
    equipmentConstraints: {
      type: "array",
      items: { type: "string" },
      description: "Available equipment for this program",
    },
    trainingGoals: {
      type: "array",
      items: { type: "string" },
      description: "Primary training goals",
    },
    trainingFrequency: {
      type: "number",
      description: "Training days per week",
    },
    totalWorkouts: {
      type: "number",
      description: "Total scheduled workouts in program",
    },
  },
};

/**
 * Runtime properties added by save_program_to_database tool before DynamoDB persistence.
 * These are NOT part of the AI generation contract — the model never produces them.
 * See docs/strategy/STRUCTURED_OUTPUTS_STRATEGY.md — "Schema Composition"
 */
export const PROGRAM_RUNTIME_PROPERTIES: Record<string, any> = {
  completedWorkouts: {
    type: "number",
    description: "Number of completed workouts (initialized to 0)",
  },
  skippedWorkouts: {
    type: "number",
    description: "Number of skipped workouts (initialized to 0)",
  },
  adherenceRate: {
    type: "number",
    description: "Program adherence rate: completedWorkouts / totalWorkouts",
  },
  lastActivityAt: {
    type: ["string", "null"],
    description: "ISO timestamp of last user activity on this program",
  },
  pausedAt: {
    type: ["string", "null"],
    description: "ISO timestamp when program was paused",
  },
  pausedDuration: {
    type: "number",
    description: "Total paused duration in days (cumulative)",
  },
  s3DetailKey: {
    type: "string",
    description:
      "S3 key path to full program details JSON with workout templates",
  },
  adaptationLog: {
    type: "array",
    items: { type: "object" },
    description: "Log of program adaptations and modifications",
  },
  dayCompletionStatus: {
    type: "object",
    description:
      "Map of day number to completion status for multi-template days",
  },
};

/**
 * Full program storage schema — AI schema + runtime tracking fields.
 * Use for DynamoDB record validation. Never pass to Bedrock.
 * See docs/strategy/STRUCTURED_OUTPUTS_STRATEGY.md — "Schema Composition"
 */
export const PROGRAM_STORAGE_SCHEMA = composeStorageSchema(
  PROGRAM_SCHEMA,
  PROGRAM_RUNTIME_PROPERTIES,
);
