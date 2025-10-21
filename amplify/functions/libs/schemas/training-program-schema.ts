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
 * Complete Workout Template Structure Schema
 * Used for AI-powered daily workout generation for each phase
 */
export const WORKOUT_TEMPLATE_STRUCTURE_SCHEMA = `[
  {
    "templateId": "string (unique template ID, format: 'template_day{dayNumber}_primary')",
    "dayNumber": "number (1-indexed day within program)",
    "templateType": "'primary' | 'optional' | 'accessory' (workout classification)",
    "templatePriority": "number (1 = highest priority for the day)",
    "scheduledDate": "string (YYYY-MM-DD, will be calculated from program start date)",
    "phaseId": "string (which phase this belongs to, e.g., 'phase_1')",
    "name": "string (workout name, e.g., 'Heavy Squat Day', 'Conditioning Focus')",
    "description": "string (what this workout accomplishes)",
    "estimatedDuration": "number (estimated minutes to complete)",
    "requiredEquipment": ["string array (equipment needed, subset of program equipment)"],
    "coachingNotes": "string (cues, focus points, scaling suggestions)",
    "prescribedExercises": [
      {
        "exerciseName": "string (exercise name, e.g., 'Back Squat', 'Assault Bike')",
        "movementType": "'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' | 'gymnastics' | 'cardio' | 'other'",
        "variation": "string | null (e.g., 'touch and go', 'dead stop', 'strict', 'kipping')",
        "assistance": "string | null (e.g., 'red band', 'blue band', 'belt', 'wraps')",
        "sets": "number | null (number of sets prescribed)",
        "reps": "number | string | null (prescribed reps: number or 'AMRAP', 'max', 'UB')",
        "weight": {
          "value": "number | null (prescribed weight value)",
          "unit": "'lbs' | 'kg'",
          "percentage1RM": "number | null (percentage of 1 rep max, e.g., 75 for 75%)",
          "rxWeight": "number | null (RX standard weight for this movement)",
          "scaledWeight": "number | null (scaled option weight)"
        },
        "distance": {
          "value": "number",
          "unit": "'meters' | 'miles' | 'km' | 'feet' | 'yards'"
        },
        "calories": "number | null (for bike/row/ski erg movements)",
        "time": {
          "value": "number",
          "unit": "'seconds' | 'minutes' | 'hours'"
        },
        "formNotes": "string | null (coaching cues, form focus, progression notes)"
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
WORKOUT TEMPLATE GENERATION CONTEXT:
Generate detailed daily workout templates for the phase: "${phaseContext.phaseName}"

PHASE DETAILS:
- Phase: ${phaseContext.phaseName}
- Description: ${phaseContext.phaseDescription}
- Duration: ${phaseContext.phaseDurationDays} days
- Starting at day: ${phaseContext.phaseStartDay}
- Program: ${phaseContext.programName}
- Training Frequency: ${phaseContext.trainingFrequency}x per week
- Available Equipment: ${phaseContext.equipment.join(', ')}
- Program Goals: ${phaseContext.goals.join(', ')}

IMPORTANT GENERATION RULES:
1. Generate exactly ${phaseContext.phaseDurationDays} daily templates (one for each day in the phase)
2. Day numbers must start at ${phaseContext.phaseStartDay} and be sequential
3. Training happens ${phaseContext.trainingFrequency} days per week - include rest/recovery days
4. Rest days should have templateType: "optional" and minimal exercises (mobility, stretching)
5. Progressive overload: difficulty should increase throughout the phase
6. Respect equipment constraints - only use available equipment from: ${phaseContext.equipment.join(', ')}
7. Each templateId should follow format: "template_day{dayNumber}_primary"
8. scheduledDate will be calculated by the system (use placeholder or empty string)
9. phaseId will be assigned by the system (use "phase_1", "phase_2", etc. based on phase number)
10. Primary workouts should be the main training focus for the day
11. Prescribed exercises should include specific weights, sets, reps, and coaching cues
12. estimatedDuration should be realistic (typically 45-90 minutes for training days, 15-30 for rest days)
13. coachingNotes should provide scaling options, intensity guidance, and key focus points
14. requiredEquipment should list only the equipment needed for THIS specific workout
15. Always set status to "pending", completedAt to null, linkedWorkoutId to null, userFeedback to null, and adaptationHistory to []

WORKOUT TEMPLATE SCHEMA (return an array of ${phaseContext.phaseDurationDays} templates):
${WORKOUT_TEMPLATE_STRUCTURE_SCHEMA}`;
};

