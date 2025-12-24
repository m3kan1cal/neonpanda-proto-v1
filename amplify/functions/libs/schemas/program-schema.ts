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
      pattern: "^template_.*$",
      description:
        "Unique template identifier: template_{userId}_{timestamp}_{shortId}",
    },
    groupId: {
      type: "string",
      pattern: "^group_.*$",
      description:
        "Groups templates for same day: group_{userId}_{timestamp}_{shortId}",
    },
    dayNumber: {
      type: "number",
      minimum: 1,
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
      minimum: 1,
      description: "Expected duration in minutes",
    },
    restAfter: {
      type: "number",
      minimum: 0,
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
  properties: {
    phaseId: {
      type: "string",
      pattern: "^phase_.*$",
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
      minimum: 1,
      description: "First day of phase (1-indexed)",
    },
    endDay: {
      type: "number",
      minimum: 1,
      description: "Last day of phase (1-indexed)",
    },
    durationDays: {
      type: "number",
      minimum: 1,
      description: "Total days in phase (endDay - startDay + 1)",
    },
    focusAreas: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "Primary training focuses for this phase",
    },
    workouts: {
      type: "array",
      items: WORKOUT_TEMPLATE_SCHEMA,
      description: "All workout templates for this phase (one or more per day)",
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
  properties: {
    phases: {
      type: "array",
      items: {
        type: "object",
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
            pattern: "^phase_.*$",
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
            minimum: 1,
            description: "First day of phase (1-indexed)",
          },
          endDay: {
            type: "number",
            minimum: 1,
            description: "Last day of phase (1-indexed)",
          },
          durationDays: {
            type: "number",
            minimum: 1,
            description: "Total days in phase (endDay - startDay + 1)",
          },
          focusAreas: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            description: "Primary training focuses for this phase",
          },
        },
      },
      minItems: 1,
      maxItems: 10,
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
  properties: {
    programId: {
      type: "string",
      pattern: "^program_.*$",
      description:
        "Unique program identifier: program_{userId}_{timestamp}_{shortId}",
    },
    userId: {
      type: "string",
      description: "User identifier (raw user ID)",
    },
    coachIds: {
      type: "array",
      items: { type: "string", pattern: "^user_.*_coach_.*$" },
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
      minLength: 3,
      maxLength: 60,
      description:
        'Program name - MUST be concise and memorable (50-60 characters max). Examples: "42-Day Strength Builder", "6-Week Powerlifting Prep", "12-Week CrossFit Competition". Do NOT include full training goals or long descriptions in the name - keep it short and punchy.',
    },
    description: {
      type: "string",
      minLength: 10,
      description: "Comprehensive program description",
    },
    status: {
      type: "string",
      enum: ["active", "paused", "completed", "archived"],
      description: "Current program status",
    },
    startDate: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      description: "Program start date (YYYY-MM-DD)",
    },
    endDate: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      description: "Program end date (YYYY-MM-DD)",
    },
    totalDays: {
      type: "number",
      minimum: 7,
      maximum: 365,
      description: "Total program length in days",
    },
    currentDay: {
      type: "number",
      minimum: 1,
      description: "User current position (1-indexed)",
    },
    phases: {
      type: "array",
      items: {
        type: "object",
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
            pattern: "^phase_.*$",
          },
          name: { type: "string" },
          description: { type: "string" },
          startDay: { type: "number", minimum: 1 },
          endDay: { type: "number", minimum: 1 },
          durationDays: { type: "number", minimum: 1 },
          focusAreas: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
        },
      },
      minItems: 1,
      maxItems: 10,
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
      minItems: 1,
      description: "Primary training goals",
    },
    trainingFrequency: {
      type: "number",
      minimum: 1,
      maximum: 7,
      description: "Training days per week",
    },
    totalWorkouts: {
      type: "number",
      minimum: 1,
      description: "Total scheduled workouts in program",
    },
  },
};
