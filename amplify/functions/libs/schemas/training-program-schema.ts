/**
 * Training Program Schema - Shared Schema Definition
 *
 * This module contains the complete Training Program structure that can be
 * dynamically loaded into prompts for program generation from conversations.
 */

/**
 * Complete Training Program Structure Schema
 * Used for AI-powered program generation from Build mode conversations
 */
export const TRAINING_PROGRAM_STRUCTURE_SCHEMA = `{
  "name": "string (concise, descriptive program name)",
  "description": "string (1-2 sentences describing the program)",
  "totalDays": "number (total program duration in days)",
  "trainingFrequency": "number (training days per week)",
  "startDate": "string (YYYY-MM-DD format, typically today's date)",
  "phases": [
    {
      "name": "string (phase name, e.g., 'Foundation Building', 'Strength Development')",
      "startDay": "number (1-indexed starting day within program)",
      "endDay": "number (1-indexed ending day within program)",
      "description": "string (what this phase focuses on)",
      "focusAreas": ["string array (e.g., 'strength', 'conditioning', 'power', 'endurance')"]
    }
  ],
  "trainingGoals": ["string array (user's goals, e.g., 'increase squat 1RM', 'improve conditioning')"],
  "equipmentConstraints": ["string array (available equipment, e.g., 'barbell', 'pullup bar', 'dumbbells')"],
  "dailyWorkoutTemplates": []
}`;

/**
 * Complete Workout Template Structure Schema (Natural Language Approach)
 * Used for AI-powered daily workout generation for each phase
 *
 * Templates are written in natural language (like a human coach writes them)
 * with structured metadata for app functionality
 */
export const WORKOUT_TEMPLATE_STRUCTURE_SCHEMA = `[
  {
    "templateId": "string (unique template ID, format: 'template_day{dayNumber}_primary')",
    "dayNumber": "number (1-indexed day within program)",
    "templateType": "'primary' | 'optional' | 'accessory' (workout classification)",
    "templatePriority": "number (1 = highest priority for the day)",
    "scheduledDate": "string (YYYY-MM-DD, will be calculated from program start date)",
    "phaseId": "string (which phase this belongs to, e.g., 'phase_1')",

    "name": "string (workout name, e.g., 'Lower Body Strength - Squat Focus')",
    "description": "string (1 sentence overview of what this workout accomplishes)",
    "estimatedDuration": "number (estimated minutes to complete)",
    "requiredEquipment": ["string array (equipment needed, subset of program equipment)"],

    "workoutContent": "string (NATURAL LANGUAGE - write the workout as a human coach would)",
    "coachingNotes": "string (additional cues, focus points, scaling suggestions, motivation)",

    "prescribedExercises": [
      {
        "exerciseName": "string (main movement name, e.g., 'Back Squat', 'Assault Bike')",
        "movementType": "'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' | 'gymnastics' | 'cardio' | 'other'"
      }
    ],

    "status": "'pending' (always set to pending for new templates)",
    "completedAt": "null (set when workout is logged)",
    "linkedWorkoutId": "null (set when workout is logged)",
    "userFeedback": "null (set when user provides feedback)",
    "adaptationHistory": "[] (empty array, populated if template is regenerated)"
  }
]`;

/**
 * Schema version information
 */
export const TRAINING_PROGRAM_SCHEMA_VERSION = "1.0";
export const TRAINING_PROGRAM_SCHEMA_LAST_UPDATED = "2025-01-20";

/**
 * Helper function to get the training program structure schema with context
 */
export const getTrainingProgramStructureSchemaWithContext = (): string => {
  return `
TRAINING PROGRAM STRUCTURE EXTRACTION CONTEXT:
You must extract training program structure from the conversation into this exact JSON structure.

IMPORTANT RULES:
- Ensure phases cover the entire program duration (phases should span from day 1 to totalDays)
- Phase startDay and endDay must be consecutive and non-overlapping
- Phase 1 should always start at day 1
- Training frequency should match what was discussed (typically 3-6 days per week)
- Equipment constraints should only include equipment that was explicitly mentioned
- Focus areas should be specific and actionable (e.g., "strength", "power", "conditioning", "technique")
- startDate should typically be today's date (will be set by system if not provided)
- dailyWorkoutTemplates should be an empty array (workouts generated separately per phase)

PROGRAM STRUCTURE SCHEMA:
${TRAINING_PROGRAM_STRUCTURE_SCHEMA}`;
};

/**
 * Helper function to get the workout template schema with context
 * Generates natural language workout templates with structured metadata
 */
export const getWorkoutTemplateSchemaWithContext = (phaseContext: {
  phaseName: string;
  phaseDescription: string;
  phaseDurationDays: number;
  phaseStartDay: number;
  programName: string;
  trainingFrequency: number;
  equipment: string[];
  goals: string[];
}): string => {
  return `
WORKOUT TEMPLATE GENERATION - NATURAL LANGUAGE APPROACH:

Write each workout as a human coach would write it - clear, detailed, motivational, and specific.
Think of how a great coach writes workouts: natural prose, not structured data or JSON.

PHASE CONTEXT:
- Phase: ${phaseContext.phaseName}
- Description: ${phaseContext.phaseDescription}
- Duration: ${phaseContext.phaseDurationDays} days
- Starting at day: ${phaseContext.phaseStartDay}
- Program: ${phaseContext.programName}
- Training Frequency: ${phaseContext.trainingFrequency}x per week
- Available Equipment: ${phaseContext.equipment.join(', ')}
- Program Goals: ${phaseContext.goals.join(', ')}

CRITICAL INSTRUCTIONS FOR workoutContent FIELD:

1. WRITE AS A COACH WRITES:
   - Use natural language, not JSON or structured formats
   - Be specific with all exercise details (sets, reps, weights, rest periods)
   - Include coaching cues, form focus, and intensity guidance
   - Structure clearly with sections (Warmup, Strength, Conditioning, etc.)
   - Add motivational language and context

2. EXAMPLE workoutContent (THIS IS THE STYLE TO EMULATE):
   "
   Warmup (10 minutes):
   Hip circles, leg swings, deep squat holds, PVC pass-throughs. Get the hips and
   shoulders mobile before we load them.

   Strength Block:
   Back Squat 5x5 @ 205lbs (75% of your estimated 1RM ~275lbs)
   Focus on hitting depth consistently every rep. Feel your weight shift to mid-foot
   at the bottom. Keep chest up throughout the movement. Rest 3 minutes between sets.
   Film your heavy set if possible - I want to see depth consistency.

   Scale: If form breaks, reduce weight 10% immediately.

   Bulgarian Split Squat 3x10 each leg @ 40lb dumbbells
   10 reps per leg. Focus on front leg doing the work. Keep torso upright.
   Rest 90 seconds between sets.

   Conditioning Finisher:
   EMOM 10: 10 calories assault bike
   Moderate pace—should finish with 20-30 seconds rest. This is conditioning work,
   not a sprint. Keep breathing controlled.
   "

3. STRUCTURE & CLARITY:
   - Use clear sections (Warmup, Main Work, Accessory, Finisher, etc.)
   - Break complex workouts into digestible chunks
   - Include rest periods and timing guidance
   - Specify weights with context (% of 1RM, scaling options)

4. COACHING ELEMENTS:
   - Form cues for key movements
   - Intensity guidance (RPE, "should feel like X")
   - Scaling/modification options
   - What to focus on mentally
   - When to stop or reduce weight

5. prescribedExercises FIELD (LIGHTWEIGHT):
   - This is OPTIONAL and minimal
   - Include only main exercises for filtering/reference
   - Just exerciseName and movementType
   - Example: [{"exerciseName": "Back Squat", "movementType": "barbell"}]

6. coachingNotes FIELD:
   - Additional context not in workoutContent
   - Scaling options, intensity reminders
   - Connection to program goals
   - What to watch for today

GENERATION REQUIREMENTS:
- Generate exactly ${phaseContext.phaseDurationDays} daily templates
- Day numbers: ${phaseContext.phaseStartDay} to ${phaseContext.phaseStartDay + phaseContext.phaseDurationDays - 1} (sequential)
- Training ${phaseContext.trainingFrequency}x per week - include rest/recovery days
- Rest days: templateType "optional", brief mobility/stretching in workoutContent
- Progressive overload: difficulty increases throughout phase
- Equipment: ONLY use from [${phaseContext.equipment.join(', ')}]
- templateId format: "template_day{dayNumber}_primary"
- scheduledDate: use empty string "" (calculated by system)
- phaseId: use "phase_1", "phase_2", etc.
- estimatedDuration: realistic (45-90 min training, 15-30 min rest days)
- Always set: status="pending", completedAt=null, linkedWorkoutId=null, userFeedback=null, adaptationHistory=[]

SCHEMA (return an array of ${phaseContext.phaseDurationDays} templates):
${WORKOUT_TEMPLATE_STRUCTURE_SCHEMA}`;
};

